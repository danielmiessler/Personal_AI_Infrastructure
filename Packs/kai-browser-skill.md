---
name: Kai Browser Skill
pack-id: danielmiessler-kai-browser-skill-v1.1.0
version: 1.1.0
author: danielmiessler
description: Code-first browser automation replacing Playwright MCP with 99% token savings. Navigate, screenshot, interact, and verify web pages.
type: skill
purpose-type: [browser-automation, verification, testing]
platform: claude-code
dependencies: []
keywords: [browser, playwright, automation, screenshot, web-testing, verification, file-based-mcp]
---

<p align="center">
  <img src="kai-browser-skill/icons/kai-browser-skill-v3.png" alt="Kai Browser Skill" width="256">
</p>

# Kai Browser Skill (kai-browser-skill)

> Code-first browser automation with 99% token savings over Playwright MCP

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#pack-system)

---

### 🚨 CRITICAL: AI Agent Installation Instructions

**You are an AI agent installing this pack. Follow these steps EXACTLY:**

1. **Step 0 - Pre-Installation Analysis** (MANDATORY)
   - Detect the user's operating system and environment
   - Check for existing Browser/Playwright/Browse skills
   - If conflicts found, ASK the user before proceeding
   - Create backup if replacing existing installation

2. **Copy ALL Files Exactly**
   - DO NOT simplify, summarize, or "improve" any files
   - Copy the EXACT content of each file
   - Preserve all directory structure

3. **Verify Installation**
   - Run ALL 8 verification checks from VERIFY.md
   - DO NOT report success until ALL checks pass
   - If any check fails, troubleshoot before proceeding

4. **Report Results**
   - Show user which checks passed/failed
   - Confirm final installation status

**Anti-Simplification Directive:** This pack contains carefully crafted code and documentation. Do not attempt to simplify, condense, or "improve" any files during installation. Copy them EXACTLY as provided.

---

This Pack adds browser automation capabilities to your AI infrastructure. The Kai Browser Skill provides:

- **Navigation**: Go to URLs, navigate history, reload pages
- **Screenshots**: Capture full pages or specific elements
- **Interaction**: Click, fill forms, select dropdowns, type text
- **Verification**: Wait for elements, check content, validate pages
- **Extraction**: Get visible text, HTML, accessibility tree

**Core principle:** Replace token-heavy MCPs with code-first execution.

The Playwright MCP loads ~13,700 tokens at startup whether you use it or not. This skill loads ~50-200 tokens per operation, only when needed. That's 99%+ token savings.

Please follow the installation instructions below to integrate this Pack into your infrastructure.

