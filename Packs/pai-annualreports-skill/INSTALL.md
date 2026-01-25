# PAI Annual Reports Skill - Installation Guide

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
"I'm installing the AnnualReports skill - a comprehensive security report aggregation
system with 570+ sources from across the cybersecurity industry. This includes threat
intelligence, survey reports, and vendor analyses from CrowdStrike, Microsoft, IBM,
Verizon, and hundreds more.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check if PAI_DIR is set
echo "PAI_DIR: ${PAI_DIR:-'NOT SET - will use ~/.config/pai'}"

# Check for Bun runtime
which bun && bun --version

# Check for CORE skill (required dependency)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "✓ CORE skill is installed (required)"
else
  echo "❌ CORE skill NOT installed - install pai-core-install first!"
fi

# Check for existing AnnualReports skill
if [ -d "$PAI_CHECK/skills/AnnualReports" ]; then
  echo "⚠️ Existing AnnualReports skill found at: $PAI_CHECK/skills/AnnualReports"
else
  echo "✓ No existing AnnualReports skill (clean install)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- PAI_DIR: [path or NOT SET]
- Bun: [installed vX.X / NOT INSTALLED]
- CORE skill: [installed / NOT INSTALLED - REQUIRED]
- Existing AnnualReports skill: [Yes at path / No]"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Missing CORE Skill (if not installed)

**Only ask if CORE skill is NOT installed:**

```json
{
  "header": "Dependency",
  "question": "The CORE skill is required but not installed. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Install pai-core-install first (Recommended)", "description": "I'll install the CORE skill pack, then continue with AnnualReports"},
    {"label": "Skip and continue anyway", "description": "AnnualReports will install but skill routing won't work"},
    {"label": "Abort installation", "description": "Cancel - I'll install dependencies manually"}
  ]
}
```

### Question 2: Conflict Resolution (if existing skill found)

**Only ask if existing AnnualReports skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing AnnualReports skill detected at $PAI_DIR/skills/AnnualReports. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Merge/Update", "description": "Keep existing data files, update tools and skill definition"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing skill"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install AnnualReports skill with 570+ security report sources?",
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

**Only execute if user chose "Backup and Replace" for conflicts:**

```bash
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

if [ -d "$PAI_CHECK/skills/AnnualReports" ]; then
  mkdir -p "$BACKUP_DIR/skills"
  cp -r "$PAI_CHECK/skills/AnnualReports" "$BACKUP_DIR/skills/AnnualReports"
  echo "✓ Backed up AnnualReports skill to $BACKUP_DIR/skills/AnnualReports"
fi
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Install SKILL.md", "status": "pending", "activeForm": "Installing skill definition"},
    {"content": "Install tools", "status": "pending", "activeForm": "Installing CLI tools"},
    {"content": "Install workflows", "status": "pending", "activeForm": "Installing workflows"},
    {"content": "Install data files", "status": "pending", "activeForm": "Installing sources data"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"
mkdir -p $PAI_CHECK/skills/AnnualReports/{Tools,Workflows,Data,Reports}
```

**Mark todo as completed.**

### 4.2 Install SKILL.md

**Mark todo "Install SKILL.md" as in_progress.**

Copy `src/skills/AnnualReports/SKILL.md` to `$PAI_DIR/skills/AnnualReports/SKILL.md`

**Mark todo as completed.**

### 4.3 Install Tools

**Mark todo "Install tools" as in_progress.**

Copy the following tools to `$PAI_DIR/skills/AnnualReports/Tools/`:

| Source | Destination |
|--------|-------------|
| `src/skills/AnnualReports/Tools/ListSources.ts` | `$PAI_DIR/skills/AnnualReports/Tools/ListSources.ts` |
| `src/skills/AnnualReports/Tools/UpdateSources.ts` | `$PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts` |
| `src/skills/AnnualReports/Tools/FetchReport.ts` | `$PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts` |

**Mark todo as completed.**

### 4.4 Install Workflows

