/**
 * Voice provider chain — regression suite.
 *
 * Everything runs against a stub Bun.serve on an ephemeral port. No network,
 * no ElevenLabs credentials, no fixed ports.
 *
 * The stubs answer 404 on every path except /v1/audio/speech, which is
 * deliberate: the liveness probe treats ANY HTTP response as reachable, so a
 * stub that does not implement /health still exercises the real code path the
 * way a non-Kokoro OpenAI-shaped server would.
 */

import { afterEach, describe, expect, test } from "bun:test"
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_VOICE,
  DEFAULT_RESPONSE_FORMAT,
  DEFAULT_SPEED,
  elevenLabsSynthesize,
  extensionForFormat,
  formatFromContentType,
  healthEndpoint,
  isProviderReachable,
  normalizeProviders,
  openAiCompatibleSynthesize,
  providerLabel,
  serverRoot,
  speechEndpoint,
  synthesizeViaChain,
  type SynthesisContext,
} from "../../VoiceServer/providers"

// ── Stub Server Harness ──

interface Stub {
  url: string
  /** Bodies of every /v1/audio/speech request this stub received, in order. */
  requests: Array<Record<string, unknown>>
  headers: Array<Headers>
  /** Paths of every non-speech GET, so probes can be asserted. */
  probes: string[]
}

const running: Array<{ stop: (force?: boolean) => void }> = []

function startStub(handler: (body: Record<string, unknown>, req: Request) => Response | Promise<Response>): Stub {
  const requests: Array<Record<string, unknown>> = []
  const headers: Array<Headers> = []
  const probes: string[] = []

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname !== "/v1/audio/speech" || req.method !== "POST") {
        probes.push(url.pathname)
        return new Response("not found", { status: 404 })
      }
      const body = (await req.json()) as Record<string, unknown>
      requests.push(body)
      headers.push(req.headers)
      return await handler(body, req)
    },
  })

  running.push(server)
  return { url: `http://127.0.0.1:${server.port}`, requests, headers, probes }
}

/** A server that accepts the connection and then never answers anything. */
function startHangingStub(): { url: string } {
  const server = Bun.serve({
    port: 0,
    async fetch() {
      await new Promise((resolve) => setTimeout(resolve, 30_000))
      return new Response("too late")
    },
  })
  running.push(server)
  return { url: `http://127.0.0.1:${server.port}` }
}

/** A port with nothing listening on it — for the connection-refused cases. */
function deadUrl(): string {
  const server = Bun.serve({ port: 0, fetch: () => new Response("ok") })
  const port = server.port
  server.stop(true)
  return `http://127.0.0.1:${port}`
}

function audioResponse(bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04]), contentType = "audio/mpeg"): Response {
  return new Response(bytes, { status: 200, headers: { "Content-Type": contentType } })
}

function ctx(overrides: Partial<SynthesisContext> = {}): SynthesisContext {
  return {
    text: "the estate is clean",
    elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
    elevenLabsSettings: { stability: 0.5, similarity_boost: 0.75 },
    ...overrides,
  }
}

afterEach(() => {
  while (running.length) running.pop()?.stop(true)
})

// ── Config Parsing ──

