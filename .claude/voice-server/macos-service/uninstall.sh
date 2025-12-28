#!/bin/bash

# PAIVoice Server Service Uninstaller

set -e

SERVICE_NAME="com.paivoice.server"
PLIST_FILE="com.paivoice.server.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
LOG_FILE="$HOME/Library/Logs/pai-voice-server.log"

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

# Ask about logs
echo "Log files location: $LOG_FILE"
read -p "Would you like to remove log files? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$LOG_FILE" ]; then
        rm -f "$LOG_FILE"
        echo "✅ Log file removed"
    else
        echo "⚠️  No log file found"
    fi
else
    echo "Log files preserved at: $LOG_FILE"
fi