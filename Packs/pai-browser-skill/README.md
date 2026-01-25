---
name: PAI Browser Skill
pack-id: danielmiessler-pai-browser-skill-v2.3.1
version: 2.3.1
author: danielmiessler
description: Debug-first browser automation with always-on visibility - console logs, network requests, and errors captured by default
type: skill
purpose-type: [browser-automation, testing, debugging, screenshots]
platform: claude-code
dependencies: [pai-core-install, bun, playwright]
keywords: [browser, playwright, automation, debugging, screenshots, web-testing]
---

# PAI Browser Skill Pack

Debug-first browser automation with always-on visibility. Console logs, network requests, and errors are captured by default - no opt-in required.

## What's Included

```
src/skills/Browser/
  SKILL.md           # Main skill definition
  README.md          # Code-first interface documentation
  index.ts           # PlaywrightBrowser class
  package.json       # Dependencies
  tsconfig.json      # TypeScript configuration
  Tools/
    Browse.ts        # CLI tool for browser automation
    BrowserSession.ts # Persistent session server
  Workflows/
    Extract.md       # Extract content from web pages
    Interact.md      # Form filling and clicks
    Screenshot.md    # Screenshot capture
    Update.md        # Sync with Playwright MCP
    VerifyPage.md    # Page load verification
  examples/
    screenshot.ts    # Screenshot example
    verify-page.ts   # Page verification example
    comprehensive-test.ts # Full API test suite
```

## Key Features

### Debug-First Philosophy

Debugging visibility by DEFAULT. Like good logging frameworks - you don't turn on logging when you have a problem, you have it enabled from the start so the data exists when problems occur.

### Token Savings

| Approach | Tokens | Performance |
|----------|--------|-------------|
| Playwright MCP | ~13,700 at load | MCP protocol overhead |
| Code-first | ~50-200 per op | Direct Playwright API |
| **Savings** | **99%+** | Faster execution |

### Session Auto-Start

Session auto-starts on first use. No explicit `session start` needed.

### Always-On Capture

From the moment the browser launches:
- **Console logs** - All `console.log`, `console.error`, etc.
- **Network requests** - Every request with headers, timing, size
- **Network responses** - Status codes, response times, sizes
- **Page errors** - Uncaught exceptions, promise rejections

## Quick Start

```bash
# Navigate with full diagnostics (PRIMARY COMMAND)
bun run ~/.claude/skills/Browser/Tools/Browse.ts https://example.com

# Output:
# Screenshot: /tmp/browse-1704614400.png
# Console Errors (2): ...
# Failed Requests (1): ...
# Network: 34 requests | 1.2MB | avg 120ms
# Page: "Example" loaded successfully
```

## Usage Examples

### Basic Screenshot

```typescript
import { PlaywrightBrowser } from '~/.claude/skills/Browser/index.ts'

const browser = new PlaywrightBrowser()
await browser.launch()
await browser.navigate('https://example.com')
await browser.screenshot({ path: 'screenshot.png' })
await browser.close()
```

### Debugging Workflow

```bash
# Load the page
bun run Browse.ts https://myapp.com/users

# Check console errors
bun run Browse.ts errors

# Check failed requests
bun run Browse.ts failed

# View network activity
bun run Browse.ts network
```

### Form Interaction

```typescript
await browser.navigate('https://example.com/login')
await browser.fill('#email', 'test@example.com')
await browser.fill('#password', 'secret')
await browser.click('button[type="submit"]')
await browser.waitForNavigation()
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `<url>` | Navigate with full diagnostics |
| `errors` | Show console errors |
| `warnings` | Show console warnings |
| `console` | Show all console output |
| `network` | Show network activity |
| `failed` | Show failed requests |
| `screenshot [path]` | Take screenshot |
| `click <selector>` | Click element |
| `fill <sel> <val>` | Fill input |
| `status` | Session info |
| `restart` | Fresh session |

## Requirements

- Bun runtime
- Playwright (`bun add playwright`)

## Related Documentation

- [Browser Automation](~/.claude/skills/CORE/SYSTEM/BROWSERAUTOMATION.md)
- [Playwright Docs](https://playwright.dev)