describe("normalizeProviders", () => {
  test("absent config yields an empty chain — the legacy-path signal", () => {
    expect(normalizeProviders(undefined)).toEqual([])
    expect(normalizeProviders(null)).toEqual([])
  })

  test("an empty array is also no chain", () => {
    expect(normalizeProviders([])).toEqual([])
  })

  test("a non-array value is rejected rather than coerced", () => {
    expect(normalizeProviders("elevenlabs")).toEqual([])
    expect(normalizeProviders({ type: "elevenlabs" })).toEqual([])
  })

  test("parses an ordered mixed chain and preserves order", () => {
    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: "http://127.0.0.1:8880", voice: "am_michael", model: "kokoro" },
      { type: "elevenlabs" },
    ])

    expect(chain).toHaveLength(2)
    expect(chain[0]).toMatchObject({
      type: "openai-compatible",
      base_url: "http://127.0.0.1:8880",
      voice: "am_michael",
      model: "kokoro",
    })
    expect(chain[1]).toMatchObject({ type: "elevenlabs" })
  })

  test("carries the optional openai-compatible fields through", () => {
    const chain = normalizeProviders([
      {
        type: "openai-compatible",
        base_url: "http://localhost:8880",
        response_format: "wav",
        api_key: "sk-local",
        timeout_ms: 3000,
        health_path: "/v1/models",
        health_timeout_ms: 500,
      },
    ])

    expect(chain[0]).toMatchObject({
      response_format: "wav",
      api_key: "sk-local",
      timeout_ms: 3000,
      health_path: "/v1/models",
      health_timeout_ms: 500,
    })
  })

  test("passes voice blend expressions through untouched", () => {
    // Kokoro carries blends in the same `voice` field; any charset validation
    // here would reject valid config.
    const blends = ["am_fenrir(2)+am_michael(1)", "af_bella+af_sky", "am_puck(0.3)-am_adam(0.1)"]

    for (const blend of blends) {
      const chain = normalizeProviders([{ type: "openai-compatible", base_url: "http://x", voice: blend }])
      expect(chain[0].voice).toBe(blend)
    }
  })

  test("drops an openai-compatible entry with no base_url, keeping the rest", () => {
    const warnings: string[] = []
    const chain = normalizeProviders(
      [{ type: "openai-compatible", voice: "am_michael" }, { type: "elevenlabs" }],
      (level, message) => {
        if (level === "warn") warnings.push(message)
      },
    )

    expect(chain).toHaveLength(1)
    expect(chain[0].type).toBe("elevenlabs")
    expect(warnings.join(" ")).toContain("base_url")
  })

  test("drops unknown types and non-tables without failing the chain", () => {
    const chain = normalizeProviders([
      { type: "piper" },
      "elevenlabs",
      null,
      42,
      { type: "elevenlabs" },
    ])

    expect(chain).toHaveLength(1)
    expect(chain[0].type).toBe("elevenlabs")
  })

  test("ignores non-positive and non-numeric timeouts", () => {
    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: "http://x", timeout_ms: 0 },
      { type: "openai-compatible", base_url: "http://y", timeout_ms: "soon" },
    ])

    expect(chain[0].timeout_ms).toBeUndefined()
    expect(chain[1].timeout_ms).toBeUndefined()
  })

  test("labels never leak credentials", () => {
    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: "http://127.0.0.1:8880", api_key: "sk-secret" },
      { type: "elevenlabs", api_key: "xi-secret" },
    ])

    const labels = chain.map(providerLabel).join(" ")
    expect(labels).not.toContain("sk-secret")
    expect(labels).not.toContain("xi-secret")
  })
})

// ── Endpoint Resolution ──

describe("endpoint resolution", () => {
  test("derives the server root from either spelling", () => {
    expect(serverRoot("http://127.0.0.1:8880")).toBe("http://127.0.0.1:8880")
    expect(serverRoot("http://127.0.0.1:8880/")).toBe("http://127.0.0.1:8880")
    expect(serverRoot("http://127.0.0.1:8880/v1")).toBe("http://127.0.0.1:8880")
    expect(serverRoot("http://127.0.0.1:8880/v1/")).toBe("http://127.0.0.1:8880")
  })

  test("appends /v1/audio/speech exactly once", () => {
    expect(speechEndpoint("http://127.0.0.1:8880")).toBe("http://127.0.0.1:8880/v1/audio/speech")
    expect(speechEndpoint("http://127.0.0.1:8880/")).toBe("http://127.0.0.1:8880/v1/audio/speech")
    expect(speechEndpoint("http://127.0.0.1:8880/v1")).toBe("http://127.0.0.1:8880/v1/audio/speech")
  })

  test("health defaults to the app-level /health, outside the /v1 router", () => {
    expect(healthEndpoint("http://127.0.0.1:8880")).toBe("http://127.0.0.1:8880/health")
    expect(healthEndpoint("http://127.0.0.1:8880/v1")).toBe("http://127.0.0.1:8880/health")
  })

  test("an override path is honoured, with or without a leading slash", () => {
    expect(healthEndpoint("http://x:8880", "/v1/models")).toBe("http://x:8880/v1/models")
    expect(healthEndpoint("http://x:8880", "v1/models")).toBe("http://x:8880/v1/models")
  })

  test("no port is ever assumed", () => {
    expect(speechEndpoint("https://tts.example.com")).toBe("https://tts.example.com/v1/audio/speech")
    expect(healthEndpoint("https://tts.example.com")).toBe("https://tts.example.com/health")
  })
})

