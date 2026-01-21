# PAI RedTeam Skill v2.3.0 - Installation Guide

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
"I'm installing PAI RedTeam Skill v2.3.0 - Military-grade adversarial analysis with 32 parallel agents for stress-testing arguments and producing devastating counter-arguments.

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
  echo "OK pai-core-install is installed"
else
  echo "ERROR pai-core-install NOT installed - REQUIRED!"
fi

# Check for existing RedTeam skill
if [ -d "$PAI_CHECK/skills/RedTeam" ]; then
  echo "WARNING Existing RedTeam skill found at: $PAI_CHECK/skills/RedTeam"
  ls -la "$PAI_CHECK/skills/RedTeam/"
else
  echo "OK No existing RedTeam skill (clean install)"
fi

# Check for FirstPrinciples skill (optional but recommended)
if [ -d "$PAI_CHECK/skills/FirstPrinciples" ]; then
  echo "OK FirstPrinciples skill found (enhanced integration available)"
else
  echo "INFO FirstPrinciples skill not found (optional - basic mode)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing RedTeam skill: [Yes at path / No]
- FirstPrinciples skill: [installed (enhanced mode) / not installed (basic mode)]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing RedTeam skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing RedTeam skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Merge workflows", "description": "Keep existing custom workflows, add new ones"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Integration Level

```json
{
  "header": "Integration",
  "question": "Which integration level do you want?",
  "multiSelect": false,
  "options": [
    {"label": "Full (Recommended)", "description": "All workflows, philosophy docs, integration guide"},
    {"label": "Minimal", "description": "Just ParallelAnalysis workflow (core functionality)"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI RedTeam Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/redteam-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/skills/RedTeam" ] && cp -r "$PAI_DIR/skills/RedTeam" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create skill directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy SKILL.md routing file", "status": "pending", "activeForm": "Copying skill routing"},
    {"content": "Copy Philosophy.md", "status": "pending", "activeForm": "Copying philosophy docs"},
    {"content": "Copy Integration.md", "status": "pending", "activeForm": "Copying integration guide"},
    {"content": "Copy ParallelAnalysis workflow", "status": "pending", "activeForm": "Copying parallel analysis"},
    {"content": "Copy AdversarialValidation workflow", "status": "pending", "activeForm": "Copying adversarial validation"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory Structure

**Mark todo "Create skill directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/RedTeam/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy SKILL.md

**Mark todo "Copy SKILL.md routing file" as in_progress.**

```bash
# From the pack directory (where this INSTALL.md is located)
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/RedTeam/SKILL.md" "$PAI_DIR/skills/RedTeam/"
```

**Files copied:**
- `SKILL.md` - Main skill routing with workflow triggers and quick reference

**Mark todo as completed.**

### 4.3 Copy Philosophy.md

**Mark todo "Copy Philosophy.md" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/RedTeam/Philosophy.md" "$PAI_DIR/skills/RedTeam/"
```

**Files copied:**
- `Philosophy.md` - Core philosophy, success criteria, 32 agent types

**Mark todo as completed.**

### 4.4 Copy Integration.md

**Mark todo "Copy Integration.md" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/RedTeam/Integration.md" "$PAI_DIR/skills/RedTeam/"
```

**Files copied:**
- `Integration.md` - Skill integration order, FirstPrinciples usage, output format

**Mark todo as completed.**

### 4.5 Copy ParallelAnalysis Workflow

**Mark todo "Copy ParallelAnalysis workflow" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/RedTeam/Workflows/ParallelAnalysis.md" "$PAI_DIR/skills/RedTeam/Workflows/"
```

**Files copied:**
- `Workflows/ParallelAnalysis.md` - Five-phase protocol with 32 agents

**Mark todo as completed.**

### 4.6 Copy AdversarialValidation Workflow

