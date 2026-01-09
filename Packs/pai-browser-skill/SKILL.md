---
name: Browser
version: 1.2.0
description: Debug-first browser automation with always-on visibility. USE WHEN browser, screenshot, navigate, web testing, verify UI, VERIFY phase, debug web page. Session auto-starts, captures console/network by default.
---

# Browser - Debug-First Browser Automation

**Browser automation with debugging visibility by DEFAULT.**

Console logs, network requests, and errors are always captured - because debugging shouldn't be opt-in.

---

## Philosophy: Debug-First

Traditional browser automation treats debugging as an afterthought. You run your test, it fails, and THEN you add logging to figure out why.

This skill flips that: **debugging is enabled from the start**. Every page load captures:
- Console logs (errors, warnings, info)
- Network requests and responses
- Failed requests (4xx, 5xx)
- Page load status

When something breaks, the diagnostic data already exists.

---

## Session Architecture

**Session auto-starts on first use.** No explicit start command needed.

```
Any CLI command → Session running?
                      ├─ Yes → Execute command
                      └─ No → Auto-start session → Execute command
```

**Key behaviors:**
- First command starts a persistent browser session
- Session stays alive between commands (fast subsequent operations)
- 30-minute idle timeout auto-cleans up zombie processes
- State stored in `/tmp/browser-session.json`

---

## CLI Commands (Primary Interface)

**Location:** `$PAI_DIR/skills/Browser/Tools/Browse.ts`

### Primary Command - Navigate with Diagnostics

```bash
bun run Browse.ts <url>
```

This is the **main command**. Navigates to the URL and outputs:
- Screenshot path
- Console errors (if any)
- Console warnings (if any)
- Failed requests (if any)
- Network summary
- Page load status

**Example output:**
```
📸 Screenshot: /tmp/browse-1704567890.png

🔴 Console Errors (1):
   • Uncaught TypeError: Cannot read property 'map' of undefined

🌐 Failed Requests (1):
   • GET /api/users → 500 Internal Server Error

📊 Network: 23 requests | 847KB | avg 156ms
⚠️ Page: "My App" loaded with issues
```

### Query Commands

Check current session state without navigating:

```bash
bun run Browse.ts errors      # Console errors only
bun run Browse.ts warnings    # Console warnings only
bun run Browse.ts console     # All console output
bun run Browse.ts network     # All network activity
bun run Browse.ts failed      # Failed requests (4xx, 5xx)
```

### Interaction Commands

```bash
bun run Browse.ts navigate <url>           # Navigate without diagnostics
bun run Browse.ts screenshot [path]        # Screenshot current page
bun run Browse.ts click <selector>         # Click element
bun run Browse.ts fill <selector> <value>  # Fill input field
bun run Browse.ts type <selector> <text>   # Type with delay
bun run Browse.ts eval "<javascript>"      # Execute JavaScript
bun run Browse.ts open <url>               # Open in default browser
```

### Session Management

```bash
bun run Browse.ts status     # Show session info
bun run Browse.ts restart    # Fresh session (clears logs)
bun run Browse.ts stop       # Stop session
```

---

## STOP - CLI First, Always

### The Wrong Pattern

**DO NOT write new TypeScript code for simple browser tasks:**

```typescript
// WRONG - Writing new code defeats the purpose
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/src/index.ts'
const browser = new PlaywrightBrowser()
await browser.launch({ headless: true })
await browser.navigate('https://example.com')
await browser.screenshot({ path: '/tmp/shot.png' })
await browser.close()
```

**Problems:**
- 5+ lines of boilerplate every time
- Manual browser lifecycle management
- No automatic diagnostic capture

### The Right Pattern

**USE the CLI - it handles everything:**

```bash
# One command = navigate + screenshot + diagnostics
bun run Browse.ts https://example.com
```

---

