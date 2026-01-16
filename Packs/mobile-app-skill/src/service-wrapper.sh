#!/bin/bash
# Service wrapper for launchd - checks dev mode before starting

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEV_FLAG="$SCRIPT_DIR/.dev-mode"
SERVER_DIR="$SCRIPT_DIR/apps/server"

# If dev mode is active, exit cleanly (don't restart)
if [ -f "$DEV_FLAG" ]; then
    echo "$(date): Dev mode active, not starting production server"
    exit 0
fi

# Kill any orphaned process on port 5050
EXISTING_PID=$(lsof -ti :5050 2>/dev/null)
if [ -n "$EXISTING_PID" ]; then
    echo "$(date): Killing orphaned process on port 5050 (PID: $EXISTING_PID)"
    kill -9 $EXISTING_PID 2>/dev/null
    sleep 1
fi

echo "$(date): Starting PAI Mobile server..."
cd "$SERVER_DIR"

# Find bun - check common locations
if [ -x "$HOME/.bun/bin/bun" ]; then
    BUN="$HOME/.bun/bin/bun"
elif command -v bun &> /dev/null; then
    BUN=$(command -v bun)
else
    echo "$(date): ERROR - bun not found"
    exit 1
fi

exec "$BUN" src/index.ts
