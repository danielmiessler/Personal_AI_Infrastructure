#!/bin/bash

# PAI Voice Server Linux Uninstall Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME="pai-voice-server"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"
LOG_FILE="$HOME/.local/share/pai-voice-server.log"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server - Linux Uninstall${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check if service exists
if ! systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null && [ ! -f "$SERVICE_FILE" ]; then
    echo -e "${YELLOW}⚠ Voice server is not installed${NC}"
    exit 0
fi

# Confirm uninstall
read -p "Are you sure you want to uninstall PAI Voice Server? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled"
    exit 0
fi

# Stop and disable service
echo -e "${YELLOW}▶ Stopping and disabling service...${NC}"
systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true
systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true
echo -e "${GREEN}✓ Service stopped and disabled${NC}"

# Remove service file
if [ -f "$SERVICE_FILE" ]; then
    echo -e "${YELLOW}▶ Removing service file...${NC}"
    rm -f "$SERVICE_FILE"
    echo -e "${GREEN}✓ Service file removed${NC}"
fi

# Reload systemd
systemctl --user daemon-reload

# Ask about logs
echo
echo -e "${BLUE}Log files location: $LOG_FILE${NC}"
read -p "Would you like to remove log files? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$LOG_FILE" ]; then
        rm -f "$LOG_FILE"
        echo -e "${GREEN}✓ Log file removed${NC}"
    else
        echo -e "${YELLOW}⚠ No log file found${NC}"
    fi
fi

# Disable lingering if no other user services
USER_SERVICES=$(systemctl --user list-unit-files --state=enabled --no-pager | grep -v "UNIT FILE" | wc -l)
if [ "$USER_SERVICES" -eq 0 ]; then
    echo
    read -p "No other user services found. Disable user lingering? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        loginctl disable-linger "$USER" 2>/dev/null || true
        echo -e "${GREEN}✓ User lingering disabled${NC}"
    fi
fi

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Uninstall Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}PAI Voice Server has been uninstalled.${NC}"
echo -e "Configuration files in ~/.claude remain unchanged."
