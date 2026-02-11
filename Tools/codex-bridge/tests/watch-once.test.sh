#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")/.." && pwd -P)
TMP_DIR=$(mktemp -d)
CODEX_HOME="$TMP_DIR/codex"
PAI_DIR="$TMP_DIR/pai"
mkdir -p "$CODEX_HOME/sessions/2026/01/21" "$PAI_DIR/bridge/transcripts"

# Minimal statusline script so the bridge doesn't error
mkdir -p "$PAI_DIR"
cat > "$PAI_DIR/statusline-command.sh" <<'SCRIPT'
#!/bin/bash
cat >/dev/null
SCRIPT
chmod +x "$PAI_DIR/statusline-command.sh"

# Write a session file with session_meta + user + assistant
SESSION_FILE="$CODEX_HOME/sessions/2026/01/21/rollout-2026-01-21T00-00-00-00000000-0000-0000-0000-000000000000.jsonl"
cat > "$SESSION_FILE" <<'JSONL'
{"timestamp":"2026-01-21T00:00:00.000Z","type":"session_meta","payload":{"id":"test-session","cwd":"/tmp"}}
{"timestamp":"2026-01-21T00:00:01.000Z","type":"response_item","payload":{"type":"message","role":"user","content":[{"type":"input_text","text":"Hello"}]}}
{"timestamp":"2026-01-21T00:00:02.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Hi"}]}}
JSONL

output=$(CODEX_HOME="$CODEX_HOME" PAI_DIR="$PAI_DIR" bun "$SCRIPT_DIR/bridge.ts" --watch --once --dry-run)

# Expect a transcript to be written and statusline invoked once
if ! echo "$output" | grep -q "STATUSLINE ->"; then
  echo "Expected statusline invocation"
  echo "$output"
  exit 1
fi

if [ ! -f "$PAI_DIR/bridge/transcripts/test-session.jsonl" ]; then
  echo "Expected transcript file to exist"
  exit 1
fi

rm -rf "$TMP_DIR"
echo "PASS: watch-once"
