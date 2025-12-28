#!/bin/bash

# PAI Voice Server Menu Bar Indicator
# For BitBar/SwiftBar - updates every 5 seconds

# Get port from settings.json first, then .env
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SETTINGS_FILE="$PAI_DIR/settings.json"
ENV_FILE="$PAI_DIR/.env"
PORT=8888  # Default

# Try settings.json first
if [ -f "$SETTINGS_FILE" ]; then
    PORT_FROM_SETTINGS=$(grep -o '"VOICE_SERVER_PORT"[[:space:]]*:[[:space:]]*"[^"]*"' "$SETTINGS_FILE" 2>/dev/null | grep -o '[0-9]\+' | head -1)
    if [ -n "$PORT_FROM_SETTINGS" ]; then
        PORT=$PORT_FROM_SETTINGS
    fi
fi

# Fall back to .env if not in settings.json
if [ "$PORT" = "8888" ] && [ -f "$ENV_FILE" ] && grep -q "^PORT=" "$ENV_FILE"; then
    PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
fi

# Check if server is running
if curl -s -f http://localhost:$PORT/health > /dev/null 2>&1; then
    # Server is running - show green indicator with size
    echo "🎙️ | size=18"
    echo "---"
    echo "PAI Voice Server: ✅ Running"
    
    # Check for ElevenLabs
    if [ -f ~/.env ] && grep -q "ELEVENLABS_API_KEY=" ~/.env 2>/dev/null; then
        API_KEY=$(grep "ELEVENLABS_API_KEY=" ~/.env | cut -d'=' -f2)
        if [ "$API_KEY" != "your_api_key_here" ] && [ -n "$API_KEY" ]; then
            echo "Voice: ElevenLabs AI"
        else
            echo "Voice: macOS Say"
        fi
    else
        echo "Voice: macOS Say"
    fi

    echo "Port: $PORT"
    echo "---"
    echo "Stop Server | bash='${PAI_DIR}/voice-server/stop.sh' terminal=false refresh=true"
    echo "Restart Server | bash='${PAI_DIR}/voice-server/restart.sh' terminal=false refresh=true"
else
    # Server is not running - show gray indicator with size
    echo "🎙️⚫ | size=18"
    echo "---"
    echo "PAI Voice Server: ⚫ Stopped"
    echo "---"
    echo "Start Server | bash='${PAI_DIR}/voice-server/start.sh' terminal=false refresh=true"
fi

echo "---"
echo "Check Status | bash='${PAI_DIR}/voice-server/status.sh' terminal=true"
echo "View Logs | bash='tail -f ~/Library/Logs/pai-voice-server.log' terminal=true"
echo "---"
echo "Test Voice | bash='curl -X POST http://localhost:$PORT/notify -H \"Content-Type: application/json\" -d \"{\\\"message\\\":\\\"Testing voice server\\\"}\"' terminal=false"
echo "---"
echo "Open Voice Server Folder | bash='open ${PAI_DIR}/voice-server'"
echo "Uninstall | bash='${PAI_DIR}/voice-server/uninstall.sh' terminal=true"