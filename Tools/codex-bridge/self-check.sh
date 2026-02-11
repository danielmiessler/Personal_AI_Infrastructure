#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
[ -d "$CODEX_HOME" ] || { echo "Missing $CODEX_HOME"; exit 1; }
[ -d "$CODEX_HOME/sessions" ] || { echo "Missing $CODEX_HOME/sessions"; exit 1; }
echo "OK: Codex home found at $CODEX_HOME"
