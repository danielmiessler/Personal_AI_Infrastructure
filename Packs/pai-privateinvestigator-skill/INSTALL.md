# PAI Private Investigator Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Private Investigator Skill v2.3.0 - Ethical people-finding toolkit. This skill provides workflows for locating people, verifying identities, and conducting public records searches with built-in ethical guidelines.

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

# Check for existing PrivateInvestigator skill
if [ -d "$PAI_CHECK/skills/PrivateInvestigator" ]; then
  echo "WARNING Existing PrivateInvestigator skill found at: $PAI_CHECK/skills/PrivateInvestigator"
  ls "$PAI_CHECK/skills/PrivateInvestigator/"
else
  echo "OK No existing PrivateInvestigator skill (clean install)"
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
- Existing PrivateInvestigator skill: [Yes / No]
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

**Only ask if existing PrivateInvestigator directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing PrivateInvestigator skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Ethical Understanding

```json
{
  "header": "Ethics",
  "question": "This skill includes ethical guidelines for people-finding. Do you understand the ethical framework?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, I understand (Recommended)", "description": "Proceed with installation - ethical guidelines will be included"},
    {"label": "Tell me more", "description": "Explain the ethical framework before proceeding"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

**If user chooses "Tell me more":**
```
"The PrivateInvestigator skill includes ethical guidelines that ensure:
1. Legitimate purpose for all searches (reconnection, verification, due diligence)
2. Use of public information sources only
3. Respect for privacy boundaries
4. No support for harassment, stalking, or malicious use

The skill will guide you through ethical considerations before each search."
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Private Investigator Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/privateinvestigator-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/PrivateInvestigator" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/PrivateInvestigator" "$BACKUP_DIR/"
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
mkdir -p "$PAI_DIR/skills/PrivateInvestigator/Workflows"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/PrivateInvestigator/SKILL.md" "$PAI_DIR/skills/PrivateInvestigator/SKILL.md"
```

**Mark todo as completed.**

### 4.3 Copy Workflow Files

**Mark todo "Copy workflow files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/PrivateInvestigator/Workflows/"*.md "$PAI_DIR/skills/PrivateInvestigator/Workflows/"
```

**Workflows included:**
- `FindPerson.md` - Locate individuals using public information
- `SocialMediaSearch.md` - Search across social platforms
- `PublicRecordsSearch.md` - Access public records databases
- `ReverseLookup.md` - Phone/email/address reverse lookup
- `VerifyIdentity.md` - Identity verification workflow

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Private Investigator Skill v2.3.0 Verification ==="

# Check skill file
echo "Checking skill file..."
[ -f "$PAI_DIR/skills/PrivateInvestigator/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"

# Check workflows
echo ""
echo "Checking workflows..."
for workflow in FindPerson SocialMediaSearch PublicRecordsSearch ReverseLookup VerifyIdentity; do
  [ -f "$PAI_DIR/skills/PrivateInvestigator/Workflows/${workflow}.md" ] && echo "OK ${workflow}.md" || echo "ERROR ${workflow}.md missing"
done

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Private Investigator Skill v2.3.0 installed successfully!

What's available:
- People-finding with ethical guidelines
- Social media search workflows
- Public records lookup
- Phone/email/address reverse lookup
- Identity verification

Usage:
- 'Help me find [person]' - Locate someone (with ethical review)
- 'Do a social media search for [name]' - Search social platforms
- 'Reverse lookup [phone/email]' - Find owner information
- 'Verify identity of [person]' - Identity verification workflow

Note: All searches include ethical guidelines and legitimate purpose verification."
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
ls -la $PAI_DIR/skills/PrivateInvestigator/SKILL.md

# Check frontmatter is valid
head -20 $PAI_DIR/skills/PrivateInvestigator/SKILL.md
```

### Workflows not loading

```bash
# Verify workflow files exist
ls -la $PAI_DIR/skills/PrivateInvestigator/Workflows/

# Re-copy if missing
cp src/skills/PrivateInvestigator/Workflows/*.md $PAI_DIR/skills/PrivateInvestigator/Workflows/
```

### Permission errors

```bash
chmod -R 755 $PAI_DIR/skills/PrivateInvestigator
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
| `Workflows/FindPerson.md` | People location |
| `Workflows/SocialMediaSearch.md` | Social platform search |
| `Workflows/PublicRecordsSearch.md` | Public records lookup |
| `Workflows/ReverseLookup.md` | Reverse phone/email/address |
| `Workflows/VerifyIdentity.md` | Identity verification |

---

## Usage

### Find a Person

```
"Help me find a lost contact named [name]"
"I'm trying to reconnect with [person]"
```

The skill will:
1. Review ethical guidelines
2. Confirm legitimate purpose
3. Guide through public information sources
4. Present findings with appropriate boundaries

### Social Media Search

```
"Search social media for [name]"
"Find [person]'s social profiles"
```

### Reverse Lookup

```
"Who owns this phone number: [number]"
"Reverse lookup this email: [email]"
```

### Identity Verification

```
"Verify identity of [person]"
"Confirm [person] is who they say they are"
```

### Ethical Framework

All operations follow the ethical framework:
- Legitimate purpose required
- Public information only
- Privacy boundaries respected
- No harassment or malicious use

The skill will guide you through ethical considerations before each search.
