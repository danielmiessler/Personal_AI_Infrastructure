#!/bin/bash

# PAIVoice Server Menu Bar Installer
# Installs SwiftBar and sets up the voice server status plugin

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🎙️ PAIVoice Server Menu Bar Installer"
echo "============================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLUGIN_FILE="voice-server.5s.sh"

# Check if SwiftBar is installed
if [ -d "/Applications/SwiftBar.app" ]; then
    echo -e "${GREEN}✅ SwiftBar is installed${NC}"
else
    echo -e "${YELLOW}⚠️  SwiftBar not found${NC}"
    echo ""
    echo "SwiftBar is required for the menu bar icon."
    echo ""
    echo "Install options:"
    echo "1. Download from: https://swiftbar.app"
    echo "2. Install with Homebrew: brew install --cask swiftbar"
    echo ""
    read -p "Would you like to install SwiftBar with Homebrew? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v brew &> /dev/null; then
            echo "Installing SwiftBar..."
            brew install --cask swiftbar
            echo -e "${GREEN}✅ SwiftBar installed${NC}"
        else
            echo -e "${RED}❌ Homebrew not found${NC}"
            echo "Please install SwiftBar manually from https://swiftbar.app"
            exit 1
        fi
    else
        echo "Please install SwiftBar from https://swiftbar.app and run this script again."
        exit 1
    fi
fi

# Find SwiftBar plugins directory
DEFAULT_PLUGIN_DIR="$HOME/Library/Application Support/SwiftBar/Plugins"
if [ -d "$DEFAULT_PLUGIN_DIR" ]; then
    PLUGIN_DIR="$DEFAULT_PLUGIN_DIR"
    echo -e "${GREEN}✅ Found SwiftBar plugins directory${NC}"
else
    # SwiftBar might not be configured yet
    echo -e "${YELLOW}⚠️  SwiftBar plugins directory not found${NC}"
    echo ""
    echo "Creating default plugins directory..."
    mkdir -p "$DEFAULT_PLUGIN_DIR"
    PLUGIN_DIR="$DEFAULT_PLUGIN_DIR"
fi

# Copy plugin to SwiftBar plugins directory
echo "📝 Installing voice server plugin..."
cp "${SCRIPT_DIR}/${PLUGIN_FILE}" "${PLUGIN_DIR}/"
chmod +x "${PLUGIN_DIR}/${PLUGIN_FILE}"

echo -e "${GREEN}✅ Plugin installed${NC}"

# Check if SwiftBar is running
if pgrep -x "SwiftBar" > /dev/null; then
    echo -e "${GREEN}✅ SwiftBar is running${NC}"
    echo ""
    echo "The voice server icon should appear in your menu bar shortly."
    echo "It refreshes every 5 seconds."
else
    echo ""
    echo -e "${YELLOW}⚠️  SwiftBar is not running${NC}"
    echo ""
    echo "Starting SwiftBar..."
    open -a SwiftBar
    
    echo ""
    echo "SwiftBar Setup:"
    echo "1. SwiftBar will ask you to select a plugins folder"
    echo "2. Choose: ~/Library/Application Support/SwiftBar/Plugins"
    echo "3. The voice server icon will appear in your menu bar"
fi

echo ""
echo "📊 Menu Bar Icon Status:"
echo "  🎙️ = Voice server is running"
echo "  🔇 = Voice server is stopped"
echo ""
echo "Click the icon to see status and control options."
echo ""
echo "To uninstall the menu bar icon:"
echo "  rm '${PLUGIN_DIR}/${PLUGIN_FILE}'"
echo ""
echo -e "${GREEN}✨ Menu bar setup complete!${NC}"