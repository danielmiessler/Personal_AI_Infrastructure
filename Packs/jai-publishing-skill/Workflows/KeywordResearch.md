# Keyword Research Workflow

Discover new keyword opportunities for affiliate content.

## Trigger

User says: "find keywords for [site]", "keyword research for [site]", "discover keywords"

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| site | Yes | Site alias or full domain |
| topic | No | Optional focus topic/seed keyword |
| count | No | Number of keywords to find (default: 10) |

## Workflow Steps

### 1. Load Site Context

```bash
cat ~/sites/[site]/.pai/site-context.md
```

Review:
- Site niche and audience
- Existing content themes
- Product categories covered

### 2. Analyze Existing Keywords

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list --site=[site]
```

Identify gaps and opportunities based on:
- Topics not yet covered
- Related keywords to high-performers
- Seasonal opportunities

### 3. Keyword Discovery Methods

#### Method A: LLM Topic Expansion

Using Claude, generate related keywords based on:
- Site niche
- Existing successful content
- Competitor gaps
- Seasonal trends

#### Method B: Autocomplete Mining

Research Google/Amazon autocomplete suggestions for:
- Primary product categories
- "Best [product] for [use case]"
- "[Product] vs [product]"
- "[Product] review"

#### Method C: Question Research

Find questions people ask:
- "How to [action] with [product]"
- "Is [product] good for [use case]"
- "What [product] for [purpose]"

### 4. Evaluate and Score Keywords

For each keyword, assess:
- **Search Intent:** Informational, commercial, transactional
- **Competition:** Low, medium, high
- **Relevance:** How well it fits site niche
- **Monetization:** Affiliate potential

### 5. Add to Queue

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts add "[keyword]" \
  --site=[site] \
  --topic="[topic]" \
  --priority=[1-5] \
  --intent=[commercial|informational|transactional]
```

## Output Format

```markdown
## Keyword Research: [site]

### Discovery Session
- **Date:** [date]
- **Focus:** [topic or "general"]
- **Keywords Found:** [count]

### New Keywords Added

| Keyword | Priority | Intent | Notes |
|---------|----------|--------|-------|
| [keyword] | [1-5] | [intent] | [notes] |

### Keyword Queue Status
- **Before:** [count] keywords
- **After:** [count] keywords
- **High Priority Added:** [count]

### Recommendations
- [recommendation for next research focus]
```

## Related Workflows

- `KeywordPlan.md` - Review and prioritize queue
- `CreateArticle.md` - Write article for keyword
- `SiteReview.md` - Overall site health check
