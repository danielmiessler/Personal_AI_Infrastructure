# PAI Core Install v2.3.0 - Installation Guide

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
"I'm installing PAI Core v2.3.0 - Personal AI Infrastructure foundation. This is the base system that all other PAI packs build upon. It includes the CORE skill, memory system, response format, and configuration.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check for existing PAI installation
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "WARNING Existing PAI installation found at: $PAI_CHECK"
  echo "CORE skill version:"
  head -10 "$PAI_CHECK/skills/CORE/SKILL.md" | grep -i version || echo "(version not found in header)"
else
  echo "OK No existing PAI installation (clean install)"
fi

# Check for USER content (must preserve)
if [ -d "$PAI_CHECK/skills/CORE/USER" ]; then
  USER_FILES=$(find "$PAI_CHECK/skills/CORE/USER" -type f -name "*.md" 2>/dev/null | wc -l)
  echo "NOTE Found $USER_FILES USER files that should be preserved"
else
  echo "OK No USER content to preserve"
fi

# Check for settings.json with identity
if [ -f "$PAI_CHECK/settings.json" ]; then
  echo "OK settings.json exists"
  grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$PAI_CHECK/settings.json" | head -2
else
  echo "NOTE settings.json will be created"
fi

# Check for backup directories
for backup in "$HOME/.claude.bak" "$HOME/.claude-backup" "$HOME/.claude-old" "$HOME/.pai-backup"; do
  if [ -d "$backup" ]; then
    echo "NOTE Found backup: $backup"
  fi
done

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "WARNING Bun not installed - some tools will not work"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- Existing PAI installation: [Yes / No]
- USER content to preserve: [X files / none]
- settings.json: [exists with identity / will be created]
- Backup directories: [found / none]
- Bun runtime: [installed / not installed]"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Installation Type (if existing installation found)

**Only ask if existing PAI installation detected:**

