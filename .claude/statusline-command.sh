#!/bin/bash
#
# PAI Statusline - Customizable status display for Claude Code
#
# CUSTOMIZATION:
#   - This script sources ${PAI_DIR}/.env for API keys and configuration
#   - Set PAI_SIMPLE_COLORS=1 in settings.json env for basic ANSI colors
#     (fixes display issues on some terminals)
#   - To add features requiring API keys (e.g., quotes), add keys to .env
#   - Comment out any printf lines you don't want displayed
#
# LINES DISPLAYED:
#   1. Greeting: DA name, model, directory, capabilities count
#   2. MCPs: Active MCP servers with names
#   3. Tokens: Daily usage and cost (requires ccusage)
#
# ENVIRONMENT VARIABLES (set in settings.json env section):
#   DA            - Your assistant's name (default: "Assistant")
#   DA_COLOR      - Name color: purple|blue|green|cyan|yellow|red|orange
#   PAI_SIMPLE_COLORS - Set to "1" to use basic terminal colors
#

# Source .env for API keys and custom configuration
claude_env="${PAI_DIR:-$HOME/.claude}/.env"
[ -f "$claude_env" ] && source "$claude_env"

# Read JSON input from stdin
input=$(cat)

# Get Digital Assistant configuration from environment
DA_NAME="${DA:-Assistant}"  # Assistant name
DA_COLOR="${DA_COLOR:-purple}"  # Color for the assistant name

# Extract data from JSON input
current_dir=$(echo "$input" | jq -r '.workspace.current_dir')
model_name=$(echo "$input" | jq -r '.model.display_name')
cc_version=$(echo "$input" | jq -r '.version // "unknown"')

# Get directory name
dir_name=$(basename "$current_dir")

# Cache file and lock file for ccusage data
CACHE_FILE="/tmp/.claude_ccusage_cache"
LOCK_FILE="/tmp/.claude_ccusage.lock"
CACHE_AGE=30   # 30 seconds for more real-time updates

# Count items from specified directories
claude_dir="${PAI_DIR:-$HOME/.claude}"
commands_count=0
mcps_count=0
fobs_count=0
fabric_count=0

