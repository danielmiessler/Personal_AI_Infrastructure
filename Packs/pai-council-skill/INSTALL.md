# PAI Council Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Council Skill v2.3.0 - Multi-agent debate system. The Council brings together diverse AI perspectives to analyze decisions, identify blind spots, and reach better conclusions through structured debate.

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

# Check for existing Council skill
if [ -d "$PAI_CHECK/skills/Council" ]; then
  echo "WARNING Existing Council skill found at: $PAI_CHECK/skills/Council"
  ls "$PAI_CHECK/skills/Council/"
else
  echo "OK No existing Council skill (clean install)"
fi

# Check for pai-voice-system (optional but enhances experience)
if [ -d "$PAI_CHECK/VoiceServer" ]; then
  echo "OK Voice system installed (council members can speak)"
else
  echo "NOTE Voice system not installed (council will be text-only)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Council skill: [Yes / No]
- Voice system: [installed / not installed (optional)]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing Council directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Council skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Council Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/council-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/Council" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/Council" "$BACKUP_DIR/"
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
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Council/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/Council/` directory:

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/skills/Council/"* "$PAI_DIR/skills/Council/"
```

**Files included:**
- `SKILL.md` - Main skill definition and entry point
- `CouncilMembers.md` - Agent definitions and perspectives
- `RoundStructure.md` - Debate structure and rules
- `OutputFormat.md` - Output templates
- `Workflows/Debate.md` - Full debate workflow
- `Workflows/Quick.md` - Quick check workflow

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Council Skill v2.3.0 Verification ==="

# Check skill files
echo "Checking skill files..."
for file in SKILL.md CouncilMembers.md RoundStructure.md OutputFormat.md; do
  [ -f "$PAI_DIR/skills/Council/$file" ] && echo "OK $file" || echo "ERROR $file missing"
done

# Check workflow files
echo ""
echo "Checking workflow files..."
[ -f "$PAI_DIR/skills/Council/Workflows/Debate.md" ] && echo "OK Workflows/Debate.md" || echo "ERROR Workflows/Debate.md missing"
[ -f "$PAI_DIR/skills/Council/Workflows/Quick.md" ] && echo "OK Workflows/Quick.md" || echo "ERROR Workflows/Quick.md missing"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Council Skill v2.3.0 installed successfully!

What's available:
- Full debates: Multiple council members analyze a topic from different angles
- Quick checks: Fast sanity check from key perspectives
- Custom councils: Define your own council members for specific domains

Default council members:
- The Optimist: Sees opportunities and potential
- The Skeptic: Questions assumptions and identifies risks
- The Pragmatist: Focuses on practical implementation
- The Historian: Draws from precedent and patterns
- The Innovator: Proposes creative alternatives

Usage:
- 'Council debate: [topic]' - Full structured debate
- 'Quick council check: [decision]' - Fast perspective check
- 'Council, what do you think about [idea]?' - Informal discussion"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Check directory permissions on $PAI_DIR/skills/
3. Verify all files copied correctly
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

### Skill not recognized

```bash
# Verify SKILL.md exists
ls -la $PAI_DIR/skills/Council/SKILL.md

# Check frontmatter is valid
head -20 $PAI_DIR/skills/Council/SKILL.md
```

### Council members not appearing

```bash
# Verify CouncilMembers.md exists
cat $PAI_DIR/skills/Council/CouncilMembers.md
```

### Voice not working with council

The council integrates with pai-voice-system if installed. Without it, debates are text-only.

```bash
# Check if voice server is running
curl http://localhost:8888/health
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and entry point |
| `CouncilMembers.md` | Agent definitions and perspectives |
| `RoundStructure.md` | Debate structure and rules |
| `OutputFormat.md` | Output formatting templates |

### Workflows

| File | Purpose |
|------|---------|
| `Workflows/Debate.md` | Full structured debate |
| `Workflows/Quick.md` | Quick sanity check |

---

## Usage

### Full Debate

```
"Council debate: Should we refactor the authentication system?"
```

The council will:
1. Frame the question
2. Each member presents their perspective
3. Cross-examination and rebuttals
4. Synthesis and recommendations

### Quick Check

```
"Quick council check: Is this API design good?"
```

Fast input from 2-3 key perspectives without full debate structure.

### Custom Councils

Create a customizations directory to define domain-specific councils:

```bash
mkdir -p $PAI_DIR/skills/CORE/USER/SKILLCUSTOMIZATIONS/Council/
```

Then create `PREFERENCES.md` to:
- Add/remove default council members
- Define domain-specific perspectives
- Modify debate structure

### Voice Integration

If pai-voice-system is installed, council members can speak their positions. Each member uses a distinct voice for clarity.

```
"Council debate with voice: [topic]"
```
