#!/usr/bin/env bash
# Voice Server Launcher Script

# Use current user's HOME if not set
export HOME="${HOME:-$(eval echo ~$USER)}"
export PATH="$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Use PAI_DIR if set, otherwise default to $HOME/.claude
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Get port from settings.json first, then .env, then default
SETTINGS_FILE="$PAI_DIR/settings.json"
ENV_FILE="$PAI_DIR/.env"
PORT=8888  # Default

# Try settings.json first
if [ -f "$SETTINGS_FILE" ]; then
    PORT_FROM_SETTINGS=$(grep -o '"VOICE_SERVER_PORT"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ -n "$PORT_FROM_SETTINGS" ]; then
        PORT=$PORT_FROM_SETTINGS
    fi
fi

# Fall back to .env if not in settings.json
if [ "$PORT" = "8888" ] && [ -f "$ENV_FILE" ] && grep -q "^PORT=" "$ENV_FILE"; then
    PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
fi

export PORT

cd "${PAI_DIR}/voice-server"
exec "$HOME/.bun/bin/bun" run server.ts