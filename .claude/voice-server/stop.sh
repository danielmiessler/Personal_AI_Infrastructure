#!/bin/bash

# Stop the PAI Voice Server (Cross-platform)

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

echo -e "${YELLOW}▶ Stopping PAI Voice Server (${PLATFORM})...${NC}"

if [ "$PLATFORM" = "macos" ]; then
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if [ ! -f "$PLIST_PATH" ]; then
        echo -e "${YELLOW}⚠ Service not installed${NC}"
        exit 0
    fi

    if ! launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Already stopped${NC}"
        exit 0
    fi

    launchctl unload "$PLIST_PATH"
else
    SERVICE_NAME="pai-voice-server"

    if ! systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null; then
        echo -e "${YELLOW}⚠ Service not installed${NC}"
        exit 0
    fi

    if ! systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
        echo -e "${YELLOW}⚠ Already stopped${NC}"
        exit 0
    fi

    systemctl --user stop "$SERVICE_NAME"
fi

echo -e "${GREEN}✓ Voice server stopped${NC}"
