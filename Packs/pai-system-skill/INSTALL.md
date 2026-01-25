# PAI System Skill v2.3.0 - Installation Guide

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
"I'm installing PAI System Skill v2.3.0 - System maintenance and integrity toolkit. This skill manages system audits, documentation updates, secret scanning, and work context recall.

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

# Check for existing System skill
if [ -d "$PAI_CHECK/skills/System" ]; then
  echo "WARNING Existing System skill found at: $PAI_CHECK/skills/System"
  ls "$PAI_CHECK/skills/System/"
else
  echo "OK No existing System skill (clean install)"
fi

# Check for Bun runtime (REQUIRED)
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check for TruffleHog (optional for SecretScanning)
if command -v trufflehog &> /dev/null; then
  echo "OK TruffleHog is installed (SecretScanning ready)"
else
  echo "NOTE TruffleHog not installed (SecretScanning will need it later)"
fi

# Check for existing MEMORY structure
if [ -d "$PAI_CHECK/MEMORY/PAISYSTEMUPDATES" ]; then
  echo "OK PAISYSTEMUPDATES directory exists"
else
  echo "NOTE PAISYSTEMUPDATES directory will be created"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing System skill: [Yes / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- TruffleHog: [installed / not installed (optional)]
- PAISYSTEMUPDATES: [exists / will be created]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing System directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing System skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: TruffleHog Installation (if not detected)

**Only ask if TruffleHog is not installed:**

```json
{
  "header": "Enhancement",
  "question": "TruffleHog enables secret scanning. Would you like to install it?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now", "description": "Install TruffleHog via homebrew (macOS) or curl (Linux)"},
    {"label": "Skip for now (Recommended)", "description": "SecretScanning workflow will not work until TruffleHog is installed"}
  ]
}
```

**If user chooses to install:**
```bash
# macOS
brew install trufflehog

# Linux
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI System Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/system-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/System" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/System" "$BACKUP_DIR/"
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
    {"content": "Copy workflow files from pack", "status": "pending", "activeForm": "Copying workflow files"},
    {"content": "Copy tool files from pack", "status": "pending", "activeForm": "Copying tool files"},
    {"content": "Copy template files from pack", "status": "pending", "activeForm": "Copying template files"},
    {"content": "Initialize MEMORY structure", "status": "pending", "activeForm": "Initializing MEMORY structure"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/System/"{Workflows,Tools,Templates}
mkdir -p "$PAI_DIR/MEMORY/PAISYSTEMUPDATES/$(date +%Y)/$(date +%m)"
mkdir -p "$PAI_DIR/MEMORY/STATE/integrity"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/System/SKILL.md" "$PAI_DIR/skills/System/SKILL.md"
```

**Mark todo as completed.**

### 4.3 Copy Workflow Files

**Mark todo "Copy workflow files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/System/Workflows/"*.md "$PAI_DIR/skills/System/Workflows/"
```

**Workflows included:**
- `IntegrityCheck.md` - System integrity audit (16 parallel agents)
- `DocumentSession.md` - Current session documentation
- `DocumentRecent.md` - Recent work catch-up
- `GitPush.md` - Push changes to PAI repository
- `SecretScanning.md` - TruffleHog secret detection
- `CrossRepoValidation.md` - Private vs public repo validation
- `PrivacyCheck.md` - USER/WORK content isolation
- `WorkContextRecall.md` - Recall past work ("we just worked on...")

**Mark todo as completed.**

### 4.4 Copy Tool Files

**Mark todo "Copy tool files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/System/Tools/"*.ts "$PAI_DIR/skills/System/Tools/"
```

**Tools included:**
- `CreateUpdate.ts` - Create system update documents
- `UpdateIndex.ts` - Update the PAISYSTEMUPDATES index
- `UpdateSearch.ts` - Search past updates
- `ExtractArchitectureUpdates.ts` - Extract architecture changes

**Mark todo as completed.**

### 4.5 Copy Template Files

**Mark todo "Copy template files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/System/Templates/"*.md "$PAI_DIR/skills/System/Templates/"
```

**Mark todo as completed.**

### 4.6 Initialize MEMORY Structure

**Mark todo "Initialize MEMORY structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
INDEX_FILE="$PAI_DIR/MEMORY/PAISYSTEMUPDATES/index.json"

if [ ! -f "$INDEX_FILE" ]; then
  echo '{
  "last_updated": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "total_updates": 0,
  "by_year": {},
  "by_significance": {
    "critical": 0,
    "major": 0,
    "moderate": 0,
    "minor": 0,
    "trivial": 0
  },
  "by_change_type": {
    "skill_update": 0,
    "structure_change": 0,
    "doc_update": 0,
    "hook_update": 0,
    "workflow_update": 0,
    "config_update": 0,
    "tool_update": 0,
    "multi_area": 0
  },
  "updates": []
}' > "$INDEX_FILE"
  echo "Created index.json"
else
  echo "index.json exists - keeping"
fi

# Create INDEX.md
INDEX_MD="$PAI_DIR/MEMORY/PAISYSTEMUPDATES/INDEX.md"
if [ ! -f "$INDEX_MD" ]; then
  echo '# System Updates Index

**Last Updated:** '$(date -u +%Y-%m-%dT%H:%M:%SZ)'

---

| Timestamp | Title | Significance | Change Type |
|-----------|-------|--------------|-------------|

---

**Total:** 0 updates' > "$INDEX_MD"
  echo "Created INDEX.md"
fi
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI System Skill v2.3.0 Verification ==="

# Check skill file
echo "Checking skill file..."
[ -f "$PAI_DIR/skills/System/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"

# Check workflows
echo ""
echo "Checking workflows..."
for workflow in IntegrityCheck DocumentSession DocumentRecent GitPush SecretScanning CrossRepoValidation PrivacyCheck WorkContextRecall; do
  [ -f "$PAI_DIR/skills/System/Workflows/${workflow}.md" ] && echo "OK ${workflow}.md" || echo "ERROR ${workflow}.md missing"
done

# Check tools
echo ""
echo "Checking tools..."
for tool in CreateUpdate UpdateIndex UpdateSearch ExtractArchitectureUpdates; do
  [ -f "$PAI_DIR/skills/System/Tools/${tool}.ts" ] && echo "OK ${tool}.ts" || echo "ERROR ${tool}.ts missing"
done

# Check templates
echo ""
echo "Checking templates..."
[ -f "$PAI_DIR/skills/System/Templates/Update.md" ] && echo "OK Templates/Update.md" || echo "ERROR Templates/Update.md missing"

# Check MEMORY structure
echo ""
echo "Checking MEMORY structure..."
[ -f "$PAI_DIR/MEMORY/PAISYSTEMUPDATES/index.json" ] && echo "OK index.json" || echo "ERROR index.json missing"
[ -f "$PAI_DIR/MEMORY/PAISYSTEMUPDATES/INDEX.md" ] && echo "OK INDEX.md" || echo "ERROR INDEX.md missing"

# Test tool execution
echo ""
echo "Testing tool execution..."
bun run "$PAI_DIR/skills/System/Tools/UpdateSearch.ts" --help && echo "OK Tool executes" || echo "ERROR Tool execution failed"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI System Skill v2.3.0 installed successfully!

What's available:
- Integrity audits with 16 parallel agents
- Session and recent work documentation
- Secret scanning with TruffleHog
- Cross-repository validation (private vs public)
- Privacy checks for USER/WORK isolation
- Work context recall ('what did we work on?')

Usage:
- 'Run an integrity check' - Full system audit
- 'Document this session' - Capture current transcript
- 'Document recent work' - Catch up on undocumented changes
- 'Check for secrets' - Scan for exposed credentials
- 'What did we work on yesterday?' - Recall past work

Note: SecretScanning requires TruffleHog to be installed."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/skills/
4. Verify all files copied correctly
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

### Tool execution fails

```bash
# Check Bun installation
which bun
bun --version

# Test specific tool
bun run "$PAI_DIR/skills/System/Tools/CreateUpdate.ts" --help
```

### TruffleHog not found

SecretScanning workflow requires TruffleHog:

```bash
# macOS
brew install trufflehog

# Linux
curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin

# Verify
trufflehog --version
```

### Workflows not loading

```bash
# Verify workflow files exist
ls -la $PAI_DIR/skills/System/Workflows/

# Check specific workflow
head -20 $PAI_DIR/skills/System/Workflows/IntegrityCheck.md
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |

### Workflows

| File | Purpose |
|------|---------|
| `Workflows/IntegrityCheck.md` | System integrity audit |
| `Workflows/DocumentSession.md` | Session documentation |
| `Workflows/DocumentRecent.md` | Recent work catch-up |
| `Workflows/GitPush.md` | Push to PAI repository |
| `Workflows/SecretScanning.md` | Secret detection |
| `Workflows/CrossRepoValidation.md` | Repo validation |
| `Workflows/PrivacyCheck.md` | Privacy checks |
| `Workflows/WorkContextRecall.md` | Work recall |

### Tools

| File | Purpose |
|------|---------|
| `Tools/CreateUpdate.ts` | Create update documents |
| `Tools/UpdateIndex.ts` | Update the index |
| `Tools/UpdateSearch.ts` | Search updates |
| `Tools/ExtractArchitectureUpdates.ts` | Extract changes |

### Templates

| File | Purpose |
|------|---------|
| `Templates/Update.md` | Update document template |

---

## Usage

### Integrity Check

```
"Run an integrity check"
```

Spawns 16 parallel agents to audit the entire PAI system for broken references, missing files, and configuration issues.

### Document Session

```
"Document this session"
```

Captures the current conversation transcript to MEMORY/PAISYSTEMUPDATES/.

### Work Context Recall

```
"What did we work on last week?"
"Remember when we fixed the auth bug?"
```

Searches MEMORY to recall past work context.

### Secret Scanning

```
"Check for secrets"
"Scan for exposed credentials"
```

Runs TruffleHog to detect any exposed API keys, passwords, or credentials.
