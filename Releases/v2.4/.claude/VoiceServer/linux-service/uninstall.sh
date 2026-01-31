#!/bin/bash

# Voice Server Linux Uninstall Script

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE_NAME="pai-voice-server"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"

echo -e "${YELLOW}▶ Uninstalling Voice Server...${NC}"

if systemctl --user is-active "$SERVICE_NAME" &> /dev/null; then
    echo -e "${YELLOW}▶ Stopping service...${NC}"
    systemctl --user stop "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service stopped${NC}"
fi

if systemctl --user is-enabled "$SERVICE_NAME" &> /dev/null; then
    echo -e "${YELLOW}▶ Disabling service...${NC}"
    systemctl --user disable "$SERVICE_NAME"
    echo -e "${GREEN}✓ Service disabled${NC}"
fi

if [ -f "$SERVICE_FILE" ]; then
    rm "$SERVICE_FILE"
    systemctl --user daemon-reload
    echo -e "${GREEN}✓ Service file removed${NC}"
fi

echo -e "${GREEN}✓ Voice server uninstalled${NC}"
