#!/bin/bash

# Stop the PAI Voice Server (Platform-aware)

# Detect platform
OS_TYPE="$(uname -s)"
case "${OS_TYPE}" in
    Linux*)     PLATFORM=Linux;;
    Darwin*)    PLATFORM=macOS;;
    *)          echo "Unsupported platform"; exit 1;;
esac

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}▶ Stopping PAI Voice Server (${PLATFORM})...${NC}"

if [ "$PLATFORM" = "Linux" ]; then
    # Linux systemd
    SERVICE_NAME="pai-voice-server"

    if systemctl --user is-active --quiet "$SERVICE_NAME"; then
        systemctl --user stop "$SERVICE_NAME"
        echo -e "${GREEN}✓ Voice server stopped${NC}"
    else
        echo -e "${YELLOW}⚠ Voice server is not running${NC}"
    fi

else
    # macOS LaunchAgent
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_PATH" 2>/dev/null
        echo -e "${GREEN}✓ Voice server stopped${NC}"
    else
        echo -e "${YELLOW}⚠ Voice server is not running${NC}"
    fi
fi