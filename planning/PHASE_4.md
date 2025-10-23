# Phase 4: Setup Automation

**Duration:** ~1-2 hours
**Priority:** High (User experience)
**Dependencies:** Phase 1-3 complete

---

## Objective

Create automated installation and configuration scripts that enable new users to set up the plugin in under 5 minutes with guided prompts and validation.

---

## Background

**Current State:** Manual configuration required
**Target State:** Automated setup with interactive prompts
**Benefit:** Lower barrier to entry, reduced setup errors, better UX

---

## Tasks

### Task 4.1: Create Main Installation Script

**File:** `pai-plugin/install.sh` (or `setup.ts` for cross-platform)

**Decision:** Use Bash for simplicity (Linux/macOS) or TypeScript with Bun (cross-platform)

#### Option A: Bash Script (Simpler, Unix-only)

```bash
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

# Copy settings.example.json to settings.json
if [ -f "$HOME/.claude/settings.json" ]; then
  warning "settings.json already exists. Merging configurations..."
  # TODO: Implement merge logic or prompt for overwrite
  read -p "Overwrite existing settings.json? (y/n) [n]: " overwrite_settings
  if [ "$overwrite_settings" = "y" ]; then
    cp "$(dirname "$0")/settings.example.json" "$HOME/.claude/settings.json"
    success "Copied settings.json"
  fi
else
  cp "$(dirname "$0")/settings.example.json" "$HOME/.claude/settings.json"
  success "Created settings.json"
fi

# Copy .mcp.example.json to .mcp.json
if [ ! -f "$HOME/.claude/.mcp.json" ]; then
  cp "$(dirname "$0")/.mcp.example.json" "$HOME/.claude/.mcp.json"
  success "Created .mcp.json"
else
  info ".mcp.json already exists (keeping existing)"
fi

# Copy .env.example to .env if exists
if [ -f "$(dirname "$0")/.env.example" ] && [ ! -f "$HOME/.claude/.env" ]; then
  cp "$(dirname "$0")/.env.example" "$HOME/.claude/.env"
  success "Created .env"
fi

# Step 6: Update configuration with user inputs
info "Updating configuration..."

# Update assistant name in settings.json
if command -v sed &> /dev/null; then
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
if [ -d "$(dirname "$0")/templates/context" ]; then
  cp -r "$(dirname "$0")/templates/context/"* "$HOME/.claude/context/"
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
info "Quick Start Guide: cat QUICKSTART.md"
info "Full Documentation: cat INSTALL.md"
echo ""
```

---

### Task 4.2: Create TypeScript Setup Script (Alternative)

**File:** `pai-plugin/setup.ts`

**Benefit:** Cross-platform (Windows/Mac/Linux), uses Bun

```typescript
#!/usr/bin/env bun

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function success(msg: string) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg: string) {
  console.error(`${colors.red}❌ ${msg}${colors.reset}`);
  process.exit(1);
}

function warning(msg: string) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function info(msg: string) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(promptText, (answer: string) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   PAI-Boilerplate Plugin Installation Script    ║');
  console.log('║           Version 0.7.0                          ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const claudeDir = join(homedir(), '.claude');
  const pluginDir = process.cwd();

  // Step 1: Check prerequisites
  info('Checking prerequisites...');

  // Check for Bun
  if (!process.versions.bun) {
    warning('Not running with Bun. Some features may not work.');
  }

  // Step 2: Create ~/.claude if needed
  if (!existsSync(claudeDir)) {
    info('Creating ~/.claude directory...');
    mkdirSync(claudeDir, { recursive: true });
    success('Created ~/.claude directory');
  } else {
    success('~/.claude directory exists');
  }

  // Step 3: Backup existing config
  const settingsPath = join(claudeDir, 'settings.json');
  if (existsSync(settingsPath)) {
    const backupPath = `${settingsPath}.backup.${Date.now()}`;
    info(`Backing up existing settings.json to ${backupPath}`);
    copyFileSync(settingsPath, backupPath);
    success('Backup created');
  }

  // Step 4: Interactive configuration
  console.log('');
  info('Plugin Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━');

  const assistantName = await prompt('Enter your AI assistant name', 'Kai');
  const enableVoiceAnswer = await prompt('Enable voice notifications? (y/n)', 'n');
  const enableVoice = enableVoiceAnswer.toLowerCase() === 'y';
  const voiceUrl = enableVoice
    ? await prompt('Voice server URL', 'http://localhost:8888')
    : 'http://localhost:8888';

  // Step 5: Copy configuration files
  info('Installing configuration files...');

  const settingsExamplePath = join(pluginDir, 'settings.example.json');
  if (existsSync(settingsExamplePath)) {
    let settingsContent = readFileSync(settingsExamplePath, 'utf-8');

    // Replace placeholders
    settingsContent = settingsContent
      .replace(/\[YOUR_ASSISTANT_NAME\]/g, assistantName)
      .replace(/"ENABLE_VOICE": "false"/, `"ENABLE_VOICE": "${enableVoice}"`)
      .replace(/http:\/\/localhost:8888/g, voiceUrl);

    writeFileSync(settingsPath, settingsContent);
    success('Created settings.json');
  }

  // Copy .mcp.json
  const mcpExamplePath = join(pluginDir, '.mcp.example.json');
  const mcpPath = join(claudeDir, '.mcp.json');
  if (existsSync(mcpExamplePath) && !existsSync(mcpPath)) {
    copyFileSync(mcpExamplePath, mcpPath);
    success('Created .mcp.json');
  }

  // Step 6: Create directory structure
  info('Creating directory structure...');
  mkdirSync(join(claudeDir, 'scratchpad'), { recursive: true });
  mkdirSync(join(claudeDir, 'context', 'tools'), { recursive: true });
  success('Directory structure created');

  // Step 7: Installation complete
  console.log('');
  success('Installation complete!');
  console.log('');
  info('Next Steps:');
  console.log('  1. Review configuration: ~/.claude/settings.json');
  console.log('  2. Configure API keys in: ~/.claude/.mcp.json');
  console.log('  3. (Optional) Set up voice server');
  console.log('  4. Start Claude Code: claude');
  console.log('');
}

main().catch((err) => {
  error(`Installation failed: ${err.message}`);
});
```

