#!/bin/bash

# Linux Dependencies Setup Script for PAI Voice Server
# This script installs the necessary audio and TTS packages for Ubuntu/Debian systems

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Server - Linux Dependencies Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check if running on Linux
if [[ "$(uname -s)" != "Linux" ]]; then
    echo -e "${RED}✗ This script is for Linux systems only${NC}"
    exit 1
fi

# Check if running Ubuntu/Debian (has apt)
if ! command -v apt &> /dev/null; then
    echo -e "${YELLOW}⚠ This script is designed for Ubuntu/Debian systems with apt${NC}"
    echo "  For other Linux distributions, manually install:"
    echo "  • Audio: pulseaudio-utils, alsa-utils, mpg123, or mplayer"
    echo "  • TTS: espeak-ng, speech-dispatcher, or festival"
    echo "  • Notifications: libnotify-bin"
    exit 1
fi

echo -e "${YELLOW}▶ Updating package lists...${NC}"
sudo apt update

echo
echo -e "${YELLOW}▶ Installing audio playback tools...${NC}"

# Install audio players
AUDIO_PACKAGES=("pulseaudio-utils" "alsa-utils" "mpg123")
AUDIO_INSTALLED=()

for package in "${AUDIO_PACKAGES[@]}"; do
    if sudo apt install -y "$package" 2>/dev/null; then
        AUDIO_INSTALLED+=("$package")
        echo -e "  ${GREEN}✓ $package installed${NC}"
    else
        echo -e "  ${YELLOW}⚠ $package installation failed or not available${NC}"
    fi
done

echo
echo -e "${YELLOW}▶ Installing text-to-speech engines...${NC}"

# Install TTS engines
TTS_PACKAGES=("espeak-ng" "speech-dispatcher")
TTS_INSTALLED=()

for package in "${TTS_PACKAGES[@]}"; do
    if sudo apt install -y "$package" 2>/dev/null; then
        TTS_INSTALLED+=("$package")
        echo -e "  ${GREEN}✓ $package installed${NC}"
    else
        echo -e "  ${YELLOW}⚠ $package installation failed or not available${NC}"
    fi
done

echo
echo -e "${YELLOW}▶ Installing desktop notification tools...${NC}"

# Install notification tools
NOTIFY_PACKAGES=("libnotify-bin")
NOTIFY_INSTALLED=()

for package in "${NOTIFY_PACKAGES[@]}"; do
    if sudo apt install -y "$package" 2>/dev/null; then
        NOTIFY_INSTALLED+=("$package")
        echo -e "  ${GREEN}✓ $package installed${NC}"
    else
        echo -e "  ${YELLOW}⚠ $package installation failed or not available${NC}"
    fi
done

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Linux Dependencies Setup Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo
echo -e "${BLUE}Installed Components:${NC}"

if [ ${#AUDIO_INSTALLED[@]} -gt 0 ]; then
    echo -e "  ${GREEN}Audio Players:${NC} ${AUDIO_INSTALLED[*]}"
    echo "    • paplay (PulseAudio), aplay (ALSA), mpg123 available"
else
    echo -e "  ${RED}Audio Players: None installed${NC}"
fi

if [ ${#TTS_INSTALLED[@]} -gt 0 ]; then
    echo -e "  ${GREEN}TTS Engines:${NC} ${TTS_INSTALLED[*]}"
    echo "    • espeak-ng, spd-say available"
else
    echo -e "  ${RED}TTS Engines: None installed${NC}"
fi

if [ ${#NOTIFY_INSTALLED[@]} -gt 0 ]; then
    echo -e "  ${GREEN}Notifications:${NC} ${NOTIFY_INSTALLED[*]}"
    echo "    • notify-send available"
else
    echo -e "  ${RED}Notifications: None installed${NC}"
fi

echo
echo -e "${BLUE}Testing installed components:${NC}"

# Test audio (if any installed)
if [ ${#AUDIO_INSTALLED[@]} -gt 0 ]; then
    echo -n "  • Audio playback: "
    if command -v paplay &> /dev/null; then
        echo -e "${GREEN}paplay available${NC}"
    elif command -v aplay &> /dev/null; then
        echo -e "${GREEN}aplay available${NC}"
    elif command -v mpg123 &> /dev/null; then
        echo -e "${GREEN}mpg123 available${NC}"
    else
        echo -e "${YELLOW}installed but not in PATH${NC}"
    fi
fi

# Test TTS (if any installed)
if [ ${#TTS_INSTALLED[@]} -gt 0 ]; then
    echo -n "  • Text-to-speech: "
    if command -v espeak-ng &> /dev/null || command -v espeak &> /dev/null; then
        echo -e "${GREEN}espeak available${NC}"
    elif command -v spd-say &> /dev/null; then
        echo -e "${GREEN}spd-say available${NC}"
    else
        echo -e "${YELLOW}installed but not in PATH${NC}"
    fi
fi

# Test notifications (if any installed)
if [ ${#NOTIFY_INSTALLED[@]} -gt 0 ]; then
    echo -n "  • Desktop notifications: "
    if command -v notify-send &> /dev/null; then
        echo -e "${GREEN}notify-send available${NC}"

        # Test notification
        echo -e "${YELLOW}▶ Sending test notification...${NC}"
        if notify-send "PAI Voice Server" "Linux dependencies installed successfully!" 2>/dev/null; then
            echo -e "  ${GREEN}✓ Test notification sent${NC}"
        else
            echo -e "  ${YELLOW}⚠ Test notification failed (might work in GUI environment)${NC}"
        fi
    else
        echo -e "${YELLOW}installed but not in PATH${NC}"
    fi
fi

echo
if [ ${#AUDIO_INSTALLED[@]} -gt 0 ] && [ ${#TTS_INSTALLED[@]} -gt 0 ] && [ ${#NOTIFY_INSTALLED[@]} -gt 0 ]; then
    echo -e "${GREEN}✓ All components ready! The voice server should now work with full audio and notification support.${NC}"
else
    echo -e "${YELLOW}⚠ Some components missing. The voice server will work but may fall back to console logging.${NC}"
fi

echo
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Run the voice server installer: cd ~/.claude/voice-server && ./install.sh"
echo "  2. Test with: curl -X POST http://localhost:<PORT>/notify -H 'Content-Type: application/json' -d '{\"message\":\"Test\"}'"
echo "     (Replace <PORT> with your configured port - default: 8888)"
echo "  3. Check status: ./status.sh"
