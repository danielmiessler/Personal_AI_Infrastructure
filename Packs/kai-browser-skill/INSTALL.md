# Kai Browser Skill - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## Step 0: Pre-Installation System Analysis

**CRITICAL: Execute this analysis BEFORE any file operations.**

### 0.1 Environment Detection

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

### 0.2 Conflict Resolution Matrix

| Existing State | Action Required |
|----------------|-----------------|
| No Browser/Playwright/Browse skill | Clean install - proceed normally |
| Existing `Browser/` skill | **ASK USER**: Backup and replace, or abort? |
| Existing `Playwright/` skill only | Migrate: backup, install Browser, delete Playwright |
| Existing `Browse/` skill only | Migrate: backup, install Browser, delete Browse |
| Both Playwright and Browse exist | Merge migration: backup both, install Browser, delete both |

### 0.3 Backup Procedure (If Conflicts Detected)

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

### 0.4 Dependency Check

```bash
# Verify Bun is installed
if ! command -v bun &> /dev/null; then
    echo "Bun not found. Installing..."
    curl -fsSL https://bun.sh/install | bash
    # Reload shell or source profile
fi

# Verify bun works
bun --version
```

### 0.5 User Confirmation Points

Before proceeding, confirm with the user:
1. **Backup location acceptable?** (default: `$PAI_DIR/Backups/`)
2. **Conflict resolution approach?** (if existing skills found)
3. **Browser preference?** (default: Chromium only, option: all browsers)

---

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **macOS, Linux, or Windows**: Cross-platform support via Playwright

---

## Step 1: Create Skill Directory

```bash
mkdir -p $PAI_DIR/skills/Browser
cd $PAI_DIR/skills/Browser
```

---

## Step 2: Copy Skill Files

Copy the following files from this pack to your skill directory:

```bash
# From kai-browser-skill pack directory
cp src/index.ts $PAI_DIR/skills/Browser/
cp package.json $PAI_DIR/skills/Browser/
cp tsconfig.json $PAI_DIR/skills/Browser/
cp SKILL.md $PAI_DIR/skills/Browser/
cp README.md $PAI_DIR/skills/Browser/

# Create subdirectories
mkdir -p $PAI_DIR/skills/Browser/Tools
mkdir -p $PAI_DIR/skills/Browser/Workflows
mkdir -p $PAI_DIR/skills/Browser/examples

# Copy subdirectory contents
cp Tools/Browse.ts $PAI_DIR/skills/Browser/Tools/
cp Workflows/*.md $PAI_DIR/skills/Browser/Workflows/
cp examples/*.ts $PAI_DIR/skills/Browser/examples/
```

---

## Step 3: Install Dependencies

```bash
cd $PAI_DIR/skills/Browser
bun install
```

This will install:
- `playwright` - Browser automation library
- Playwright browsers (Chromium, Firefox, WebKit)

---

## Step 4: Install Playwright Browsers

```bash
bunx playwright install chromium
```

**Optional:** Install all browsers:
```bash
bunx playwright install
```

---

## Step 5: Verify Installation

Run the verification script:

```bash
bun $PAI_DIR/skills/Browser/examples/verify-page.ts https://example.com
```

Expected output:
```
Navigating to https://example.com...
Page loaded: Example Domain
Title: Example Domain
Console errors: 0
```

Take a test screenshot:

```bash
bun $PAI_DIR/skills/Browser/examples/screenshot.ts https://example.com /tmp/test.png
```

Check the screenshot exists:
```bash
ls -la /tmp/test.png
```

---

## Step 6: Test CLI Tool

```bash
# Should show help
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts

# Take a screenshot
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/cli-test.png
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
| `index.ts` | PlaywrightBrowser API wrapper class |
| `SKILL.md` | Skill definition for Claude Code |
| `README.md` | Developer documentation |
| `Tools/Browse.ts` | CLI tool for browser operations |
| `Workflows/*.md` | Workflow definitions |
| `examples/*.ts` | Example scripts |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript configuration |

---

## Usage

### From Claude Code

Just ask to use the browser:

```
Navigate to danielmiessler.com and take a screenshot
```

### From TypeScript

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/index.ts'

const browser = new PlaywrightBrowser()
await browser.launch()
await browser.navigate('https://example.com')
await browser.screenshot({ path: 'screenshot.png' })
await browser.close()
```

### From CLI

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/shot.png
```

---

## Token Savings

This skill is a **file-based MCP** - it replaces the Playwright MCP with code-first implementation:

| Approach | Tokens |
|----------|--------|
| Playwright MCP | ~13,700 at startup |
| Browser Skill | ~50-200 per operation |
| **Savings** | **99%+** |
