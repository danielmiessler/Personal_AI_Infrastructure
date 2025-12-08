#!/bin/bash

# Check PAI Voice Server status (Platform-aware)

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
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server Status (${PLATFORM})${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

if [ "$PLATFORM" = "Linux" ]; then
    # Linux systemd
    SERVICE_NAME="pai-voice-server"

    if systemctl --user is-active --quiet "$SERVICE_NAME"; then
        echo -e "${GREEN}✓ Service is running${NC}"
        echo
        echo -e "${BLUE}Service Status:${NC}"
        systemctl --user status "$SERVICE_NAME" --no-pager
    else
        echo -e "${RED}✗ Service is not running${NC}"
        echo
        echo "Start with: ./start.sh"
    fi

else
    # macOS LaunchAgent
    SERVICE_NAME="com.pai.voice-server"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${GREEN}✓ Service is running${NC}"
        echo
        launchctl list | grep "$SERVICE_NAME"
    else
        echo -e "${RED}✗ Service is not running${NC}"
        echo
        echo "Start with: ./start.sh"
    fi
fi

echo
echo -e "${BLUE}Server Health Check:${NC}"
if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    HEALTH=$(curl -s -X GET http://localhost:8888/health)
    echo -e "${GREEN}✓ Server is responding${NC}"
    echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
else
    echo -e "${RED}✗ Server is not responding on port 8888${NC}"
fi