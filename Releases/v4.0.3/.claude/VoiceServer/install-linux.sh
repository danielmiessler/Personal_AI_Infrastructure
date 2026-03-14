#!/bin/bash

# Voice Server Linux Installation Script
# Installs Piper TTS and the voice server as a systemd user service

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="pai-voice-server"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"
PIPER_DIR="$HOME/.local/share/piper-tts"
VOICES_DIR="$PIPER_DIR/voices"
VENV_DIR="$PIPER_DIR/venv"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     PAI Voice Server — Linux Installation${NC}"
echo -e "${BLUE}     (Piper TTS — free, local, no API keys)${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo

# Check for Bun
echo -e "${YELLOW}> Checking prerequisites...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}X Bun is not installed${NC}"
    echo "  Install: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}OK Bun is installed${NC}"

# Check for Python3
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}X Python3 is not installed${NC}"
    echo "  Install: sudo apt install python3 python3-venv"
    exit 1
fi
echo -e "${GREEN}OK Python3 is installed${NC}"

# Check for audio player
if command -v aplay &> /dev/null; then
    echo -e "${GREEN}OK aplay found (ALSA)${NC}"
elif command -v paplay &> /dev/null; then
    echo -e "${GREEN}OK paplay found (PulseAudio)${NC}"
elif command -v ffplay &> /dev/null; then
    echo -e "${GREEN}OK ffplay found (FFmpeg)${NC}"
else
    echo -e "${RED}X No audio player found${NC}"
    echo "  Install one: sudo apt install alsa-utils"
    exit 1
fi

# Check for notify-send
if command -v notify-send &> /dev/null; then
    echo -e "${GREEN}OK notify-send found${NC}"
else
    echo -e "${YELLOW}! notify-send not found — desktop notifications will be skipped${NC}"
    echo "  Install: sudo apt install libnotify-bin"
fi

# Install Piper TTS
echo
echo -e "${YELLOW}> Setting up Piper TTS...${NC}"
mkdir -p "$VOICES_DIR"

if [ ! -f "$VENV_DIR/bin/piper" ]; then
    echo -e "${YELLOW}> Creating Python venv and installing piper-tts...${NC}"
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install --quiet piper-tts pathvalidate
    echo -e "${GREEN}OK Piper TTS installed${NC}"
else
    echo -e "${GREEN}OK Piper TTS already installed${NC}"
fi

# Download voice model if needed
MODEL_FILE="$VOICES_DIR/en_US-amy-medium.onnx"
if [ ! -f "$MODEL_FILE" ]; then
    echo -e "${YELLOW}> Downloading voice model (en_US-amy-medium, ~60MB)...${NC}"
    curl -L -o "$MODEL_FILE" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx?download=true"
    curl -L -o "${MODEL_FILE}.json" \
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json?download=true"
    echo -e "${GREEN}OK Voice model downloaded${NC}"
else
    echo -e "${GREEN}OK Voice model already present${NC}"
fi

# Test Piper
echo -e "${YELLOW}> Testing Piper TTS...${NC}"
echo "Test" | "$VENV_DIR/bin/piper" --model "$MODEL_FILE" --output_file /tmp/pai-voice-test.wav 2>/dev/null
if [ -f /tmp/pai-voice-test.wav ]; then
    echo -e "${GREEN}OK Piper generates audio${NC}"
    rm -f /tmp/pai-voice-test.wav
else
    echo -e "${RED}X Piper failed to generate audio${NC}"
    exit 1
fi

# Check for existing service
if systemctl --user is-active "$SERVICE_NAME" &>/dev/null; then
    echo -e "${YELLOW}! Voice server is already running${NC}"
    read -p "Do you want to reinstall? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}> Stopping existing service...${NC}"
        systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true
        systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true
        echo -e "${GREEN}OK Existing service stopped${NC}"
    else
        echo "Installation cancelled"
        exit 0
    fi
fi

# Create systemd user service
echo -e "${YELLOW}> Creating systemd user service...${NC}"
mkdir -p "$HOME/.config/systemd/user"

cat > "$SERVICE_FILE" << EOF
[Unit]
Description=PAI Voice Server (Piper TTS)
After=network.target sound.target

[Service]
Type=simple
ExecStart=$(which bun) run ${SCRIPT_DIR}/server-linux.ts
WorkingDirectory=${SCRIPT_DIR}
Restart=on-failure
RestartSec=5
Environment=HOME=${HOME}
Environment=PATH=/usr/local/bin:/usr/bin:/bin:${HOME}/.bun/bin
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}OK Systemd service created${NC}"

# Enable and start
echo -e "${YELLOW}> Starting voice server...${NC}"
systemctl --user daemon-reload
systemctl --user enable "$SERVICE_NAME"
systemctl --user start "$SERVICE_NAME"

# Wait and test
sleep 2

echo -e "${YELLOW}> Testing voice server...${NC}"
if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "${GREEN}OK Voice server is running${NC}"

    echo -e "${YELLOW}> Sending test notification...${NC}"
    curl -s -X POST http://localhost:8888/notify \
        -H "Content-Type: application/json" \
        -d '{"message": "Voice server installed successfully"}' > /dev/null
    echo -e "${GREEN}OK Test notification sent${NC}"
else
    echo -e "${RED}X Voice server is not responding${NC}"
    echo "  Check logs: journalctl --user -u $SERVICE_NAME -f"
    echo "  Try running manually: bun run $SCRIPT_DIR/server-linux.ts"
    exit 1
fi

# Summary
echo
echo -e "${GREEN}=====================================================${NC}"
echo -e "${GREEN}     Installation Complete!${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo
echo -e "${BLUE}Service Information:${NC}"
echo "  - Service: $SERVICE_NAME (systemd user service)"
echo "  - Status: Running"
echo "  - Port: 8888"
echo "  - TTS: Piper (local, free)"
echo "  - Model: en_US-amy-medium"
echo "  - Logs: journalctl --user -u $SERVICE_NAME"
echo
echo -e "${BLUE}Management Commands:${NC}"
echo "  - Status:    systemctl --user status $SERVICE_NAME"
echo "  - Stop:      systemctl --user stop $SERVICE_NAME"
echo "  - Start:     systemctl --user start $SERVICE_NAME"
echo "  - Restart:   systemctl --user restart $SERVICE_NAME"
echo "  - Logs:      journalctl --user -u $SERVICE_NAME -f"
echo "  - Disable:   systemctl --user disable $SERVICE_NAME"
echo
echo -e "${BLUE}Test the server:${NC}"
echo '  curl -X POST http://localhost:8888/notify \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"message": "Hello from PAI"}'"'"
echo
echo -e "${GREEN}The voice server will start automatically on login.${NC}"
echo -e "${GREEN}Cost: \$0.00/month${NC}"