**Make executable:**
```bash
chmod +x pai-plugin/setup.ts
```

**Usage:**
```bash
bun setup.ts
```

---

### Task 4.3: Create Uninstall Script

**File:** `pai-plugin/uninstall.sh`

```bash
#!/bin/bash

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
```

---

### Task 4.4: Create Validation Script

**File:** `pai-plugin/scripts/validate-installation.sh`

**Purpose:** Verify plugin is correctly installed

```bash
#!/bin/bash

# Validation script
echo "PAI-Boilerplate Installation Validation"
echo "========================================"
echo ""

errors=0
warnings=0

# Check Claude Code
if command -v claude &> /dev/null; then
  echo "✅ Claude Code: Installed"
else
  echo "❌ Claude Code: Not found"
  ((errors++))
fi

# Check Bun
if command -v bun &> /dev/null; then
  echo "✅ Bun: Installed ($(bun --version))"
else
  echo "⚠️  Bun: Not found (optional, but recommended)"
  ((warnings++))
fi

# Check ~/.claude directory
if [ -d "$HOME/.claude" ]; then
  echo "✅ ~/.claude: Directory exists"
else
  echo "❌ ~/.claude: Directory missing"
  ((errors++))
fi

# Check settings.json
if [ -f "$HOME/.claude/settings.json" ]; then
  echo "✅ settings.json: Exists"
else
  echo "❌ settings.json: Missing"
  ((errors++))
fi

# Check .mcp.json
if [ -f "$HOME/.claude/.mcp.json" ]; then
  echo "✅ .mcp.json: Exists"
else
  echo "⚠️  .mcp.json: Missing (optional)"
  ((warnings++))
fi

# Check plugin registration (requires claude to be running)
# This would need to call `claude plugin list` or similar

echo ""
echo "Summary:"
echo "  Errors: $errors"
echo "  Warnings: $warnings"
echo ""

if [ $errors -gt 0 ]; then
  echo "❌ Installation validation failed"
  exit 1
else
  echo "✅ Installation validation passed"
  exit 0
fi
```

---

## Verification Checklist

- [ ] Installation script created (`install.sh` or `setup.ts`)
- [ ] Script is executable (`chmod +x`)
- [ ] Uninstall script created
- [ ] Validation script created
- [ ] Scripts tested on fresh environment
- [ ] Error handling works correctly
- [ ] Backup functionality verified
- [ ] Configuration replacement works
- [ ] Directory creation successful
- [ ] User prompts are clear and helpful

---

## Testing Scenarios

### Test 1: Fresh Install
```bash
# In a test environment without ~/.claude
./install.sh

# Verify:
# - ~/.claude created
# - settings.json copied and customized
# - Prompts work correctly
# - No errors
```

### Test 2: Existing Configuration
```bash
# With existing ~/.claude/settings.json
./install.sh

# Verify:
# - Backup created
# - User prompted about overwrite
# - No data loss
```

### Test 3: Uninstall
```bash
./uninstall.sh

# Verify:
# - Backup created before removal
# - Plugin files removed
# - User data preserved
```

---

## Files Created Summary

**Created (4 files):**
1. `pai-plugin/install.sh` - Main installation script
2. `pai-plugin/setup.ts` - TypeScript alternative (optional)
3. `pai-plugin/uninstall.sh` - Removal script
4. `pai-plugin/scripts/validate-installation.sh` - Validation

---

## Next Phase

Once Phase 4 is complete, proceed to:
→ [Phase 5: Documentation](./PHASE_5.md)

This will create comprehensive user and developer documentation.
