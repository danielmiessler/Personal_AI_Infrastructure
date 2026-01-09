---
name: JAI Publishing Skill
pack-id: jai-publishing-skill-v1.0.0
version: 1.0.0
author: Joey Barkley
description: AI-invoked skill for affiliate website publishing - site reviews, keyword research, article generation, and scheduled publishing
type: skill
purpose-type: [automation, productivity, content, creativity]
platform: claude-code
dependencies: [jai-publishing-core]
keywords: [publishing, affiliate, articles, keywords, seo, content, automation, astro, cloudflare]
---

# JAI Publishing Skill

> Unified skill for managing affiliate website content generation and publishing

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../../README.md)

**What is a Pack?** See: [Pack System](../../PACKS.md)

This skill pack adds website publishing capabilities to your AI infrastructure:
- **Site Review** - Analyze site performance and content health
- **Keyword Research** - Discover and prioritize keywords for articles
- **Article Generation** - Create SEO-optimized affiliate content
- **Publishing Management** - Schedule and track content deployment

**Requires:** `jai-publishing-core` (tools and schemas)

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Skill Definition | `SKILL.md` | Routing triggers and workflow mapping |
| Site Review | `Workflows/SiteReview.md` | Monthly analytics and content health |
| Keyword Research | `Workflows/KeywordResearch.md` | Discover new keyword opportunities |
| Keyword Plan | `Workflows/KeywordPlan.md` | Review and prioritize queue |
| Create Article | `Workflows/CreateArticle.md` | Generate single article |
| Batch Articles | `Workflows/BatchArticles.md` | Queue multiple articles |
| Publish Schedule | `Workflows/PublishSchedule.md` | Manage publishing calendar |

**Summary:**
- **Workflows included:** 6
- **Dependencies:** jai-publishing-core, Art skill (for images)

---

## The Problem

Maintaining affiliate websites requires consistent, high-quality content:
- Manual keyword research is time-consuming
- Article quality varies without structure
- Publishing schedules slip without automation
- SEO optimization often overlooked

## The Solution

A unified skill that orchestrates the entire content pipeline:

```
Keyword Discovery → Queue Management → Article Generation → Review → Publish
```

**AI-invoked workflows** handle each stage with:
- Structured prompts for consistent quality
- SEO checks before publishing
- Integration with GitLab CI/CD for deployment
- Multi-site support (pispycameras, pelletguns101, etc.)

---

## Supported Sites

| Site | Platform | Status |
|------|----------|--------|
| pispycameras.com | Astro + Cloudflare Pages | Active |
| pelletguns101.com | Astro + Cloudflare Pages | Pending migration |

---

## Configuration

### Prerequisites

1. **jai-publishing-core** installed at `~/PAI/packs/jai-publishing-core/`
2. **Site repos** cloned to `~/sites/`
3. **GitLab CI/CD** configured for each site
4. **Amazon PA-API** credentials in keychain (for product data)

### Site Configuration

Each site needs a `.pai/` directory with:

```
~/sites/pispycameras.com/
├── .pai/
│   ├── site-context.md      # Site identity, audience, legal
│   └── article-template.md  # Article structure guide
├── keywords.json
├── content-calendar.json
└── src/pages/articles/
```

---

## Workflow Triggers

The SKILL.md routes to workflows based on user intent:

| User Says | Workflow |
|-----------|----------|
| "site review for pispy" | SiteReview.md |
| "find keywords for pispycameras" | KeywordResearch.md |
| "review keyword queue" | KeywordPlan.md |
| "write article about [topic]" | CreateArticle.md |
| "batch 5 articles for pispy" | BatchArticles.md |
| "show publishing schedule" | PublishSchedule.md |

---

## Quick Start

1. **Install prerequisite pack:**
   ```bash
   # Ensure jai-publishing-core is installed
   ls ~/PAI/packs/jai-publishing-core/
   ```

2. **Copy skill to PAI:**
   ```bash
   cp -r ~/src/pai/Personal_AI_Infrastructure/Packs/jai-publishing-skill ~/PAI/skills/Publishing
   ```

3. **Configure site context:**
   ```bash
   # Create site context (if not exists)
   mkdir -p ~/sites/pispycameras.com/.pai
   # Add site-context.md with site details
   ```

4. **Test with Claude:**
   ```
   "Show me the keyword queue for pispycameras"
   ```

---

## Workflow Details

### SiteReview

Analyzes site health:
- Content inventory (articles published, pending)
- SEO scores across articles
- Keyword queue status
- Recommendations for improvement

### KeywordResearch

Discovers new keywords using:
- Google Trends (via pytrends)
- Google/Amazon autocomplete
- LLM-based topic expansion
- Competitor analysis

### CreateArticle

Generates a single article:
1. Takes keyword from queue or topic
2. Creates outline with product slots
3. Fetches Amazon product data
4. Writes sections with SEO focus
5. Adds media (YouTube videos, images)
6. Runs Opus Editor validation
7. Outputs Astro file

### PublishSchedule

Manages the content calendar:
- View upcoming scheduled articles
- Reschedule or cancel entries
- See publication history

---

## Integration with GitLab CI/CD

Articles are published via GitLab pipelines:

```yaml
# .gitlab-ci.yml (in site repo)
generate_article:
  stage: generate
  tags: [vps, pai, publishing]
  script:
    - claude -p "Use jai-publishing-skill to create article from next keyword in queue"
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

The GitLab Runner on VPS executes `claude -p` commands using stored OAuth credentials.

---

## Related Packs

- **jai-publishing-core** - Required. Core tools and schemas.
- **pai-art-skill** - For generating hero images
- **mai-gitlab-skill** - For GitLab CI/CD integration

---

## Credits

- **Architecture:** Based on PAI skill pattern
- **Content Strategy:** Derived from pispycameras.com production pipeline

---

## Changelog

### 1.0.0 - 2026-01-09
- Initial release as PAI skill pack
- 6 workflows for complete publishing lifecycle
- Multi-site support
- GitLab CI/CD integration
- Opus Editor validation workflow