# Count commands (optimized - direct ls instead of find)
if [ -d "$claude_dir/commands" ]; then
    commands_count=$(ls -1 "$claude_dir/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi

# Count MCPs from settings.json (single parse)
mcp_names_raw=""
if [ -f "$claude_dir/settings.json" ]; then
    mcp_data=$(jq -r '.mcpServers | keys | join(" "), length' "$claude_dir/settings.json" 2>/dev/null)
    mcp_names_raw=$(echo "$mcp_data" | head -1)
    mcps_count=$(echo "$mcp_data" | tail -1)
else
    mcps_count="0"
fi

# Count Services (optimized - count .md files directly)
services_dir="${HOME}/Projects/FoundryServices/Services"
if [ -d "$services_dir" ]; then
    fobs_count=$(ls -1 "$services_dir/"*.md 2>/dev/null | wc -l | tr -d ' ')
fi

# Count Fabric patterns (optimized - count subdirectories)
fabric_patterns_dir="${HOME}/.config/fabric/patterns"
if [ -d "$fabric_patterns_dir" ]; then
    # Count immediate subdirectories only
    fabric_count=$(find "$fabric_patterns_dir" -maxdepth 1 -type d -not -path "$fabric_patterns_dir" 2>/dev/null | wc -l | tr -d ' ')
fi

# Get cached ccusage data - SAFE VERSION without background processes
daily_tokens=""
daily_cost=""

# Check if cache exists and load it
if [ -f "$CACHE_FILE" ]; then
    # Always load cache data first (if it exists)
    source "$CACHE_FILE"
fi

# If cache is stale, missing, or we have no data, update it SYNCHRONOUSLY with timeout
cache_needs_update=false
if [ ! -f "$CACHE_FILE" ] || [ -z "$daily_tokens" ]; then
    cache_needs_update=true
elif [ -f "$CACHE_FILE" ]; then
    cache_age=$(($(date +%s) - $(stat -f%m "$CACHE_FILE" 2>/dev/null || echo 0)))
    if [ $cache_age -ge $CACHE_AGE ]; then
        cache_needs_update=true
    fi
fi

if [ "$cache_needs_update" = true ]; then
    # Try to acquire lock (non-blocking)
    if mkdir "$LOCK_FILE" 2>/dev/null; then
        # We got the lock - update cache with timeout
        if command -v bunx >/dev/null 2>&1; then
            # Run ccusage with a timeout (5 seconds for faster updates)
            # Check if gtimeout is available (macOS), otherwise try timeout (Linux)
            if command -v gtimeout >/dev/null 2>&1; then
                ccusage_output=$(gtimeout 5 bunx ccusage 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
            elif command -v timeout >/dev/null 2>&1; then
                ccusage_output=$(timeout 5 bunx ccusage 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
            else
                # Fallback without timeout (but faster than before)
                ccusage_output=$(bunx ccusage 2>/dev/null | sed 's/\x1b\[[0-9;]*m//g' | grep "│ Total" | head -1)
            fi

            if [ -n "$ccusage_output" ]; then
                # Extract input/output tokens, removing commas and ellipsis
                daily_input=$(echo "$ccusage_output" | awk -F'│' '{print $4}' | sed 's/[^0-9]//g' | head -c 10)
                daily_output=$(echo "$ccusage_output" | awk -F'│' '{print $5}' | sed 's/[^0-9]//g' | head -c 10)
                # Extract cost, keep the dollar sign
                daily_cost=$(echo "$ccusage_output" | awk -F'│' '{print $9}' | sed 's/^ *//;s/ *$//')

                if [ -n "$daily_input" ] && [ -n "$daily_output" ]; then
                    daily_total=$((daily_input + daily_output))
                    daily_tokens=$(printf "%'d" "$daily_total" 2>/dev/null || echo "$daily_total")

                    # Write to cache file (properly escape dollar sign)
                    echo "daily_tokens=\"$daily_tokens\"" > "$CACHE_FILE"
                    # Use printf to properly escape the dollar sign in the cost
                    printf "daily_cost=\"%s\"\n" "${daily_cost//$/\\$}" >> "$CACHE_FILE"
                    # Add timestamp for debugging
                    echo "cache_updated=\"$(date)\"" >> "$CACHE_FILE"
                fi
            fi
        fi

        # Always remove lock when done
        rmdir "$LOCK_FILE" 2>/dev/null
    else
        # Someone else is updating - check if lock is stale (older than 30 seconds)
        if [ -d "$LOCK_FILE" ]; then
            lock_age=$(($(date +%s) - $(stat -f%m "$LOCK_FILE" 2>/dev/null || echo 0)))
            if [ $lock_age -gt 30 ]; then
                # Stale lock - remove it and try again
                rmdir "$LOCK_FILE" 2>/dev/null
            fi
        fi

        # Just use cached data if available
        if [ -f "$CACHE_FILE" ]; then
            source "$CACHE_FILE"
        fi
    fi
fi

# Tokyo Night Storm Color Scheme
BACKGROUND='\033[48;2;36;40;59m'
BRIGHT_PURPLE='\033[38;2;187;154;247m'
BRIGHT_BLUE='\033[38;2;122;162;247m'
DARK_BLUE='\033[38;2;100;140;200m'
BRIGHT_GREEN='\033[38;2;158;206;106m'
DARK_GREEN='\033[38;2;130;170;90m'
BRIGHT_ORANGE='\033[38;2;255;158;100m'
BRIGHT_RED='\033[38;2;247;118;142m'
BRIGHT_CYAN='\033[38;2;125;207;255m'
BRIGHT_MAGENTA='\033[38;2;187;154;247m'
BRIGHT_PINK='\033[38;2;255;20;147m'
BRIGHT_YELLOW='\033[38;2;224;175;104m'

# Map DA_COLOR to actual ANSI color code
case "$DA_COLOR" in
    "purple") DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;
    "blue") DA_DISPLAY_COLOR="$BRIGHT_BLUE" ;;
    "green") DA_DISPLAY_COLOR="$BRIGHT_GREEN" ;;
    "cyan") DA_DISPLAY_COLOR="$BRIGHT_CYAN" ;;
    "magenta") DA_DISPLAY_COLOR="$BRIGHT_MAGENTA" ;;
    "pink") DA_DISPLAY_COLOR="$BRIGHT_PINK" ;;
    "yellow") DA_DISPLAY_COLOR="$BRIGHT_YELLOW" ;;
    "red") DA_DISPLAY_COLOR="$BRIGHT_RED" ;;
    "orange") DA_DISPLAY_COLOR="$BRIGHT_ORANGE" ;;
    *) DA_DISPLAY_COLOR='\033[38;2;147;112;219m' ;;  # Default to purple
esac

# Line-specific colors
LINE1_PRIMARY="$BRIGHT_PURPLE"
LINE1_ACCENT='\033[38;2;160;130;210m'
MODEL_PURPLE='\033[38;2;138;99;210m'

LINE2_PRIMARY="$DARK_BLUE"
LINE2_ACCENT='\033[38;2;110;150;210m'

LINE3_PRIMARY="$DARK_GREEN"
LINE3_ACCENT='\033[38;2;140;180;100m'
COST_COLOR="$LINE3_ACCENT"
TOKENS_COLOR='\033[38;2;169;177;214m'

