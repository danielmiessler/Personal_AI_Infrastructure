# VoiceInterface Skill

Voice-based interface to Claude using composable CLI tools. Press a hotkey, speak, get AI response via TTS.

**Architecture:** Mac/Linux → transcribe → SSH to remote Claude on Vultr → TTS playback locally

---

## Quick Start (2 minutes)

### 1. Prerequisites

**Required Pack:** `kai-voice-system` (provides voice server + TTS)

```bash
# Verify pack installed / start voice server
~/.claude/voice/manage.sh status
~/.claude/voice/manage.sh start

# SSH to Vultr configured
# Add to ~/.ssh/config:
#   Host vultr-claude
#     HostName YOUR_IP
#     User YOUR_USER

# Transcription provider (pick one)
brew install sox              # For WhisperFlow
# OR set OPENAI_API_KEY        # For OpenAI Whisper API
```

### 2. First Voice Query

```bash
# Complete workflow
pai-voice query

# You'll be prompted to:
# 1. Speak (up to 30 seconds)
# 2. Wait for transcription
# 3. Wait for Claude response
# 4. Hear TTS playback
```

### 3. Verify It Worked

```bash
# Check session logs
tail ~/.claude/history/voice-sessions.jsonl

# View stats
pai-voice stats --since "1h"
```

**That's it!** You now have voice → Claude → TTS working.

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│  YOU (Mac/Linux)                        │
│                                         │
│  1. Hotkey/pai-voice query             │
│  2. Record audio (mic)                  │
│  3. Transcribe (WhisperFlow/OpenAI)    │
│  4. SSH → Vultr Claude                  │
│  5. ← Response                          │
│  6. TTS → Speakers                      │
└─────────────────────────────────────────┘
           ↕ SSH
  ┌──────────────────┐
  │  Vultr Server    │
  │  Claude Code     │
  └──────────────────┘
```

### Composable Tools (Unix Philosophy)

Each tool does **ONE** job:

| Tool | What It Does | Example |
|------|--------------|---------|
| `Record.ts` | Captures audio from mic | `pai-voice record --output audio.wav` |
| `Transcribe.ts` | Speech → text | `pai-voice transcribe audio.wav` |
| `RemoteQuery.ts` | SSH → Claude | `echo "hi" \| bun run Tools/RemoteQuery.ts` |
| `Speak.ts` | Text → TTS playback | `pai-voice speak "hello world"` |
| `Stats.ts` | Analytics from logs | `pai-voice stats --since "24h"` |
| `SelfImprove.ts` | Quality monitoring | `bun run Tools/SelfImprove.ts` |

### Full Pipeline

You can compose tools manually:

```bash
# Unix pipes
bun run Tools/Record.ts | \
bun run Tools/Transcribe.ts --provider whisperflow | \
bun run Tools/RemoteQuery.ts --host vultr-claude | \
bun run Tools/Speak.ts

# Or use the workflow
pai-voice query
```

---

## Testing

### 1. Test Individual Tools

```bash
# Test recording (5 seconds)
pai-voice record --duration 5 --output test.wav
afplay test.wav  # Verify audio captured

# Test transcription
pai-voice transcribe test.wav
# Should output transcribed text

# Test remote query
echo "What is 2+2?" | bun run Tools/RemoteQuery.ts --host vultr-claude
# Should return Claude's response

# Test TTS
pai-voice speak "This is a test"
# Should hear audio through speakers
```

### 2. Test Complete Workflow

```bash
# Full end-to-end test
pai-voice query

# Say something like: "What is the capital of France?"
# Should hear response: "The capital of France is Paris"
```

### 3. Run Quality Evals

```bash
# Run all quality tests
pai-voice eval --test all

# Should see:
# ✅ Transcription: WER < 5%
# ✅ Latency: P95 < 10s
# ✅ Reliability: Success > 95%
```

### 4. Check for Issues

```bash
# Auto-detect problems
bun run Tools/SelfImprove.ts

# Will report:
# - Transcription failures
# - SSH connection issues
# - High latency warnings
# - Configuration problems
```

---

## Configuration

### Environment Variables

Edit `~/.claude/.env`:

```env
# Required
ELEVENLABS_API_KEY=sk_...           # For TTS
VULTR_HOST=vultr-claude             # SSH host alias

# Optional
TRANSCRIBE_PROVIDER=whisperflow     # or openai, whisper-cpp
OPENAI_API_KEY=sk_...               # If using OpenAI transcription
ELEVENLABS_VOICE_ID=...             # Custom voice
VOICE_SERVER=http://localhost:8888  # Voice server URL
```

### SSH Configuration

Edit `~/.ssh/config`:

```
Host vultr-claude
    HostName 123.45.67.89       # Your Vultr IP
    User root                   # Your username
    IdentityFile ~/.ssh/id_rsa  # Your SSH key
    ServerAliveInterval 60
```

Test SSH:
```bash
ssh vultr-claude "echo 'Connected!'"
```

### Transcription Providers

**WhisperFlow** (recommended for privacy):
```bash
# Install WhisperFlow
# See: https://github.com/... (your WhisperFlow setup)
export TRANSCRIBE_PROVIDER=whisperflow
```

**OpenAI Whisper API** (easiest):
```bash
export OPENAI_API_KEY=sk_...
export TRANSCRIBE_PROVIDER=openai
```

**whisper.cpp** (local, offline):
```bash
brew install whisper-cpp
export TRANSCRIBE_PROVIDER=whisper-cpp
```

---

## Common Use Cases

### 1. Quick Question to Claude

```bash
pai-voice query
# Speak: "What's the weather API for Node.js?"
# Hear: Claude's response about weather APIs
```

### 2. Code Review by Voice

```bash
pai-voice query
# Speak: "Review the authentication logic in server.ts"
# Hear: Claude's code review feedback
```

### 3. Debugging Session

```bash
pai-voice query
# Speak: "Why is my React component re-rendering infinitely?"
# Hear: Claude's debugging suggestions
```

### 4. Analyze Usage Patterns

```bash
# See your voice query history
pai-voice stats --since "7d"

