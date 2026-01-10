---
name: VoiceInterface
description: Voice interaction with Claude. USE WHEN user wants voice input OR voice output OR query remote Claude by voice OR analyze voice usage patterns.
---

# VoiceInterface

Voice-based interface to Claude using composable CLI tools. Supports local and remote Claude instances with full history capture and quality evals.

**Scope:** Code-based orchestration only. No AI decision-making in routing.

## CLI Tools

All tools follow Unix philosophy: do ONE thing well, composable via pipes.

```bash
# Record audio (auto-detects platform)
bun run $PAI_DIR/skills/VoiceInterface/Tools/Record.ts [--duration 30] [--output file.wav]

# Transcribe audio (provider-agnostic)
bun run $PAI_DIR/skills/VoiceInterface/Tools/Transcribe.ts [--input file.wav] [--provider whisperflow|openai|whisper-cpp]

# Query remote Claude via SSH
bun run $PAI_DIR/skills/VoiceInterface/Tools/RemoteQuery.ts [--host vultr-claude] [--text "query"]

# Text-to-speech playback
bun run $PAI_DIR/skills/VoiceInterface/Tools/Speak.ts [--text "response"] [--voice-id ID]

# Analyze usage (from JSONL logs)
bun run $PAI_DIR/skills/VoiceInterface/Tools/Stats.ts [--since "24h"] [--format json|table]
```

### Composability Example

```bash
# Full pipeline as Unix pipes
record | transcribe | remote-query | speak

# Or step-by-step
bun run Tools/Record.ts --output /tmp/q.wav
bun run Tools/Transcribe.ts --input /tmp/q.wav > /tmp/transcript.txt
cat /tmp/transcript.txt | bun run Tools/RemoteQuery.ts --host vultr-claude > /tmp/response.txt
bun run Tools/Speak.ts --text "$(cat /tmp/response.txt)"
```

## Authoritative Context

**Required Pack:** `kai-voice-system` (provides voice server + TTS infrastructure)

**Before using this skill, ensure:**
- kai-voice-system pack installed
- Voice server running: `~/.claude/voice/manage.sh status`
- SSH configured for remote host (if using RemoteQuery)
- Transcription provider installed (WhisperFlow, whisper.cpp, or OpenAI key)

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **VoiceQuery** | "voice query" OR "ask by voice" OR hotkey triggered | `Workflows/VoiceQuery.md` |

## History Capture

All voice interactions logged to `~/.claude/history/voice-sessions.jsonl`:

```jsonl
{"timestamp":"2026-01-03T...","session_id":"abc123","event":"record","duration_ms":3420}
{"timestamp":"2026-01-03T...","session_id":"abc123","event":"transcribe","text":"what is the weather","provider":"whisperflow","confidence":0.95}
{"timestamp":"2026-01-03T...","session_id":"abc123","event":"query","remote":"vultr-claude","latency_ms":2341}
{"timestamp":"2026-01-03T...","session_id":"abc123","event":"response","text":"I cannot check...", "word_count":45}
{"timestamp":"2026-01-03T...","session_id":"abc123","event":"speak","tts_latency_ms":1230}
{"timestamp":"2026-01-03T...","session_id":"abc123","event":"complete","total_latency_ms":7991}
```

## Evals

Quality measurements in `Tests/Evals.ts`:

- **Transcription accuracy**: WER (Word Error Rate) < 5% on test set
- **End-to-end latency**: < 10 seconds (P95)
- **Remote query success rate**: > 95%
- **TTS quality**: Subjective rating mechanism

## Platform Support

- **macOS**: Full support (afplay for audio)
- **Linux**: Full support (requires sox/aplay)
- **Remote server**: Partial (no local recording, but can receive queries)

## Integration Points

**Hooks triggered:**
- `on-voice-input` - After successful transcription
- `on-voice-response` - After Claude responds

**Skills this calls:**
- None (pure infrastructure)

**Skills that call this:**
- Any skill can trigger voice output via `Speak.ts`

## Self-Improvement

Automatic quality monitoring via `Stats.ts`:
- Detects transcription failures (empty or gibberish)
- Tracks latency degradation
- Identifies SSH connection issues
- Suggests provider fallbacks

## Examples

**Example 1: Local voice query**
```bash
# User presses hotkey → hook triggers:
bun run Skills/VoiceInterface/Tools/Record.ts --output /tmp/q.wav
bun run Skills/VoiceInterface/Tools/Transcribe.ts --input /tmp/q.wav | \
bun run Skills/VoiceInterface/Tools/RemoteQuery.ts --host vultr-claude | \
bun run Skills/VoiceInterface/Tools/Speak.ts
```

**Example 2: Analyze usage patterns**
```bash
# Show last 24h stats
bun run Skills/VoiceInterface/Tools/Stats.ts --since "24h"

# Output:
# Voice Sessions (last 24h)
# Total: 23
# Avg latency: 6.2s
# Success rate: 95.7%
# Top errors: ssh_timeout (1)
```

**Example 3: Quality eval**
```bash
# Run transcription evals
bun run Skills/VoiceInterface/Tests/Evals.ts --test transcription

# Output:
# Transcription Quality Eval
# Provider: whisperflow
# WER: 3.2% (PASS - target < 5%)
# Test samples: 50
```

## Related Skills

- **CORE** - Provides identity context for voice interactions
- **AgentEvaluation** - May use VoiceInterface for voice-based evals
