# PAI Hook System v1.0.0 - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/Write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing PAI Hook System v1.0.0 - Event-driven automation for Claude Code. Security validation, session management, and context injection.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check for PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "✓ pai-core-install is installed"
else
  echo "❌ pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing hooks directory
if [ -d "$PAI_CHECK/hooks" ]; then
  echo "⚠️  Existing hooks directory found at: $PAI_CHECK/hooks"
  ls "$PAI_CHECK/hooks"/*.ts 2>/dev/null | head -10
else
  echo "✓ No existing hooks directory (clean install)"
fi

# Check Claude settings for existing hooks
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ -f "$CLAUDE_SETTINGS" ]; then
  if grep -q '"hooks"' "$CLAUDE_SETTINGS" 2>/dev/null; then
    echo "⚠️  Existing hooks configuration found in settings.json"
  else
    echo "✓ No hooks configured in settings.json"
  fi
else
  echo "✓ No Claude settings.json (will be created)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed: $(bun --version)"
else
  echo "❌ Bun not installed - REQUIRED!"
fi

# Check environment variables
echo ""
echo "Environment Variables:"
echo "  DA: ${DA:-'NOT SET (default: PAI)'}"
echo "  TIME_ZONE: ${TIME_ZONE:-'NOT SET (default: system)'}"
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing hooks directory: [Yes (N hooks) / No]
- Claude settings.json: [has hooks / no hooks / doesn't exist]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- DA environment variable: [set / not set]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing hooks found)

**Only ask if existing hooks directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing hooks detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Merge with existing (Recommended)", "description": "Adds new hooks alongside your existing hooks"},
    {"label": "Backup and replace", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Environment Variables (if not set)

**Only ask if DA or TIME_ZONE are not set:**

```json
{
  "header": "Environment",
  "question": "Environment variables not set. How should I configure them?",
  "multiSelect": false,
  "options": [
    {"label": "Create .env file (Recommended)", "description": "Creates $PAI_DIR/.env with default values"},
    {"label": "I'll set them in shell profile", "description": "Skip .env, set in ~/.zshrc or ~/.bashrc"},
    {"label": "Use defaults", "description": "Continue with default values (DA=PAI)"}
  ]
}
```

### Question 3: Hook Selection

```json
{
  "header": "Hooks",
  "question": "Which hooks should I enable?",
  "multiSelect": true,
  "options": [
    {"label": "Security Validator (Recommended)", "description": "Blocks dangerous bash commands"},
    {"label": "Session Initializer (Recommended)", "description": "Sets up session context at start"},
    {"label": "Core Context Loader (Recommended)", "description": "Loads CORE skill at session start"},
    {"label": "Tab Title Updater", "description": "Updates terminal tab with task context"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Hook System v1.0.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation using choices above"},
    {"label": "Show me what will change", "description": "Lists all files that will be created/modified"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/hook-system-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup hooks directory
[ -d "$PAI_DIR/hooks" ] && cp -r "$PAI_DIR/hooks" "$BACKUP_DIR/"

# Backup settings.json
[ -f "$HOME/.claude/settings.json" ] && cp "$HOME/.claude/settings.json" "$BACKUP_DIR/"

echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create hooks directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy hook files from pack", "status": "pending", "activeForm": "Copying hook files"},
    {"content": "Copy library files from pack", "status": "pending", "activeForm": "Copying library files"},
    {"content": "Set up environment variables", "status": "pending", "activeForm": "Setting up environment"},
    {"content": "Register hooks in settings.json", "status": "pending", "activeForm": "Registering hooks"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Hooks Directory Structure

**Mark todo "Create hooks directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/hooks/lib"
```

**Mark todo as completed.**

### 4.2 Copy Hook Files

**Mark todo "Copy hook files from pack" as in_progress.**

Copy hook files from the pack's `src/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/security-validator.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/initialize-session.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/load-core-context.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/update-tab-titles.ts" "$PAI_DIR/hooks/"
```

**Files copied:**
- `security-validator.ts` - Blocks dangerous bash commands (PreToolUse)
- `initialize-session.ts` - Sets up session context (SessionStart)
- `load-core-context.ts` - Loads CORE skill context (SessionStart)
- `update-tab-titles.ts` - Updates terminal tab title (UserPromptSubmit)

**Mark todo as completed.**

### 4.3 Copy Library Files

**Mark todo "Copy library files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/lib/observability.ts" "$PAI_DIR/hooks/lib/"
```

**Mark todo as completed.**

### 4.4 Set Up Environment Variables (If User Chose Yes)

**Mark todo "Set up environment variables" as in_progress.**

**Only execute if user chose to create .env file:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create .env if it doesn't exist
if [ ! -f "$PAI_DIR/.env" ]; then
  cat > "$PAI_DIR/.env" << 'EOF'
# PAI Hook System Configuration
DA="PAI"
PAI_DIR="${HOME}/.claude"
TIME_ZONE="America/Los_Angeles"
PAI_SOURCE_APP="${DA}"
EOF
  echo "Created $PAI_DIR/.env"
else
  echo ".env already exists at $PAI_DIR/.env"
fi
```

Tell the user:
```
"Created .env at $PAI_DIR/.env
You can customize:
- DA - Your AI assistant name (default: PAI)
- TIME_ZONE - Your timezone
- PAI_SOURCE_APP - Source app identifier"
```

**Mark todo as completed (or skip if user declined).**

### 4.5 Register Hooks in settings.json

**Mark todo "Register hooks in settings.json" as in_progress.**

Read the hook configuration from `config/settings-hooks.json` and merge it into `~/.claude/settings.json`.

**For new installations:**
```bash
# If no settings.json exists, copy the template
mkdir -p ~/.claude
cp "$PACK_DIR/config/settings-hooks.json" ~/.claude/settings.json
```

**For existing installations:**
Merge the hooks section from `config/settings-hooks.json` into the existing `~/.claude/settings.json`. Preserve existing hooks.

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Hook System Verification ==="

# Check hook files
echo "Checking hook files..."
[ -f "$PAI_DIR/hooks/security-validator.ts" ] && echo "✓ security-validator.ts" || echo "❌ security-validator.ts missing"
[ -f "$PAI_DIR/hooks/initialize-session.ts" ] && echo "✓ initialize-session.ts" || echo "❌ initialize-session.ts missing"
[ -f "$PAI_DIR/hooks/load-core-context.ts" ] && echo "✓ load-core-context.ts" || echo "❌ load-core-context.ts missing"
[ -f "$PAI_DIR/hooks/update-tab-titles.ts" ] && echo "✓ update-tab-titles.ts" || echo "❌ update-tab-titles.ts missing"

# Check library files
echo ""
echo "Checking library files..."
[ -f "$PAI_DIR/hooks/lib/observability.ts" ] && echo "✓ observability.ts" || echo "❌ observability.ts missing"

# Check settings.json
echo ""
echo "Checking settings.json..."
if [ -f ~/.claude/settings.json ]; then
  if grep -q '"hooks"' ~/.claude/settings.json; then
    echo "✓ Hooks section exists in settings.json"
    if grep -q "security-validator" ~/.claude/settings.json; then
      echo "✓ Security validator registered"
    fi
    if grep -q "initialize-session" ~/.claude/settings.json; then
      echo "✓ Initialize session registered"
    fi
    if grep -q "load-core-context" ~/.claude/settings.json; then
      echo "✓ Load core context registered"
    fi
  else
    echo "❌ Hooks section missing from settings.json"
  fi
else
  echo "❌ settings.json not found"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

Tell the user:
```
"Hooks are loaded when Claude Code starts. Please restart Claude Code to activate the hooks."
```

---

## Success/Failure Messages

### On Success

```
"PAI Hook System v1.0.0 installed successfully!

What's available:
- Security Validator - Blocks dangerous bash commands
- Session Initializer - Sets up context at session start
- Core Context Loader - Loads CORE skill automatically
- Tab Title Updater - Shows task context in terminal tab

The hooks fire automatically on the appropriate events.

**Important:** Restart Claude Code to activate the hooks."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/
4. Verify hooks are registered in ~/.claude/settings.json
5. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "bun: command not found"

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal or source ~/.bashrc
```

### Hooks not firing

```bash
# Check hooks are registered
grep -A 30 '"hooks"' ~/.claude/settings.json

# Verify file paths use $PAI_DIR correctly
echo "PAI_DIR is: $PAI_DIR"

# Restart Claude Code to reload hooks
# Hooks are only loaded at startup
```

### Security validator blocking valid commands

```bash
# Review attack patterns in security-validator.ts
cat $PAI_DIR/hooks/security-validator.ts | grep -A 5 "ATTACK_PATTERNS"

# Adjust patterns or add exceptions as needed
```

### Tab titles not updating

```bash
# Check terminal supports OSC escape sequences
# Most modern terminals (iTerm2, Hyper, etc.) support this

# Verify the UserPromptSubmit hook is registered
grep "update-tab-titles" ~/.claude/settings.json
```

---

## What's Included

| File | Purpose |
|------|---------|
| `security-validator.ts` | PreToolUse - blocks dangerous bash commands |
| `initialize-session.ts` | SessionStart - sets up session context |
| `load-core-context.ts` | SessionStart - loads CORE skill |
| `update-tab-titles.ts` | UserPromptSubmit - updates terminal tab |
| `lib/observability.ts` | Shared logging and event utilities |

---

## Usage

### Automatic Behavior

Hooks fire automatically on their respective events:
- **SessionStart**: Context is loaded, session initialized
- **PreToolUse (Bash)**: Commands are validated before execution
- **UserPromptSubmit**: Terminal tab title is updated

### Hook Events

| Event | When | Hooks |
|-------|------|-------|
| `SessionStart` | Claude Code starts | initialize-session, load-core-context |
| `PreToolUse` | Before tool execution | security-validator (Bash only) |
| `PostToolUse` | After tool execution | (extensible) |
| `UserPromptSubmit` | User sends message | update-tab-titles |
| `Stop` | Session ends | (extensible) |

### Adding Custom Hooks

Create a new `.ts` file in `$PAI_DIR/hooks/` and register it in `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/my-custom-hook.ts"
          }
        ]
      }
    ]
  }
}
```
