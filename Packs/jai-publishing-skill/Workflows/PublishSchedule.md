# Publish Schedule Workflow

View and manage the content publication calendar.

## Trigger

User says: "show publishing schedule", "show schedule for [site]", "content calendar", "what's scheduled"

## Inputs

| Parameter | Required | Description |
|-----------|----------|-------------|
| site | No | Filter by site (optional) |
| range | No | Time range: "week", "month", "all" (default: month) |

## Workflow Steps

### 1. Load Calendar

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts list \
  --site=[site] \
  --range=[range]
```

### 2. Display Schedule

Present calendar in readable format:
- Group by week
- Show status indicators
- Highlight overdue items

### 3. Management Options

#### Reschedule Entry

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts update [id] --date=[new-date]
```

#### Cancel Entry

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts remove [id]
```

#### Mark as Published

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts update [id] --status=published
```

#### Add New Entry

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts add "[title]" \
  --site=[site] \
  --date=[date] \
  --keyword=[keyword-id]
```

### 4. Show Statistics

```bash
bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts stats --site=[site]
```

## Output Format

```markdown
## Content Calendar: [site or "All Sites"]

### This Week

| Date | Site | Title | Status |
|------|------|-------|--------|
| Mon [date] | [site] | [title] | [status] |
| Wed [date] | [site] | [title] | [status] |

### Upcoming

| Date | Site | Title | Status |
|------|------|-------|--------|
| [date] | [site] | [title] | Scheduled |

### Statistics
- **Published This Month:** [count]
- **Scheduled:** [count]
- **Overdue:** [count]

### Publication Cadence
- **[site]:** [X] articles/week average
- **Total:** [X] articles/month

### Recommendations
- [recommendation based on schedule analysis]
```

## Calendar Views

### Week View (Default for "show schedule")

```
Week of January 6, 2026
========================
Mon 6:  [pispy] Best Trail Cameras 2026 (Published)
Tue 7:  --
Wed 8:  [pispy] Cellular Trail Cameras Guide (Scheduled)
Thu 9:  --
Fri 10: [pg101] Beginner Pellet Gun Guide (Scheduled)
Sat 11: --
Sun 12: --
```

### Month View

```
January 2026
============
Week 1: 2 articles (pispy: 2, pg101: 0)
Week 2: 3 articles (pispy: 1, pg101: 2)
Week 3: 2 articles (pispy: 2, pg101: 0)
Week 4: 2 articles (pispy: 1, pg101: 1)
-----------------------------------------
Total:  9 articles scheduled
```

## Integration with GitLab CI/CD

The calendar integrates with scheduled pipelines:

```yaml
# .gitlab-ci.yml
check_calendar:
  stage: check
  script:
    - |
      SCHEDULED=$(bun run ~/PAI/packs/jai-publishing-core/Tools/Calendar.ts due --site=$SITE)
      if [ -n "$SCHEDULED" ]; then
        claude -p "Create article for: $SCHEDULED"
      fi
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

## Related Workflows

- `BatchArticles.md` - Schedule multiple articles
- `CreateArticle.md` - Generate scheduled article
- `SiteReview.md` - Overall site health including schedule
