---
name: Kai Voice System
pack-id: danielmiessler-kai-voice-system-core-v1.1.0
version: 1.1.0
author: danielmiessler
description: Voice notification system with ElevenLabs TTS, prosody enhancement for natural speech, and agent personality-driven voice delivery
type: feature
purpose-type: [notifications, accessibility, automation]
platform: claude-code
dependencies:
  - kai-hook-system (required) - Hooks trigger voice notifications
  - kai-core-install (required) - Skills, identity, and response format drive voice output
keywords: [voice, tts, elevenlabs, notifications, prosody, speech, agents, personalities, accessibility]
---

<p align="center">
  <img src="icons/kai-voice-system-v2.png" alt="Kai Voice System" width="256">
</p>

# Kai Voice System (kai-voice-system)

> Voice notification system with natural speech synthesis and personality-driven delivery

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#pack-system)

This Pack adds voice notifications to your AI infrastructure. The Kai Voice System provides:

- **Spoken Notifications**: Hear task completions via ElevenLabs text-to-speech
- **Prosody Enhancement**: Natural speech patterns with emotional markers
- **Agent Personalities**: Different voices for different agent types
- **Intelligent Cleaning**: Strips code blocks and artifacts for clean speech
- **Graceful Degradation**: Works silently when voice server is offline

**Core principle:** Your AI should speak to you, not just display text.

When tasks complete, you hear the results. When agents finish work, they announce themselves. This transforms AI from a silent tool into an audible assistant.

Please follow the installation instructions below to integrate this Pack into your infrastructure.

