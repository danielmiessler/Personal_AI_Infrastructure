#!/bin/bash
# Uninstall PAI Voice Server systemd user service

SERVICE_DIR="$HOME/.config/systemd/user"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Uninstalling PAI Voice Server systemd service..."

# Stop service if running
systemctl --user stop pai-voice-server.service 2>/dev/null

# Disable service
systemctl --user disable pai-voice-server.service 2>/dev/null

# Remove service file
rm -f "$SERVICE_DIR/pai-voice-server.service"

# Reload systemd
systemctl --user daemon-reload

echo -e "${GREEN}Service uninstalled${NC}"
