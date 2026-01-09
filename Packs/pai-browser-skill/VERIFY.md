# Browser Skill v1.2.0 - Verification

**This verification guide is for AI agents to confirm successful installation.**

---

## MANDATORY COMPLETION CHECKLIST

**AI Agents: You MUST verify ALL items below pass before reporting installation success.**

### Core Installation (Checks 1-8)

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | Directory exists | `ls -la $PAI_DIR/skills/Browser/` | Directory with files shown | |
| 2 | Core files present | `ls $PAI_DIR/skills/Browser/{src/index.ts,SKILL.md,package.json}` | All 3 files exist | |
| 3 | Tools present | `ls $PAI_DIR/skills/Browser/Tools/{Browse.ts,BrowserSession.ts}` | Both tools exist | |
| 4 | Dependencies installed | `cd $PAI_DIR/skills/Browser && bun pm ls \| grep playwright` | playwright listed | |
| 5 | Playwright browsers | `bunx playwright install chromium --dry-run 2>&1 \| head -5` | Shows chromium installed OR installs it | |
| 6 | API import works | `cd $PAI_DIR/skills/Browser && bun -e "import './src/index.ts'"` | No error | |
| 7 | CLI help works | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts --help 2>&1 \| head -10` | Shows v1.2.0 usage | |
| 8 | Examples exist | `ls $PAI_DIR/skills/Browser/examples/*.ts` | At least 2 example files | |

### Session Management (Checks 9-15)

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 9 | Session auto-start | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts https://example.com 2>&1` | Shows diagnostics output | |
| 10 | Screenshot created | `ls /tmp/browse-*.png 2>/dev/null \| head -1` | File exists | |
| 11 | Session status | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts status` | Shows session info | |
| 12 | Health endpoint | `curl -s http://localhost:9222/health 2>/dev/null \| head -1` | Returns JSON with status:ok | |
| 13 | Console command | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts console` | Shows console output or "No console output" | |
| 14 | Network command | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts network` | Shows network or "No network activity" | |
| 15 | Session stop | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts stop` | Shows "Session stopped" | |

**Completion Requirements:**
- ALL 15 checks must pass
- If ANY check fails, troubleshoot before proceeding
- Report exact error messages for failed checks
- DO NOT report success until all checks pass

**After all checks pass, mark installation complete:**
```
INSTALLATION VERIFIED: All 15 checks passed
   - Browser skill v1.2.0 installed at $PAI_DIR/skills/Browser/
   - Playwright chromium browser ready
   - Session auto-start working
   - Diagnostic endpoints functional
   - API, examples, and CLI all operational
```

---

## Quick Verification

Run these commands to verify the Browser skill is working:

### 1. Check Version

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts --help | head -3
```

Expected: Shows "Browse CLI v1.2.0"

### 2. Test Debug-First Navigation

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts https://example.com
```

Expected output:
```
📸 Screenshot: /tmp/browse-TIMESTAMP.png

📊 Network: X requests | Y KB | avg Zms
✅ Page: "Example Domain" loaded successfully
```

### 3. Verify Session Running

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts status
```

Expected:
```
Browser Session:
  ID: xxxxxxxx
  Port: 9222
  URL: https://example.com
  ...
```

### 4. Test Diagnostic Commands

```bash
# Console output
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts console

# Network activity
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts network

# Failed requests
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts failed
```

### 5. Stop Session

```bash
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts stop
```

Expected: "Session stopped"

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

### Session won't start

Check if port 9222 is already in use:
```bash
lsof -i :9222
```

Kill the process if needed:
```bash
kill $(lsof -t -i :9222)
```

### Session state file issue

Clean up orphan state:
```bash
rm /tmp/browser-session.json
```

---

## Full Test Script

```typescript
import { PlaywrightBrowser } from '$PAI_DIR/skills/Browser/src/index.ts'

async function verifyBrowserSkill() {
  console.log('Testing Browser skill v1.2.0...')

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

  // Test 4: Console logs
  console.log('4. Getting console logs...')
  const logs = browser.getConsoleLogs()
  console.log(`   Log entries: ${logs.length}`)

  // Test 5: Network stats
  console.log('5. Getting network stats...')
  const stats = browser.getNetworkStats()
  console.log(`   Requests: ${stats.totalRequests}`)

  // Test 6: Screenshot
  console.log('6. Taking screenshot...')
  await browser.screenshot({ path: '/tmp/verify-test.png' })
  console.log('   OK')

  // Test 7: Close
  console.log('7. Closing browser...')
  await browser.close()
  console.log('   OK')

  console.log('\nAll tests passed!')
}

verifyBrowserSkill()
```