**Mark todo "Install workflows" as in_progress.**

Copy the following workflows to `$PAI_DIR/skills/AnnualReports/Workflows/`:

| Source | Destination |
|--------|-------------|
| `src/skills/AnnualReports/Workflows/Update.md` | `$PAI_DIR/skills/AnnualReports/Workflows/Update.md` |
| `src/skills/AnnualReports/Workflows/Analyze.md` | `$PAI_DIR/skills/AnnualReports/Workflows/Analyze.md` |
| `src/skills/AnnualReports/Workflows/Fetch.md` | `$PAI_DIR/skills/AnnualReports/Workflows/Fetch.md` |

**Mark todo as completed.**

### 4.5 Install Data Files

**Mark todo "Install data files" as in_progress.**

Copy the sources data file:

| Source | Destination |
|--------|-------------|
| `src/skills/AnnualReports/Data/sources.json` | `$PAI_DIR/skills/AnnualReports/Data/sources.json` |

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md.**

Quick verification:
```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check skill definition exists
ls $PAI_CHECK/skills/AnnualReports/SKILL.md

# Check tools exist
ls $PAI_CHECK/skills/AnnualReports/Tools/*.ts

# Check workflows exist
ls $PAI_CHECK/skills/AnnualReports/Workflows/*.md

# Check data file exists
ls $PAI_CHECK/skills/AnnualReports/Data/sources.json

# Test list sources
bun run $PAI_CHECK/skills/AnnualReports/Tools/ListSources.ts
```

**Mark todo as completed when all VERIFY.md checks pass.**

---

## Success/Failure Messages

### On Success

```
"AnnualReports skill v2.3.0 installed successfully!

What's available:
- 570+ security report sources across 20+ categories
- Three CLI tools: ListSources, UpdateSources, FetchReport
- Three workflows: Update, Analyze, Fetch
- Categories: Threat Intelligence, Ransomware, Data Breaches, Cloud Security, and more

Try these commands:
- List categories: bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts
- Search vendors: bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts --vendor crowdstrike
- Fetch report: bun run $PAI_DIR/skills/AnnualReports/Tools/FetchReport.ts verizon dbir

Next steps:
1. Run 'update annual reports' to sync with upstream
2. Search for reports relevant to your industry
3. Use analyze workflow for cross-vendor trend analysis"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. CORE skill installed? Run: ls $PAI_DIR/skills/CORE/SKILL.md
2. Directories created? Run: ls $PAI_DIR/skills/AnnualReports/
3. Tools copied? Run: ls $PAI_DIR/skills/AnnualReports/Tools/
4. Data file present? Run: ls $PAI_DIR/skills/AnnualReports/Data/sources.json
5. Check VERIFY.md for the specific failing check

Need help? See Troubleshooting section below."
```

---

## Troubleshooting

### Tools Not Working

```bash
# Check Bun is installed
which bun

# Check tool exists
ls -la $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts

# Run with verbose output
bun run $PAI_DIR/skills/AnnualReports/Tools/ListSources.ts 2>&1
```

### Missing Data File

```bash
# Check data directory exists
ls -la $PAI_DIR/skills/AnnualReports/Data/

# If missing, re-copy from pack
cp /path/to/pai-annualreports-skill/src/skills/AnnualReports/Data/sources.json \
   $PAI_DIR/skills/AnnualReports/Data/
```

### Upstream Sync Fails

```bash
# Check network connectivity
curl -I https://raw.githubusercontent.com/jacobdjwilson/awesome-annual-security-reports/main/README.md

# Run with dry-run flag to see what would change
bun run $PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts --dry-run
```

---

## Post-Installation

### Update Sources from Upstream

Run periodically to get new report sources:
```bash
bun run $PAI_DIR/skills/AnnualReports/Tools/UpdateSources.ts
```

### Regenerate Skill Index

If routing doesn't work, regenerate the skill index:
```bash
bun run $PAI_DIR/Tools/GenerateSkillIndex.ts
```
