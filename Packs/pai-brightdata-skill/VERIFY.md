# BrightData Skill v2.3.0 - Verification

**This verification guide is for AI agents to confirm successful installation.**

---

## MANDATORY COMPLETION CHECKLIST

**AI Agents: You MUST verify ALL items below pass before reporting installation success.**

### Core Installation (Checks 1-5)

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 1 | Directory exists | `ls -la $PAI_DIR/skills/BrightData/` | Directory with files shown | |
| 2 | SKILL.md present | `cat $PAI_DIR/skills/BrightData/SKILL.md \| head -5` | Shows frontmatter with name: BrightData | |
| 3 | Workflow directory | `ls $PAI_DIR/skills/BrightData/Workflows/` | Shows FourTierScrape.md | |
| 4 | Workflow content | `cat $PAI_DIR/skills/BrightData/Workflows/FourTierScrape.md \| head -10` | Shows workflow header | |
| 5 | Version correct | `grep "version:" $PAI_DIR/skills/BrightData/SKILL.md` | Shows 2.3.0 | |

### Tier 1 Verification (Checks 6-7)

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 6 | WebFetch available | N/A (built-in tool) | WebFetch tool exists in Claude Code | |
| 7 | WebFetch works | `Use WebFetch on https://example.com` | Returns page content | |

### Tier 2 Verification (Checks 8-9)

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 8 | Curl available | `which curl` | Returns path to curl | |
| 9 | Curl with headers | See curl command below | Returns HTML content | |

**Tier 2 test command:**
```bash
curl -s -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: text/html" \
  "https://example.com" | head -20
```

### Tier 3 Verification (Checks 10-11) - OPTIONAL

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 10 | Browser skill installed | `ls $PAI_DIR/skills/Browser/SKILL.md` | File exists | |
| 11 | Browser works | `bun run $PAI_DIR/skills/Browser/Tools/Browse.ts https://example.com` | Returns screenshot + diagnostics | |

**Note:** Tier 3 checks are OPTIONAL. Skip if Browser skill is not installed.

### Tier 4 Verification (Checks 12-13) - OPTIONAL

| # | Check | Command | Pass Criteria | Status |
|---|-------|---------|---------------|--------|
| 12 | Bright Data MCP configured | Check claude_desktop_config.json | brightdata server present | |
| 13 | Bright Data works | `mcp__Brightdata__scrape_as_markdown` | Returns content | |

**Note:** Tier 4 checks are OPTIONAL. Skip if Bright Data MCP is not configured.

---

## Completion Requirements

**Minimum for success:**
- Checks 1-9 must ALL pass
- Checks 10-13 are optional based on user's tier configuration

**Report format:**

```
INSTALLATION VERIFIED: [X/Y] checks passed
   - BrightData skill v2.3.0 installed at $PAI_DIR/skills/BrightData/
   - Tier 1 (WebFetch): Ready
   - Tier 2 (Curl): Ready
   - Tier 3 (Browser): [Ready / Not configured]
   - Tier 4 (Bright Data): [Ready / Not configured]
```

---

## Quick Verification

### 1. Check Installation

```bash
ls -la $PAI_DIR/skills/BrightData/
```

Expected: Directory with SKILL.md, README.md, Workflows/

### 2. Test Tier 1 (WebFetch)

Ask Claude:
```
Use WebFetch to get content from https://example.com
```

Expected: Returns page content as markdown

### 3. Test Tier 2 (Curl)

```bash
curl -s -L -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8" \
  -H "Accept-Language: en-US,en;q=0.9" \
  "https://example.com" | head -30
```

Expected: Returns HTML content

### 4. Test Full Workflow

Ask Claude:
```
Scrape https://example.com using the BrightData skill
```

Expected: Returns content with tier information

---

## Common Issues

### "Skill not found"

Verify skill directory:
```bash
ls $PAI_DIR/skills/BrightData/
```

### "Tier 3 failing"

Install Browser skill:
```bash
# Install pai-browser-skill pack
```

### "Tier 4 failing"

Configure Bright Data MCP in claude_desktop_config.json

---

## Full Test Sequence

1. **Tier 1:** Use WebFetch on https://example.com
2. **Tier 2:** Run curl command above
3. **Tier 3 (if available):** Use Browser skill on a JavaScript site
4. **Tier 4 (if available):** Use Bright Data MCP on a protected site
5. **Full workflow:** Ask to scrape a URL and verify automatic tier selection

**All tiers should return content in markdown format.**