describe("format mapping", () => {
  test("maps the known container formats to extensions", () => {
    expect(extensionForFormat("mp3")).toBe("mp3")
    expect(extensionForFormat("wav")).toBe("wav")
    expect(extensionForFormat("opus")).toBe("opus")
    expect(extensionForFormat("WAV")).toBe("wav")
  })

  test("falls back to mp3 for anything unrecognised", () => {
    expect(extensionForFormat("ogg-but-not-really")).toBe("mp3")
  })

  test("reads the container back off a Content-Type", () => {
    expect(formatFromContentType("audio/mpeg")).toBe("mp3")
    expect(formatFromContentType("audio/wav")).toBe("wav")
    expect(formatFromContentType("audio/x-wav")).toBe("wav")
    expect(formatFromContentType("audio/flac; charset=binary")).toBe("flac")
    expect(formatFromContentType("audio/pcm")).toBe("pcm")
  })

  test("returns null when the header is missing or unknown", () => {
    expect(formatFromContentType(null)).toBeNull()
    expect(formatFromContentType("application/octet-stream")).toBeNull()
  })
})

// ── Liveness ──

describe("isProviderReachable", () => {
  test("a live server is reachable, and the probe hits /health", async () => {
    const stub = startStub(() => audioResponse())
    const [provider] = normalizeProviders([{ type: "openai-compatible", base_url: stub.url }])

    expect(await isProviderReachable(provider, {})).toBe(true)
    expect(stub.probes).toEqual(["/health"])
  })

  test("a 404 still counts as reachable — the socket answered", async () => {
    // Non-Kokoro OpenAI-shaped servers have no /health. The question the probe
    // asks is "is anything listening", not "is this Kokoro".
    const stub = startStub(() => audioResponse())
    const [provider] = normalizeProviders([{ type: "openai-compatible", base_url: stub.url }])

    expect(await isProviderReachable(provider, {})).toBe(true)
    expect(stub.probes[0]).toBe("/health")
  })

  test("connection refused is not reachable", async () => {
    const [provider] = normalizeProviders([{ type: "openai-compatible", base_url: deadUrl() }])

    expect(await isProviderReachable(provider, {})).toBe(false)
  })

  test("a hanging server is not reachable once the health budget expires", async () => {
    const stub = startHangingStub()
    const [provider] = normalizeProviders([
      { type: "openai-compatible", base_url: stub.url, health_timeout_ms: 40 },
    ])

    const started = Date.now()
    expect(await isProviderReachable(provider, {})).toBe(false)
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  test("an override health path is the one actually requested", async () => {
    const stub = startStub(() => audioResponse())
    const [provider] = normalizeProviders([
      { type: "openai-compatible", base_url: stub.url, health_path: "/v1/models" },
    ])

    expect(await isProviderReachable(provider, {})).toBe(true)
    expect(stub.probes).toEqual(["/v1/models"])
  })

  test("elevenlabs liveness is the configured key, with no network call", async () => {
    const [provider] = normalizeProviders([{ type: "elevenlabs" }])

    expect(await isProviderReachable(provider, { elevenLabsApiKey: "xi-key" })).toBe(true)
    expect(await isProviderReachable(provider, {})).toBe(false)
  })

  test("a per-provider elevenlabs key satisfies liveness on its own", async () => {
    const [provider] = normalizeProviders([{ type: "elevenlabs", api_key: "xi-own" }])

    expect(await isProviderReachable(provider, {})).toBe(true)
  })
})

// ── OpenAI-Compatible Client Contract ──

describe("openAiCompatibleSynthesize", () => {
  test("sends the full documented body and returns the bytes", async () => {
    const stub = startStub(() => audioResponse(new Uint8Array([1, 2, 3, 4, 5])))

    const { audio } = await openAiCompatibleSynthesize({
      text: "good morning",
      baseUrl: stub.url,
      voice: "am_michael",
      model: "kokoro",
      speed: 1.0,
    })

    expect(new Uint8Array(audio)).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    expect(stub.requests).toHaveLength(1)
    expect(stub.requests[0]).toEqual({
      model: "kokoro",
      input: "good morning",
      voice: "am_michael",
      response_format: "mp3",
      speed: 1.0,
      stream: false,
    })
  })

  test("applies the documented defaults when voice/model/format/speed are unset", async () => {
    const stub = startStub(() => audioResponse())

    await openAiCompatibleSynthesize({ text: "hello", baseUrl: stub.url })

    expect(stub.requests[0]).toEqual({
      model: DEFAULT_OPENAI_MODEL,
      input: "hello",
      voice: DEFAULT_OPENAI_VOICE,
      response_format: DEFAULT_RESPONSE_FORMAT,
      speed: DEFAULT_SPEED,
      stream: false,
    })
  })

  test("always asks for a complete body — a streamed 200 can hide a dead generation", async () => {
    const stub = startStub(() => audioResponse())

    await openAiCompatibleSynthesize({ text: "hello", baseUrl: stub.url })

    expect(stub.requests[0].stream).toBe(false)
  })

  test("sends a blend expression verbatim", async () => {
    const stub = startStub(() => audioResponse())

    await openAiCompatibleSynthesize({
      text: "hi",
      baseUrl: stub.url,
      voice: "am_fenrir(2)+am_michael(1)",
    })

    expect(stub.requests[0].voice).toBe("am_fenrir(2)+am_michael(1)")
  })

  test("sends a bearer token only when an api_key is configured", async () => {
    const withKey = startStub(() => audioResponse())
    await openAiCompatibleSynthesize({ text: "hi", baseUrl: withKey.url, apiKey: "sk-local" })
    expect(withKey.headers[0].get("authorization")).toBe("Bearer sk-local")

    const without = startStub(() => audioResponse())
    await openAiCompatibleSynthesize({ text: "hi", baseUrl: without.url })
    expect(without.headers[0].get("authorization")).toBeNull()
  })

  test("reports the container the server actually sent", async () => {
    const stub = startStub(() => audioResponse(new Uint8Array([1]), "audio/wav"))

    const { format } = await openAiCompatibleSynthesize({
      text: "hi",
      baseUrl: stub.url,
      responseFormat: "wav",
    })

    expect(format).toBe("wav")
  })

  test("trusts the response Content-Type over the requested format", async () => {
    // A server that ignores an unsupported response_format and sends mp3
    // anyway must not have its bytes written to a .flac file.
    const stub = startStub(() => audioResponse(new Uint8Array([1]), "audio/mpeg"))

    const { format } = await openAiCompatibleSynthesize({
      text: "hi",
      baseUrl: stub.url,
      responseFormat: "flac",
    })

    expect(format).toBe("mp3")
  })

  test("falls back to the requested format when the server sends no usable type", async () => {
    const stub = startStub(() => audioResponse(new Uint8Array([1]), "application/octet-stream"))

    const { format } = await openAiCompatibleSynthesize({
      text: "hi",
      baseUrl: stub.url,
      responseFormat: "opus",
    })

    expect(format).toBe("opus")
  })

  test("throws on a non-2xx response", async () => {
    const stub = startStub(() => new Response("model not loaded", { status: 503 }))

    await expect(openAiCompatibleSynthesize({ text: "hi", baseUrl: stub.url })).rejects.toThrow(/503/)
  })

  test("rejects a JSON body on a 200 — that is an error wearing a success code", async () => {
    const stub = startStub(
      () =>
        new Response(JSON.stringify({ detail: "voice not found" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    )

    await expect(openAiCompatibleSynthesize({ text: "hi", baseUrl: stub.url })).rejects.toThrow(
      /JSON, not audio/,
    )
  })

  test("treats an empty 200 body as a failure", async () => {
    const stub = startStub(() => new Response(new Uint8Array([]), { status: 200 }))

    await expect(openAiCompatibleSynthesize({ text: "hi", baseUrl: stub.url })).rejects.toThrow(/empty body/)
  })
})

// ── ElevenLabs Client ──

describe("elevenLabsSynthesize", () => {
  test("refuses to call out without an API key", async () => {
    await expect(
      elevenLabsSynthesize({
        text: "hi",
        voiceId: "abc",
        settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    ).rejects.toThrow(/API key not configured/)
  })
})

// ── Chain Behaviour ──

describe("synthesizeViaChain", () => {
  test("the first healthy provider speaks and later ones are never called", async () => {
    const first = startStub(() => audioResponse(new Uint8Array([9, 9, 9])))
    const second = startStub(() => audioResponse(new Uint8Array([7, 7, 7])))

    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: first.url },
      { type: "openai-compatible", base_url: second.url },
    ])

    const result = await synthesizeViaChain(chain, ctx())

    expect(result).not.toBeNull()
    expect(new Uint8Array(result!.audio)).toEqual(new Uint8Array([9, 9, 9]))
    expect(first.requests).toHaveLength(1)
    expect(second.requests).toHaveLength(0)
    // The unused rung is never even probed.
    expect(second.probes).toHaveLength(0)
  })

  test("falls through to the next provider on a non-2xx", async () => {
    const broken = startStub(() => new Response("boom", { status: 500 }))
    const healthy = startStub(() => audioResponse(new Uint8Array([4, 2])))

    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: broken.url },
      { type: "openai-compatible", base_url: healthy.url },
    ])

    const result = await synthesizeViaChain(chain, ctx())

    expect(new Uint8Array(result!.audio)).toEqual(new Uint8Array([4, 2]))
    expect(broken.requests).toHaveLength(1)
    expect(healthy.requests).toHaveLength(1)
  })

  test("skips an unreachable provider without spending the generation budget", async () => {
    const healthy = startStub(() => audioResponse())

    const chain = normalizeProviders([
      // 10s generation timeout would be paid on every notification without the
      // cheap probe in front of it.
      { type: "openai-compatible", base_url: deadUrl() },
      { type: "openai-compatible", base_url: healthy.url },
    ])

    const started = Date.now()
    const result = await synthesizeViaChain(chain, ctx())

    expect(result).not.toBeNull()
    expect(healthy.requests).toHaveLength(1)
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  test("falls through on timeout", async () => {
    const hanging = startStub(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5_000))
      return audioResponse()
    })
    const healthy = startStub(() => audioResponse(new Uint8Array([1, 1])))

    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: hanging.url, timeout_ms: 50 },
      { type: "openai-compatible", base_url: healthy.url },
    ])

    const result = await synthesizeViaChain(chain, ctx())

    expect(new Uint8Array(result!.audio)).toEqual(new Uint8Array([1, 1]))
  })

  test("skips a keyless elevenlabs rung and speaks on the next one", async () => {
    const healthy = startStub(() => audioResponse(new Uint8Array([5])))

    const chain = normalizeProviders([
      { type: "elevenlabs" },
      { type: "openai-compatible", base_url: healthy.url },
    ])

    const result = await synthesizeViaChain(chain, ctx({ elevenLabsApiKey: undefined }))

    expect(result).not.toBeNull()
    expect(result!.provider).toContain("openai-compatible")
    expect(healthy.requests).toHaveLength(1)
  })

  test("returns null when every provider fails, and does not throw", async () => {
    const a = startStub(() => new Response("no", { status: 500 }))
    const b = startStub(() => new Response("also no", { status: 502 }))

    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: a.url },
      { type: "openai-compatible", base_url: b.url },
      { type: "openai-compatible", base_url: deadUrl() },
    ])

    const result = await synthesizeViaChain(chain, ctx())

    expect(result).toBeNull()
    expect(a.requests).toHaveLength(1)
    expect(b.requests).toHaveLength(1)
  })

  test("logs an error naming every provider when the chain is exhausted", async () => {
    const errors: string[] = []
    const chain = normalizeProviders([{ type: "openai-compatible", base_url: deadUrl() }])

    await synthesizeViaChain(chain, ctx(), (level, message) => {
      if (level === "error") errors.push(message)
    })

    expect(errors.join(" ")).toContain("staying silent")
  })

  test("an empty chain synthesizes nothing", async () => {
    expect(await synthesizeViaChain([], ctx())).toBeNull()
  })

  test("reports the response format so playback picks the right extension", async () => {
    const stub = startStub(() => audioResponse(new Uint8Array([1]), "audio/wav"))

    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: stub.url, response_format: "wav" },
    ])

    const result = await synthesizeViaChain(chain, ctx())

    expect(result!.format).toBe("wav")
    expect(extensionForFormat(result!.format)).toBe("wav")
    expect(stub.requests[0].response_format).toBe("wav")
  })

  test("passes the already-preprocessed text straight through as `input`", async () => {
    const stub = startStub(() => audioResponse())
    const chain = normalizeProviders([{ type: "openai-compatible", base_url: stub.url }])

    await synthesizeViaChain(chain, ctx({ text: "DAN-yuhl MIL-ur" }))

    expect(stub.requests[0].input).toBe("DAN-yuhl MIL-ur")
  })

  test("carries the resolved speed onto the openai-compatible provider", async () => {
    const stub = startStub(() => audioResponse())
    const chain = normalizeProviders([{ type: "openai-compatible", base_url: stub.url }])

    await synthesizeViaChain(chain, ctx({ elevenLabsSettings: { stability: 0.5, similarity_boost: 0.75, speed: 0.9 } }))

    expect(stub.requests[0].speed).toBe(0.9)
  })

  test("defaults speed to 1.0 when the resolved settings carry none", async () => {
    const stub = startStub(() => audioResponse())
    const chain = normalizeProviders([{ type: "openai-compatible", base_url: stub.url }])

    await synthesizeViaChain(chain, ctx())

    expect(stub.requests[0].speed).toBe(DEFAULT_SPEED)
  })
})
