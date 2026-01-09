---
name: JAI Publishing Core
pack-id: jai-publishing-core-v1.0.0
version: 1.0.0
author: Joey Barkley
description: Core infrastructure for affiliate website publishing - content calendar, keyword queue, SEO analysis, and Amazon PA-API integration
type: system
purpose-type: [automation, productivity, content]
platform: claude-code
dependencies: []
keywords: [publishing, affiliate, seo, keywords, content-calendar, amazon, articles]
---

# JAI Publishing Core

> Core infrastructure tools for automated affiliate website publishing

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../../README.md)

**What is a Pack?** See: [Pack System](../../PACKS.md)

This pack provides the foundational tools for managing affiliate website content:
- **Content Calendar** - Schedule and track article publishing
- **Keyword Queue** - Manage keywords for article generation with priority scoring
- **SEO Checker** - Analyze content for SEO best practices
- **Schemas** - JSON schemas for data validation

This is a **system pack** (no SKILL.md) - it provides infrastructure used by `jai-publishing-skill`.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Calendar | `Tools/Calendar.ts` | Content calendar CRUD with multi-site support |
| KeywordQueue | `Tools/KeywordQueue.ts` | Keyword management with priority scoring |
| SeoChecker | `Tools/SeoChecker.ts` | SEO analysis for Markdown and Astro files |
| Types | `Tools/types.ts` | Shared TypeScript type definitions |

**Schemas:**
- `schemas/keywords.schema.json` - Keyword queue validation
- `schemas/calendar.schema.json` - Content calendar validation
- `schemas/products.schema.json` - Amazon product data validation

**Summary:**
- **Tools created:** 3 CLI tools + types
- **Schemas included:** 3
- **Dependencies:** Bun runtime

---

## The Problem

Managing multiple affiliate websites requires:
- Tracking scheduled content across sites
- Prioritizing keywords based on search trends and competition
- Ensuring SEO quality before publishing
- Coordinating between keyword discovery and article generation

Manual approaches don't scale and miss optimization opportunities.

## The Solution

CLI-first tools that integrate with `claude -p` for automation:

```bash
# Manage content calendar
bun run Tools/Calendar.ts list --site=pispy --month=2026-01

# Queue keywords with priority
bun run Tools/KeywordQueue.ts add "best spy cameras 2026" --topic="Review guide" --site=pispy

# Check SEO before publishing
bun run Tools/SeoChecker.ts article.astro
```

**Benefits:**
- Multi-site support with single toolset
- Priority-based keyword queue for optimal content planning
- Astro + Markdown SEO analysis
- JSON schema validation for data integrity
- Integrates with `jai-publishing-skill` workflows

---

## Configuration

### Site Paths

Tools operate on site directories containing `keywords.json` and `content-calendar.json`:

```bash
~/sites/pispycameras.com/
├── keywords.json          # Keyword queue
├── content-calendar.json  # Publishing schedule
└── src/pages/articles/    # Generated articles
```

### No External Dependencies

All tools are self-contained TypeScript using:
- Bun runtime
- Built-in fs/path modules
- No external API keys required for core tools

---

## Quick Start

1. **Install dependencies:**
   ```bash
   cd /path/to/jai-publishing-core
   bun install
   ```

2. **Initialize calendar for a site:**
   ```bash
   cd ~/sites/pispycameras.com
   bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts init --site=pispy
   ```

3. **Add keywords to queue:**
   ```bash
   bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts add \
     "hidden cameras for home security" \
     --topic="Complete buyer's guide for home security cameras" \
     --site=pispy
   ```

4. **Check SEO on existing content:**
   ```bash
   bun run ~/PAI/packs/jai-publishing-core/Tools/SeoChecker.ts \
     src/pages/articles/best-spy-cameras.astro
   ```

---

## Tool Reference

### Calendar.ts

```bash
# Initialize calendar
bun run Tools/Calendar.ts init --site=SITE

# List entries
bun run Tools/Calendar.ts list [--site=SITE] [--month=YYYY-MM] [--status=STATUS]

# Add entry
bun run Tools/Calendar.ts add "Title" --site=SITE --date=YYYY-MM-DD [--keyword-id=ID]

# Update status
bun run Tools/Calendar.ts update ID --status=draft|scheduled|published|failed

# Delete entry
bun run Tools/Calendar.ts delete ID
```

### KeywordQueue.ts

```bash
# List queue
bun run Tools/KeywordQueue.ts list [--status=STATUS] [--limit=N]

# Add keyword
bun run Tools/KeywordQueue.ts add "keyword1, keyword2" --topic="Topic" --site=SITE [--priority=N]

# Get next keyword
bun run Tools/KeywordQueue.ts next

# Claim for processing
bun run Tools/KeywordQueue.ts claim

# Mark complete/failed
bun run Tools/KeywordQueue.ts complete ID
bun run Tools/KeywordQueue.ts update ID --status=failed

# View statistics
bun run Tools/KeywordQueue.ts stats
```

### SeoChecker.ts

```bash
# Check single file
bun run Tools/SeoChecker.ts FILE.astro [--json]

# Check all files in directory
bun run Tools/SeoChecker.ts --all [--dir=content/]
```

---

## Related Packs

- **jai-publishing-skill** - Skill pack with workflows that use these tools
- **mai-gitlab-skill** - GitLab integration for CI/CD pipelines

---

## Credits

- **Migrated from:** PAIv1 ContentPublishing skill
- **Enhanced with:** Multi-site support, Astro parsing, keyword queue system

---

## Changelog

### 1.0.0 - 2026-01-09
- Initial release as PAI pack
- Migrated ContentCalendar.ts with multi-site support
- Migrated SeoChecker.ts with Astro file support
- New KeywordQueue.ts with priority scoring
- JSON schemas for data validation
