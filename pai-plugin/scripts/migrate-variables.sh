#!/bin/bash

# migrate-variables.sh - Variable Migration Script
# Migrates ${PAI_DIR} to ${CLAUDE_PLUGIN_ROOT} across all plugin files

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║   PAI-Boilerplate Variable Migration Script      ║"
echo "║   \${PAI_DIR} → \${CLAUDE_PLUGIN_ROOT}              ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"

info "Working directory: $PLUGIN_DIR"
echo ""

# Backup check
read -p "Have you backed up your work? This will modify ~45 files. (y/n): " backup_confirm
if [ "$backup_confirm" != "y" ]; then
  error "Please backup before running migration"
fi

# Create git stash as additional backup
info "Creating git stash backup..."
git stash save "pre-migration-backup-$(date +%Y%m%d_%H%M%S)" || warning "Git stash failed (may be nothing to stash)"

# Find and replace in all relevant files
info "Migrating variables in agents..."
find "$PLUGIN_DIR/agents" -type f -name "*.md" -exec sed -i.bak 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} \; 2>/dev/null || true
find "$PLUGIN_DIR/agents" -type f -name "*.bak" -delete 2>/dev/null || true
success "Agents migrated"

info "Migrating variables in commands..."
find "$PLUGIN_DIR/commands" -type f -name "*.md" -exec sed -i.bak 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} \; 2>/dev/null || true
find "$PLUGIN_DIR/commands" -type f -name "*.bak" -delete 2>/dev/null || true
success "Commands migrated"

info "Migrating variables in skills..."
find "$PLUGIN_DIR/skills" -type f -name "*.md" -exec sed -i.bak 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} \; 2>/dev/null || true
find "$PLUGIN_DIR/skills" -type f -name "*.bak" -delete 2>/dev/null || true
success "Skills migrated"

info "Migrating variables in hooks..."
find "$PLUGIN_DIR/hooks" -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i.bak 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} \; 2>/dev/null || true
find "$PLUGIN_DIR/hooks" -type f -name "*.bak" -delete 2>/dev/null || true
success "Hooks migrated"

info "Migrating variables in documentation..."
find "$PLUGIN_DIR/documentation" -type f -name "*.md" -exec sed -i.bak 's/\${PAI_DIR}/\${CLAUDE_PLUGIN_ROOT}/g' {} \; 2>/dev/null || true
find "$PLUGIN_DIR/documentation" -type f -name "*.bak" -delete 2>/dev/null || true
success "Documentation migrated"

# Update context references
info "Updating context paths in agents..."
find "$PLUGIN_DIR/agents" -type f -name "*.md" -exec sed -i.bak 's|~/.claude/context/CLAUDE.md|\${CLAUDE_PLUGIN_ROOT}/templates/context/CLAUDE.md|g' {} \; 2>/dev/null || true
find "$PLUGIN_DIR/agents" -type f -name "*.bak" -delete 2>/dev/null || true
success "Context paths updated"

# Count changes
info "Checking for remaining \${PAI_DIR} references..."
PAI_DIR_COUNT=$(grep -r '${PAI_DIR}' "$PLUGIN_DIR" --include="*.md" --include="*.ts" --include="*.js" --include="*.json" 2>/dev/null | wc -l || echo "0")

echo ""
echo "Migration complete!"
echo ""
echo "Statistics:"
echo "  Remaining \${PAI_DIR} references: $PAI_DIR_COUNT"
echo ""

if [ "$PAI_DIR_COUNT" -gt 0 ]; then
  warning "Found $PAI_DIR_COUNT remaining \${PAI_DIR} references"
  info "Review these with: grep -r '\${PAI_DIR}' $PLUGIN_DIR"
  echo ""
fi

info "Review changes with: git diff"
info "If issues occur, restore with: git stash pop"
echo ""
