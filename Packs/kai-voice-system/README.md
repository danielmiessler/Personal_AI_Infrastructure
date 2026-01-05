---
name: Kai Voice System
pack-id: danielmiessler-kai-voice-system-core-v1.4.0
version: 1.4.0
author: danielmiessler
description: Voice notification system with multi-provider TTS (Google Cloud or ElevenLabs), prosody enhancement for natural speech, and agent personality-driven voice delivery
type: feature
purpose-type: [notifications, accessibility, automation]
platform: macos, linux
dependencies:
  - kai-hook-system (required) - Hooks trigger voice notifications
  - kai-core-install (required) - Skills, identity, and response format drive voice output
keywords: [voice, tts, elevenlabs, google-cloud-tts, notifications, prosody, speech, agents, personalities, accessibility]
---

<p align="center">
  <img src="../icons/kai-voice-system-v2.png" alt="Kai Voice System" width="256">
</p>

# Kai Voice System (kai-voice-system)

> Voice notification system with natural speech synthesis and personality-driven delivery

## 🚨 Platform Requirements

| Platform | Status | Notes |
|----------|--------|-------|
| **macOS** | ✅ Fully Supported | Uses `afplay` (built-in) for audio playback |
| **Linux** | ✅ Fully Supported | Auto-detects `mpg123`, `mpv`, or `paplay` for audio |
| **Windows** | ❌ Not Supported | No current implementation |

**Audio player priority (Linux):** mpg123 → mpv → paplay (install one: `sudo apt install mpg123`)

---

## What This Pack Provides

- **Spoken Notifications**: Hear task completions via text-to-speech
- **Multi-Provider TTS**: Choose between Google Cloud TTS or ElevenLabs
- **Prosody Enhancement**: Natural speech patterns with emotional markers
- **Agent Personalities**: Different voices for different agent types
- **Intelligent Cleaning**: Strips code blocks and artifacts for clean speech
- **Graceful Degradation**: Works silently when voice server is offline

## TTS Provider Options

Choose your text-to-speech provider based on your needs:

| Provider | Free Tier | Quality | Setup |
|----------|-----------|---------|-------|
| **Google Cloud TTS** | 4M chars/month | High (Neural2/WaveNet) | Google API key |
| **ElevenLabs** | ~10K chars/month | Premium | ElevenLabs API key |

**Recommendation:** Google Cloud TTS offers **400x more free characters** — effectively unlimited for typical PAI notification usage.

### Configuration

Set in your `.env` file:

```bash
# Choose provider: "google" or "elevenlabs" (default: elevenlabs)
TTS_PROVIDER=google

# Google Cloud TTS (if using google)
GOOGLE_API_KEY=your_google_api_key
GOOGLE_TTS_VOICE=en-US-Neural2-J  # Optional, has sensible default

# ElevenLabs (if using elevenlabs)
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_VOICE_ID=your_voice_id

# Voice strict mode (optional)
# When true, only speak when COMPLETED message is detected (silent skip otherwise)
VOICE_STRICT_MODE=false
```

### Google Cloud TTS Voices

| Voice | Type | Description |
|-------|------|-------------|
| `en-US-Neural2-J` | Neural2 (default) | Natural male voice |
| `en-US-Neural2-F` | Neural2 | Natural female voice |
| `en-US-Wavenet-D` | WaveNet | Premium male voice |
| `en-US-Standard-A` | Standard | Basic voice (more free chars) |

See [Google Cloud TTS voices](https://cloud.google.com/text-to-speech/docs/voices) for full list.

## Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Stop Hook     │ ───► │  Voice Server    │ ───► │  TTS Provider   │
│ (extracts msg)  │      │  (localhost:8888)│      │                 │
└─────────────────┘      └──────────────────┘      │ ┌─────────────┐ │
                                                   │ │ Google TTS  │ │
                                                   │ └─────────────┘ │
                                                   │ ┌─────────────┐ │
                                                   │ │ ElevenLabs  │ │
                                                   │ └─────────────┘ │
                                                   └─────────────────┘
```

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
| Voice stop hook | `src/hooks/stop-hook-voice.ts` | Main agent voice notification |
| Subagent voice hook | `src/hooks/subagent-stop-hook-voice.ts` | Subagent voice notification |
| Prosody enhancer | `src/hooks/lib/prosody-enhancer.ts` | Add emotion/pauses to speech |
| Voice server | `src/voice/server.ts` | HTTP server for TTS requests |
| Server management | `src/voice/manage.sh` | Start/stop/restart server |
| Voice personalities | `config/voice-personalities.json` | Agent voice configurations |
| Hook configuration | `config/settings-hooks.json` | Hook registration template |

**Summary:**
- **Files created:** 7
- **Hooks registered:** 2 (Stop, SubagentStop)
- **Dependencies:** kai-hook-system (required), kai-core-install (required)
- **TTS API key:** Google Cloud API key OR ElevenLabs API key (choose one)

## Agent Voice Mapping

| Agent Type | Voice Name | Speaking Rate | Stability | Archetype |
|------------|------------|---------------|-----------|-----------|
| PAI (Main) | Your DA | 235 wpm | 0.38 | enthusiast |
| Intern | Dev Patel | 270 wpm | 0.30 | enthusiast |
| Engineer | Marcus Webb | 212 wpm | 0.72 | wise-leader |
| Architect | Serena Blackwood | 205 wpm | 0.75 | wise-leader |
| Researcher | Ava Sterling | 229 wpm | 0.64 | analyst |
| Designer | Aditi Sharma | 226 wpm | 0.52 | critic |
| Artist | Priya Desai | 215 wpm | 0.20 | enthusiast |
| Pentester | Rook Blackburn | 260 wpm | 0.18 | enthusiast |
| Writer | Emma Hartley | 230 wpm | 0.48 | storyteller |

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

## Credits

- **Author:** Daniel Miessler
- **Origin:** Extracted from production Kai system (2024-2025)
- **License:** MIT

## Works Well With

- **kai-hook-system** (required) - Hooks trigger voice notifications
- **kai-core-install** (required) - Response format provides 🎯 COMPLETED line
- **kai-history-system** - Complementary functionality

## Changelog

### 1.4.0 - 2026-01-06
- Added `VOICE_STRICT_MODE` environment variable for silent skip when no COMPLETED found
- When enabled, voice notifications only trigger if COMPLETED message is detected

### 1.3.0 - 2025-12-29
- Initial release with multi-provider TTS support
- Google Cloud TTS and ElevenLabs integration
- Prosody enhancement pipeline
- Agent personality voice mapping
