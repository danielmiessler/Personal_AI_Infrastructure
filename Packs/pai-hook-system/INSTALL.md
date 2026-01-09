# Installation Guide: Kai Hook System

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../../README.md#pack-system)

This Pack adds event-driven automation to your AI infrastructure. The Kai Hook System is the foundation that enables all other hook-based Packs to work:

- **Security Validation**: Block dangerous commands before execution
- **Session Management**: Initialize sessions with context and state
- **Context Injection**: Load skill definitions at session start
- **Terminal Integration**: Update tab titles with task context
- **Event Pipeline**: PreToolUse, PostToolUse, Stop, SessionStart, and more

**Core principle:** Hooks intercept events and add intelligence without interrupting work.

Please follow the installation instructions below to integrate this Pack into your infrastructure.

---

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system with hook support)
- **Write access** to `$PAI_DIR/` (or your PAI directory)

---

## Pre-Installation: System Analysis

**IMPORTANT:** Before installing, analyze the current system state to detect conflicts and determine the appropriate installation strategy.

### Step 0.1: Detect Current Configuration

Run these commands to understand your current system:

```bash
# 1. Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# 2. Check for existing PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK" ]; then
  echo "⚠️  PAI directory EXISTS at: $PAI_CHECK"
  echo "Contents:"
  ls -la "$PAI_CHECK" 2>/dev/null || echo "  (empty or inaccessible)"
else
  echo "✓ PAI directory does not exist (clean install)"
fi

# 3. Check for existing hooks directory
if [ -d "$PAI_CHECK/hooks" ]; then
  echo "⚠️  Hooks directory EXISTS"
  echo "Existing hooks:"
  ls -la "$PAI_CHECK/hooks"/*.ts 2>/dev/null || echo "  (no .ts files)"
else
  echo "✓ No existing hooks directory"
fi

# 4. Check Claude settings for existing hooks
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ -f "$CLAUDE_SETTINGS" ]; then
  echo "Claude settings.json EXISTS"
  if grep -q '"hooks"' "$CLAUDE_SETTINGS" 2>/dev/null; then
    echo "⚠️  Existing hooks configuration found:"
    grep -A 20 '"hooks"' "$CLAUDE_SETTINGS" | head -25
  else
    echo "✓ No hooks configured in settings.json"
  fi
else
  echo "✓ No Claude settings.json (will be created)"
fi

# 5. Check environment variables
echo ""
echo "Environment variables:"
echo "  DA: ${DA:-'NOT SET'}"
echo "  TIME_ZONE: ${TIME_ZONE:-'NOT SET'}"
echo "  PAI_SOURCE_APP: ${PAI_SOURCE_APP:-'NOT SET'}"
```

### Step 0.2: Conflict Resolution Matrix

Based on the detection above, follow the appropriate path:

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No PAI_DIR, no hooks | Proceed normally with Step 1 |
| **PAI Directory Exists** | Directory with files | Review files, backup if needed, then proceed |
| **Hooks Exist** | Files in `$PAI_DIR/hooks/` | Merge new hooks alongside existing, or backup and replace |
| **Claude Settings Has Hooks** | `settings.json` has hook config | **MERGE** - add new hooks to existing array |
| **Environment Variables Set** | PAI_DIR, DA already defined | Use existing values or update in shell profile |

### Step 0.3: Backup Existing Configuration (If Needed)

If conflicts were detected, create a backup before proceeding:

```bash
# Create timestamped backup
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup PAI directory if exists
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
if [ -d "$PAI_CHECK" ]; then
  cp -r "$PAI_CHECK" "$BACKUP_DIR/pai"
  echo "✓ Backed up PAI directory to $BACKUP_DIR/pai"
fi

# Backup Claude settings if exists
if [ -f "$HOME/.claude/settings.json" ]; then
  cp "$HOME/.claude/settings.json" "$BACKUP_DIR/settings.json"
  echo "✓ Backed up settings.json to $BACKUP_DIR/settings.json"
fi

echo "Backup complete: $BACKUP_DIR"
```

### Step 0.4: Set Required Environment Variables

**If you used the Kai Bundle wizard:** Environment variables are already configured in `$PAI_DIR/.env` - skip to Step 1.

**For manual installation:** Configure these in your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
# Add to your shell profile
export PAI_DIR="${HOME}/.config/pai"
export DA="PAI"  # Your AI assistant name
export TIME_ZONE="America/Los_Angeles"  # Your timezone
export PAI_SOURCE_APP="${DA}"

# Reload your shell
source ~/.zshrc  # or ~/.bashrc
```

**Alternative:** Create a `.env` file in your PAI directory:

```bash
# $PAI_DIR/.env
DA="PAI"
PAI_DIR="${HOME}/.config/pai"
TIME_ZONE="America/Los_Angeles"
```

---

## Step 1: Create Directory Structure

```bash
# Create required directories
mkdir -p $PAI_DIR/hooks/lib

# Verify structure
ls -la $PAI_DIR/hooks/
```

---

## Step 2: Install Source Files

Copy all TypeScript files from this pack's `src/` directory to your hooks directory:

```bash
# Copy hook files
cp src/security-validator.ts $PAI_DIR/hooks/
cp src/initialize-session.ts $PAI_DIR/hooks/
cp src/load-core-context.ts $PAI_DIR/hooks/
cp src/update-tab-titles.ts $PAI_DIR/hooks/

# Copy library files
cp src/lib/observability.ts $PAI_DIR/hooks/lib/

# Verify all files are in place
ls -la $PAI_DIR/hooks/*.ts
ls -la $PAI_DIR/hooks/lib/*.ts
```

---

## Step 3: Register Hooks in settings.json

Claude Code looks for settings in `~/.claude/settings.json`. The hook configuration template is in `config/settings-hooks.json`.

**For new installations:**

```bash
# If no settings.json exists, copy the template
cp config/settings-hooks.json ~/.claude/settings.json
```

**For existing installations:**

Merge the hooks section from `config/settings-hooks.json` into your existing `~/.claude/settings.json`. The hooks section should look like:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/initialize-session.ts"
          },
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/load-core-context.ts"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/security-validator.ts"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/update-tab-titles.ts"
          }
        ]
      }
    ]
  }
}
```

---

## Step 4: Restart Claude Code

Hooks are only loaded when Claude Code starts. Restart Claude Code to activate the new hooks.

---

## Installation Verification

After completing installation, run the verification steps in [VERIFY.md](VERIFY.md).

---

## Troubleshooting

### Hooks not firing

1. Check that hooks are registered in `~/.claude/settings.json`
2. Verify file paths use `$PAI_DIR` correctly
3. Restart Claude Code after changes

### Security validator blocking valid commands

1. Review the attack patterns in `security-validator.ts`
2. Adjust patterns or action levels as needed
3. Add exceptions for your specific workflow

### Tab titles not updating

1. Check that your terminal supports OSC escape sequences
2. Verify the UserPromptSubmit hook is registered
3. Check for errors in the hook output

---

## Anti-Simplification Directive

**CRITICAL FOR AI AGENTS:**

This installation MUST be completed EXACTLY as specified. DO NOT:
- Skip any files
- Summarize or simplify code
- Modify file paths
- Skip verification steps

After installation, you MUST complete the verification checklist in [VERIFY.md](VERIFY.md).