**Mark todo "Copy AdversarialValidation workflow" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/RedTeam/Workflows/AdversarialValidation.md" "$PAI_DIR/skills/RedTeam/Workflows/"
```

**Files copied:**
- `Workflows/AdversarialValidation.md` - Three-round battle of bots protocol

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI RedTeam Skill Verification ==="

# Check skill files exist
echo "Checking skill files..."
[ -f "$PAI_DIR/skills/RedTeam/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"
[ -f "$PAI_DIR/skills/RedTeam/Philosophy.md" ] && echo "OK Philosophy.md" || echo "ERROR Philosophy.md missing"
[ -f "$PAI_DIR/skills/RedTeam/Integration.md" ] && echo "OK Integration.md" || echo "ERROR Integration.md missing"

# Check workflow files
echo ""
echo "Checking workflows..."
[ -f "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md" ] && echo "OK ParallelAnalysis.md" || echo "ERROR ParallelAnalysis.md missing"
[ -f "$PAI_DIR/skills/RedTeam/Workflows/AdversarialValidation.md" ] && echo "OK AdversarialValidation.md" || echo "ERROR AdversarialValidation.md missing"

# Count workflow files
WORKFLOW_COUNT=$(ls "$PAI_DIR/skills/RedTeam/Workflows/"*.md 2>/dev/null | wc -l)
echo ""
echo "Total workflows installed: $WORKFLOW_COUNT"

# Verify file contents
echo ""
echo "Checking file contents..."
grep -q "32 Agent Types" "$PAI_DIR/skills/RedTeam/Philosophy.md" && echo "OK Philosophy contains agent roster" || echo "WARNING Philosophy may be incomplete"
grep -q "Five Phases" "$PAI_DIR/skills/RedTeam/Workflows/ParallelAnalysis.md" && echo "OK ParallelAnalysis contains five phases" || echo "WARNING ParallelAnalysis may be incomplete"
grep -q "Three-Round Protocol" "$PAI_DIR/skills/RedTeam/Workflows/AdversarialValidation.md" && echo "OK AdversarialValidation contains protocol" || echo "WARNING AdversarialValidation may be incomplete"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI RedTeam Skill v2.3.0 installed successfully!

What's available:
- ParallelAnalysis - 32-agent stress-testing for arguments
- AdversarialValidation - Battle of bots for superior output
- 32 unique agent personalities (Engineers, Architects, Pentesters, Interns)
- 8-point Steelman and Counter-Argument output format

Try it: Ask me to 'red team this proposal' or 'battle of bots for this design'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Check directory permissions on $PAI_DIR/skills/
3. Run the verification commands in VERIFY.md
4. Verify all .md files are present in the pack

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "Permission denied" errors

```bash
# Check permissions
ls -la $PAI_DIR/skills/

# Fix permissions if needed
chmod -R u+rwX $PAI_DIR/skills/
```

### Workflows not triggering

1. Verify SKILL.md has correct routing table
2. Check for typos in workflow filenames
3. Ensure Workflows/ directory exists

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition with workflow routing |
| `Philosophy.md` | Core philosophy, success criteria, 32 agent types |
| `Integration.md` | Skill integration guide, FirstPrinciples usage |
| `Workflows/ParallelAnalysis.md` | Five-phase protocol with 32 agents |
| `Workflows/AdversarialValidation.md` | Three-round battle of bots protocol |

---

## Usage

### From Claude Code

```
"Red team this architecture proposal"
"Stress test my pricing strategy"
"Battle of bots - which approach is better for authentication?"
"Poke holes in this business plan"
"Find the fatal flaw in this argument"
```

### Output Examples

**ParallelAnalysis produces:**
1. 24-claim decomposition of the argument
2. Synthesis of convergent strengths and weaknesses
3. 8-point Steelman (strongest version of the argument)
4. 8-point Counter-Argument (devastating rebuttal)

**AdversarialValidation produces:**
1. 2-3 competing proposals from different perspectives
2. Brutal critique identifying strengths/weaknesses of each
3. Synthesized superior solution with honest trade-offs

---

## Integration with Other Skills

### FirstPrinciples Skill

If installed, RedTeam uses FirstPrinciples for enhanced analysis:
- **Phase 1:** `FirstPrinciples/Deconstruct` breaks arguments into fundamental parts
- **Phase 5:** `FirstPrinciples/Challenge` classifies constraints as HARD/SOFT/ASSUMPTION

### Research Skill

Use BEFORE RedTeam to gather context and precedents.

### StoryExplanation Skill

Used DURING RedTeam for decomposition methodology.
