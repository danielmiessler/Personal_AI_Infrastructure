# PAI TELOS Skill v2.3.0 - Installation Guide

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
"I'm installing PAI TELOS Skill v2.3.0 - Life OS and personal philosophy management. TELOS helps track your goals, beliefs, wisdom, favorite books, movies, and life mission.

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

# Check for existing Telos skill
if [ -d "$PAI_CHECK/skills/Telos" ]; then
  echo "WARNING Existing Telos skill found at: $PAI_CHECK/skills/Telos"
  ls "$PAI_CHECK/skills/Telos/"
else
  echo "OK No existing Telos skill (clean install)"
fi

# Check for existing TELOS content (USER directory)
if [ -d "$PAI_CHECK/skills/CORE/USER/TELOS" ]; then
  echo "IMPORTANT Existing TELOS content found - will preserve!"
  ls "$PAI_CHECK/skills/CORE/USER/TELOS/"
else
  echo "NOTE No existing TELOS content (will create templates)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Telos skill: [Yes / No]
- Existing TELOS content: [Yes - will preserve / No - will create templates]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Existing Content (if TELOS content exists)

**Only ask if USER/TELOS directory has content:**

```json
{
  "header": "Content",
  "question": "I found existing TELOS content (goals, beliefs, etc.). How should I handle it?",
  "multiSelect": false,
  "options": [
    {"label": "Keep my content (Recommended)", "description": "Preserves all your existing TELOS files"},
    {"label": "Start fresh", "description": "Backs up existing, creates new templates"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Skill Replacement (if Telos skill exists)

**Only ask if existing Telos skill directory detected:**

```json
{
  "header": "Skill",
  "question": "Existing Telos skill found. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Update skill (Recommended)", "description": "Replaces skill files, keeps your TELOS content"},
    {"label": "Backup and replace", "description": "Creates timestamped backup first"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI TELOS Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/telos-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/Telos" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/Telos" "$BACKUP_DIR/"
  echo "Backup created at: $BACKUP_DIR"
fi

# Always backup TELOS content before fresh start
if [ -d "$PAI_DIR/skills/CORE/USER/TELOS" ]; then
  mkdir -p "$BACKUP_DIR/USER-TELOS"
  cp -r "$PAI_DIR/skills/CORE/USER/TELOS" "$BACKUP_DIR/USER-TELOS/"
  echo "TELOS content backed up to: $BACKUP_DIR/USER-TELOS"
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
    {"content": "Initialize TELOS content templates", "status": "pending", "activeForm": "Initializing TELOS content"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Telos/Workflows"
mkdir -p "$PAI_DIR/skills/CORE/USER/TELOS/Backups"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/` directory:

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/skills/Telos/"* "$PAI_DIR/skills/Telos/"
```

**Files included:**
- `SKILL.md` - Main skill definition and routing
- `Workflows/Update.md` - TELOS update workflow

**Mark todo as completed.**

### 4.3 Initialize TELOS Content Templates

**Mark todo "Initialize TELOS content templates" as in_progress.**

**IMPORTANT: Only create templates if USER/TELOS is empty or user chose "Start fresh"**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
TELOS_DIR="$PAI_DIR/skills/CORE/USER/TELOS"

# Only create if directory is empty or doesn't exist
if [ ! -f "$TELOS_DIR/GOALS.md" ]; then
  cat > "$TELOS_DIR/GOALS.md" << 'EOF'
# Goals

Add your life goals here. What are you working toward?

## Short-term (1 year)

-

## Medium-term (5 years)

-

## Long-term (10+ years)

-
EOF
fi

if [ ! -f "$TELOS_DIR/BELIEFS.md" ]; then
  cat > "$TELOS_DIR/BELIEFS.md" << 'EOF'
# Beliefs

Your core beliefs and values. What do you stand for?

-
EOF
fi

if [ ! -f "$TELOS_DIR/BOOKS.md" ]; then
  cat > "$TELOS_DIR/BOOKS.md" << 'EOF'
# Books

Your favorite books and the wisdom you've gained from them.

| Book | Author | Key Takeaway |
|------|--------|--------------|
| | | |
EOF
fi

if [ ! -f "$TELOS_DIR/WISDOM.md" ]; then
  cat > "$TELOS_DIR/WISDOM.md" << 'EOF'
# Wisdom

Accumulated wisdom and lessons learned.

-
EOF
fi

if [ ! -f "$TELOS_DIR/MISSION.md" ]; then
  cat > "$TELOS_DIR/MISSION.md" << 'EOF'
# Mission

Your life mission statement. Why are you here?

-
EOF
fi

echo "TELOS content templates initialized"
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI TELOS Skill v2.3.0 Verification ==="

# Check skill files
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/Telos/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"
[ -f "$PAI_DIR/skills/Telos/Workflows/Update.md" ] && echo "OK Workflows/Update.md" || echo "ERROR Workflows/Update.md missing"

# Check TELOS content directory
echo ""
echo "Checking TELOS content..."
TELOS_DIR="$PAI_DIR/skills/CORE/USER/TELOS"
[ -d "$TELOS_DIR" ] && echo "OK TELOS directory exists" || echo "ERROR TELOS directory missing"

# Check content files
for file in GOALS.md BELIEFS.md BOOKS.md WISDOM.md MISSION.md; do
  [ -f "$TELOS_DIR/$file" ] && echo "OK $file" || echo "NOTE $file not found (optional)"
done

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI TELOS Skill v2.3.0 installed successfully!

What's available:
- Goals tracking: Record and review your life goals
- Beliefs management: Document your core values
- Books library: Track favorite books and takeaways
- Wisdom collection: Capture lessons learned
- Mission statement: Define your life purpose

TELOS content location: $PAI_DIR/skills/CORE/USER/TELOS/

Usage:
- 'Show my TELOS' - View your philosophy overview
- 'Update my goals' - Add or modify goals
- 'Add a book to TELOS' - Record a new book
- 'What are my beliefs?' - Review your values"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Check directory permissions on $PAI_DIR/skills/
3. Verify TELOS content directory exists
4. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### TELOS content not showing

```bash
# Verify content location
ls -la $PAI_DIR/skills/CORE/USER/TELOS/

# Check file permissions
chmod 644 $PAI_DIR/skills/CORE/USER/TELOS/*.md
```

### Workflows not triggering

```bash
# Check workflow file exists
cat $PAI_DIR/skills/Telos/Workflows/Update.md

# Verify skill is loaded
head -20 $PAI_DIR/skills/Telos/SKILL.md
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |
| `Workflows/Update.md` | TELOS update workflow |

### Content Templates (USER/TELOS/)

| File | Purpose |
|------|---------|
| `GOALS.md` | Life goals (short, medium, long-term) |
| `BELIEFS.md` | Core beliefs and values |
| `BOOKS.md` | Favorite books and takeaways |
| `WISDOM.md` | Accumulated wisdom |
| `MISSION.md` | Life mission statement |

---

## Usage

### View TELOS Content

```
"Show my TELOS"
"What are my goals?"
"Review my beliefs"
```

### Update TELOS

```
"Add a new goal to TELOS"
"Update my mission statement"
"Add [book name] to my books"
"Capture this wisdom: [insight]"
```

### Automatic Behavior

The skill automatically:
- Detects context (personal vs project TELOS) from user requests
- Routes to appropriate workflows
- Creates backups before modifications

### Customization

Add new categories by creating new `.md` files in `$PAI_DIR/skills/CORE/USER/TELOS/`:

```bash
# Example: Add a MOVIES.md file
echo "# Movies\n\nYour favorite films.\n" > $PAI_DIR/skills/CORE/USER/TELOS/MOVIES.md
```