## Decision Tree

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
    │ • Navigate  │                      │ • Form fill │
    │ • Screenshot│                      │ • Auth flow │
    │ • Click     │                      │ • Conditionals│
    │ • Fill      │                      │ • Scraping  │
    └─────────────┘                      └─────────────┘
           │                                     │
           ▼                                     ▼
    ┌─────────────┐                      ┌─────────────┐
    │ USE CLI     │                      │ USE WORKFLOW│
    │ Browse.ts   │                      │ or API      │
    └─────────────┘                      └─────────────┘
```

---

## VERIFY Phase Integration

**The Browser skill is MANDATORY for VERIFY phase of web changes.**

Before claiming ANY web change is "live" or "working":

```bash
# 1. Navigate with full diagnostics
bun run Browse.ts https://example.com/changed-page

# 2. View the screenshot
Read /tmp/browse-*.png
```

**If you haven't LOOKED at the rendered page and its diagnostics, you CANNOT claim it works.**

---

## Debugging Workflow Example

**Scenario:** "Why isn't the user list loading?"

```bash
# Step 1: Load the page with diagnostics
$ bun run Browse.ts https://myapp.com/users

📸 Screenshot: /tmp/browse-1704567890.png

🔴 Console Errors (1):
   • Uncaught TypeError: Cannot read property 'map' of undefined

🌐 Failed Requests (1):
   • GET /api/users → 500 Internal Server Error

📊 Network: 23 requests | 847KB | avg 156ms
⚠️ Page: "User List" loaded with issues
```

**Immediately identified:**
1. API returning 500 error
2. Frontend crashing because no data
3. Specific error location

```bash
# Step 2: Dig deeper
$ bun run Browse.ts console    # Full console output
$ bun run Browse.ts network    # All network activity
$ bun run Browse.ts failed     # Just the failures
```

---

## Server Endpoints (for advanced use)

The persistent session runs an HTTP server on port 9222:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/diagnostics` | GET | Full diagnostic summary |
| `/console` | GET | Console logs |
| `/network` | GET | Network activity |
| `/navigate` | POST | Navigate to URL |
| `/click` | POST | Click element |
| `/fill` | POST | Fill input |
| `/screenshot` | POST | Take screenshot |
| `/stop` | POST | Stop server |

---

## Workflow Routing

For complex, multi-step tasks:

| Trigger | Workflow |
|---------|----------|
| Fill forms, interact with page | `Workflows/Interact.md` |
| Extract page content | `Workflows/Extract.md` |
| Complex verification sequence | `Workflows/VerifyPage.md` |
| Screenshot with custom options | `Workflows/Screenshot.md` |

---

## TypeScript API (Advanced)

**Only use this for custom automation that CLI cannot handle.**

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/src/index.ts'

const browser = new PlaywrightBrowser()
await browser.launch({ headless: true })
await browser.navigate('https://example.com')
// ... custom logic ...
await browser.close()
```

### API Reference

**Navigation:** `launch()`, `navigate()`, `goBack()`, `goForward()`, `reload()`, `close()`

**Capture:** `screenshot()`, `getVisibleText()`, `getVisibleHtml()`, `savePdf()`, `getAccessibilityTree()`

**Interaction:** `click()`, `fill()`, `type()`, `select()`, `pressKey()`, `hover()`, `drag()`, `uploadFile()`

**Monitoring:** `getConsoleLogs()`, `getNetworkLogs()`, `getNetworkStats()`, `clearNetworkLogs()`

**Waiting:** `waitForSelector()`, `waitForText()`, `waitForNavigation()`, `waitForNetworkIdle()`, `wait()`

**Viewport:** `resize()`, `setDevice()`

---

## Token Savings

| Approach | Tokens | Notes |
|----------|--------|-------|
| Playwright MCP | ~13,700 | Loaded at startup |
| CLI tool | ~0 | Executes pre-written code |
| TypeScript API | ~50-200 | Only what you write |
| **CLI Savings** | **99%+** | Compared to MCP |
