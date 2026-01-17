# PAI Algorithm Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Algorithm Skill v2.3.0 - THE ALGORITHM execution engine. This provides structured task execution using Current State → Ideal State methodology with effort classification, ISC tracking, and phase management.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "OK pai-core-install is installed"
else
  echo "ERROR pai-core-install NOT installed - REQUIRED!"
fi

# Check for pai-agents-skill (recommended)
if [ -d "$PAI_CHECK/skills/Agents" ]; then
  echo "OK pai-agents-skill is installed (recommended for agent composition)"
else
  echo "NOTE pai-agents-skill not installed (optional but recommended)"
fi

# Check for existing THEALGORITHM skill
if [ -d "$PAI_CHECK/skills/THEALGORITHM" ]; then
  echo "WARNING Existing THEALGORITHM skill found at: $PAI_CHECK/skills/THEALGORITHM"
  ls "$PAI_CHECK/skills/THEALGORITHM/"
else
  echo "OK No existing THEALGORITHM skill (clean install)"
fi

# Check for Bun runtime (REQUIRED)
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check for MEMORY directories
if [ -d "$PAI_CHECK/MEMORY/Learning/ALGORITHM" ]; then
  echo "OK ALGORITHM learning directory exists"
else
  echo "NOTE ALGORITHM learning directory will be created"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- pai-agents-skill: [installed / not installed (optional)]
- Existing THEALGORITHM: [Yes / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- MEMORY structure: [exists / will be created]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing THEALGORITHM directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing ALGORITHM skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation, keep existing"}
  ]
}
```

### Question 2: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Algorithm Skill v2.3.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation"},
    {"label": "Show me what will change", "description": "Lists all files that will be created"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/algorithm-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/THEALGORITHM" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/THEALGORITHM" "$BACKUP_DIR/"
  echo "Backup created at: $BACKUP_DIR"
fi
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files from pack", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Create MEMORY directories", "status": "pending", "activeForm": "Creating MEMORY directories"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/THEALGORITHM/"{Data,Tools,Phases,Reference}
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/THEALGORITHM/` directory:

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/skills/THEALGORITHM/"* "$PAI_DIR/skills/THEALGORITHM/"
```

**Files included:**
- `SKILL.md` - Main skill definition
- `Tools/EffortClassifier.ts` - Classifies task effort level
- `Tools/ISCManager.ts` - Manages Ideal State Criteria
- `Tools/AlgorithmDisplay.ts` - Visual status display
- `Tools/CapabilityLoader.ts` - Loads effort-specific capabilities
- `Phases/*.md` - Phase documentation
- `Reference/*.md` - Reference materials

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/THEALGORITHM/Tools"
bun add yaml
```

**Mark todo as completed.**

### 4.4 Create MEMORY Directories

**Mark todo "Create MEMORY directories" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/MEMORY/Work"
mkdir -p "$PAI_DIR/MEMORY/State"
mkdir -p "$PAI_DIR/MEMORY/Learning/ALGORITHM"
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Algorithm Skill v2.3.0 Verification ==="

# Check SKILL.md
[ -f "$PAI_DIR/skills/THEALGORITHM/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"

# Check tools
echo ""
echo "Checking tools..."
for tool in EffortClassifier ISCManager AlgorithmDisplay CapabilityLoader; do
  [ -f "$PAI_DIR/skills/THEALGORITHM/Tools/${tool}.ts" ] && echo "OK ${tool}.ts" || echo "ERROR ${tool}.ts missing"
done

# Test tool execution
echo ""
echo "Testing tool execution..."
bun run "$PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts" --help && echo "OK Tool executes" || echo "ERROR Tool execution failed"

# Check MEMORY directories
echo ""
echo "Checking MEMORY directories..."
[ -d "$PAI_DIR/MEMORY/Work" ] && echo "OK MEMORY/Work" || echo "ERROR MEMORY/Work missing"
[ -d "$PAI_DIR/MEMORY/Learning/ALGORITHM" ] && echo "OK MEMORY/Learning/ALGORITHM" || echo "ERROR MEMORY/Learning/ALGORITHM missing"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Algorithm Skill v2.3.0 installed successfully!

What's available:
- EffortClassifier: Automatically classifies task complexity (QUICK/STANDARD/SIGNIFICANT/TRANSFORMATIONAL)
- ISCManager: Creates and tracks Ideal State Criteria for tasks
- AlgorithmDisplay: Shows visual status during execution
- CapabilityLoader: Loads appropriate capabilities for effort level

THE ALGORITHM activates automatically when you mention 'run the algorithm' or start complex tasks.

Usage:
- 'Run the algorithm on [task]' - Explicit activation
- 'Use the algorithm for [project]' - Structured execution
- Complex tasks automatically trigger algorithm workflow"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/skills/
4. Verify yaml package installed: `cd $PAI_DIR/skills/THEALGORITHM/Tools && bun add yaml`
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
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or restart terminal
```

### "Cannot find module 'yaml'"

```bash
cd $PAI_DIR/skills/THEALGORITHM/Tools
bun add yaml
```

### Tool execution fails

```bash
# Check tool syntax
bun run $PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts --help

# If TypeScript errors, ensure bun is up to date
bun upgrade
```

---

## What's Included

### Core Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |
| `Tools/EffortClassifier.ts` | Task complexity classification |
| `Tools/ISCManager.ts` | Ideal State Criteria management |
| `Tools/AlgorithmDisplay.ts` | Visual execution status |
| `Tools/CapabilityLoader.ts` | Effort-specific capabilities |

### MEMORY Structure

| Directory | Purpose |
|-----------|---------|
| `MEMORY/Work/` | Active work tracking |
| `MEMORY/State/` | Algorithm state persistence |
| `MEMORY/Learning/ALGORITHM/` | Algorithm learning captures |

---

## Usage

### Automatic Activation

THE ALGORITHM activates when:
- User says "run the algorithm"
- User says "use the algorithm"
- Complex multi-step tasks are detected

### Effort Levels

| Level | Tasks | Approach |
|-------|-------|----------|
| QUICK | Simple fixes, single-file changes | Direct execution |
| STANDARD | Features, multi-file changes | Structured with ISC |
| SIGNIFICANT | Major features, refactoring | Full algorithm with phases |
| TRANSFORMATIONAL | Architecture changes, new systems | Extended planning and validation |

### Manual Tool Usage

```bash
# Classify effort
bun run $PAI_DIR/skills/THEALGORITHM/Tools/EffortClassifier.ts --request "Add dark mode"

# Manage ISC
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts create --request "Build auth system"
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts show
bun run $PAI_DIR/skills/THEALGORITHM/Tools/ISCManager.ts clear

# Start algorithm display
bun run $PAI_DIR/skills/THEALGORITHM/Tools/AlgorithmDisplay.ts start STANDARD -r "Feature request"
```
