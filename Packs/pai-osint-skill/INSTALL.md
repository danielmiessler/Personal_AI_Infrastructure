# PAI OSINT Skill v1.1.0 - Installation Guide

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
"I'm installing pai-osint-skill v1.1.0 - AI-powered OSINT collection and analysis.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check PAI_DIR
echo "PAI_DIR: ${PAI_DIR:-$HOME/.claude}"

# Check for existing osint skill
if [ -d "$PAI_DIR/skills/osint" ]; then
  echo "Existing osint skill found at: $PAI_DIR/skills/osint"
  ls -la "$PAI_DIR/skills/osint/"
else
  echo "No existing osint skill (clean install)"
fi

# Check for Browser skill (dependency)
if [ -d "$PAI_DIR/skills/Browser" ]; then
  echo "Browser skill: INSTALLED"
else
  echo "Browser skill: NOT INSTALLED (optional but recommended)"
fi

# Check for Knowledge skill (dependency)
if [ -d "$PAI_DIR/skills/Knowledge" ]; then
  echo "Knowledge skill: INSTALLED"
else
  echo "Knowledge skill: NOT INSTALLED (optional but recommended)"
fi

# Check for research directory
if [ -d "$PAI_DIR/history/research/osint" ]; then
  echo "Research directory: EXISTS"
else
  echo "Research directory: WILL BE CREATED"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- PAI_DIR: [path]
- Existing osint skill: [Yes at path / No]
- Browser skill: [Installed / Not installed]
- Knowledge skill: [Installed / Not installed]"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing osint skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing osint skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new v1.1.0"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: OSINT Scope

**Ask about primary use cases:**

```json
{
  "header": "Scope",
  "question": "What types of OSINT investigations will you primarily perform?",
  "multiSelect": true,
  "options": [
    {"label": "Person Investigation (Recommended)", "description": "Username enumeration, social media, entity linking"},
    {"label": "Domain Intelligence", "description": "DNS, WHOIS, certificate transparency, subdomains"},
    {"label": "Company Research", "description": "Corporate profiles, ownership, financials, risk assessment"},
    {"label": "All of the above", "description": "Full OSINT capability with all 13 workflows"}
  ]
}
```

### Question 3: Dependencies

**Only ask if dependencies are missing:**

```json
{
  "header": "Dependencies",
  "question": "Some optional dependencies are not installed. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Continue without (Recommended)", "description": "OSINT will work with reduced functionality"},
    {"label": "Stop and install dependencies", "description": "Install browser and knowledge packs first"},
    {"label": "Show me what's missing", "description": "List missing dependencies and their impact"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install pai-osint-skill v1.1.0?",
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
# Create backup
BACKUP_DIR="$PAI_DIR/Backups/osint-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing osint skill
if [ -d "$PAI_DIR/skills/osint" ]; then
  cp -r "$PAI_DIR/skills/osint" "$BACKUP_DIR/"
  echo "osint skill backed up to: $BACKUP_DIR"
fi

# Backup existing research directory
if [ -d "$PAI_DIR/history/research/osint" ]; then
  cp -r "$PAI_DIR/history/research/osint" "$BACKUP_DIR/"
  echo "Research directory backed up to: $BACKUP_DIR"
fi

echo "Backup complete at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy SKILL.md", "status": "pending", "activeForm": "Copying skill definition"},
    {"content": "Copy all 13 workflows", "status": "pending", "activeForm": "Copying workflow files"},
    {"content": "Create research directory", "status": "pending", "activeForm": "Creating research directory"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification checks"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
# Create skill directories
mkdir -p $PAI_DIR/skills/osint/Workflows

# Verify creation
ls -la $PAI_DIR/skills/osint/
```

**Mark todo as completed.**

### 4.2 Copy SKILL.md

**Mark todo "Copy SKILL.md" as in_progress.**

```bash
# Copy skill definition (use absolute path to pack source)
cp /path/to/pai-osint-skill/src/skills/osint/SKILL.md $PAI_DIR/skills/osint/

# Verify skill name is lowercase
grep "^name:" $PAI_DIR/skills/osint/SKILL.md
# Should show: name: osint
```

