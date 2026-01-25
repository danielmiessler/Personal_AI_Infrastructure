# PAI Recon Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Recon Skill v2.3.0 - Security reconnaissance toolkit. This skill provides passive reconnaissance capabilities for domain investigation, IP lookups, and bug bounty program discovery.

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

# Check for existing Recon skill
if [ -d "$PAI_CHECK/skills/Recon" ]; then
  echo "WARNING Existing Recon skill found at: $PAI_CHECK/skills/Recon"
  ls "$PAI_CHECK/skills/Recon/"
else
  echo "OK No existing Recon skill (clean install)"
fi

# Check for Bun runtime (REQUIRED)
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check for standard Unix tools
echo ""
echo "Checking standard tools..."
command -v curl &> /dev/null && echo "OK curl" || echo "WARNING curl not found"
command -v dig &> /dev/null && echo "OK dig" || echo "WARNING dig not found"
command -v whois &> /dev/null && echo "OK whois" || echo "WARNING whois not found"

# Check for IPINFO_API_KEY (optional)
if [ -n "$IPINFO_API_KEY" ]; then
  echo "OK IPINFO_API_KEY is set (enhanced IP lookups)"
else
  echo "NOTE IPINFO_API_KEY not set (basic IP lookups only)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Recon skill: [Yes / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- Standard tools (curl, dig, whois): [all present / some missing]
- IPINFO_API_KEY: [set / not set (optional)]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing Recon directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Recon skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: IPInfo API Key (optional enhancement)

```json
{
  "header": "Enhancement",
  "question": "Would you like to configure IPInfo for enhanced IP reconnaissance?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, I have an API key", "description": "Configure IPInfo for detailed IP lookups"},
    {"label": "Help me get one (free tier)", "description": "Guide me through IPInfo signup"},
    {"label": "Skip for now (Recommended)", "description": "Use basic IP lookups - can add later"}
  ]
}
```

**If user chooses "Help me get one":**
```
"Here's how to get a free IPInfo API key:
1. Go to https://ipinfo.io
2. Sign up for a free account (50,000 requests/month)
3. Get your API token from the dashboard
4. Come back and we'll configure it"
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Recon Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/recon-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/Recon" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/Recon" "$BACKUP_DIR/"
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
    {"content": "Copy tool files from pack", "status": "pending", "activeForm": "Copying tool files"},
    {"content": "Configure IPINFO_API_KEY", "status": "pending", "activeForm": "Configuring IPInfo"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Recon/"{Workflows,Tools,Data}
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/SKILL.md" "$PAI_DIR/skills/Recon/SKILL.md"
```

**Mark todo as completed.**

### 4.3 Copy Workflow Files

**Mark todo "Copy workflow files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/skills/Workflows/"*.md "$PAI_DIR/skills/Recon/Workflows/"
```

**Workflows included:**
- `PassiveRecon.md` - Safe reconnaissance workflow
- `DomainRecon.md` - Domain investigation workflow
- `IpRecon.md` - IP reconnaissance workflow
- `NetblockRecon.md` - CIDR range scanning workflow
- `BountyPrograms.md` - Bug bounty discovery workflow

**Mark todo as completed.**

### 4.4 Copy Tool Files

**Mark todo "Copy tool files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp "$PACK_DIR/src/tools/"*.ts "$PAI_DIR/skills/Recon/Tools/"
chmod +x "$PAI_DIR/skills/Recon/Tools/"*.ts
```

**Tools included:**
- `BountyPrograms.ts` - Bug bounty program discovery CLI
- `IpinfoClient.ts` - IPInfo API client
- `DnsUtils.ts` - DNS enumeration utilities
- `CidrUtils.ts` - CIDR notation utilities
- `WhoisParser.ts` - WHOIS response parser

**Mark todo as completed.**

### 4.5 Configure IPINFO_API_KEY (If Provided)

**Mark todo "Configure IPINFO_API_KEY" as in_progress.**

**If user provided a key:**

```bash
# Add to shell profile
if ! grep -q "IPINFO_API_KEY" ~/.zshrc 2>/dev/null; then
  echo 'export IPINFO_API_KEY="USER_PROVIDED_KEY"' >> ~/.zshrc
  echo "Added IPINFO_API_KEY to ~/.zshrc"
fi
```