**Quick Navigation:** [What's Included](#whats-included) | [The Problem](#the-concept-andor-problem) | [The Solution](#the-solution) | [Installation](#installation) | [Troubleshooting](#troubleshooting) | [Configuration](#configuration) | [Changelog](#changelog)

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| API Wrapper | `src/index.ts` | PlaywrightBrowser class with full API |
| CLI Tool | `Tools/Browse.ts` | Command-line browser operations |
| Skill Definition | `SKILL.md` | Claude Code skill integration |
| Screenshot Workflow | `Workflows/Screenshot.md` | Screenshot capture workflow |
| Verify Workflow | `Workflows/VerifyPage.md` | Page verification workflow |
| Interact Workflow | `Workflows/Interact.md` | Form interaction workflow |
| Extract Workflow | `Workflows/Extract.md` | Content extraction workflow |
| Example Scripts | `examples/*.ts` | Ready-to-run examples |

**Summary:**
- **Files created:** 10+
- **Workflows:** 4
- **Dependencies:** playwright

---

## The Concept and/or Problem

> **Reference:** Anthropic's engineering blog post [Code execution with MCP: Building more efficient agents](https://www.anthropic.com/engineering/code-execution-with-mcp) details how file-based MCPs can reduce token usage by 98%+.

AI agents need browser automation for:

- Verifying web deployments actually work
- Taking screenshots for documentation
- Interacting with web forms
- Extracting content from pages
- Testing user interfaces

**The MCP Problem:**

The Playwright MCP (Model Context Protocol) is the standard approach:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

But it has significant overhead:
- **~13,700 tokens loaded at startup** - whether you use it or not
- **Limited to 21 predefined tools** - can't access full Playwright API
- **MCP protocol overhead** - extra latency on every operation

**The Token Cost:**

Even if you only take one screenshot per session:
- MCP: 13,700 tokens (loaded at start)
- Actual operation: ~100 tokens
- **Total: 13,800 tokens**

For a session with 5 screenshots:
- MCP: Still 13,700 tokens
- Operations: 5 x ~100 = 500 tokens
- **Total: 14,200 tokens**

---

## The Solution

**File-based MCP** - code-first execution with on-demand loading, as described in [Anthropic's MCP code execution approach](https://www.anthropic.com/engineering/code-execution-with-mcp):

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/index.ts'

const browser = new PlaywrightBrowser()
await browser.launch()
await browser.navigate('https://example.com')
await browser.screenshot({ path: 'screenshot.png' })
await browser.close()
```

**Benefits:**

| Metric | Playwright MCP | Browser Skill |
|--------|----------------|---------------|
| Startup cost | ~13,700 tokens | 0 tokens |
| Per-operation | ~0 | ~50-200 tokens |
| API access | 21 tools | Full Playwright API |
| Latency | MCP overhead | Direct execution |

**Token Savings Example:**

5 screenshots per session:
- MCP: 13,700 tokens
- Browser Skill: 5 x ~100 = 500 tokens
- **Savings: 96%**

---

## Installation

### Prerequisites

- Bun runtime: `curl -fsSL https://bun.sh/install | bash`
- macOS, Linux, or Windows

### Step 1: Create Directory

```bash
mkdir -p $PAI_DIR/skills/Browser
cd $PAI_DIR/skills/Browser
```

### Step 2: Copy Files

From the `kai-browser-skill/` pack directory:

```bash
cp src/index.ts $PAI_DIR/skills/Browser/
cp package.json $PAI_DIR/skills/Browser/
cp tsconfig.json $PAI_DIR/skills/Browser/
cp SKILL.md $PAI_DIR/skills/Browser/

mkdir -p $PAI_DIR/skills/Browser/Tools
mkdir -p $PAI_DIR/skills/Browser/Workflows
mkdir -p $PAI_DIR/skills/Browser/examples

cp Tools/Browse.ts $PAI_DIR/skills/Browser/Tools/
cp Workflows/*.md $PAI_DIR/skills/Browser/Workflows/
cp examples/*.ts $PAI_DIR/skills/Browser/examples/
```

### Step 3: Install Dependencies

```bash
cd $PAI_DIR/skills/Browser
bun install
bunx playwright install chromium
```

### Step 4: Verify

```bash
bun $PAI_DIR/skills/Browser/examples/verify-page.ts https://example.com
```

Expected output: "Page loaded: Example Domain"

---

## Usage

### From Claude Code

Just ask:

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
# Open in visible browser
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open https://example.com

# Take screenshot
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/shot.png

# Verify element
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://example.com "h1"
```

---

## API Reference

### Navigation
- `launch(options?)` - Start browser
- `navigate(url)` - Go to URL
- `goBack()` / `goForward()` - History
- `reload()` - Refresh page
- `close()` - Shut down

### Capture
- `screenshot(options?)` - Take screenshot
- `getVisibleText(selector?)` - Extract text
- `getVisibleHtml(options?)` - Get HTML
- `savePdf(path)` - Export PDF
- `getAccessibilityTree()` - A11y snapshot

### Interaction
- `click(selector)` - Click element
- `fill(selector, value)` - Fill input
- `type(selector, text)` - Type with delay
- `select(selector, value)` - Select dropdown
- `pressKey(key)` - Keyboard input
- `hover(selector)` - Mouse hover
- `drag(source, target)` - Drag and drop
- `uploadFile(selector, path)` - File upload

### Waiting
- `waitForSelector(selector)` - Wait for element
- `waitForNavigation()` - Wait for page load
- `waitForNetworkIdle()` - Wait for idle
- `wait(ms)` - Fixed delay

### JavaScript
- `evaluate(script)` - Run JS
- `getConsoleLogs()` - Get console output
- `setUserAgent(ua)` - Change user agent

### Viewport
- `resize(width, height)` - Set size
- `setDevice(name)` - Emulate device

---

## Troubleshooting

### "Cannot find module 'playwright'"

```bash
cd $PAI_DIR/skills/Browser
bun install
```

### "Executable doesn't exist"

```bash
bunx playwright install chromium
```

### Screenshot is blank

Wait for page to load:
```typescript
await browser.waitForNetworkIdle()
await browser.screenshot({ path: 'shot.png' })
```

---

## Configuration

### Launch Options

```typescript
await browser.launch({
  browser: 'chromium',  // 'chromium' | 'firefox' | 'webkit'
  headless: true,       // false to see browser
  viewport: { width: 1280, height: 720 },
  userAgent: 'Custom UA'
})
```

### Screenshot Options

```typescript
await browser.screenshot({
  path: 'screenshot.png',
  fullPage: true,       // Capture entire page
  selector: '#element', // Capture specific element
  type: 'png',          // 'png' | 'jpeg'
  quality: 80           // JPEG quality (0-100)
})
```

---

## Changelog

### v1.1.0 (2026-01-03)
- **CLI-first redesign** - Documentation now emphasizes CLI tool over TypeScript API
- Added "STOP - CLI First, Always" anti-pattern section
- Added decision tree for CLI vs TypeScript routing
- VERIFY phase examples now use CLI commands
- TypeScript API renamed to "Advanced" and moved to bottom
- Clearer guidance on when to use each approach

### v1.0.0 (2026-01-03)
- Initial release
- Merged from Browse + Playwright skills
- Full Playwright API wrapper
- CLI tool with open/screenshot/verify commands
- 4 workflow definitions
- Example scripts
