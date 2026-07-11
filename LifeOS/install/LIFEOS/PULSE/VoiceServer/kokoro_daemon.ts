#!/usr/bin/env bun
/**
 * Kokoro TTS daemon — a fully-local, private voice backend for LifeOS.
 *
 * The private alternative to the cloud ElevenLabs path: no API key, and no text
 * or audio ever leaves the machine. Loads the Kokoro ONNX model once (via
 * kokoro-js) and serves synthesis over localhost so utterances skip cold-start.
 *
 *   GET  /health                        -> "ok"
 *   POST /speak {text, voice?, speed?}  -> synthesize + play; 200 on completion
 *
 * Not a resident service: voice.ts lazy-spawns this on the first utterance and
 * the daemon exits on its own after LIFEOS_KOKORO_IDLE_SECONDS (default 600)
 * without a request. No LaunchAgent, no Python — `bun add kokoro-js` in
 * PULSE/ is the only extra dependency, and the model (~90MB) is fetched to
 * KOKORO_CACHE on first synthesis. Setup:
 * DOCUMENTATION/Notifications/KokoroVoiceBackend.md.
 */
import { tmpdir } from "node:os"
import { join } from "node:path"
import { unlink } from "node:fs/promises"

const PORT = Number(process.env.LIFEOS_KOKORO_PORT || "7791")
const DEFAULT_VOICE = process.env.LIFEOS_KOKORO_VOICE || "af_bella"
// Audio player, env-overridable for non-macOS (e.g. "aplay" / "paplay" on Linux).
const PLAYER = (process.env.LIFEOS_KOKORO_PLAYER || "afplay").split(" ")
const IDLE_SECONDS = Number(process.env.LIFEOS_KOKORO_IDLE_SECONDS || "600")
const CACHE = process.env.KOKORO_CACHE || join(process.env.HOME ?? "", ".cache", "lifeos-voice")
const MODEL_ID = process.env.LIFEOS_KOKORO_MODEL || "onnx-community/Kokoro-82M-v1.0-ONNX"

// ── Idle shutdown ──
// The daemon owns its own lifetime: any request resets the timer; expiry exits
// cleanly and the next utterance lazy-spawns a fresh one. Nothing stays resident.
let idleTimer: ReturnType<typeof setTimeout> | undefined
function touchIdle(): void {
  if (idleTimer) clearTimeout(idleTimer)
  if (IDLE_SECONDS > 0) {
    idleTimer = setTimeout(() => {
      console.log(`[kokoro-daemon] idle ${IDLE_SECONDS}s, exiting`)
      process.exit(0)
    }, IDLE_SECONDS * 1000)
  }
}

// ── Model ──
// Dynamic import keeps kokoro-js out of PULSE's install footprint: it is only
// required (and its ONNX runtime only loaded) when someone opts into this backend.
let ttsPromise: Promise<any> | undefined
async function getTTS(): Promise<any> {
  ttsPromise ??= (async () => {
    let KokoroTTS: any
    let hfEnv: any
    try {
      ;({ KokoroTTS } = await import("kokoro-js"))
      ;({ env: hfEnv } = await import("@huggingface/transformers"))
    } catch {
      throw new Error("kokoro-js not installed — run `bun add kokoro-js` in LIFEOS/PULSE/")
    }
    console.log("[kokoro-daemon] loading model (one time)...")
    // Cache outside node_modules (transformers.js's default), where a reinstall
    // would silently re-download the ~90MB model. kokoro-js doesn't forward
    // cache_dir, so set it on the transformers.js env it uses.
    hfEnv.cacheDir = CACHE
    const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8" })
    console.log("[kokoro-daemon] model warm")
    return tts
  })()
  return ttsPromise
}

// ── Serialized synth + playback ──
// One utterance at a time: overlapping notifications queue instead of talking
// over each other. The chain also serializes model access.
let queue: Promise<void> = Promise.resolve()
function speak(text: string, voice: string, speed: number): Promise<void> {
  const job = queue.catch(() => {}).then(async () => {
    const tts = await getTTS()
    const audio = await tts.generate(text, { voice, speed })
    const out = join(tmpdir(), `lifeos-kokoro-${Date.now()}-${process.pid}.wav`)
    try {
      await audio.save(out)
      const proc = Bun.spawn([...PLAYER, out], { stdout: "ignore", stderr: "ignore" })
      if ((await proc.exited) !== 0) throw new Error(`audio player exited ${proc.exited}`)
    } finally {
      await unlink(out).catch(() => {})
    }
  })
  queue = job
  return job
}

touchIdle()
Bun.serve({
  hostname: "127.0.0.1",
  port: PORT,
  // Playback of a queued long utterance can exceed Bun's default 10s request timeout.
  idleTimeout: 120,
  async fetch(req: Request): Promise<Response> {
    touchIdle()
    const { pathname } = new URL(req.url)
    if (req.method === "GET" && pathname === "/health") return new Response("ok")
    if (req.method === "POST" && pathname === "/speak") {
      try {
        const payload = (await req.json().catch(() => ({}))) as {
          text?: string
          voice?: string
          speed?: number
        }
        const text = (payload.text ?? "").trim()
        if (!text) return new Response("no text", { status: 400 })
        await speak(text, payload.voice || DEFAULT_VOICE, Number(payload.speed) || 1.0)
        touchIdle() // count idle from playback end, not request start
        return new Response("ok")
      } catch (err) {
        return new Response(err instanceof Error ? err.message : String(err), { status: 500 })
      }
    }
    return new Response("not found", { status: 404 })
  },
})
console.log(`[kokoro-daemon] listening on 127.0.0.1:${PORT} (idle-exit ${IDLE_SECONDS}s)`)
