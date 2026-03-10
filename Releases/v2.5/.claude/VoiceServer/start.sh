#!/bin/bash
# Start PAI Voice Server V2 (Qwen3-TTS, uv-based)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PLIST="$HOME/Library/LaunchAgents/com.pai.voice-server.plist"
PORT=8888

echo "Starting PAI Voice Server V2..."

# Check if already running
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "Server already running on port $PORT"
    echo "Use ./restart.sh to restart"
    exit 0
fi

# Install updated plist
sed "s|__HOME__|$HOME|g" "$SCRIPT_DIR/macos-service/com.pai.voice-server.plist" > "$PLIST"

# Load LaunchAgent
if [ -f "$PLIST" ]; then
    launchctl load "$PLIST" 2>/dev/null || true
    echo "LaunchAgent loaded"
else
    echo "LaunchAgent not found. Running directly with uv..."
    cd "$SCRIPT_DIR"
    uv run uvicorn server:app --host 127.0.0.1 --port $PORT &
fi

# Wait for startup
echo "Waiting for server to start..."
sleep 3

# Check health
if curl -s -f http://localhost:$PORT/health > /dev/null 2>&1; then
    echo ""
    echo "PAI Voice Server V2 is running on port $PORT"
    echo "Health: http://localhost:$PORT/health"
else
    echo ""
    echo "Server may still be starting (model loading takes time)"
    echo "Check logs: tail -f $SCRIPT_DIR/logs/voice-server.log"
fi
