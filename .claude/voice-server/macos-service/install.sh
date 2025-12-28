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

# Check for existing installation first
if [ -f "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}" ]; then
    echo ""
    echo "⚠️  Voice server is already installed"
    read -p "Do you want to reinstall? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "⏹️  Stopping existing service..."
        if launchctl list | grep -q "${SERVICE_NAME}"; then
            launchctl unload "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}" 2>/dev/null || true
            launchctl remove "${SERVICE_NAME}" 2>/dev/null || true
        fi
        echo "✅ Existing service stopped"
    else
        echo "Installation cancelled"
        exit 0
    fi
fi

# Port selection and validation
echo ""
echo "🔌 Configuring server port..."

# Check settings.json first, then .env
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SETTINGS_FILE="$PAI_DIR/settings.json"
ENV_FILE="$PAI_DIR/.env"
EXISTING_PORT=""

if [ -f "$SETTINGS_FILE" ]; then
    EXISTING_PORT=$(grep -o '"VOICE_SERVER_PORT"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ -n "$EXISTING_PORT" ]; then
        echo "📝 Current port in settings.json: $EXISTING_PORT"
    fi
fi

if [ -z "$EXISTING_PORT" ] && [ -f "$ENV_FILE" ] && grep -q "^PORT=" "$ENV_FILE"; then
    EXISTING_PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
    echo "📝 Current port in .env: $EXISTING_PORT"
fi

PORT_SELECTED=false
while [ "$PORT_SELECTED" = false ]; do
    read -p "Enter port for voice server (default: 8888): " USER_PORT
    PORT="${USER_PORT:-8888}"

    # Validate port is a number
    if ! [[ "$PORT" =~ ^[0-9]+$ ]] || [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
        echo "❌ Invalid port. Must be a number between 1-65535"
        continue
    fi

    # Check if port is in use
    if lsof -Pi :$PORT -sTCP:LISTEN -t &>/dev/null 2>&1; then
        PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null)
        if [ -n "$PID" ]; then
            PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
            CMDLINE=$(ps -p $PID -o args= 2>/dev/null || echo "")
            echo "⚠️  Port $PORT is currently in use"
            echo "   Process: $PROCESS (PID: $PID)"
            echo "   Command: $CMDLINE"
        else
            echo "⚠️  Port $PORT is currently in use"
        fi

        echo ""
        read -p "Continue with port $PORT anyway? (y/n/retry): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "⚠️  Proceeding with port $PORT (currently in use)"
            PORT_SELECTED=true
        elif [[ $REPLY =~ ^[Rr]$ ]]; then
            continue
        else
            continue
        fi
    else
        echo "✅ Port $PORT is available"
        PORT_SELECTED=true
    fi
done

# Save port to settings.json (primary) and .env (fallback)
if [ -f "$SETTINGS_FILE" ]; then
    # Update settings.json using sed (works without jq)
    if grep -q '"VOICE_SERVER_PORT"' "$SETTINGS_FILE"; then
        # Update existing entry
        sed -i '' "s/\"VOICE_SERVER_PORT\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"VOICE_SERVER_PORT\": \"$PORT\"/" "$SETTINGS_FILE"
        echo "✅ Updated VOICE_SERVER_PORT in settings.json"
    else
        # Add new entry to env object
        sed -i '' "s/\"DA_VOICE_ID\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/&,\n    \"VOICE_SERVER_PORT\": \"$PORT\"/" "$SETTINGS_FILE"
        echo "✅ Added VOICE_SERVER_PORT to settings.json"
    fi
else
    echo "⚠️  settings.json not found, falling back to .env"
fi

# Also save to .env as fallback
mkdir -p "$(dirname $ENV_FILE)"
if grep -q "^PORT=" "$ENV_FILE" 2>/dev/null; then
    sed -i '' "s/^PORT=.*/PORT=$PORT/" "$ENV_FILE"
    echo "✅ Updated PORT in .env (fallback)"
else
    echo "PORT=$PORT" >> "$ENV_FILE"
    echo "✅ Saved PORT to .env (fallback)"
fi

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
    echo "   curl http://localhost:$PORT/health"
    echo ""
    echo "📋 Server Information:"
    echo "   Port: $PORT"
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