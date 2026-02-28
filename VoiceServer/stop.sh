#!/bin/bash

# Stop the Voice Server
# Supports macOS (LaunchAgent) and Linux (systemd user service)

OS=$(uname -s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}> Stopping Voice Server...${NC}"

if [[ "$OS" == "Darwin" ]]; then
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_PATH" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}OK Voice server stopped${NC}"
        else
            echo -e "${RED}X Failed to stop voice server${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}! Voice server is not running${NC}"
    fi

elif [[ "$OS" == "Linux" ]]; then
    SERVICE_NAME="pai-voice-server"

    if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl --user stop "$SERVICE_NAME"
        echo -e "${GREEN}OK Voice server stopped${NC}"
    else
        echo -e "${YELLOW}! Voice server is not running${NC}"
    fi

else
    echo -e "${RED}X Unsupported operating system: $OS${NC}"
    exit 1
fi

# Clean up any remaining process on port 8888
if command -v lsof &>/dev/null; then
    PIDS=$(lsof -ti :8888 2>/dev/null)
elif command -v ss &>/dev/null; then
    PIDS=$(ss -tlnp 2>/dev/null | grep ':8888' | grep -oP 'pid=\K[0-9]+')
fi

if [ -n "$PIDS" ]; then
    echo -e "${YELLOW}> Cleaning up remaining process on port 8888...${NC}"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}OK Port 8888 cleared${NC}"
fi
