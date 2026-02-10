#!/bin/bash

# Voice Server Linux Installation Script
# Installs the voice server as a systemd user service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VOICE_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="pai-voice-server"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SERVICE_DIR/${SERVICE_NAME}.service"
ENV_FILE="$HOME/.claude/.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     Voice Server Linux Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check for Bun
echo -e "${YELLOW}▶ Checking prerequisites...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Bun is not installed${NC}"
    echo "  Install Bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}✓ Bun is installed${NC}"

# Check for audio player
if command -v mpv &> /dev/null; then
    echo -e "${GREEN}✓ mpv is installed (audio playback)${NC}"
elif command -v ffplay &> /dev/null; then
    echo -e "${GREEN}✓ ffplay is installed (audio playback)${NC}"
else
    echo -e "${RED}✗ No audio player found${NC}"
    echo "  Install one of:"
    echo "    sudo apt install mpv          # Recommended"
    echo "    sudo apt install ffmpeg        # Alternative (provides ffplay)"
    exit 1
fi

# Check for notify-send
if command -v notify-send &> /dev/null; then
    echo -e "${GREEN}✓ notify-send is installed (desktop notifications)${NC}"
else
    echo -e "${YELLOW}⚠ notify-send not found (optional, for desktop notifications)${NC}"
    echo "  Install with: sudo apt install libnotify-bin"
fi

# Check for ElevenLabs configuration
echo -e "${YELLOW}▶ Checking ElevenLabs configuration...${NC}"
ELEVENLABS_CONFIGURED=false
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2 | tr -d "'" | tr -d '"')
    if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
        echo -e "${GREEN}✓ ElevenLabs API key configured${NC}"
        ELEVENLABS_CONFIGURED=true
    fi
fi

if [ "$ELEVENLABS_CONFIGURED" = false ]; then
    echo -e "${YELLOW}⚠ ElevenLabs API key not configured${NC}"
    echo "  Add your key to ~/.claude/.env:"
    echo "  echo 'ELEVENLABS_API_KEY=your_key_here' >> ~/.claude/.env"
    echo "  Get a free key at: https://elevenlabs.io"
    echo
fi

# Check if already installed
if systemctl --user is-active "$SERVICE_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠ Voice server is already running${NC}"
    read -p "Do you want to reinstall? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}▶ Stopping existing service...${NC}"
        systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true
        systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true
        echo -e "${GREEN}✓ Existing service stopped${NC}"
    else
        echo "Installation cancelled"
        exit 0
    fi
fi

# Create systemd user service directory
echo -e "${YELLOW}▶ Creating systemd user service...${NC}"
mkdir -p "$SERVICE_DIR"

# Generate service file with resolved paths
BUN_PATH="$(which bun)"
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=PAI Voice Server - ElevenLabs TTS notification server
After=network.target sound.target

[Service]
Type=simple
ExecStart=${BUN_PATH} run ${VOICE_DIR}/server.ts
WorkingDirectory=${VOICE_DIR}
Restart=on-failure
RestartSec=5
Environment=HOME=${HOME}
Environment=PATH=${HOME}/.bun/bin:/usr/local/bin:/usr/bin:/bin
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}✓ Systemd service file created${NC}"

# Enable and start the service
echo -e "${YELLOW}▶ Starting voice server service...${NC}"
systemctl --user daemon-reload
systemctl --user enable "$SERVICE_NAME"
systemctl --user start "$SERVICE_NAME"

# Wait for server to start
sleep 2

# Test the server
echo -e "${YELLOW}▶ Testing voice server...${NC}"
if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Voice server is running${NC}"

    # Send test notification
    echo -e "${YELLOW}▶ Sending test notification...${NC}"
    curl -s -X POST http://localhost:8888/notify \
        -H "Content-Type: application/json" \
        -d '{"message": "Voice server installed successfully on Linux"}' > /dev/null
    echo -e "${GREEN}✓ Test notification sent${NC}"
else
    echo -e "${RED}✗ Voice server is not responding${NC}"
    echo "  Check logs: journalctl --user -u $SERVICE_NAME -f"
    echo "  Try running manually: bun run $VOICE_DIR/server.ts"
    exit 1
fi

# Enable lingering so service runs even when not logged in (optional)
if command -v loginctl &> /dev/null; then
    loginctl enable-linger "$(whoami)" 2>/dev/null || true
fi

# Summary
echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}Service Information:${NC}"
echo "  Service: $SERVICE_NAME"
echo "  Status:  Running"
echo "  Port:    8888"
echo "  Logs:    journalctl --user -u $SERVICE_NAME"

if [ "$ELEVENLABS_CONFIGURED" = true ]; then
    echo "  Voice:   ElevenLabs AI"
else
    echo "  Voice:   Not configured (add ELEVENLABS_API_KEY to ~/.claude/.env)"
fi

echo
echo -e "${BLUE}Management Commands:${NC}"
echo "  Status:    systemctl --user status $SERVICE_NAME"
echo "  Stop:      systemctl --user stop $SERVICE_NAME"
echo "  Start:     systemctl --user start $SERVICE_NAME"
echo "  Restart:   systemctl --user restart $SERVICE_NAME"
echo "  Logs:      journalctl --user -u $SERVICE_NAME -f"
echo "  Uninstall: $SCRIPT_DIR/uninstall.sh"
echo
echo -e "${BLUE}Test the server:${NC}"
echo "  curl -X POST http://localhost:8888/notify \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\": \"Hello from PAI\"}'"
echo
echo -e "${GREEN}The voice server will start automatically on login.${NC}"
