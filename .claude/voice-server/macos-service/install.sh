#!/bin/bash

# PAIVoice Server Service Installer
# This script installs the voice server as a macOS LaunchAgent

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_NAME="com.paivoice.server"
PLIST_FILE="com.paivoice.server.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

# Use PAI_DIR if set, otherwise default to ~/.claude
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
VOICE_SERVER_DIR="${PAI_DIR}/voice-server"

echo "🚀 PAIVoice Server Service Installer"
echo "==========================================="
echo ""

# Check if bun is installed and find its path
BUN_PATH=""
if [ -f "$HOME/.bun/bin/bun" ]; then
    BUN_PATH="$HOME/.bun/bin/bun"
elif [ -f "/opt/homebrew/bin/bun" ]; then
    BUN_PATH="/opt/homebrew/bin/bun"
elif [ -f "/usr/local/bin/bun" ]; then
    BUN_PATH="/usr/local/bin/bun"
elif command -v bun &> /dev/null; then
    BUN_PATH="$(which bun)"
else
    echo "❌ Error: bun is not installed"
    echo "Please install bun first: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi
echo "✅ Found bun at: ${BUN_PATH}"

# Check for ElevenLabs API configuration
echo "🔑 Checking API configuration..."
if [ -f ~/.env ] && grep -q "ELEVENLABS_API_KEY" ~/.env 2>/dev/null; then
    echo "✅ ElevenLabs API key found in ~/.env"
else
    echo "⚠️  No ElevenLabs API key found"
    echo ""
    echo "   The server will use macOS 'say' command for voice."
    echo "   To enable ElevenLabs AI voices:"
    echo ""
    echo "   1. Get a free API key from: https://elevenlabs.io"
    echo "   2. Add to ~/.env file:"
    echo "      ELEVENLABS_API_KEY=your_api_key_here"
    echo "      ELEVENLABS_VOICE_ID=voice_id_here  # Optional, defaults to default voice"
    echo ""
    read -p "   Continue without ElevenLabs? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled. Set up ~/.env and try again."
        exit 1
    fi
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p "${VOICE_SERVER_DIR}/logs"

# Create LaunchAgents directory if it doesn't exist
echo "📁 Creating LaunchAgents directory..."
mkdir -p "${LAUNCH_AGENTS_DIR}"

# Stop existing service if running
if launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "⏹️  Stopping existing service..."
    launchctl unload "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}" 2>/dev/null || true
    launchctl remove "${SERVICE_NAME}" 2>/dev/null || true
fi

# Generate plist from template with correct paths
echo "📝 Generating service configuration..."
PLIST_TEMPLATE="${SCRIPT_DIR}/com.paivoice.server.plist.template"

if [ -f "${PLIST_TEMPLATE}" ]; then
    # Use template and substitute paths
    sed -e "s|__BUN_PATH__|${BUN_PATH}|g" \
        -e "s|__PAI_DIR__|${PAI_DIR}|g" \
        -e "s|__HOME__|${HOME}|g" \
        "${PLIST_TEMPLATE}" > "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}"
    echo "✅ Generated plist with your paths:"
    echo "   PAI_DIR: ${PAI_DIR}"
    echo "   BUN: ${BUN_PATH}"
else
    # Fallback to copying static plist (legacy)
    echo "⚠️  Template not found, using static plist"
    cp "${SCRIPT_DIR}/${PLIST_FILE}" "${LAUNCH_AGENTS_DIR}/"
fi

# Load the service
echo "🔧 Loading service..."
launchctl load -w "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}"

# Check if service is running
sleep 2
if launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "✅ Service installed and running successfully!"
    echo ""
    echo "📊 Service Status:"
    launchctl list | grep "${SERVICE_NAME}"
    echo ""
    echo "🔍 Test the service:"
    echo "   curl http://localhost:8888/health"
    echo ""
    echo "📋 Service Management Commands:"
    echo "   Start:   launchctl start ${SERVICE_NAME}"
    echo "   Stop:    launchctl stop ${SERVICE_NAME}"
    echo "   Status:  launchctl list | grep ${SERVICE_NAME}"
    echo "   Logs:    tail -f ${VOICE_SERVER_DIR}/logs/voice-server.log"
    echo ""
    echo "🗑️  To uninstall:"
    echo "   ${SCRIPT_DIR}/uninstall.sh"
else
    echo "❌ Failed to start service. Check logs at:"
    echo "   ${VOICE_SERVER_DIR}/logs/voice-server-error.log"
    exit 1
fi