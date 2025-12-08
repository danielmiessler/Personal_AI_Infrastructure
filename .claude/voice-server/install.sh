#!/bin/bash

# PAI Voice Server Installation Script
# Platform-aware installer for macOS and Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect platform
OS_TYPE="$(uname -s)"
case "${OS_TYPE}" in
    Linux*)     PLATFORM=Linux;;
    Darwin*)    PLATFORM=macOS;;
    *)          PLATFORM="UNKNOWN";;
esac

if [ "$PLATFORM" = "UNKNOWN" ]; then
    echo -e "${RED}✗ Unsupported platform: ${OS_TYPE}${NC}"
    exit 1
fi

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ENV_FILE="$HOME/.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server Installation (${PLATFORM})${NC}"
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
echo -e "${GREEN}✓ Bun is installed${NC}"

# Platform-specific prerequisite checks
if [ "$PLATFORM" = "Linux" ]; then
    # Check for flatpak and SpeechNote
    if ! command -v flatpak &> /dev/null; then
        echo -e "${RED}✗ Flatpak is not installed${NC}"
        echo "  Please install Flatpak for SpeechNote support"
        exit 1
    fi
    echo -e "${GREEN}✓ Flatpak is installed${NC}"

    if ! flatpak list | grep -q "net.mkiol.SpeechNote"; then
        echo -e "${RED}✗ SpeechNote is not installed${NC}"
        echo "  Please install SpeechNote:"
        echo "  flatpak install flathub net.mkiol.SpeechNote"
        exit 1
    fi
    echo -e "${GREEN}✓ SpeechNote is installed${NC}"

    # Check for notify-send (libnotify)
    if ! command -v notify-send &> /dev/null; then
        echo -e "${YELLOW}⚠ notify-send not found, desktop notifications disabled${NC}"
        echo "  Install libnotify-bin for desktop notifications"
    else
        echo -e "${GREEN}✓ Desktop notifications available${NC}"
    fi

    # Check for paplay (PulseAudio)
    if ! command -v paplay &> /dev/null; then
        echo -e "${YELLOW}⚠ paplay not found, ElevenLabs audio may not work${NC}"
        echo "  Install pulseaudio-utils for audio playback"
    else
        echo -e "${GREEN}✓ Audio playback available${NC}"
    fi
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
        if [ "$PLATFORM" = "Linux" ]; then
            echo "  Voice server will use SpeechNote TTS as fallback"
        else
            echo "  Voice server will use macOS 'say' command as fallback"
        fi
        ELEVENLABS_CONFIGURED=false
    fi
else
    echo -e "${YELLOW}⚠ No ElevenLabs configuration found${NC}"
    if [ "$PLATFORM" = "Linux" ]; then
        echo "  Voice server will use SpeechNote TTS as fallback"
    else
        echo "  Voice server will use macOS 'say' command as fallback"
    fi
    ELEVENLABS_CONFIGURED=false
fi

if [ "$ELEVENLABS_CONFIGURED" = false ]; then
    echo
    echo "To enable premium AI voices, add your ElevenLabs API key to ~/.env:"
    echo "  echo 'ELEVENLABS_API_KEY=your_api_key_here' >> ~/.env"
    echo "  Get a free key at: https://elevenlabs.io"
    echo
fi

# Platform-specific installation
if [ "$PLATFORM" = "Linux" ]; then
    # Linux systemd user service installation
    SERVICE_NAME="pai-voice-server"
    SERVICE_PATH="$HOME/.config/systemd/user/${SERVICE_NAME}.service"

    # Check for existing installation
    if systemctl --user list-units --all | grep -q "$SERVICE_NAME"; then
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

    # Create systemd user directory
    echo -e "${YELLOW}▶ Creating systemd user service...${NC}"
    mkdir -p "$HOME/.config/systemd/user"

    # Install service file
    cp "$SCRIPT_DIR/pai-voice-server.service" "$SERVICE_PATH"

    # Enable systemd user services for current user
    echo -e "${YELLOW}▶ Enabling systemd user services...${NC}"
    systemctl --user daemon-reload

    # Enable and start the service
    echo -e "${YELLOW}▶ Starting voice server service...${NC}"
    systemctl --user enable "$SERVICE_NAME"
    systemctl --user start "$SERVICE_NAME"

    # Wait for server to start
    sleep 3

    # Test the server
    echo -e "${YELLOW}▶ Testing voice server...${NC}"
    if curl -s -f -X GET http://localhost:8888/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Voice server is running${NC}"

        # Send test notification
        echo -e "${YELLOW}▶ Sending test notification...${NC}"
        curl -s -X POST http://localhost:8888/notify \
            -H "Content-Type: application/json" \
            -d '{"message": "PAI Voice Server installed successfully on Linux", "agent_type": "osmi"}' > /dev/null
        echo -e "${GREEN}✓ Test notification sent${NC}"
    else
        echo -e "${RED}✗ Voice server is not responding${NC}"
        echo "  Check logs with: journalctl --user -u $SERVICE_NAME"
        echo "  Try running manually: cd $SCRIPT_DIR && bun run server.ts"
        exit 1
    fi

    # Show summary
    echo
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}     ✓ Installation Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${BLUE}Service Information:${NC}"
    echo "  • Service: $SERVICE_NAME"
    echo "  • Status: Running"
    echo "  • Port: 8888"
    echo "  • Logs: journalctl --user -u $SERVICE_NAME"

    if [ "$ELEVENLABS_CONFIGURED" = true ]; then
        echo "  • Voice: ElevenLabs AI (15 agent voices)"
    else
        echo "  • Voice: SpeechNote TTS (15 agent voices)"
    fi

    echo
    echo -e "${BLUE}Management Commands:${NC}"
    echo "  • Status:   systemctl --user status $SERVICE_NAME"
    echo "  • Stop:     systemctl --user stop $SERVICE_NAME"
    echo "  • Start:    systemctl --user start $SERVICE_NAME"
    echo "  • Restart:  systemctl --user restart $SERVICE_NAME"
    echo "  • Logs:     journalctl --user -u $SERVICE_NAME -f"
    echo "  • Disable:  systemctl --user disable $SERVICE_NAME"

    echo
    echo -e "${BLUE}Test the server:${NC}"
    echo "  curl -X POST http://localhost:8888/notify \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"message\": \"Hello from OSMI\", \"agent_type\": \"osmi\"}'"

    echo
    echo -e "${GREEN}The voice server will now start automatically on login and system boot.${NC}"

