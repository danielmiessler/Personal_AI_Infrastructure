#!/bin/bash
#
# PAI Voice Server Management Script
#
# Usage:
#   ./manage.sh start   - Start the voice server
#   ./manage.sh stop    - Stop the voice server
#   ./manage.sh restart - Restart the voice server
#   ./manage.sh status  - Check server status
#   ./manage.sh test    - Send a test notification
#
# Environment Variables:
#   VOICE_SERVER_PORT - Server port (default: 8888)
#   PAI_DIR - PAI installation directory
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${VOICE_SERVER_PORT:-8888}"
PID_FILE="/tmp/pai-voice-server.pid"
LOG_FILE="/tmp/pai-voice-server.log"

start() {
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "⚠️  Voice server is already running (PID: $(cat "$PID_FILE"))"
        return 1
    fi

    echo "🚀 Starting PAI Voice Server on port $PORT..."

    # Start server in background
    nohup bun run "$SCRIPT_DIR/server.ts" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"

    # Wait a moment for server to start
    sleep 1

    if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "✅ Voice server started (PID: $(cat "$PID_FILE"))"
        echo "📝 Log file: $LOG_FILE"
        echo "🔊 Test: curl -X POST http://localhost:$PORT/notify -H 'Content-Type: application/json' -d '{\"message\":\"Hello!\"}'"
    else
        echo "❌ Failed to start voice server"
        echo "📝 Check log: cat $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  No PID file found - server may not be running"
        # Try to find and kill by port
        PID=$(lsof -ti:$PORT 2>/dev/null)
        if [ -n "$PID" ]; then
            echo "🔍 Found process on port $PORT (PID: $PID)"
            kill "$PID" 2>/dev/null
            echo "✅ Stopped process on port $PORT"
        fi
        return 0
    fi

    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "🛑 Stopping voice server (PID: $PID)..."
        kill "$PID"
        rm -f "$PID_FILE"
        echo "✅ Voice server stopped"
    else
        echo "⚠️  Process $PID not running, cleaning up PID file"
        rm -f "$PID_FILE"
    fi
}

restart() {
    echo "🔄 Restarting voice server..."
    stop
    sleep 1
    start
}

status() {
    echo "📊 PAI Voice Server Status"
    echo "========================="

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ Running (PID: $PID)"
        else
            echo "❌ PID file exists but process not running"
        fi
    else
        echo "⏹️  Not running (no PID file)"
    fi

    # Check if port is in use
    if lsof -i:$PORT -sTCP:LISTEN > /dev/null 2>&1; then
        echo "🔌 Port $PORT: IN USE"
    else
        echo "🔌 Port $PORT: FREE"
    fi

    # Health check
    echo ""
    echo "🏥 Health Check:"
    if curl -s "http://localhost:$PORT/health" 2>/dev/null | head -c 200; then
        echo ""
    else
        echo "❌ Server not responding"
    fi
}

test_notification() {
    echo "🧪 Sending test notification..."

    RESPONSE=$(curl -s -X POST "http://localhost:$PORT/notify" \
        -H "Content-Type: application/json" \
        -d '{"message": "PAI Voice Server test notification"}')

    echo "📨 Response: $RESPONSE"
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    test)
        test_notification
        ;;
    *)
        echo "PAI Voice Server Management"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the voice server"
        echo "  stop    - Stop the voice server"
        echo "  restart - Restart the voice server"
        echo "  status  - Check server status"
        echo "  test    - Send a test notification"
        exit 1
        ;;
esac
