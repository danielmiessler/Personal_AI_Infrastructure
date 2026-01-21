---
name: PAI Voice System
pack-id: danielmiessler-voice-system-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: Text-to-speech notification server using ElevenLabs API with fallback to macOS say - gives your AI agent a voice
type: feature
purpose-type: [productivity, automation, integration]
platform: claude-code
dependencies: []
keywords: [voice, tts, speech, notifications, elevenlabs, audio, alerts, spoken, feedback, macos, agent-voice]
---

<p align="center">
  <img src="../icons/pai-voice-system.png" alt="PAI Voice System" width="256">
</p>

# PAI Voice System

> Text-to-speech notification server that gives your AI agent a voice - using ElevenLabs AI voices or macOS say as fallback

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds voice capabilities to your AI infrastructure. The PAI Voice System provides:

- **Spoken Feedback**: Hear your AI speak completions, alerts, and notifications
- **Multi-Voice Support**: Different voices for different agents (Architect, Engineer, Designer, etc.)
- **ElevenLabs Integration**: High-quality AI voices with personality-tuned settings
- **Fallback System**: Works without API key using macOS built-in voices
- **Zero Configuration**: Install and go - speaks immediately

**Core principle:** Your AI should be heard, not just read.

No more missing important completions. No more checking the terminal constantly. Your AI speaks to you while you focus elsewhere.

Please follow the installation instructions in INSTALL.md to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Voice Server | `src/VoiceServer/server.ts` | HTTP server handling TTS requests |
| Install Script | `src/VoiceServer/install.sh` | One-command installation |
| Start Script | `src/VoiceServer/start.sh` | Start the voice server |
| Stop Script | `src/VoiceServer/stop.sh` | Stop the voice server |
| Restart Script | `src/VoiceServer/restart.sh` | Restart the voice server |
| Status Script | `src/VoiceServer/status.sh` | Check server status |
| Uninstall Script | `src/VoiceServer/uninstall.sh` | Clean uninstallation |
| Voice Config | `src/VoiceServer/voices.json` | Agent voice personalities |
| Menu Bar | `src/VoiceServer/menubar/` | SwiftBar/BitBar integration |

**Summary:**
- **Files created:** 12+
- **Hooks registered:** 0 (server-only pack)
- **Dependencies:** Bun runtime, macOS, ElevenLabs API key (optional)

---

## The Concept and/or Problem

AI agents work silently. They complete tasks, generate outputs, and produce results - all without any notification that might reach you when you are not staring at the terminal.

This creates real problems:

**For Productivity:**
- You miss important completions while working elsewhere
- Context-switching to check "is it done yet?" breaks flow
- Long-running tasks complete without notice

**For Multi-Agent Systems:**
- Multiple agents finish at different times
- You cannot tell which agent completed which task
- Background agents complete silently

**For User Experience:**
- Text-only feedback feels cold and robotic
- Important alerts blend into scrolling text
- No emotional connection with your AI assistant

**The Fundamental Problem:**

AI agents are mute by default. They have no voice. Every output requires visual attention. In a world where we interact with AI constantly, this creates unnecessary friction and missed opportunities for natural communication.

---

## The Solution

The PAI Voice System solves this through a dedicated HTTP server that converts text to speech on demand. Any system component can trigger voice output with a simple POST request.

**Core Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    PAI Voice System                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Hook/Agent/Tool                                            │
│         │                                                    │
│         ▼                                                    │
│   POST http://localhost:8888/notify                          │
│   {                                                          │
│     "message": "Task completed successfully",                │
│     "voice_id": "bIHbv24MWmeRgasZH58o",                      │
│     "title": "Agent Name"                                    │
│   }                                                          │
│         │                                                    │
│         ▼                                                    │
│   ┌─────────────────┐                                        │
│   │  Voice Server   │  (port 8888)                           │
│   │                 │                                        │
│   │  1. Sanitize    │  Strip markdown, validate              │
│   │  2. TTS Call    │  ElevenLabs or macOS say               │
│   │  3. Play Audio  │  afplay with volume control            │
│   │  4. Notify      │  macOS notification center             │
│   └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**

1. **ElevenLabs Integration**: High-quality AI voices with the `eleven_turbo_v2_5` model
2. **Voice Personalities**: Each agent can have distinct voice settings (stability, similarity_boost)
3. **macOS Fallback**: Works without API key using built-in `say` command
4. **Security**: Input sanitization, rate limiting (10 req/min), CORS restrictions
5. **LaunchAgent**: Auto-starts on login, runs in background
6. **Menu Bar**: Optional visual indicator with quick controls

