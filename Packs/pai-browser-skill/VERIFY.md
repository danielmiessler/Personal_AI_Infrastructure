---
name: pai-browser-skill-verify
version: 2.3.0
---

# Verification Guide

Verify your Browser skill installation is working correctly.

## Quick Verification

### 1. Check Files Exist

```bash
ls ~/.claude/skills/Browser/
# Should show: SKILL.md README.md index.ts package.json Tools/ Workflows/ examples/
```

### 2. Check Dependencies

```bash
ls ~/.claude/skills/Browser/node_modules/playwright
# Should show playwright package files
```

### 3. Run Basic Test

```bash
bun run ~/.claude/skills/Browser/examples/screenshot.ts https://example.com
```

**Expected Output:**
```
=== Playwright Screenshot ===

1. Launching browser...
2. Navigating to https://example.com...
3. Taking screenshot (fullPage: false)...

Screenshot saved: screenshot.png

Token savings: 98.9%
   MCP approach: ~13700 tokens
   Code approach: ~150 tokens
```

## Comprehensive Verification

### Run Full Test Suite

```bash
bun run ~/.claude/skills/Browser/examples/comprehensive-test.ts
```

**Expected Output:**
```
=== Playwright FileMCP Comprehensive Test ===

--- LIFECYCLE ---
PASS launch()

--- NAVIGATION ---
PASS navigate()
PASS getUrl()
PASS getTitle()
...

==================================================
TEST SUMMARY
==================================================

Passed:  35+
Failed:  0
Skipped: 5-7
Total:   40+
```

### Verify CLI Tool

```bash
# Test Browse CLI
bun run ~/.claude/skills/Browser/Tools/Browse.ts --help
```

**Expected Output:**
```
Browse CLI v2.0.0 - Debug-First Browser Automation

Usage:
  bun run Browse.ts <url>                    Navigate with full diagnostics
  bun run Browse.ts errors                   Show console errors
  ...
```

### Verify Page Load

```bash
bun run ~/.claude/skills/Browser/examples/verify-page.ts https://example.com
```

**Expected Output:**
```
=== Page Verification ===

1. Launching browser...
2. Navigating to https://example.com...
   Page loaded in XXms

3. Page title: "Example Domain"

No console errors

=== Verification Complete ===
```

## Feature Verification Checklist

| Feature | Test Command | Expected Result |
|---------|--------------|-----------------|
| Screenshot | `bun examples/screenshot.ts https://example.com` | Creates screenshot.png |
| Page Verify | `bun examples/verify-page.ts https://example.com` | Shows page title, no errors |
| Full Suite | `bun examples/comprehensive-test.ts` | 35+ tests pass |
| CLI Help | `bun Tools/Browse.ts --help` | Shows usage info |
| Session | `bun Tools/Browse.ts status` | Shows session info or "No session" |

## Verification by Capability

### Navigation

```bash
cd ~/.claude/skills/Browser
bun -e "
import { PlaywrightBrowser } from './index.ts'
const b = new PlaywrightBrowser()
await b.launch({ headless: true })
await b.navigate('https://example.com')
console.log('Title:', await b.getTitle())
await b.close()
"
```

### Console Capture

```bash
bun -e "
import { PlaywrightBrowser } from './index.ts'
const b = new PlaywrightBrowser()
await b.launch({ headless: true })
await b.navigate('https://example.com')
await b.evaluate(() => console.log('Test log'))
console.log('Logs:', b.getConsoleLogs().length)
await b.close()
"
```

### Network Capture

```bash
bun -e "
import { PlaywrightBrowser } from './index.ts'
const b = new PlaywrightBrowser()
await b.launch({ headless: true })
await b.navigate('https://example.com')
console.log('Requests:', b.getNetworkStats().totalRequests)
await b.close()
"
```

## Troubleshooting Failed Verification

### If Screenshot Test Fails

1. Check Playwright installation:
   ```bash
   bunx playwright install chromium
   ```

2. Check permissions (macOS):
   ```bash
   xattr -cr ~/.cache/ms-playwright/
   ```

### If Tests Time Out

1. Increase timeout in test
2. Check network connectivity
3. Try a different URL

### If Session Won't Start

```bash
# Clear stale state
rm /tmp/browser-session.json

# Kill any orphan processes
pkill -f BrowserSession.ts
```

## Success Criteria

Installation is verified when:

1. `bun examples/screenshot.ts` creates a valid PNG
2. `bun examples/comprehensive-test.ts` passes 35+ tests
3. CLI tool responds to commands
4. No permission or dependency errors
