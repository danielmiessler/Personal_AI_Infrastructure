#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")/.." && pwd -P)
TMP_DIR=$(mktemp -d)
CODEX_HOME="$TMP_DIR/codex"
PAI_DIR="$TMP_DIR/pai"
HOOKS_DIR="$PAI_DIR/hooks"
mkdir -p "$CODEX_HOME/sessions" "$PAI_DIR/bridge/transcripts" "$HOOKS_DIR"

# Minimal hook scripts
cat > "$HOOKS_DIR/StartupGreeting.hook.ts" <<'TS'
console.log('startup ok');
TS

cat > "$HOOKS_DIR/AutoWorkCreation.hook.ts" <<'TS'
console.log('user ok');
TS

cat > "$HOOKS_DIR/StopOrchestrator.hook.ts" <<'TS'
console.log('stop ok');
TS

BUN_PATH="$(command -v bun)"

# Run bridge with empty PATH so spawn('bun') fails if not fixed
output=$(env -i PATH="" BUN_PATH="$BUN_PATH" CODEX_HOME="$CODEX_HOME" PAI_DIR="$PAI_DIR" \
  "$BUN_PATH" "$SCRIPT_DIR/bridge.ts" --test-fixture "$SCRIPT_DIR/fixtures/sample.jsonl" 2>&1)

if ! echo "$output" | grep -q "Wrote transcript:"; then
  echo "Expected transcript output"
  echo "$output"
  exit 1
fi

rm -rf "$TMP_DIR"
echo "PASS: hook-bun-path"
