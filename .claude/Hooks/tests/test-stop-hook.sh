#!/bin/bash
# Test script for stop-hook.ts
# Tests main assistant completion hook with voice notification

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Testing stop-hook.ts                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if hook file exists
if [ ! -f "$HOOKS_DIR/stop-hook.ts" ]; then
    echo -e "${RED}❌ Hook file not found: $HOOKS_DIR/stop-hook.ts${NC}"
    exit 1
fi

# Check if hook is executable
if [ ! -x "$HOOKS_DIR/stop-hook.ts" ]; then
    echo -e "${YELLOW}⚠️  Hook is not executable, making it executable...${NC}"
    chmod +x "$HOOKS_DIR/stop-hook.ts"
fi

echo -e "${BLUE}📋 Test Information:${NC}"
echo "   Hook: stop-hook.ts"
echo "   Function: Main assistant completion notification"
echo "   Expected: Voice notification when task completes"
echo ""

# Create a test transcript file with proper PAI response format
TEST_TRANSCRIPT="$SCRIPT_DIR/test-transcript.jsonl"
cat > "$TEST_TRANSCRIPT" << 'EOF'
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello, can you help me with a test?"}]},"timestamp":"2025-01-15T10:00:00Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"SUMMARY: Test request received and processed\nANALYSIS: User wants to test the stop-hook functionality\nACTIONS: Preparing test response with proper format\nRESULTS: Test response created successfully\nSTATUS: Hook test ready\nCAPTURE: Testing stop-hook.ts voice notification system\nNEXT: Voice notification should trigger\nSTORY EXPLANATION:\n1. User requested a test of the stop-hook system\n2. System received the test request\n3. Prepared response in PAI format\n4. Included all required sections\n5. Added COMPLETED line for voice output\n6. Stop-hook will extract COMPLETED message\n7. Voice notification will be sent\n8. Test validates full notification pipeline\n🎯 COMPLETED: Stop-hook test executed successfully with voice notification"}]},"timestamp":"2025-01-15T10:00:10Z"}
EOF

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Running stop-hook...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run the hook with test input
echo "{\"transcript_path\":\"$TEST_TRANSCRIPT\"}" | bun "$HOOKS_DIR/stop-hook.ts" 2>&1

EXIT_CODE=$?

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Test completed successfully${NC}"
    echo ""
    echo -e "${BLUE}Expected behavior:${NC}"
    echo "   1. Reads transcript for task information"
    echo "   2. Extracts COMPLETED message (12 words max)"
    echo "   3. Updates terminal tab title"
    echo "   4. Sends voice notification with DA voice"
    echo "   5. No errors in output"
else
    echo -e "${RED}❌ Test failed with exit code: $EXIT_CODE${NC}"
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Notes:${NC}"
echo "   • This hook runs automatically when main assistant completes a task"
echo "   • Extracts COMPLETED line from response format"
echo "   • Updates tab title to show task status"
echo "   • Sends voice notification to configured voice server"
echo ""

# Keep test file for reference (referenced by other tests)
echo -e "${YELLOW}ℹ️  Test transcript preserved at: $TEST_TRANSCRIPT${NC}"
echo ""

exit $EXIT_CODE
