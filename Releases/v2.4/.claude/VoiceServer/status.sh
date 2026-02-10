#!/bin/bash

# Check status of Voice Server (cross-platform: macOS + Linux)

ENV_FILE="$HOME/.claude/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     Voice Server Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Service status (platform-specific)
echo -e "${BLUE}Service Status:${NC}"
if [[ "$(uname)" == "Darwin" ]]; then
    SERVICE_NAME="com.pai.voice-server"
    LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        PID=$(launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
        if [ "$PID" != "-" ]; then
            echo -e "  ${GREEN}✓ Service is loaded (PID: $PID)${NC}"
        else
            echo -e "  ${YELLOW}⚠ Service is loaded but not running${NC}"
        fi
    else
        echo -e "  ${RED}✗ Service is not loaded${NC}"
    fi
else
    SERVICE_NAME="pai-voice-server"
    LOG_CMD="journalctl --user -u $SERVICE_NAME"

    if systemctl --user is-active "$SERVICE_NAME" &> /dev/null; then
        PID=$(systemctl --user show "$SERVICE_NAME" --property=MainPID --value 2>/dev/null)
        echo -e "  ${GREEN}✓ Service is active (PID: $PID)${NC}"
    elif systemctl --user is-enabled "$SERVICE_NAME" &> /dev/null; then
        echo -e "  ${YELLOW}⚠ Service is enabled but not running${NC}"
    else
        echo -e "  ${RED}✗ Service is not installed${NC}"
    fi
fi

# Check if server is responding
echo
echo -e "${BLUE}Server Status:${NC}"
if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Server is responding on port 8888${NC}"
    HEALTH=$(curl -s http://localhost:8888/health)
    echo "  Response: $HEALTH"
else
    echo -e "  ${RED}✗ Server is not responding${NC}"
fi

# Check port binding
echo
echo -e "${BLUE}Port Status:${NC}"
if command -v lsof &> /dev/null && lsof -i :8888 > /dev/null 2>&1; then
    PROCESS=$(lsof -i :8888 | grep LISTEN | head -1)
    echo -e "  ${GREEN}✓ Port 8888 is in use${NC}"
    echo "  $PROCESS" | awk '{print "  Process: " $1 " (PID: " $2 ")"}'
elif command -v ss &> /dev/null && ss -tlnp | grep -q ':8888' 2>/dev/null; then
    echo -e "  ${GREEN}✓ Port 8888 is in use${NC}"
    ss -tlnp | grep ':8888' | head -1 | awk '{print "  " $0}'
else
    echo -e "  ${YELLOW}⚠ Port 8888 is not in use${NC}"
fi

# Check ElevenLabs configuration
echo
echo -e "${BLUE}Voice Configuration:${NC}"
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2 | tr -d "'" | tr -d '"')
    if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
        echo -e "  ${GREEN}✓ ElevenLabs API configured${NC}"
        if grep -q "ELEVENLABS_VOICE_ID=" "$ENV_FILE"; then
            VOICE_ID=$(grep "ELEVENLABS_VOICE_ID=" "$ENV_FILE" | cut -d'=' -f2 | tr -d "'" | tr -d '"')
            echo "  Voice ID: $VOICE_ID"
        fi
    else
        echo -e "  ${YELLOW}⚠ API key not configured${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ No ElevenLabs configuration found${NC}"
fi

# Audio player status (Linux only)
if [[ "$(uname)" != "Darwin" ]]; then
    echo
    echo -e "${BLUE}Audio Player:${NC}"
    if command -v mpv &> /dev/null; then
        echo -e "  ${GREEN}✓ mpv installed${NC}"
    elif command -v ffplay &> /dev/null; then
        echo -e "  ${GREEN}✓ ffplay installed${NC}"
    else
        echo -e "  ${RED}✗ No audio player found (install mpv or ffmpeg)${NC}"
    fi
    if command -v notify-send &> /dev/null; then
        echo -e "  ${GREEN}✓ notify-send installed${NC}"
    else
        echo -e "  ${YELLOW}⚠ notify-send not found (install libnotify-bin)${NC}"
    fi
fi

# Recent logs
echo
echo -e "${BLUE}Recent Logs:${NC}"
if [[ "$(uname)" == "Darwin" ]]; then
    LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"
    if [ -f "$LOG_PATH" ]; then
        echo "  Log file: $LOG_PATH"
        echo "  Last 5 lines:"
        tail -5 "$LOG_PATH" | while IFS= read -r line; do
            echo "    $line"
        done
    else
        echo -e "  ${YELLOW}⚠ No log file found${NC}"
    fi
else
    echo "  Logs: journalctl --user -u pai-voice-server"
    echo "  Last 5 lines:"
    journalctl --user -u pai-voice-server --no-pager -n 5 2>/dev/null | while IFS= read -r line; do
        echo "    $line"
    done
fi

# Show commands
echo
echo -e "${BLUE}Available Commands:${NC}"
echo "  Start:     ./start.sh"
echo "  Stop:      ./stop.sh"
echo "  Restart:   ./restart.sh"
if [[ "$(uname)" == "Darwin" ]]; then
    echo "  Logs:      tail -f ~/Library/Logs/pai-voice-server.log"
else
    echo "  Logs:      journalctl --user -u pai-voice-server -f"
fi
echo "  Test:      curl -X POST http://localhost:8888/notify -H 'Content-Type: application/json' -d '{\"message\":\"Test\"}'"
