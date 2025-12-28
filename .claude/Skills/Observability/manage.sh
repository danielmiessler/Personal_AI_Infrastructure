#!/bin/bash
# Observability Dashboard Manager - PAI Agent Activity Monitor
# Location: ~/.claude/skills/observability/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "${1:-}" in
    start)
        # Check if already running
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "❌ Already running. Use: manage.sh restart"
            exit 1
        fi

        # Start server (silent)
        cd "$SCRIPT_DIR/apps/server"
        bun run dev >/dev/null 2>&1 &
        SERVER_PID=$!

        # Wait for server
        for i in {1..10}; do
            curl -s http://localhost:4000/events/filter-options >/dev/null 2>&1 && break
            sleep 1
        done

        # Start client (silent)
        cd "$SCRIPT_DIR/apps/client"
        bun run dev >/dev/null 2>&1 &
        CLIENT_PID=$!

        # Wait for client
        for i in {1..10}; do
            curl -s http://localhost:5172 >/dev/null 2>&1 && break
            sleep 1
        done

        echo "✅ Observability running at http://localhost:5172"

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
        for port in 4000 5172; do
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
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Running at http://localhost:5172"
        else
            echo "❌ Not running"
        fi
        ;;

    docker-start)
        echo "🐳 Starting observability via Docker..."
        cd "$SCRIPT_DIR"
        docker compose up -d

        # Wait for services to be healthy
        echo "⏳ Waiting for services to be healthy..."
        for i in {1..30}; do
            if docker compose ps | grep -q "healthy"; then
                break
            fi
            sleep 1
        done

        echo "✅ Observability running at http://localhost:5172"
        echo "📊 View logs: manage.sh docker-logs"
        ;;

    docker-stop)
        echo "🛑 Stopping Docker containers..."
        cd "$SCRIPT_DIR"
        docker compose down
        echo "✅ Observability stopped"
        ;;

    docker-restart)
        echo "🔄 Restarting Docker containers..."
        cd "$SCRIPT_DIR"
        docker compose restart
        echo "✅ Observability restarted"
        ;;

    docker-status)
        cd "$SCRIPT_DIR"
        docker compose ps
        ;;

    docker-logs)
        cd "$SCRIPT_DIR"
        # Follow logs for both services, or specific service if provided
        if [ -n "$2" ]; then
            docker compose logs -f "$2"
        else
            docker compose logs -f
        fi
        ;;

    docker-build)
        echo "🔨 Building Docker images..."
        cd "$SCRIPT_DIR"
        docker compose build
        echo "✅ Build complete"
        ;;

    *)
        echo "Usage: manage.sh {start|stop|restart|status|docker-start|docker-stop|docker-restart|docker-status|docker-logs|docker-build}"
        echo ""
        echo "Shell Script Mode (default):"
        echo "  start         - Start using background processes"
        echo "  stop          - Stop background processes"
        echo "  restart       - Restart background processes"
        echo "  status        - Check if running"
        echo ""
        echo "Docker Mode (recommended):"
        echo "  docker-start  - Start using Docker containers"
        echo "  docker-stop   - Stop Docker containers"
        echo "  docker-restart- Restart Docker containers"
        echo "  docker-status - Show Docker container status"
        echo "  docker-logs   - Follow container logs (optional: specify 'server' or 'client')"
        echo "  docker-build  - Rebuild Docker images"
        exit 1
        ;;
esac