**If user skipped:**
```
"Skipping IPInfo configuration. IP lookups will use basic data only.
To enable enhanced lookups later:
1. Get a free key from https://ipinfo.io
2. Add to ~/.zshrc: export IPINFO_API_KEY=\"your-key\""
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Recon Skill v2.3.0 Verification ==="

# Check skill file
echo "Checking skill file..."
[ -f "$PAI_DIR/skills/Recon/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"

# Check workflows
echo ""
echo "Checking workflows..."
for workflow in PassiveRecon DomainRecon IpRecon NetblockRecon BountyPrograms; do
  [ -f "$PAI_DIR/skills/Recon/Workflows/${workflow}.md" ] && echo "OK ${workflow}.md" || echo "ERROR ${workflow}.md missing"
done

# Check tools
echo ""
echo "Checking tools..."
for tool in BountyPrograms IpinfoClient DnsUtils CidrUtils WhoisParser; do
  [ -f "$PAI_DIR/skills/Recon/Tools/${tool}.ts" ] && echo "OK ${tool}.ts" || echo "ERROR ${tool}.ts missing"
done

# Test tool execution
echo ""
echo "Testing BountyPrograms tool..."
bun "$PAI_DIR/skills/Recon/Tools/BountyPrograms.ts" --help && echo "OK Tool executes" || echo "ERROR Tool execution failed"

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Recon Skill v2.3.0 installed successfully!

What's available:
- Passive reconnaissance workflows (safe, non-intrusive)
- Domain investigation and DNS enumeration
- IP and netblock reconnaissance
- Bug bounty program discovery
- WHOIS and DNS utilities

Usage:
- 'Recon on example.com' - Domain reconnaissance
- 'IP lookup 1.2.3.4' - IP information
- 'Find bug bounty programs' - Discover programs
- 'Check if example.com has a bounty program' - Bounty check

Note: All reconnaissance is passive and non-intrusive by default."
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Check directory permissions on $PAI_DIR/skills/
4. Make tools executable: `chmod +x $PAI_DIR/skills/Recon/Tools/*.ts`
5. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "bun: command not found"

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or restart terminal
```

### "Permission denied" when running tools

```bash
chmod +x $PAI_DIR/skills/Recon/Tools/*.ts
```

### "IPINFO_API_KEY not set"

The tool works without the API key but with limited data:
```bash
export IPINFO_API_KEY="your_key"
```

### Cache issues with BountyPrograms

```bash
# Force refresh
bun $PAI_DIR/skills/Recon/Tools/BountyPrograms.ts update

# Or delete cache manually
rm $PAI_DIR/skills/Recon/Data/BountyPrograms.json
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
| `Workflows/PassiveRecon.md` | Safe reconnaissance |
| `Workflows/DomainRecon.md` | Domain investigation |
| `Workflows/IpRecon.md` | IP reconnaissance |
| `Workflows/NetblockRecon.md` | CIDR scanning |
| `Workflows/BountyPrograms.md` | Bug bounty discovery |

### Tools

| File | Purpose |
|------|---------|
| `Tools/BountyPrograms.ts` | Bug bounty CLI |
| `Tools/IpinfoClient.ts` | IPInfo API client |
| `Tools/DnsUtils.ts` | DNS utilities |
| `Tools/CidrUtils.ts` | CIDR utilities |
| `Tools/WhoisParser.ts` | WHOIS parser |

---

## Usage

### Domain Reconnaissance

```
"Do passive recon on example.com"
"What can you find about example.com?"
```

### IP Reconnaissance

```
"IP lookup 8.8.8.8"
"What netblock owns 1.2.3.4?"
```

### Bug Bounty Discovery

```bash
# List all known programs
bun $PAI_DIR/skills/Recon/Tools/BountyPrograms.ts list

# Check specific domain
bun $PAI_DIR/skills/Recon/Tools/BountyPrograms.ts check example.com

# Search programs
bun $PAI_DIR/skills/Recon/Tools/BountyPrograms.ts search fintech
```

### Security Notes

- All reconnaissance is passive by default
- Active scanning requires explicit authorization
- Follow responsible disclosure practices
- Respect robots.txt and rate limits
