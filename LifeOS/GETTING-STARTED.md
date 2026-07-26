# Getting Started — after the install

You installed LifeOS. This page covers the part `INSTALL.md` couldn't: the **external tools** LifeOS's doctrine uses when they're available. None are required — every one degrades honestly when absent — but each unlocks a real capability. For each: what it powers, how to set it up, and how to prove it's live.

**The one command to remember:**

```
bun <configRoot>/LIFEOS/TOOLS/Doctor.ts
```

Run it whenever anything feels off. Every ❌ line carries its own fix command. `--network` adds end-to-end auth checks (only for tools you've configured). `decline <name>` turns a capability off permanently and silently — declining is a supported way to run LifeOS, not a defect.

---

## codex — cross-vendor audit

**Powers:** an independent second-vendor review on high-impact work. Without it, audits still run — but same-vendor, and the output is labeled accordingly.

- **Install:** `bun install -g @openai/codex`
- **Auth:** `codex login` (needs an OpenAI account)
- **Verify:** `bun <configRoot>/LIFEOS/TOOLS/Doctor.ts` → codex ✅
- **Don't want it?** `Doctor.ts decline codex` — audits stay single-vendor, honestly labeled.

## Interceptor — real-browser verification

**Powers:** verification of anything web-facing through a real Chrome — screenshots, console logs, actual page loads. Doctrine treats "curl returned 200" as *not* verification; this is the tool that does it right.

- **Install:** the skill ships with LifeOS; it needs a real browser binary — Google Chrome or Brave.
- **Auth:** none.
- **Verify:** `Doctor.ts` → interceptor ✅ (skill present + browser found).

## ripgrep — fast filesystem search

**Powers:** ContextSearch queries, the work sweep, and the model-drift scan. LifeOS treats the filesystem as its index instead of a vector store, so shipped tools shell out to `rg` directly.

- **Install:** `brew install ripgrep` (Linux: `sudo apt-get install ripgrep`)
- **Auth:** none.
- **Verify:** `Doctor.ts` → ripgrep ✅
- **Note:** the built-in `Grep` tool is already ripgrep-backed and works regardless; this is for the tools that spawn `rg` themselves.

## ImageMagick — image inspection

**Powers:** Interceptor's blank-frame guard, its measured zoom, and Art's composition steps.

- **Install:** `brew install imagemagick` (Linux: `sudo apt-get install imagemagick`)
- **Auth:** none.
- **Verify:** `Doctor.ts` → imagemagick ✅
- **Note:** without it, `Capture.sh` still returns a screenshot but prints `BLANK-FRAME GUARD SKIPPED` — the capture is then unchecked for a black or blank frame, so don't cite it as pixel-verified without looking at it yourself.

## Cloudflare / wrangler — scheduled cloud flows

**Powers:** the "runs while you sleep" layer (Arbol) and Worker deploys.

- **Install:** wrangler runs via `bunx wrangler` — nothing global needed.
- **Auth:** create a Cloudflare API token (Workers permissions), add to `<configRoot>/.env` as `CLOUDFLARE_API_TOKEN=...`
- **Verify:** `Doctor.ts --network` → cloudflare ✅ (runs a real `wrangler whoami`).
- **Don't want it?** `Doctor.ts decline cloudflare`.

## ElevenLabs — voice notifications

**Powers:** spoken notifications through the Pulse voice server.

- **Install:** nothing — it's an API.
- **Auth:** add `ELEVENLABS_API_KEY=...` and `ELEVENLABS_VOICE_ID=...` to `<configRoot>/.env`. Pick a **premade or cloned** voice from your ElevenLabs library — "famous" voices are not usable through the API and fail with `famous_voice_not_permitted`. A scoped, TTS-only API key works fine.
- **Verify:** `Doctor.ts --network` → voice ✅ (runs a real 2-character synthesis on the exact path notifications use).
- **Don't want it?** `Doctor.ts decline voice` — notifications stay on-screen only.

---

## How degradation works (so you can trust it)

- The Doctor writes an **advisory manifest** (`LIFEOS/MEMORY/STATE/capabilities.json`). It's a cache with TTLs, not truth — the runtime re-checks cheaply at the moment a capability is actually used.
- A **broken** capability warns once at the moment you'd have used it, with its fix command. Cooldowns prevent nagging.
- A **declined** capability is silent forever, everywhere.
- Output produced without a doctrine-relevant capability is **labeled** (e.g. "same-vendor audit only") — absence is never hidden inside a confident result.
- The manifest is tamper-evident: `Doctor.ts --verify` flags any edit made outside the Doctor.

That's the contract: nothing here scores you, nothing nags, and nothing pretends.
