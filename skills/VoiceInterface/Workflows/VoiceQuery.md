# VoiceQuery Workflow

> **Trigger:** Voice query OR ask by voice OR hotkey triggered
> **Input:** User voice request
> **Output:** Claude response via TTS

Complete voice → Claude → TTS pipeline using composable tools.

## Workflow Steps

### 1. Initialize Session

```bash
# Generate unique session ID
export SESSION_ID="voice-$(date +%s)-$(openssl rand -hex 4)"
echo "🎙️  Starting voice session: $SESSION_ID" >&2
```

### 2. Record Audio

```bash
# Record for up to 30 seconds with silence detection
bun run $PAI_DIR/skills/VoiceInterface/Tools/Record.ts \
  --duration 30 \
  --output /tmp/$SESSION_ID.wav
```

**Logs:** `{"event":"record","session_id":"...","duration_ms":3420}`

### 3. Transcribe

```bash
# Provider auto-selected from env (whisperflow, openai, whisper-cpp)
TRANSCRIPT=$(bun run $PAI_DIR/skills/VoiceInterface/Tools/Transcribe.ts \
  --input /tmp/$SESSION_ID.wav \
  --provider ${TRANSCRIBE_PROVIDER:-whisperflow})

# Trigger hook for logging
echo "$TRANSCRIPT" | $PAI_DIR/hooks/on-voice-input/log-transcription.sh
```

**Logs:** `{"event":"transcribe","text":"...","provider":"whisperflow","confidence":0.95}`

### 4. Query Remote Claude

```bash
# Send to configured remote host
RESPONSE=$(echo "$TRANSCRIPT" | bun run $PAI_DIR/skills/VoiceInterface/Tools/RemoteQuery.ts \
  --host ${VULTR_HOST:-vultr-claude})

# Trigger hook for logging
echo "$RESPONSE" | $PAI_DIR/hooks/on-voice-response/log-response.sh
```

**Logs:** `{"event":"query","remote":"vultr-claude","latency_ms":2341}`
**Logs:** `{"event":"response","word_count":45}`

### 5. Speak Response

```bash
# Play via local voice server
echo "$RESPONSE" | bun run $PAI_DIR/skills/VoiceInterface/Tools/Speak.ts
```

**Logs:** `{"event":"speak","tts_latency_ms":1230}`

### 6. Complete Session

```bash
# Calculate total latency
END_TIME=$(date +%s%3N)
TOTAL_LATENCY=$((END_TIME - START_TIME))

# Log completion
cat >> $PAI_DIR/history/voice-sessions.jsonl <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"complete","total_latency_ms":$TOTAL_LATENCY}
EOF

echo "✅ Voice session complete (${TOTAL_LATENCY}ms)" >&2
```

## Error Handling

At any step, on error:

```bash
ERROR_TYPE="transcription_failed"  # or query_timeout, tts_failed, etc.
ERROR_MSG="WhisperFlow timeout"

cat >> $PAI_DIR/history/voice-sessions.jsonl <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"error","error_type":"$ERROR_TYPE","error_message":"$ERROR_MSG"}
EOF
```

## Complete Pipeline (One-Liner)

For advanced users, full pipeline as Unix pipes:

```bash
export SESSION_ID="voice-$(date +%s)"
bun run Tools/Record.ts | \
bun run Tools/Transcribe.ts --provider whisperflow | \
bun run Tools/RemoteQuery.ts --host vultr-claude | \
bun run Tools/Speak.ts
```

## Platform-Specific Integration

### macOS with Hammerspoon

See `hooks/on-hotkey-trigger/hammerspoon-voice.lua` for Cmd+Shift+Space integration.

### Linux with i3/sway

Bind hotkey to:
```bash
bindsym $mod+Shift+Space exec $HOME/.claude/skills/VoiceInterface/Workflows/voice-query.sh
```

## Observability

View live session:
```bash
tail -f ~/.claude/history/voice-sessions.jsonl | jq .
```

Analyze performance:
```bash
bun run $PAI_DIR/skills/VoiceInterface/Tools/Stats.ts --since "24h"
```

## Completion

Voice query is complete when:
1. Audio recorded successfully
2. Transcription completed
3. Claude responded
4. TTS played response
5. Session logged to JSONL

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
