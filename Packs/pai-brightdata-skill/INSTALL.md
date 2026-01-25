# BrightData Skill v2.3.0 - Installation Guide

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
"I'm installing the BrightData skill v2.3.0 - progressive URL scraping with
four-tier fallback strategy. This provides intelligent content retrieval
that automatically escalates from simple tools to professional scraping.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check for existing BrightData skill
ls -la $PAI_DIR/skills/BrightData/ 2>/dev/null || echo "No existing BrightData skill"

# Check for Browser skill (required for Tier 3)
ls -la $PAI_DIR/skills/Browser/ 2>/dev/null || echo "No Browser skill"

# Check for Bright Data MCP configuration
grep -l "brightdata" ~/.claude/claude_desktop_config.json 2>/dev/null || echo "No Bright Data MCP configured"
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- Existing BrightData skill: [Yes at path / No]
- Browser skill (for Tier 3): [Installed / NOT INSTALLED]
- Bright Data MCP (for Tier 4): [Configured / Not configured]"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Browser Skill (if missing)

**Only ask if Browser skill is NOT installed:**

```json
{
  "header": "Browser Skill",
  "question": "Browser skill is required for Tier 3 (JavaScript sites). Should I note this as a dependency?",
  "multiSelect": false,
  "options": [
    {"label": "Continue without Tier 3 (Recommended if not needed)", "description": "Tiers 1, 2, and 4 will still work"},
    {"label": "Install Browser skill first", "description": "Pause and install pai-browser-skill pack"},
    {"label": "Skip - I'll handle it later", "description": "Tier 3 will fail until Browser skill is installed"}
  ]
}
```

### Question 2: Bright Data MCP (if missing)

**Only ask if Bright Data MCP is NOT configured:**

```json
{
  "header": "Bright Data MCP",
  "question": "Bright Data MCP is required for Tier 4 (CAPTCHA/advanced bot detection). Is this configured?",
  "multiSelect": false,
  "options": [
    {"label": "Continue without Tier 4 (Most sites work without it)", "description": "Tiers 1-3 will handle most URLs"},
    {"label": "I have Bright Data account", "description": "I'll configure MCP manually"},
    {"label": "Skip Tier 4", "description": "Only use free tiers"}
  ]
}
```

### Question 3: Conflict Resolution (if existing skill found)

**Only ask if existing BrightData skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing BrightData skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing skill"},
    {"label": "Abort Installation", "description": "Cancel installation"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install BrightData skill v2.3.0?",
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

**Only execute if user chose "Backup and Replace":**

```bash
# Create timestamped backup
BACKUP_DIR="$PAI_DIR/Backups/brightdata-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup existing skill
[ -d "$PAI_DIR/skills/BrightData" ] && cp -r "$PAI_DIR/skills/BrightData" "$BACKUP_DIR/"

echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create skill directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy skill files", "status": "pending", "activeForm": "Copying skill files"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory

**Mark todo "Create skill directory structure" as in_progress.**

```bash
mkdir -p $PAI_DIR/skills/BrightData
mkdir -p $PAI_DIR/skills/BrightData/Workflows
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files" as in_progress.**

Copy the following files from this pack to your skill directory:

```bash
# From pai-brightdata-skill pack directory
cp SKILL.md $PAI_DIR/skills/BrightData/
cp README.md $PAI_DIR/skills/BrightData/

# Copy Workflows
cp Workflows/FourTierScrape.md $PAI_DIR/skills/BrightData/Workflows/
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md.**

Quick verification:

```bash
# 1. Check skill directory exists
ls -la $PAI_DIR/skills/BrightData/

# 2. Check SKILL.md present
cat $PAI_DIR/skills/BrightData/SKILL.md | head -10

# 3. Check workflow present
cat $PAI_DIR/skills/BrightData/Workflows/FourTierScrape.md | head -10

# 4. Test Tier 1 (WebFetch)
# Ask Claude to use WebFetch on https://example.com
```

**Mark todo as completed when all VERIFY.md checks pass.**

---

## Success/Failure Messages

### On Success

```
"BrightData skill v2.3.0 installed successfully!

What's available:
- Four-tier progressive URL scraping
- Automatic fallback between tiers
- Markdown output format
- Handles bot detection and CAPTCHA (with Bright Data MCP)

Try it: Ask me to 'scrape https://example.com'"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Skill directory exists? ls $PAI_DIR/skills/BrightData/
2. SKILL.md present? cat $PAI_DIR/skills/BrightData/SKILL.md
3. Workflow present? ls $PAI_DIR/skills/BrightData/Workflows/

Need help? See Troubleshooting section below."
```

---

## Troubleshooting

### Tier 3 not working (Browser automation)

Install the Browser skill:
```bash
# Install pai-browser-skill pack first
```

### Tier 4 not working (Bright Data)

Configure Bright Data MCP in Claude Desktop:
```json
{
  "mcpServers": {
    "brightdata": {
      "command": "...",
      "args": ["..."]
    }
  }
}
```

---

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition for Claude Code |
| `README.md` | Pack documentation |
| `Workflows/FourTierScrape.md` | Four-tier scraping workflow |
| `INSTALL.md` | This installation guide |
| `VERIFY.md` | Verification checklist |

---

## Dependencies

| Dependency | Required For | Status |
|------------|--------------|--------|
| WebFetch (built-in) | Tier 1 | Always available |
| Bash/curl (built-in) | Tier 2 | Always available |
| Browser skill | Tier 3 | Optional (install pai-browser-skill) |
| Bright Data MCP | Tier 4 | Optional (requires account) |
