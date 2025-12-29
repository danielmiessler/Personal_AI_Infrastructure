#!/bin/bash
# Test script for context-compression-hook.ts
# Tests PreCompact hook with context compression notification

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing context-compression-hook.ts  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if hook file exists
if [ ! -f "$HOOKS_DIR/context-compression-hook.ts" ]; then
    echo -e "${RED}❌ Hook file not found: $HOOKS_DIR/context-compression-hook.ts${NC}"
    exit 1
fi

# Check if hook is executable
if [ ! -x "$HOOKS_DIR/context-compression-hook.ts" ]; then
    echo -e "${YELLOW}⚠️  Hook is not executable, making it executable...${NC}"
    chmod +x "$HOOKS_DIR/context-compression-hook.ts"
fi

echo -e "${BLUE}📋 Test Information:${NC}"
echo "   Hook: context-compression-hook.ts"
echo "   Function: Context compression notification"
echo "   Expected: Voice notification about compression"
echo ""

# Create a test transcript file with multiple messages
TEST_TRANSCRIPT="$SCRIPT_DIR/test-compression-transcript.jsonl"
cat > "$TEST_TRANSCRIPT" << 'EOF'
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"First message"}]},"timestamp":"2025-01-15T10:00:00Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"First response"}]},"timestamp":"2025-01-15T10:00:10Z"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Second message"}]},"timestamp":"2025-01-15T10:01:00Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Second response"}]},"timestamp":"2025-01-15T10:01:10Z"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Third message"}]},"timestamp":"2025-01-15T10:02:00Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Third response"}]},"timestamp":"2025-01-15T10:02:10Z"}
EOF

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Running context-compression hook...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run the hook with test input
echo "{\"transcript_path\":\"$TEST_TRANSCRIPT\",\"compact_type\":\"auto\"}" | bun "$HOOKS_DIR/context-compression-hook.ts" 2>&1

EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Test completed successfully${NC}"
    echo ""
    echo -e "${BLUE}Expected behavior:${NC}"
    echo "   1. Reads transcript to count messages"
    echo "   2. Calculates compression statistics"
    echo "   3. Voice notification about compression"
    echo "   4. Uses DA voice from settings.json"
    echo "   5. No errors in output"
else
    echo -e "${RED}❌ Test failed with exit code: $EXIT_CODE${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Notes:${NC}"
echo "   • This hook runs automatically before context compression"
echo "   • It counts messages in the transcript"
echo "   • Sends low-priority voice notification"
echo "   • Handles both manual and auto compression types"
echo ""

# Cleanup test file
rm -f "$TEST_TRANSCRIPT"

exit $EXIT_CODE
