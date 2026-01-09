---
name: Publishing
description: |
  Unified website publishing skill for affiliate sites.

  USE WHEN user mentions "site review", "keyword research", "create article",
  "batch articles", "publishing schedule", "keyword queue", or site names like
  "pispycameras", "pispy", "pg101", "pelletguns".
---

# Publishing Skill

Manages affiliate website content from keyword discovery to publication.

## Workflow Routing

| User Intent | Workflow | Description |
|-------------|----------|-------------|
| "site review for [site]" | SiteReview.md | Analyze site health and content |
| "find keywords for [site]" | KeywordResearch.md | Discover new keywords |
| "keyword research for [site]" | KeywordResearch.md | Discover new keywords |
| "review keyword queue" | KeywordPlan.md | Review and prioritize keywords |
| "show keywords for [site]" | KeywordPlan.md | Display keyword queue |
| "write article about [topic]" | CreateArticle.md | Generate single article |
| "create article for [keyword]" | CreateArticle.md | Generate from keyword |
| "batch [N] articles" | BatchArticles.md | Queue multiple articles |
| "show publishing schedule" | PublishSchedule.md | View content calendar |
| "show schedule for [site]" | PublishSchedule.md | View site calendar |

## Site Aliases

| Alias | Full Site | Directory |
|-------|-----------|-----------|
| pispy | pispycameras.com | ~/sites/pispycameras.com |
| pg101 | pelletguns101.com | ~/sites/pg101 |

## Required Tools

This skill depends on `jai-publishing-core`:

```bash
~/PAI/packs/jai-publishing-core/Tools/
├── Calendar.ts      # Content calendar management
├── KeywordQueue.ts  # Keyword queue operations
├── SeoChecker.ts    # SEO analysis
└── types.ts         # Type definitions
```

## Quick Commands

### View keyword queue
```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list --site=pispy
```

### View content calendar
```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts list --site=pispy
```

### Check article SEO
```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/SeoChecker.ts article.astro
```

## Automation

For GitLab CI/CD scheduled article generation:

```bash
claude -p "Use Publishing skill: Create article from next keyword in pispy queue" --max-turns 10
```

## Context Files

Each site should have:
- `~/sites/[site]/.pai/site-context.md` - Site identity and guidelines
- `~/sites/[site]/.pai/article-template.md` - Article structure template
