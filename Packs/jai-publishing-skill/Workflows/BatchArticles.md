# Batch Articles Workflow

Queue multiple articles for generation.

## Trigger

User says: "batch [N] articles", "queue articles for [site]", "schedule article batch"

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| site | Yes | Target site (pispy, pg101) |
| count | Yes | Number of articles to queue |
| source | No | "queue" (default) or "research" |

## Workflow Steps

### 1. Determine Article Sources

#### Option A: From Keyword Queue
```bash
# Get top N keywords from queue
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts list \
  --site=[site] \
  --status=queued \
  --limit=[count] \
  --sort=priority
```

#### Option B: Fresh Research
If queue is insufficient, trigger `KeywordResearch.md` workflow first.

### 2. Validate Selection

Present keywords to user for approval:

```markdown
## Proposed Article Batch

| # | Keyword | Priority | Est. Publish |
|---|---------|----------|--------------|
| 1 | [keyword] | [priority] | [date] |
| 2 | [keyword] | [priority] | [date] |
...

Proceed with these [count] articles? (yes/modify/cancel)
```

### 3. Schedule Articles

For each approved keyword:

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts add "[keyword]" \
  --site=[site] \
  --date=[calculated date] \
  --status=scheduled
```

Scheduling logic:
- Space articles evenly (e.g., 2-3 days apart)
- Avoid weekends unless specified
- Consider site's typical publishing cadence

### 4. Update Keyword Status

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/KeywordQueue.ts update [id] --status=scheduled
```

### 5. Generate GitLab CI/CD Jobs (Optional)

If automated generation is enabled, create scheduled pipeline triggers:

```yaml
# Articles scheduled for generation
generate_batch_[date]:
  stage: generate
  script:
    - claude -p "Use jai-publishing-skill: Create article for keyword '[keyword]' on [site]"
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
      when: always
```

## Output Format

```markdown
## Batch Scheduled: [site]

### Summary
- **Articles Queued:** [count]
- **Date Range:** [start] to [end]
- **Automation:** [enabled/disabled]

### Schedule

| Date | Keyword | Status |
|------|---------|--------|
| [date] | [keyword] | Scheduled |

### Queue Status
- **Keywords Remaining:** [count]
- **High Priority Left:** [count]

### Next Steps
- [ ] Review scheduled articles in calendar
- [ ] Ensure GitLab runner is configured
- [ ] Monitor first automated generation
```

## Automation Notes

For fully automated article generation:

1. GitLab CI/CD checks calendar daily
2. If article is due, triggers generation
3. Article is created via Claude
4. PR/MR created for review
5. After approval, deploys to Cloudflare

```bash
# GitLab scheduled pipeline (daily)
claude -p "Use jai-publishing-skill: Check calendar and create any articles due today for [site]" --max-turns 20
```

## Related Workflows

- `KeywordResearch.md` - Fill queue before batching
- `CreateArticle.md` - Generate individual articles
- `PublishSchedule.md` - View full calendar
