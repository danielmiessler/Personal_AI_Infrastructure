/**
 * Voice provider chain — regression suite.
 *
 * Everything runs against a stub Bun.serve on an ephemeral port. No network,
 * no ElevenLabs credentials, no fixed ports.
 */

import { afterEach, describe, expect, test } from "bun:test"
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_VOICE,
  DEFAULT_RESPONSE_FORMAT,
  elevenLabsSynthesize,
  extensionForFormat,
  normalizeProviders,
  openAiCompatibleSynthesize,
  providerLabel,
  speechEndpoint,
  synthesizeViaChain,
  type SynthesisContext,
  type VoiceProviderConfig,
} from "../../VoiceServer/providers"

// ── Stub Server Harness ──

interface Stub {
  url: string
  /** Bodies of every /v1/audio/speech request this stub received, in order. */
  requests: Array<Record<string, unknown>>
  headers: Array<Headers>
}

const running: Array<{ stop: (force?: boolean) => void }> = []

function startStub(handler: (body: Record<string, unknown>, req: Request) => Response | Promise<Response>): Stub {
  const requests: Array<Record<string, unknown>> = []
  const headers: Array<Headers> = []

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname !== "/v1/audio/speech" || req.method !== "POST") {
        return new Response("not found", { status: 404 })
      }
      const body = (await req.json()) as Record<string, unknown>
      requests.push(body)
      headers.push(req.headers)
      return await handler(body, req)
    },
  })

  running.push(server)
  return { url: `http://127.0.0.1:${server.port}`, requests, headers }
}

/** A port with nothing listening on it — for the connection-refused cases. */
function deadUrl(): string {
  const server = Bun.serve({ port: 0, fetch: () => new Response("ok") })
  const port = server.port
  server.stop(true)
  return `http://127.0.0.1:${port}`
}

function audioResponse(bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04])): Response {
  return new Response(bytes, { status: 200, headers: { "Content-Type": "audio/mpeg" } })
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
      },
    ])

    expect(chain[0]).toMatchObject({ response_format: "wav", api_key: "sk-local", timeout_ms: 3000 })
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

describe("speechEndpoint", () => {
  test("appends /v1/audio/speech to a server root", () => {
    expect(speechEndpoint("http://127.0.0.1:8880")).toBe("http://127.0.0.1:8880/v1/audio/speech")
  })

  test("tolerates trailing slashes", () => {
    expect(speechEndpoint("http://127.0.0.1:8880/")).toBe("http://127.0.0.1:8880/v1/audio/speech")
  })

  test("does not double the /v1 when the base already carries it", () => {
    expect(speechEndpoint("http://127.0.0.1:8880/v1")).toBe("http://127.0.0.1:8880/v1/audio/speech")
    expect(speechEndpoint("http://127.0.0.1:8880/v1/")).toBe("http://127.0.0.1:8880/v1/audio/speech")
  })
})

describe("extensionForFormat", () => {
  test("maps the known container formats", () => {
    expect(extensionForFormat("mp3")).toBe("mp3")
    expect(extensionForFormat("wav")).toBe("wav")
    expect(extensionForFormat("opus")).toBe("opus")
    expect(extensionForFormat("WAV")).toBe("wav")
  })

  test("falls back to mp3 for anything unrecognised", () => {
    expect(extensionForFormat("ogg-but-not-really")).toBe("mp3")
  })
})

// ── OpenAI-Compatible Client Contract ──

describe("openAiCompatibleSynthesize", () => {
  test("sends {model, voice, input, response_format} and returns the bytes", async () => {
    const stub = startStub(() => audioResponse(new Uint8Array([1, 2, 3, 4, 5])))

    const audio = await openAiCompatibleSynthesize({
      text: "good morning",
      baseUrl: stub.url,
      voice: "am_michael",
      model: "kokoro",
    })

    expect(new Uint8Array(audio)).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    expect(stub.requests).toHaveLength(1)
    expect(stub.requests[0]).toEqual({
      model: "kokoro",
      voice: "am_michael",
      input: "good morning",
      response_format: "mp3",
      stream: false,
    })
  })

  test("applies the documented defaults when voice/model/format are unset", async () => {
    const stub = startStub(() => audioResponse())

    await openAiCompatibleSynthesize({ text: "hello", baseUrl: stub.url })

    expect(stub.requests[0]).toEqual({
      model: DEFAULT_OPENAI_MODEL,
      voice: DEFAULT_OPENAI_VOICE,
      input: "hello",
      response_format: DEFAULT_RESPONSE_FORMAT,
      stream: false,
    })
  })

  test("always asks for a complete body — a streamed 200 can hide a dead generation", async () => {
    const stub = startStub(() => audioResponse())

    await openAiCompatibleSynthesize({ text: "hello", baseUrl: stub.url })

    // Kokoro-FastAPI defaults stream to true; omitting the field would opt us
    // into chunked replies that report success before generation finishes.
    expect(stub.requests[0].stream).toBe(false)
  })

  test("sends speed only when one was resolved", async () => {
    const withSpeed = startStub(() => audioResponse())
    await openAiCompatibleSynthesize({ text: "hi", baseUrl: withSpeed.url, speed: 1.15 })
    expect(withSpeed.requests[0].speed).toBe(1.15)

    const without = startStub(() => audioResponse())
    await openAiCompatibleSynthesize({ text: "hi", baseUrl: without.url })
    expect(without.requests[0]).not.toHaveProperty("speed")
  })

  test("sends a bearer token only when an api_key is configured", async () => {
    const withKey = startStub(() => audioResponse())
    await openAiCompatibleSynthesize({ text: "hi", baseUrl: withKey.url, apiKey: "sk-local" })
    expect(withKey.headers[0].get("authorization")).toBe("Bearer sk-local")

    const without = startStub(() => audioResponse())
    await openAiCompatibleSynthesize({ text: "hi", baseUrl: without.url })
    expect(without.headers[0].get("authorization")).toBeNull()
  })

  test("throws on a non-2xx response", async () => {
    const stub = startStub(() => new Response("model not loaded", { status: 503 }))

    await expect(openAiCompatibleSynthesize({ text: "hi", baseUrl: stub.url })).rejects.toThrow(/503/)
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

  test("falls through on connection refused", async () => {
    const healthy = startStub(() => audioResponse())

    const chain = normalizeProviders([
      { type: "openai-compatible", base_url: deadUrl() },
      { type: "openai-compatible", base_url: healthy.url },
    ])

    const result = await synthesizeViaChain(chain, ctx())

    expect(result).not.toBeNull()
    expect(healthy.requests).toHaveLength(1)
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

  test("falls through across provider types — a keyless elevenlabs link is skipped", async () => {
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
    const stub = startStub(() => audioResponse())

    const chain: VoiceProviderConfig[] = normalizeProviders([
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
})