**Design Principles:**

1. **Fire and Forget**: Callers do not wait for voice to complete
2. **Fail Gracefully**: Server issues never block other systems
3. **Local Only**: Listens only on localhost for security
4. **Zero Config**: Works immediately with sensible defaults

---

## What Makes This Different

This sounds similar to system TTS which also does text-to-speech. What makes this approach different?

The PAI Voice System is purpose-built for AI agent infrastructure. It provides agent-specific voice personalities, hook integration, and personality-tuned voice settings that make each agent sound distinct. Unlike generic TTS, this creates an immersive multi-agent experience where you can identify which agent is speaking.

- Agent personalities with distinct voice characteristics.
- HTTP API enables any component to speak.
- Auto-start as macOS LaunchAgent service.
- Menu bar indicator shows server status.

---

## Configuration

**Environment variables (add to ~/.env):**

```bash
# Required for ElevenLabs voices (optional - falls back to macOS say)
ELEVENLABS_API_KEY=your_api_key_here

# Default voice ID (optional)
ELEVENLABS_VOICE_ID=bIHbv24MWmeRgasZH58o

# Server port (optional, defaults to 8888)
PORT=8888
```

Get a free ElevenLabs API key at [elevenlabs.io](https://elevenlabs.io) (10,000 characters/month free).

---

## Example Usage

### Basic Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Task completed successfully"}'
```

### Agent-Specific Voice

```bash
# Male voice (e.g., Engineer)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Build completed with zero errors",
    "voice_id": "bIHbv24MWmeRgasZH58o",
    "title": "Engineer Agent"
  }'

# Female voice (e.g., Designer)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Design review complete, two issues found",
    "voice_id": "MClEFoImJXBTgLwdLI5n",
    "title": "Designer Agent"
  }'

# Neutral voice (e.g., Researcher)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Research synthesis ready for review",
    "voice_id": "M563YhMmA0S8vEYwkgYa",
    "title": "Research Agent"
  }'
```

### Health Check

```bash
curl http://localhost:8888/health
# Returns: {"status":"healthy","port":8888,"voice_system":"ElevenLabs",...}
```

---

## Voice IDs Reference

| Type | Voice ID | Use Case |
|------|----------|----------|
| Male | `bIHbv24MWmeRgasZH58o` | Engineer, Architect, technical agents |
| Female | `MClEFoImJXBTgLwdLI5n` | Designer, Writer, creative agents |
| Neutral | `M563YhMmA0S8vEYwkgYa` | Researcher, Analyst, neutral roles |

Find more voices at [ElevenLabs Voice Library](https://elevenlabs.io/voice-library).

---

## Customization

### Recommended Customization

**What to Customize:** Voice personalities in `voices.json`

**Why:** Different agents should sound distinct - an enthusiastic intern vs. a measured architect

**Process:**
1. Open `$PAI_DIR/VoiceServer/voices.json`
2. Adjust `stability` (0.0-1.0): Lower = more expressive, Higher = more consistent
3. Adjust `similarity_boost` (0.0-1.0): Higher = closer to original voice
4. Save and restart: `./restart.sh`

**Expected Outcome:** Each agent has a recognizable voice personality

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| Default volume | voices.json (`default_volume`) | 0.0-1.0 scale for all voices |
| Speaking rate | voices.json (`rate_multiplier`) | Speed of speech |
| Custom voices | voices.json | Add your own ElevenLabs voices |

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of PAI personal AI infrastructure
- **ElevenLabs**: Text-to-speech API providing high-quality AI voices
- **SwiftBar/BitBar**: Menu bar integration for macOS

---

## Changelog

### 2.3.0 - 2026-01-14
- Packaged for PAI v2.3 release
- Simplified prosody system (removed emotional markers)
- Updated documentation with generic voice IDs

### 1.5.0 - 2026-01-12
- Removed prosody enhancement system for simplicity
- Voice personalities provide sufficient variation

### 1.4.0 - 2025-12-09
- Added volume control (`default_volume` in voices.json)
- Calmer startup voice

### 1.0.0 - 2025-11-16
- Initial release with ElevenLabs integration
- Multi-voice support for agent personalities
- macOS LaunchAgent for auto-start
