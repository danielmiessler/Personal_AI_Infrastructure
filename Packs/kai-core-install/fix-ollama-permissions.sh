#!/bin/bash

set -e

USB_PATH="/media/kaishraiberg/LLM/.ollama"
SERVICE_FILE="/etc/systemd/system/ollama.service"

echo "🔧 Ollama USB Permissions Fix"
echo "======================================"
echo ""

if [ "$EUID" -ne 0 ]; then
    echo "❌ This script requires sudo privileges"
    echo "Please run: sudo bash $0"
    exit 1
fi

echo "Choose a solution:"
echo ""
echo "1) Add ollama user to kaishraiberg group (RECOMMENDED)"
echo "   - Minimal permissions, ollama can only read your files"
echo ""
echo "2) Change USB directory ownership to ollama user"
echo "   - Gives ollama full control of USB directory"
echo ""
echo "3) Run service as your user (kaishraiberg)"
echo "   - Service runs with your permissions"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📋 Solution 1: Adding ollama to kaishraiberg group..."

        # Add ollama user to kaishraiberg's group
        usermod -a -G kaishraiberg ollama

        # Ensure group has read access
        chmod -R g+rX "$USB_PATH"

        echo "✅ Added ollama user to kaishraiberg group"
        echo "✅ Set group read permissions on USB directory"
        ;;

    2)
        echo ""
        echo "📋 Solution 2: Changing ownership to ollama user..."

        chown -R ollama:ollama "$USB_PATH"

        echo "✅ Changed ownership of $USB_PATH to ollama:ollama"
        ;;

    3)
        echo ""
        echo "📋 Solution 3: Changing service to run as kaishraiberg..."

        # Backup service file
        BACKUP="/etc/systemd/system/ollama.service.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$SERVICE_FILE" "$BACKUP"
        echo "💾 Backup created: $BACKUP"

        # Change user and group in service file
        sed -i 's/^User=ollama$/User=kaishraiberg/' "$SERVICE_FILE"
        sed -i 's/^Group=ollama$/Group=kaishraiberg/' "$SERVICE_FILE"

        echo "✅ Service file updated to run as kaishraiberg"
        ;;

    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🔄 Reloading systemd and restarting service..."
systemctl daemon-reload
systemctl restart ollama

sleep 2

echo ""
if systemctl is-active --quiet ollama; then
    echo "✅ Ollama service is running!"
    echo ""
    echo "Verifying models..."
    su - kaishraiberg -c "ollama list"
else
    echo "⚠️  Service not running. Check status with:"
    echo "  systemctl status ollama"
fi

echo ""
echo "======================================"
echo "✨ Done!"
echo "======================================"
