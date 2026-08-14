/**
 * LifeOS Pulse — Voice Provider Chain
 *
 * An ordered list of TTS providers. Each rung is checked for liveness, then
 * asked to speak; every failure (unreachable, non-2xx, timeout, connection
 * refused) falls through to the next. When the list is exhausted the caller
 * stays silent — synthesis never throws out of this module, because /notify
 * must not die when a TTS box is down.
 *
 * Two provider types ship today:
 *   elevenlabs        — the hosted default, unchanged from the pre-chain path
 *   openai-compatible — any server speaking POST {base_url}/v1/audio/speech
 *                       (Kokoro-FastAPI, LocalAI, OpenAI itself)
 *
 * ZERO external dependencies, by design: this file must be importable before
 * `bun install` has ever run, so the tests can exercise it on a fresh clone
 * (Testing doctrine rule 1). That is also why the logger is injected rather
 * than imported from ../lib — lib.ts pulls in smol-toml.
 */

// ── Config Types ──

export interface ElevenLabsProviderConfig {
  type: "elevenlabs"
  /** Overrides the module-level key. Usually omitted. */
  api_key?: string
  /** Overrides the resolved voice ID for this link in the chain only. */
  voice?: string
  /** ElevenLabs model_id. Defaults to the pre-chain value. */
  model?: string
  timeout_ms?: number
}

export interface OpenAiCompatibleProviderConfig {
  type: "openai-compatible"
  /** Server root (`http://127.0.0.1:8880`) or its /v1 base — both accepted. */
  base_url: string
  /** Base voice ID or a blend expression. Passed through verbatim. */
  voice?: string
  model?: string
  /** mp3 (default), wav, opus, flac, aac, pcm — whatever the server supports. */
  response_format?: string
  /** Sent as `Authorization: Bearer …` when present. Local servers ignore it. */
  api_key?: string
  timeout_ms?: number
  /** Liveness path, relative to the server root. Defaults to /health. */
  health_path?: string
  health_timeout_ms?: number
}

export type VoiceProviderConfig = ElevenLabsProviderConfig | OpenAiCompatibleProviderConfig

export interface SynthesisResult {
  audio: ArrayBuffer
  /** Container format of `audio`, used to pick the temp-file extension. */
  format: string
  /** Human-readable label of the provider that answered, for logging. */
  provider: string
}

export interface ElevenLabsVoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  speed?: number
  use_speaker_boost?: boolean
}

/** Everything the chain needs that is resolved per-notification, not per-config. */
export interface SynthesisContext {
  /** Pronunciation/homograph preprocessing is already applied by the caller. */
  text: string
  elevenLabsVoiceId: string
  elevenLabsSettings: ElevenLabsVoiceSettings
  elevenLabsApiKey?: string
}

export type Logger = (level: "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) => void

// ── Constants ──

export const DEFAULT_ELEVENLABS_MODEL = "eleven_turbo_v2_5"

/**
 * Kokoro-FastAPI accepts tts-1, tts-1-hd and kokoro, and defaults to kokoro.
 * Sending it explicitly keeps stricter OpenAI-shaped servers happy.
 */
export const DEFAULT_OPENAI_MODEL = "kokoro"

/** Kokoro-FastAPI's own default voice. */
export const DEFAULT_OPENAI_VOICE = "af_heart"

/** mp3 keeps the existing playback path (afplay/ffplay/mpg123) working as-is. */
export const DEFAULT_RESPONSE_FORMAT = "mp3"

export const DEFAULT_SPEED = 1.0

/**
 * Generation budget per rung. Kokoro on CPU runs ~1.3–2x realtime on a modest
 * x86_64 box with ~3.5s to first audio on older silicon, so a one-line
 * notification legitimately takes several seconds. 10s leaves room for that
 * without letting a wedged box hold the whole chain.
 */
export const DEFAULT_TIMEOUT_MS = 10_000

/** Liveness budget. A reachable server answers this immediately or it is down. */
export const DEFAULT_HEALTH_TIMEOUT_MS = 2_000

/** Verified against api/src/main.py — `@app.get("/health")`, at the app root. */
export const DEFAULT_HEALTH_PATH = "/health"

const FORMAT_EXTENSIONS: Record<string, string> = {
  mp3: "mp3",
  wav: "wav",
  opus: "opus",
  flac: "flac",
  aac: "aac",
  // pcm is accepted from the server but is raw 16-bit samples with no header
  // (24kHz, known out of band) — file players can't demux it from extension
  // alone, so configuring response_format = "pcm" will synthesize and then
  // fail playback on most setups. Prefer mp3/wav unless the playback path is
  // custom-built for raw PCM.
  pcm: "pcm",
}

/**
 * Response Content-Type → container format. Mirrors the server-side map in
 * Kokoro-FastAPI's openai_compatible.py, plus the common wav spellings.
 */
const CONTENT_TYPE_FORMATS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/opus": "opus",
  "audio/ogg": "opus",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/pcm": "pcm",
}

