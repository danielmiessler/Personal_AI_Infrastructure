#!/bin/bash
# voice-query.sh - Complete voice → Claude → TTS workflow
# Implements VoiceQuery workflow with full JSONL logging

set -e

PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SKILL_DIR="$PAI_DIR/skills/VoiceInterface"
VULTR_HOST="${VULTR_HOST:-vultr-claude}"
TRANSCRIBE_PROVIDER="${TRANSCRIBE_PROVIDER:-whisperflow}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[Voice]${NC} $1" >&2; }
error() { echo -e "${RED}[Error]${NC} $1" >&2; }

# Generate session ID
export SESSION_ID="voice-$(date +%s)-$(openssl rand -hex 4)"
START_TIME=$(date +%s%3N)

log "🎙️  Session: $SESSION_ID"

# Function to log error and exit
log_error() {
  local error_type="$1"
  local error_msg="$2"

  cat >> "$PAI_DIR/history/voice-sessions.jsonl" <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"error","error_type":"$error_type","error_message":"$error_msg"}
EOF

  error "$error_msg"
  exit 1
}

# Step 1: Record
log "🎤 Recording..."
AUDIO_FILE="/tmp/$SESSION_ID.wav"

if ! bun run "$SKILL_DIR/Tools/Record.ts" --duration 30 --output "$AUDIO_FILE"; then
  log_error "record_failed" "Failed to record audio"
fi

RECORD_END=$(date +%s%3N)
RECORD_DURATION=$((RECORD_END - START_TIME))

cat >> "$PAI_DIR/history/voice-sessions.jsonl" <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"record","duration_ms":$RECORD_DURATION}
EOF

# Step 2: Transcribe
log "📝 Transcribing..."
TRANSCRIBE_START=$(date +%s%3N)

TRANSCRIPT=$(bun run "$SKILL_DIR/Tools/Transcribe.ts" \
  --input "$AUDIO_FILE" \
  --provider "$TRANSCRIBE_PROVIDER") || log_error "transcribe_failed" "Transcription failed"

TRANSCRIBE_END=$(date +%s%3N)
TRANSCRIBE_DURATION=$((TRANSCRIBE_END - TRANSCRIBE_START))

if [ -z "$TRANSCRIPT" ]; then
  log_error "empty_transcript" "Empty transcription"
fi

log "📄 You said: \"$TRANSCRIPT\""

cat >> "$PAI_DIR/history/voice-sessions.jsonl" <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"transcribe","text":"$TRANSCRIPT","provider":"$TRANSCRIBE_PROVIDER","latency_ms":$TRANSCRIBE_DURATION}
EOF

# Step 3: Query Remote Claude
log "🤖 Querying Claude on $VULTR_HOST..."
QUERY_START=$(date +%s%3N)

RESPONSE=$(echo "$TRANSCRIPT" | bun run "$SKILL_DIR/Tools/RemoteQuery.ts" \
  --host "$VULTR_HOST") || log_error "query_failed" "Remote query failed"

QUERY_END=$(date +%s%3N)
QUERY_DURATION=$((QUERY_END - QUERY_START))

WORD_COUNT=$(echo "$RESPONSE" | wc -w)

cat >> "$PAI_DIR/history/voice-sessions.jsonl" <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"query","remote":"$VULTR_HOST","latency_ms":$QUERY_DURATION}
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"response","text":"${RESPONSE:0:200}...","word_count":$WORD_COUNT}
EOF

# Step 4: Speak
log "🔊 Speaking response..."
TTS_START=$(date +%s%3N)

echo "$RESPONSE" | bun run "$SKILL_DIR/Tools/Speak.ts" || log_error "tts_failed" "TTS playback failed"

TTS_END=$(date +%s%3N)
TTS_DURATION=$((TTS_END - TTS_START))

cat >> "$PAI_DIR/history/voice-sessions.jsonl" <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"speak","tts_latency_ms":$TTS_DURATION}
EOF

# Step 5: Complete
END_TIME=$(date +%s%3N)
TOTAL_LATENCY=$((END_TIME - START_TIME))

cat >> "$PAI_DIR/history/voice-sessions.jsonl" <<EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)","session_id":"$SESSION_ID","event":"complete","total_latency_ms":$TOTAL_LATENCY}
EOF

log "✅ Complete (${TOTAL_LATENCY}ms)"

# Cleanup
rm -f "$AUDIO_FILE"
