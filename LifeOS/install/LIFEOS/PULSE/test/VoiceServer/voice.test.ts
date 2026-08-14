/**
 * Voice module — provider chain wiring and backwards compatibility.
 *
 * Drives the real /notify contract through handleVoiceRequest so the branch in
 * sendNotification is exercised, not just the chain library underneath it.
 *
 * Two environment neutralisations are required for determinism:
 *
 *   HOME → a temp dir, so the suite never reads the operator's real
 *          settings.json or PRONUNCIATIONS.json.
 *   PATH → empty, so Bun.which finds no audio player. playAudio then logs and
 *          returns instead of spawning ffplay on stub bytes. resolveAudioPlayer
 *          caches its answer on first use, so this must precede any /notify.
 *
 * Both are applied AFTER the dynamic import, not before. Bun locates its global
 * module cache through HOME, and this package has no node_modules — clobbering
 * HOME first makes the import fail to resolve smol-toml (via ../lib). Neither
 * value is read by voice.ts at import time; both are read inside startVoice and
 * playAudio, which run later.
 *
 * Rate limiting is real here: voice.ts allows 10 POSTs per minute per client
 * IP and every request in this file reports as "localhost". Keep the number of
 * /notify calls in this file well under that ceiling or the suite goes yellow
 * with 429s that have nothing to do with the code under test.
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { parse } from "smol-toml"
import { normalizeProviders } from "../../VoiceServer/providers"

const sandboxHome = mkdtempSync(join(tmpdir(), "lifeos-voice-test-"))

let startVoice: typeof import("../../VoiceServer/voice").startVoice
let voiceHealth: typeof import("../../VoiceServer/voice").voiceHealth
let handleVoiceRequest: typeof import("../../VoiceServer/voice").handleVoiceRequest

beforeAll(async () => {
  const mod = await import("../../VoiceServer/voice")
  startVoice = mod.startVoice
  voiceHealth = mod.voiceHealth
  handleVoiceRequest = mod.handleVoiceRequest

  process.env.HOME = sandboxHome
  process.env.PATH = ""
  delete process.env.ELEVENLABS_API_KEY
})

// ── Stub Server ──

interface Stub {
  url: string
  requests: Array<Record<string, unknown>>
}

const running: Array<{ stop: (force?: boolean) => void }> = []

function startStub(handler: () => Response): Stub {
  const requests: Array<Record<string, unknown>> = []
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url)
      if (url.pathname !== "/v1/audio/speech") return new Response("not found", { status: 404 })
      requests.push((await req.json()) as Record<string, unknown>)
      return handler()
    },
  })
  running.push(server)
  return { url: `http://127.0.0.1:${server.port}`, requests }
}

function audioResponse(): Response {
  return new Response(new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00]), {
    status: 200,
    headers: { "Content-Type": "audio/mpeg" },
  })
}

function notify(message = "the estate is clean"): Promise<Response | null> {
  return handleVoiceRequest(
    new Request("http://localhost:31337/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "LifeOS", message }),
    }),
  )
}

afterEach(() => {
  while (running.length) running.pop()?.stop(true)
})

// ── TOML Config Parsing ──

describe("PULSE.toml [voice] parsing", () => {
  test("the shipped template declares no chain, so stock installs stay on ElevenLabs", async () => {
    const shipped = parse(await Bun.file(new URL("../../PULSE.toml", import.meta.url)).text()) as {
      voice?: Record<string, unknown>
    }

    expect(shipped.voice).toEqual({ enabled: true })
    expect(normalizeProviders(shipped.voice?.providers)).toEqual([])
  })

  test("[[voice.providers]] blocks parse into an ordered chain", () => {
    const config = parse(`
[voice]
enabled = true

[[voice.providers]]
type = "openai-compatible"
base_url = "http://127.0.0.1:8880"
voice = "am_michael"
model = "kokoro"
response_format = "mp3"
timeout_ms = 8000

[[voice.providers]]
type = "elevenlabs"
`) as { voice: Record<string, unknown> }

    const chain = normalizeProviders(config.voice.providers)

    expect(chain).toHaveLength(2)
    expect(chain[0]).toMatchObject({
      type: "openai-compatible",
      base_url: "http://127.0.0.1:8880",
      voice: "am_michael",
      model: "kokoro",
      response_format: "mp3",
      timeout_ms: 8000,
    })
    expect(chain[1].type).toBe("elevenlabs")
  })
})

// ── Backwards Compatibility ──

describe("no providers configured", () => {
  test("health reports the pre-chain shape", () => {
    startVoice({ enabled: true })

    const health = voiceHealth()
    expect(health.voice_system).toBe("ElevenLabs")
    expect(health.providers).toBeUndefined()
    expect(health.initialized).toBe(true)
  })

  test("an empty providers array is treated as no chain at all", () => {
    startVoice({ enabled: true, providers: [] })
    expect(voiceHealth().voice_system).toBe("ElevenLabs")
  })

  test("a malformed providers value falls back to the legacy path", () => {
    startVoice({ enabled: true, providers: [{ type: "openai-compatible" }, { type: "piper" }] })
    expect(voiceHealth().voice_system).toBe("ElevenLabs")
  })

  test("with no key and no chain, /notify still succeeds and speaks to nobody", async () => {
    startVoice({ enabled: true })

    const response = await notify()

    expect(response?.status).toBe(200)
    expect(await response!.json()).toMatchObject({ status: "success" })
  })

  test("the ElevenLabs default voice fallback is unchanged", () => {
    startVoice({ enabled: true })
    expect(voiceHealth().default_voice_id).toBe("21m00Tcm4TlvDq8ikWAM")
  })
})

// ── Chain Configured ──

describe("provider chain configured", () => {
  test("health names the chain without leaking credentials", () => {
    startVoice({
      enabled: true,
      providers: [
        { type: "openai-compatible", base_url: "http://127.0.0.1:8880", api_key: "sk-secret" },
        { type: "elevenlabs" },
      ],
    })

    const health = voiceHealth()
    expect(health.voice_system).toBe("chain")
    expect(health.providers).toEqual(["openai-compatible(http://127.0.0.1:8880)", "elevenlabs"])
    expect(JSON.stringify(health)).not.toContain("sk-secret")
  })

  test("speaks through the chain with no ElevenLabs key present", async () => {
    const stub = startStub(audioResponse)
    startVoice({
      enabled: true,
      providers: [{ type: "openai-compatible", base_url: stub.url, voice: "am_michael" }],
    })

    const response = await notify("good morning")

    expect(response?.status).toBe(200)
    expect(stub.requests).toHaveLength(1)
    expect(stub.requests[0]).toMatchObject({ voice: "am_michael", input: "good morning" })
  })

  test("falls through a dead provider to a healthy one", async () => {
    const broken = startStub(() => new Response("model not loaded", { status: 503 }))
    const healthy = startStub(audioResponse)

    startVoice({
      enabled: true,
      providers: [
        { type: "openai-compatible", base_url: broken.url },
        { type: "openai-compatible", base_url: healthy.url },
      ],
    })

    const response = await notify()

    expect(response?.status).toBe(200)
    expect(broken.requests).toHaveLength(1)
    expect(healthy.requests).toHaveLength(1)
  })

  test("all providers failing degrades the notification instead of throwing", async () => {
    const broken = startStub(() => new Response("down", { status: 500 }))
    startVoice({ enabled: true, providers: [{ type: "openai-compatible", base_url: broken.url }] })

    const response = await notify()

    // 502 is the pre-chain contract for "notification sent, TTS did not".
    expect(response?.status).toBe(502)
    expect(await response!.json()).toMatchObject({ status: "error", notification_sent: true })
  })
})
