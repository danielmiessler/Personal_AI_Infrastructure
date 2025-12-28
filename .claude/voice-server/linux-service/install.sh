#!/bin/bash

# PAI Voice Server Linux Installation Script
# Installs as a systemd user service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
VOICE_SERVER_DIR="$(dirname "$SCRIPT_DIR")"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SERVICE_NAME="pai-voice-server"
SERVICE_FILE="$HOME/.config/systemd/user/${SERVICE_NAME}.service"
LOG_DIR="$HOME/.local/share"
LOG_FILE="$LOG_DIR/pai-voice-server.log"
ENV_FILE="$PAI_DIR/.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server - Linux Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check for Bun
echo -e "${YELLOW}▶ Checking prerequisites...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Bun is not installed${NC}"
    echo "  Please install Bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo -e "${GREEN}✓ Bun is installed: $(which bun)${NC}"

# Check for existing installation first
if systemctl --user is-enabled "$SERVICE_NAME" &>/dev/null; then
    echo
    echo -e "${YELLOW}⚠ Voice server is already installed${NC}"
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

# Port selection and validation
echo
echo -e "${YELLOW}▶ Configuring server port...${NC}"

# Check settings.json first, then .env
SETTINGS_FILE="$PAI_DIR/settings.json"
EXISTING_PORT=""

