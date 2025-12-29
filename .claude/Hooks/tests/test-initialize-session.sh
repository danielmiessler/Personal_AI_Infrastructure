#!/bin/bash
# Test script for initialize-session.ts
# Tests session start hook with voice notification and tab title setting

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing initialize-session.ts        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if hook file exists
if [ ! -f "$HOOKS_DIR/initialize-session.ts" ]; then
    echo -e "${RED}❌ Hook file not found: $HOOKS_DIR/initialize-session.ts${NC}"
    exit 1
fi

# Check if hook is executable
if [ ! -x "$HOOKS_DIR/initialize-session.ts" ]; then
    echo -e "${YELLOW}⚠️  Hook is not executable, making it executable...${NC}"
    chmod +x "$HOOKS_DIR/initialize-session.ts"
fi

echo -e "${BLUE}📋 Test Information:${NC}"
echo "   Hook: initialize-session.ts"
echo "   Function: Session start notification"
echo "   Expected: DA greeting voice notification + tab title"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Running initialize-session hook...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run the hook (no input needed for initialize-session)
# It will detect it's not a subagent and send greeting notification
bun "$HOOKS_DIR/initialize-session.ts" 2>&1

EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Test completed successfully${NC}"
    echo ""
    echo -e "${BLUE}Expected behavior:${NC}"
    echo "   1. Stop-hook configuration tested"
    echo "   2. Tab title set to 'DA Ready' (e.g., 'PAI Ready')"
    echo "   3. Voice notification: 'DA here, ready to go'"
    echo "   4. No errors in output"
else
    echo -e "${RED}❌ Test failed with exit code: $EXIT_CODE${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Notes:${NC}"
echo "   • This hook runs automatically on session start"
echo "   • Skips subagent sessions automatically"
echo "   • Debounces duplicate SessionStart events"
echo "   • Voice notification goes to voice server on configured port"
echo ""

exit $EXIT_CODE
