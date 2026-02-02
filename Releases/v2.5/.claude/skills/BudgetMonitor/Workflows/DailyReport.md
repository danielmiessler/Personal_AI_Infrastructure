# DailyReport Workflow

**Purpose:** Generate a daily budget summary for MorningBrief integration.

---

## Trigger

Called by:
- MorningBrief skill (automatic)
- User request ("daily budget report")
- Overnight processor

---

## Output Format

For MorningBrief integration, return a concise block:

```markdown
### Budget Status

{EMOJI} **{PERCENT}%** consumed | ${REMAINING} remaining | {RUNWAY} days runway

{If yesterday had notable spending:}
Yesterday: ${YESTERDAY_SPEND} across {SESSION_COUNT} sessions

{If alert level > normal:}
**{ALERT_LEVEL}:** {RECOMMENDATION}
```

---

## Steps

### Step 1: Calculate Yesterday's Metrics

```typescript
const yesterday = usage.filter(u => isYesterday(u.timestamp));
const metrics = {
  sessions: yesterday.length,
  cost: sum(yesterday.map(u => u.cost_estimated)),
  avgRating: avg(yesterday.filter(u => u.rating).map(u => u.rating))
};
```

### Step 2: Calculate MTD Metrics

Same as Status workflow.

### Step 3: Compare to Pace

```typescript
const idealDailySpend = budget / daysInMonth;
const actualDailyAvg = spentMTD / daysElapsed;
const paceStatus = actualDailyAvg <= idealDailySpend ? 'on track' : 'over pace';
```

### Step 4: Format for MorningBrief

```markdown
### Budget Status

🟢 **32%** consumed | $68.00 remaining | 22 days runway

Yesterday: $4.20 across 3 sessions (avg rating: 8.5)
Pace: On track ($3.20/day vs $3.33/day target)
```

---

## Alert Escalation

| Level | In MorningBrief |
|-------|----------------|
| 🟢 Normal | Brief mention only |
| 🟡 Caution | Mention + pace warning |
| 🟠 Warning | Prominent + recommendations |
| 🔴 Critical | FIRST item + action required |
