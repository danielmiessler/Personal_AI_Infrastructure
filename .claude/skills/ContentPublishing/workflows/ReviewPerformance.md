# ReviewPerformance Workflow

Analyze content performance and adjust strategy based on data.

## Trigger Phrases
- "how is my content performing"
- "review content analytics"
- "what's working"
- "content performance review"
- "analyze blog metrics"

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| period | No | Review period: week, month, quarter (default: month) |
| site_url | Yes | Website URL to analyze |
| cf_zone_id | Yes | Cloudflare zone ID for analytics |
| compare_to | No | Previous period for comparison |

## Workflow Steps

### Step 1: Gather Analytics Data

**Using Cloudflare Analytics** (via Cloudflare skill):

```typescript
// Fetch zone analytics for the period
// Uses: cloudflare-mcp/get_zone_analytics

// Key metrics to fetch:
// - Page views by path
// - Unique visitors
// - Top referrers
// - Geographic distribution
// - Device types
```

**Data to collect**:
```markdown
## Raw Metrics: [Period]

### Traffic Overview
- Total page views: [X]
- Unique visitors: [Y]
- Pages per session: [Z]
- Avg time on site: [T]

### Top Pages
1. [/path] - [X] views
2. [/path] - [X] views
3. [/path] - [X] views
4. [/path] - [X] views
5. [/path] - [X] views

### Traffic Sources
- Direct: [X]%
- Search: [Y]%
- Social: [Z]%
- Referral: [W]%

### Top Referrers
1. [source] - [X] visits
2. [source] - [X] visits
3. [source] - [X] visits
```

### Step 2: Analyze Trends

Compare to previous period:

```markdown
## Trend Analysis: [Current] vs [Previous]

### Traffic Trends
| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| Page Views | [X] | [Y] | [+/-Z%] |
| Visitors | [X] | [Y] | [+/-Z%] |
| Time on Site | [X] | [Y] | [+/-Z%] |

### Content Performance
| Article | Previous Views | Current Views | Trend |
|---------|---------------|---------------|-------|
| [Title] | [X] | [Y] | [up/down] |
| [Title] | [X] | [Y] | [up/down] |

### New Content This Period
| Article | Publish Date | Views | Performance |
|---------|--------------|-------|-------------|
| [Title] | [Date] | [X] | [Good/Average/Poor] |
```

### Step 3: Identify Patterns

**What's Working**:
```markdown
## Success Patterns

### Top Performing Content
1. **[Article Title]**
   - Views: [X]
   - Why it works: [Analysis]
   - Replicate: [What to do more of]

2. **[Article Title]**
   - Views: [X]
   - Why it works: [Analysis]
   - Replicate: [What to do more of]

### Successful Patterns
- Topic pattern: [What topics perform best]
- Format pattern: [What formats work - tutorials, lists, etc.]
- Length pattern: [Optimal word count]
- Timing pattern: [Best publish days/times]
```

**What's Not Working**:
```markdown
## Areas for Improvement

### Underperforming Content
1. **[Article Title]**
   - Views: [X]
   - Possible issues: [Analysis]
   - Action: [Update/Promote/Accept]

### Patterns to Avoid
- [Pattern 1 that doesn't work]
- [Pattern 2 that doesn't work]
```

### Step 4: Generate Recommendations

```markdown
## Recommendations

### Content Strategy
1. **Do more**: [Specific recommendation]
   - Based on: [Data point]
   - Expected impact: [Outcome]

2. **Do less**: [Specific recommendation]
   - Based on: [Data point]
   - Why stop: [Reason]

3. **Experiment with**: [Specific recommendation]
   - Hypothesis: [What you expect]
   - How to test: [Method]

### Quick Wins
- [ ] Update [old article] with fresh content
- [ ] Add internal links from [popular article] to [underperforming article]
- [ ] Repromote [evergreen article] on [channel]

### Next Quarter Focus
Based on this review, next quarter should prioritize:
1. [Focus area 1]
2. [Focus area 2]
3. [Focus area 3]
```

### Step 5: Update Content Plan

Adjust the quarterly plan based on findings:

```markdown
## Plan Adjustments

### Topics to Add
- [Topic based on demand]
- [Topic based on success pattern]

### Topics to Remove/Deprioritize
- [Topic that isn't working]

### Format Changes
- More: [Format type]
- Less: [Format type]
```

### Step 6: Store Review

Save for future reference:

```
content/
└── _analytics/
    └── 2025-01-review.md
```

Or store in Cloudflare KV:

```typescript
// Namespace: CONTENT_ANALYTICS
// Key: review-2025-01
// Value: { review object }
```

## Output

Complete performance review document:

```markdown
# Content Performance Review: [Period]

**Review Date**: [Date]
**Period**: [Start] to [End]
**Compared To**: [Previous Period]

## Executive Summary
[2-3 sentence overview of performance]

## Key Metrics
[Traffic and engagement numbers]

## Top Performers
[Best content with analysis]

## Improvement Areas
[Underperforming content with analysis]

## Recommendations
[Specific action items]

## Next Steps
[ ] [Action 1]
[ ] [Action 2]
[ ] [Action 3]
```

## Integration Points

- **Cloudflare skill**: Fetch zone analytics
- **QuarterlyPlan**: Updates plan based on findings
- **Cloudflare KV**: Store historical reviews

## Metrics Deep Dive

### Traffic Quality Indicators

| Metric | Good | Needs Work | Action |
|--------|------|------------|--------|
| Time on Page | >3 min | <1 min | Improve content depth |
| Bounce Rate | <50% | >70% | Better internal linking |
| Pages/Session | >2 | 1 | Add related content |
| Return Visitors | >20% | <10% | Email capture, RSS |

### Content Health Check

For each major article:
- [ ] Is it still accurate?
- [ ] Are links still working?
- [ ] Is it ranking for target keyword?
- [ ] Could it be updated/expanded?
- [ ] Does it need republishing?

## Tips

1. **Consistency**: Review on the same schedule (monthly/quarterly)
2. **Trends > Snapshots**: One bad week doesn't mean failure
3. **Context matters**: Holiday periods, external events affect traffic
4. **Action-oriented**: Every review should end with action items
5. **Celebrate wins**: Note what's working, not just problems