/** Temp-file extension for a container format. Unknown formats play as mp3. */
export function extensionForFormat(format: string): string {
  return FORMAT_EXTENSIONS[format.toLowerCase()] ?? "mp3"
}

/**
 * Container format implied by a response Content-Type, or null when the header
 * is missing or unrecognised — in which case the configured response_format
 * stands, since that is what was asked for.
 */
export function formatFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const bare = contentType.split(";")[0].trim().toLowerCase()
  return CONTENT_TYPE_FORMATS[bare] ?? null
}

// ── Config Normalization ──

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined
}

/**
 * Turn the raw `[voice].providers` TOML value into a validated chain.
 *
 * Returns an empty array for anything that is not a non-empty array — that is
 * the signal for "no chain configured", which keeps the legacy ElevenLabs path
 * in charge. Individual malformed entries are dropped with a warning rather
 * than failing the whole chain: one typo should not mute the system.
 *
 * `voice` is never inspected beyond "is it a non-empty string". Kokoro carries
 * blend expressions in that same field — `am_fenrir(2)+am_michael(1)` — so any
 * charset validation here would reject valid configuration.
 */
export function normalizeProviders(raw: unknown, log?: Logger): VoiceProviderConfig[] {
  if (!Array.isArray(raw) || raw.length === 0) return []

  const chain: VoiceProviderConfig[] = []

  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      log?.("warn", `Voice: provider[${index}] is not a table — skipped`)
      return
    }

    const record = entry as Record<string, unknown>
    const type = asString(record.type)

    if (type === "elevenlabs") {
      chain.push({
        type: "elevenlabs",
        api_key: asString(record.api_key),
        voice: asString(record.voice),
        model: asString(record.model),
        timeout_ms: asNumber(record.timeout_ms),
      })
      return
    }

    if (type === "openai-compatible") {
      const baseUrl = asString(record.base_url)
      if (!baseUrl) {
        log?.("warn", `Voice: provider[${index}] type "openai-compatible" has no base_url — skipped`)
        return
      }
      chain.push({
        type: "openai-compatible",
        base_url: baseUrl,
        voice: asString(record.voice),
        model: asString(record.model),
        response_format: asString(record.response_format),
        api_key: asString(record.api_key),
        timeout_ms: asNumber(record.timeout_ms),
        health_path: asString(record.health_path),
        health_timeout_ms: asNumber(record.health_timeout_ms),
      })
      return
    }

    log?.("warn", `Voice: provider[${index}] has unknown type ${JSON.stringify(record.type)} — skipped`)
  })

  return chain
}

/** Label used in logs and health output. Never includes credentials. */
export function providerLabel(provider: VoiceProviderConfig): string {
  return provider.type === "openai-compatible" ? `openai-compatible(${provider.base_url})` : "elevenlabs"
}

// ── Endpoint Resolution ──

/**
 * Server root for a configured base.
 *
 * Both spellings are accepted because both are natural: the bare root
 * (`http://127.0.0.1:8880`, what Kokoro-FastAPI's README prints) and the
 * OpenAI-style base that already carries /v1 (what OPENAI_BASE_URL looks like).
 * No port is ever assumed — base_url is always explicit in config.
 */
