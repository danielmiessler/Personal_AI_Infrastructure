# Site Review Workflow

Analyze site health, content inventory, and SEO performance.

## Trigger

User says: "site review for [site]", "review [site]", "how is [site] doing"

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| site | Yes | Site alias (pispy, pg101) or full domain |

## Workflow Steps

### 1. Load Site Context

```bash
# Read site context file
cat ~/sites/[site]/.pai/site-context.md
```

### 2. Content Inventory

```bash
# Count published articles
find ~/sites/[site]/src/pages/articles -name "*.astro" | wc -l

# List recent articles (last 30 days)
find ~/sites/[site]/src/pages/articles -name "*.astro" -mtime -30
```

### 3. Keyword Queue Status

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts stats --site=[site]
```

### 4. Content Calendar Status

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts list --site=[site] --upcoming
```

### 5. SEO Analysis (Sample)

```bash
# Run SEO check on 5 random articles
for f in $(ls ~/sites/[site]/src/pages/articles/*.astro | shuf -n 5); do
  bun run ~/PAI/packs/jai-publishing-core/Tools/SeoChecker.ts "$f"
done
```

## Output Format

```markdown
## Site Review: [site]

### Content Inventory
- **Total Articles:** [count]
- **Published This Month:** [count]
- **Drafts Pending:** [count]

### Keyword Queue
- **Keywords in Queue:** [count]
- **High Priority:** [count]
- **Ready to Write:** [count]

### Content Calendar
- **Scheduled This Week:** [count]
- **Scheduled This Month:** [count]

### SEO Health
- **Average Score:** [score]/100
- **Articles Needing Improvement:** [count]

### Recommendations
1. [recommendation]
2. [recommendation]
3. [recommendation]
```

## Related Workflows

- `KeywordResearch.md` - Add more keywords to queue
- `CreateArticle.md` - Write articles for queued keywords
- `PublishSchedule.md` - View full content calendar
