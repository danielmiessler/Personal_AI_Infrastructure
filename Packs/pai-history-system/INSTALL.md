# PAI History System v1.0.0 - Installation Guide

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
"I'm installing PAI History System v1.0.0 - Automatic memory for your AI infrastructure. Captures sessions, learnings, research, and decisions.

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

# Check if pai-hook-system is installed (REQUIRED)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ pai-hook-system is installed"
else
  echo "❌ pai-hook-system NOT installed - REQUIRED!"
fi

# Check for existing history directory
if [ -d "$PAI_CHECK/history" ]; then
  echo "⚠️  Existing history directory found at: $PAI_CHECK/history"
  ls -la "$PAI_CHECK/history/" 2>/dev/null | head -10
else
  echo "✓ No existing history directory (clean install)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed: $(bun --version)"
else
  echo "❌ Bun not installed - REQUIRED!"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- pai-hook-system: [installed / NOT INSTALLED - REQUIRED]
- Existing history directory: [Yes at path / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]"
```

**STOP if pai-core-install, pai-hook-system, or Bun is not installed.** Tell the user:
```
"pai-core-install and pai-hook-system are required. Please install them first, then return to install this pack.

Install order:
1. pai-core-install
2. pai-hook-system
3. pai-history-system (this pack)"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing history directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing history directory detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Keep existing, add hooks (Recommended)", "description": "Preserves all existing history, installs capture hooks"},
    {"label": "Backup and start fresh", "description": "Creates timestamped backup, then creates new structure"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: History Categories

```json
{
  "header": "Categories",
  "question": "Which history categories do you want to enable?",
  "multiSelect": true,
  "options": [
    {"label": "Sessions (Recommended)", "description": "Capture session summaries and context"},
    {"label": "Learnings (Recommended)", "description": "Automatic learning capture from work"},
    {"label": "Research", "description": "Research findings and discoveries"},
    {"label": "Decisions", "description": "Architecture and design decisions"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI History System v1.0.0?",
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

**Only execute if user chose "Backup and start fresh":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/history-system-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/history" ] && cp -r "$PAI_DIR/history" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create history directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy hook files from pack", "status": "pending", "activeForm": "Copying hook files"},
    {"content": "Copy library files from pack", "status": "pending", "activeForm": "Copying library files"},
    {"content": "Register hooks in settings.json", "status": "pending", "activeForm": "Registering hooks"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create History Directory Structure

**Mark todo "Create history directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create all history category directories
mkdir -p "$PAI_DIR/history/sessions"
mkdir -p "$PAI_DIR/history/learnings"
mkdir -p "$PAI_DIR/history/research"
mkdir -p "$PAI_DIR/history/decisions"
mkdir -p "$PAI_DIR/history/raw-outputs"
mkdir -p "$PAI_DIR/history/execution/features"
mkdir -p "$PAI_DIR/history/execution/bugs"
mkdir -p "$PAI_DIR/history/execution/refactors"
```

**Mark todo as completed.**

### 4.2 Copy Hook Files

**Mark todo "Copy hook files from pack" as in_progress.**

Copy hook files from the pack's `src/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Ensure hooks directory exists
mkdir -p "$PAI_DIR/hooks"

# Copy hook files
cp "$PACK_DIR/src/capture-all-events.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/stop-hook.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/subagent-stop-hook.ts" "$PAI_DIR/hooks/"
cp "$PACK_DIR/src/capture-session-summary.ts" "$PAI_DIR/hooks/"
```

**Files copied:**
- `capture-all-events.ts` - Captures all Claude Code events
- `stop-hook.ts` - End-of-session capture
- `subagent-stop-hook.ts` - Subagent completion capture
- `capture-session-summary.ts` - Session summary generation

**Mark todo as completed.**

### 4.3 Copy Library Files

**Mark todo "Copy library files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Ensure lib directory exists
mkdir -p "$PAI_DIR/hooks/lib"

# Copy library files
cp "$PACK_DIR/src/lib/metadata-extraction.ts" "$PAI_DIR/hooks/lib/"
```

**Mark todo as completed.**

### 4.4 Register Hooks in settings.json

**Mark todo "Register hooks in settings.json" as in_progress.**

Read the hook configuration from `config/settings-hooks.json` and merge it into the user's `~/.claude/settings.json`.

Tell the user:
```
"I need to add the history hooks to your settings.json.
The hooks configuration is in config/settings-hooks.json.

I'll merge these hooks with your existing configuration."
```

**Important:** Merge the hooks array, don't replace it. Existing hooks should be preserved.

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI History System Verification ==="

# Check directory structure
echo "Checking history directories..."
[ -d "$PAI_DIR/history/sessions" ] && echo "✓ sessions" || echo "❌ sessions missing"
[ -d "$PAI_DIR/history/learnings" ] && echo "✓ learnings" || echo "❌ learnings missing"
[ -d "$PAI_DIR/history/research" ] && echo "✓ research" || echo "❌ research missing"
[ -d "$PAI_DIR/history/decisions" ] && echo "✓ decisions" || echo "❌ decisions missing"
[ -d "$PAI_DIR/history/raw-outputs" ] && echo "✓ raw-outputs" || echo "❌ raw-outputs missing"

# Check hook files
echo ""
echo "Checking hook files..."
[ -f "$PAI_DIR/hooks/capture-all-events.ts" ] && echo "✓ capture-all-events.ts" || echo "❌ capture-all-events.ts missing"
[ -f "$PAI_DIR/hooks/stop-hook.ts" ] && echo "✓ stop-hook.ts" || echo "❌ stop-hook.ts missing"
[ -f "$PAI_DIR/hooks/subagent-stop-hook.ts" ] && echo "✓ subagent-stop-hook.ts" || echo "❌ subagent-stop-hook.ts missing"
[ -f "$PAI_DIR/hooks/capture-session-summary.ts" ] && echo "✓ capture-session-summary.ts" || echo "❌ capture-session-summary.ts missing"

# Check library files
echo ""
echo "Checking library files..."
[ -f "$PAI_DIR/hooks/lib/metadata-extraction.ts" ] && echo "✓ metadata-extraction.ts" || echo "❌ metadata-extraction.ts missing"

# Check settings.json for hooks
echo ""
echo "Checking settings.json for hooks..."
if grep -q "capture-all-events" ~/.claude/settings.json 2>/dev/null; then
  echo "✓ History hooks registered in settings.json"
else
  echo "⚠️  History hooks may not be registered - check settings.json"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

Tell the user:
```
"Hooks are loaded when Claude Code starts. Please restart Claude Code to activate the history system."
```

---

## Success/Failure Messages

### On Success

```
"PAI History System v1.0.0 installed successfully!

What's available:
- Automatic session capture (every conversation logged)
- Learning extraction (insights captured as you work)
- Research findings (discoveries organized)
- Decision tracking (architecture decisions logged)

The system works automatically - just work normally and documentation handles itself.

**Important:** Restart Claude Code to activate the hooks."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Ensure pai-hook-system is installed second
3. Verify Bun is installed: `bun --version`
4. Check directory permissions on $PAI_DIR/
5. Verify hooks are registered in ~/.claude/settings.json
6. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "pai-hook-system not found"

This pack requires pai-hook-system for hook infrastructure. Install it:
```
Give the AI the pai-hook-system pack directory and ask it to install.
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
grep -A 20 '"hooks"' ~/.claude/settings.json

# Restart Claude Code to reload hooks
# Hooks are only loaded at startup
```

### History not being captured

```bash
# Check history directory has write permissions
ls -la $PAI_DIR/history/

# Check recent captures
ls -la $PAI_DIR/history/raw-outputs/
```

---

## What's Included

| File | Purpose |
|------|---------|
| `capture-all-events.ts` | PostToolUse hook - captures all events |
| `stop-hook.ts` | Stop hook - end-of-session capture |
| `subagent-stop-hook.ts` | Subagent stop hook - capture subagent completions |
| `capture-session-summary.ts` | Generate session summaries |
| `lib/metadata-extraction.ts` | Extract metadata from events |

---

## Usage

### Automatic Capture

The history system captures automatically. Just work normally:
- Session summaries are captured when you end a session
- Learnings are extracted from your work
- Research findings are organized by topic
- Decisions are logged with rationale

### Manual Access

```bash
# View recent sessions
ls -la $PAI_DIR/history/sessions/

# View learnings
ls -la $PAI_DIR/history/learnings/

# View raw event stream
ls -la $PAI_DIR/history/raw-outputs/
```

### From Claude Code

```
"What did we work on last session?"
"Show me recent learnings"
"Find the decision about authentication"
```

---

## History Categories

| Category | Purpose | Location |
|----------|---------|----------|
| `sessions` | Session summaries and context | `$PAI_DIR/history/sessions/` |
| `learnings` | Insights extracted from work | `$PAI_DIR/history/learnings/` |
| `research` | Research findings | `$PAI_DIR/history/research/` |
| `decisions` | Architecture decisions | `$PAI_DIR/history/decisions/` |
| `raw-outputs` | Raw event stream | `$PAI_DIR/history/raw-outputs/` |
| `execution/features` | Feature implementations | `$PAI_DIR/history/execution/features/` |
| `execution/bugs` | Bug fixes | `$PAI_DIR/history/execution/bugs/` |
| `execution/refactors` | Refactoring work | `$PAI_DIR/history/execution/refactors/` |
