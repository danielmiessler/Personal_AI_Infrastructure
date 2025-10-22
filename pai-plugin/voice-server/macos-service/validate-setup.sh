#!/bin/bash

# PAIVoice Server Setup Validator
# This script checks if everything is properly configured

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 PAIVoice Server Setup Validator"
echo "=========================================="
echo ""

ISSUES_FOUND=0
WARNINGS_FOUND=0

# Function to check requirements
check_requirement() {
    local name=$1
    local check_command=$2
    local install_hint=$3
    
    if eval "$check_command" &>/dev/null; then
        echo -e "${GREEN}✅ $name${NC}"
        return 0
    else
        echo -e "${RED}❌ $name${NC}"
        echo "   $install_hint"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
        return 1
    fi
}

# Function to check warnings
check_warning() {
    local name=$1
    local check_command=$2
    local hint=$3
    
    if eval "$check_command" &>/dev/null; then
        echo -e "${GREEN}✅ $name${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $name${NC}"
        echo "   $hint"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        return 1
    fi
}

echo "📋 Checking Requirements:"
echo ""

# Check Bun installation
check_requirement "Bun installed" \
    "command -v bun" \
    "Install with: curl -fsSL https://bun.sh/install | bash"

# Check server.ts exists
check_requirement "Server file exists" \
    "[ -f ~/.claude/voice-server/server.ts ]" \
    "Server file missing at ~/.claude/voice-server/server.ts"

# Check if port 8888 is available or used by our service
PORT_CHECK=$(lsof -i :8888 2>/dev/null | grep -v COMMAND | head -1)
if [ -z "$PORT_CHECK" ]; then
    echo -e "${GREEN}✅ Port 8888 available${NC}"
elif echo "$PORT_CHECK" | grep -q "bun"; then
    echo -e "${GREEN}✅ Port 8888 used by voice server (bun)${NC}"
else
    echo -e "${RED}❌ Port 8888 used by another service${NC}"
    echo "   Stop the conflicting service or change PORT in ~/.env"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
echo "🔑 Checking API Configuration:"
echo ""

# Check ~/.env file exists
if [ -f ~/.env ]; then
    echo -e "${GREEN}✅ ~/.env file exists${NC}"
    
    # Check for ElevenLabs API key
    if grep -q "ELEVENLABS_API_KEY=" ~/.env 2>/dev/null; then
        # Check if it's not a placeholder
        API_KEY=$(grep "ELEVENLABS_API_KEY=" ~/.env | cut -d'=' -f2)
        if [[ "$API_KEY" == "your_api_key_here" ]] || [[ -z "$API_KEY" ]]; then
            check_warning "ElevenLabs API key configured" \
                "false" \
                "Replace placeholder with actual API key from https://elevenlabs.io"
        else
            echo -e "${GREEN}✅ ElevenLabs API key configured${NC}"
            
            # Check if voice ID is set
            if grep -q "ELEVENLABS_VOICE_ID=" ~/.env 2>/dev/null; then
                echo -e "${GREEN}✅ Custom voice ID configured${NC}"
            else
                echo -e "${BLUE}ℹ️  Using default voice (Kai)${NC}"
            fi
        fi
    else
        check_warning "ElevenLabs API key configured" \
            "false" \
            "Add ELEVENLABS_API_KEY=your_key to ~/.env for AI voices"
    fi
else
    check_warning "~/.env file exists" \
        "false" \
        "Create ~/.env and add ELEVENLABS_API_KEY=your_key for AI voices"
fi

echo ""
echo "🚀 Checking Service Status:"
echo ""

# Check if service is installed
if [ -f ~/Library/LaunchAgents/com.kainotify.voice-server.plist ]; then
    echo -e "${GREEN}✅ Service is installed${NC}"
    
    # Check if service is running
    if launchctl list | grep -q "com.kainotify.voice-server"; then
        STATUS_LINE=$(launchctl list | grep "com.kainotify.voice-server")
        PID=$(echo "$STATUS_LINE" | awk '{print $1}')
        
        if [ "$PID" != "-" ]; then
            echo -e "${GREEN}✅ Service is running (PID: $PID)${NC}"
            
            # Test server endpoint
            if curl -s http://localhost:8888/health > /dev/null 2>&1; then
                echo -e "${GREEN}✅ Server is responding${NC}"
            else
                echo -e "${RED}❌ Server not responding${NC}"
                echo "   Check logs: tail -f ~/.claude/voice-server/logs/voice-server-error.log"
                ISSUES_FOUND=$((ISSUES_FOUND + 1))
            fi
        else
            echo -e "${YELLOW}⚠️  Service is loaded but not running${NC}"
            echo "   Start with: launchctl start com.kainotify.voice-server"
            WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
        fi
    else
        echo -e "${YELLOW}⚠️  Service is installed but not loaded${NC}"
        echo "   Load with: launchctl load ~/Library/LaunchAgents/com.kainotify.voice-server.plist"
        WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
    fi
else
    echo -e "${BLUE}ℹ️  Service not installed${NC}"
    echo "   Install with: ./install.sh"
fi

echo ""
echo "📊 Summary:"
echo "=========="

if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✨ Everything looks good! Your setup is complete.${NC}"
    echo ""
    echo "Test the server with:"
    echo "  ./voice-server-ctl.sh test"
elif [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Setup is functional with $WARNINGS_FOUND warning(s)${NC}"
    echo "The server will work but some features may be limited."
else
    echo -e "${RED}❌ Found $ISSUES_FOUND critical issue(s) and $WARNINGS_FOUND warning(s)${NC}"
    echo "Please fix the critical issues before proceeding."
    exit 1
fi

echo ""
echo "📚 Quick Commands:"
echo "  Install service:  ./install.sh"
echo "  Test server:      ./voice-server-ctl.sh test"
echo "  View logs:        ./voice-server-ctl.sh logs"
echo "  Check status:     ./voice-server-ctl.sh status"