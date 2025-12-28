#!/bin/bash

# PAI Voice Server - Comprehensive System Test (Cross-platform)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect platform
OS="$(uname -s)"
case "${OS}" in
    Darwin*)    PLATFORM="macos";;
    Linux*)     PLATFORM="linux";;
    *)          echo -e "${RED}✗ Unsupported operating system${NC}"; exit 1;;
esac

ISSUES=0
WARNINGS=0

# Get port from settings.json first, then .env
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SETTINGS_FILE="$PAI_DIR/settings.json"
ENV_FILE="$PAI_DIR/.env"
PORT=8888  # Default

# Try settings.json first
if [ -f "$SETTINGS_FILE" ]; then
    # Extract VOICE_SERVER_PORT from settings.json
    PORT_FROM_SETTINGS=$(grep -o '"VOICE_SERVER_PORT"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ -n "$PORT_FROM_SETTINGS" ]; then
        PORT=$PORT_FROM_SETTINGS
    fi
fi

# Fall back to .env if not in settings.json
if [ "$PORT" = "8888" ] && [ -f "$ENV_FILE" ] && grep -q "^PORT=" "$ENV_FILE"; then
    PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server - System Test (${PLATFORM})${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Test 1: Bun runtime
echo -e "${YELLOW}▶ Test 1: Bun runtime${NC}"
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo -e "  ${GREEN}✓ Bun installed: v$BUN_VERSION${NC}"
else
    echo -e "  ${RED}✗ Bun not found${NC}"
    echo "    Install: curl -fsSL https://bun.sh/install | bash"
    ((ISSUES++))
fi

# Test 2: Platform-specific dependencies
echo
echo -e "${YELLOW}▶ Test 2: Platform-specific dependencies${NC}"

if [ "$PLATFORM" = "macos" ]; then
    # macOS: Check afplay and osascript
    if command -v afplay &> /dev/null; then
        echo -e "  ${GREEN}✓ afplay (audio playback)${NC}"
    else
        echo -e "  ${RED}✗ afplay not found${NC}"
        ((ISSUES++))
    fi

    if command -v osascript &> /dev/null; then
        echo -e "  ${GREEN}✓ osascript (notifications)${NC}"
    else
        echo -e "  ${RED}✗ osascript not found${NC}"
        ((ISSUES++))
    fi

    if command -v say &> /dev/null; then
        echo -e "  ${GREEN}✓ say (TTS fallback)${NC}"
    else
        echo -e "  ${RED}✗ say not found${NC}"
        ((ISSUES++))
    fi
else
    # Linux: Check audio players
    AUDIO_FOUND=false
    for player in mpg123 mplayer ffplay paplay aplay; do
        if command -v $player &> /dev/null; then
            echo -e "  ${GREEN}✓ $player (audio playback)${NC}"
            AUDIO_FOUND=true
        fi
    done

    if [ "$AUDIO_FOUND" = false ]; then
        echo -e "  ${YELLOW}⚠ No audio player found${NC}"
        echo "    Install: sudo apt install mpg123"
        ((WARNINGS++))
    fi

    # Linux: Check TTS engines
    TTS_FOUND=false
    for tts in espeak espeak-ng spd-say festival; do
        if command -v $tts &> /dev/null; then
            echo -e "  ${GREEN}✓ $tts (TTS)${NC}"
            TTS_FOUND=true
        fi
    done

    if [ "$TTS_FOUND" = false ]; then
        echo -e "  ${YELLOW}⚠ No TTS engine found${NC}"
        echo "    Install: sudo apt install espeak-ng"
        ((WARNINGS++))
    fi

    # Linux: Check notification tools
    if command -v notify-send &> /dev/null; then
        echo -e "  ${GREEN}✓ notify-send (notifications)${NC}"
    elif command -v zenity &> /dev/null; then
        echo -e "  ${GREEN}✓ zenity (notifications)${NC}"
    else
        echo -e "  ${YELLOW}⚠ No notification tool found${NC}"
        echo "    Install: sudo apt install libnotify-bin"
        ((WARNINGS++))
    fi
fi

# Test 3: ElevenLabs configuration
echo
echo -e "${YELLOW}▶ Test 3: ElevenLabs configuration${NC}"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
ENV_FILE="$PAI_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    if grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
        API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        if [ -n "$API_KEY" ] && [ "$API_KEY" != "your_api_key_here" ]; then
            echo -e "  ${GREEN}✓ ElevenLabs API key configured${NC}"
        else
            echo -e "  ${YELLOW}⚠ ElevenLabs API key placeholder${NC}"
            echo "    Add your key: echo 'ELEVENLABS_API_KEY=your_key' >> $ENV_FILE"
            ((WARNINGS++))
        fi
    else
        echo -e "  ${YELLOW}⚠ ElevenLabs API key not found${NC}"
        echo "    Add your key: echo 'ELEVENLABS_API_KEY=your_key' >> $ENV_FILE"
        ((WARNINGS++))
    fi
else
    echo -e "  ${YELLOW}⚠ No .env file found${NC}"
    echo "    Create: mkdir -p $(dirname $ENV_FILE) && echo 'ELEVENLABS_API_KEY=your_key' > $ENV_FILE"
    ((WARNINGS++))
fi

# Test 4: Service installation
echo
echo -e "${YELLOW}▶ Test 4: Service installation${NC}"
if [ "$PLATFORM" = "macos" ]; then
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"

    if [ -f "$PLIST_PATH" ]; then
        echo -e "  ${GREEN}✓ LaunchAgent installed${NC}"

        if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
            echo -e "  ${GREEN}✓ Service running${NC}"
        else
            echo -e "  ${YELLOW}⚠ Service not running${NC}"
            echo "    Start: ./start.sh"
            ((WARNINGS++))
        fi
    else
        echo -e "  ${YELLOW}⚠ Service not installed${NC}"
        echo "    Install: ./install.sh"
        ((WARNINGS++))
    fi
else
    SERVICE_NAME="pai-voice-server"

    if systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null; then
        echo -e "  ${GREEN}✓ systemd service installed${NC}"

        if systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
            echo -e "  ${GREEN}✓ Service running${NC}"
        else
            echo -e "  ${YELLOW}⚠ Service not running${NC}"
            echo "    Start: systemctl --user start $SERVICE_NAME"
            ((WARNINGS++))
        fi
    else
        echo -e "  ${YELLOW}⚠ Service not installed${NC}"
        echo "    Install: ./install.sh"
        ((WARNINGS++))
    fi
fi

# Test 5: HTTP server
echo
echo -e "${YELLOW}▶ Test 5: HTTP server${NC}"
if curl -s -f -X GET http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Server responding on port $PORT${NC}"

    HEALTH=$(curl -s -X GET http://localhost:$PORT/health 2>/dev/null)
    echo "  Response: $HEALTH"
else
    echo -e "  ${RED}✗ Server not responding on port $PORT${NC}"
    echo "    Check: ./status.sh"
    ((ISSUES++))
fi

# Test 6: Port availability
echo
echo -e "${YELLOW}▶ Test 6: Port status${NC}"
if lsof -Pi :$PORT -sTCP:LISTEN -t &>/dev/null 2>&1 || ss -tln 2>/dev/null | grep -q :$PORT; then
    PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null || ss -tlnp 2>/dev/null | grep :$PORT | grep -oP 'pid=\K\d+' | head -1)
    if [ -n "$PID" ]; then
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        if [[ "$PROCESS" == *"bun"* ]]; then
            echo -e "  ${GREEN}✓ Port $PORT in use by voice server (PID: $PID)${NC}"
        else
            echo -e "  ${YELLOW}⚠ Port $PORT in use by $PROCESS (PID: $PID)${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "  ${GREEN}✓ Port $PORT in use${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ Port $PORT not in use (server not running?)${NC}"
    ((WARNINGS++))
fi

# Test 7: Live notification tests (optional)
echo
echo -e "${YELLOW}▶ Test 7: Live notification tests${NC}"

# Check if ElevenLabs is configured
ELEVENLABS_CONFIGURED=false
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    if [ -n "$API_KEY" ] && [ "$API_KEY" != "your_api_key_here" ]; then
        ELEVENLABS_CONFIGURED=true
    fi
fi

if [ "$ELEVENLABS_CONFIGURED" = true ]; then
    echo -e "  ${BLUE}ElevenLabs API key detected - can test both ElevenLabs and system TTS${NC}"
else
    echo -e "  ${BLUE}No ElevenLabs API key - will test system TTS only${NC}"
fi
echo -e "  ${BLUE}Note: Each test sends a visual notification + audio${NC}"
echo

read -p "Test default notification (ElevenLabs or system TTS)? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "  ${YELLOW}Testing default voice notification...${NC}"
    if curl -s -f -X POST http://localhost:$PORT/notify \
        -H "Content-Type: application/json" \
        -d '{"message": "Testing default voice notification"}' > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Notification sent${NC}"
        if [ "$ELEVENLABS_CONFIGURED" = true ]; then
            echo "  Audio: ElevenLabs API (or system TTS if API failed)"
        else
            echo "  Audio: System TTS"
        fi
        echo "  Did you hear/see it?"
    else
        echo -e "  ${RED}✗ Failed to send notification${NC}"
        ((ISSUES++))
    fi
fi

# Test system TTS fallback (only if ElevenLabs configured)
if [ "$ELEVENLABS_CONFIGURED" = true ]; then
    echo
    read -p "Test system TTS fallback (forces system voice)? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "  ${YELLOW}Testing system TTS fallback...${NC}"
        echo -e "  ${BLUE}(Using invalid voice_id to force fallback)${NC}"
        if curl -s -f -X POST http://localhost:$PORT/notify \
            -H "Content-Type: application/json" \
            -d '{"message": "Testing system TTS fallback", "voice_id": "invalid_force_fallback"}' > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ Notification sent${NC}"
            echo "  Audio: System TTS (fallback from ElevenLabs)"
            echo "  Did you hear a different (system) voice?"
        else
            echo -e "  ${RED}✗ Failed to send notification${NC}"
            ((ISSUES++))
        fi
    fi
fi

# Test silent notification
echo
read -p "Test silent notification (visual only, no audio)? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "  ${YELLOW}Testing silent notification...${NC}"
    if curl -s -f -X POST http://localhost:$PORT/notify \
        -H "Content-Type: application/json" \
        -d '{"message": "Testing silent notification", "voice_enabled": false}' > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Notification sent${NC}"
        echo "  Audio: None (voice disabled)"
        echo "  Did you see it WITHOUT hearing it?"
    else
        echo -e "  ${RED}✗ Failed to send notification${NC}"
        ((ISSUES++))
    fi
fi

# Summary
echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}     ✓ All tests passed!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${GREEN}Your PAI Voice Server is fully functional.${NC}"
    exit 0
elif [ $ISSUES -eq 0 ]; then
    echo -e "${YELLOW}     ⚠ Tests passed with $WARNINGS warning(s)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${YELLOW}System is functional but has optional features missing.${NC}"
    exit 0
else
    echo -e "${RED}     ✗ Tests failed: $ISSUES issue(s), $WARNINGS warning(s)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${RED}Please address the issues above.${NC}"
    exit 1
fi
