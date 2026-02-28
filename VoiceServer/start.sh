#!/bin/bash

# Start the Voice Server
# Supports macOS (LaunchAgent) and Linux (systemd user service)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OS=$(uname -s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}> Starting Voice Server...${NC}"

if [[ "$OS" == "Darwin" ]]; then
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if [ ! -f "$PLIST_PATH" ]; then
        echo -e "${RED}X Service not installed${NC}"
        echo "  Run ./install.sh first to install the service"
        exit 1
    fi

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${YELLOW}! Voice server is already running${NC}"
        echo "  To restart, use: ./restart.sh"
        exit 0
    fi

    launchctl load "$PLIST_PATH" 2>/dev/null

elif [[ "$OS" == "Linux" ]]; then
    SERVICE_NAME="pai-voice-server"
    SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"

    if [ ! -f "$SERVICE_FILE" ]; then
        echo -e "${RED}X Service not installed${NC}"
        echo "  Run ./install.sh first to install the service"
        exit 1
    fi

    if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${YELLOW}! Voice server is already running${NC}"
        echo "  To restart, use: ./restart.sh"
        exit 0
    fi

    systemctl --user start "$SERVICE_NAME"

else
    echo -e "${RED}X Unsupported operating system: $OS${NC}"
    exit 1
fi

# Verify server is responding
sleep 2
if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "${GREEN}OK Voice server started successfully (port 8888)${NC}"
else
    echo -e "${YELLOW}! Server started but not responding yet${NC}"
    if [[ "$OS" == "Darwin" ]]; then
        echo "  Check logs: tail -f ~/Library/Logs/pai-voice-server.log"
    else
        echo "  Check logs: journalctl --user -u pai-voice-server -f"
    fi
fi
