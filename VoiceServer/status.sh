#!/bin/bash

# Check status of Voice Server
# Supports macOS (LaunchAgent) and Linux (systemd user service)

OS=$(uname -s)
ENV_FILE="$HOME/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     PAI Voice Server Status${NC}"
echo -e "${BLUE}     Platform: $OS${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo

# ── Service status ───────────────────────────────────────────────────────────
echo -e "${BLUE}Service Status:${NC}"

if [[ "$OS" == "Darwin" ]]; then
    SERVICE_NAME="com.pai.voice-server"
    LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        PID=$(launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
        if [ "$PID" != "-" ]; then
            echo -e "  ${GREEN}OK LaunchAgent loaded (PID: $PID)${NC}"
        else
            echo -e "  ${YELLOW}! LaunchAgent loaded but not running${NC}"
        fi
    else
        echo -e "  ${RED}X LaunchAgent not loaded — run ./install.sh${NC}"
    fi

elif [[ "$OS" == "Linux" ]]; then
    SERVICE_NAME="pai-voice-server"
    LOG_PATH="$HOME/.local/share/pai/voice-server.log"

    if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
        PID=$(systemctl --user show -p MainPID --value "$SERVICE_NAME" 2>/dev/null)
        echo -e "  ${GREEN}OK systemd service active (PID: $PID)${NC}"
    elif systemctl --user is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
        echo -e "  ${YELLOW}! Service installed but not running — try: ./start.sh${NC}"
    else
        echo -e "  ${RED}X Service not installed — run ./install.sh${NC}"
    fi

else
    echo -e "  ${RED}X Unsupported operating system: $OS${NC}"
    exit 1
fi

# ── HTTP health check ────────────────────────────────────────────────────────
echo
echo -e "${BLUE}Server Status:${NC}"
HEALTH=$(curl -s http://localhost:8888/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
    echo -e "  ${GREEN}OK Responding on port 8888${NC}"
    echo "  Health: $HEALTH"
else
    echo -e "  ${RED}X Not responding on port 8888${NC}"
fi

# ── Port check ───────────────────────────────────────────────────────────────
echo
echo -e "${BLUE}Port Status:${NC}"
PORT_IN_USE=false
if command -v lsof &>/dev/null && lsof -i :8888 > /dev/null 2>&1; then
    PORT_IN_USE=true
    PROCESS=$(lsof -i :8888 | grep LISTEN | head -1)
    echo -e "  ${GREEN}OK Port 8888 is in use${NC}"
    echo "$PROCESS" | awk '{print "  Process: " $1 " (PID: " $2 ")"}'
elif command -v ss &>/dev/null && ss -tlnp 2>/dev/null | grep -q ':8888'; then
    PORT_IN_USE=true
    echo -e "  ${GREEN}OK Port 8888 is in use${NC}"
    ss -tlnp 2>/dev/null | grep ':8888'
fi
if [ "$PORT_IN_USE" = false ]; then
    echo -e "  ${YELLOW}! Port 8888 is not in use${NC}"
fi

# ── Voice configuration ──────────────────────────────────────────────────────
echo
echo -e "${BLUE}Voice Configuration:${NC}"
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2-)
    if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
        echo -e "  ${GREEN}OK ElevenLabs API configured${NC}"
    else
        echo -e "  ${YELLOW}! ElevenLabs API key placeholder — update ~/.env${NC}"
    fi
else
    echo -e "  ${YELLOW}! No ElevenLabs configuration found in ~/.env${NC}"
fi

# ── Recent logs ──────────────────────────────────────────────────────────────
echo
echo -e "${BLUE}Recent Logs:${NC}"
if [ -f "$LOG_PATH" ]; then
    echo "  Log file: $LOG_PATH"
    echo "  Last 5 lines:"
    tail -5 "$LOG_PATH" | while IFS= read -r line; do
        echo "    $line"
    done
elif [[ "$OS" == "Linux" ]]; then
    echo "  No log file yet — journalctl logs:"
    journalctl --user -u "$SERVICE_NAME" -n 5 --no-pager 2>/dev/null | while IFS= read -r line; do
        echo "    $line"
    done
else
    echo -e "  ${YELLOW}! No log file found${NC}"
fi

# ── Commands ─────────────────────────────────────────────────────────────────
echo
echo -e "${BLUE}Available Commands:${NC}"
echo "  - Start:     ./start.sh"
echo "  - Stop:      ./stop.sh"
echo "  - Restart:   ./restart.sh"
echo "  - Uninstall: ./uninstall.sh"
echo "  - Logs:      tail -f $LOG_PATH"
echo "  - Test:      curl -X POST http://localhost:8888/notify -H 'Content-Type: application/json' -d '{\"message\":\"Test\"}'"
