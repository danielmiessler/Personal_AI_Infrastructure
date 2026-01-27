#!/bin/bash

# Stop the Voice Server

SERVICE_NAME="com.pai.voice-server"
OS_TYPE="$(uname -s)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}> Stopping Voice Server...${NC}"

if [ "$OS_TYPE" = "Darwin" ]; then
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_PATH" 2>/dev/null

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}OK Voice server stopped successfully${NC}"
        else
            echo -e "${RED}X Failed to stop voice server${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}! Voice server is not running${NC}"
    fi

elif [ "$OS_TYPE" = "Linux" ]; then
    if systemctl --user is-active pai-voice-server >/dev/null 2>&1; then
        systemctl --user stop pai-voice-server

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}OK Voice server stopped successfully${NC}"
        else
            echo -e "${RED}X Failed to stop voice server${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}! Voice server is not running${NC}"
    fi

else
    echo -e "${RED}X Unsupported platform: $OS_TYPE${NC}"
    exit 1
fi

# Kill any remaining processes on port 8888
if lsof -i :8888 > /dev/null 2>&1; then
    echo -e "${YELLOW}> Cleaning up port 8888...${NC}"
    lsof -ti :8888 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}OK Port 8888 cleared${NC}"
fi