**Quick Navigation:** [What's Included](#whats-included) | [The Problem](#the-concept-andor-problem) | [The Solution](#the-solution) | [Installation](#installation) | [Troubleshooting](#troubleshooting) | [Configuration](#configuration) | [Changelog](#changelog)

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Voice stop hook | `hooks/stop-hook-voice.ts` | Main agent voice notification |
| Subagent voice hook | `hooks/subagent-stop-hook-voice.ts` | Subagent voice notification |
| Prosody enhancer | `hooks/lib/prosody-enhancer.ts` | Add emotion/pauses to speech |
| Voice server | `voice/server.ts` | HTTP server for TTS requests |
| Server management | `voice/manage.sh` | Start/stop/restart server |
| LaunchAgent | `com.pai.voice-server.plist` | Auto-start on login (macOS) |

**Summary:**
- **Files created:** 6
- **Hooks registered:** 2 (Stop, SubagentStop)
- **Dependencies:** kai-hook-system (required), kai-core-install (required), ElevenLabs API key

---

## The Concept and/or Problem

AI agents complete work constantly, but you only know if you're watching the screen:

- Tasks finish while you're in another window
- Background agents complete research you need to review
- Errors happen silently without notification
- Multi-hour operations give no status updates

**The Text-Only Problem:**

Traditional AI interfaces are entirely visual. You must:
- Watch the terminal for completions
- Monitor multiple windows for agent outputs
- Manually check status periodically
- Parse dense text output for results

**The Opportunity:**

Voice transforms AI interaction:
- Hear completions anywhere in the room
- Get status updates while doing other work
- Know immediately when things complete or fail
- Different agent voices indicate who's reporting

**Beyond Basic TTS:**

Simple text-to-speech sounds robotic. Real voice needs:
- Prosody: **bold** words get emphasis, `...` creates pauses
- Emotion: Success sounds different from warnings
- Personality: Different agents have different voices
- Intelligence: Code blocks are summarized, not read verbatim

---

## The Solution

The Kai Voice System provides natural-sounding voice output:

**Core Architecture:**

```
$PAI_DIR/
├── hooks/
│   ├── stop-hook-voice.ts           # Main agent voice notification
│   ├── subagent-stop-hook-voice.ts  # Subagent voice notification
│   └── lib/
│       └── prosody-enhancer.ts      # Prosody and emotion enhancement
├── config/
│   └── voice-personalities.json     # Agent voice configurations
└── settings.json                    # Hook configuration
```

**Notification Server Pattern:**

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Stop Hook     │ ───► │  Voice Server    │ ───► │   ElevenLabs    │
│ (extracts msg)  │      │  (localhost:8888)│      │   (TTS API)     │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

**Prosody Enhancement:**

| Input | Output | Effect |
|-------|--------|--------|
| `**fixed** the bug` | `[✨ success] **fixed** the bug!` | Emphasis + emotion |
| `found the issue... finally` | As-is | Natural pause preserved |
| `CRITICAL error in auth` | `[🚨 urgent] **CRITICAL** error in auth` | Urgency marker |
| `\`\`\`code block\`\`\`` | `code block` | Stripped for speech |

**Agent Voice Mapping:**

| Agent Type | Voice ID | Voice Name | Speaking Rate | Stability |
|------------|----------|------------|---------------|-----------|
| PAI (Main) | `P9S3WZL3JE8uQqgYH5B7` | Your DA | 235 wpm | 0.38 |
| Intern | `d3MFdIuCfbAIwiu7jC4a` | Dev Patel | 270 wpm | 0.30 |
| Engineer | `iLVmqjzCGGvqtMCk6vVQ` | Marcus Webb | 212 wpm | 0.72 |
| Architect | `muZKMsIDGYtIkjjiUS82` | Serena Blackwood | 205 wpm | 0.75 |
| Researcher | `AXdMgz6evoL7OPd7eU12` | Ava Sterling | 229 wpm | 0.64 |
| Designer | `ZF6FPAbjXT4488VcRRnw` | Aditi Sharma | 226 wpm | 0.52 |
| Artist | `cfc7wVYq4gw4OpcEEAom` | Priya Desai | 215 wpm | 0.20 |
| Pentester | `xvHLFjaUEpx4BOf7EiDd` | Rook Blackburn | 260 wpm | 0.18 |
| Writer | `gfRt6Z3Z8aTbpLfexQ7N` | Emma Hartley | 230 wpm | 0.48 |

## Why This Is Different

This sounds similar to basic text-to-speech tools like macOS's say command, which also read text aloud. What makes this approach different?

Basic TTS reads everything literally—code blocks, markdown syntax, technical artifacts. The Kai Voice System applies prosody enhancement before speech: bold text gets emphasis, ellipses create pauses, emotional markers adjust tone. It intelligently summarizes code blocks instead of reading them verbatim. Different agent personalities use different voices. The result is natural speech that sounds like a colleague reporting, not a screen reader monotonously parsing text.

- Prosody enhancement adds natural pauses and emphasis automatically
- Code blocks summarized instead of read character by character
- Agent personalities map to distinct ElevenLabs voice IDs
- Graceful degradation works silently when server is offline

---

## What Makes This Different

The Kai Voice System uses a **5-layer prosody enhancement pipeline** that transforms raw AI text into natural speech with emotional intelligence and personality-driven delivery:

```
┌──────────────────────────────────────────────────────────────────┐
│                    PROSODY ENHANCEMENT PIPELINE                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  1. TEXT EXTRACTION         Raw completion message          │  │
│  │     🎯 COMPLETED:           "fixed the authentication bug"  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  2. CONTEXT ANALYSIS        Detect emotional patterns       │  │
│  │     Pattern: "fixed"        → success emotion detected      │  │
│  │     Output:                 [✨ success] fixed the auth...  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  3. PERSONALITY PROSODY     Agent-specific speech patterns  │  │
│  │     Agent: "engineer"       → wise-leader archetype         │  │
│  │     Output:                 [✨ success] **fixed** the...   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  4. SPEECH CLEANING         Remove non-spoken artifacts     │  │
│  │     Strip: ```code```,      Preserve: **, ..., --           │  │
│  │            stray emoji      (prosody markers)               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  5. VOICE DELIVERY          Personality → Voice ID routing  │  │
│  │     Agent: "engineer"       → ELEVENLABS_VOICE_ENGINEER     │  │
│  │     Settings:               stability=0.72, rate=212wpm     │  │
│  │     → POST to voice server → ElevenLabs TTS → Audio output  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### How Data Flows Through the System

**Concrete example:** A background research agent completes a task:

```
Raw Output:                    "📋 SUMMARY: Analyzed competitor
                                ...
                                🎯 COMPLETED: [AGENT:Researcher]
                                Found 3 critical market gaps"

                                        │
     ┌──────────────────────────────────┼──────────────────────────────────┐
     │                                  │                                  │
     ▼                                  ▼                                  ▼
┌──────────┐                    ┌──────────────┐                   ┌──────────┐
│ Extract  │                    │ Detect       │                   │ Lookup   │
│ COMPLETED│                    │ agent type:  │                   │ voice:   │
│ line     │                    │ "researcher" │                   │ Analyst  │
└──────────┘                    └──────────────┘                   └──────────┘
     │                                  │                                  │
     │                                  │                                  │
     └──────────────────────────────────┼──────────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────┐
                    │  CONTEXT ANALYSIS                   │
                    │  Pattern: "Found 3" + "gaps"        │
                    │  → [💡 insight] emotion detected    │
                    └─────────────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────┐
                    │  PERSONALITY PROSODY                │
                    │  Analyst archetype: emphasize       │
                    │  findings → **Found** 3 critical... │
                    └─────────────────────────────────────┘
                                        │
                                        ▼
                    ┌─────────────────────────────────────┐
                    │  VOICE DELIVERY                     │
                    │  POST to localhost:8888/notify      │
                    │  {                                  │
                    │    title: "Researcher",             │
                    │    message: "[💡 insight] Researcher│
                    │      completed **Found** 3 critical │
                    │      market gaps",                  │
                    │    voice_id: "VOICE_RESEARCHER",    │
                    │    voice_enabled: true              │
                    │  }                                  │
                    └─────────────────────────────────────┘
                                        │
                                        ▼
                        ┌─────────────────────────┐
                        │  ELEVENLABS TTS          │
                        │  stability: 0.64         │
                        │  rate: 229 wpm           │
                        │  → Audio plays through   │
                        │    speakers              │
                        └─────────────────────────┘
```

### Why This Architecture Matters

1. **Emotional Intelligence**: The system doesn't just read text—it understands context. "Fixed the bug" becomes `[✨ success]` with emphasis. "CRITICAL error" becomes `[🚨 urgent]` with urgency markers.

2. **Personality-Specific Delivery**: Each agent type has distinct prosody patterns. Enthusiast agents get `!` endings and `...` pauses. Wise-leader agents get em-dashes (`--`) for thoughtful breaks. Same message, different delivery.

3. **Speech-First Cleaning**: The system knows what to speak and what to skip. Code blocks become "code block", inline code is stripped, but prosody markers (`**bold**`, `...`) are preserved for TTS emphasis.

4. **Graceful Degradation**: If the voice server is offline, hooks exit silently with code 0. No errors, no interruptions. Voice is an enhancement, not a dependency.

5. **Voice Routing Abstraction**: Agent types map to voice IDs via environment variables. Change voices by updating config, not code. Add new agents without touching existing hooks.

### The Emotional Detection Deep Dive

The prosody enhancer scans for patterns that indicate emotional context:

```
DETECTION PRIORITY (checked in order):
─────────────────────────────────────────
1. urgent     → "critical", "broken", "failing"    → [🚨 urgent]
2. debugging  → "bug", "error", "tracking"         → [🐛 debugging]
3. insight    → "wait", "aha", "I see"             → [💡 insight]
4. celebration→ "finally", "phew", "we did it"     → [🎉 celebration]
5. excited    → "breakthrough", "discovered"       → [💥 excited]
6. investigating → "analyzing", "examining"        → [🔍 investigating]
7. progress   → "phase complete", "moving to"      → [📈 progress]
8. success    → "completed", "fixed", "deployed"   → [✨ success]
9. caution    → "warning", "careful", "partial"    → [⚠️ caution]
```

If a message already has a marker (e.g., `[✨ success]`), detection is skipped to avoid double-marking.

### What Problems This Architecture Prevents

| Problem | Without Voice System | With Voice System |
|---------|---------------------|-------------------|
| **Missing completions** | Task finishes while you're in another window—you don't know | Hear announcement immediately |
| **Robotic TTS** | Basic TTS reads code blocks character-by-character | Intelligent cleaning summarizes code as "code block" |
| **No personality** | All agents sound the same | Each agent type has distinct voice and prosody |
| **Context-free delivery** | "Fixed the bug" sounds same as "CRITICAL error" | Emotional markers adjust tone automatically |
| **Server dependency** | TTS failure breaks the workflow | Graceful degradation—silent but functional |
| **Hardcoded voices** | Changing voices requires code changes | Environment variables abstract voice IDs |

### The Fundamental Insight

**Naive approach:** Read text aloud with basic TTS.

```
AI Output  →  say "completed fixing the authentication bug"  →  Robotic monotone
```

**Voice system approach:** Build a prosody enhancement pipeline that transforms text into emotionally-intelligent speech.

```
AI Output  →  Extract COMPLETED  →  Detect "fixed" = success
           →  Add [✨ success] marker
           →  Apply engineer prosody (em-dashes, emphasis on actions)
           →  Route to engineer voice ID (stability: 0.72, rate: 212wpm)
           →  POST to voice server  →  ElevenLabs TTS  →  Natural speech
```

The difference: Basic TTS treats AI output as text to read. The voice system treats AI output as information to communicate—with appropriate emotion, personality, and delivery.

---

## Installation

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **macOS**: This pack uses `afplay` for audio playback (macOS built-in). Linux users need to modify the audio playback section.
- **ElevenLabs account**: Sign up at [elevenlabs.io](https://elevenlabs.io) - see Step 8 for detailed setup
- **Required PAI Packs** (install these first):
  - `kai-hook-system` - Foundation hook infrastructure
  - `kai-core-install` - Skills, identity, and response format

---

### Pre-Installation: System Analysis

**IMPORTANT:** Before installing, analyze the current system state to verify dependencies and detect conflicts.

#### Step 0.1: Verify Required Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo "=== Checking Required Dependencies ==="

# Check hook system (REQUIRED)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ kai-hook-system is installed"
else
  echo "❌ kai-hook-system NOT installed - REQUIRED! Install it first."
fi

# Check core install (REQUIRED - includes skills and identity)
if [ -d "$PAI_CHECK/skills" ] && [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "✓ kai-core-install is installed (skills + CORE skill)"
else
  echo "❌ kai-core-install NOT installed - REQUIRED! Install it first."
fi

# Check for ElevenLabs API key in $PAI_DIR/.env
PAI_ENV="${PAI_DIR:-$HOME/.config/pai}/.env"
if [ -f "$PAI_ENV" ] && grep -q "ELEVENLABS_API_KEY" "$PAI_ENV"; then
  echo "✓ ELEVENLABS_API_KEY found in $PAI_ENV"
else
  echo "⚠️  ELEVENLABS_API_KEY not found - add it to $PAI_ENV"
fi
```

#### Step 0.2: Detect Existing Voice System

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

echo ""
echo "=== Checking for Existing Voice System ==="

# Check for existing voice directory
if [ -d "$PAI_CHECK/voice" ]; then
  echo "⚠️  Voice directory EXISTS at: $PAI_CHECK/voice"
  ls -la "$PAI_CHECK/voice" 2>/dev/null
else
  echo "✓ No existing voice directory (clean install)"
fi

# Check for voice server
if [ -f "$PAI_CHECK/voice/server.ts" ]; then
  echo "⚠️  Voice server already exists"
fi

# Check for running voice server
if lsof -i :8888 > /dev/null 2>&1; then
  echo "⚠️  Something is already running on port 8888 (voice server port)"
  lsof -i :8888 | head -3
else
  echo "✓ Port 8888 is available"
fi

# Check for LaunchAgent (macOS)
if [ -f "$HOME/Library/LaunchAgents/com.pai.voice-server.plist" ]; then
  echo "⚠️  Voice server LaunchAgent already exists"
fi

# Check for stop-hook integration
if [ -f "$PAI_CHECK/hooks/stop-hook.ts" ]; then
  if grep -q "voice" "$PAI_CHECK/hooks/stop-hook.ts" 2>/dev/null; then
    echo "⚠️  stop-hook.ts already has voice integration"
  else
    echo "ℹ️  stop-hook.ts exists but no voice integration (will be updated)"
  fi
fi
```

#### Step 0.3: Conflict Resolution Matrix

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No voice/, dependencies met | Proceed normally with Step 1 |
| **Missing Dependencies** | Hook/skill/identity missing | Install required packs first |
| **Voice Directory Exists** | Files in voice/ | Backup, then replace with new version |
| **Server Running on 8888** | Port in use | Stop existing server first |
| **LaunchAgent Exists** | Auto-start configured | Unload old agent before installing new |
| **stop-hook Has Voice** | Already integrated | Compare versions, may need merge |

#### Step 0.4: Stop Existing Voice Server (If Running)

```bash
# Stop any running voice server
if lsof -i :8888 > /dev/null 2>&1; then
  echo "Stopping existing voice server on port 8888..."
  pkill -f "voice/server.ts" 2>/dev/null || true
  sleep 1
fi

# Unload LaunchAgent if exists (macOS)
if [ -f "$HOME/Library/LaunchAgents/com.pai.voice-server.plist" ]; then
  launchctl unload "$HOME/Library/LaunchAgents/com.pai.voice-server.plist" 2>/dev/null
  echo "✓ Unloaded existing LaunchAgent"
fi
```

#### Step 0.5: Backup Existing Voice System (If Needed)

```bash
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

if [ -d "$PAI_CHECK/voice" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_CHECK/voice" "$BACKUP_DIR/voice"
  echo "✓ Backed up voice directory to $BACKUP_DIR/voice"
fi

if [ -f "$HOME/Library/LaunchAgents/com.pai.voice-server.plist" ]; then
  mkdir -p "$BACKUP_DIR/LaunchAgents"
  cp "$HOME/Library/LaunchAgents/com.pai.voice-server.plist" "$BACKUP_DIR/LaunchAgents/"
  echo "✓ Backed up LaunchAgent"
fi
```

**After completing system analysis, proceed to Step 1.**

---

### Why ElevenLabs (and Alternatives)

This Pack uses **ElevenLabs** for text-to-speech because they offer exceptionally high-quality, natural-sounding voices with emotional expressiveness. The voices genuinely sound human—not robotic—which makes the difference between a system you want to hear and one you mute.

**ElevenLabs is a paid service.** Pricing varies by usage tier, but expect to pay for the quality.

**Alternatives exist** and this Pack's architecture supports them:

| Alternative | Pros | Cons |
|-------------|------|------|
| **macOS `say` command** | Free, built-in, no API | Robotic, limited voices |
| **Windows SAPI** | Free, built-in | Limited quality |
| **Coqui TTS** | Free, open source, local | Requires setup, variable quality |
| **Piper TTS** | Free, fast, local | Limited voice options |
| **OpenAI TTS** | Good quality, simple API | Paid, less expressive than ElevenLabs |
| **Google Cloud TTS** | Good quality, many languages | Paid, requires setup |

**To use an alternative:** Modify the voice server (`server.ts`) to call a different TTS API. The hook architecture remains the same—only the final TTS call changes.

The voice IDs in this Pack are ElevenLabs-specific. If you switch providers, you'll need to map agent types to your provider's voice identifiers.

### Step 1: Create Directory Structure

```bash
# Create directories (if not already from hook-system)
mkdir -p $PAI_DIR/hooks/lib
mkdir -p $PAI_DIR/config

# Verify
ls -la $PAI_DIR/hooks/
```

---

### Step 2: Create Voice Configuration

Create the voice personality configuration file:

```json
// $PAI_DIR/config/voice-personalities.json
{
  "default_rate": 175,
  "notification_server": "http://localhost:8888/notify",
  "voices": {
    "pai": {
      "voice_id": "P9S3WZL3JE8uQqgYH5B7",
      "name": "PAI",
      "rate_wpm": 235,
      "stability": 0.38,
      "similarity_boost": 0.70,
      "archetype": "enthusiast",
      "description": "Your personal AI: expressive, helpful, genuinely invested in your success"
    },
    "engineer": {
      "voice_id": "iLVmqjzCGGvqtMCk6vVQ",
      "name": "Marcus Webb",
      "rate_wpm": 212,
      "stability": 0.72,
      "similarity_boost": 0.88,
      "archetype": "wise-leader",
      "description": "Battle-scarred leader: thinks in years not sprints"
    },
    "architect": {
      "voice_id": "muZKMsIDGYtIkjjiUS82",
      "name": "Serena Blackwood",
      "rate_wpm": 205,
      "stability": 0.75,
      "similarity_boost": 0.88,
      "archetype": "wise-leader",
      "description": "Academic wisdom: sees timeless patterns vs trends"
    },
    "intern": {
      "voice_id": "d3MFdIuCfbAIwiu7jC4a",
      "name": "Dev Patel",
      "rate_wpm": 270,
      "stability": 0.30,
      "similarity_boost": 0.65,
      "archetype": "enthusiast",
      "description": "Brilliant overachiever: brain races ahead"
    },
    "designer": {
      "voice_id": "ZF6FPAbjXT4488VcRRnw",
      "name": "Aditi Sharma",
      "rate_wpm": 226,
      "stability": 0.52,
      "similarity_boost": 0.84,
      "archetype": "critic",
      "description": "Design school perfectionist: exacting standards"
    },
    "researcher": {
      "voice_id": "AXdMgz6evoL7OPd7eU12",
      "name": "Ava Sterling",
      "rate_wpm": 229,
      "stability": 0.64,
      "similarity_boost": 0.90,
      "archetype": "analyst",
      "description": "Strategic thinker: sees three moves ahead"
    },
    "pentester": {
      "voice_id": "xvHLFjaUEpx4BOf7EiDd",
      "name": "Rook Blackburn",
      "rate_wpm": 260,
      "stability": 0.18,
      "similarity_boost": 0.85,
      "archetype": "enthusiast",
      "description": "Reformed grey hat: giddy finding vulnerabilities"
    },
    "artist": {
      "voice_id": "cfc7wVYq4gw4OpcEEAom",
      "name": "Priya Desai",
      "rate_wpm": 215,
      "stability": 0.20,
      "similarity_boost": 0.52,
      "archetype": "enthusiast",
      "description": "Aesthetic anarchist: follows invisible beauty threads"
    },
    "writer": {
      "voice_id": "gfRt6Z3Z8aTbpLfexQ7N",
      "name": "Emma Hartley",
      "rate_wpm": 230,
      "stability": 0.48,
      "similarity_boost": 0.78,
      "archetype": "storyteller",
      "description": "Technical storyteller: translates complexity into narrative"
    },
    "default": {
      "voice_id": "P9S3WZL3JE8uQqgYH5B7",
      "name": "Default",
      "rate_wpm": 220,
      "stability": 0.50,
      "similarity_boost": 0.75,
      "archetype": "professional",
      "description": "Balanced professional delivery"
    }
  },
  "available_voices": {
    "description": "Additional ElevenLabs voices for custom agents or personalization",
    "voices": [
      {
        "voice_id": "UGTtbzgh3HObxRjWaSpr",
        "gender": "male",
        "name": "Extra Male 1",
        "archetype": "professional"
      },
      {
        "voice_id": "HKFOb9iktHA85uKXydRT",
        "gender": "male",
        "name": "Extra Male 2",
        "archetype": "professional"
      },
      {
        "voice_id": "wWWn96OtTHu1sn8SRGEr",
        "gender": "male",
        "name": "Extra Male 3",
        "archetype": "professional"
      },
      {
        "voice_id": "EST9Ui6982FZPSi7gCHi",
        "gender": "female",
        "name": "Extra Female 1",
        "archetype": "professional"
      },
      {
        "voice_id": "XhNlP8uwiH6XZSFnH1yL",
        "gender": "female",
        "name": "Extra Female 2",
        "archetype": "professional"
      },
      {
        "voice_id": "aRlmTYIQo6Tlg5SlulGC",
        "gender": "female",
        "name": "Extra Female 3",
        "archetype": "professional"
      }
    ]
  }
}
```

**Note:** All voice IDs are from ElevenLabs' voice library. You can:
- Replace with your own cloned voices
- Use the `available_voices` for custom agent types
- Switch to a different TTS provider (see "Why ElevenLabs" section)

---

### Step 3: Create Prosody Enhancer Library

```typescript
// $PAI_DIR/hooks/lib/prosody-enhancer.ts
// Enhances voice output with emotional markers and natural speech patterns

export interface AgentPersonality {
  name: string;
  rate_wpm: number;
  stability: number;
  archetype: 'enthusiast' | 'professional' | 'analyst' | 'critic' | 'wise-leader';
  energy_level: 'chaotic' | 'expressive' | 'measured' | 'stable';
}

export interface ProsodyConfig {
  emotionalMarkers: boolean;
  markdownProsody: boolean;
  personalityEnhancement: boolean;
  contextAnalysis: boolean;
}

/**
 * Agent personality configurations
 */
const AGENT_PERSONALITIES: Record<string, AgentPersonality> = {
  'pai': {
    name: 'PAI',
    rate_wpm: 235,
    stability: 0.38,
    archetype: 'professional',
    energy_level: 'expressive'
  },
  'intern': {
    name: 'Intern',
    rate_wpm: 270,
    stability: 0.30,
    archetype: 'enthusiast',
    energy_level: 'chaotic'
  },
  'pentester': {
    name: 'Pentester',
    rate_wpm: 260,
    stability: 0.18,
    archetype: 'enthusiast',
    energy_level: 'chaotic'
  },
  'artist': {
    name: 'Artist',
    rate_wpm: 215,
    stability: 0.20,
    archetype: 'enthusiast',
    energy_level: 'chaotic'
  },
  'designer': {
    name: 'Designer',
    rate_wpm: 226,
    stability: 0.52,
    archetype: 'critic',
    energy_level: 'measured'
  },
  'engineer': {
    name: 'Engineer',
    rate_wpm: 212,
    stability: 0.72,
    archetype: 'wise-leader',
    energy_level: 'stable'
  },
  'architect': {
    name: 'Architect',
    rate_wpm: 205,
    stability: 0.75,
    archetype: 'wise-leader',
    energy_level: 'stable'
  },
  'researcher': {
    name: 'Researcher',
    rate_wpm: 229,
    stability: 0.64,
    archetype: 'analyst',
    energy_level: 'measured'
  }
};

/**
 * Content patterns for detecting emotional context
 */
const CONTENT_PATTERNS = {
  // High Energy / Positive
  excited: [
    /\b(breakthrough|discovered|found it|eureka|amazing|incredible)\b/i,
    /\b(wait wait|ooh|wow|check this|look at this)\b/i,
    /!{2,}|💥|🔥|⚡/
  ],
  celebration: [
    /\b(finally|at last|phew|we did it|victory)\b/i,
    /\b(all .* passing|zero errors|zero (data )?loss)\b/i,
    /🎉|🥳|🍾/
  ],
  insight: [
    /\b(wait|aha|I see|that'?s why|now I understand)\b/i,
    /\b(this explains|the real issue|actually)\b/i,
    /💡|🔦/
  ],

  // Success / Achievement
  success: [
    /\b(completed|finished|done|success|working|fixed|resolved|solved)\b/i,
    /\b(all tests? pass|deploy|ship|launch)\b/i,
    /✅|✨/
  ],
  progress: [
    /\b(phase .* complete|step .* done)\b/i,
    /\b(moving to|now|next|partial|incremental)\b/i,
    /📈|⏩/
  ],

  // Analysis / Investigation
  investigating: [
    /\b(analyzing|examining|investigating|tracing)\b/i,
    /\b(pattern detected|correlation|cross-referencing)\b/i,
    /🔍|🔬|📊/
  ],
  debugging: [
    /\b(bug|error|issue|problem)\b/i,
    /\b(tracking|hunting|found it|located)\b/i,
    /🐛|🔧/
  ],

  // Thoughtful / Careful
  caution: [
    /\b(warning|careful|slow|partial|incomplete)\b/i,
    /\b(needs review|check|verify)\b/i,
    /⚠️|⚡/
  ],

  // Urgent / Critical
  urgent: [
    /\b(urgent|critical|down|failing|broken|alert)\b/i,
    /\b(immediate|asap|now|quickly|emergency)\b/i,
    /🚨|❌|⛔/
  ]
};

/**
 * Detect emotional context from message content
 */
function detectEmotionalContext(message: string): string | null {
  // Check for existing emotional markers
  if (/\[(💥|✨|⚠️|🚨|🎉|💡|🤔|🔍|📈|🎯|🎨|🐛|📚)/.test(message)) {
    return null; // Already has marker
  }

  const priorityOrder = [
    'urgent', 'debugging', 'insight', 'celebration', 'excited',
    'investigating', 'progress', 'success', 'caution'
  ];

  for (const emotion of priorityOrder) {
    const patterns = CONTENT_PATTERNS[emotion as keyof typeof CONTENT_PATTERNS];
    if (patterns) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          return emotion;
        }
      }
    }
  }

  return null;
}

/**
 * Get emotional marker for detected emotion
 */
function getEmotionalMarker(emotion: string): string {
  const markers: Record<string, string> = {
    'excited': '[💥 excited]',
    'celebration': '[🎉 celebration]',
    'insight': '[💡 insight]',
    'success': '[✨ success]',
    'progress': '[📈 progress]',
    'investigating': '[🔍 investigating]',
    'debugging': '[🐛 debugging]',
    'caution': '[⚠️ caution]',
    'urgent': '[🚨 urgent]'
  };

  return markers[emotion] || '';
}

/**
 * Add personality-specific prosody patterns
 */
function addPersonalityProsody(message: string, personality: AgentPersonality): string {
  let enhanced = message;

  switch (personality.archetype) {
    case 'enthusiast':
      if (personality.energy_level === 'chaotic') {
        if (!/\.{3}/.test(enhanced) && Math.random() > 0.5) {
          enhanced = enhanced.replace(/\b(wait|found|check|look)\b/i, '$1...');
        }
        if (!/[!?]$/.test(enhanced)) {
          enhanced = enhanced.replace(/\.$/, '!');
        }
      }
      break;

    case 'wise-leader':
      if (personality.energy_level === 'stable') {
        if (/,/.test(enhanced)) {
          enhanced = enhanced.replace(/,\s+/, ' -- ');
        }
      }
      break;

    case 'professional':
      if (personality.energy_level === 'expressive') {
        if (!/\*\*/.test(enhanced)) {
          enhanced = enhanced.replace(
            /\b(completed|fixed|deployed|built|created|found)\b/i,
            '**$1**'
          );
        }
      }
      break;

    case 'analyst':
      enhanced = enhanced.replace(
        /\b(confirmed|verified|analyzed|discovered)\b/i,
        '**$1**'
      );
      break;
  }

  return enhanced;
}

/**
 * Main prosody enhancement function
 */
export function enhanceProsody(
  message: string,
  agentType: string,
  config: ProsodyConfig = {
    emotionalMarkers: true,
    markdownProsody: true,
    personalityEnhancement: true,
    contextAnalysis: true
  }
): string {
  let enhanced = message;

  const personality = AGENT_PERSONALITIES[agentType.toLowerCase()] ||
                     AGENT_PERSONALITIES['pai'];

  // 1. Context Analysis - Detect emotional context
  if (config.contextAnalysis && config.emotionalMarkers) {
    const emotion = detectEmotionalContext(enhanced);
    if (emotion) {
      const marker = getEmotionalMarker(emotion);
      if (marker) {
        enhanced = `${marker} ${enhanced}`;
      }
    }
  }

  // 2. Personality Enhancement
  if (config.personalityEnhancement && config.markdownProsody) {
    enhanced = addPersonalityProsody(enhanced, personality);
  }

  return enhanced.trim();
}

/**
 * Clean message for speech while preserving prosody
 */
export function cleanForSpeech(message: string): string {
  let cleaned = message;

  // Remove code blocks and inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, 'code block');
  cleaned = cleaned.replace(/`[^`]+`/g, '');

  // Strip loose emoji while preserving markers
  const parts: Array<{isMarker: boolean, text: string}> = [];
  let lastIndex = 0;
  const markerRegex = /\[[^\]]+\]/g;
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        isMarker: false,
        text: cleaned.substring(lastIndex, match.index)
      });
    }
    parts.push({
      isMarker: true,
      text: match[0]
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < cleaned.length) {
    parts.push({
      isMarker: false,
      text: cleaned.substring(lastIndex)
    });
  }

  if (parts.length === 0) {
    parts.push({
      isMarker: false,
      text: cleaned
    });
  }

  // Strip emoji from non-marker parts only
  cleaned = parts.map(part => {
    if (part.isMarker) {
      return part.text;
    } else {
      return part.text.replace(/\p{Emoji_Presentation}/gu, '');
    }
  }).join('');

  // Clean up whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

/**
 * Get the voice ID for an agent type
 */
export function getVoiceId(agentType: string): string {
  // Read from environment or config file
  const envKey = `ELEVENLABS_VOICE_${agentType.toUpperCase()}`;
  const envVoice = process.env[envKey];
  if (envVoice) {
    return envVoice;
  }

  // Fallback to default
  return process.env.ELEVENLABS_VOICE_DEFAULT || '';
}
```

---

### Step 4: Create Voice-Enabled Stop Hook

```typescript
#!/usr/bin/env bun
// $PAI_DIR/hooks/stop-hook-voice.ts
// Main agent voice notification with prosody enhancement

import { readFileSync } from 'fs';
import { enhanceProsody, cleanForSpeech, getVoiceId } from './lib/prosody-enhancer';

interface NotificationPayload {
  title: string;
  message: string;
  voice_enabled: boolean;
  priority?: 'low' | 'normal' | 'high';
  voice_id: string;
}

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

/**
 * Convert Claude content to plain text
 */
function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map(c => {
        if (typeof c === 'string') return c;
        if (c?.text) return c.text;
        if (c?.content) return contentToText(c.content);
        return '';
      })
      .join(' ')
      .trim();
  }
  return '';
}

/**
 * Extract completion message with prosody enhancement
 */
function extractCompletion(text: string, agentType: string = 'pai'): string {
  // Remove system-reminder tags
  text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '');

  // Look for COMPLETED section
  const patterns = [
    /🎯\s*\*{0,2}COMPLETED:?\*{0,2}\s*(.+?)(?:\n|$)/i,
    /\*{0,2}COMPLETED:?\*{0,2}\s*(.+?)(?:\n|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let completed = match[1].trim();

      // Clean agent tags
      completed = completed.replace(/^\[AGENT:\w+\]\s*/i, '');

      // Clean for speech
      completed = cleanForSpeech(completed);

      // Enhance with prosody
      completed = enhanceProsody(completed, agentType);

      return completed;
    }
  }

  return 'Completed task';
}

/**
 * Read last assistant message from transcript
 */
function getLastAssistantMessage(transcriptPath: string): string {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    let lastAssistantMessage = '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'assistant' && entry.message?.content) {
            const text = contentToText(entry.message.content);
            if (text) {
              lastAssistantMessage = text;
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }

    return lastAssistantMessage;
  } catch (error) {
    console.error('Error reading transcript:', error);
    return '';
  }
}

/**
 * Send notification to voice server
 */
async function sendNotification(payload: NotificationPayload): Promise<void> {
  const serverUrl = process.env.PAI_VOICE_SERVER || 'http://localhost:8888/notify';

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Voice server error:', response.statusText);
    }
  } catch (error) {
    // Fail silently - voice server may not be running
    console.error('Voice notification failed (server may be offline):', error);
  }
}

async function main() {
  let hookInput: HookInput | null = null;

  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) {
      hookInput = JSON.parse(input);
    }
  } catch (error) {
    console.error('Error reading hook input:', error);
  }

  // Extract completion from transcript
  let completion = 'Completed task';
  const agentType = 'pai'; // Main agent is your PAI

  if (hookInput?.transcript_path) {
    const lastMessage = getLastAssistantMessage(hookInput.transcript_path);
    if (lastMessage) {
      completion = extractCompletion(lastMessage, agentType);
    }
  }

  // Get voice ID for this agent
  const voiceId = getVoiceId(agentType);

  // Send voice notification
  const payload: NotificationPayload = {
    title: 'PAI',
    message: completion,
    voice_enabled: true,
    priority: 'normal',
    voice_id: voiceId
  };

  await sendNotification(payload);

  process.exit(0);
}

main().catch((error) => {
  console.error('Stop hook error:', error);
  process.exit(0);
});
```

---

### Step 5: Create Subagent Voice Hook

```typescript
#!/usr/bin/env bun
// $PAI_DIR/hooks/subagent-stop-hook-voice.ts
// Subagent voice notification with personality-specific delivery

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { readdirSync, statSync } from 'fs';
import { enhanceProsody, cleanForSpeech, getVoiceId } from './lib/prosody-enhancer';

interface NotificationPayload {
  title: string;
  message: string;
  voice_enabled: boolean;
  voice_id: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findTaskResult(transcriptPath: string, maxAttempts: number = 2): Promise<{
  result: string | null;
  agentType: string | null;
  description: string | null;
}> {
  let actualTranscriptPath = transcriptPath;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await delay(200);
    }

    if (!existsSync(actualTranscriptPath)) {
      const dir = dirname(transcriptPath);
      if (existsSync(dir)) {
        const files = readdirSync(dir)
          .filter(f => f.startsWith('agent-') && f.endsWith('.jsonl'))
          .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtime }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        if (files.length > 0) {
          actualTranscriptPath = join(dir, files[0].name);
        }
      }

      if (!existsSync(actualTranscriptPath)) {
        continue;
      }
    }

    try {
      const transcript = readFileSync(actualTranscriptPath, 'utf-8');
      const lines = transcript.trim().split('\n');

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);

          if (entry.type === 'assistant' && entry.message?.content) {
            for (const content of entry.message.content) {
              if (content.type === 'tool_use' && content.name === 'Task') {
                const toolInput = content.input;
                const description = toolInput?.description || null;

                for (let j = i + 1; j < lines.length; j++) {
                  const resultEntry = JSON.parse(lines[j]);
                  if (resultEntry.type === 'user' && resultEntry.message?.content) {
                    for (const resultContent of resultEntry.message.content) {
                      if (resultContent.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                        let taskOutput: string;
                        if (typeof resultContent.content === 'string') {
                          taskOutput = resultContent.content;
                        } else if (Array.isArray(resultContent.content)) {
                          taskOutput = resultContent.content
                            .filter((item: any) => item.type === 'text')
                            .map((item: any) => item.text)
                            .join('\n');
                        } else {
                          continue;
                        }

                        const agentType = toolInput?.subagent_type || 'default';
                        return { result: taskOutput, agentType, description };
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          // Skip invalid lines
        }
      }
    } catch (e) {
      // Will retry
    }
  }

  return { result: null, agentType: null, description: null };
}

function extractCompletionMessage(taskOutput: string): { message: string | null; agentType: string | null } {
  // Look for COMPLETED section with agent tag
  const agentPatterns = [
    /🎯\s*COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /COMPLETED:\s*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /🎯.*COMPLETED.*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
  ];

  for (const pattern of agentPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1] && match[2]) {
      const agentType = match[1].toLowerCase();
      let message = match[2].trim();

      // Clean for speech
      message = cleanForSpeech(message);

      // Enhance with prosody
      message = enhanceProsody(message, agentType);

      // Format: "AgentName completed [message]"
      const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);

      // Don't prepend "completed" for greetings or questions
      const isGreeting = /^(hey|hello|hi|greetings)/i.test(message);
      const isQuestion = message.includes('?');

      const fullMessage = (isGreeting || isQuestion)
        ? message
        : `${agentName} completed ${message}`;

      return { message: fullMessage, agentType };
    }
  }

  // Fallback patterns
  const genericPatterns = [
    /🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/i,
    /COMPLETED:\s*(.+?)(?:\n|$)/i,
  ];

  for (const pattern of genericPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1]) {
      let message = match[1].trim();
      message = cleanForSpeech(message);

      if (message.length > 5) {
        return { message, agentType: null };
      }
    }
  }

  return { message: null, agentType: null };
}

async function sendNotification(payload: NotificationPayload): Promise<void> {
  const serverUrl = process.env.PAI_VOICE_SERVER || 'http://localhost:8888/notify';

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Voice server error:', response.statusText);
    }
  } catch (error) {
    // Fail silently
  }
}

async function main() {
  let input = '';
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);
  } catch (e) {
    process.exit(0);
  }

  if (!input) {
    process.exit(0);
  }

  let transcriptPath: string;
  try {
    const parsed = JSON.parse(input);
    transcriptPath = parsed.transcript_path;
  } catch (e) {
    process.exit(0);
  }

  if (!transcriptPath) {
    process.exit(0);
  }

  // Find task result
  const { result: taskOutput, agentType } = await findTaskResult(transcriptPath);

  if (!taskOutput) {
    process.exit(0);
  }

  // Extract completion message
  const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);

  if (!completionMessage) {
    process.exit(0);
  }

  // Determine agent type
  const finalAgentType = extractedAgentType || agentType || 'default';

  // Get voice ID for this agent type
  const voiceId = getVoiceId(finalAgentType);

  // Send voice notification
  const agentName = finalAgentType.charAt(0).toUpperCase() + finalAgentType.slice(1);

  await sendNotification({
    title: agentName,
    message: completionMessage,
    voice_enabled: true,
    voice_id: voiceId
  });

  process.exit(0);
}

main().catch(console.error);
```

---

### Step 6: Register Hooks

Add voice hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/stop-hook-voice.ts"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/subagent-stop-hook-voice.ts"
          }
        ]
      }
    ]
  }
}
```

---

### Step 7: Set Environment Variables

**If you used the Kai Bundle wizard:** Core variables are in `$PAI_DIR/.env`. You only need to add ElevenLabs credentials there:

```bash
# Add to $PAI_DIR/.env
ELEVENLABS_API_KEY="your-api-key"
```

**For manual installation:** Add to your shell profile (`~/.zshrc`, `~/.bashrc`):

```bash
# Voice configuration
export PAI_VOICE_SERVER="http://localhost:8888/notify"

