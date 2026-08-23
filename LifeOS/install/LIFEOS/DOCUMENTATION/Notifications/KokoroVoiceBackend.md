# Kokoro Voice Backend - private, local TTS (alternative to ElevenLabs)

LifeOS voice (`PULSE/VoiceServer/voice.ts`) ships with an ElevenLabs backend,
which sends the text of every notification to a cloud API and needs an API key.
This adds a **fully-local** alternative powered by [Kokoro](https://github.com/hexgrad/kokoro)
via [kokoro-js](https://www.npmjs.com/package/kokoro-js): no API key, and no text
or audio ever leaves the machine - a better fit for the privacy posture many
people want from a personal AI.

The footprint is deliberately small: no Python, no resident service. One opt-in
npm package (`kokoro-js`, TypeScript/ONNX), a daemon that is lazy-started on the
first utterance and exits itself when idle, and a ~90MB model fetched once to a
local cache. With `LIFEOS_VOICE_BACKEND` unset, nothing is installed, spawned,
or changed.

It also adds two small quality-of-life pieces built on the same state file: a
**live mute toggle** (bindable to a keyboard shortcut) and a **statusline
indicator** (🔊 / 🔇).

---

## How it works

`voice.ts` selects the backend from an env var, in `sendNotification()`:

```
LIFEOS_VOICE_BACKEND=kokoro   → POST http://127.0.0.1:$LIFEOS_KOKORO_PORT/speak   (local)
(unset / anything else)    → ElevenLabs (unchanged; requires elevenlabs_api_key)
```

The Kokoro path POSTs `{ text, voice }` to a small local daemon
(`kokoro_daemon.ts`, Bun/TypeScript) that synthesizes + plays the audio locally,
returning `200` on completion. `voice.ts` **lazy-starts the daemon on the first
utterance** and the daemon **exits itself after 10 idle minutes**
(`LIFEOS_KOKORO_IDLE_SECONDS`), so nothing stays resident and no LaunchAgent or
systemd unit is needed. If synthesis fails the error is logged - voice fails
safe, everything else keeps working.

## Setup

1. **Install the one opt-in dependency** (kept out of Pulse's default install):
   ```bash
   cd ~/.claude/LIFEOS/PULSE && bun add kokoro-js
   ```
   The Kokoro model (~90MB, quantized ONNX) downloads automatically on the first
   utterance into `$KOKORO_CACHE` (default `~/.cache/lifeos-voice`), so the very
   first spoken notification takes longer.
2. **Point LifeOS at it** by setting these in the Pulse process environment
   (e.g. the `com.lifeos.pulse` LaunchAgent's `EnvironmentVariables`, so the
   running Pulse process actually sees them):
   ```
   LIFEOS_VOICE_BACKEND=kokoro
   LIFEOS_KOKORO_VOICE=af_bella      # any Kokoro voice
   LIFEOS_KOKORO_PORT=7791
   ```
   Restart Pulse. `/notify` now speaks locally.

You can also run the daemon manually to try it or pre-download the model:
```bash
bun ~/.claude/LIFEOS/PULSE/VoiceServer/kokoro_daemon.ts
# GET /health → "ok"   POST /speak {"text":"hello"} → speaks
```

> Audio plays via `afplay` (macOS) by default. On Linux, set
> `LIFEOS_KOKORO_PLAYER=aplay` (or `paplay`) in the Pulse environment.
> `LIFEOS_KOKORO_IDLE_SECONDS=0` disables the idle exit if you prefer keeping
> the model warm indefinitely.

## Live mute toggle

`TOOLS/VoiceMute.ts` flips `PULSE/state/voice-mute.json`, which `voice.ts` reads
on **every** notification (no restart) and silences TTS while still returning
normally - desktop notifications are unaffected.

```bash
bun ~/.claude/LIFEOS/TOOLS/VoiceMute.ts toggle   # on | off | toggle | status
```

## Statusline indicator

`LIFEOS_StatusLine.sh` renders a speaker glyph next to the LifeOS header, read
live from the same state file: **🔊** audible / **🔇** muted.

## Optional: a keyboard shortcut (macOS, skhd)

Bind the toggle to a hotkey with [skhd](https://github.com/koekeishiya/skhd):

```
# ~/.config/skhd/skhdrc   (this path takes priority over ~/.skhdrc)
cmd + shift - m : /Users/<you>/.claude/LIFEOS/TOOLS/voice-mute-toggle.sh
```

`voice-mute-toggle.sh` is a dependency-free bash flip of the same state file,
made for hotkey daemons: skhd runs with a minimal `PATH` (no `~/.bun` or brew),
so pointing it at bun tends to break. `VoiceMute.ts` remains the richer CLI.

Gotchas worth knowing:
- **Use absolute paths** - even for the shell script, for the same `PATH` reason.
- **`~/.config/skhd/skhdrc` shadows `~/.skhdrc`** - if a hotkey seems to ignore
  your edits, you're probably editing the wrong file.
- **macOS "Secure Keyboard Entry"** (a checkbox in your terminal's app menu, not
  System Settings) blocks *all* hotkey daemons from capturing keys - turn it off
  if the binding never fires.
- Grant skhd **Accessibility** permission on first use.
