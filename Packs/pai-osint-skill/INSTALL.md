# PAI OSINT Skill v2.3.0 - Installation Guide

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
"I'm installing PAI OSINT Skill v2.3.0 - Open source intelligence gathering. This skill provides ethical OSINT capabilities for people lookup, company due diligence, and entity investigation with built-in authorization gates.

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

# Check for existing OSINT skill
if [ -d "$PAI_CHECK/skills/OSINT" ]; then
  echo "WARNING Existing OSINT skill found at: $PAI_CHECK/skills/OSINT"
  ls "$PAI_CHECK/skills/OSINT/"
else
  echo "OK No existing OSINT skill (clean install)"
fi

# Check skills directory exists
if [ -d "$PAI_CHECK/skills" ]; then
  echo "OK Skills directory exists"
else
  echo "NOTE Skills directory will be created"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing OSINT skill: [Yes / No]
- Skills directory: [exists / will be created]"
```

**STOP if pai-core-install is not installed.** Tell the user:
```
"pai-core-install is required. Please install it first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing OSINT directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing OSINT skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Ethical Framework Acknowledgment

```json
{
  "header": "Ethics",
  "question": "OSINT operations require ethical authorization. Do you understand the ethical framework?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, I understand (Recommended)", "description": "Proceed with installation - ethical gates will require authorization for each operation"},
    {"label": "Tell me more", "description": "Explain the ethical framework before proceeding"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

**If user chooses "Tell me more":**
```
"The OSINT skill includes an ethical framework that requires:
1. Authorization confirmation before each investigation
2. Legitimate purpose declaration (reconnection, due diligence, etc.)
3. Respect for privacy boundaries
4. No harassment, stalking, or malicious use

The skill will prompt for authorization before executing any lookup."
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI OSINT Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/osint-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/OSINT" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/OSINT" "$BACKUP_DIR/"
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
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/OSINT/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy main skill files
cp "$PACK_DIR/src/skills/SKILL.md" "$PAI_DIR/skills/OSINT/"
cp "$PACK_DIR/src/skills/EthicalFramework.md" "$PAI_DIR/skills/OSINT/"
cp "$PACK_DIR/src/skills/Methodology.md" "$PAI_DIR/skills/OSINT/"
cp "$PACK_DIR/src/skills/PeopleTools.md" "$PAI_DIR/skills/OSINT/"
cp "$PACK_DIR/src/skills/CompanyTools.md" "$PAI_DIR/skills/OSINT/"
cp "$PACK_DIR/src/skills/EntityTools.md" "$PAI_DIR/skills/OSINT/"
```

**Files included:**
- `SKILL.md` - Main skill definition and routing
- `EthicalFramework.md` - Authorization and ethical guidelines
- `Methodology.md` - OSINT methodology documentation
- `PeopleTools.md` - People lookup resources
- `CompanyTools.md` - Company research resources
- `EntityTools.md` - General entity lookup resources

**Mark todo as completed.**

### 4.3 Copy Workflow Files

**Mark todo "Copy workflow files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/Workflows/"*.md "$PAI_DIR/skills/OSINT/Workflows/"
```

**Workflows included:**
- `PeopleLookup.md` - People search workflow
- `CompanyLookup.md` - Company research workflow
- `CompanyDueDiligence.md` - Comprehensive company investigation
- `EntityLookup.md` - General entity lookup workflow

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI OSINT Skill v2.3.0 Verification ==="

# Check skill files
echo "Checking skill files..."
for file in SKILL.md EthicalFramework.md Methodology.md PeopleTools.md CompanyTools.md EntityTools.md; do
  [ -f "$PAI_DIR/skills/OSINT/$file" ] && echo "OK $file" || echo "ERROR $file missing"
done

# Check workflows
echo ""
echo "Checking workflows..."
for workflow in PeopleLookup CompanyLookup CompanyDueDiligence EntityLookup; do
  [ -f "$PAI_DIR/skills/OSINT/Workflows/${workflow}.md" ] && echo "OK ${workflow}.md" || echo "ERROR ${workflow}.md missing"
done

# Check ethical framework content
echo ""
echo "Checking ethical framework..."
if grep -q "Authorization" "$PAI_DIR/skills/OSINT/EthicalFramework.md" 2>/dev/null; then
  echo "OK Ethical framework has authorization gates"
else
  echo "WARNING Ethical framework may be incomplete"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI OSINT Skill v2.3.0 installed successfully!

What's available:
- People lookup with ethical authorization
- Company due diligence and research
- Entity investigation workflows
- Built-in ethical framework with authorization gates

Usage:
- 'Find information about [person]' - People lookup (requires authorization)
- 'Do OSINT on [company]' - Company research
- 'Due diligence on [company]' - Comprehensive company investigation

Note: All operations require authorization confirmation before execution."
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

### Skill not loading

```bash
# Verify SKILL.md exists
ls -la $PAI_DIR/skills/OSINT/SKILL.md

# Check frontmatter is valid
head -20 $PAI_DIR/skills/OSINT/SKILL.md
```

### Workflows not routing

```bash
# Verify workflow files exist
ls -la $PAI_DIR/skills/OSINT/Workflows/

# Check workflow routing in SKILL.md
grep -A 10 "Workflow Routing" $PAI_DIR/skills/OSINT/SKILL.md
```

### Authorization gate not appearing

```bash
# Ensure EthicalFramework.md is present
cat $PAI_DIR/skills/OSINT/EthicalFramework.md

# Check workflow references ethical framework
grep -i "ethical" $PAI_DIR/skills/OSINT/Workflows/PeopleLookup.md
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |
| `EthicalFramework.md` | Authorization and ethics |
| `Methodology.md` | OSINT methodology |
| `PeopleTools.md` | People lookup resources |
| `CompanyTools.md` | Company research resources |
| `EntityTools.md` | Entity lookup resources |

### Workflows

| File | Purpose |
|------|---------|
| `Workflows/PeopleLookup.md` | People search |
| `Workflows/CompanyLookup.md` | Company research |
| `Workflows/CompanyDueDiligence.md` | Due diligence |
| `Workflows/EntityLookup.md` | Entity lookup |

---

## Usage

### People Lookup

```
"Help me find contact information for [person]"
"I'm trying to reconnect with [person]"
```

The skill will:
1. Display authorization checklist
2. Ask for purpose confirmation
3. Execute lookup with ethical constraints

### Company Due Diligence

```
"Do due diligence on [company]"
"Research [company] for a potential partnership"
```

### Entity Investigation

```
"Do OSINT on [domain/entity]"
"Investigate [target] (with authorization)"
```

### Ethical Framework

All operations are gated by the ethical framework which requires:
- Legitimate purpose declaration
- Authorization confirmation
- Respect for privacy boundaries
- No harassment or malicious use

The skill will refuse to proceed without authorization.

### Customization

Create a customizations directory to adjust ethical thresholds:

```bash
mkdir -p $PAI_DIR/skills/CORE/USER/SKILLCUSTOMIZATIONS/OSINT/
```

Then create `PREFERENCES.md` to customize authorization requirements.
