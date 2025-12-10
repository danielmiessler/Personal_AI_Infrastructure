# QuarterlyPlan Workflow

Create a 90-day content roadmap with themes, topics, and publishing schedule.

## Trigger Phrases
- "plan content for the quarter"
- "create content calendar"
- "quarterly content planning"
- "what should I write about"

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| quarter | Yes | Q1, Q2, Q3, or Q4 + year (e.g., "Q1 2025") |
| site_url | No | Website URL for context |
| focus_areas | No | Topics/themes to prioritize |
| cadence | No | Target posts per month (default: 2) |

## Workflow Steps

### Step 1: Review Previous Quarter

```bash
# If analytics available, fetch performance data
# Look for: top performing content, trends, gaps
```

**Questions to answer**:
- What content performed best last quarter?
- What topics had the most engagement?
- What's missing from the content library?
- What questions do readers frequently ask?

### Step 2: Define Themes

Organize the quarter into monthly themes:

```markdown
## Q1 2025 Themes

### January: [Theme 1]
Focus: [What aspect of this theme?]
Why now: [Timeliness/relevance]

### February: [Theme 2]
Focus: [What aspect of this theme?]
Why now: [Timeliness/relevance]

### March: [Theme 3]
Focus: [What aspect of this theme?]
Why now: [Timeliness/relevance]
```

### Step 3: Generate Topic Ideas

For each theme, brainstorm 4-6 potential articles:

```markdown
### January Topics (Theme: [X])
1. [Title idea] - Angle: [unique perspective]
2. [Title idea] - Angle: [unique perspective]
3. [Title idea] - Angle: [unique perspective]
4. [Title idea] - Angle: [unique perspective]
```

**Topic generation techniques**:
- Answer common questions in your field
- "How to" + problem your audience faces
- "Why" + counterintuitive takes
- Lessons learned from recent projects
- Tool/framework comparisons
- Beginner guides for complex topics

### Step 4: Prioritize and Schedule

Select the best topics and assign to weeks:

```markdown
## Q1 2025 Content Calendar

### January
| Week | Title | Status | Notes |
|------|-------|--------|-------|
| 1 | [Title] | Idea | Holiday week - short post |
| 2 | [Title] | Idea | Main piece |
| 3 | - | Skip | Buffer week |
| 4 | [Title] | Idea | |

### February
| Week | Title | Status | Notes |
|------|-------|--------|-------|
| 1 | [Title] | Idea | |
| 2 | [Title] | Idea | |
| 3 | [Title] | Idea | |
| 4 | - | Skip | Buffer week |

### March
| Week | Title | Status | Notes |
|------|-------|--------|-------|
| 1 | [Title] | Idea | |
| 2 | [Title] | Idea | |
| 3 | [Title] | Idea | |
| 4 | [Title] | Idea | Quarter wrap-up |
```

**Scheduling best practices**:
- Build in buffer weeks (things happen)
- Front-load easier posts
- Save complex pieces for weeks with more time
- Consider seasonal/holiday timing

### Step 5: Store the Plan

Save to Cloudflare KV for tracking:

```typescript
// Uses Cloudflare skill - KV storage
// Namespace: CONTENT_PLANS
// Key: q1-2025-plan
// Value: { plan object }
```

Or save as markdown in repository:

```
content/
└── _planning/
    └── 2025-q1-plan.md
```

## Output

Produces a quarterly content plan document:

```markdown
# Q1 2025 Content Plan

**Created**: [Date]
**Cadence**: [X] posts/month
**Focus Areas**: [Area 1], [Area 2]

## Performance Review (Previous Quarter)
[Summary of Q4 2024 performance]

## Quarterly Themes
- January: [Theme]
- February: [Theme]
- March: [Theme]

## Content Calendar
[Week-by-week schedule]

## Success Metrics
- [ ] Publish [X] articles
- [ ] Increase traffic by [Y]%
- [ ] Build email list to [Z] subscribers

## Notes
[Any additional context]
```

## Integration Points

- **Cloudflare KV**: Store plan metadata for tracking
- **GitLab**: Create issues for each planned article (optional)
- **ReviewPerformance**: Uses this plan to measure against actuals

## Tips

1. **Be realistic**: It's better to plan 6 posts and publish 6 than plan 12 and publish 4
2. **Stay flexible**: The plan is a guide, not a contract
3. **Batch similar topics**: Easier to research related articles together
4. **Include evergreen content**: Not everything needs to be timely
