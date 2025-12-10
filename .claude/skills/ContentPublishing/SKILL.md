---
name: ContentPublishing
description: Content lifecycle management for blogs and publications. USE WHEN user wants to plan content, create articles, schedule publishing, review performance, OR mentions blog posts, content calendar, or SEO optimization. Composes Cloudflare and GitLab skills for end-to-end publishing workflows.
---

# ContentPublishing Skill

Workflow skill for managing the complete content publishing lifecycle - from quarterly planning through creation, publishing, and performance analysis.

## Prerequisites

This skill composes foundational skills:
- **Cloudflare**: Pages deployment, Workers for dynamic content, KV for metadata
- **GitLab**: CI/CD pipelines for scheduled publishing, automation

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| [QuarterlyPlan](workflows/QuarterlyPlan.md) | "plan content", "content calendar", "quarterly planning" | Create 90-day content roadmap |
| [CreateArticle](workflows/CreateArticle.md) | "write article", "create blog post", "new content" | Research, write, and optimize articles |
| [ScheduledPublishing](workflows/ScheduledPublishing.md) | "schedule post", "publish later", "automate publishing" | Set up GitLab CI for timed releases |
| [ReviewPerformance](workflows/ReviewPerformance.md) | "content analytics", "review performance", "what's working" | Analyze and adjust content strategy |

## Quick Reference

### Content Types Supported
- Blog posts (markdown → static site)
- Technical tutorials
- Product announcements
- Newsletter content

### Publishing Targets
- Cloudflare Pages (primary)
- Static site generators (Hugo, Astro, Next.js)
- Newsletter platforms (via API integration)

### Automation Capabilities
- Scheduled publishing via GitLab CI
- SEO metadata generation
- Social media snippet creation
- Performance tracking setup

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                  ContentPublishing                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ QuarterlyPlan│  │CreateArticle │  │  Scheduled   │  │
│  │              │  │              │  │  Publishing  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Cloudflare    │  │   Cloudflare    │  │     GitLab      │
│   (KV storage)  │  │    (Pages)      │  │   (CI/CD)       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Environment Requirements

```bash
# Content storage and publishing
CF_API_TOKEN        # Cloudflare API access
CF_ACCOUNT_ID       # Cloudflare account

# CI/CD automation
GITLAB_TOKEN        # GitLab API access

# Optional - AI-assisted content
ANTHROPIC_API_KEY   # For AI-assisted writing/research
```