if [ -f "$SETTINGS_FILE" ]; then
    EXISTING_PORT=$(grep -o '"VOICE_SERVER_PORT"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ -n "$EXISTING_PORT" ]; then
        echo -e "${BLUE}Current port in settings.json: $EXISTING_PORT${NC}"
    fi
fi

if [ -z "$EXISTING_PORT" ] && [ -f "$ENV_FILE" ] && grep -q "^PORT=" "$ENV_FILE"; then
    EXISTING_PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
    echo -e "${BLUE}Current port in .env: $EXISTING_PORT${NC}"
fi

PORT_SELECTED=false
while [ "$PORT_SELECTED" = false ]; do
    read -p "Enter port for voice server (default: 8888): " USER_PORT
    PORT="${USER_PORT:-8888}"

    # Validate port is a number
    if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        echo -e "${RED}✗ Invalid port. Must be a number between 1-65535${NC}"
        continue
    fi

    # Check if port is in use
    if lsof -Pi :$PORT -sTCP:LISTEN -t &>/dev/null 2>&1 || ss -tln 2>/dev/null | grep -q ":$PORT "; then
        PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null || ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K\d+' | head -1)
        if [ -n "$PID" ]; then
            PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
            CMDLINE=$(ps -p $PID -o args= 2>/dev/null || echo "")
            echo -e "${YELLOW}⚠ Port $PORT is currently in use${NC}"
            echo "  Process: $PROCESS (PID: $PID)"
            echo "  Command: $CMDLINE"
        else
            echo -e "${YELLOW}⚠ Port $PORT is currently in use${NC}"
        fi

        echo
        read -p "Continue with port $PORT anyway? (y/n/retry): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}⚠ Proceeding with port $PORT (currently in use)${NC}"
            PORT_SELECTED=true
        elif [[ $REPLY =~ ^[Rr]$ ]]; then
            continue
        else
            continue
        fi
    else
        echo -e "${GREEN}✓ Port $PORT is available${NC}"
        PORT_SELECTED=true
    fi
done

# Save port to settings.json (primary) and .env (fallback)
if [ -f "$SETTINGS_FILE" ]; then
    # Update settings.json using sed (works without jq)
    if grep -q '"VOICE_SERVER_PORT"' "$SETTINGS_FILE"; then
        # Update existing entry
        sed -i "s/\"VOICE_SERVER_PORT\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"VOICE_SERVER_PORT\": \"$PORT\"/" "$SETTINGS_FILE"
        echo -e "${GREEN}✓ Updated VOICE_SERVER_PORT in settings.json${NC}"
    else
        # Add new entry to env object
        sed -i "s/\"DA_VOICE_ID\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/&,\n    \"VOICE_SERVER_PORT\": \"$PORT\"/" "$SETTINGS_FILE"
        echo -e "${GREEN}✓ Added VOICE_SERVER_PORT to settings.json${NC}"
    fi
else
    echo -e "${YELLOW}⚠ settings.json not found, falling back to .env${NC}"
fi

# Also save to .env as fallback
mkdir -p "$(dirname $ENV_FILE)"
if grep -q "^PORT=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s/^PORT=.*/PORT=$PORT/" "$ENV_FILE"
    echo -e "${GREEN}✓ Updated PORT in .env (fallback)${NC}"
else
    echo "PORT=$PORT" >> "$ENV_FILE"
    echo -e "${GREEN}✓ Saved PORT to .env (fallback)${NC}"
fi

# Check for ElevenLabs configuration
echo -e "${YELLOW}▶ Checking ElevenLabs configuration...${NC}"
if [ -f "$ENV_FILE" ] && grep -q "ELEVENLABS_API_KEY=" "$ENV_FILE"; then
    API_KEY=$(grep "ELEVENLABS_API_KEY=" "$ENV_FILE" | cut -d'=' -f2)
    if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
        echo -e "${GREEN}✓ ElevenLabs API key configured${NC}"
        ELEVENLABS_CONFIGURED=true
    else
        echo -e "${YELLOW}⚠ ElevenLabs API key not configured${NC}"
        echo "  Voice server will use system TTS as fallback"
        ELEVENLABS_CONFIGURED=false
    fi
else
    echo -e "${YELLOW}⚠ No ElevenLabs configuration found${NC}"
    echo "  Voice server will use system TTS as fallback"
    ELEVENLABS_CONFIGURED=false
fi

if [ "$ELEVENLABS_CONFIGURED" = false ]; then
    echo
    echo "To enable AI voices, add your ElevenLabs API key to $ENV_FILE:"
    echo "  mkdir -p $(dirname $ENV_FILE)"
    echo "  echo 'ELEVENLABS_API_KEY=your_api_key_here' >> $ENV_FILE"
    echo "  Get a free key at: https://elevenlabs.io"
    echo
fi

# Check for Linux dependencies
echo -e "${YELLOW}▶ Checking Linux dependencies...${NC}"
MISSING_DEPS=()

# Check audio players
if ! command -v mpg123 &>/dev/null && ! command -v mplayer &>/dev/null && ! command -v paplay &>/dev/null; then
    MISSING_DEPS+=("Audio player (mpg123, mplayer, or pulseaudio-utils)")
fi

# Check TTS engines
if ! command -v espeak &>/dev/null && ! command -v spd-say &>/dev/null; then
    MISSING_DEPS+=("TTS engine (espeak-ng or speech-dispatcher)")
fi

# Check notification tool
if ! command -v notify-send &>/dev/null; then
    MISSING_DEPS+=("Notification tool (libnotify-bin)")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Missing dependencies:${NC}"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  • $dep"
    done
    echo
    read -p "Would you like to install dependencies now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "$SCRIPT_DIR/setup-deps.sh" ]; then
            chmod +x "$SCRIPT_DIR/setup-deps.sh"
            "$SCRIPT_DIR/setup-deps.sh"
        else
            echo -e "${RED}✗ setup-deps.sh not found${NC}"
            echo "Install manually or run: sudo apt install mpg123 espeak-ng libnotify-bin"
        fi
    else
        echo -e "${YELLOW}⚠ Continuing without dependencies. Voice features may not work.${NC}"
    fi
else
    echo -e "${GREEN}✓ All dependencies installed${NC}"
fi

# Create systemd user service directory
echo -e "${YELLOW}▶ Creating systemd user service...${NC}"
mkdir -p "$HOME/.config/systemd/user"
mkdir -p "$LOG_DIR"

# Create service file
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=PAI Voice Server (User Service)
After=graphical-session.target

[Service]
Type=simple
WorkingDirectory=$VOICE_SERVER_DIR
ExecStart=$(which bun) run $VOICE_SERVER_DIR/server.ts
Restart=always
RestartSec=10
StandardOutput=append:$LOG_FILE
StandardError=append:$LOG_FILE

# Environment variables
Environment=PAI_DIR=$PAI_DIR
Environment=HOME=$HOME
Environment=PORT=$PORT

[Install]
WantedBy=default.target
EOF

echo -e "${GREEN}✓ Service file created${NC}"

# Reload systemd and enable service
echo -e "${YELLOW}▶ Enabling and starting service...${NC}"
systemctl --user daemon-reload

if ! systemctl --user enable "$SERVICE_NAME"; then
    echo -e "${RED}✗ Failed to enable service${NC}"
    echo "  Try manually: systemctl --user enable $SERVICE_NAME"
    exit 1
fi

if ! systemctl --user start "$SERVICE_NAME"; then
    echo -e "${RED}✗ Failed to start service${NC}"
    echo "  Check logs: journalctl --user -u $SERVICE_NAME -n 50"
    echo "  Or: cat $LOG_FILE"
    exit 1
fi

# Wait for server to start
sleep 2

# Test the server
echo -e "${YELLOW}▶ Testing voice server...${NC}"
if curl -s -f -X GET http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Voice server is running on port $PORT${NC}"

    # Send test notification
    echo -e "${YELLOW}▶ Sending test notification...${NC}"
    curl -s -X POST http://localhost:$PORT/notify \
        -H "Content-Type: application/json" \
        -d '{"message": "Voice server installed successfully"}' > /dev/null 2>&1
    echo -e "${GREEN}✓ Test notification sent${NC}"
else
    echo -e "${RED}✗ Voice server is not responding on port $PORT${NC}"
    echo "  Check logs: journalctl --user -u $SERVICE_NAME -n 50"
    echo "  Or: cat $LOG_FILE"
    exit 1
fi

# Enable lingering (service runs even when not logged in)
echo -e "${YELLOW}▶ Enabling user lingering...${NC}"
if loginctl enable-linger "$USER" 2>/dev/null; then
    echo -e "${GREEN}✓ Lingering enabled (service will run at boot)${NC}"
else
    echo -e "${YELLOW}⚠ Could not enable lingering (service runs only when logged in)${NC}"
fi

# Show summary
echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Installation Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}Service Information:${NC}"
echo "  • Service: $SERVICE_NAME (user service)"
echo "  • Status: Running"
echo "  • Port: $PORT"
echo "  • Logs: $LOG_FILE"