export function serverRoot(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  return trimmed.endsWith("/v1") ? trimmed.slice(0, -"/v1".length) : trimmed
}

/** Speech endpoint. Appending blindly would double the /v1 on an OpenAI base. */
export function speechEndpoint(baseUrl: string): string {
  return `${serverRoot(baseUrl)}/v1/audio/speech`
}

/**
 * Liveness endpoint. Defaults to the server root's /health, which
 * Kokoro-FastAPI defines at the app level (outside the /v1 router).
 */
export function healthEndpoint(baseUrl: string, healthPath?: string): string {
  const path = healthPath ?? DEFAULT_HEALTH_PATH
  return `${serverRoot(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`
}

// ── Liveness ──

/**
 * Is this rung worth spending a generation timeout on?
 *
 * ANY HTTP response counts as reachable, including a 404. Only OpenAI-shaped
 * servers that are not Kokoro lack /health, and a 404 from one still proves
 * the socket answered — which is the actual question. Hard failure is reserved
 * for connection refused and timeout, exactly the cases where the expensive
 * POST would burn its full budget before failing anyway.
 *
 * ElevenLabs is not probed over the network. The liveness the pre-chain code
 * implies is "is a key configured", so that is what is reused — no new
 * request, no new failure mode, and no spend on a rung that cannot authorise.
 */
