# Installation Guide: Kai History System

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../../README.md#pack-system)

This pack adds automatic memory to your entire AI infrastructure. The Kai History System is not just about agent outputs - it's a granular context-tracking system for EVERYTHING that happens:

- **Continuous Learning**: Capture insights as they happen
- **Bug Fixing**: Trace exactly what was done when debugging
- **Avoiding Mistakes**: Learn from past errors automatically
- **After-Action Reviews**: Analyze what worked and what didn't
- **Restoration Points**: Recover from data loss with historical snapshots

**Core principle:** Work normally, documentation handles itself.

---

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system with hook support)
- **Write access** to `$PAI_DIR/` (or your PAI directory)
- **kai-hook-system Pack** installed (this pack depends on the hook infrastructure)

---

## Pre-Installation: System Analysis

### Step 0.1: Verify Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check that hook system is installed
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ Hook system is installed"
else
  echo "❌ Hook system NOT installed - install kai-hook-system first!"
fi

# Check hooks directory exists
if [ -d "$PAI_CHECK/hooks" ]; then
  echo "✓ Hooks directory exists"
  ls "$PAI_CHECK/hooks"/*.ts 2>/dev/null | head -5
else
  echo "❌ Hooks directory missing - install kai-hook-system first!"
fi
```

### Step 0.2: Detect Existing History System

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check for existing history directory
if [ -d "$PAI_CHECK/history" ]; then
  echo "⚠️  History directory EXISTS at: $PAI_CHECK/history"
  echo "Existing categories:"
  ls -la "$PAI_CHECK/history" 2>/dev/null
else
  echo "✓ No existing history directory (clean install)"
fi
```

### Step 0.3: Backup Existing History (If Needed)

```bash
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

if [ -d "$PAI_CHECK/history" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_CHECK/history" "$BACKUP_DIR/history"
  echo "✓ Backed up history to $BACKUP_DIR/history"
fi
```

---

## Step 1: Create Directory Structure

```bash
# Create all required directories
mkdir -p $PAI_DIR/hooks/lib
mkdir -p $PAI_DIR/history/{sessions,learnings,research,decisions,raw-outputs}
mkdir -p $PAI_DIR/history/execution/{features,bugs,refactors}

# Verify structure
ls -la $PAI_DIR/
ls -la $PAI_DIR/history/
```

---

## Step 2: Install Source Files

Copy all TypeScript files from this pack's `src/` directory to your hooks directory:

```bash
# Copy hook files
cp src/capture-all-events.ts $PAI_DIR/hooks/
cp src/stop-hook.ts $PAI_DIR/hooks/
cp src/subagent-stop-hook.ts $PAI_DIR/hooks/
cp src/capture-session-summary.ts $PAI_DIR/hooks/

# Copy library files
cp src/lib/metadata-extraction.ts $PAI_DIR/hooks/lib/

# Verify all files are in place
ls -la $PAI_DIR/hooks/*.ts
ls -la $PAI_DIR/hooks/lib/*.ts
```

---

## Step 3: Register Hooks in settings.json

Merge the hook configuration from `config/settings-hooks.json` into your `~/.claude/settings.json`.

**For existing installations:** Add the history hooks alongside your existing hooks in `~/.claude/settings.json`.

---

## Step 4: Restart Claude Code

Hooks are only loaded when Claude Code starts. Restart Claude Code to activate the new hooks.

---

## Installation Verification

After completing installation, run the verification steps in [VERIFY.md](VERIFY.md).

---

## Anti-Simplification Directive

**CRITICAL FOR AI AGENTS:**

This installation MUST be completed EXACTLY as specified. DO NOT:
- Skip any files
- Summarize or simplify code
- Modify file paths
- Skip verification steps

After installation, you MUST complete the verification checklist in [VERIFY.md](VERIFY.md).
