# Browser Skill v1.2.0 - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## 🎯 AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/Write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing the Browser skill v1.2.0 - debug-first browser automation with
Playwright. This provides screenshot capture, web verification, and browser
testing with 99% token savings over MCP approaches.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Detect operating system
uname -s  # Darwin (macOS), Linux, or Windows

# Check for Bun runtime
which bun && bun --version

# Check for existing Playwright installation
ls -la $PAI_DIR/skills/Browser/ 2>/dev/null || echo "No existing Browser skill"
ls -la $PAI_DIR/skills/Playwright/ 2>/dev/null || echo "No existing Playwright skill"
ls -la $PAI_DIR/skills/Browse/ 2>/dev/null || echo "No existing Browse skill"

# Check for Playwright browsers
ls -la ~/Library/Caches/ms-playwright/ 2>/dev/null || \
ls -la ~/.cache/ms-playwright/ 2>/dev/null || \
echo "No Playwright browsers installed"
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- OS: [Darwin/Linux/Windows]
- Bun: [installed v1.x / NOT INSTALLED]
- Existing Browser skill: [Yes at path / No]
- Playwright browsers: [Chromium installed / Not installed]"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Bun Runtime (if missing)

**Only ask if Bun is NOT installed:**

```json
{
  "header": "Runtime",
  "question": "Bun is required but not installed. Should I install it now?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install Bun (Recommended)", "description": "Runs: curl -fsSL https://bun.sh/install | bash"},
    {"label": "Skip - I'll install manually", "description": "Installation will pause until Bun is available"}
  ]
}
```

### Question 2: Conflict Resolution (if existing skill found)

**Only ask if existing Browser/Playwright/Browse skill detected:**

```json
{
  "header": "Conflict",
  "question": "Existing [Browser/Playwright] skill detected at $PAI_DIR/skills/[name]. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing skill without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing skill"}
  ]
}
```

### Question 3: Browser Selection

```json
{
  "header": "Browsers",
  "question": "Which Playwright browsers should I install?",
  "multiSelect": false,
  "options": [
    {"label": "Chromium only (Recommended)", "description": "~200MB, covers 95% of use cases"},
    {"label": "All browsers", "description": "~600MB, includes Firefox and WebKit"},
    {"label": "Skip browser install", "description": "Use existing browsers if available"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install Browser skill v1.2.0?",
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
# Create timestamped backup
BACKUP_DIR="$PAI_DIR/Backups/browser-skill-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup any existing skills
[ -d "$PAI_DIR/skills/Browser" ] && cp -r "$PAI_DIR/skills/Browser" "$BACKUP_DIR/"
[ -d "$PAI_DIR/skills/Playwright" ] && cp -r "$PAI_DIR/skills/Playwright" "$BACKUP_DIR/"
[ -d "$PAI_DIR/skills/Browse" ] && cp -r "$PAI_DIR/skills/Browse" "$BACKUP_DIR/"

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
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Install Playwright browsers", "status": "pending", "activeForm": "Installing Playwright browsers"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Skill Directory

**Mark todo "Create skill directory structure" as in_progress.**

```bash
mkdir -p $PAI_DIR/skills/Browser
mkdir -p $PAI_DIR/skills/Browser/src
mkdir -p $PAI_DIR/skills/Browser/Tools
mkdir -p $PAI_DIR/skills/Browser/Workflows
mkdir -p $PAI_DIR/skills/Browser/examples
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files" as in_progress.**

Copy the following files from this pack to your skill directory:

```bash
# From pai-browser-skill pack directory
cp src/index.ts $PAI_DIR/skills/Browser/src/
cp package.json $PAI_DIR/skills/Browser/
cp tsconfig.json $PAI_DIR/skills/Browser/
cp SKILL.md $PAI_DIR/skills/Browser/
cp README.md $PAI_DIR/skills/Browser/

# Copy Tools
cp Tools/Browse.ts $PAI_DIR/skills/Browser/Tools/
cp Tools/BrowserSession.ts $PAI_DIR/skills/Browser/Tools/

# Copy Workflows and examples
cp Workflows/*.md $PAI_DIR/skills/Browser/Workflows/
cp examples/*.ts $PAI_DIR/skills/Browser/examples/
```

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
cd $PAI_DIR/skills/Browser
bun install
```

This will install:
- `playwright` - Browser automation library

**Mark todo as completed.**

### 4.4 Install Playwright Browsers

**Mark todo "Install Playwright browsers" as in_progress.**

Based on user's choice in Question 3:

**If "Chromium only":**
```bash
bunx playwright install chromium
```

**If "All browsers":**
```bash
bunx playwright install
```

**If "Skip":** No action needed.

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md.** The file contains 15 verification checks that must ALL pass.

Quick verification:

```bash
# 1. Check CLI shows v1.2.0
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts --help | head -3

# 2. Navigate with diagnostics
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts https://example.com

# 3. Check session status
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts status

# 4. Stop session
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts stop
```

**Mark todo as completed when all VERIFY.md checks pass.**

---

## Success/Failure Messages

### On Success

```
"Browser skill v1.2.0 installed successfully!

What's available:
- Debug-first navigation with automatic diagnostics
- Session auto-start (no manual setup needed)
- Console/network monitoring by default
- 99% token savings vs MCP approaches

Try it: bun run $PAI_DIR/skills/Browser/Tools/Browse.ts https://example.com"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Bun installed? Run: which bun
2. Dependencies installed? Run: cd $PAI_DIR/skills/Browser && bun install
3. Browsers installed? Run: bunx playwright install chromium
4. Check VERIFY.md for the specific failing check

Need help? See Troubleshooting section below."
```

---

## Troubleshooting

### "Playwright browsers not installed"

```bash
bunx playwright install chromium
```

### "Cannot find module 'playwright'"

```bash
cd $PAI_DIR/skills/Browser
bun install
```

### "Permission denied" on Linux

Playwright may need additional dependencies:
```bash
bunx playwright install-deps chromium
```

---

## What's Included

| File | Purpose |
|------|---------|
| `src/index.ts` | PlaywrightBrowser API wrapper class |
| `SKILL.md` | Skill definition for Claude Code |
| `README.md` | Developer documentation |
| `Tools/Browse.ts` | CLI tool for browser operations |
| `Tools/BrowserSession.ts` | Persistent browser session server |
| `Workflows/*.md` | Workflow definitions |
| `examples/*.ts` | Example scripts |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript configuration |

---

## Usage

### From Claude Code

Just ask to use the browser:

```
Navigate to example.com and take a screenshot
```

### From TypeScript

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/src/index.ts'

const browser = new PlaywrightBrowser()
await browser.launch()
await browser.navigate('https://example.com')
await browser.screenshot({ path: 'screenshot.png' })
await browser.close()
```

### From CLI

```bash
# Navigate with full diagnostics (primary command)
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts https://example.com

# Take screenshot
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot /tmp/shot.png

# Check for errors
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts errors
```

---

## Token Savings

This skill is a **file-based MCP** - it replaces the Playwright MCP with code-first implementation:

| Approach | Tokens |
|----------|--------|
| Playwright MCP | ~13,700 at startup |
| Browser Skill | ~50-200 per operation |
| **Savings** | **99%+** |
