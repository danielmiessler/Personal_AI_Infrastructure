#!/bin/bash

# configure-voice.sh - Voice Server Configuration Helper
# Helps users configure voice notifications for PAI-Boilerplate

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "Voice Server Configuration"
echo "=========================="
echo ""

# Check if voice server exists
if [ -d "$HOME/.claude/voice-server" ]; then
  echo -e "${GREEN}✅ Voice server found at ~/.claude/voice-server${NC}"
else
  echo -e "${YELLOW}⚠️  Voice server not found${NC}"
  echo "   Voice server setup: https://github.com/[your-repo]/voice-server"
  echo ""
fi

# Prompt for configuration
read -p "Enable voice notifications? (y/n): " enable_voice

if [ "$enable_voice" = "y" ]; then
  read -p "Voice server URL [http://localhost:8888]: " voice_url
  voice_url=${voice_url:-http://localhost:8888}

  read -p "Agents with voice (comma-separated, empty for all): " enabled_agents

  echo ""
  echo "Configuration:"
  echo "  ENABLE_VOICE=\"true\""
  echo "  VOICE_SERVER_URL=\"$voice_url\""
  echo "  VOICE_ENABLED_AGENTS=\"$enabled_agents\""
  echo ""
  echo "Add these to your ~/.claude/settings.json env section"
else
  echo ""
  echo "Configuration:"
  echo "  ENABLE_VOICE=\"false\""
  echo ""
  echo "Voice notifications will be disabled"
fi

echo ""
echo -e "${BLUE}ℹ️  To test voice server:${NC}"
echo "curl -X POST \$VOICE_SERVER_URL/notify \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"message\":\"Voice test\",\"voice_enabled\":true}'"
echo ""
