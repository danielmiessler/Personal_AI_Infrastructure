# Keyword Plan Workflow

Review, prioritize, and manage the keyword queue.

## Trigger

User says: "review keyword queue", "show keywords for [site]", "keyword plan", "prioritize keywords"

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| site | No | Filter by site (optional) |
| status | No | Filter by status (queued, writing, published) |

## Workflow Steps

### 1. Display Current Queue

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list --site=[site]
```

### 2. Show Queue Statistics

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts stats --site=[site]
```

### 3. Review Options

Present options to user:
- **Reprioritize:** Change priority of specific keywords
- **Remove:** Delete keywords no longer relevant
- **Update Status:** Mark keywords as in-progress or done
- **Add Notes:** Add context to keywords

### 4. Execute Changes

#### Reprioritize

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts update [id] --priority=[1-5]
```

#### Remove Keyword

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts remove [id]
```

#### Update Status

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts update [id] --status=[status]
```

### 5. Recommend Next Actions

Based on queue analysis:
- Suggest keywords ready for article creation
- Identify gaps needing research
- Flag stale keywords for review

## Output Format

```markdown
## Keyword Queue: [site]

### Queue Overview
- **Total Keywords:** [count]
- **High Priority (1-2):** [count]
- **Medium Priority (3):** [count]
- **Low Priority (4-5):** [count]

### By Status
- **Queued:** [count]
- **In Progress:** [count]
- **Published:** [count]

### Top Priority Keywords

| # | Keyword | Priority | Added | Intent |
|---|---------|----------|-------|--------|
| 1 | [keyword] | [priority] | [date] | [intent] |

### Recommendations
- **Ready to Write:** [keyword suggestions]
- **Needs Research:** [topic gaps]
- **Consider Removing:** [stale keywords]
```

## Related Workflows

- `KeywordResearch.md` - Add more keywords
- `CreateArticle.md` - Write article for top keyword
- `BatchArticles.md` - Queue multiple articles