```json
{
  "header": "Upgrade",
  "question": "I found an existing PAI installation. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Upgrade (preserve USER content) (Recommended)", "description": "Updates SYSTEM files, keeps your personal USER content intact"},
    {"label": "Fresh install (backup first)", "description": "Creates backup, then installs completely fresh"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Identity Configuration (if no settings.json or fresh install)

**Only ask if settings.json doesn't exist or user chose fresh install:**

```json
{
  "header": "Identity",
  "question": "What's your name? I'll use this to personalize your AI assistant.",
  "multiSelect": false,
  "options": [
    {"label": "Enter name", "description": "Type your name"}
  ]
}
```

Then:

```json
{
  "header": "AI Name",
  "question": "What would you like to name your AI assistant?",
  "multiSelect": false,
  "options": [
    {"label": "PAI (Recommended)", "description": "Default PAI assistant name"},
    {"label": "Nova", "description": "Alternative assistant name"},
    {"label": "Atlas", "description": "Alternative assistant name"},
    {"label": "Custom", "description": "Enter a custom name"}
  ]
}
```

### Question 3: Restore from Backup

**Only ask if backup directories were found:**

```json
{
  "header": "Restore",
  "question": "I found backup directories. Would you like to restore any settings from them?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, check for settings to restore", "description": "Look for API keys, identity, and preferences in backups"},
    {"label": "No, start fresh (Recommended)", "description": "Don't restore anything from backups"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Core v2.3.0?",
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

**Only execute if user chose "Fresh install (backup first)":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$HOME/.pai-backup/pai-core-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR" "$BACKUP_DIR/"
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
    {"content": "Copy SYSTEM files", "status": "pending", "activeForm": "Copying SYSTEM files"},
    {"content": "Copy USER templates (if new)", "status": "pending", "activeForm": "Copying USER templates"},
    {"content": "Copy Workflows and Tools", "status": "pending", "activeForm": "Copying Workflows and Tools"},
    {"content": "Configure settings.json", "status": "pending", "activeForm": "Configuring settings.json"},
    {"content": "Set up environment", "status": "pending", "activeForm": "Setting up environment"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

mkdir -p "$PAI_DIR/skills/CORE/"{SYSTEM,USER,WORK,Workflows,Tools}
mkdir -p "$PAI_DIR/skills/CORE/USER/"{PAISECURITYSYSTEM,SKILLCUSTOMIZATIONS,TELOS}
mkdir -p "$PAI_DIR/MEMORY/"{History,LEARNING,Signals,WORK,PAISYSTEMUPDATES}
mkdir -p "$PAI_DIR/"{hooks,Plans,Commands,Backups}
```

**Mark todo as completed.**

### 4.2 Copy SYSTEM Files

**Mark todo "Copy SYSTEM files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# SYSTEM files are always safe to overwrite
cp -r "$PACK_DIR/src/skills/CORE/SYSTEM/"* "$PAI_DIR/skills/CORE/SYSTEM/"
cp "$PACK_DIR/src/skills/CORE/SKILL.md" "$PAI_DIR/skills/CORE/"
```

**Mark todo as completed.**

### 4.3 Copy USER Templates

**Mark todo "Copy USER templates (if new)" as in_progress.**

**IMPORTANT: Never overwrite existing USER content without explicit permission.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Only copy USER templates if USER directory is empty or doesn't exist
if [ ! -f "$PAI_DIR/skills/CORE/USER/ABOUTME.md" ]; then
  cp -r "$PACK_DIR/src/skills/CORE/USER/"* "$PAI_DIR/skills/CORE/USER/"
  echo "Copied USER templates"
else
  echo "USER content exists - preserving"
fi
```

**Mark todo as completed.**

### 4.4 Copy Workflows and Tools

**Mark todo "Copy Workflows and Tools" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/skills/CORE/Workflows/"* "$PAI_DIR/skills/CORE/Workflows/"
cp -r "$PACK_DIR/src/skills/CORE/Tools/"* "$PAI_DIR/skills/CORE/Tools/"
```

**Mark todo as completed.**

### 4.5 Configure settings.json

**Mark todo "Configure settings.json" as in_progress.**

**Create or update settings.json with user's identity:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
SETTINGS_FILE="$PAI_DIR/settings.json"

# Create settings.json if it doesn't exist
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{
  "daidentity": {
    "name": "AI_NAME_HERE",
    "fullName": "AI_NAME_HERE AI Assistant"
  },
  "principal": {
    "name": "USER_NAME_HERE",
    "timezone": "America/Los_Angeles"
  }
}' > "$SETTINGS_FILE"
fi
```

**Replace AI_NAME_HERE and USER_NAME_HERE with user's choices from Phase 2.**

**Mark todo as completed.**

### 4.6 Set Up Environment

**Mark todo "Set up environment" as in_progress.**

```bash
# Add PAI_DIR to shell profile if not present
if ! grep -q "PAI_DIR" ~/.zshrc 2>/dev/null; then
  echo 'export PAI_DIR="$HOME/.claude"' >> ~/.zshrc
  echo "Added PAI_DIR to ~/.zshrc"
fi
```

Tell the user:
```
"Run `source ~/.zshrc` to apply the changes, or restart your terminal."
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Core v2.3.0 Verification ==="

# Check CORE skill
echo "Checking CORE skill..."
[ -f "$PAI_DIR/skills/CORE/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"

# Check SYSTEM files
echo ""
echo "Checking SYSTEM files..."
SYSTEM_COUNT=$(find "$PAI_DIR/skills/CORE/SYSTEM" -name "*.md" 2>/dev/null | wc -l)
echo "Found $SYSTEM_COUNT SYSTEM files (expected: 15+)"

# Check USER directory structure
echo ""
echo "Checking USER structure..."
[ -d "$PAI_DIR/skills/CORE/USER" ] && echo "OK USER directory exists" || echo "ERROR USER directory missing"

# Check settings.json
echo ""
echo "Checking settings.json..."
if [ -f "$PAI_DIR/settings.json" ]; then
  echo "OK settings.json exists"
  grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$PAI_DIR/settings.json" | head -2
else
  echo "ERROR settings.json missing"
fi

# Check MEMORY structure
echo ""
echo "Checking MEMORY structure..."
[ -d "$PAI_DIR/MEMORY" ] && echo "OK MEMORY directory exists" || echo "ERROR MEMORY directory missing"

# Check environment
echo ""
echo "Checking environment..."
if [ -n "$PAI_DIR" ]; then
  echo "OK PAI_DIR is set: $PAI_DIR"
else
  echo "NOTE PAI_DIR not set in current shell - run: source ~/.zshrc"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Phase 6: Personalization (Optional)

After installation, offer to help customize:

```json
{
  "header": "Personalize",
  "question": "PAI is installed! Would you like to personalize it now?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, let's personalize", "description": "Tell me about yourself and your goals"},
    {"label": "Skip for now", "description": "You can personalize later anytime"}
  ]
}
```

**If user chooses to personalize:**
- Ask about themselves (save to USER/ABOUTME.md)
- Ask about goals (save to USER/TELOS/GOALS.md)
- Ask about preferences (save to USER/PREFERENCES.md)

---

## Success/Failure Messages

### On Success

```
"PAI Core v2.3.0 installed successfully!

What's available:
- CORE skill with response format and system architecture
- Memory system for session history and learnings
- USER directory for your personal customizations
- Workflows for common operations

Next steps:
- Run `source ~/.zshrc` to apply environment changes
- Ask me anything and I'll use my new capabilities
- Say 'help me set up voice' to add spoken notifications
- Say 'show me available skills' to see what I can do"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Check directory permissions on ~/.claude/
2. Verify settings.json is valid JSON
3. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### CORE skill not loading

```bash
# Verify SKILL.md exists
ls -la $PAI_DIR/skills/CORE/SKILL.md

# Check frontmatter is valid
head -20 $PAI_DIR/skills/CORE/SKILL.md
```

### Settings not applying

```bash
# Verify settings.json is valid JSON
cat $PAI_DIR/settings.json | python3 -m json.tool

# Check file permissions
ls -la $PAI_DIR/settings.json
```

### Lost USER content

```bash
# Check backup directory
ls ~/.pai-backup/

# Restore manually if needed
cp -r ~/.pai-backup/[backup-name]/skills/CORE/USER/* $PAI_DIR/skills/CORE/USER/
```

### Environment variable not set

```bash
# Add to shell profile
echo 'export PAI_DIR="$HOME/.claude"' >> ~/.zshrc
source ~/.zshrc
```

---

## What's Included

### Skill Structure

| Directory | Purpose |
|-----------|---------|
| `SYSTEM/` | Core system documentation (always updated) |
| `USER/` | Personal customizations (never overwritten) |
| `WORK/` | Active work sessions |
| `Workflows/` | Core workflow definitions |
| `Tools/` | Utility scripts |

### SYSTEM Files

| File | Purpose |
|------|---------|
| `PAISYSTEMARCHITECTURE.md` | System design and principles |
| `MEMORYSYSTEM.md` | Memory system documentation |
| `SKILLSYSTEM.md` | Skill system documentation |
| `RESPONSEFORMAT.md` | Response format specification |
| `THEHOOKSYSTEM.md` | Hook system documentation |
| `THENOTIFICATIONSYSTEM.md` | Notification system |
| And 10+ more... | |

### MEMORY Structure

| Directory | Purpose |
|-----------|---------|
| `History/` | Session transcripts |
| `LEARNING/` | Captured learnings |
| `Signals/` | Rating signals |
| `WORK/` | Work session context |

---

## Usage

### After Installation

```
"What can you do now?"
"Show me available skills"
"Help me personalize PAI"
```

### Adding Skills

Install additional PAI packs to add capabilities:
- pai-voice-system - Voice notifications
- pai-browser-skill - Browser automation
- pai-research-skill - Multi-model research
- And more...
