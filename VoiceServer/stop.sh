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

# Clean up any remaining PAI voice server process on port 8888
_pai_pids_on_8888() {
    local pids=""
    if command -v lsof &>/dev/null; then
        pids=$(lsof -ti :8888 2>/dev/null)
    elif command -v ss &>/dev/null; then
        pids=$(ss -tlnp 2>/dev/null | grep ':8888' | grep -o 'pid=[0-9]*' | cut -d= -f2)
    fi
    # Only return PIDs whose cmdline includes bun or server.ts (scoped to PAI)
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
    # Graceful shutdown: SIGTERM first, then SIGKILL if still alive after 3s
    echo "$REMAINING" | xargs kill -TERM 2>/dev/null || true
    sleep 3
    STILL_ALIVE=$(_pai_pids_on_8888)
    if [ -n "$STILL_ALIVE" ]; then
        echo "$STILL_ALIVE" | xargs kill -KILL 2>/dev/null || true
    fi
    echo -e "${GREEN}OK Port 8888 cleared${NC}"
fi
