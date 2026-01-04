# Kai Browser Skill

**Code-first browser automation for Claude Code with 99% token savings.**

## What It Does

The Browser skill replaces the Playwright MCP with direct code execution:

- **Navigate** to URLs
- **Screenshot** pages (full page or element)
- **Interact** with forms, buttons, dropdowns
- **Verify** page content and elements
- **Extract** text and HTML

## Why File-Based?

| Approach | Tokens | When Loaded |
|----------|--------|-------------|
| Playwright MCP | ~13,700 | At startup (always) |
| Browser Skill | ~50-200 | Per operation (on demand) |

**Result:** 99%+ token savings

## Quick Start

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/index.ts'

const browser = new PlaywrightBrowser()
await browser.launch()
await browser.navigate('https://example.com')
await browser.screenshot({ path: 'screenshot.png' })
await browser.close()
```

## CLI Tool

```bash
# Open URL in visible browser
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open https://example.com

# Take screenshot
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/shot.png

# Verify element exists
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify https://example.com "h1"
```

## API Methods

### Navigation
- `launch()` / `close()`
- `navigate(url)`
- `goBack()` / `goForward()` / `reload()`

### Capture
- `screenshot(options?)`
- `getVisibleText(selector?)`
- `getVisibleHtml(options?)`
- `savePdf(path)`

### Interaction
- `click(selector)`
- `fill(selector, value)`
- `type(selector, text)`
- `select(selector, value)`
- `pressKey(key)`

### Waiting
- `waitForSelector(selector)`
- `waitForNavigation()`
- `waitForNetworkIdle()`
- `wait(ms)`

## Installation

See `INSTALL.md` for step-by-step instructions.

## Verification

See `VERIFY.md` for verification steps.
