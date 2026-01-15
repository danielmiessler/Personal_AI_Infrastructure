---
name: PAI Voice System
pack-id: danielmiessler-pai-voice-system-v1.1.0
version: 1.1.0
author: danielmiessler, sti0
description: Voice notification system with ElevenLabs TTS, prosody enhancement for natural speech, and agent personality-driven voice delivery
type: feature
purpose-type: [notifications, accessibility, automation]
platform: macos, linux
dependencies:
  - pai-hook-system (required) - Hooks trigger voice notifications
  - pai-core-install (required) - Skills, identity, and response format drive voice output
keywords: [voice, tts, elevenlabs, notifications, prosody, speech, agents, personalities, accessibility]
---

<p align="center">
  <img src="../icons/pai-voice-system-v2.png" alt="PAI Voice System" width="256">
</p>

# PAI Voice System (pai-voice-system)

> Voice notification system with natural speech synthesis and personality-driven delivery

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## Platform Requirements

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS** | ✅ Fully Supported | Uses `afplay` (built-in) for audio playback |
| **Linux** | ✅ Fully Supported | Auto-detects `mpg123` or `mpv` for audio playback |
| **Windows** | ❌ Not Supported | No current implementation |

**Audio player priority (Linux):** mpg123 → mpv (install one: `sudo apt install mpg123`)

---

## What This Pack Provides

- **Spoken Notifications**: Hear task completions via text-to-speech
- **ElevenLabs TTS**: High-quality voice synthesis via ElevenLabs API
- **Prosody Enhancement**: Natural speech patterns with 13 emotional markers
- **Agent Personalities**: Different voices for different agent types
- **Intelligent Cleaning**: Strips code blocks and artifacts for clean speech
- **Graceful Degradation**: Works silently when voice server is offline

## Audio Player Configuration

Configure extra arguments for audio players (useful for containers or specific audio setups):

**Environment Variable:**
```bash
# In $PAI_DIR/.env
PAI_VOICE_SERVER_EXTRA_ARGS="-o pulse"
```

**CLI Flag (overrides env var):**
```bash
bun run server.ts --extra-args="-o pulse"
```

**Common use cases:**
| Use Case | Configuration |
|----------|---------------|
| Container with PulseAudio | `PAI_VOICE_SERVER_EXTRA_ARGS="-o pulse"` |
| Specific ALSA device | `PAI_VOICE_SERVER_EXTRA_ARGS="-o alsa -a hw:1,0"` |

### Devcontainer Setup

To use voice notifications inside a devcontainer:

1. **Mount PulseAudio socket** from host in `devcontainer.json`
2. **Set `PAI_VOICE_SERVER_EXTRA_ARGS`** in your `.env` file

**Example `devcontainer.json`:**
```json
{
  "name": "My Devcontainer",
  "image": "mcr.microsoft.com/devcontainers/python:2-3.12-bullseye",
  "mounts": [
    "source=/run/user/1000/pulse,target=/run/user/1000/pulse,type=bind"
  ],
  "runArgs": [
    "--device=/dev/snd:/dev/snd"
  ],
  "containerEnv": {
    "PULSE_SERVER": "unix:/run/user/1000/pulse/native"
  }
}
```

**In your `$PAI_DIR/.env`:**
```bash
PAI_VOICE_SERVER_EXTRA_ARGS="-o pulse"
```

**Key points:**
- Mount `/run/user/1000/pulse` to access host's PulseAudio
- Set `PULSE_SERVER` in container so audio apps find the socket
- Set `PAI_VOICE_SERVER_EXTRA_ARGS` in `.env` (not devcontainer.json)

---

## Voice Server

The voice server runs locally on port 8888 and:
- Receives notification requests via HTTP POST
- Generates speech using ElevenLabs API
- Plays audio using system audio player
- Supports emotional markers for prosody variation

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/notify` | POST | Full notification with voice/emotion support |
| `/pai` | POST | Simple notification with default voice |
| `/health` | GET | Health check and configuration status |

### Example Request

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Task completed successfully", "voice_enabled": true}'
```

## Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Stop Hook     │ ───► │  Voice Server    │ ───► │  ElevenLabs     │
│ (extracts msg)  │      │  (localhost:8888)│      │  TTS API        │
└─────────────────┘      └──────────────────┘      └─────────────────┘
        │                         │
        │                         ▼
        │                ┌─────────────────┐
        │                │  Audio Player   │
        │                │  (afplay)       │
        │                └─────────────────┘
        │
        ▼