SEPARATOR_COLOR='\033[38;2;140;152;180m'
DIR_COLOR='\033[38;2;135;206;250m'

# MCP colors
MCP_DAEMON="$BRIGHT_BLUE"
MCP_STRIPE="$LINE2_ACCENT"
MCP_DEFAULT="$LINE2_PRIMARY"

# Reset includes explicit background clear for terminal compatibility
RESET='\033[0m\033[49m'

# Simple colors mode - set PAI_SIMPLE_COLORS=1 if you have terminal display issues
if [ "${PAI_SIMPLE_COLORS:-0}" = "1" ]; then
    # Use basic ANSI colors instead of 24-bit RGB for terminal compatibility
    BRIGHT_PURPLE='\033[35m'
    BRIGHT_BLUE='\033[34m'
    DARK_BLUE='\033[34m'
    BRIGHT_GREEN='\033[32m'
    DARK_GREEN='\033[32m'
    BRIGHT_ORANGE='\033[33m'
    BRIGHT_RED='\033[31m'
    BRIGHT_CYAN='\033[36m'
    BRIGHT_MAGENTA='\033[35m'
    BRIGHT_YELLOW='\033[33m'
    # Override derived colors
    DA_DISPLAY_COLOR='\033[35m'
    LINE1_PRIMARY='\033[35m'
    LINE1_ACCENT='\033[35m'
    MODEL_PURPLE='\033[35m'
    LINE2_PRIMARY='\033[34m'
    LINE2_ACCENT='\033[34m'
    LINE3_PRIMARY='\033[32m'
    LINE3_ACCENT='\033[32m'
    COST_COLOR='\033[32m'
    TOKENS_COLOR='\033[37m'
    SEPARATOR_COLOR='\033[37m'
    DIR_COLOR='\033[36m'
    MCP_DAEMON='\033[34m'
    MCP_STRIPE='\033[34m'
    MCP_DEFAULT='\033[34m'
fi

# Format MCP names efficiently
mcp_names_formatted=""
for mcp in $mcp_names_raw; do
    case "$mcp" in
        "daemon") formatted="${MCP_DAEMON}Daemon${RESET}" ;;
        "stripe") formatted="${MCP_STRIPE}Stripe${RESET}" ;;
        "httpx") formatted="${MCP_DEFAULT}HTTPx${RESET}" ;;
        "brightdata") formatted="${MCP_DEFAULT}BrightData${RESET}" ;;
        "naabu") formatted="${MCP_DEFAULT}Naabu${RESET}" ;;
        "apify") formatted="${MCP_DEFAULT}Apify${RESET}" ;;
        "content") formatted="${MCP_DEFAULT}Content${RESET}" ;;
        "Ref") formatted="${MCP_DEFAULT}Ref${RESET}" ;;
        "pai") formatted="${MCP_DEFAULT}Foundry${RESET}" ;;
        "playwright") formatted="${MCP_DEFAULT}Playwright${RESET}" ;;
        *) formatted="${MCP_DEFAULT}${mcp^}${RESET}" ;;
    esac

    if [ -z "$mcp_names_formatted" ]; then
        mcp_names_formatted="$formatted"
    else
        mcp_names_formatted="$mcp_names_formatted${SEPARATOR_COLOR}, ${formatted}"
    fi
done

# Output the full 3-line statusline
# LINE 1 - Greeting with CC version
printf "👋 ${DA_DISPLAY_COLOR}\"${DA_NAME} here, ready to go...\"${RESET} ${MODEL_PURPLE}Running CC ${cc_version}${RESET}${LINE1_PRIMARY} with ${MODEL_PURPLE}🧠 ${model_name}${RESET}${LINE1_PRIMARY} in ${DIR_COLOR}📁 ${dir_name}${RESET}\n"

# LINE 2 - BLUE theme with MCP names
printf "${LINE2_PRIMARY}🔌 MCPs${RESET}${LINE2_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${mcp_names_formatted}${RESET}\n"

# LINE 3 - GREEN theme with tokens and cost (show cached or N/A)
# If we have cached data but it's empty, still show N/A
tokens_display="${daily_tokens:-N/A}"
cost_display="${daily_cost:-N/A}"
if [ -z "$daily_tokens" ]; then tokens_display="N/A"; fi
if [ -z "$daily_cost" ]; then cost_display="N/A"; fi

printf "${LINE3_PRIMARY}💎 Total Tokens${RESET}${LINE3_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${LINE3_ACCENT}${tokens_display}${RESET}${LINE3_PRIMARY}  Total Cost${RESET}${LINE3_PRIMARY}${SEPARATOR_COLOR}: ${RESET}${COST_COLOR}${cost_display}${RESET}\n"