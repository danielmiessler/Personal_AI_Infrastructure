#!/bin/bash

# Start the PAI Voice Server (Cross-platform)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detect platform
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    PLATFORM="macos";;
    Linux*)     PLATFORM="linux";;
    *)          echo -e "${RED}✗ Unsupported operating system${NC}"; exit 1;;
esac

# Get port from settings.json first, then .env
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SETTINGS_FILE="$PAI_DIR/settings.json"
ENV_FILE="$PAI_DIR/.env"
PORT=8888  # Default

# Try settings.json first
if [ -f "$SETTINGS_FILE" ]; then
    # Extract VOICE_SERVER_PORT from settings.json
    PORT_FROM_SETTINGS=$(grep -o '"VOICE_SERVER_PORT"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ -n "$PORT_FROM_SETTINGS" ]; then
        PORT=$PORT_FROM_SETTINGS
    fi
fi

# Fall back to .env if not in settings.json
if [ "$PORT" = "8888" ] && [ -f "$ENV_FILE" ] && grep -q "^PORT=" "$ENV_FILE"; then
    PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
fi

echo -e "${YELLOW}▶ Starting PAI Voice Server (${PLATFORM})...${NC}"

if [ "$PLATFORM" = "macos" ]; then
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if [ ! -f "$PLIST_PATH" ]; then
        echo -e "${RED}✗ Service not installed${NC}"
        echo "  Run ./install.sh first"
        exit 1
    fi

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Already running${NC}"
        exit 0
    fi

    launchctl load "$PLIST_PATH"
else
    SERVICE_NAME="pai-voice-server"

    if ! systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null; then
        echo -e "${RED}✗ Service not installed${NC}"
        echo "  Run ./install.sh first"
        exit 1
    fi

    if systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
        echo -e "${YELLOW}⚠ Already running${NC}"
        exit 0
    fi

    systemctl --user start "$SERVICE_NAME"
fi

# Wait and test
sleep 2
if curl -s -f -X GET http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Voice server started on port $PORT${NC}"
    echo "  Test: curl -X POST http://localhost:$PORT/notify -H 'Content-Type: application/json' -d '{\"message\":\"Test\"}'"
else
    echo -e "${YELLOW}⚠ Started but not responding yet${NC}"
    if [ "$PLATFORM" = "macos" ]; then
        echo "  Logs: tail -f ~/Library/Logs/pai-voice-server.log"
    else
        echo "  Logs: journalctl --user -u $SERVICE_NAME -f"
    fi
fi
