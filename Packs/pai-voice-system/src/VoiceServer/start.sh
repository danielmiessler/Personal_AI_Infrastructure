#!/bin/bash

# Start the PAI Voice Server
# - TypeScript/Bun main server on port 8888
# - Python Qwen3-TTS server on port 8889 (when no ELEVENLABS_API_KEY)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$HOME/.claude/VoiceServer/pids"
LOG_DIR="$HOME/.claude/VoiceServer/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create directories
mkdir -p "$PID_DIR" "$LOG_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PAI Voice Server Startup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if main server is already running
if [ -f "$PID_DIR/voice-server.pid" ]; then
    PID=$(cat "$PID_DIR/voice-server.pid")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}! Main server already running (PID: $PID)${NC}"
        echo "  Use ./restart.sh to restart"
        exit 0
    fi
fi

# Load .env from home directory
if [ -f "$HOME/.env" ]; then
    export $(grep -v '^#' "$HOME/.env" | xargs)
fi

# Determine TTS mode
if [ -n "$ELEVENLABS_API_KEY" ]; then
    echo -e "${GREEN}✓ ElevenLabs API key found${NC}"
    echo -e "  Mode: ElevenLabs (cloud) → MP3"
    USE_QWEN3=false
else
    echo -e "${YELLOW}! No ELEVENLABS_API_KEY in ~/.env${NC}"
    echo -e "  Mode: Qwen3-TTS (local) → WAV"
    USE_QWEN3=true
fi

# Start Qwen3-TTS server if needed
if [ "$USE_QWEN3" = true ]; then
    echo -e "\n${YELLOW}> Starting Qwen3-TTS server (port 8889)...${NC}"

    # Check if already running
    if [ -f "$PID_DIR/qwen3-server.pid" ]; then
        QWEN3_PID=$(cat "$PID_DIR/qwen3-server.pid")
        if ps -p "$QWEN3_PID" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Qwen3-TTS server already running (PID: $QWEN3_PID)${NC}"
        else
            rm -f "$PID_DIR/qwen3-server.pid"
        fi
    fi

    if [ ! -f "$PID_DIR/qwen3-server.pid" ]; then
        # Check for Python
        if ! command -v python3 &> /dev/null; then
            echo -e "${RED}✗ Python3 not found${NC}"
            exit 1
        fi

        # Start Qwen3 server in background using venv
        cd "$SCRIPT_DIR"
        if [ -d ".venv" ]; then
            nohup .venv/bin/python qwen3-server.py >> "$LOG_DIR/qwen3-server.log" 2>&1 &
        else
            nohup python3 qwen3-server.py >> "$LOG_DIR/qwen3-server.log" 2>&1 &
        fi
        QWEN3_PID=$!
        echo "$QWEN3_PID" > "$PID_DIR/qwen3-server.pid"

        # Wait for server to start
        echo -e "  Waiting for Qwen3-TTS to initialize..."
        for i in {1..30}; do
            if curl -s -f http://127.0.0.1:8889/health > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Qwen3-TTS server started (PID: $QWEN3_PID)${NC}"
                break
            fi
            sleep 1
            if [ $i -eq 30 ]; then
                echo -e "${YELLOW}! Qwen3-TTS taking longer to start (model loading)${NC}"
                echo -e "  Check: tail -f $LOG_DIR/qwen3-server.log"
            fi
        done
    fi
fi

# Start main TypeScript server
echo -e "\n${YELLOW}> Starting main voice server (port 8888)...${NC}"

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo -e "${RED}✗ Bun not found. Install: curl -fsSL https://bun.sh/install | bash${NC}"
    exit 1
fi

cd "$SCRIPT_DIR"
nohup bun run server.ts >> "$LOG_DIR/voice-server.log" 2>&1 &
MAIN_PID=$!
echo "$MAIN_PID" > "$PID_DIR/voice-server.pid"

# Wait for server to start
sleep 2
if curl -s -f http://localhost:8888/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Main server started (PID: $MAIN_PID)${NC}"
else
    echo -e "${YELLOW}! Server started but not responding yet${NC}"
    echo -e "  Check: tail -f $LOG_DIR/voice-server.log"
fi

# Summary
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Voice Server Ready${NC}"
echo -e "  Main server: http://localhost:8888"
if [ "$USE_QWEN3" = true ]; then
    echo -e "  Qwen3-TTS:   http://localhost:8889 (internal)"
fi
echo -e "\n  Test: curl -X POST http://localhost:8888/notify \\"
echo -e "        -H 'Content-Type: application/json' \\"
echo -e "        -d '{\"message\":\"Hello from PAI\"}'"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
