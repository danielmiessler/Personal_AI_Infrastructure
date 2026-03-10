#!/bin/bash
# Debug wrapper for statusline to capture actual JSON input and compare paths

input=$(cat)

# Timestamp for unique capture
timestamp=$(date +%Y%m%d-%H%M%S)

# Save full JSON to debug file
echo "$input" > "/tmp/statusline-capture-${timestamp}.json"

# Also save latest for easy access
echo "$input" > "/tmp/statusline-latest.json"

# Extract and log ALL context-related fields for comparison
{
    echo "=== Context Debug: $timestamp ==="
    echo "--- Raw paths ---"
    echo ".tokens.percentage_used: $(echo "$input" | jq -r '.tokens.percentage_used // "NOT FOUND"')"
    echo ".tokens.used: $(echo "$input" | jq -r '.tokens.used // "NOT FOUND"')"
    echo ".tokens.max: $(echo "$input" | jq -r '.tokens.max // "NOT FOUND"')"
    echo ".context_window.used_percentage: $(echo "$input" | jq -r '.context_window.used_percentage // "NOT FOUND"')"
    echo ".context_window.context_window_size: $(echo "$input" | jq -r '.context_window.context_window_size // "NOT FOUND"')"
    echo "--- Full objects ---"
    echo ".tokens object:"
    echo "$input" | jq '.tokens // "NOT FOUND"'
    echo ".context_window object:"
    echo "$input" | jq '.context_window // "NOT FOUND"'
    echo ""
} >> /tmp/statusline-debug.log 2>&1

# Run the actual status line
echo "$input" | ~/.claude/statusline-command.sh
