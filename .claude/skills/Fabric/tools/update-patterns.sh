#!/bin/bash
# Update Fabric patterns from upstream
# This script pulls the latest patterns using the fabric CLI
# and copies them to PAI's local patterns directory

set -e

FABRIC_PATTERNS_SOURCE="$HOME/.config/fabric/patterns"
PAI_PATTERNS_DIR="$(dirname "$0")/patterns"

echo "Updating Fabric patterns..."

# First, check if fabric is installed
if ! command -v fabric &> /dev/null; then
    echo "Error: fabric CLI not installed"
    echo "Install with: go install github.com/danielmiessler/fabric@latest"
    exit 1
fi

# Update patterns using fabric CLI
echo "Pulling latest patterns from fabric..."
fabric -U

# Then sync to PAI's local copy
echo "Syncing to PAI patterns directory..."
rsync -av --delete --exclude='.DS_Store' "$FABRIC_PATTERNS_SOURCE/" "$PAI_PATTERNS_DIR/"

# Count patterns
PATTERN_COUNT=$(ls -1 "$PAI_PATTERNS_DIR" | wc -l | tr -d ' ')

echo "Updated $PATTERN_COUNT patterns in $PAI_PATTERNS_DIR"
echo ""
echo "Patterns are now available for native Claude Code usage."
echo "No need to call 'fabric -p' - patterns are applied directly as prompts."
