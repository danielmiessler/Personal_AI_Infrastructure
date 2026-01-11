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
    {"label": "All of the above", "description": "Full OSINT capability with all 16 workflows"}
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

### Question 4: API Key Configuration (Optional)

```json
{
  "header": "API Keys",
  "question": "Do you want to configure optional API keys for enhanced OSINT capabilities?",
  "multiSelect": false,
  "options": [
    {"label": "Skip for Now", "description": "OSINT will work with free/public data sources"},
    {"label": "Configure API Keys", "description": "I'll guide you through setting up API keys"},
    {"label": "Show Me What's Available", "description": "List available API integrations and benefits"}
  ]
}
```

**If user chooses "Configure API Keys" or "Show Me What's Available":**

```bash
# Create or edit .env file
ENV_FILE="$PAI_DIR/.env"
mkdir -p "$(dirname "$ENV_FILE")"

# Add API key template
cat >> "$ENV_FILE" << 'EOF'

# OSINT API Keys (Optional)
# All workflows work without these keys using public sources
# Keys enhance data quality and access rate limits

# Shodan (Infrastructure scanning)
# Get key at: https://developer.shodan.io/api/requirements
SHODAN_API_KEY=""

# SecurityTrails (Domain intelligence)
# Get key at: https://securitytrails.com/corp/api
SECURITYTRAILS_API_KEY=""

# Hunter.io (Email finding)
# Get key at: https://hunter.io/api/accounts
HUNTER_API_KEY=""

# Have I Been Pwned (Breach checking)
# Get key at: https://haveibeenpwned.com/API/Key
HIBP_API_KEY=""

# NumVerify (Phone validation)
# Get key at: https://numverify.com/
NUMVERIFY_API_KEY=""

EOF

echo "✓ API key template created at: $ENV_FILE"
echo "  Edit this file to add your API keys"
echo "  Each key is optional - add only what you need"
```

**API Key Benefits:**

| Service | Enhances Workflows | Benefits |
|---------|-------------------|----------|
| Shodan | InfraMapping | Full port scan results, service fingerprints |
| SecurityTrails | DomainRecon, CorporateStructure | Complete domain history, WHOIS data |
| Hunter.io | EmailRecon | Professional email finding, verification |
| HaveIBeenPwned | EmailRecon | Breach database access |
| NumVerify | PhoneRecon | International phone validation |

### Question 5: Final Confirmation

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

**Before installing, locate the pack source:**

```bash
# Determine where pai-osint-skill pack is located
# If cloned from git
PACK_SOURCE="$(git rev-parse --show-toplevel 2>/dev/null)/Packs/pai-osint-skill"

# If downloaded archive or current directory
PACK_SOURCE="$(pwd)"

# Verify pack contents exist
if [ -f "$PACK_SOURCE/src/skills/osint/SKILL.md" ]; then
  echo "✓ Pack source located at: $PACK_SOURCE"
else
  echo "✗ Pack source not found. Please navigate to the pai-osint-skill directory"
  echo "  or specify the full path to PACK_SOURCE"
  exit 1
fi

# List what will be installed
echo ""
echo "Files to be installed:"
ls -1 "$PACK_SOURCE/src/skills/osint/SKILL.md"
ls -1 "$PACK_SOURCE/src/skills/osint/Workflows/"*.md
echo ""
echo "Total workflows: $(ls -1 "$PACK_SOURCE/src/skills/osint/Workflows/"*.md | wc -l | xargs)"
```

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy SKILL.md", "status": "pending", "activeForm": "Copying skill definition"},
    {"content": "Copy all 16 workflows", "status": "pending", "activeForm": "Copying workflow files"},
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
# Copy skill definition using PACK_SOURCE variable
cp "$PACK_SOURCE/src/skills/osint/SKILL.md" $PAI_DIR/skills/osint/

# Verify skill name is lowercase
grep "^name:" $PAI_DIR/skills/osint/SKILL.md
# Should show: name: osint
```

**Mark todo as completed.**

### 4.3 Copy All 16 Workflows

**Mark todo "Copy all 16 workflows" as in_progress.**

```bash
# Copy all workflow files using PACK_SOURCE variable
cp "$PACK_SOURCE/src/skills/osint/Workflows/"*.md $PAI_DIR/skills/osint/Workflows/

# Verify count
ls $PAI_DIR/skills/osint/Workflows/*.md | wc -l
# Should show: 16
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
14. EmailRecon.md
15. PhoneRecon.md
16. ImageRecon.md

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
echo "Workflows (16 required):"
WF_COUNT=$(ls "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $WF_COUNT/16 workflows"
if [ "$WF_COUNT" -eq 16 ]; then ((PASS++)); else ((FAIL++)); fi

# Knowledge integration
echo ""
echo "Knowledge Integration:"
KI_COUNT=$(grep -l 'Use the \*\*knowledge\*\* skill' "$PAI_DIR/skills/osint/Workflows/"*.md 2>/dev/null | wc -l | xargs)
echo "  Found: $KI_COUNT/16 workflows with knowledge skill"
if [ "$KI_COUNT" -eq 16 ]; then ((PASS++)); else ((FAIL++)); fi

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
- 16 OSINT workflows for person, domain, company, and digital artifact investigation
- Knowledge graph integration for persistent findings
- Dual storage: knowledge graph + file reports

Try it:
- 'investigate username johndoe'
- 'company profile Acme Corp'
- 'risk assessment Vendor LLC'
- 'email lookup john@example.com'
- 'phone lookup +1-555-123-4567'
- 'analyze this image'

See docs/QUICK_REFERENCE.md for all commands."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Verify $PAI_DIR is set correctly (default: ~/.claude)
2. Ensure all 16 workflow files were copied
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
# Re-copy from pack source using PACK_SOURCE variable
PACK_SOURCE="/path/to/pai-osint-skill"  # Adjust to your path
cp "$PACK_SOURCE/src/skills/osint/Workflows/"*.md $PAI_DIR/skills/osint/Workflows/
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
| `src/skills/osint/Workflows/EmailRecon.md` | Email address investigation and breach checking |
| `src/skills/osint/Workflows/PhoneRecon.md` | Phone number lookup and validation |
| `src/skills/osint/Workflows/ImageRecon.md` | Image metadata, forensics, and reverse search |

---

## Usage

### From Claude Code (Natural Language)

```
"Find all accounts for username johndoe"
"Investigate domain example.com"
"Do a company profile on Acme Corporation"
"Risk assessment on Vendor LLC"
"Generate intel report for Investigation Alpha"
"Email lookup john@example.com"
"Phone lookup +1-555-123-4567"
"Analyze this image for metadata"
```

### From Claude Code (/osint Commands)

```
/osint username johndoe
/osint domain example.com
/osint company "Acme Corporation"
/osint risk "Vendor LLC"
/osint report "Investigation Alpha"
/osint email john@example.com
/osint phone +1-555-123-4567
/osint image /path/to/image.jpg
```

---

## Post-Installation

1. Review workflows in `$PAI_DIR/skills/osint/Workflows/`
2. Optionally configure API keys in `$PAI_DIR/.env`
3. Run a test investigation to verify functionality
4. Check `docs/` for usage guides
