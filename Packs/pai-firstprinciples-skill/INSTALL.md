# FirstPrinciples Skill v2.3.0 - Installation Guide

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
"I'm installing the FirstPrinciples Skill v2.3.0 - Foundational reasoning methodology based on Elon Musk's physics-based thinking framework.

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
  echo "CORE skill is installed"
else
  echo "CORE skill NOT installed - REQUIRED!"
fi

# Check for existing FirstPrinciples skill
if [ -d "$PAI_CHECK/skills/FirstPrinciples" ]; then
  echo "Existing FirstPrinciples skill found at: $PAI_CHECK/skills/FirstPrinciples"
  ls -la "$PAI_CHECK/skills/FirstPrinciples/"
else
  echo "No existing FirstPrinciples skill (clean install)"
fi

# Check for pai-voice-system (optional)
if [ -d "$PAI_CHECK/VoiceServer" ]; then
  echo "pai-voice-system is installed (voice features available)"
else
  echo "pai-voice-system not installed (voice notifications unavailable)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- CORE skill: [installed / NOT INSTALLED - REQUIRED]
- Existing FirstPrinciples skill: [Yes at path / No]
- pai-voice-system: [installed / not installed (optional)]"
```

**STOP if CORE skill is not installed.** Tell the user:
```
"The CORE skill (pai-core-install) is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing FirstPrinciples skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing FirstPrinciples skill detected. How should I proceed?",
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
  "question": "Ready to install FirstPrinciples Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/firstprinciples-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/FirstPrinciples" ] && cp -r "$PAI_DIR/skills/FirstPrinciples" "$BACKUP_DIR/"
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
mkdir -p "$PAI_DIR/skills/FirstPrinciples/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

Copy all files from the pack's `src/skills/FirstPrinciples/` directory:

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy main skill file
cp "$PACK_DIR/src/skills/FirstPrinciples/SKILL.md" "$PAI_DIR/skills/FirstPrinciples/"

# Copy workflow files
cp "$PACK_DIR/src/skills/FirstPrinciples/Workflows/Deconstruct.md" "$PAI_DIR/skills/FirstPrinciples/Workflows/"
cp "$PACK_DIR/src/skills/FirstPrinciples/Workflows/Challenge.md" "$PAI_DIR/skills/FirstPrinciples/Workflows/"
cp "$PACK_DIR/src/skills/FirstPrinciples/Workflows/Reconstruct.md" "$PAI_DIR/skills/FirstPrinciples/Workflows/"
```

**Files copied:**
- `SKILL.md` - Main skill routing and framework overview
- `Workflows/Deconstruct.md` - Break problems into constituent parts
- `Workflows/Challenge.md` - Classify constraints as hard/soft/assumption
- `Workflows/Reconstruct.md` - Build solutions from fundamentals

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== FirstPrinciples Skill Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/FirstPrinciples/SKILL.md" ] && echo "SKILL.md" || echo "SKILL.md missing"
[ -f "$PAI_DIR/skills/FirstPrinciples/Workflows/Deconstruct.md" ] && echo "Deconstruct.md" || echo "Deconstruct.md missing"
[ -f "$PAI_DIR/skills/FirstPrinciples/Workflows/Challenge.md" ] && echo "Challenge.md" || echo "Challenge.md missing"
[ -f "$PAI_DIR/skills/FirstPrinciples/Workflows/Reconstruct.md" ] && echo "Reconstruct.md" || echo "Reconstruct.md missing"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"FirstPrinciples Skill v2.3.0 installed successfully!

What's available:
- 3-step framework: DECONSTRUCT -> CHALLENGE -> RECONSTRUCT
- Constraint classification: HARD / SOFT / ASSUMPTION
- Integration with RedTeam, Council, Architect, and other skills

Try it: Ask me to 'use first principles on: our infrastructure costs'"
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

### "CORE skill not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### Files not copying

```bash
# Check PAI_DIR is set correctly
echo $PAI_DIR
# Should output your PAI directory (default: ~/.claude)
```

### Skill not loading

```bash
# Verify skill file has proper frontmatter
head -10 "$PAI_DIR/skills/FirstPrinciples/SKILL.md"
# Should show --- at start with name: and description:
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `Workflows/Deconstruct.md` | Break problems into fundamental parts |
| `Workflows/Challenge.md` | Classify constraints and question assumptions |
| `Workflows/Reconstruct.md` | Build optimal solutions from fundamentals |

---

## Usage

### From Claude Code

```
"Use first principles to analyze our cloud architecture"
"Deconstruct our security model"
"Challenge the assumptions behind this design"
"Reconstruct our approach from fundamentals"
```

### Integration with Other Skills

FirstPrinciples integrates with:
- **THE ALGORITHM** - For assumption challenging in THINK phase
- **RedTeam** - For adversarial deconstruction of ideas
- **Council** - For multi-perspective constraint debate
- **Architect** - For challenging architectural constraints
- **Engineer** - When stuck, rebuild from fundamentals

These integrations work automatically if the skills are installed.
