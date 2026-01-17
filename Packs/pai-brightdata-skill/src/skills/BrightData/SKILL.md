---
name: BrightData
version: 2.3.0
description: Progressive URL scraping with four-tier fallback - WebFetch, Curl, Browser Automation, Bright Data MCP. USE WHEN scrape URL, fetch URL, web scraping, bot detection, can't access site.
---

# BrightData - Progressive URL Scraping

**Intelligent URL content retrieval with automatic fallback strategy.**

---

## Activation Triggers

### Direct Scraping Requests
- "scrape this URL", "scrape [URL]", "scrape this page"
- "fetch this URL", "fetch [URL]", "fetch this page"
- "pull content from [URL]", "get content from [URL]"
- "retrieve [URL]", "download this page content"

### Access Issues
- "can't access this site", "site is blocking me"
- "bot detection", "CAPTCHA", "403 error"
- "this URL won't load"

### Explicit Tier Requests
- "use Bright Data to fetch [URL]" - Skip to Tier 4
- "use browser to scrape [URL]" - Skip to Tier 3

---

## Core Capability

**Four-Tier Progressive Escalation:**

```
START
  |
Tier 1 (WebFetch) --> Success? --> Return content
  |
  No
  |
Tier 2 (Curl) --> Success? --> Return content
  |
  No
  |
Tier 3 (Browser) --> Success? --> Return content
  |
  No
  |
Tier 4 (Bright Data) --> Success? --> Return content
  |
  No
  |
Report failure + alternatives
```

---

## Tier Details

### Tier 1: WebFetch (Built-in)
- **Tool:** Claude Code's WebFetch
- **Speed:** ~2-5 seconds
- **Cost:** Free
- **Works for:** Public sites, no bot detection

### Tier 2: Curl with Chrome Headers
- **Tool:** Bash curl with comprehensive browser headers
- **Speed:** ~3-7 seconds
- **Cost:** Free
- **Works for:** Sites with basic user-agent filtering

### Tier 3: Browser Automation (Playwright)
- **Tool:** Browser skill's Playwright automation
- **Speed:** ~10-20 seconds
- **Cost:** Free
- **Works for:** JavaScript SPAs, dynamic content

### Tier 4: Bright Data MCP
- **Tool:** `mcp__Brightdata__scrape_as_markdown`
- **Speed:** ~5-15 seconds
- **Cost:** Bright Data credits
- **Works for:** CAPTCHA, advanced bot detection, residential IPs

---

## Workflow Routing

**Default workflow for all URL scraping:**
- **Route to:** `Workflows/FourTierScrape.md`
- **Output:** URL content in markdown format

---

## Examples

### Example 1: Simple Site (Tier 1 Success)

**User:** "Scrape https://example.com"

**Process:**
1. Attempt Tier 1 (WebFetch)
2. Success in 3 seconds
3. Return markdown content

### Example 2: JavaScript Site (Tier 3 Success)

**User:** "Fetch https://spa-app.com"

**Process:**
1. Tier 1 fails (blocked)
2. Tier 2 fails (JavaScript required)
3. Tier 3 succeeds with Playwright
4. Return markdown content

### Example 3: Protected Site (Tier 4 Success)

**User:** "Can't access https://protected-site.com"

**Process:**
1. Tier 1 fails (403)
2. Tier 2 fails (bot detection)
3. Tier 3 fails (CAPTCHA)
4. Tier 4 succeeds with Bright Data
5. Return markdown content

### Example 4: Direct Tier Request

**User:** "Use Bright Data to fetch https://any-site.com"

**Process:**
1. User explicitly requested Bright Data
2. Skip directly to Tier 4
3. Return markdown content

---

## Integration Points

- **WebFetch Tool** - Built-in Claude Code tool
- **Bash Tool** - For curl commands
- **Browser Skill** - For Playwright automation (requires pai-browser-skill)
- **Bright Data MCP** - For professional scraping

---

## Related Documentation

- `Workflows/FourTierScrape.md` - Complete workflow implementation
- `INSTALL.md` - Installation guide
- `VERIFY.md` - Verification checklist

**Last Updated:** 2026-01-14
