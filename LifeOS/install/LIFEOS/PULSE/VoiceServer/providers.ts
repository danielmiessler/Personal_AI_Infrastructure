/**
 * LifeOS Pulse — Voice Provider Chain
 *
 * An ordered list of TTS providers. The first one that produces audio wins;
 * every failure (non-2xx, timeout, connection refused) falls through to the
 * next. When the list is exhausted the caller stays silent — synthesis never
 * throws out of this module, because /notify must not die when a TTS box is
 * down.
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
  voice?: string
  model?: string
  /** mp3 (default), wav, opus, flac, aac, pcm — whatever the server supports. */
  response_format?: string
  /** Sent as `Authorization: Bearer …` when present. Local servers ignore it. */
  api_key?: string
  timeout_ms?: number
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
 * Kokoro-FastAPI ignores `model` but the OpenAI schema requires it, so a
 * non-empty default keeps strict servers happy without forcing config.
 */
export const DEFAULT_OPENAI_MODEL = "kokoro"

/** Kokoro-FastAPI's own default voice. */
export const DEFAULT_OPENAI_VOICE = "af_heart"

/** mp3 keeps the existing playback path (afplay/ffplay/mpg123) working as-is. */
export const DEFAULT_RESPONSE_FORMAT = "mp3"

export const DEFAULT_TIMEOUT_MS = 15_000

const FORMAT_EXTENSIONS: Record<string, string> = {
  mp3: "mp3",
  wav: "wav",
  opus: "opus",
  flac: "flac",
  aac: "aac",
  pcm: "pcm",
}

/** Temp-file extension for a container format. Unknown formats play as mp3. */
export function extensionForFormat(format: string): string {
  return FORMAT_EXTENSIONS[format.toLowerCase()] ?? "mp3"
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
 * Build the speech URL from a configured base.
 *
 * Both spellings are accepted because both are natural: the server root
 * (`http://127.0.0.1:8880`, what Kokoro-FastAPI's README prints) and the
 * OpenAI-style base that already carries /v1 (what OPENAI_BASE_URL looks
 * like). Appending blindly would produce /v1/v1/audio/speech for the second.
 */
export function speechEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "")
  return trimmed.endsWith("/v1") ? `${trimmed}/audio/speech` : `${trimmed}/v1/audio/speech`
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
 * POST {base_url}/v1/audio/speech with {model, voice, input, response_format}
 * returning raw audio bytes. `input` is the text field; that naming is the
 * OpenAI schema, not a typo.
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
  /** Playback rate, carried over from the resolved voice settings when set. */
  speed?: number
  apiKey?: string
  timeoutMs?: number
}): Promise<ArrayBuffer> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`

  const response = await fetch(speechEndpoint(opts.baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_OPENAI_MODEL,
      voice: opts.voice ?? DEFAULT_OPENAI_VOICE,
      input: opts.text,
      response_format: opts.responseFormat ?? DEFAULT_RESPONSE_FORMAT,
      stream: false,
      ...(Number.isFinite(opts.speed) ? { speed: opts.speed } : {}),
    }),
    signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`TTS server error: ${response.status} - ${errorText}`)
  }

  const audio = await response.arrayBuffer()
  if (audio.byteLength === 0) throw new Error("TTS server returned an empty body")

  return audio
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

      const audio = await openAiCompatibleSynthesize({
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
      const format = provider.response_format ?? DEFAULT_RESPONSE_FORMAT
      log?.("info", `Voice: provider[${i}] ${label} synthesized ${audio.byteLength} bytes`)
      return { audio, format, provider: label }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      const isLast = i === providers.length - 1
      log?.("warn", `Voice: provider[${i}] ${label} failed — ${isLast ? "chain exhausted" : "falling through"}`, {
        error: message,
      })
    }
  }

  log?.("error", "Voice: every provider in the chain failed — staying silent", {
    providers: providers.map(providerLabel),
  })
  return null
}
