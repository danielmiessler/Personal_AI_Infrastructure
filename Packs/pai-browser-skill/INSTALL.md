# PAI Browser Skill v2.3.0 - Installation Guide

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
"I'm installing PAI Browser Skill v2.3.0 - Debug-first browser automation. This skill lets me take screenshots, verify web pages, and automate browser tasks with always-on visibility.

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

# Check for existing Browser skill
if [ -d "$PAI_CHECK/skills/Browser" ]; then
  echo "WARNING Existing Browser skill found at: $PAI_CHECK/skills/Browser"
  ls "$PAI_CHECK/skills/Browser/"
else
  echo "OK No existing Browser skill (clean install)"
fi

# Check for Bun runtime (REQUIRED)
if command -v bun &> /dev/null; then
  echo "OK Bun is installed: $(bun --version)"
else
  echo "ERROR Bun not installed - REQUIRED!"
fi

# Check for Playwright/Chromium
if [ -d "$HOME/.cache/ms-playwright/chromium-"* ]; then
  echo "OK Playwright Chromium is installed"
else
  echo "NOTE Playwright Chromium will be installed (~200MB download)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- Existing Browser skill: [Yes / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- Playwright Chromium: [installed / will be downloaded]"
```

**STOP if pai-core-install or Bun is not installed.** Tell the user:
```
"pai-core-install and Bun are required. Please install them first, then return to install this pack."
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing skill found)

**Only ask if existing Browser directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing Browser skill detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and replace (Recommended)", "description": "Creates timestamped backup, then installs fresh"},
    {"label": "Replace without backup", "description": "Overwrites existing skill files"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

### Question 2: Chromium Download Confirmation

**Only ask if Playwright Chromium is not installed:**

```json
{
  "header": "Download",
  "question": "The Browser skill requires Chromium (~200MB). Should I download it now?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, download now (Recommended)", "description": "Downloads Chromium browser binaries"},
    {"label": "Skip for now", "description": "Install skill files only - browser won't work until Chromium is installed"}
  ]
}
```

### Question 3: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Browser Skill v2.3.0?",
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
BACKUP_DIR="$PAI_DIR/Backups/browser-skill-$(date +%Y%m%d-%H%M%S)"

if [ -d "$PAI_DIR/skills/Browser" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_DIR/skills/Browser" "$BACKUP_DIR/"
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
    {"content": "Install dependencies", "status": "pending", "activeForm": "Installing dependencies"},
    {"content": "Install Chromium", "status": "pending", "activeForm": "Installing Chromium"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
mkdir -p "$PAI_DIR/skills/Browser"
```

**Mark todo as completed.**

### 4.2 Copy Skill Files

**Mark todo "Copy skill files from pack" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

cp -r "$PACK_DIR/src/skills/Browser/"* "$PAI_DIR/skills/Browser/"
```

**Files included:**
- `SKILL.md` - Skill definition and routing
- `browser.ts` - Browser automation core
- `examples/` - Example scripts

**Mark todo as completed.**

### 4.3 Install Dependencies

**Mark todo "Install dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/skills/Browser"
bun install
```

**Mark todo as completed.**

### 4.4 Install Chromium

**Mark todo "Install Chromium" as in_progress.**

**Only if user approved the download:**

```bash
bunx playwright install chromium
```

Tell the user:
```
"Downloading Chromium browser... this may take a minute."
```

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Browser Skill v2.3.0 Verification ==="

# Check skill file
echo "Checking skill file..."
[ -f "$PAI_DIR/skills/Browser/SKILL.md" ] && echo "OK SKILL.md" || echo "ERROR SKILL.md missing"

# Check browser.ts
echo ""
echo "Checking browser core..."
[ -f "$PAI_DIR/skills/Browser/browser.ts" ] && echo "OK browser.ts" || echo "ERROR browser.ts missing"

# Check dependencies
echo ""
echo "Checking dependencies..."
[ -d "$PAI_DIR/skills/Browser/node_modules" ] && echo "OK node_modules installed" || echo "ERROR dependencies not installed"

# Check Chromium
echo ""
echo "Checking Chromium..."
if ls ~/.cache/ms-playwright/chromium-* 1> /dev/null 2>&1; then
  echo "OK Chromium installed"
else
  echo "WARNING Chromium not installed - run: bunx playwright install chromium"
fi

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Phase 6: macOS Permission (if needed)

**On first run, macOS may block Chromium. If you see a permission error:**

```json
{
  "header": "Permission",
  "question": "macOS is blocking Chromium for security. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Run command to allow (Recommended)", "description": "Removes quarantine flag from Chromium"},
    {"label": "I'll do it manually", "description": "Go to System Settings > Privacy & Security and allow Chromium"}
  ]
}
```

**If user chooses to run command:**

```bash
xattr -d com.apple.quarantine ~/.cache/ms-playwright/chromium-*/chrome-mac/Chromium.app
```

---

## Success/Failure Messages

### On Success

```
"PAI Browser Skill v2.3.0 installed successfully!

What's available:
- Screenshot any webpage
- Verify deployed changes
- Fill out forms and interact with pages
- Test responsive designs across screen sizes
- Debug-first mode with console logs and network capture

Usage:
- 'Take a screenshot of [URL]' - Screenshot a webpage
- 'Verify the homepage looks correct' - Visual verification
- 'Test this page on mobile' - Responsive testing
- 'Fill out the form at [URL]' - Form automation"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Verify Bun is installed: `bun --version`
3. Install Chromium: `bunx playwright install chromium`
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

### "bun: command not found"

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc  # or restart terminal
```

### "Browser not launched" error

```bash
# Install Chromium
bunx playwright install chromium
```

### Permission errors on macOS

```bash
# Remove quarantine flag
xattr -d com.apple.quarantine ~/.cache/ms-playwright/chromium-*/chrome-mac/Chromium.app
```

Or go to System Settings > Privacy & Security and allow Chromium.

### Port already in use

```bash
# Kill process on port 9222
lsof -ti :9222 | xargs kill -9
```

---

## What's Included

### Skill Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Skill definition and routing |
| `browser.ts` | Browser automation core |
| `examples/` | Example scripts |

---

## Usage

### Take Screenshots

```
"Take a screenshot of https://example.com"
"Screenshot the homepage"
```

### Verify Deployments

```
"Verify the changes deployed correctly"
"Check if the new design is live"
```

### Responsive Testing

```
"Test this page on mobile"
"Check how it looks at 768px width"
```

### Form Automation

```
"Fill out the contact form at [URL]"
"Submit a test login"
```

### Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Headless mode | Yes | Run browser invisibly |
| Viewport size | 1920x1080 | Screenshot dimensions |
| Browser port | 9222 | For persistent sessions |
