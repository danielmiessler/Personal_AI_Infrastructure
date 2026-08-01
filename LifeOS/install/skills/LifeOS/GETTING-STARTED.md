# Getting Started — after the install

You installed LifeOS. This page covers the part `INSTALL.md` couldn't: the **external tools** LifeOS's doctrine uses when they're available. Almost all of them are optional and degrade honestly when absent — each just unlocks a real capability. For each: what it powers, how to set it up, and how to prove it's live.

**One exception, stated plainly:** `gh` is not optional if you use the Work System. That system keeps its system of record in a private GitHub repo, and every reader reaches it by spawning `gh` with no fallback — so without `gh`, work capture *fails* rather than degrading. Everything else on this page really is optional.

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

## gh — the work system of record

**Powers:** work capture, the work and commitment sweeps, `TASKLIST.md` regeneration, and the Pulse Work tab. The Work System keeps its system of record in a private GitHub repo, and every reader reaches it through `gh`.

- **Install:** `brew install gh` (Linux: see [cli.github.com](https://cli.github.com))
- **Auth:** `gh auth login`
- **Verify:** `Doctor.ts` → gh ✅
- **Note:** the tools that use it spawn `gh` with **no fallback**, so without it work capture fails rather than degrading — this is the one entry on the page that breaks the "everything degrades" promise, and the one most worth installing first.

## ripgrep — fast filesystem search

**Powers:** ContextSearch queries, the work sweep, and the model-drift scan. LifeOS treats the filesystem as its index instead of a vector store, so shipped tools shell out to `rg` directly.

- **Install:** `brew install ripgrep` (Linux: `sudo apt-get install ripgrep`)
- **Auth:** none.
- **Verify:** `Doctor.ts` → ripgrep ✅
- **Note:** the built-in `Grep` tool is already ripgrep-backed and works regardless; this is for the tools that spawn `rg` themselves.

## ImageMagick — image inspection

**Powers:** Interceptor's blank-frame guard, its measured zoom (`skills/Interceptor/Tools/Zoom.ts`), and Art's composition steps.

- **Install:** `brew install imagemagick` (Linux: `sudo apt-get install imagemagick`)
- **Auth:** none.
- **Verify:** `Doctor.ts` → imagemagick ✅
- **Note:** without it, `Capture.sh` still returns a screenshot but prints `BLANK-FRAME GUARD SKIPPED` — the capture is then unchecked for a black or blank frame, so don't cite it as pixel-verified without looking at it yourself.

## ffmpeg — audio and video

**Powers:** AudioEditor's cutting pipeline, transcript splitting for long recordings, Conveyor renders, and Interceptor's zoom fallback when ImageMagick is absent.

- **Install:** `brew install ffmpeg` (Linux: `sudo apt-get install ffmpeg`)
- **Auth:** none.
- **Verify:** `Doctor.ts` → ffmpeg ✅

## yt-dlp — YouTube ingestion

**Powers:** the Feed system's YouTube source and the Upgrade skill's channel scan.

- **Install:** `brew install yt-dlp` (Linux: `sudo apt-get install yt-dlp`)
- **Auth:** none.
- **Verify:** `Doctor.ts` → ytdlp ✅

## fabric — prompt patterns

**Powers:** the Fabric skill's pattern library and its YouTube transcript fetch.

- **Install:** see the fabric project.
- **Auth:** per fabric's own setup.
- **Verify:** `Doctor.ts` → fabric ✅

## jq — JSON in shell hooks

**Powers:** the shell hooks that parse JSON, including the command-compression rewrite.

- **Install:** `brew install jq` (Linux: `sudo apt-get install jq`)
- **Auth:** none.
- **Verify:** `Doctor.ts` → jq ✅
- **Note:** hooks that need it check first and skip silently when it's missing, so absence costs the feature, never the tool call.

## Smaller optional tools

These are narrower — tied to one terminal, one platform, or one opt-in workflow — so the Doctor doesn't check them. Each is skipped cleanly when absent.

| Tool | Powers | Install |
|------|--------|---------|
| `rtk` | Transparent command compression on the Bash pre-tool hook — compresses what the model *watches* (git status, test and build runs), never what it *reads*. Skips silently without it (also needs `jq`). | `brew install rtk`, or take the release binary. **Do not run `rtk init -g`**: that installs rtk's own global hook alongside LifeOS's `ContextReduction.hook.sh` and you get two rewriters on the same command. rtk also keeps a local `history.db` of proxied commands, and its telemetry is opt-in — `rtk telemetry disable` makes that explicit. |
| `kitten` | Terminal tab naming and the retro banner, on the kitty terminal only. | ships with kitty |
| `cmux` | The CMUX agent cockpit skill. macOS only. | see the cmux project |
| `mkcert` | Local HTTPS certificates during Pulse setup. Pulse runs over HTTP without it. | `brew install mkcert` |
| `gws` | Pulse job-output email and the Conveyor YouTube OAuth client. | see the gws project |

---

## How degradation works (so you can trust it)

- The Doctor writes an **advisory manifest** (`LIFEOS/MEMORY/STATE/capabilities.json`). It's a cache with TTLs, not truth — the runtime re-checks cheaply at the moment a capability is actually used.
- A **broken** capability warns once at the moment you'd have used it, with its fix command. Cooldowns prevent nagging.
- A **declined** capability is silent forever, everywhere.
- Output produced without a doctrine-relevant capability is **labeled** (e.g. "same-vendor audit only") — absence is never hidden inside a confident result.
- The manifest is tamper-evident: `Doctor.ts --verify` flags any edit made outside the Doctor.

That's the contract: nothing here scores you, nothing nags, and nothing pretends.
