# PAI Pack Installation Template

**Template for creating wizard-style INSTALL.md files for PAI packs.**

Use this template when creating new packs. The wizard-style approach uses Claude Code's native tools to guide users through installation interactively.

---

## Template Structure

```markdown
# [Pack Name] v[X.Y.Z] - Installation Guide

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
\```
"I'm installing [pack-name] v[X.Y.Z] - [one-line description].

Let me analyze your system and guide you through installation."
\```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

\```bash
# Check prerequisites
which [prerequisite] && [prerequisite] --version

# Check for existing installation
ls -la $PAI_DIR/skills/[SkillName]/ 2>/dev/null || echo "No existing [SkillName] skill"

# Check for dependencies
# ... pack-specific checks
\```

### 1.2 Present Findings

Tell the user what you found:
\```
"Here's what I found on your system:
- [Prerequisite]: [installed vX.X / NOT INSTALLED]
- Existing [pack] skill: [Yes at path / No]
- Dependencies: [Status]"
\```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Prerequisites (if missing)

**Only ask if [prerequisite] is NOT installed:**

\```json
{
  "header": "[Short Label]",
  "question": "[Question about missing prerequisite]?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install [X] (Recommended)", "description": "[What this does]"},
    {"label": "Skip - I'll install manually", "description": "[Consequence of skipping]"}
  ]
}
\```

### Question 2: Conflict Resolution (if existing found)

**Only ask if existing installation detected:**

\```json
{
  "header": "Conflict",
  "question": "Existing [X] detected at [path]. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
\```

### Question 3: Optional Features

**Only ask if pack has optional features:**

\```json
{
  "header": "Features",
  "question": "Which optional features should I enable?",
  "multiSelect": true,
  "options": [
    {"label": "Feature A (Recommended)", "description": "[What it does]"},
    {"label": "Feature B", "description": "[What it does]"},
    {"label": "Feature C", "description": "[What it does]"}
  ]
}
\```

### Question 4: Final Confirmation

\```json
{
  "header": "Install",
  "question": "Ready to install [pack-name] v[X.Y.Z]?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation using choices above"},
    {"label": "Show me what will change", "description": "Lists all files that will be created/modified"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
\```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and Replace":**

\```bash
BACKUP_DIR="$PAI_DIR/Backups/[pack-name]-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/[SkillName]" ] && cp -r "$PAI_DIR/skills/[SkillName]" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
\```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

\```json
{
  "todos": [
    {"content": "Create skill directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "[Pack-specific step]", "status": "pending", "activeForm": "[Doing pack-specific step]"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
\```

### 4.1 Create Skill Directory

**Mark todo "Create skill directory structure" as in_progress.**

\```bash
mkdir -p $PAI_DIR/skills/[SkillName]
mkdir -p $PAI_DIR/skills/[SkillName]/src
# ... additional directories
\```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files" as in_progress.**

\```bash
# Copy from pack directory to skill directory
cp src/index.ts $PAI_DIR/skills/[SkillName]/src/
cp package.json $PAI_DIR/skills/[SkillName]/
cp SKILL.md $PAI_DIR/skills/[SkillName]/
# ... additional files
\```

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

\```bash
cd $PAI_DIR/skills/[SkillName]
bun install
\```

**Mark todo as completed.**

### 4.4 [Pack-Specific Step]

**Mark todo "[Pack-specific step]" as in_progress.**

\```bash
# Pack-specific installation commands
\```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md.**

Quick verification:
\```bash
# Key verification commands from VERIFY.md
\```

**Mark todo as completed when all VERIFY.md checks pass.**

---

## Success/Failure Messages

### On Success

\```
"[Pack name] v[X.Y.Z] installed successfully!

What's available:
- [Key feature 1]
- [Key feature 2]
- [Key feature 3]

Try it: [example command]"
\```

### On Failure

\```
"Installation encountered issues. Here's what to check:

1. [Common issue 1]
2. [Common issue 2]
3. Check VERIFY.md for the specific failing check

Need help? See Troubleshooting section below."
\```

---

## Troubleshooting

### "[Common error message 1]"

\```bash
# Fix command
\```

### "[Common error message 2]"

\```bash
# Fix command
\```

---

## What's Included

| File | Purpose |
|------|---------|
| `src/index.ts` | [Description] |
| `SKILL.md` | Skill definition for Claude Code |
| ... | ... |

---

## Usage

### From Claude Code

\```
[Natural language example]
\```

### From CLI

\```bash
[CLI command example]
\```
```

---

## Key Principles

1. **Wizard-style** - Guide users interactively, don't dump commands
2. **AskUserQuestion** - At every decision point, not just "install Y/N?"
3. **TodoWrite** - Track progress so users see what's happening
4. **Conditional questions** - Only ask about missing prerequisites or conflicts
5. **Clear success/failure** - Tell users exactly what happened
6. **VERIFY.md integration** - Always run verification checks

---

## Question Design Guidelines

### Headers (max 12 chars)
- "Runtime" for prerequisite questions
- "Conflict" for existing installation
- "Features" for optional features
- "Install" for final confirmation

### Options
- Always include "(Recommended)" on the best choice
- 2-4 options per question (user can always type "Other")
- Descriptions explain consequences, not just what it does

### Conditional Logic
- Questions 1-3 are conditional (only ask if relevant)
- Question 4 (final confirmation) is always asked
- Skip entire phases if not applicable

---

*This template is part of the PAI Pack system. See Packs/README.md for full documentation.*
