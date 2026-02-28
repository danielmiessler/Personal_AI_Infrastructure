#!/bin/bash

# Uninstall Voice Server
# Supports macOS (LaunchAgent) and Linux (systemd user service)

OS=$(uname -s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     PAI Voice Server Uninstall${NC}"
echo -e "${BLUE}     Platform: $OS${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo

echo -e "${YELLOW}This will:${NC}"
echo "  - Stop the voice server"
if [[ "$OS" == "Darwin" ]]; then
    echo "  - Remove the LaunchAgent (~/Library/LaunchAgents/com.pai.voice-server.plist)"
elif [[ "$OS" == "Linux" ]]; then
    echo "  - Disable and remove the systemd user service"
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

if [[ "$OS" == "Darwin" ]]; then
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
    LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"

    echo -e "${YELLOW}> Stopping voice server...${NC}"
    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_PATH" 2>/dev/null
        echo -e "${GREEN}OK Voice server stopped${NC}"
    else
        echo -e "${YELLOW}  Service was not running${NC}"
    fi

    echo -e "${YELLOW}> Removing LaunchAgent...${NC}"
    if [ -f "$PLIST_PATH" ]; then
        rm "$PLIST_PATH"
        echo -e "${GREEN}OK LaunchAgent removed${NC}"
    else
        echo -e "${YELLOW}  LaunchAgent file not found${NC}"
    fi

elif [[ "$OS" == "Linux" ]]; then
    SERVICE_NAME="pai-voice-server"
    SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"
    LOG_PATH="$HOME/.local/share/pai/voice-server.log"

    echo -e "${YELLOW}> Stopping voice server...${NC}"
    if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        systemctl --user stop "$SERVICE_NAME"
        echo -e "${GREEN}OK Voice server stopped${NC}"
    else
        echo -e "${YELLOW}  Service was not running${NC}"
    fi

    echo -e "${YELLOW}> Disabling and removing systemd service...${NC}"
    systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true
    if [ -f "$SERVICE_FILE" ]; then
        rm "$SERVICE_FILE"
        systemctl --user daemon-reload
        echo -e "${GREEN}OK systemd service removed${NC}"
    else
        echo -e "${YELLOW}  Service file not found${NC}"
    fi

else
    echo -e "${RED}X Unsupported operating system: $OS${NC}"
    exit 1
fi

# Clean up any remaining PAI voice server process on port 8888
_pai_pids_on_8888() {
    local pids=""
    if command -v lsof &>/dev/null; then
        pids=$(lsof -ti :8888 2>/dev/null)
    elif command -v ss &>/dev/null; then
        pids=$(ss -tlnp 2>/dev/null | grep ':8888' | grep -o 'pid=[0-9]*' | cut -d= -f2)
    fi
    local pai_pids=""
    for pid in $pids; do
        if [ -r "/proc/$pid/cmdline" ]; then
            if grep -qa 'bun\|server\.ts' "/proc/$pid/cmdline" 2>/dev/null; then
                pai_pids="$pai_pids $pid"
            fi
        elif ps -p "$pid" -o args= 2>/dev/null | grep -q 'bun\|server\.ts'; then
            pai_pids="$pai_pids $pid"
        fi
    done
    echo "$pai_pids"
}

REMAINING=$(_pai_pids_on_8888)
if [ -n "$REMAINING" ]; then
    echo -e "${YELLOW}> Cleaning up remaining PAI process on port 8888...${NC}"
    echo "$REMAINING" | xargs kill -TERM 2>/dev/null || true
    sleep 3
    STILL_ALIVE=$(_pai_pids_on_8888)
    if [ -n "$STILL_ALIVE" ]; then
        echo "$STILL_ALIVE" | xargs kill -KILL 2>/dev/null || true
    fi
    echo -e "${GREEN}OK Port 8888 cleared${NC}"
fi

# Offer to remove log file
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