# Output:
# Total Sessions: 45
# Success Rate: 95.6%
# Avg Latency: 6.2s
```

---

## Observability

### View Live Sessions

```bash
# Watch logs in real-time
tail -f ~/.claude/history/voice-sessions.jsonl | jq .
```

### Analyze Performance

```bash
# Last 24 hours stats
pai-voice stats --since "24h"

# JSON output for scripting
pai-voice stats --since "7d" --format json
```

### Quality Metrics

All sessions logged with:
- Transcription confidence
- End-to-end latency
- Error types and rates
- Provider performance

---

## Troubleshooting

### "Voice server not running"

```bash
# Start voice server
~/.claude/voice/manage.sh start

# Check status
~/.claude/voice/manage.sh status

# View logs
tail -f ~/.claude/voice/server.log
```

### "SSH connection failed"

```bash
# Test SSH manually
ssh vultr-claude "echo 'test'"

# Check SSH config
cat ~/.ssh/config | grep -A 5 vultr-claude

# Verify key permissions
chmod 600 ~/.ssh/your_key
```

### "Transcription failed"

```bash
# Check microphone permissions
# System Settings → Privacy & Security → Microphone

# Test recording
pai-voice record --duration 3 --output test.wav
afplay test.wav  # Should hear yourself

# Try different provider
export TRANSCRIBE_PROVIDER=openai  # If WhisperFlow fails
```

### "Empty transcription"

```bash
# Check audio levels
pai-voice record --duration 5 --output test.wav
afplay test.wav  # Is audio loud enough?

# Run self-improvement
bun run Tools/SelfImprove.ts
# Will suggest fixes
```

### High Latency

```bash
# Check breakdown
pai-voice stats --format json | jq '.sessions[-1]'

# Common causes:
# - Slow SSH connection (test: ssh vultr-claude "date")
# - Slow transcription (try different provider)
# - Network issues (ping your Vultr server)
```

---

## Advanced Usage

### Hotkey Integration (macOS)

Use Hammerspoon:

```lua
-- ~/.hammerspoon/init.lua
hs.hotkey.bind({"cmd", "shift"}, "space", function()
    hs.task.new("/Users/YOU/.claude/Tools/pai-voice", function(exitCode)
        hs.alert.show(exitCode == 0 and "✅ Done" or "❌ Error")
    end, {"query"}):start()
end)
```

### Batch Transcription

```bash
# Transcribe multiple files
for audio in recordings/*.wav; do
    bun run Tools/Transcribe.ts --input "$audio" > "${audio%.wav}.txt"
done
```

### Custom Workflows

```bash
# Create your own composition
record_and_save() {
    local question="$1"
    local output="$2"

    echo "$question" | \
    bun run Tools/RemoteQuery.ts --host vultr-claude | \
    tee "$output" | \
    bun run Tools/Speak.ts
}

record_and_save "Explain quantum computing" quantum-explanation.txt
```

### A/B Testing Providers

```bash
# Compare transcription quality
for provider in whisperflow openai whisper-cpp; do
    TRANSCRIBE_PROVIDER=$provider pai-voice transcribe test.wav
done
```

---

## File Structure

```
skills/VoiceInterface/
├── README.md              ← You are here
├── SKILL.md              ← Skill system schema
│
├── Tools/                ← Composable CLI tools
│   ├── Record.ts        → Audio capture
│   ├── Transcribe.ts    → Speech-to-text
│   ├── RemoteQuery.ts   → SSH → Claude
│   ├── Speak.ts         → TTS playback
│   ├── Stats.ts         → Analytics
│   ├── SelfImprove.ts   → Quality monitoring
│   └── Logger.ts        → JSONL logging
│
├── Workflows/           ← Orchestration
│   ├── VoiceQuery.md    → Workflow docs
│   └── voice-query.sh   → Main workflow script
│
└── Tests/               ← Quality framework
    ├── Evals.ts         → WER, latency, reliability
    └── TestCases/       → Test audio samples
```

---

## Quality Standards

This skill follows **Daniel's 10 Principles**:

✅ Each tool does ONE thing well (Unix philosophy)
✅ Full JSONL history capture
✅ Measurable evals (WER < 5%, latency < 10s, reliability > 95%)
✅ Self-improvement via automated monitoring
✅ CLI-first design with clear `--help`
✅ Code before prompts (deterministic routing)
✅ Platform-aware (macOS, Linux, remote)
✅ Composable via pipes

See `VOICEINTERFACE-REFACTOR.md` for full compliance report.

---

## Next Steps

1. ✅ Run your first voice query: `pai-voice query`
2. ✅ Check the logs: `tail ~/.claude/history/voice-sessions.jsonl`
3. ✅ View stats: `pai-voice stats --since "1h"`
4. ✅ Run evals: `pai-voice eval --test all`
5. ✅ Set up hotkey (Hammerspoon or system shortcut)

---

## Support

- **Issues:** Check `bun run Tools/SelfImprove.ts` first
- **Logs:** `~/.claude/history/voice-sessions.jsonl`
- **Voice Server:** `~/.claude/voice/server.log`
- **Skill Spec:** See `SKILL.md`
- **Refactor Docs:** See `VOICEINTERFACE-REFACTOR.md`

---

**Built following Daniel's engineering principles. Every decision is intentional, every tool is composable, every session is logged.**