export async function isProviderReachable(
  provider: VoiceProviderConfig,
  ctx: Pick<SynthesisContext, "elevenLabsApiKey">,
  log?: Logger,
): Promise<boolean> {
  if (provider.type === "elevenlabs") {
    return !!(provider.api_key ?? ctx.elevenLabsApiKey)
  }

  const url = healthEndpoint(provider.base_url, provider.health_path)

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(provider.health_timeout_ms ?? DEFAULT_HEALTH_TIMEOUT_MS),
    })
    // Drain the body so the socket is released promptly.
    await response.arrayBuffer().catch(() => undefined)
    return true
  } catch (error: unknown) {
    log?.("warn", `Voice: ${providerLabel(provider)} health probe failed`, {
      url,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

// ── Provider Clients ──

/**
 * Raw ElevenLabs call. Pronunciation preprocessing happens upstream so the
 * chain applies it exactly once regardless of how many providers it tries.
 */
export async function elevenLabsSynthesize(opts: {
  text: string
  voiceId: string
  settings: ElevenLabsVoiceSettings
  apiKey?: string
  modelId?: string
  timeoutMs?: number
}): Promise<ArrayBuffer> {
  if (!opts.apiKey) throw new Error("ElevenLabs API key not configured")

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${opts.voiceId}`, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": opts.apiKey,
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: opts.modelId ?? DEFAULT_ELEVENLABS_MODEL,
      voice_settings: opts.settings,
    }),
    // No timeoutMs means no signal at all, not a default one. The pre-chain
    // path never bounded this call, and silently capping it would change
    // behaviour for every install that has no chain configured.
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
  }

  return await response.arrayBuffer()
}

/**
 * OpenAI-compatible speech call — the Kokoro-FastAPI contract.
 *
 * POST {base_url}/v1/audio/speech with
 * {model, input, voice, response_format, speed, stream} returning RAW AUDIO
 * BYTES, never JSON. `input` is the text field; that naming is the OpenAI
 * schema, not a typo.
 *
 * `stream: false` is sent deliberately. Kokoro-FastAPI defaults `stream` to
 * TRUE — unlike OpenAI, which has no such field — and a streamed reply commits
 * to HTTP 200 before generation finishes. A model that dies halfway then looks
 * like success carrying a truncated body, and the chain would play the stub
 * instead of failing over. Asking for the complete body puts failures back in
 * the status code, which is the only thing the chain can act on. Verified
 * against api/src/structures/schemas.py (Kokoro-FastAPI v0.7.2).
 */
export async function openAiCompatibleSynthesize(opts: {
  text: string
  baseUrl: string
  voice?: string
  model?: string
  responseFormat?: string
  /** Playback rate. Defaults to 1.0 rather than being omitted. */
  speed?: number
  apiKey?: string
  timeoutMs?: number
}): Promise<{ audio: ArrayBuffer; format: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`

  const requestedFormat = opts.responseFormat ?? DEFAULT_RESPONSE_FORMAT

  const response = await fetch(speechEndpoint(opts.baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_OPENAI_MODEL,
      input: opts.text,
      voice: opts.voice ?? DEFAULT_OPENAI_VOICE,
      response_format: requestedFormat,
      speed: Number.isFinite(opts.speed) ? opts.speed : DEFAULT_SPEED,
      stream: false,
    }),
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`TTS server error: ${response.status} - ${errorText}`)
  }

  // A JSON body on a 200 is an error payload wearing a success code — these
  // servers return audio bytes or nothing. Treating it as audio would write a
  // stub file and call it speech.
  const contentType = response.headers.get("content-type")
  if (contentType?.toLowerCase().includes("application/json")) {
    const detail = await response.text().catch(() => "")
    throw new Error(`TTS server returned JSON, not audio: ${detail.slice(0, 200)}`)
  }

  const audio = await response.arrayBuffer()
  if (audio.byteLength === 0) throw new Error("TTS server returned an empty body")

  // Trust what the server actually sent over what was asked for; they differ
  // when a server silently ignores an unsupported response_format.
  return { audio, format: formatFromContentType(contentType) ?? requestedFormat }
}

// ── Chain Runner ──

/**
 * Walk the chain until something speaks.
 *
 * Returns null when every provider failed — the caller logs and stays silent.
 * This function does not throw: a chain that cannot synthesize is a degraded
 * notification, not a failed request.
 */
export async function synthesizeViaChain(
  providers: VoiceProviderConfig[],
  ctx: SynthesisContext,
  log?: Logger,
): Promise<SynthesisResult | null> {
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]
    const label = providerLabel(provider)
    const isLast = i === providers.length - 1
    const outcome = isLast ? "chain exhausted" : "falling through"

    if (!(await isProviderReachable(provider, ctx, log))) {
      log?.("warn", `Voice: provider[${i}] ${label} is not reachable — ${outcome}`)
      continue
    }

    try {
      if (provider.type === "elevenlabs") {
        const audio = await elevenLabsSynthesize({
          text: ctx.text,
          voiceId: provider.voice ?? ctx.elevenLabsVoiceId,
          settings: ctx.elevenLabsSettings,
          apiKey: provider.api_key ?? ctx.elevenLabsApiKey,
          modelId: provider.model,
          // Inside a chain every hop is bounded — an unbounded first provider
          // would mean the fallback never gets its turn.
          timeoutMs: provider.timeout_ms ?? DEFAULT_TIMEOUT_MS,
        })
        log?.("info", `Voice: provider[${i}] ${label} synthesized ${audio.byteLength} bytes`)
        return { audio, format: "mp3", provider: label }
      }

      const { audio, format } = await openAiCompatibleSynthesize({
        text: ctx.text,
        baseUrl: provider.base_url,
        voice: provider.voice,
        model: provider.model,
        responseFormat: provider.response_format,
        // Speed is the one voice setting both provider families understand, so
        // the notification sounds the same whichever link answers.
        speed: ctx.elevenLabsSettings.speed,
        apiKey: provider.api_key,
        timeoutMs: provider.timeout_ms ?? DEFAULT_TIMEOUT_MS,
      })
      log?.("info", `Voice: provider[${i}] ${label} synthesized ${audio.byteLength} bytes as ${format}`)
      return { audio, format, provider: label }
    } catch (error: unknown) {
      log?.("warn", `Voice: provider[${i}] ${label} failed — ${outcome}`, {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  log?.("error", "Voice: every provider in the chain failed — staying silent", {
    providers: providers.map(providerLabel),
  })
  return null
}
