#!/bin/bash
# PAI Gemini Wrapper: Identity + Command Sync

# Path Setup
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$SCRIPT_DIR/sync-commands.sh"
GENERATE_CONTEXT_SCRIPT="$SCRIPT_DIR/generate-context.ts"

# Sync Commands (Silent)
if [ -x "$SYNC_SCRIPT" ]; then
    "$SYNC_SCRIPT" >/dev/null 2>&1
fi

# Generate Context
CONTEXT=""
ADAPTER_PATH="$PAI_DIR/Packs/pai-system-gemini/dist/adapter.js"
if [ -f "$ADAPTER_PATH" ]; then
    CONTEXT=$(node "$ADAPTER_PATH" --context)
fi

# Trap Exit for SessionEnd Hook (Memory System Parity)
cleanup() {
    if [ -f "$ADAPTER_PATH" ]; then
        node "$ADAPTER_PATH" --hook SessionEnd --payload '{"status":"completed"}' >/dev/null 2>&1
    fi
}
trap cleanup EXIT

# Greeting (Interactive Mode Only)
if [ -z "$1" ] && [ -t 1 ]; then
    # ANSI Colors
    BLUE='\033[0;34m'
    BOLD='\033[1m'
    NC='\033[0m'
    
    echo -e "${BLUE}${BOLD}● PAI Gemini${NC} is initializing session..."
    echo -e "  - Loading Identity and Core Skills"
    echo -e "  - Reading Persistent Memory"
    echo -e "  - Scanning Project Context"
    echo
fi

# Launch
if [ -n "$1" ]; then
    # Single Shot: Stuff Prompt
    if [ -n "$CONTEXT" ]; then
        FULL_PROMPT="$CONTEXT
        
USER REQUEST: $@"
        gemini "$FULL_PROMPT"
    else
        gemini "$@"
    fi
else
    # Interactive: Launch with Context
    if [ -n "$CONTEXT" ]; then
        # Use -i to run the context prompt and stay interactive
        gemini -i "$CONTEXT"
    else
        gemini
    fi
fi