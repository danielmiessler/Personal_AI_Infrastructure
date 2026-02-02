#!/bin/bash
# Install PAI Voice Server systemd user service

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVICE_DIR="$HOME/.config/systemd/user"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Installing PAI Voice Server systemd service..."

# Create systemd user directory if needed
mkdir -p "$SERVICE_DIR"

# Copy service file
cp "$SCRIPT_DIR/pai-voice-server.service" "$SERVICE_DIR/"

# Reload systemd
systemctl --user daemon-reload

# Enable service
systemctl --user enable pai-voice-server.service

echo -e "${GREEN}Service installed and enabled${NC}"
echo ""
echo "Commands:"
echo "  Start:   systemctl --user start pai-voice-server"
echo "  Stop:    systemctl --user stop pai-voice-server"
echo "  Status:  systemctl --user status pai-voice-server"
echo "  Logs:    journalctl --user -u pai-voice-server -f"