# ElevenLabs voice IDs (get these from your ElevenLabs account)
export ELEVENLABS_API_KEY="your-api-key"
export ELEVENLABS_VOICE_PAI="P9S3WZL3JE8uQqgYH5B7"
export ELEVENLABS_VOICE_DEFAULT="P9S3WZL3JE8uQqgYH5B7"
# The PAI voice ID is used as default - customize as needed

# Reload
source ~/.zshrc
```

---

### Step 8: Set Up ElevenLabs Account

Before creating the voice server, you need an ElevenLabs account and API key.

#### 8.1: Create ElevenLabs Account

1. **Sign up** at [elevenlabs.io](https://elevenlabs.io)
2. **Choose a plan**:
   - **Free tier**: 10,000 characters/month - good for testing
   - **Starter** ($5/month): 30,000 characters - light personal use
   - **Creator** ($22/month): 100,000 characters - recommended for regular use
3. **Verify your email** to activate the account

#### 8.2: Get Your API Key

1. Log in to [elevenlabs.io](https://elevenlabs.io)
2. Click your **profile icon** (top right)
3. Select **"Profile + API key"**
4. Click **"Create API Key"** or copy existing key
5. **Save this key** - you'll need it in Step 10

#### 8.3: Choose Your Voice

1. Go to **"Voices"** in the left sidebar
2. Browse the **Voice Library** or use default voices
3. **Note the Voice ID** for your preferred voice:
   - Click on a voice
   - The Voice ID is in the URL: `elevenlabs.io/voice-lab/[VOICE_ID]`
   - Or find it in voice settings

**Recommended starter voice:** `s3TPKV1kjDlVtZbl4Ksh` (Jamie - UK Male, expressive)

#### 8.4: Test Your API Key

```bash
# Quick test - should return audio (save as test.mp3)
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/s3TPKV1kjDlVtZbl4Ksh" \
  -H "xi-api-key: YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test of the voice system.", "model_id": "eleven_turbo_v2_5"}' \
  --output test.mp3

