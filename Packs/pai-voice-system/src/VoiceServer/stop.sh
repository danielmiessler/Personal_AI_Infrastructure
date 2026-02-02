#!/bin/bash

# Stop the PAI Voice Server
# Stops both the main server (8888) and Qwen3-TTS server (8889)

PID_DIR="$HOME/.claude/VoiceServer/pids"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PAI Voice Server Shutdown${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

STOPPED=0

# Stop main server
if [ -f "$PID_DIR/voice-server.pid" ]; then
    PID=$(cat "$PID_DIR/voice-server.pid")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}> Stopping main server (PID: $PID)...${NC}"
        kill "$PID" 2>/dev/null
        sleep 1
        if ps -p "$PID" > /dev/null 2>&1; then
            kill -9 "$PID" 2>/dev/null
        fi
        echo -e "${GREEN}✓ Main server stopped${NC}"
        STOPPED=$((STOPPED + 1))
    fi
    rm -f "$PID_DIR/voice-server.pid"
fi

# Stop Qwen3-TTS server
if [ -f "$PID_DIR/qwen3-server.pid" ]; then
    PID=$(cat "$PID_DIR/qwen3-server.pid")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}> Stopping Qwen3-TTS server (PID: $PID)...${NC}"
        kill "$PID" 2>/dev/null
        sleep 1
        if ps -p "$PID" > /dev/null 2>&1; then
            kill -9 "$PID" 2>/dev/null
        fi
        echo -e "${GREEN}✓ Qwen3-TTS server stopped${NC}"
        STOPPED=$((STOPPED + 1))
    fi
    rm -f "$PID_DIR/qwen3-server.pid"
fi

# Clean up any remaining processes on the ports
cleanup_port() {
    local PORT=$1
    local NAME=$2

    # Linux: use ss or netstat
    if command -v ss &> /dev/null; then
        PIDS=$(ss -tlnp "sport = :$PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)
    elif command -v lsof &> /dev/null; then
        PIDS=$(lsof -ti :$PORT 2>/dev/null)
    else
        PIDS=""
    fi

    if [ -n "$PIDS" ]; then
        echo -e "${YELLOW}> Cleaning up port $PORT ($NAME)...${NC}"
        for PID in $PIDS; do
            kill "$PID" 2>/dev/null
        done
        sleep 1
        # Force kill if still running
        if command -v lsof &> /dev/null; then
            lsof -ti :$PORT 2>/dev/null | xargs -r kill -9 2>/dev/null
        fi
        echo -e "${GREEN}✓ Port $PORT cleared${NC}"
        STOPPED=$((STOPPED + 1))
    fi
}

cleanup_port 8888 "main server"
cleanup_port 8889 "Qwen3-TTS"

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ $STOPPED -eq 0 ]; then
    echo -e "${YELLOW}! No servers were running${NC}"
else
    echo -e "${GREEN}✓ Voice servers stopped${NC}"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
