#!/bin/bash

# Start the PAI Voice Server (Platform-aware)

# Detect platform
OS_TYPE="$(uname -s)"
case "${OS_TYPE}" in
    Linux*)     PLATFORM=Linux;;
    Darwin*)    PLATFORM=macOS;;
    *)          echo "Unsupported platform"; exit 1;;
esac

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}▶ Starting PAI Voice Server (${PLATFORM})...${NC}"

if [ "$PLATFORM" = "Linux" ]; then
    # Linux systemd
    SERVICE_NAME="pai-voice-server"

    # Check if service exists
    if ! systemctl --user list-unit-files | grep -q "$SERVICE_NAME"; then
        echo -e "${RED}✗ Service not installed${NC}"
        echo "  Run ./install.sh first to install the service"
        exit 1
    fi

    # Check if already running
    if systemctl --user is-active --quiet "$SERVICE_NAME"; then
        echo -e "${YELLOW}⚠ Voice server is already running${NC}"
        echo "  To restart, use: ./restart.sh"
        exit 0
    fi

    # Start the service
    systemctl --user start "$SERVICE_NAME"

    if [ $? -eq 0 ]; then
        sleep 2
        if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Voice server started successfully${NC}"
            echo "  Port: 8888"
            echo "  Status: systemctl --user status $SERVICE_NAME"
            echo "  Logs: journalctl --user -u $SERVICE_NAME -f"
        else
            echo -e "${YELLOW}⚠ Server started but not responding yet${NC}"
            echo "  Check logs: journalctl --user -u $SERVICE_NAME"
        fi
    else
        echo -e "${RED}✗ Failed to start voice server${NC}"
        exit 1
    fi

else
    # macOS LaunchAgent
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    # Check if LaunchAgent exists
    if [ ! -f "$PLIST_PATH" ]; then
        echo -e "${RED}✗ Service not installed${NC}"
        echo "  Run ./install.sh first to install the service"
        exit 1
    fi

    # Check if already running
    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Voice server is already running${NC}"
        echo "  To restart, use: ./restart.sh"
        exit 0
    fi

    # Load the service
    launchctl load "$PLIST_PATH" 2>/dev/null

    if [ $? -eq 0 ]; then
        sleep 2
        if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Voice server started successfully${NC}"
            echo "  Port: 8888"
            echo "  Test: curl -X POST http://localhost:8888/notify -H 'Content-Type: application/json' -d '{\"message\":\"Test\"}'"
        else
            echo -e "${YELLOW}⚠ Server started but not responding yet${NC}"
            echo "  Check logs: tail -f ~/Library/Logs/pai-voice-server.log"
        fi
    else
        echo -e "${RED}✗ Failed to start voice server${NC}"
        echo "  Try running manually: bun run $SCRIPT_DIR/server.ts"
        exit 1
    fi
fi
