#!/bin/bash

# uninstall.sh - PAI-Boilerplate Plugin Uninstall Script
# Usage: ./uninstall.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }

echo ""
echo "PAI-Boilerplate Plugin Uninstall"
echo "================================"
echo ""

warning "This will remove plugin-installed files from ~/.claude/"
warning "Your custom modifications will be backed up"
echo ""

read -p "Continue with uninstall? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Uninstall cancelled"
  exit 0
fi

# Backup entire ~/.claude directory
backup_dir="$HOME/.claude.backup.$(date +%Y%m%d_%H%M%S)"
echo "Creating backup at $backup_dir..."
cp -r "$HOME/.claude" "$backup_dir"
success "Backup created"

# Remove plugin-installed files (keep user data)
warning "Removing plugin configuration files..."

# List of files that can be safely removed
declare -a remove_files=(
  "$HOME/.claude/settings.json"
  "$HOME/.claude/.mcp.json"
)

for file in "${remove_files[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  Removed: $file"
  fi
done

# Note: We don't remove directories that might contain user data
echo ""
success "Uninstall complete"
echo ""
echo "Backup location: $backup_dir"
echo "To restore: cp -r $backup_dir/* ~/.claude/"
echo ""
echo "Note: scratchpad/ and context/ directories preserved (may contain user data)"
echo ""
