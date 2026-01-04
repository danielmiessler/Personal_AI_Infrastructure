---
name: Browser
description: Code-first browser automation and web verification. USE WHEN browser, screenshot, navigate, web testing, verify UI, VERIFY phase. Replaces Playwright MCP with 99% token savings.
---

# Browser - Code-First Browser Automation

**Browser automation and web verification using code-first Playwright.**

---

## File-Based MCP

This skill is a **file-based MCP** - pre-written code that executes existing scripts, NOT generates new code.

**Why file-based?** Filter data in code BEFORE returning to model context = 99%+ token savings.

---

## STOP - CLI First, Always

### The Wrong Pattern

**DO NOT write new TypeScript code for simple browser tasks:**

```typescript
// WRONG - Writing new code defeats the purpose of file-based MCPs
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/index.ts'
const browser = new PlaywrightBrowser()
await browser.launch({ headless: true })
await browser.navigate('https://example.com')
await browser.screenshot({ path: '/tmp/shot.png' })
await browser.close()
```

**Problems with this approach:**
- You're writing 5+ lines of boilerplate every time
- You manage browser lifecycle manually
- You duplicate what the CLI already does
- You're generating new code instead of executing existing code

### The Right Pattern

**USE the CLI tool - it executes pre-written code:**

```bash
# RIGHT - One command, zero boilerplate
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/shot.png
```

**Benefits:**
- One command, instant execution
- Lifecycle handled automatically
- Error handling built-in
- TRUE file-based MCP pattern

---

## CLI Commands (Primary Interface)

**Location:** `$PAI_DIR/skills/Browser/Tools/Browse.ts`

### screenshot - Take a screenshot

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot <url> [output-path]
```

**Examples:**
```bash
# Screenshot to default location
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://danielmiessler.com

# Screenshot to specific file
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/example.png
```

### verify - Check element exists

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify <url> <selector>
```

**Examples:**
```bash
# Verify body exists
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://example.com "body"

# Verify specific element
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://danielmiessler.com "h1"

# Verify by CSS selector
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://example.com ".main-content"
```

### open - Open URL in visible browser

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open <url>
```

**Examples:**
```bash
# Open site for manual inspection
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open https://danielmiessler.com
```

---

## Decision Tree: When to Use What

```
                    What are you trying to do?
                              |
           ┌──────────────────┴──────────────────┐
           ▼                                     ▼
    ┌─────────────┐                      ┌─────────────┐
    │   SIMPLE    │                      │   COMPLEX   │
    │ Single task │                      │ Multi-step  │
    └─────────────┘                      └─────────────┘
           │                                     │
           ▼                                     ▼
    ┌─────────────┐                      ┌─────────────┐
    │ • Screenshot│                      │ • Form fill │
    │ • Verify    │                      │ • Auth flow │
    │ • Open URL  │                      │ • Conditionals│
    └─────────────┘                      └─────────────┘
           │                                     │
           ▼                                     ▼
    ┌─────────────┐                      ┌─────────────┐
    │ USE CLI     │                      │ USE WORKFLOW│
    │ Browse.ts   │                      │ or API      │
    └─────────────┘                      └─────────────┘
```

### Quick Reference

| Task | Use CLI? | Use TypeScript? |
|------|----------|-----------------|
| Take screenshot | YES | NO |
| Verify element exists | YES | NO |
| Open page visually | YES | NO |
| Fill multi-field form | NO | YES (Workflow) |
| Authentication flow | NO | YES (Workflow) |
| Conditional logic | NO | YES (API) |
| Multi-step interaction | NO | YES (Workflow) |

**The Rule:** Can you describe it in ONE action? (screenshot, verify, open) → CLI

---

## VERIFY Phase Integration

**The Browser skill is MANDATORY for VERIFY phase of web changes.**

### Using CLI for Verification

Before claiming ANY web change is "live" or "working":

```bash
# 1. Take screenshot of the changed page
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com/changed-page /tmp/verify.png

# 2. Verify the specific element that changed
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://example.com/changed-page ".changed-element"
```

**Then use the Read tool to view the screenshot:**
```
Read /tmp/verify.png
```

**If you haven't LOOKED at the rendered page, you CANNOT claim it works.**

---

## Workflow Routing

For complex, multi-step tasks, use the pre-built workflows:

| Trigger | Workflow |
|---------|----------|
| Fill forms, interact with page | `Workflows/Interact.md` |
| Extract page content | `Workflows/Extract.md` |
| Complex verification sequence | `Workflows/VerifyPage.md` |
| Screenshot with custom options | `Workflows/Screenshot.md` |

**Workflows use the TypeScript API internally but are pre-written.**

---

## Advanced: TypeScript API

**Only use this for custom automation that CLI cannot handle.**

Before using this API, ask yourself:
1. Did I check if CLI can do this? (screenshot/verify/open)
2. Is this a multi-step workflow? (not just one action)
3. Do I need conditional logic between actions?

**If you answered NO to all, use the CLI instead.**

### Quick Start (Advanced Users Only)

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/index.ts'

const browser = new PlaywrightBrowser()
await browser.launch({ headless: true })
await browser.navigate('https://example.com')
// ... custom logic here ...
await browser.close()
```

### API Reference

**Navigation:**
- `launch(options?)` - Start browser
- `navigate(url)` - Go to URL
- `goBack()` / `goForward()` - History navigation
- `reload()` - Refresh page
- `close()` - Shut down browser

**Capture:**
- `screenshot({ path, fullPage, selector })` - Take screenshot
- `getVisibleText(selector?)` - Extract text
- `getVisibleHtml(options)` - Get HTML
- `savePdf(path)` - Export PDF
- `getAccessibilityTree()` - A11y snapshot

**Interaction:**
- `click(selector)` - Click element
- `fill(selector, value)` - Fill input
- `type(selector, text, delay?)` - Type with delay
- `select(selector, value)` - Select dropdown
- `pressKey(key)` - Keyboard input
- `hover(selector)` - Mouse hover
- `drag(source, target)` - Drag and drop
- `uploadFile(selector, path)` - File upload

**Waiting:**
- `waitForSelector(selector, options)` - Wait for element
- `waitForText(text, options)` - Wait for text
- `waitForNavigation(options)` - Wait for page load
- `waitForNetworkIdle(timeout?)` - Wait for idle
- `wait(ms)` - Fixed delay

**JavaScript:**
- `evaluate(script)` - Run JS
- `getConsoleLogs(options)` - Get console output
- `setUserAgent(ua)` - Change user agent

**Viewport:**
- `resize(width, height)` - Set size
- `setDevice(name)` - Emulate device

---

## Token Savings

| Approach | Tokens | Notes |
|----------|--------|-------|
| Playwright MCP | ~13,700 | Loaded at startup, always |
| CLI tool | ~0 | Executes pre-written code |
| TypeScript API | ~50-200 | Only what you write |
| **CLI Savings** | **99%+** | Compared to MCP |
