---
name: PAI BrightData Skill
pack-id: danielmiessler-brightdata-skill-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: Progressive URL scraping with four-tier fallback strategy - WebFetch, Curl, Browser Automation, Bright Data MCP
type: skill
purpose-type: [web-scraping, data-extraction, content-retrieval, automation]
platform: claude-code
dependencies: []
keywords: [brightdata, scraping, web-scraping, url-fetch, content-extraction, bot-detection, captcha, proxy, four-tier, progressive-escalation]
---

<p align="center">
  <img src="icons/pai-brightdata-skill.png" alt="PAI BrightData Skill" width="256">
</p>

# BrightData Skill v2.3.0

**Progressive URL scraping with four-tier fallback strategy.**

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What It Does

The BrightData skill provides intelligent URL content retrieval with automatic fallback:

- **Tier 1: WebFetch** - Fast, simple, built-in Claude Code tool
- **Tier 2: Curl** - Chrome-like browser headers to bypass basic bot detection
- **Tier 3: Browser Automation** - Full Playwright browser for JavaScript-heavy sites
- **Tier 4: Bright Data MCP** - Professional scraping service with CAPTCHA solving

## Why Progressive Escalation?

Most URLs work with simple tools. But when they don't, you need fallbacks.

**Traditional approach:** Try one method, fail, manually try another, repeat.

**Progressive approach:** **Start simple, escalate automatically.** Each tier handles failures the previous tier can't.

## Quick Start

Just ask to scrape a URL:

```
Scrape https://example.com
```

The skill automatically:
1. Attempts WebFetch (fastest)
2. Falls back to Curl with Chrome headers if blocked
3. Falls back to Browser Automation if JavaScript required
4. Falls back to Bright Data MCP if CAPTCHA detected
5. Returns content in markdown format

## When Each Tier Succeeds

| Tier | Tool | Best For |
|------|------|----------|
| 1 | WebFetch | Public sites, no bot detection |
| 2 | Curl | Sites with basic user-agent checking |
| 3 | Browser | JavaScript SPAs, dynamic content |
| 4 | Bright Data | CAPTCHA, advanced bot detection, residential IPs |

## Performance

| Tier | Time | Cost |
|------|------|------|
| 1 (WebFetch) | ~2-5s | Free |
| 2 (Curl) | ~3-7s | Free |
| 3 (Browser) | ~10-20s | Free |
| 4 (Bright Data) | ~5-15s | Bright Data credits |

**Worst case:** ~40 seconds for all four attempts

## Explicit Tier Requests

Skip to a specific tier:

```
Use Bright Data to fetch https://example.com
```

This bypasses lower tiers and goes directly to Tier 4.

## Installation

See `INSTALL.md` for step-by-step instructions.

## Verification

See `VERIFY.md` for verification steps.

---

## Changelog

### v2.3.0 (January 2026)
- **NEW:** Four-tier progressive escalation strategy
- **NEW:** Browser automation tier for JavaScript-heavy sites
- **NEW:** Comprehensive header profiles for curl bypass
- **CHANGED:** Renamed from three-tier to four-tier
- **CHANGED:** PAI v2.3 pack format compliance

### v1.0.0
- Initial release with three-tier strategy (WebFetch, Curl, Bright Data)
