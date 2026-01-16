#!/bin/bash

# PAI Mobile App Management Script
# Usage: ./manage.sh [start|stop|restart|dev|build|status]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/apps/server"
CLIENT_DIR="$SCRIPT_DIR/apps/client"
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/server.log"
DEV_FLAG="$SCRIPT_DIR/.dev-mode"
PLIST_NAME="com.pai.mobile"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

start_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Server already running (PID: $PID)${NC}"
            return 1
        fi
    fi

    echo -e "${GREEN}Starting PAI Mobile server...${NC}"
    cd "$SERVER_DIR"
    nohup bun src/index.ts > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1

    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        echo -e "${GREEN}Server started (PID: $(cat "$PID_FILE"))${NC}"
        echo -e "  API: http://localhost:5050/api"
        echo -e "  App: http://localhost:5050"
    else
        echo -e "${RED}Failed to start server${NC}"
        cat "$LOG_FILE"
        return 1
    fi
}

stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping server (PID: $PID)...${NC}"
            kill "$PID"
            rm -f "$PID_FILE"
            echo -e "${GREEN}Server stopped${NC}"
        else
            echo -e "${YELLOW}Server not running (stale PID file)${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}Server not running${NC}"
    fi
}

status() {
    # Check for manual PID file
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${GREEN}Server running (PID: $PID, manual)${NC}"
            echo -e "  API: http://localhost:5050/api"
            echo -e "  App: http://localhost:5050"
            return 0
        fi
    fi

    # Check for launchd-managed process
    LAUNCHD_PID=$(pgrep -f "service-wrapper.sh" 2>/dev/null || pgrep -f "bun.*src/index.ts" 2>/dev/null | head -1)
    if [ -n "$LAUNCHD_PID" ]; then
        echo -e "${GREEN}Server running (PID: $LAUNCHD_PID, launchd)${NC}"
        echo -e "  API: http://localhost:5050/api"
        echo -e "  App: http://localhost:5050"
        return 0
    fi

    echo -e "${RED}Server not running${NC}"
    return 1
}

dev() {
    echo -e "${GREEN}Starting development servers...${NC}"

    # Create dev mode flag
    touch "$DEV_FLAG"
    echo -e "${YELLOW}Dev mode enabled (auto-restart disabled)${NC}"

    # Stop production server and unload launchd service if loaded
    stop_server
    if launchctl list | grep -q "$PLIST_NAME"; then
        launchctl unload "$PLIST_DEST" 2>/dev/null
        echo -e "${YELLOW}Launchd service paused${NC}"
    fi

    # Cleanup function
    cleanup() {
        echo -e "\n${YELLOW}Stopping development servers...${NC}"
        kill $SERVER_PID $CLIENT_PID 2>/dev/null
        rm -f "$DEV_FLAG"
        echo -e "${GREEN}Dev mode disabled${NC}"

        # Re-enable launchd service if it was installed
        if [ -f "$PLIST_DEST" ]; then
            launchctl load "$PLIST_DEST" 2>/dev/null
            echo -e "${GREEN}Launchd service resumed${NC}"
        fi
        exit 0
    }

    trap cleanup INT TERM

    # Start server in dev mode
    cd "$SERVER_DIR"
    bun install
    bun --watch src/index.ts &
    SERVER_PID=$!

    # Start client in dev mode
    cd "$CLIENT_DIR"
    bun install
    bun run dev &
    CLIENT_PID=$!

    echo -e "${GREEN}Development servers started${NC}"
    echo -e "  Server: http://localhost:5050"
    echo -e "  Client: http://localhost:5173"
    echo -e "${YELLOW}Press Ctrl+C to stop (will re-enable auto-restart)${NC}"

    wait
}

build() {
    echo -e "${GREEN}Building client...${NC}"
    cd "$CLIENT_DIR"
    bun install
    bun run build

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Build complete!${NC}"
        echo -e "  Output: $CLIENT_DIR/dist"
    else
        echo -e "${RED}Build failed${NC}"
        return 1
    fi
}

