#!/bin/bash

# PAIVoice Server Service Uninstaller

set -e

SERVICE_NAME="com.paivoice.server"
PLIST_FILE="com.paivoice.server.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

echo "🗑️  PAIVoice Server Service Uninstaller"
echo "============================================"
echo ""

# Check if service is installed
if [ ! -f "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}" ]; then
    echo "⚠️  Service is not installed"
    exit 0
fi

# Stop and unload the service
if launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "⏹️  Stopping service..."
    launchctl unload "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}" 2>/dev/null || true
    launchctl remove "${SERVICE_NAME}" 2>/dev/null || true
fi

# Remove plist file
echo "🗑️  Removing service configuration..."
rm -f "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}"

echo "✅ Service uninstalled successfully!"
echo ""
echo "Note: Log files have been preserved at:"
echo "  \${PAI_DIR:-~/.claude}/VoiceServer/logs/"