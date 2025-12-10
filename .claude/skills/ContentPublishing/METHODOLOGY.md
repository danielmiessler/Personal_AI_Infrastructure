# ContentPublishing Methodology

## Philosophy

**Content as Code**: Treat content with the same rigor as software - version control, CI/CD, automated testing (link checking, spell check), and scheduled deployments.

**Sustainable Cadence**: Quality over quantity. A realistic publishing schedule that can be maintained long-term beats an ambitious plan that burns out in two months.

**Data-Informed**: Let performance data guide content decisions, but don't become a slave to metrics. Balance what performs with what you want to write about.

## Content Lifecycle

```
Plan → Research → Write → Optimize → Review → Publish → Analyze → Iterate
```

### 1. Planning Phase

**Quarterly Planning** (every 90 days):
- Review previous quarter's performance
- Identify themes and topics
- Set realistic publishing cadence
- Block time for creation

**Content Calendar Structure**:
```markdown
## Q1 2025 Content Plan

### January - Theme: [Topic]
- Week 1: [Article Title] - Status: Draft
- Week 2: [Article Title] - Status: Idea
- Week 3: No post (holiday buffer)
- Week 4: [Article Title] - Status: Idea

### February - Theme: [Topic]
...
```

### 2. Research Phase

**Before writing, gather**:
- Keyword research (search intent)
- Competitor content analysis
- Source material and references
- Unique angle or perspective

**Research Output**:
```markdown
# Article Research: [Title]

## Target Keyword
Primary: [keyword]
Secondary: [keyword], [keyword]

## Search Intent
[What is the user trying to accomplish?]

## Competitor Analysis
- [URL 1]: Covers X, misses Y
- [URL 2]: Good on Z, weak on W

## Unique Angle
[What makes this article different/better?]

## Key Sources
- [Source 1]
- [Source 2]
```

### 3. Writing Phase

**Article Structure**:
```markdown
---
title: "Compelling Title with Keyword"
description: "150-160 char meta description"
date: 2025-01-15
tags: [tag1, tag2]
draft: true
---

## Introduction (Hook + Promise)
[Why should they read this?]

## Main Content
[Structured with H2/H3 headers]

## Conclusion (Summary + CTA)
[What should they do next?]
```

**Writing Best Practices**:
- Write the outline first
- First draft without editing
- Let it sit 24 hours before revision
- Read aloud for flow
- Cut ruthlessly

### 4. Optimization Phase

**SEO Checklist**:
- [ ] Title includes primary keyword
- [ ] Meta description is compelling (150-160 chars)
- [ ] URL slug is clean and keyword-rich
- [ ] H1 matches title (or close)
- [ ] H2s include secondary keywords naturally
- [ ] Images have alt text
- [ ] Internal links to related content
- [ ] External links to authoritative sources

**Technical Optimization**:
- [ ] Images compressed (WebP preferred)
- [ ] Code blocks properly formatted
- [ ] Links work (no 404s)
- [ ] Mobile-friendly formatting

### 5. Publishing Phase

**Pre-publish Checklist**:
- [ ] Spell check passed
- [ ] Grammarly/writing tool review
- [ ] Preview in browser
- [ ] OG image set for social sharing
- [ ] Draft flag removed

**Publishing Methods**:
1. **Direct**: Push to main branch → immediate deploy
2. **Scheduled**: GitLab CI scheduled pipeline
3. **Staged**: Push to preview branch → review → merge

### 6. Analysis Phase

**Key Metrics to Track**:
- Page views (traffic)
- Time on page (engagement)
- Bounce rate (relevance)
- Conversion rate (if applicable)
- Search rankings (SEO success)

**Monthly Review Questions**:
1. Which content performed best? Why?
2. Which underperformed? Why?
3. What patterns emerge?
4. What should we do more/less of?

## File Organization

```
content/
├── blog/
│   ├── 2025/
│   │   ├── 01-january/
│   │   │   ├── article-slug/
│   │   │   │   ├── index.md
│   │   │   │   └── images/
│   │   │   └── another-article/
│   │   └── 02-february/
│   └── drafts/           # Work in progress
├── pages/                # Static pages
└── newsletter/           # Newsletter archives
```

## GitLab CI for Scheduled Publishing

```yaml
# .gitlab-ci.yml snippet for scheduled publishing
publish:scheduled:
  stage: deploy
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
  script:
    - git checkout main
    - # Move scheduled post from drafts to published
    - git add .
    - git commit -m "Scheduled publish: $POST_SLUG"
    - git push
  # Triggered by GitLab scheduled pipeline
```

## Content Templates

### Blog Post Template
```markdown
---
title: ""
description: ""
date: YYYY-MM-DD
author: ""
tags: []
draft: true
---

## Introduction

[Hook - grab attention]

[Problem - why this matters]

[Promise - what they'll learn]

## [Main Section 1]

## [Main Section 2]

## [Main Section 3]

## Conclusion

[Summary of key points]

[Call to action]
```

### Tutorial Template
```markdown
---
title: "How to [Accomplish Goal]"
description: ""
date: YYYY-MM-DD
tags: [tutorial]
draft: true
---

## Prerequisites

- [Requirement 1]
- [Requirement 2]

## What We're Building

[End result description]

## Step 1: [Action]

[Explanation and code]

## Step 2: [Action]

## Step N: [Action]

## Testing It Out

## Troubleshooting

### Common Issue 1
[Solution]

## Next Steps

[Where to go from here]
```

## Anti-Patterns

**Avoid**:
- Publishing without editing pass
- Ignoring SEO basics
- Inconsistent publishing schedule
- Writing only for search engines (no personality)
- Never reviewing what works
- Perfectionism that prevents publishing

## Tools Integration

| Purpose | Tool | Notes |
|---------|------|-------|
| Writing | Any markdown editor | VS Code, Obsidian, etc. |
| Grammar | Grammarly, LanguageTool | Pre-publish check |
| SEO | Ahrefs, SEMrush | Keyword research |
| Analytics | Cloudflare Analytics, Plausible | Privacy-friendly |
| Images | Unsplash, AI generation | Always optimize |
| Scheduling | GitLab CI | Scheduled pipelines |
