#!/bin/bash

# Restart the Voice Server
# Supports macOS (LaunchAgent) and Linux (systemd user service)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OS=$(uname -s)

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}> Restarting Voice Server...${NC}"

if [[ "$OS" == "Darwin" ]]; then
    # macOS: stop then start (launchctl has no single restart command)
    "$SCRIPT_DIR/stop.sh"
    sleep 1
    "$SCRIPT_DIR/start.sh"
    echo -e "${GREEN}OK Voice server restarted${NC}"

elif [[ "$OS" == "Linux" ]]; then
    SERVICE_NAME="pai-voice-server"
    if systemctl --user is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        # systemd: single atomic restart
        systemctl --user restart "$SERVICE_NAME"
        sleep 2
        HEALTH=$(curl -s http://localhost:8888/health 2>/dev/null)
        if [ -n "$HEALTH" ]; then
            echo -e "${GREEN}OK Voice server restarted${NC}"
        else
            echo -e "${YELLOW}! Restarted but not responding yet — check: journalctl --user -u $SERVICE_NAME${NC}"
        fi
    else
        # Service not installed, fall back to stop/start
        "$SCRIPT_DIR/stop.sh"
        sleep 1
        "$SCRIPT_DIR/start.sh"
        echo -e "${GREEN}OK Voice server restarted${NC}"
    fi

else
    echo -e "${RED}X Unsupported operating system: $OS${NC}"
    exit 1
fi
