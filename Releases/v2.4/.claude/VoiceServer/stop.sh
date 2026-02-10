#!/bin/bash

# Stop the Voice Server (cross-platform: macOS + Linux)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}▶ Stopping Voice Server...${NC}"

if [[ "$(uname)" == "Darwin" ]]; then
    # ── macOS: LaunchAgent ──
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_PATH" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Voice server stopped successfully${NC}"
        else
            echo -e "${RED}✗ Failed to stop voice server${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠ Voice server is not running${NC}"
    fi
else
    # ── Linux: systemd ──
    SERVICE_NAME="pai-voice-server"

    if systemctl --user is-active "$SERVICE_NAME" &> /dev/null; then
        systemctl --user stop "$SERVICE_NAME"
        echo -e "${GREEN}✓ Voice server stopped successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Voice server is not running${NC}"
    fi
fi

# Kill any remaining processes on port 8888
if command -v lsof &> /dev/null && lsof -i :8888 > /dev/null 2>&1; then
    echo -e "${YELLOW}▶ Cleaning up port 8888...${NC}"
    lsof -ti :8888 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Port 8888 cleared${NC}"
elif command -v fuser &> /dev/null && fuser 8888/tcp 2>/dev/null; then
    echo -e "${YELLOW}▶ Cleaning up port 8888...${NC}"
    fuser -k 8888/tcp 2>/dev/null
    echo -e "${GREEN}✓ Port 8888 cleared${NC}"
fi
