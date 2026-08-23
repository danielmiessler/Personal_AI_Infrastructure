#!/bin/bash
# Voice mute toggle — pure-bash flip of the canonical mute state file.
# Made for hotkey daemons (skhd, Keyboard Maestro, Stream Deck): they run with a
# minimal PATH, so this needs no bun/node and touches only the state file that
# voice.ts reads on every notification and the statusline renders as 🔊/🔇.
# TOOLS/VoiceMute.ts remains the richer CLI (on|off|toggle|status).
STATE_DIR="$HOME/.claude/LIFEOS/PULSE/state"
STATE_FILE="$STATE_DIR/voice-mute.json"
mkdir -p "$STATE_DIR"
if grep -q '"muted"[[:space:]]*:[[:space:]]*true' "$STATE_FILE" 2>/dev/null; then
    printf '{"muted": false}\n' > "$STATE_FILE"
else
    printf '{"muted": true}\n' > "$STATE_FILE"
fi
