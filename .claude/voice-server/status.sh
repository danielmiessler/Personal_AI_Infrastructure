#!/bin/bash

# Check PAI Voice Server status (Cross-platform)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server Status (${PLATFORM})${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check service status
if [ "$PLATFORM" = "macos" ]; then
    SERVICE_NAME="com.pai.voice-server"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${GREEN}✓ Service: Running${NC}"
    else
        echo -e "${RED}✗ Service: Stopped${NC}"
    fi
else
    SERVICE_NAME="pai-voice-server"

    if systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
        echo -e "${GREEN}✓ Service: Running${NC}"
    else
        echo -e "${RED}✗ Service: Stopped${NC}"
    fi
fi

# Check HTTP endpoint
echo
if curl -s -f -X GET http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTP Server: Responding on port $PORT${NC}"

    # Get health details
    HEALTH=$(curl -s -X GET http://localhost:$PORT/health 2>/dev/null)
    if [ -n "$HEALTH" ]; then
        echo "  Response: $HEALTH"
    fi
else
    echo -e "${RED}✗ HTTP Server: Not responding${NC}"
fi

# Show logs location
echo
echo -e "${BLUE}Logs:${NC}"
if [ "$PLATFORM" = "macos" ]; then
    echo "  ~/Library/Logs/pai-voice-server.log"
    echo "  View: tail -f ~/Library/Logs/pai-voice-server.log"
else
    echo "  ~/.local/share/pai-voice-server.log"
    echo "  View: journalctl --user -u $SERVICE_NAME -f"
fi

echo
echo -e "${BLUE}Management:${NC}"
echo "  Start:   ./start.sh"
echo "  Stop:    ./stop.sh"
echo "  Restart: ./restart.sh"

echo
echo -e "${BLUE}Test:${NC}"
echo "  curl -X POST http://localhost:$PORT/notify \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\": \"Hello from PAI\"}'"