# Play the test audio (macOS)
afplay test.mp3

# Clean up
rm test.mp3
```

If you hear "Hello, this is a test of the voice system" - your API key works!

---

### Step 9: Create Voice Server

Create the complete voice server that handles notifications and TTS:

```typescript
#!/usr/bin/env bun
// $PAI_DIR/voice-server/server.ts
// Voice notification server using ElevenLabs TTS

import { serve } from "bun";
import { spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// Load .env from PAI directory (single source of truth for all API keys)
const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
const envPath = join(paiDir, '.env');
if (existsSync(envPath)) {
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const PORT = parseInt(process.env.PAI_VOICE_PORT || "8888");
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error(`⚠️  ELEVENLABS_API_KEY not found in ${envPath}`);
  console.error('Add: ELEVENLABS_API_KEY=your_key_here to $PAI_DIR/.env');
}

// Default voice ID (customize to your preference)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "s3TPKV1kjDlVtZbl4Ksh";

// Voice configuration types
interface VoiceConfig {
  voice_id: string;
  voice_name: string;
  stability: number;
  similarity_boost: number;
  description: string;
}

interface VoicesConfig {
  default_volume?: number;
  voices: Record<string, VoiceConfig>;
}

// 13 Emotional Presets - Prosody System
const EMOTIONAL_PRESETS: Record<string, { stability: number; similarity_boost: number }> = {
  'excited': { stability: 0.7, similarity_boost: 0.9 },
  'celebration': { stability: 0.65, similarity_boost: 0.85 },
  'insight': { stability: 0.55, similarity_boost: 0.8 },
  'creative': { stability: 0.5, similarity_boost: 0.75 },
  'success': { stability: 0.6, similarity_boost: 0.8 },
  'progress': { stability: 0.55, similarity_boost: 0.75 },
  'investigating': { stability: 0.6, similarity_boost: 0.85 },
  'debugging': { stability: 0.55, similarity_boost: 0.8 },
  'learning': { stability: 0.5, similarity_boost: 0.75 },
  'pondering': { stability: 0.65, similarity_boost: 0.8 },
  'focused': { stability: 0.7, similarity_boost: 0.85 },
  'caution': { stability: 0.4, similarity_boost: 0.6 },
  'urgent': { stability: 0.3, similarity_boost: 0.9 },
};

// Load voice configuration
let voicesConfig: VoicesConfig | null = null;
try {
  const voicesPath = join(import.meta.dir, '..', 'config', 'voice-personalities.json');
  if (existsSync(voicesPath)) {
    const voicesContent = readFileSync(voicesPath, 'utf-8');
    voicesConfig = JSON.parse(voicesContent);
    console.log('✅ Loaded voice personalities from config');
  }
} catch (error) {
  console.warn('⚠️  Failed to load voice personalities, using defaults');
}

// Extract emotional marker from message
function extractEmotionalMarker(message: string): { cleaned: string; emotion?: string } {
  const emojiToEmotion: Record<string, string> = {
    '💥': 'excited', '🎉': 'celebration', '💡': 'insight', '🎨': 'creative',
    '✨': 'success', '📈': 'progress', '🔍': 'investigating', '🐛': 'debugging',
    '📚': 'learning', '🤔': 'pondering', '🎯': 'focused', '⚠️': 'caution', '🚨': 'urgent'
  };

  const emotionMatch = message.match(/\[(💥|🎉|💡|🎨|✨|📈|🔍|🐛|📚|🤔|🎯|⚠️|🚨)\s+(\w+)\]/);
  if (emotionMatch) {
    const emoji = emotionMatch[1];
    const emotionName = emotionMatch[2].toLowerCase();
    if (emojiToEmotion[emoji] === emotionName) {
      return {
        cleaned: message.replace(emotionMatch[0], '').trim(),
        emotion: emotionName
      };
    }
  }
  return { cleaned: message };
}

// Get voice configuration by voice ID or agent name
function getVoiceConfig(identifier: string): VoiceConfig | null {
  if (!voicesConfig) return null;
  if (voicesConfig.voices[identifier]) return voicesConfig.voices[identifier];
  for (const config of Object.values(voicesConfig.voices)) {
    if (config.voice_id === identifier) return config;
  }
  return null;
}

// Sanitize input for TTS - allow natural speech, block dangerous characters
function sanitizeForSpeech(input: string): string {
  return input
    .replace(/<script/gi, '')
    .replace(/\.\.\//g, '')
    .replace(/[;&|><`$\\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .trim()
    .substring(0, 500);
}

// Validate input
function validateInput(input: any): { valid: boolean; error?: string; sanitized?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input type' };
  }
  if (input.length > 500) {
    return { valid: false, error: 'Message too long (max 500 characters)' };
  }
  const sanitized = sanitizeForSpeech(input);
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Message contains no valid content after sanitization' };
  }
  return { valid: true, sanitized };
}

// Generate speech using ElevenLabs API
async function generateSpeech(
  text: string,
  voiceId: string,
  voiceSettings?: { stability: number; similarity_boost: number }
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const settings = voiceSettings || { stability: 0.5, similarity_boost: 0.5 };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: settings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}

// Get volume setting from config (defaults to 0.8 = 80%)
function getVolumeSetting(): number {
  if (voicesConfig && typeof voicesConfig.default_volume === 'number') {
    const vol = voicesConfig.default_volume;
    if (vol >= 0 && vol <= 1) return vol;
  }
  return 0.8;
}

// Play audio using afplay (macOS)
async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  const tempFile = `/tmp/voice-${Date.now()}.mp3`;
  await Bun.write(tempFile, audioBuffer);
  const volume = getVolumeSetting();

  return new Promise((resolve, reject) => {
    const proc = spawn('/usr/bin/afplay', ['-v', volume.toString(), tempFile]);

    proc.on('error', (error) => {
      console.error('Error playing audio:', error);
      reject(error);
    });

    proc.on('exit', (code) => {
      spawn('/bin/rm', [tempFile]); // Clean up temp file
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`afplay exited with code ${code}`));
      }
    });
  });
}

// Escape for AppleScript notifications
function escapeForAppleScript(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Send macOS notification with voice
async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  voiceId: string | null = null
) {
  const titleValidation = validateInput(title);
  const messageValidation = validateInput(message);

  if (!titleValidation.valid) throw new Error(`Invalid title: ${titleValidation.error}`);
  if (!messageValidation.valid) throw new Error(`Invalid message: ${messageValidation.error}`);

  const safeTitle = titleValidation.sanitized!;
  let safeMessage = messageValidation.sanitized!;

  // Extract emotional marker if present
  const { cleaned, emotion } = extractEmotionalMarker(safeMessage);
  safeMessage = cleaned;

  // Generate and play voice using ElevenLabs
  if (voiceEnabled && ELEVENLABS_API_KEY) {
    try {
      const voice = voiceId || DEFAULT_VOICE_ID;
      const voiceConfig = getVoiceConfig(voice);

      // Determine voice settings (priority: emotional > personality > defaults)
      let voiceSettings = { stability: 0.5, similarity_boost: 0.5 };

      if (emotion && EMOTIONAL_PRESETS[emotion]) {
        voiceSettings = EMOTIONAL_PRESETS[emotion];
        console.log(`🎭 Emotion: ${emotion}`);
      } else if (voiceConfig) {
        voiceSettings = {
          stability: voiceConfig.stability,
          similarity_boost: voiceConfig.similarity_boost
        };
        console.log(`👤 Personality: ${voiceConfig.description}`);
      }

      console.log(`🎙️  Generating speech (voice: ${voice}, stability: ${voiceSettings.stability})`);

      const audioBuffer = await generateSpeech(safeMessage, voice, voiceSettings);
      await playAudio(audioBuffer);
    } catch (error) {
      console.error("Failed to generate/play speech:", error);
    }
  }

  // Display macOS notification
  try {
    const escapedTitle = escapeForAppleScript(safeTitle);
    const escapedMessage = escapeForAppleScript(safeMessage);
    const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name ""`;
    spawn('/usr/bin/osascript', ['-e', script]);
  } catch (error) {
    console.error("Notification display error:", error);
  }
}

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// Start HTTP server
const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const clientIp = req.headers.get('x-forwarded-for') || 'localhost';

    const corsHeaders = {
      "Access-Control-Allow-Origin": "http://localhost",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ status: "error", message: "Rate limit exceeded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Main notification endpoint
    if (url.pathname === "/notify" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Notification";
        const message = data.message || "Task completed";
        const voiceEnabled = data.voice_enabled !== false;
        const voiceId = data.voice_id || data.voice_name || null;

        if (voiceId && typeof voiceId !== 'string') {
          throw new Error('Invalid voice_id');
        }

        console.log(`📨 Notification: "${title}" - "${message.substring(0, 50)}..."`);

        await sendNotification(title, message, voiceEnabled, voiceId);

        return new Response(
          JSON.stringify({ status: "success", message: "Notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error: any) {
        console.error("Notification error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Internal server error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: error.message?.includes('Invalid') ? 400 : 500 }
        );
      }
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          voice_system: "ElevenLabs",
          default_voice_id: DEFAULT_VOICE_ID,
          api_key_configured: !!ELEVENLABS_API_KEY
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response("PAI Voice Server - POST to /notify", {
      headers: corsHeaders,
      status: 200
    });
  },
});

console.log(`🚀 Voice Server running on port ${PORT}`);
console.log(`🎙️  Using ElevenLabs TTS (default voice: ${DEFAULT_VOICE_ID})`);
console.log(`📡 POST to http://localhost:${PORT}/notify`);
console.log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
console.log(`🔑 API Key: ${ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
```

---

### Step 10: Create Server Management Scripts

Create scripts to start, stop, and manage the voice server:

#### 10.1: Create Directory Structure

```bash
mkdir -p $PAI_DIR/voice-server
```

#### 10.2: Create Install Script

```bash
#!/bin/bash
# $PAI_DIR/voice-server/install.sh
# Installs the voice server as a macOS LaunchAgent

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="com.pai.voice-server"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"
ENV_FILE="$HOME/.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check for Bun
echo -e "${YELLOW}▶ Checking prerequisites...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Bun is not installed${NC}"
    echo "  Install Bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}✓ Bun is installed${NC}"

# Check for existing installation
if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Voice server is already installed${NC}"
    read -p "Do you want to reinstall? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}▶ Stopping existing service...${NC}"
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        echo -e "${GREEN}✓ Existing service stopped${NC}"
    else
        echo "Installation cancelled"
        exit 0
    fi
fi

# Check for ElevenLabs configuration
echo -e "${YELLOW}▶ Checking ElevenLabs configuration...${NC}"
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
        echo -e "${GREEN}✓ ElevenLabs API key configured${NC}"
        ELEVENLABS_CONFIGURED=true
    else
        echo -e "${YELLOW}⚠ ElevenLabs API key not configured${NC}"
        ELEVENLABS_CONFIGURED=false
    fi
else
    echo -e "${YELLOW}⚠ No ElevenLabs configuration found${NC}"
    ELEVENLABS_CONFIGURED=false
fi

if [ "$ELEVENLABS_CONFIGURED" = false ]; then
    echo
    echo "To enable AI voices, add your ElevenLabs API key to \$PAI_DIR/.env:"
    echo "  echo 'ELEVENLABS_API_KEY=your_api_key_here' >> \$PAI_DIR/.env"
    echo "  Get a key at: https://elevenlabs.io"
    echo
fi

# Create LaunchAgent plist
echo -e "${YELLOW}▶ Creating LaunchAgent configuration...${NC}"
mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>$(which bun)</string>
        <string>run</string>
        <string>${SCRIPT_DIR}/server.ts</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>${LOG_PATH}</string>

    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${HOME}/.bun/bin</string>
    </dict>
</dict>
</plist>
EOF

echo -e "${GREEN}✓ LaunchAgent configuration created${NC}"

# Load the LaunchAgent
echo -e "${YELLOW}▶ Starting voice server service...${NC}"
launchctl load "$PLIST_PATH" 2>/dev/null || {
    echo -e "${RED}✗ Failed to load LaunchAgent${NC}"
    echo "  Try manually: launchctl load $PLIST_PATH"
    exit 1
}

# Wait for server to start
sleep 2

# Test the server
echo -e "${YELLOW}▶ Testing voice server...${NC}"
if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Voice server is running${NC}"

    echo -e "${YELLOW}▶ Sending test notification...${NC}"
    curl -s -X POST http://localhost:8888/notify \
        -H "Content-Type: application/json" \
        -d '{"message": "Voice server installed successfully"}' > /dev/null
    echo -e "${GREEN}✓ Test notification sent${NC}"
else
    echo -e "${RED}✗ Voice server is not responding${NC}"
    echo "  Check logs: tail -f $LOG_PATH"
    echo "  Try running manually: bun run $SCRIPT_DIR/server.ts"
    exit 1
fi

# Show summary
echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}Service Information:${NC}"
echo "  • Service: $SERVICE_NAME"
echo "  • Status: Running"
echo "  • Port: 8888"
echo "  • Logs: $LOG_PATH"
echo
echo -e "${BLUE}Management Commands:${NC}"
echo "  • Status:   ./status.sh"
echo "  • Stop:     ./stop.sh"
echo "  • Start:    ./start.sh"
echo "  • Restart:  ./restart.sh"
echo
echo -e "${GREEN}The voice server will start automatically when you log in.${NC}"
```

#### 10.3: Create Start Script

```bash
#!/bin/bash
# $PAI_DIR/voice-server/start.sh

SERVICE_NAME="com.pai.voice-server"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}▶ Starting Voice Server...${NC}"

if [ ! -f "$PLIST_PATH" ]; then
    echo -e "${RED}✗ Service not installed${NC}"
    echo "  Run ./install.sh first"
    exit 1
fi

if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠ Voice server is already running${NC}"
    exit 0
fi

launchctl load "$PLIST_PATH" 2>/dev/null
sleep 2

if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Voice server started successfully${NC}"
else
    echo -e "${YELLOW}⚠ Server started but not responding yet${NC}"
    echo "  Check logs: tail -f ~/Library/Logs/pai-voice-server.log"
fi
```

#### 10.4: Create Stop Script

```bash
#!/bin/bash
# $PAI_DIR/voice-server/stop.sh

SERVICE_NAME="com.pai.voice-server"
PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}▶ Stopping Voice Server...${NC}"

if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
    launchctl unload "$PLIST_PATH" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Voice server stopped${NC}"
    else
        echo -e "${RED}✗ Failed to stop voice server${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Voice server is not running${NC}"
fi

# Kill any remaining processes on port 8888
if lsof -i :8888 > /dev/null 2>&1; then
    echo -e "${YELLOW}▶ Cleaning up port 8888...${NC}"
    lsof -ti :8888 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Port 8888 cleared${NC}"
fi
```

#### 10.5: Create Restart Script

```bash
#!/bin/bash
# $PAI_DIR/voice-server/restart.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "▶ Restarting Voice Server..."
"$SCRIPT_DIR/stop.sh"
sleep 2
"$SCRIPT_DIR/start.sh"
```

#### 10.6: Create Status Script

```bash
#!/bin/bash
# $PAI_DIR/voice-server/status.sh

SERVICE_NAME="com.pai.voice-server"
LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"
ENV_FILE="$HOME/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

echo -e "${BLUE}Service Status:${NC}"
if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
    PID=$(launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
    if [ "$PID" != "-" ]; then
        echo -e "  ${GREEN}✓ Service is loaded (PID: $PID)${NC}"
    else
        echo -e "  ${YELLOW}⚠ Service is loaded but not running${NC}"
    fi
else
    echo -e "  ${RED}✗ Service is not loaded${NC}"
fi

echo
echo -e "${BLUE}Server Status:${NC}"
if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Server is responding on port 8888${NC}"
    HEALTH=$(curl -s http://localhost:8888/health)
    echo "  Response: $HEALTH"
else
    echo -e "  ${RED}✗ Server is not responding${NC}"
fi

echo
echo -e "${BLUE}ElevenLabs Configuration:${NC}"
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    if [ -n "$API_KEY" ] && [ "$API_KEY" != "your_api_key_here" ]; then
        echo -e "  ${GREEN}✓ API key configured${NC}"
    else
        echo -e "  ${YELLOW}⚠ API key not set${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ No configuration found${NC}"
fi

echo
echo -e "${BLUE}Recent Logs:${NC}"
if [ -f "$LOG_PATH" ]; then
    echo "  Log file: $LOG_PATH"
    echo "  Last 5 lines:"
    tail -5 "$LOG_PATH" | while IFS= read -r line; do
        echo "    $line"
    done
else
    echo -e "  ${YELLOW}⚠ No log file found${NC}"
fi

echo
echo -e "${BLUE}Test Command:${NC}"
echo "  curl -X POST http://localhost:8888/notify \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\":\"Hello from PAI\"}'"
```

#### 10.7: Make Scripts Executable

```bash
chmod +x $PAI_DIR/voice-server/*.sh
```

---

### Step 11: Configure Environment Variables

Add your ElevenLabs credentials to `$PAI_DIR/.env` (the single source of truth for all API keys):

```bash
# Add to $PAI_DIR/.env
PAI_ENV="${PAI_DIR:-$HOME/.config/pai}/.env"
echo 'ELEVENLABS_API_KEY=your_actual_api_key_here' >> "$PAI_ENV"
echo 'ELEVENLABS_VOICE_ID=s3TPKV1kjDlVtZbl4Ksh' >> "$PAI_ENV"
```

**Optionally add convenience variables to your shell profile** (`~/.zshrc` or `~/.bashrc`):

```bash
# PAI Voice System (optional - for CLI access)
export PAI_VOICE_SERVER="http://localhost:8888/notify"
export PAI_VOICE_PORT="8888"
```

---

### Step 12: Install and Verify

Follow this complete verification sequence to ensure everything works end-to-end.

#### 12.1: Verify All Files Are In Place

```bash
# Check hook files
echo "=== Checking Hooks ==="
ls -la $PAI_DIR/hooks/stop-hook-voice.ts
ls -la $PAI_DIR/hooks/subagent-stop-hook-voice.ts

# Check prosody library
echo "=== Checking Prosody Library ==="
ls -la $PAI_DIR/hooks/lib/prosody-enhancer.ts

# Check voice configuration
echo "=== Checking Voice Config ==="
ls -la $PAI_DIR/config/voice-personalities.json

# Check voice server
echo "=== Checking Voice Server ==="
ls -la $PAI_DIR/voice-server/server.ts
ls -la $PAI_DIR/voice-server/install.sh
ls -la $PAI_DIR/voice-server/start.sh
ls -la $PAI_DIR/voice-server/stop.sh
ls -la $PAI_DIR/voice-server/restart.sh
ls -la $PAI_DIR/voice-server/status.sh
```

**Expected:** All files should exist. If any are missing, re-create them from the steps above.

#### 12.2: Verify Environment Variables

```bash
# Check ElevenLabs API key is set
echo "=== Checking Environment ==="
PAI_ENV="${PAI_DIR:-$HOME/.config/pai}/.env"
grep "ELEVENLABS_API_KEY" "$PAI_ENV"
# Should show your key (not "your_api_key_here")

# Test the API key works
echo "=== Testing ElevenLabs API Key ==="
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/s3TPKV1kjDlVtZbl4Ksh" \
  -H "xi-api-key: $(grep ELEVENLABS_API_KEY "$PAI_ENV" | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"text": "API key verified.", "model_id": "eleven_turbo_v2_5"}' \
  --output /tmp/test-voice.mp3 && \
  afplay /tmp/test-voice.mp3 && \
  rm /tmp/test-voice.mp3 && \
  echo "✅ ElevenLabs API key is working"
```

**Expected:** You should hear "API key verified" spoken aloud.

#### 12.3: Install and Start the Voice Server

```bash
# Install the voice server as a LaunchAgent
cd $PAI_DIR/voice-server
./install.sh

# Verify it's running
./status.sh
```

**Expected:** You should see "Voice server installed successfully" spoken aloud, and the status should show the server running on port 8888.

#### 12.4: Test Voice Server Health

```bash
# Health check
echo "=== Testing Health Endpoint ==="
curl -s http://localhost:8888/health | jq .

# Expected output:
# {
#   "status": "healthy",
#   "port": 8888,
#   "voice_system": "ElevenLabs",
#   "default_voice_id": "s3TPKV1kjDlVtZbl4Ksh",
#   "api_key_configured": true
# }
```

#### 12.5: Test Voice Notification (End-to-End)

```bash
# Send a test notification with voice
echo "=== Sending Test Notification ==="
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PAI",
    "message": "Voice system is working perfectly!",
    "voice_enabled": true
  }'
```

**Expected:** You should hear "Voice system is working perfectly!" spoken aloud in the default PAI voice.

#### 12.6: Test Agent Voice Personalities

```bash
# Test different agent voices
echo "=== Testing Agent Voices ==="

# Engineer voice (wise-leader archetype)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Engineer",
    "message": "The architecture has been reviewed and approved.",
    "voice_enabled": true,
    "voice_id": "iLVmqjzCGGvqtMCk6vVQ"
  }'

sleep 5

# Intern voice (enthusiast archetype)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Intern",
    "message": "I found it! The bug was in the authentication module!",
    "voice_enabled": true,
    "voice_id": "d3MFdIuCfbAIwiu7jC4a"
  }'
```

**Expected:** You should hear two different voices - Engineer should sound measured and thoughtful, Intern should sound excited and energetic.

#### 12.7: Verify Hooks Are Registered

```bash
# Check settings.json for hook configuration
echo "=== Checking Hook Registration ==="
cat ~/.claude/settings.json | jq '.hooks'

# Should show Stop and SubagentStop hooks
```

#### 12.8: Full Integration Test

The final test is to have your AI agent complete a task and verify you hear the voice notification:

1. **Restart Claude Code** (to load the new hooks)
2. **Ask your PAI a simple question** like "What is 2+2?"
3. **Wait for completion** - you should hear the 🎯 COMPLETED message spoken aloud

If you don't hear voice on task completion:
- Check the logs: `tail -f ~/Library/Logs/pai-voice-server.log`
- Verify hooks are running: Look for hook output in Claude Code's stderr

---

## Troubleshooting

### Server Won't Start

**Symptom:** `./install.sh` fails or server doesn't respond

```bash
# Check if port 8888 is in use
lsof -i :8888

# If something else is using it, kill it
lsof -ti :8888 | xargs kill -9

# Try manual start to see errors
bun run $PAI_DIR/voice-server/server.ts
```

### No Sound Playing

**Symptom:** Server responds but no audio plays

```bash
# Check macOS audio
# 1. Make sure volume is up
# 2. Check audio output device is correct

# Test afplay directly
echo "Testing audio" | say  # Should use macOS built-in TTS

# Check ElevenLabs is returning audio
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/s3TPKV1kjDlVtZbl4Ksh" \
  -H "xi-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "model_id": "eleven_turbo_v2_5"}' \
  --output /tmp/test.mp3 && file /tmp/test.mp3
# Should show: Audio file with ID3
```

### API Key Errors

**Symptom:** "ElevenLabs API error: 401"

1. Verify your API key at [elevenlabs.io](https://elevenlabs.io) → Profile → API Key
2. Check the key in `$PAI_DIR/.env` matches exactly (no extra spaces or quotes)
3. Ensure your ElevenLabs subscription is active

### Hooks Not Running

**Symptom:** Tasks complete but no voice notification

```bash
# Check hooks are in settings.json
cat ~/.claude/settings.json | jq '.hooks'

# Check hooks are executable
ls -la $PAI_DIR/hooks/stop-hook-voice.ts

# Test hook manually (pipe simulated input)
echo '{"session_id":"test","transcript_path":"/tmp/test.jsonl"}' | \
  bun run $PAI_DIR/hooks/stop-hook-voice.ts
```

### Voice Sounds Robotic

**Symptom:** Speech plays but quality is poor

- Ensure you're using `eleven_turbo_v2_5` model (already default in server)
- Try different voice IDs for better fit
- Adjust stability/similarity_boost in voice config

### Rate Limiting

**Symptom:** "Rate limit exceeded" errors

The server has built-in rate limiting (10 requests/minute per IP). If you're testing heavily:

```bash
# Wait 60 seconds, or restart the server to reset
./restart.sh
```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "ELEVENLABS_API_KEY not found" | Missing .env | Add key to `$PAI_DIR/.env` |
| "Voice server is not responding" | Server crashed | `./restart.sh` |
| "Invalid voice_id" | Wrong voice ID format | Check voice ID exists in ElevenLabs |
| "afplay exited with code" | Audio playback failed | Check macOS audio settings |

### Logs Location

```bash
# Voice server logs
tail -f ~/Library/Logs/pai-voice-server.log

# Claude Code logs (for hook output)
# Check Claude Code's terminal output
```

---

## Quick Reference

### Management Commands

```bash
cd $PAI_DIR/voice-server

./status.sh     # Check if server is running
./start.sh      # Start the server
./stop.sh       # Stop the server
./restart.sh    # Restart the server
```

### Test Notification

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Your message here"}'
```

### File Locations

| File | Location |
|------|----------|
| Voice Server | `$PAI_DIR/voice-server/server.ts` |
| Management Scripts | `$PAI_DIR/voice-server/*.sh` |
| Stop Hook | `$PAI_DIR/hooks/stop-hook-voice.ts` |
| Subagent Hook | `$PAI_DIR/hooks/subagent-stop-hook-voice.ts` |
| Prosody Library | `$PAI_DIR/hooks/lib/prosody-enhancer.ts` |
| Voice Config | `$PAI_DIR/config/voice-personalities.json` |
| Server Logs | `~/Library/Logs/pai-voice-server.log` |
| LaunchAgent | `~/Library/LaunchAgents/com.pai.voice-server.plist` |

---

## Voice Personality System

### Archetypes

| Archetype | Energy | Voice Characteristics | Example Agents |
|-----------|--------|----------------------|----------------|
| **Enthusiast** | Chaotic/Expressive | Fast, variable, exclamatory | PAI, Intern, Pentester, Artist |
| **Storyteller** | Expressive | Warm, engaging, narrative flow | Writer |
| **Analyst** | Measured | Confident, findings-focused | Researcher |
| **Critic** | Measured | Precise, sophisticated, deliberate | Designer |
| **Wise Leader** | Stable | Slow, thoughtful, em-dashes for pauses | Engineer, Architect |

### Prosody Elements

| Element | Example | Effect |
|---------|---------|--------|
| `**bold**` | `**fixed** the bug` | Emphasis |
| `...` | `wait... found it` | Pause |
| `--` | `Consider this -- the implications` | Thoughtful break |
| `!` | `Success!` | Excitement |
| `[marker]` | `[✨ success]` | Emotional context |

### Emotional Markers

| Marker | Trigger | Use |
|--------|---------|-----|
| `[💥 excited]` | breakthroughs | High energy |
| `[✨ success]` | completions | Achievement |
| `[🎉 celebration]` | milestones | Victory |
| `[💡 insight]` | discoveries | Realization |
| `[🔍 investigating]` | analysis | Research |
| `[🐛 debugging]` | bug work | Problem solving |
| `[⚠️ caution]` | warnings | Careful |
| `[🚨 urgent]` | critical | Emergency |

---

## Configuration

**Environment Variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `PAI_VOICE_SERVER` | `http://localhost:8888/notify` | Voice server URL |
| `ELEVENLABS_API_KEY` | - | ElevenLabs API key |
| `ELEVENLABS_VOICE_PAI` | `P9S3WZL3JE8uQqgYH5B7` | Main PAI voice |
| `ELEVENLABS_VOICE_DEFAULT` | `P9S3WZL3JE8uQqgYH5B7` | Fallback voice |

**Graceful Degradation:**

If the voice server is offline:
- Hooks complete silently (exit 0)
- No errors shown to user
- Work continues uninterrupted

---

## Customization

### Recommended Customization

**What to Customize:** Voice selection and persona mapping

**Why:** The default voice works, but PAI becomes truly personal when it speaks with a voice that resonates with you. Spending time selecting and mapping voices transforms PAI from "a system that talks" to "your AI's voice."

**Process:**

1. **Explore ElevenLabs Voice Library**
   - Browse [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
   - Listen to at least 10-15 different voices
   - Note voice IDs for ones that feel right

2. **Define Your Voice Mapping**
   Have a conversation with your AI to explore preferences:
   ```
   "I want to customize my PAI voices. For the main PAI voice, I want
   something [professional/warm/energetic/calm]. For notifications,
   maybe something [shorter/punchier/softer]. Let's explore what
   feels right..."
   ```

3. **Test with Real Content**
   - Try different voices with actual PAI outputs
   - Test emotional markers with different voice models
   - Listen for naturalness with your typical message length

4. **Update Environment Variables**
   ```bash
   # In $PAI_DIR/.env
   ELEVENLABS_VOICE_PAI="your-chosen-voice-id"
   ELEVENLABS_VOICE_DEFAULT="your-fallback-voice-id"
   ```

**Expected Outcome:** PAI speaks in a voice that feels natural and personal to you. The voice becomes part of your PAI's identity rather than a generic TTS output.

### Optional Customization

| Customization | File | Impact |
|--------------|------|--------|
| Custom emotional markers | `voice-server/server.ts` | Add your own prosody tags beyond the defaults |
| Message preprocessing | `voice-server/server.ts` | Custom text cleanup before TTS |
| Volume/speed defaults | ElevenLabs dashboard | Adjust voice characteristics |
| Multi-voice personas | `.env` + server config | Different voices for different agent types |
| Notification sounds | `voice-server/server.ts` | Add audio cues before/after speech |
| Queue behavior | `voice-server/server.ts` | Adjust how overlapping messages are handled |

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of the PAI (Personal AI) project
- **ElevenLabs**: Text-to-speech engine
- **Prosody research**: ElevenLabs eleven_turbo_v2_5 emotional marker support
- **Voice IDs**: ElevenLabs public voice library - customize with your own voices

## Related Work

- **ElevenLabs** - Industry-leading text-to-speech synthesis
- **Prosody research** - Natural speech rhythm and intonation patterns
- **Accessibility systems** - Voice output for enhanced accessibility

## Works Well With

- **kai-hook-system** - Required; Stop hooks trigger voice notifications
- **kai-core-install** - Required; Skills, identity, and response format drive voice output
- **kai-history-system** - History capture can trigger voice announcements

## Recommended

- **kai-hook-system** - Required; provides the event triggers for voice output
- **kai-core-install** - Required; defines skills, agent personalities, and response format

## Relationships

### Parent Of
*None - this is an output layer, not a foundation for other packs.*

### Child Of
- **kai-hook-system** - Uses Stop and SubagentStop hooks for voice triggers
- **kai-core-install** - Agent personalities from CORE skill map to voice configurations

### Sibling Of
- **kai-history-system** - Both consume hook events for their functionality

### Part Of Collection
**Kai Core Bundle** - One of 4 foundational packs that together create the complete Kai personal AI infrastructure.

---

## Changelog

### 1.1.0 - 2025-12-29 (Updated 2025-12-30)
- **END-TO-END COMPLETE RELEASE**
- Updated pack icon with new Kai Voice System design (cache-busted filename)
- Added complete voice server implementation (server.ts)
- Added server management scripts (install.sh, start.sh, stop.sh, restart.sh, status.sh)
- Added macOS LaunchAgent auto-start configuration
- Added detailed ElevenLabs account setup walkthrough (Steps 8.1-8.4)
- Added comprehensive verification sequence (Steps 12.1-12.8)
- Added full troubleshooting section with common issues and fixes
- Added quick reference section with file locations
- Updated dependencies to include kai-core-install (replaces kai-skill-system + kai-identity)
- Pack now meets PAI End-to-End Completeness Requirements

### 1.0.0 - 2025-12-29
- Initial release
- Prosody enhancement library with 9 emotional markers
- Voice-enabled stop hooks for main and subagents
- Agent personality voice mapping system
- ElevenLabs integration pattern
- Graceful degradation when voice server offline