if [ "$ELEVENLABS_CONFIGURED" = true ]; then
    echo "  • Voice: ElevenLabs AI"
else
    echo "  • Voice: System TTS (fallback)"
fi

echo
echo -e "${BLUE}Management Commands:${NC}"
echo "  • Status:   systemctl --user status $SERVICE_NAME"
echo "  • Stop:     systemctl --user stop $SERVICE_NAME"
echo "  • Start:    systemctl --user start $SERVICE_NAME"
echo "  • Restart:  systemctl --user restart $SERVICE_NAME"
echo "  • Logs:     journalctl --user -u $SERVICE_NAME -f"
echo "  • Uninstall: $SCRIPT_DIR/uninstall.sh"

echo
echo -e "${BLUE}Or use the convenience scripts:${NC}"
echo "  • Status:   $VOICE_SERVER_DIR/status.sh"
echo "  • Stop:     $VOICE_SERVER_DIR/stop.sh"
echo "  • Start:    $VOICE_SERVER_DIR/start.sh"
echo "  • Restart:  $VOICE_SERVER_DIR/restart.sh"

echo
echo -e "${BLUE}Test the server:${NC}"
echo "  curl -X POST http://localhost:$PORT/notify \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"message\": \"Hello from PAI\"}'"

echo
echo -e "${GREEN}The voice server will now start automatically when you log in.${NC}"