**Mark todo as completed.**

### 4.3 Copy All 13 Workflows

**Mark todo "Copy all 13 workflows" as in_progress.**

```bash
# Copy all workflow files
cp /path/to/pai-osint-skill/src/skills/osint/Workflows/*.md $PAI_DIR/skills/osint/Workflows/

# Verify count
ls $PAI_DIR/skills/osint/Workflows/*.md | wc -l
# Should show: 13
```

**Expected workflows:**
1. UsernameRecon.md
2. DomainRecon.md
3. SocialCapture.md
4. InfraMapping.md
5. EntityLinking.md
6. TimelineAnalysis.md
7. TargetProfile.md
8. IntelReport.md
9. CompanyProfile.md
10. CorporateStructure.md
11. FinancialRecon.md
12. CompetitorAnalysis.md
13. RiskAssessment.md

**Mark todo as completed.**

### 4.4 Create Research Directory

**Mark todo "Create research directory" as in_progress.**

```bash
# Create research output directory
mkdir -p $PAI_DIR/history/research/osint

# Verify
ls -la $PAI_DIR/history/research/
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
export PAI_DIR=${PAI_DIR:-$HOME/.claude}

echo "=== PAI OSINT Skill Verification ==="
echo ""

PASS=0
FAIL=0
WARN=0

# Core Structure
echo "Core Structure:"
if [ -d "$PAI_DIR/skills/osint" ]; then echo "  osint directory"; ((PASS++)); else echo "  osint directory"; ((FAIL++)); fi
if [ -f "$PAI_DIR/skills/osint/SKILL.md" ]; then echo "  SKILL.md"; ((PASS++)); else echo "  SKILL.md"; ((FAIL++)); fi
if grep -q "^name: osint$" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  Skill name lowercase"; ((PASS++)); else echo "  Skill name not lowercase"; ((FAIL++)); fi
if [ -d "$PAI_DIR/skills/osint/Workflows" ]; then echo "  Workflows directory"; ((PASS++)); else echo "  Workflows directory"; ((FAIL++)); fi
if [ -d "$PAI_DIR/history/research/osint" ]; then echo "  Research directory"; ((PASS++)); else echo "  Research directory"; ((FAIL++)); fi

# Workflows
echo ""
echo "Workflows (13 required):"
WF_COUNT=$(ls "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $WF_COUNT/13 workflows"
if [ "$WF_COUNT" -eq 13 ]; then ((PASS++)); else ((FAIL++)); fi

# Knowledge integration
echo ""
echo "Knowledge Integration:"
KI_COUNT=$(grep -l 'Use the \*\*knowledge\*\* skill' "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $KI_COUNT/13 workflows with knowledge skill"
if [ "$KI_COUNT" -eq 13 ]; then ((PASS++)); else ((FAIL++)); fi

# Dependencies
echo ""
echo "Dependencies:"
if [ -d "$PAI_DIR/skills/Browser" ]; then echo "  Browser skill"; ((PASS++)); else echo "  Browser skill not installed"; ((WARN++)); fi
if [ -d "$PAI_DIR/skills/Knowledge" ]; then echo "  Knowledge skill"; ((PASS++)); else echo "  Knowledge skill not installed"; ((WARN++)); fi

# Configuration
echo ""
echo "Configuration:"
if grep -q "^name:" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  Valid frontmatter"; ((PASS++)); else echo "  Invalid frontmatter"; ((FAIL++)); fi
if grep -q "triggers:" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  Triggers defined"; ((PASS++)); else echo "  Triggers missing"; ((FAIL++)); fi
if grep -q "Intent Routing" "$PAI_DIR/skills/osint/SKILL.md" 2>/dev/null; then echo "  Intent routing"; ((PASS++)); else echo "  Intent routing missing"; ((FAIL++)); fi

echo ""
echo "Results: $PASS passed, $FAIL failed, $WARN warnings"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "OSINT System installation VERIFIED"
else
  echo "Installation incomplete - review failed checks"
fi
```

