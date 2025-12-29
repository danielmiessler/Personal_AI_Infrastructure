#!/bin/bash
# Test script for subagent-stop-hook.ts
# Tests all agent types from voices.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(dirname "$SCRIPT_DIR")"

# Agent types from voices.json
AGENTS=("researcher" "engineer" "architect" "designer" "artist" "pentester" "writer" "main")

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to create a test transcript for an agent
create_agent_transcript() {
    local agent_type=$1
    # Capitalize first letter (portable - works on Linux and macOS)
    local agent_name="$(tr '[:lower:]' '[:upper:]' <<< "${agent_type:0:1}")${agent_type:1}"
    local transcript_file="$SCRIPT_DIR/test-subagent-${agent_type}.jsonl"

    # Only create if it doesn't exist
    if [ -f "$transcript_file" ]; then
        echo "$transcript_file"
        return
    fi

    cat > "$transcript_file" << EOF
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Research the latest updates"}]},"timestamp":"2025-01-15T10:00:00Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"task_123","name":"Task","input":{"subagent_type":"${agent_type}","prompt":"Research the latest updates"}}]},"timestamp":"2025-01-15T10:00:10Z"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"task_123","content":"${agent_name} agent completed the research.\n\nSUMMARY: Research completed\nANALYSIS: Found relevant information\nACTIONS: Gathered data from multiple sources\nRESULTS: Comprehensive research complete\nSTATUS: Task finished successfully\n\n🎯 COMPLETED: [AGENT:${agent_type}] I completed the research task successfully"}]},"timestamp":"2025-01-15T10:00:30Z"}
EOF

    echo "$transcript_file"
}

# Function to test a specific agent
test_agent() {
    local agent_type=$1
    local transcript_file=$(create_agent_transcript "$agent_type")

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Testing agent: ${agent_type}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # Run hook and let it complete fully (don't pipe to grep or it kills the fetch)
    echo "{\"transcript_path\":\"$transcript_file\"}" | bun "$HOOKS_DIR/subagent-stop-hook.ts" 2>&1 > /tmp/subagent-test-output.txt

    # After hook completes, show filtered output
    grep -E "✅|🔊|COMPLETED|Loaded" /tmp/subagent-test-output.txt 2>/dev/null || echo "  (Hook completed, check /tmp/subagent-test-output.txt for details)"

    echo ""
}

# Function to test all agents
test_all() {
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Testing All Agent Types              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN} Transcripts will be created in:${NC} ${SCRIPT_DIR}"
    echo ""

    for agent in "${AGENTS[@]}"; do
        test_agent "$agent"
        sleep 0.5  # Small delay between tests
    done

    echo -e "${GREEN}✅ All agent tests completed!${NC}"
}

# Function to clean up test files
cleanup() {
    echo -e "${YELLOW}Cleaning up test files...${NC}"
    rm -f "$SCRIPT_DIR"/test-subagent-*.jsonl
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Parse command line arguments
case "${1:-all}" in
    researcher|engineer|architect|designer|artist|pentester|writer|main)
        test_agent "$1"
        ;;
    all)
        test_all
        ;;
    clean)
        cleanup
        ;;
    help)
        echo "Usage: $0 [agent_type|all|clean|help]"
        echo ""
        echo "Agent types:"
        echo "  researcher  - Test researcher agent"
        echo "  engineer    - Test engineer agent"
        echo "  architect   - Test architect agent"
        echo "  designer    - Test designer agent"
        echo "  artist      - Test artist agent"
        echo "  pentester   - Test pentester agent"
        echo "  writer      - Test writer agent"
        echo "  main        - Test main agent"
        echo ""
        echo "Commands:"
        echo "  all         - Test all agent types (default)"
        echo "  clean       - Remove test transcript files"
        echo "  help        - Show this help message"
        ;;
    *)
        echo "Unknown agent type or command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