install_deps() {
    echo -e "${GREEN}Installing dependencies...${NC}"
    cd "$SERVER_DIR" && bun install
    cd "$CLIENT_DIR" && bun install
    echo -e "${GREEN}Dependencies installed${NC}"
}

service_install() {
    # Make wrapper executable
    chmod +x "$SCRIPT_DIR/service-wrapper.sh"

    # Create LaunchAgents directory if needed
    mkdir -p "$HOME/Library/LaunchAgents"

    # Generate plist with current SCRIPT_DIR (substitute placeholder)
    sed "s|__SCRIPT_DIR__|$SCRIPT_DIR|g" "$PLIST_SRC" > "$PLIST_DEST"

    # Stop manual server if running
    stop_server

    # Kill any existing process on port 5050
    lsof -ti:5050 | xargs kill -9 2>/dev/null
    sleep 1

    # Unload old service if exists (to pick up new paths)
    launchctl unload "$PLIST_DEST" 2>/dev/null

    # Load service
    launchctl load "$PLIST_DEST"

    echo -e "${GREEN}Launchd service installed and started${NC}"
    echo -e "  Server will now auto-restart on crash/reboot"
    echo -e "  Use '${YELLOW}./manage.sh dev${NC}' for development (auto-restart paused)"
    service_status
}

service_uninstall() {
    if [ -f "$PLIST_DEST" ]; then
        launchctl unload "$PLIST_DEST" 2>/dev/null
        rm -f "$PLIST_DEST"
        echo -e "${GREEN}Launchd service uninstalled${NC}"
    else
        echo -e "${YELLOW}Launchd service not installed${NC}"
    fi
    rm -f "$DEV_FLAG"
}

service_status() {
    echo ""
    if [ -f "$PLIST_DEST" ]; then
        echo -e "${GREEN}Launchd service: installed${NC}"
        if launchctl list | grep -q "$PLIST_NAME"; then
            echo -e "  Status: ${GREEN}loaded (auto-restart active)${NC}"
        else
            echo -e "  Status: ${YELLOW}unloaded${NC}"
        fi
    else
        echo -e "${YELLOW}Launchd service: not installed${NC}"
        echo -e "  Run '${GREEN}./manage.sh service install${NC}' to enable auto-restart"
    fi

    if [ -f "$DEV_FLAG" ]; then
        echo -e "  Dev mode: ${YELLOW}active (auto-restart paused)${NC}"
    fi
}

service_logs() {
    if [ -f "$SCRIPT_DIR/launchd.log" ]; then
        tail -50 "$SCRIPT_DIR/launchd.log"
    else
        echo -e "${YELLOW}No launchd logs found${NC}"
    fi
}

case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        stop_server
        sleep 1
        start_server
        ;;
    dev)
        dev
        ;;
    build)
        build
        ;;
    status)
        status
        service_status
        ;;
    install)
        install_deps
        ;;
    service)
        case "$2" in
            install)
                service_install
                ;;
            uninstall)
                service_uninstall
                ;;
            status)
                service_status
                ;;
            logs)
                service_logs
                ;;
            *)
                echo "Service commands:"
                echo "  service install   - Enable auto-restart on crash/reboot"
                echo "  service uninstall - Disable auto-restart"
                echo "  service status    - Show service status"
                echo "  service logs      - Show launchd logs"
                exit 1
                ;;
        esac
        ;;
    *)
        echo "PAI Mobile App Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|dev|build|status|install|service}"
        echo ""
        echo "Commands:"
        echo "  start   - Start production server (manual)"
        echo "  stop    - Stop production server"
        echo "  restart - Restart production server"
        echo "  dev     - Start development servers (hot reload, pauses auto-restart)"
        echo "  build   - Build client for production"
        echo "  status  - Check server status"
        echo "  install - Install dependencies"
        echo ""
        echo "Service (auto-restart):"
        echo "  service install   - Enable auto-restart on crash/reboot"
        echo "  service uninstall - Disable auto-restart"
        echo "  service status    - Show service status"
        echo "  service logs      - Show launchd logs"
        exit 1
        ;;
esac
