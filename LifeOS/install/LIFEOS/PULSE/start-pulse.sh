#!/bin/bash
# Unlock keychain for headless access (macOS only), then start Pulse
if [ "$(uname -s)" = "Darwin" ]; then
  security unlock-keychain -p "${PULSE_KEYCHAIN_PASSWORD:-changeme}" ~/Library/Keychains/login.keychain-db 2>/dev/null
fi
# Keep stderr — a discarded stderr made boot crash-loops invisible (public
# issue #1568, @christauff). Boot failures now land in logs/pulse-stderr.log.
PULSE_ERR_LOG="$(cd "$(dirname "$0")" && pwd)/logs/pulse-stderr.log"
mkdir -p "$(dirname "$PULSE_ERR_LOG")"
exec "${HOME}/.bun/bin/bun" run pulse.ts 2>>"$PULSE_ERR_LOG" || exec /opt/homebrew/bin/bun run pulse.ts 2>>"$PULSE_ERR_LOG"