**Mark todo as completed when all VERIFY.md checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI OSINT Skill v1.1.0 installed successfully!

What's available:
- 13 OSINT workflows for person, domain, and company investigation
- Knowledge graph integration for persistent findings
- Dual storage: knowledge graph + file reports

Try it:
- 'investigate username johndoe'
- 'company profile Acme Corp'
- 'risk assessment Vendor LLC'

See docs/QUICK_REFERENCE.md for all commands."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Verify $PAI_DIR is set correctly (default: ~/.claude)
2. Ensure all 13 workflow files were copied
3. Check SKILL.md has lowercase name 'osint'
4. Check VERIFY.md for the specific failing check

Need help? See Troubleshooting section below."
```

---

## Troubleshooting

### "osint directory not found"

```bash
# Create directory manually
mkdir -p $PAI_DIR/skills/osint/Workflows
```

### "Skill name not lowercase"

```bash
# Edit SKILL.md to fix name
# Change: name: OSINT
# To:     name: osint
```

### "Workflows missing"

```bash
# Re-copy from pack source
cp /path/to/pai-osint-skill/src/skills/osint/Workflows/*.md $PAI_DIR/skills/osint/Workflows/
```

### "Knowledge integration missing"

Workflows should contain: `Use the **knowledge** skill`

```bash
# Check which workflows are missing
for f in $PAI_DIR/skills/osint/Workflows/*.md; do
  if ! grep -q 'Use the \*\*knowledge\*\* skill' "$f"; then
    echo "Missing: $(basename $f)"
  fi
done
```

### "Browser skill not installed"

```bash
# Install browser skill first (optional)
# OSINT will work without it but with reduced web scraping capability
```

### "Knowledge skill not installed"

```bash
# Install pai-knowledge-system pack first
# The knowledge skill handles its own MCP and database configuration
```

---

## What's Included

| File | Purpose |
|------|---------|
| `src/skills/osint/SKILL.md` | Skill definition with intent routing |
| `src/skills/osint/Workflows/UsernameRecon.md` | Username enumeration across 400+ platforms |
| `src/skills/osint/Workflows/DomainRecon.md` | DNS, WHOIS, CT logs, subdomains |
| `src/skills/osint/Workflows/SocialCapture.md` | Social media profile capture |
| `src/skills/osint/Workflows/InfraMapping.md` | Infrastructure scanning |
| `src/skills/osint/Workflows/EntityLinking.md` | Cross-source identity resolution |
| `src/skills/osint/Workflows/TimelineAnalysis.md` | Temporal pattern detection |
| `src/skills/osint/Workflows/TargetProfile.md` | Comprehensive target investigation |
| `src/skills/osint/Workflows/IntelReport.md` | Structured intelligence reports |
| `src/skills/osint/Workflows/CompanyProfile.md` | Company investigation dossier |
| `src/skills/osint/Workflows/CorporateStructure.md` | Ownership and hierarchy tracing |
| `src/skills/osint/Workflows/FinancialRecon.md` | SEC filings, funding, investors |
| `src/skills/osint/Workflows/CompetitorAnalysis.md` | Market position, SWOT analysis |
| `src/skills/osint/Workflows/RiskAssessment.md` | Litigation, sanctions, due diligence |

---

## Usage

### From Claude Code (Natural Language)

```
"Find all accounts for username johndoe"
"Investigate domain example.com"
"Do a company profile on Acme Corporation"
"Risk assessment on Vendor LLC"
"Generate intel report for Investigation Alpha"
```

### From Claude Code (/osint Commands)

```
/osint username johndoe
/osint domain example.com
/osint company "Acme Corporation"
/osint risk "Vendor LLC"
/osint report "Investigation Alpha"
```

---

## Post-Installation

1. Review workflows in `$PAI_DIR/skills/osint/Workflows/`
2. Optionally configure API keys in `$PAI_DIR/.env`
3. Run a test investigation to verify functionality
4. Check `docs/` for usage guides
