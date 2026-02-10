#!/bin/bash

# Start the Voice Server (cross-platform: macOS + Linux)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}▶ Starting Voice Server...${NC}"

if [[ "$(uname)" == "Darwin" ]]; then
    # ── macOS: LaunchAgent ──
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if [ ! -f "$PLIST_PATH" ]; then
        echo -e "${RED}✗ Service not installed${NC}"
        echo "  Run ./install.sh first to install the service"
        exit 1
    fi

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Voice server is already running${NC}"
        echo "  To restart, use: ./restart.sh"
        exit 0
    fi

    launchctl load "$PLIST_PATH" 2>/dev/null

    if [ $? -eq 0 ]; then
        sleep 2
        if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Voice server started successfully${NC}"
            echo "  Port: 8888"
        else
            echo -e "${YELLOW}⚠ Server started but not responding yet${NC}"
            echo "  Check logs: tail -f ~/Library/Logs/pai-voice-server.log"
        fi
    else
        echo -e "${RED}✗ Failed to start voice server${NC}"
        echo "  Try running manually: bun run $SCRIPT_DIR/server.ts"
        exit 1
    fi
else
    # ── Linux: systemd ──
    SERVICE_NAME="pai-voice-server"

    if ! systemctl --user cat "$SERVICE_NAME" &> /dev/null; then
        echo -e "${RED}✗ Service not installed${NC}"
        echo "  Run ./linux-service/install.sh first"
        exit 1
    fi

    if systemctl --user is-active "$SERVICE_NAME" &> /dev/null; then
        echo -e "${YELLOW}⚠ Voice server is already running${NC}"
        echo "  To restart, use: ./restart.sh"
        exit 0
    fi

    systemctl --user start "$SERVICE_NAME"

    sleep 2
    if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Voice server started successfully${NC}"
        echo "  Port: 8888"
    else
        echo -e "${YELLOW}⚠ Server started but not responding yet${NC}"
        echo "  Check logs: journalctl --user -u $SERVICE_NAME -f"
    fi
fi
