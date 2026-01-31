#!/bin/bash
# Check PAI Voice Server V2 status

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PORT=8888

echo "=================================================="
echo "  PAI Voice Server V2 Status"
echo "=================================================="

# Check port
echo ""
echo "Port $PORT:"
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "  LISTENING"
    lsof -i :$PORT | head -2
else
    echo "  NOT LISTENING"
fi

# Check health endpoint
echo ""
echo "Health Check:"
HEALTH=$(curl -s http://localhost:$PORT/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "  $HEALTH"
else
    echo "  UNREACHABLE"
fi

# Check LaunchAgent
echo ""
echo "LaunchAgent:"
PLIST="$HOME/Library/LaunchAgents/com.pai.voice-server.plist"
if [ -f "$PLIST" ]; then
    echo "  Installed: $PLIST"
    if launchctl list | grep -q "com.pai.voice-server"; then
        echo "  Status: LOADED"
    else
        echo "  Status: NOT LOADED"
    fi
else
    echo "  NOT INSTALLED"
fi

# Check uv environment
echo ""
echo "UV Environment:"
if [ -f "$SCRIPT_DIR/pyproject.toml" ]; then
    echo "  pyproject.toml: EXISTS"
    if [ -d "$SCRIPT_DIR/.venv" ]; then
        echo "  .venv: EXISTS"
    else
        echo "  .venv: MISSING - run 'uv sync'"
    fi
else
    echo "  NOT CONFIGURED"
fi

# Check voice prompts
echo ""
echo "Saved Voices:"
INDEX="$SCRIPT_DIR/voices/index.json"
if [ -f "$INDEX" ]; then
    COUNT=$(cat "$INDEX" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('prompts',{})))" 2>/dev/null || echo "0")
    echo "  $COUNT voice(s) saved"
else
    echo "  No voice index found"
fi

# Recent logs
echo ""
echo "Recent Logs:"
LOG="$SCRIPT_DIR/logs/voice-server.log"
if [ -f "$LOG" ]; then
    tail -5 "$LOG" | sed 's/^/  /'
else
    echo "  No logs yet"
fi

echo ""
echo "=================================================="
