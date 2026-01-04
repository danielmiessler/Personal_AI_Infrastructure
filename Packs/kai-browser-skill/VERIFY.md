# Kai Browser Skill - Verification

**This verification guide is for AI agents to confirm successful installation.**

---

## 🚨 MANDATORY COMPLETION CHECKLIST

**AI Agents: You MUST verify ALL items below pass before reporting installation success.**

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | Directory exists | `ls -la $PAI_DIR/skills/Browser/` | Directory with files shown | ⬜ |
| 2 | Core files present | `ls $PAI_DIR/skills/Browser/{index.ts,SKILL.md,package.json}` | All 3 files exist | ⬜ |
| 3 | Dependencies installed | `cd $PAI_DIR/skills/Browser && bun pm ls \| grep playwright` | playwright listed | ⬜ |
| 4 | Playwright browsers | `bunx playwright install chromium --dry-run 2>&1 \| head -5` | Shows chromium installed OR installs it | ⬜ |
| 5 | API import works | `cd $PAI_DIR/skills/Browser && bun -e "import './index.ts'"` | No error | ⬜ |
| 6 | Page load test | `bun $PAI_DIR/skills/Browser/examples/verify-page.ts https://example.com` | Shows "Page loaded" | ⬜ |
| 7 | Screenshot test | `bun $PAI_DIR/skills/Browser/examples/screenshot.ts https://example.com /tmp/browser-verify.png && ls -la /tmp/browser-verify.png` | File size > 0 | ⬜ |
| 8 | CLI tool works | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts 2>&1 \| head -5` | Shows usage/help | ⬜ |

**Completion Requirements:**
- ALL 8 checks must show ✅
- If ANY check fails, troubleshoot before proceeding
- Report exact error messages for failed checks
- DO NOT report success until all checks pass

**After all checks pass, mark installation complete:**
```
✅ INSTALLATION VERIFIED: All 8 checks passed
   - Browser skill installed at $PAI_DIR/skills/Browser/
   - Playwright chromium browser ready
   - API, examples, and CLI all functional
```

---

## Quick Verification

Run these commands to verify the Browser skill is working:

### 1. Check Dependencies

```bash
cd $PAI_DIR/skills/Browser
bun install --dry-run
```

Expected: Shows playwright as installed

### 2. Verify Page Load

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

### 3. Take Screenshot

```bash
bun $PAI_DIR/skills/Browser/examples/screenshot.ts https://example.com /tmp/browser-test.png
ls -la /tmp/browser-test.png
```

Expected: File exists, size > 0

### 4. Test CLI Tool

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts
```

Expected: Shows help text with available commands

### 5. CLI Screenshot

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot https://example.com /tmp/cli-test.png
ls -la /tmp/cli-test.png
```

Expected: File exists, size > 0

---

## Verification Checklist

| Test | Command | Expected |
|------|---------|----------|
| Dependencies | `cd $PAI_DIR/skills/Browser && bun pm ls` | Shows playwright |
| Page load | `bun examples/verify-page.ts https://example.com` | "Page loaded" |
| Screenshot | `bun examples/screenshot.ts https://example.com /tmp/test.png` | File created |
| CLI help | `bun run Tools/Browse.ts` | Shows usage |
| CLI screenshot | `bun run Tools/Browse.ts screenshot https://example.com /tmp/cli.png` | File created |

---

## Common Issues

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

The page may need time to load:
```typescript
await browser.waitForNetworkIdle()
await browser.screenshot({ path: 'shot.png' })
```

---

## Full Test Script

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/index.ts'

async function verifyBrowserSkill() {
  console.log('Testing Browser skill...')

  const browser = new PlaywrightBrowser()

  // Test 1: Launch
  console.log('1. Launching browser...')
  await browser.launch({ headless: true })
  console.log('   OK')

  // Test 2: Navigate
  console.log('2. Navigating to example.com...')
  await browser.navigate('https://example.com')
  console.log('   OK')

  // Test 3: Get title
  console.log('3. Getting page title...')
  const title = await browser.getTitle()
  console.log(`   Title: ${title}`)

  // Test 4: Screenshot
  console.log('4. Taking screenshot...')
  await browser.screenshot({ path: '/tmp/verify-test.png' })
  console.log('   OK')

  // Test 5: Close
  console.log('5. Closing browser...')
  await browser.close()
  console.log('   OK')

  console.log('\nAll tests passed!')
}

verifyBrowserSkill()
```
