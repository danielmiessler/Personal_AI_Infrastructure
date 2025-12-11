#!/bin/bash

#
# claude-pre-startup.sh
#
# Pre-startup configuration script for Claude Code.
# Syncs project MCP config with global MCP config before launching Claude.
#
# Merge Logic:
#   - Global MCPs (~/.claude/.mcp.json) are the source of truth
#   - Global servers overwrite matching project servers (global wins)
#   - Project-only servers are preserved (e.g., project-specific MCPs)
#
# Usage:
#   claude-pre-startup.sh [claude-code-args...]
#
# Aliases (add to .zshrc):
#   alias charles='~/.claude/scripts/claude-pre-startup.sh'
#   alias char='~/.claude/scripts/claude-pre-startup.sh'
#

set -e

GLOBAL_MCP="$HOME/.claude/.mcp.json"
SCRIPT_DIR="$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[PAI]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PAI]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[PAI]${NC} $1"
}

log_error() {
    echo -e "${RED}[PAI]${NC} $1"
}

# Find project MCP config in current directory
find_project_mcp() {
    local cwd="$1"

    # Check common locations
    if [[ -f "$cwd/.mcp.json" ]]; then
        echo "$cwd/.mcp.json"
    elif [[ -f "$cwd/.claude/.mcp.json" ]]; then
        echo "$cwd/.claude/.mcp.json"
    else
        echo ""
    fi
}

# Sync MCP configs using jq
sync_mcp_configs() {
    local project_mcp="$1"

    if [[ ! -f "$GLOBAL_MCP" ]]; then
        log_warn "No global MCP config found at $GLOBAL_MCP"
        return 0
    fi

    if [[ -z "$project_mcp" ]]; then
        # No project config - nothing to sync
        log_info "No project MCP config found - using global config only"
        return 0
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Run: brew install jq"
        return 1
    fi

    log_info "Syncing MCP configs..."
    log_info "  Global: $GLOBAL_MCP"
    log_info "  Project: $project_mcp"

    # Read both configs
    local global_servers
    local project_servers

    global_servers=$(jq -r '.mcpServers // {}' "$GLOBAL_MCP")
    project_servers=$(jq -r '.mcpServers // {}' "$project_mcp")

    # Merge: global overwrites project, project-only servers preserved
    # This uses jq's * operator which merges objects (right side wins)
    # We put project first, then global, so global wins for conflicts
    local merged
    merged=$(jq -n \
        --argjson project "$project_servers" \
        --argjson global "$global_servers" \
        '$project * $global')

    # Check if anything changed
    local current_sorted
    local merged_sorted

    current_sorted=$(echo "$project_servers" | jq -S '.')
    merged_sorted=$(echo "$merged" | jq -S '.')

    if [[ "$current_sorted" == "$merged_sorted" ]]; then
        log_success "Project MCP config is already in sync"
        return 0
    fi

    # Show what's being added/updated
    log_info "Changes detected:"

    # Find servers that will be added or updated
    local global_keys
    global_keys=$(echo "$global_servers" | jq -r 'keys[]')

    for key in $global_keys; do
        local in_project
        in_project=$(echo "$project_servers" | jq -r "has(\"$key\")")

        if [[ "$in_project" == "false" ]]; then
            log_info "  + Adding: $key"
        else
            # Check if config differs
            local global_config
            local project_config
            global_config=$(echo "$global_servers" | jq -S ".\"$key\"")
            project_config=$(echo "$project_servers" | jq -S ".\"$key\"")

            if [[ "$global_config" != "$project_config" ]]; then
                log_info "  ~ Updating: $key"
            fi
        fi
    done

    # Write merged config back to project
    local new_config
    new_config=$(jq --argjson servers "$merged" '.mcpServers = $servers' "$project_mcp")

    echo "$new_config" > "$project_mcp"
    log_success "Project MCP config updated"

    return 0
}

# Main
main() {
    local cwd
    cwd="$(pwd)"

    log_info "Pre-startup config check for: $cwd"

    # Find and sync project MCP config
    local project_mcp
    project_mcp=$(find_project_mcp "$cwd")

    sync_mcp_configs "$project_mcp"

    echo ""

    # Launch Claude Code with any passed arguments
    log_info "Launching Claude Code..."
    exec claude "$@"
}

main "$@"
