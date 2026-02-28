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

if [[ "$OS" == "Darwin" ]] || [[ "$OS" == "Linux" ]]; then
    if [[ "$OS" == "Linux" ]]; then
        # systemd can restart in one step
        SERVICE_NAME="pai-voice-server"
        if systemctl --user is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
            systemctl --user restart "$SERVICE_NAME"
            sleep 2
            if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
                echo -e "${GREEN}OK Voice server restarted${NC}"
            else
                echo -e "${YELLOW}! Restarted but not responding yet — check: journalctl --user -u $SERVICE_NAME${NC}"
            fi
            exit 0
        fi
    fi

    # macOS or Linux without an installed service: stop then start
    "$SCRIPT_DIR/stop.sh"
    sleep 1
    "$SCRIPT_DIR/start.sh"
    echo -e "${GREEN}OK Voice server restarted${NC}"
else
    echo -e "${RED}X Unsupported operating system: $OS${NC}"
    exit 1
fi
