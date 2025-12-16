#!/bin/bash
# Observability Dashboard Manager - Part of voice-server infrastructure
# Location: ~/.claude/voice-server/observability/

# Configuration
HOST="localhost"  # localhost: local only, 0.0.0.0: network access

# Port configuration
SERVER_PORT=4000   # Backend API port
CLIENT_PORT=5172   # Frontend dashboard port

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${1:-}" in
    start)
        # Check if already running
        if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "❌ Already running. Use: manage.sh restart"
            exit 1
        fi

        # Start server (silent)
        cd "$SCRIPT_DIR/apps/server"
        bun run dev >/dev/null 2>&1 &
        SERVER_PID=$!

        # Wait for server
        for i in {1..10}; do
            curl -s http://$HOST:$SERVER_PORT/events/filter-options >/dev/null 2>&1 && break
            sleep 1
        done

        # Start client (silent)
        cd "$SCRIPT_DIR/apps/client"
        bun run dev >/dev/null 2>&1 &
        CLIENT_PID=$!

        # Wait for client
        for i in {1..10}; do
            curl -s http://$HOST:$CLIENT_PORT >/dev/null 2>&1 && break
            sleep 1
        done

        echo "✅ Observability running at http://$HOST:$CLIENT_PORT"

        # Cleanup on exit
        cleanup() {
            kill $SERVER_PID $CLIENT_PID 2>/dev/null
            exit 0
        }
        trap cleanup INT
        wait $SERVER_PID $CLIENT_PID
        ;;

    stop)
        # Kill processes (silent)
        for port in $SERVER_PORT $CLIENT_PORT; do
            if [[ "$OSTYPE" == "darwin"* ]]; then
                PIDS=$(lsof -ti :$port 2>/dev/null)
            else
                PIDS=$(lsof -ti :$port 2>/dev/null || fuser -n tcp $port 2>/dev/null | awk '{print $2}')
            fi
            [ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null
        done

        # Kill remaining bun processes
        ps aux | grep -E "bun.*(apps/(server|client))" | grep -v grep | awk '{print $2}' | while read PID; do
            [ -n "$PID" ] && kill -9 $PID 2>/dev/null
        done

        # Clean SQLite WAL files
        rm -f "$SCRIPT_DIR/apps/server/events.db-wal" "$SCRIPT_DIR/apps/server/events.db-shm" 2>/dev/null

        echo "✅ Observability stopped"
        ;;

    restart)
        echo "🔄 Restarting..."
        "$0" stop 2>/dev/null
        sleep 1
        exec "$0" start
        ;;

    status)
        if lsof -Pi :$SERVER_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Running at http://$HOST:$CLIENT_PORT"
        else
            echo "❌ Not running"
        fi
        ;;

    *)
        echo "Usage: manage.sh {start|stop|restart|status}"
        exit 1
        ;;
esac
