#!/bin/bash
# $PAI_DIR/observability/manage.sh
# Observability Dashboard Manager

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure bun is in PATH
# Only add Homebrew path if it exists (macOS-specific)
if [ -d "/opt/homebrew/bin" ]; then
  export PATH="$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
else
  export PATH="$HOME/.bun/bin:/usr/local/bin:$PATH"
fi

case "${1:-}" in
    start)
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "Already running. Use: manage.sh restart"
            exit 1
        fi

        # Start server
        cd "$SCRIPT_DIR/apps/server"
        bun run dev >/dev/null 2>&1 &
        SERVER_PID=$!

        # Wait for server
        for i in {1..10}; do
            curl -s http://localhost:4000/health >/dev/null 2>&1 && break
            sleep 1
        done

        # Start client
        cd "$SCRIPT_DIR/apps/client"
        bun run dev >/dev/null 2>&1 &
        CLIENT_PID=$!

        # Wait for client
        for i in {1..10}; do
            curl -s http://localhost:5172 >/dev/null 2>&1 && break
            sleep 1
        done

        echo "Observability running at http://localhost:5172"

        cleanup() {
            kill $SERVER_PID $CLIENT_PID 2>/dev/null
            exit 0
        }
        trap cleanup INT
        wait $SERVER_PID $CLIENT_PID
        ;;

    stop)
        SERVER_PID=$(lsof -ti :4000 2>/dev/null)
        CLIENT_PID=$(lsof -ti :5172 2>/dev/null)

        [ -n "$SERVER_PID" ] && kill -9 $SERVER_PID 2>/dev/null
        [ -n "$CLIENT_PID" ] && kill -9 $CLIENT_PID 2>/dev/null

        pkill -9 -f "observability/apps/(server|client)" 2>/dev/null

        sleep 0.5
        echo "Observability stopped"
        ;;

    restart)
        echo "Restarting..."
        "$0" stop 2>/dev/null
        sleep 2
        exec "$0" start
        ;;

    status)
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "Running at http://localhost:5172"
        else
            echo "Not running"
        fi
        ;;

    start-detached)
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "Already running. Use: manage.sh restart"
            exit 1
        fi

        cd "$SCRIPT_DIR/apps/server"
        nohup bun run dev >/dev/null 2>&1 &
        disown

        for i in {1..10}; do
            curl -s http://localhost:4000/health >/dev/null 2>&1 && break
            sleep 1
        done

        cd "$SCRIPT_DIR/apps/client"
        nohup bun run dev >/dev/null 2>&1 &
        disown

        for i in {1..10}; do
            curl -s http://localhost:5172 >/dev/null 2>&1 && break
            sleep 1
        done

        echo "Observability running at http://localhost:5172"
        ;;

    *)
        echo "Usage: manage.sh {start|stop|restart|status|start-detached}"
        exit 1
        ;;
esac
