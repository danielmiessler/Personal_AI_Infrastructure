#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")/.." && pwd -P)

output=$(bun "$SCRIPT_DIR/bridge.ts" --dry-run --test-fixture "$SCRIPT_DIR/fixtures/sample.jsonl")
count=$(echo "$output" | grep -c "STATUSLINE ->" || true)

if [ "$count" -ne 1 ]; then
  echo "Expected 1 statusline invocation, got $count"
  echo "$output"
  exit 1
fi

echo "PASS: statusline dry-run"
