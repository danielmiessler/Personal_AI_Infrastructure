#!/bin/bash

# PAIVoice Server Service Control Script
# Manage the voice server macOS service

PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SERVICE_NAME="com.paivoice.server"
PLIST_FILE="com.paivoice.server.plist"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
VOICE_SERVER_DIR="$PAI_DIR/VoiceServer"
SERVER_URL="http://localhost:8888"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_usage() {
    echo "PAIVoice Server Control"
    echo "Usage: $0 {start|stop|restart|status|logs|test|install|uninstall}"
    echo ""
    echo "Commands:"
    echo "  start      - Start the voice server service"
    echo "  stop       - Stop the voice server service"
    echo "  restart    - Restart the voice server service"
    echo "  status     - Show service status"
    echo "  logs       - Tail the service logs"
    echo "  test       - Test the server with a notification"
    echo "  install    - Install the service"
    echo "  uninstall  - Uninstall the service"
}

function check_service_installed() {
    if [ ! -f "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}" ]; then
        echo -e "${RED}❌ Service is not installed${NC}"
        echo "Run: $0 install"
        exit 1
    fi
}

function start_service() {
    check_service_installed
    echo -e "${BLUE}🚀 Starting voice server...${NC}"
    launchctl start "${SERVICE_NAME}"
    sleep 2
    status_service
}

function stop_service() {
    check_service_installed
    echo -e "${YELLOW}⏹️  Stopping voice server...${NC}"
    launchctl stop "${SERVICE_NAME}"
    echo -e "${GREEN}✅ Service stopped${NC}"
}

function restart_service() {
    check_service_installed
    echo -e "${BLUE}🔄 Restarting voice server...${NC}"
    launchctl stop "${SERVICE_NAME}" 2>/dev/null || true
    sleep 1
    launchctl start "${SERVICE_NAME}"
    sleep 2
    status_service
}

function status_service() {
    echo -e "${BLUE}📊 Service Status:${NC}"
    
    # Check if plist is installed
    if [ ! -f "${LAUNCH_AGENTS_DIR}/${PLIST_FILE}" ]; then
        echo -e "${RED}❌ Service not installed${NC}"
        return 1
    fi
    
    # Check launchctl status
    if launchctl list | grep -q "${SERVICE_NAME}"; then
        STATUS_LINE=$(launchctl list | grep "${SERVICE_NAME}")
        PID=$(echo "$STATUS_LINE" | awk '{print $1}')
        EXIT_CODE=$(echo "$STATUS_LINE" | awk '{print $2}')
        
        if [ "$PID" != "-" ]; then
            echo -e "${GREEN}✅ Service is running (PID: $PID)${NC}"
            
            # Test server endpoint
            if curl -s "${SERVER_URL}/health" > /dev/null 2>&1; then
                HEALTH=$(curl -s "${SERVER_URL}/health")
                echo -e "${GREEN}✅ Server is responding${NC}"
                echo "   Health: $HEALTH"
            else
                echo -e "${YELLOW}⚠️  Server not responding on port 8888${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Service is loaded but not running${NC}"
            if [ "$EXIT_CODE" != "0" ]; then
                echo "   Last exit code: $EXIT_CODE"
            fi
        fi
    else
        echo -e "${RED}❌ Service is not loaded${NC}"
    fi
    
    # Check for log files
    if [ -f "${VOICE_SERVER_DIR}/logs/voice-server.log" ]; then
        echo ""
        echo "📋 Recent logs:"
        tail -n 5 "${VOICE_SERVER_DIR}/logs/voice-server.log" 2>/dev/null | sed 's/^/   /'
    fi
}

function show_logs() {
    check_service_installed
    echo -e "${BLUE}📋 Tailing voice server logs...${NC}"
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Create logs directory if it doesn't exist
    mkdir -p "${VOICE_SERVER_DIR}/logs"
    touch "${VOICE_SERVER_DIR}/logs/voice-server.log"
    touch "${VOICE_SERVER_DIR}/logs/voice-server-error.log"
    
    # Tail both log files
    tail -f "${VOICE_SERVER_DIR}/logs/voice-server.log" "${VOICE_SERVER_DIR}/logs/voice-server-error.log"
}

function test_server() {
    echo -e "${BLUE}🧪 Testing voice server...${NC}"
    
    # Check if server is running
    if ! curl -s "${SERVER_URL}/health" > /dev/null 2>&1; then
        echo -e "${RED}❌ Server is not running${NC}"
        echo "Start it with: $0 start"
        exit 1
    fi
    
    echo "Sending test notification..."
    
    RESPONSE=$(curl -s -X POST "${SERVER_URL}/notify" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Voice Server Test",
            "message": "Hello! This is a test notification from the voice server.",
            "voice_enabled": true
        }')
    
    if echo "$RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✅ Test notification sent successfully!${NC}"
        echo "   You should see a notification and hear the voice."
    else
        echo -e "${RED}❌ Test failed${NC}"
        echo "   Response: $RESPONSE"
    fi
}

function install_service() {
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    "${SCRIPT_DIR}/install.sh"
}

function uninstall_service() {
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    "${SCRIPT_DIR}/uninstall.sh"
}

# Main command handling
case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        status_service
        ;;
    logs)
        show_logs
        ;;
    test)
        test_server
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    *)
        print_usage
        exit 1
        ;;
esac