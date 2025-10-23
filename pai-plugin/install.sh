#!/bin/bash

# install.sh - PAI-Boilerplate Plugin Installation Script
# Usage: ./install.sh

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

# Banner
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║   PAI-Boilerplate Plugin Installation Script    ║"
echo "║           Version 0.7.0                          ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Step 1: Prerequisites check
info "Checking prerequisites..."

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
  error "Claude Code not found. Install from: https://claude.ai/code"
fi
success "Claude Code installed"

# Check if Bun is installed (for hooks)
if ! command -v bun &> /dev/null; then
  warning "Bun not found. Some features may not work."
  warning "Install Bun: curl -fsSL https://bun.sh/install | bash"
  read -p "Continue anyway? (y/n): " continue_anyway
  if [ "$continue_anyway" != "y" ]; then
    exit 0
  fi
fi

# Step 2: Check if ~/.claude exists
if [ ! -d "$HOME/.claude" ]; then
  info "Creating ~/.claude directory..."
  mkdir -p "$HOME/.claude"
  success "Created ~/.claude directory"
else
  success "~/.claude directory exists"
fi

# Step 3: Backup existing configuration
if [ -f "$HOME/.claude/settings.json" ]; then
  backup_file="$HOME/.claude/settings.json.backup.$(date +%Y%m%d_%H%M%S)"
  info "Backing up existing settings.json to $backup_file"
  cp "$HOME/.claude/settings.json" "$backup_file"
  success "Backup created"
fi

# Step 4: Interactive configuration
echo ""
info "Plugin Configuration"
echo "━━━━━━━━━━━━━━━━━━━━"

# Assistant name
read -p "Enter your AI assistant name [Kai]: " assistant_name
assistant_name=${assistant_name:-Kai}

# Voice notifications
read -p "Enable voice notifications? (y/n) [n]: " enable_voice
enable_voice=${enable_voice:-n}
if [ "$enable_voice" = "y" ]; then
  voice_enabled="true"
  read -p "Voice server URL [http://localhost:8888]: " voice_url
  voice_url=${voice_url:-http://localhost:8888}
else
  voice_enabled="false"
  voice_url="http://localhost:8888"
fi

# Step 5: Copy configuration files
info "Installing configuration files..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy settings.example.json to settings.json
if [ -f "$HOME/.claude/settings.json" ]; then
  warning "settings.json already exists. Merging configurations..."
  read -p "Overwrite existing settings.json? (y/n) [n]: " overwrite_settings
  if [ "$overwrite_settings" = "y" ]; then
    cp "$SCRIPT_DIR/settings.example.json" "$HOME/.claude/settings.json"
    success "Copied settings.json"
  else
    info "Keeping existing settings.json"
  fi
else
  cp "$SCRIPT_DIR/settings.example.json" "$HOME/.claude/settings.json"
  success "Created settings.json"
fi

# Copy .mcp.example.json to .mcp.json
if [ ! -f "$HOME/.claude/.mcp.json" ]; then
  cp "$SCRIPT_DIR/.mcp.example.json" "$HOME/.claude/.mcp.json"
  success "Created .mcp.json"
else
  info ".mcp.json already exists (keeping existing)"
fi

# Step 6: Update configuration with user inputs
info "Updating configuration..."

# Update assistant name and voice settings in settings.json
if command -v sed &> /dev/null && [ -f "$HOME/.claude/settings.json" ]; then
  sed -i.bak "s/\[YOUR_ASSISTANT_NAME\]/$assistant_name/g" "$HOME/.claude/settings.json"
  sed -i.bak "s/\"ENABLE_VOICE\": \"false\"/\"ENABLE_VOICE\": \"$voice_enabled\"/g" "$HOME/.claude/settings.json"
  sed -i.bak "s|http://localhost:8888|$voice_url|g" "$HOME/.claude/settings.json"
  rm "$HOME/.claude/settings.json.bak" 2>/dev/null || true
  success "Configuration updated"
fi

# Step 7: Create directory structure
info "Creating directory structure..."
mkdir -p "$HOME/.claude/scratchpad"
mkdir -p "$HOME/.claude/context"
mkdir -p "$HOME/.claude/context/tools"
success "Directory structure created"

# Step 8: Copy context templates (if they exist)
if [ -d "$SCRIPT_DIR/templates/context" ]; then
  cp -r "$SCRIPT_DIR/templates/context/"* "$HOME/.claude/context/" 2>/dev/null || true
  success "Copied context templates"
fi

# Step 9: Installation complete
echo ""
success "Installation complete!"
echo ""
info "Next Steps:"
echo "  1. Review configuration: ~/.claude/settings.json"
echo "  2. Configure API keys in: ~/.claude/.mcp.json"
echo "  3. (Optional) Set up voice server"
echo "  4. Start Claude Code: claude"
echo ""
info "Quick Start Guide: cat $SCRIPT_DIR/QUICKSTART.md (when available)"
info "Full Documentation: cat $SCRIPT_DIR/INSTALL.md (when available)"
echo ""
