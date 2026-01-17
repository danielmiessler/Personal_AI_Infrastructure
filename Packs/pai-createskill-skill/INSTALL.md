# PAI CreateSkill Skill v2.3.0 - Installation Guide

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
"I'm installing PAI CreateSkill Skill v2.3.0 - Skill creation and validation framework.

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
  echo "PASS: pai-core-install is installed"
else
  echo "FAIL: pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing CreateSkill skill
if [ -d "$PAI_CHECK/skills/CreateSkill" ]; then
  echo "WARNING: Existing CreateSkill skill found at: $PAI_CHECK/skills/CreateSkill"
  ls -la "$PAI_CHECK/skills/CreateSkill/"
else
  echo "PASS: No existing CreateSkill skill (clean install)"
fi

# Check for SkillSystem.md reference
if [ -f "$PAI_CHECK/skills/CORE/SkillSystem.md" ]; then
  echo "PASS: SkillSystem.md reference available"
else
  echo "WARNING: SkillSystem.md not found (skill may have limited reference documentation)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing CreateSkill skill: [Yes at path / No]
- SkillSystem.md reference: [available / not available]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing CreateSkill skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing CreateSkill skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI CreateSkill Skill v2.3.0?",
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

**Only execute if user chose "Backup and Replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/createskill-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/CreateSkill" ] && cp -r "$PAI_DIR/skills/CreateSkill" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create skill directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files from pack", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/CreateSkill/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/CreateSkill/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/CreateSkill/SKILL.md" "$PAI_DIR/skills/CreateSkill/"
cp "$PACK_DIR/src/skills/CreateSkill/Workflows/"*.md "$PAI_DIR/skills/CreateSkill/Workflows/"
```

**Files copied:**
- `SKILL.md` - Main skill routing and documentation
- `Workflows/CreateSkill.md` - Create new skills workflow
- `Workflows/ValidateSkill.md` - Validate existing skills workflow
- `Workflows/CanonicalizeSkill.md` - Fix skill structure workflow
- `Workflows/UpdateSkill.md` - Update existing skills workflow

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI CreateSkill Skill Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/CreateSkill/SKILL.md" ] && echo "PASS: SKILL.md" || echo "FAIL: SKILL.md missing"
[ -f "$PAI_DIR/skills/CreateSkill/Workflows/CreateSkill.md" ] && echo "PASS: CreateSkill.md" || echo "FAIL: CreateSkill.md missing"
[ -f "$PAI_DIR/skills/CreateSkill/Workflows/ValidateSkill.md" ] && echo "PASS: ValidateSkill.md" || echo "FAIL: ValidateSkill.md missing"
[ -f "$PAI_DIR/skills/CreateSkill/Workflows/CanonicalizeSkill.md" ] && echo "PASS: CanonicalizeSkill.md" || echo "FAIL: CanonicalizeSkill.md missing"
[ -f "$PAI_DIR/skills/CreateSkill/Workflows/UpdateSkill.md" ] && echo "PASS: UpdateSkill.md" || echo "FAIL: UpdateSkill.md missing"

# Check YAML frontmatter
echo ""
echo "Checking SKILL.md frontmatter..."
if grep -q "^name: CreateSkill" "$PAI_DIR/skills/CreateSkill/SKILL.md"; then
  echo "PASS: name field correct"
else
  echo "FAIL: name field missing or incorrect"
fi

if grep -q "USE WHEN" "$PAI_DIR/skills/CreateSkill/SKILL.md"; then
  echo "PASS: USE WHEN triggers present"
else
  echo "FAIL: USE WHEN triggers missing"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI CreateSkill Skill v2.3.0 installed successfully!

What's available:
- 'create a new skill' - Create skills with proper structure
- 'validate skill' - Check skill compliance
- 'canonicalize' - Fix non-compliant skills
- 'update skill' - Add workflows to existing skills

Try it: Ask me to 'create a skill for managing recipes'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Check directory permissions on $PAI_DIR/skills/
3. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### SKILL.md not found after install

```bash
# Check the PAI directory
ls -la $PAI_DIR/skills/CreateSkill/
```

### Skill not triggering

Verify the SKILL.md has proper frontmatter:
```bash
head -20 $PAI_DIR/skills/CreateSkill/SKILL.md
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `Workflows/CreateSkill.md` | Create new skills with canonical structure |
| `Workflows/ValidateSkill.md` | Validate skills against canonical format |
| `Workflows/CanonicalizeSkill.md` | Fix and restructure non-compliant skills |
| `Workflows/UpdateSkill.md` | Add workflows or modify existing skills |

---

## Usage

### From Claude Code

```
"Create a skill for managing my recipes"
"Validate the research skill"
"Canonicalize the daemon skill"
"Add a deploy workflow to the blogging skill"
```

### Skill Development Workflow

1. **Create**: Use CreateSkill workflow to scaffold new skill
2. **Develop**: Add workflows, tools, and documentation
3. **Validate**: Use ValidateSkill to check compliance
4. **Fix**: Use CanonicalizeSkill if issues found
5. **Iterate**: Use UpdateSkill to add new workflows
