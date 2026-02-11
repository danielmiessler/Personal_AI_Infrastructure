#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd -P)
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
PLIST_TEMPLATE="$SCRIPT_DIR/com.example.codex-pai-bridge.plist"
PLIST_PATH="$HOME/Library/LaunchAgents/com.example.codex-pai-bridge.plist"
LABEL="com.example.codex-pai-bridge"
BUN_BIN="${BUN_PATH:-$(command -v bun || true)}"

if [[ "${1:-}" == "--check" ]]; then
  if [[ -f "$PLIST_PATH" ]]; then
    echo "OK: $PLIST_PATH"
    exit 0
  fi
  echo "Missing: $PLIST_PATH"
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$PAI_DIR/bridge/logs"

BRIDGE_PATH="$SCRIPT_DIR/bridge.ts"
if [[ ! -f "$BRIDGE_PATH" ]]; then
  echo "Missing bridge script: $BRIDGE_PATH"
  exit 1
fi

if [[ -z "$BUN_BIN" ]]; then
  echo "bun was not found. Install Bun or set BUN_PATH."
  exit 1
fi

sed -e "s|__BRIDGE_PATH__|$BRIDGE_PATH|g" \
    -e "s|__BUN_PATH__|$BUN_BIN|g" \
    -e "s|__PAI_DIR__|$PAI_DIR|g" \
    -e "s|__CODEX_HOME__|$CODEX_HOME|g" \
    "$PLIST_TEMPLATE" > "$PLIST_PATH"

launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"
launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>/dev/null || true

echo "Installed: $PLIST_PATH"