┌─────────────────┐
│ Response Format │
│ 🗣️ [AI_NAME]:  │
└─────────────────┘
```

## Response Format Integration

The voice system reads from the response format defined in `pai-core-install`:

```
🗣️ PAI: [12 words max - spoken aloud by voice server]
```

The hook extracts this line, enhances it with prosody markers, and sends it to the voice server.

## The 5-Layer Prosody Enhancement Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                    PROSODY ENHANCEMENT PIPELINE                   │
├──────────────────────────────────────────────────────────────────┤
│  1. TEXT EXTRACTION         Raw completion message                │
│  2. CONTEXT ANALYSIS        Detect emotional patterns             │
│  3. PERSONALITY PROSODY     Agent-specific speech patterns        │
│  4. SPEECH CLEANING         Remove non-spoken artifacts           │
│  5. VOICE DELIVERY          Personality → Voice ID routing        │
└──────────────────────────────────────────────────────────────────┘
```

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Voice server | `src/voice/server.ts` | HTTP server for TTS requests |
| Server management | `src/voice/manage.sh` | Start/stop/restart server |
| Voice stop hook | `src/hooks/stop-hook-voice.ts` | Main agent voice notification |
| Subagent voice hook | `src/hooks/subagent-stop-hook-voice.ts` | Subagent voice notification |
| Prosody enhancer | `src/hooks/lib/prosody-enhancer.ts` | Add emotion/pauses to speech |
| Voice personalities | `voice-personalities.json` | Agent voice configurations |

**Summary:**
- **Files created:** 6
- **Hooks registered:** 2 (Stop, SubagentStop)
- **Dependencies:** pai-hook-system (required), pai-core-install (required)
- **TTS API key:** ElevenLabs API key required

## Emotional Detection

The prosody enhancer detects emotional context from message patterns:

| Priority | Emotion | Triggers | Marker |
|----------|---------|----------|--------|
| 1 | urgent | "critical", "broken", "failing" | [🚨 urgent] |
| 2 | debugging | "bug", "error", "tracking" | [🐛 debugging] |
| 3 | insight | "wait", "aha", "I see" | [💡 insight] |
| 4 | celebration | "finally", "phew", "we did it" | [🎉 celebration] |
| 5 | excited | "breakthrough", "discovered" | [💥 excited] |
| 6 | investigating | "analyzing", "examining" | [🔍 investigating] |
| 7 | progress | "phase complete", "moving to" | [📈 progress] |
| 8 | success | "completed", "fixed", "deployed" | [✨ success] |
| 9 | caution | "warning", "careful", "partial" | [⚠️ caution] |

These markers are embedded in the message and the voice server adjusts stability/similarity_boost parameters accordingly.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ELEVENLABS_API_KEY` | Yes | - | Your ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | Yes | - | Default voice ID for TTS |
| `PAI_VOICE_SERVER_PORT` | No | 8888 | Voice server port |
| `PAI_VOICE_SERVER_EXTRA_ARGS` | No | - | Extra arguments for audio player |
| `VOICE_SERVER_URL` | No | http://localhost:8888 | Voice server URL (for hooks) |
| `PAI_DIR` | No | ~/.config/pai | PAI installation directory |

## Agent Voice Mapping

Configure multiple voices in `voice-personalities.json` for multi-agent conversations:

```json
{
  "voices": {
    "PAI": {
      "voice_id": "YOUR_VOICE_ID",
      "stability": 0.5,
      "similarity_boost": 0.5,
      "description": "Default PAI voice"
    },
    "Engineer": {
      "voice_id": "ENGINEER_VOICE_ID",
      "stability": 0.72,
      "similarity_boost": 0.65,
      "description": "Technical, precise"
    }
  }
}
```

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production Kai system (2024-2026)
- **License:** MIT

## Works Well With

- **pai-hook-system** (required) - Hooks trigger voice notifications
- **pai-core-install** (required) - Response format provides 🗣️ line
- **pai-history-system** - Complementary functionality

## Changelog

### 1.1.0 - 2026-01-09
- Added Linux audio support (mpg123, mpv auto-detection)
- Added Linux notifications via notify-send
- Added CLI arguments: `--port/-p`, `--extra-args`
- Added `PAI_VOICE_SERVER_PORT` and `PAI_VOICE_SERVER_EXTRA_ARGS` env vars
- Enhanced .env loading from `$PAI_DIR/.env` with quote stripping
- Added devcontainer/PulseAudio documentation

### 1.0.1 - 2026-01-09
- **Documentation fixes**: INSTALL.md and VERIFY.md now correctly reference actual files
- Fixed: References to non-existent `start.sh`, `stop.sh`, `restart.sh`, `status.sh` → use `manage.sh`
- Fixed: `voices.json` → `voice-personalities.json`
- Fixed: `voice-server/` → `VoiceServer/` directory paths
- Clarified: Full voice server IS included at `src/voice/server.ts` (553 lines)

### 1.0.0 - 2026-01-08
- Initial release with complete voice server implementation
- ElevenLabs TTS voice server (`src/voice/server.ts`)
- Server management script (`src/voice/manage.sh`)
- Main agent stop hook (`src/hooks/stop-hook-voice.ts`)
- Subagent stop hook (`src/hooks/subagent-stop-hook-voice.ts`)
- Prosody enhancer with 13 emotional markers
- Voice personalities configuration
- Integrates with pai-core-install response format (`🗣️ [AI_NAME]:`)
