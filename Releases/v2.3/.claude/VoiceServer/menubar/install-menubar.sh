#!/bin/bash

# Install Menu Bar Indicator for Voice Server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MENUBAR_SCRIPT="$SCRIPT_DIR/pai-voice.5s.sh"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}     PAI Voice Menu Bar Installation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check if SwiftBar is installed
if [ -d "/Applications/SwiftBar.app" ]; then
    echo -e "${GREEN}✓ SwiftBar is installed${NC}"
    MENUBAR_APP="SwiftBar"
    PLUGIN_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
elif [ -d "/Applications/BitBar.app" ]; then
    echo -e "${GREEN}✓ BitBar is installed${NC}"
    MENUBAR_APP="BitBar"
    # Check for BitBar plugin directory
    if [ -d "$HOME/Documents/BitBarPlugins" ]; then
        PLUGIN_DIR="$HOME/Documents/BitBarPlugins"
    elif [ -d "$HOME/BitBar" ]; then
        PLUGIN_DIR="$HOME/BitBar"
    else
        PLUGIN_DIR="$HOME/Documents/BitBarPlugins"
        echo -e "${YELLOW}▶ Creating BitBar plugin directory...${NC}"
        mkdir -p "$PLUGIN_DIR"
    fi
else
    echo -e "${RED}✗ Neither SwiftBar nor BitBar is installed${NC}"
    echo
    echo "Please install SwiftBar (recommended) or BitBar first:"
    echo
    echo "Option 1: Install SwiftBar (Recommended)"
    echo "  brew install --cask swiftbar"
    echo "  Or download from: https://github.com/swiftbar/SwiftBar/releases"
    echo
    echo "Option 2: Install BitBar"
    echo "  brew install --cask bitbar"
    echo "  Or download from: https://getbitbar.com"
    echo
    exit 1
fi

# Make script executable
chmod +x "$MENUBAR_SCRIPT"

# Create plugin directory if it doesn't exist
mkdir -p "$PLUGIN_DIR"

# Copy or link the script
echo -e "${YELLOW}▶ Installing menu bar plugin...${NC}"

# Remove existing plugin if it exists
rm -f "$PLUGIN_DIR/pai-voice.5s.sh" 2>/dev/null || true

# Create symbolic link to our script
ln -s "$MENUBAR_SCRIPT" "$PLUGIN_DIR/pai-voice.5s.sh"

echo -e "${GREEN}✓ Menu bar plugin installed${NC}"

# Refresh SwiftBar/BitBar
if [ "$MENUBAR_APP" = "SwiftBar" ]; then
    echo -e "${YELLOW}▶ Refreshing SwiftBar...${NC}"
    if pgrep -x "SwiftBar" > /dev/null; then
        # SwiftBar refresh via URL scheme
        open -g "swiftbar://refreshall"
        echo -e "${GREEN}✓ SwiftBar refreshed${NC}"
    else
        echo -e "${YELLOW}▶ Starting SwiftBar...${NC}"
        open -a SwiftBar
        sleep 2
        echo -e "${GREEN}✓ SwiftBar started${NC}"
    fi
else
    echo -e "${YELLOW}▶ Refreshing BitBar...${NC}"
    if pgrep -x "BitBar" > /dev/null; then
        killall BitBar 2>/dev/null || true
        sleep 1
    fi
    open -a BitBar
    echo -e "${GREEN}✓ BitBar started${NC}"
fi

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}     ✓ Menu Bar Installation Complete${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${BLUE}You should now see a 🎙️ icon in your menu bar!${NC}"
echo
echo "The icon shows:"
echo "  • 🎙️ (colored) - Server is running"
echo "  • 🎙️⚫ (gray) - Server is stopped"
echo
echo "Click the icon to:"
echo "  • Start/Stop the server"
echo "  • View status and logs"
echo "  • Test voice output"
echo
echo -e "${YELLOW}Note:${NC} If you don't see the icon, you may need to:"
echo "  1. Open $MENUBAR_APP preferences"
echo "  2. Set the plugin folder to: $PLUGIN_DIR"
echo "  3. Restart $MENUBAR_APP"