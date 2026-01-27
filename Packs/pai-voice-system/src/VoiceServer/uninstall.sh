#!/bin/bash

# Uninstall Voice Server

SERVICE_NAME="com.pai.voice-server"
OS_TYPE="$(uname -s)"

if [ "$OS_TYPE" = "Darwin" ]; then
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
    LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"
elif [ "$OS_TYPE" = "Linux" ]; then
    SERVICE_FILE="$HOME/.config/systemd/user/pai-voice-server.service"
    LOG_PATH="$HOME/.local/share/logs/pai-voice-server.log"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     PAI Voice Server Uninstall${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo

# Confirm uninstall
echo -e "${YELLOW}This will:${NC}"
echo "  - Stop the voice server"
if [ "$OS_TYPE" = "Darwin" ]; then
    echo "  - Remove the LaunchAgent"
elif [ "$OS_TYPE" = "Linux" ]; then
    echo "  - Remove the systemd user service"
fi
echo "  - Keep your server files and configuration"
echo
read -p "Are you sure you want to uninstall? (y/n): " -n 1 -r
echo
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstall cancelled"
    exit 0
fi

# Stop the service if running
echo -e "${YELLOW}> Stopping voice server...${NC}"
if [ "$OS_TYPE" = "Darwin" ]; then
    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_PATH" 2>/dev/null
        echo -e "${GREEN}OK Voice server stopped${NC}"
    else
        echo -e "${YELLOW}  Service was not running${NC}"
    fi
elif [ "$OS_TYPE" = "Linux" ]; then
    if systemctl --user is-active pai-voice-server >/dev/null 2>&1; then
        systemctl --user stop pai-voice-server 2>/dev/null
        echo -e "${GREEN}OK Voice server stopped${NC}"
    else
        echo -e "${YELLOW}  Service was not running${NC}"
    fi
    systemctl --user disable pai-voice-server 2>/dev/null || true
fi

# Remove service configuration
if [ "$OS_TYPE" = "Darwin" ]; then
    echo -e "${YELLOW}> Removing LaunchAgent...${NC}"
    if [ -f "$PLIST_PATH" ]; then
        rm "$PLIST_PATH"
        echo -e "${GREEN}OK LaunchAgent removed${NC}"
    else
        echo -e "${YELLOW}  LaunchAgent file not found${NC}"
    fi
elif [ "$OS_TYPE" = "Linux" ]; then
    echo -e "${YELLOW}> Removing systemd service...${NC}"
    if [ -f "$SERVICE_FILE" ]; then
        rm "$SERVICE_FILE"
        systemctl --user daemon-reload 2>/dev/null
        echo -e "${GREEN}OK systemd service removed${NC}"
    else
        echo -e "${YELLOW}  Service file not found${NC}"
    fi
fi

# Kill any remaining processes
if lsof -i :8888 > /dev/null 2>&1; then
    echo -e "${YELLOW}> Cleaning up port 8888...${NC}"
    lsof -ti :8888 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}OK Port 8888 cleared${NC}"
fi

# Ask about logs
echo
read -p "Do you want to remove log files? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$LOG_PATH" ]; then
        rm "$LOG_PATH"
        echo -e "${GREEN}OK Log file removed${NC}"
    fi
fi

echo
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}     Uninstall Complete${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo
echo -e "${BLUE}Notes:${NC}"
echo "  - Your server files are still in: $(dirname "${BASH_SOURCE[0]}")"
echo "  - Your ~/.env configuration is preserved"
echo "  - To reinstall, run: ./install.sh"
echo
echo "To completely remove all files:"
echo "  rm -rf $(dirname "${BASH_SOURCE[0]}")"
