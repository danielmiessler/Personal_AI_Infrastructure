#!/bin/bash

# PAI Voice Server Linux Setup Validation Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server - Linux Setup Validation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

ISSUES=0

# Get port from settings.json first, then .env
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SETTINGS_FILE="$PAI_DIR/settings.json"
ENV_FILE="$PAI_DIR/.env"
PORT=8888  # Default

# Try settings.json first
if [ -f "$SETTINGS_FILE" ]; then
    PORT_FROM_SETTINGS=$(grep -o '"VOICE_SERVER_PORT"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ -n "$PORT_FROM_SETTINGS" ]; then
        PORT=$PORT_FROM_SETTINGS
    fi
fi

# Fall back to .env if not in settings.json
if [ "$PORT" = "8888" ] && [ -f "$ENV_FILE" ] && grep -q "^PORT=" "$ENV_FILE"; then
    PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
fi

# Check Bun
echo -e "${YELLOW}▶ Checking Bun runtime...${NC}"
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo -e "  ${GREEN}✓ Bun installed: v$BUN_VERSION${NC}"
else
    echo -e "  ${RED}✗ Bun not found${NC}"
    echo "    Install: curl -fsSL https://bun.sh/install | bash"
    ((ISSUES++))
fi

# Check audio players
echo
echo -e "${YELLOW}▶ Checking audio players...${NC}"
AUDIO_FOUND=false
for player in mpg123 mplayer ffplay paplay aplay; do
    if command -v $player &> /dev/null; then
        echo -e "  ${GREEN}✓ $player installed${NC}"
        AUDIO_FOUND=true
    fi
done

if [ "$AUDIO_FOUND" = false ]; then
    echo -e "  ${RED}✗ No audio player found${NC}"
    echo "    Install: sudo apt install mpg123"
    ((ISSUES++))
fi

# Check TTS engines
echo
echo -e "${YELLOW}▶ Checking TTS engines...${NC}"
TTS_FOUND=false
if command -v espeak &> /dev/null || command -v espeak-ng &> /dev/null; then
    echo -e "  ${GREEN}✓ espeak installed${NC}"
    TTS_FOUND=true
fi
if command -v spd-say &> /dev/null; then
    echo -e "  ${GREEN}✓ spd-say (speech-dispatcher) installed${NC}"
    TTS_FOUND=true
fi
if command -v festival &> /dev/null; then
    echo -e "  ${GREEN}✓ festival installed${NC}"
    TTS_FOUND=true
fi

if [ "$TTS_FOUND" = false ]; then
    echo -e "  ${YELLOW}⚠ No TTS engine found${NC}"
    echo "    Install: sudo apt install espeak-ng"
    echo "    Note: Voice will work with ElevenLabs API key"
fi

# Check notification tools
echo
echo -e "${YELLOW}▶ Checking notification tools...${NC}"
NOTIFY_FOUND=false
if command -v notify-send &> /dev/null; then
    echo -e "  ${GREEN}✓ notify-send installed${NC}"
    NOTIFY_FOUND=true
fi
if command -v zenity &> /dev/null; then
    echo -e "  ${GREEN}✓ zenity installed${NC}"
    NOTIFY_FOUND=true
fi

if [ "$NOTIFY_FOUND" = false ]; then
    echo -e "  ${YELLOW}⚠ No notification tool found${NC}"
    echo "    Install: sudo apt install libnotify-bin"
    echo "    Note: Notifications will fall back to console output"
fi

# Check systemd user service
echo
echo -e "${YELLOW}▶ Checking systemd user service...${NC}"
SERVICE_NAME="pai-voice-server"
if systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null; then
    if systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
        echo -e "  ${GREEN}✓ Service installed and running${NC}"
    else
        echo -e "  ${YELLOW}⚠ Service installed but not running${NC}"
        echo "    Start: systemctl --user start $SERVICE_NAME"
        ((ISSUES++))
    fi
else
    echo -e "  ${RED}✗ Service not installed${NC}"
    echo "    Install: ~/.claude/voice-server/linux-service/install.sh"
    ((ISSUES++))
fi

# Check port availability
echo
echo -e "${YELLOW}▶ Checking port $PORT...${NC}"
if lsof -Pi :$PORT -sTCP:LISTEN -t &>/dev/null; then
    PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
    PROCESS=$(ps -p $PID -o comm=)
    if [[ "$PROCESS" == *"bun"* ]]; then
        echo -e "  ${GREEN}✓ Port $PORT in use by voice server (PID: $PID)${NC}"
    else
        echo -e "  ${YELLOW}⚠ Port $PORT in use by $PROCESS (PID: $PID)${NC}"
        ((ISSUES++))
    fi
else
    echo -e "  ${YELLOW}⚠ Port $PORT not in use (server not running?)${NC}"
fi

# Test server health
echo
echo -e "${YELLOW}▶ Testing server health endpoint...${NC}"
if curl -s -f -X GET http://localhost:$PORT/health > /dev/null 2>&1; then
    HEALTH=$(curl -s -X GET http://localhost:$PORT/health)
    echo -e "  ${GREEN}✓ Server responding${NC}"
    echo "  Response: $HEALTH"
else
    echo -e "  ${RED}✗ Server not responding${NC}"
    echo "    Check logs: journalctl --user -u $SERVICE_NAME -n 20"
    ((ISSUES++))
fi

# Check ElevenLabs configuration
echo
echo -e "${YELLOW}▶ Checking ElevenLabs configuration...${NC}"
if [ -f "$ENV_FILE" ]; then
    if grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
        API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        if [ -n "$API_KEY" ] && [ "$API_KEY" != "your_api_key_here" ]; then
            echo -e "  ${GREEN}✓ ElevenLabs API key configured${NC}"
        else
            echo -e "  ${YELLOW}⚠ ElevenLabs API key placeholder${NC}"
            echo "    Add your key: echo 'ELEVENLABS_API_KEY=your_key' >> $ENV_FILE"
        fi
    else
        echo -e "  ${YELLOW}⚠ ElevenLabs API key not found${NC}"
        echo "    Add your key: echo 'ELEVENLABS_API_KEY=your_key' >> $ENV_FILE"
    fi
else
    echo -e "  ${YELLOW}⚠ No .env file found${NC}"
    echo "    Create: echo 'ELEVENLABS_API_KEY=your_key' > $ENV_FILE"
fi

# Summary
echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}     ✓ All checks passed!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${GREEN}Your PAI Voice Server is properly configured.${NC}"
else
    echo -e "${YELLOW}     ⚠ $ISSUES issue(s) found${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${YELLOW}Please address the issues above.${NC}"
fi

echo
echo -e "${BLUE}Quick test:${NC}"
echo "  curl -X POST http://localhost:$PORT/notify \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\": \"Test notification\"}'"