else
    # macOS LaunchAgent installation
    SERVICE_NAME="com.pai.voice-server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${SERVICE_NAME}.plist"
    LOG_PATH="$HOME/Library/Logs/pai-voice-server.log"

    # Check for existing installation
    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        echo -e "${YELLOW}⚠ Voice server is already installed${NC}"
        read -p "Do you want to reinstall? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}▶ Stopping existing service...${NC}"
            launchctl unload "$PLIST_PATH" 2>/dev/null || true
            echo -e "${GREEN}✓ Existing service stopped${NC}"
        else
            echo "Installation cancelled"
            exit 0
        fi
    fi

    # Create LaunchAgent plist
    echo -e "${YELLOW}▶ Creating LaunchAgent configuration...${NC}"
    mkdir -p "$HOME/Library/LaunchAgents"

    cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>

    <key>ProgramArguments</key>
    <array>
        <string>$(which bun)</string>
        <string>run</string>
        <string>${SCRIPT_DIR}/server.ts</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>${LOG_PATH}</string>

    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${HOME}/.bun/bin</string>
    </dict>
</dict>
</plist>
EOF

    echo -e "${GREEN}✓ LaunchAgent configuration created${NC}"

    # Load the LaunchAgent
    echo -e "${YELLOW}▶ Starting voice server service...${NC}"
    launchctl load "$PLIST_PATH" 2>/dev/null || {
        echo -e "${RED}✗ Failed to load LaunchAgent${NC}"
        echo "  Try manually: launchctl load $PLIST_PATH"
        exit 1
    }

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
            -d '{"message": "Voice server installed successfully"}' > /dev/null
        echo -e "${GREEN}✓ Test notification sent${NC}"
    else
        echo -e "${RED}✗ Voice server is not responding${NC}"
        echo "  Check logs at: $LOG_PATH"
        echo "  Try running manually: bun run $SCRIPT_DIR/server.ts"
        exit 1
    fi

    # Show summary
    echo
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}     ✓ Installation Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo
    echo -e "${BLUE}Service Information:${NC}"
    echo "  • Service: $SERVICE_NAME"
    echo "  • Status: Running"
    echo "  • Port: 8888"
    echo "  • Logs: $LOG_PATH"

    if [ "$ELEVENLABS_CONFIGURED" = true ]; then
        echo "  • Voice: ElevenLabs AI"
    else
        echo "  • Voice: macOS Say (fallback)"
    fi

    echo
    echo -e "${BLUE}Management Commands:${NC}"
    echo "  • Status:   ./status.sh"
    echo "  • Stop:     ./stop.sh"
    echo "  • Start:    ./start.sh"
    echo "  • Restart:  ./restart.sh"
    echo "  • Uninstall: ./uninstall.sh"

    echo
    echo -e "${BLUE}Test the server:${NC}"
    echo "  curl -X POST http://localhost:8888/notify \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"message\": \"Hello from PAI\"}'"

    echo
    echo -e "${GREEN}The voice server will now start automatically when you log in.${NC}"

    # Ask about menu bar indicator
    echo
    read -p "Would you like to install a menu bar indicator? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}▶ Installing menu bar indicator...${NC}"
        if [ -f "$SCRIPT_DIR/menubar/install-menubar.sh" ]; then
            chmod +x "$SCRIPT_DIR/menubar/install-menubar.sh"
            "$SCRIPT_DIR/menubar/install-menubar.sh"
        else
            echo -e "${YELLOW}⚠ Menu bar installer not found${NC}"
            echo "  You can install it manually later from:"
            echo "  $SCRIPT_DIR/menubar/install-menubar.sh"
        fi
    fi
fi
