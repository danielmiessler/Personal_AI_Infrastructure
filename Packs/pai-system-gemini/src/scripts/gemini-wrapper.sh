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
if [ -f "$GENERATE_CONTEXT_SCRIPT" ]; then
    # Use bun to run the typescript script
    CONTEXT=$(bun run "$GENERATE_CONTEXT_SCRIPT")
fi

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