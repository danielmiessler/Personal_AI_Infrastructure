# Status Workflow

**Purpose:** Display current budget status in a concise, actionable format.

---

## Voice Notification

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Checking budget status"}' \
  > /dev/null 2>&1 &
```

---

## Steps

### Step 1: Load Data

Read the following files:
- `~/.claude/BUDGET/config.yaml` - Budget limits and thresholds
- `~/.claude/BUDGET/TRACKER.md` - Current state
- `~/.claude/BUDGET/usage.jsonl` - Raw usage data (if exists)

### Step 2: Calculate Metrics

```typescript
// Metrics to calculate
const metrics = {
  monthlyBudget: config.plan.monthly_cost,
  spentMTD: sum(usage.filter(u => isThisMonth(u)).map(u => u.cost_estimated)),
  remaining: monthlyBudget - spentMTD,
  percentUsed: (spentMTD / monthlyBudget) * 100,
  daysInMonth: getDaysInMonth(),
  daysElapsed: getDayOfMonth(),
  daysRemaining: daysInMonth - daysElapsed,
  dailyAverage: spentMTD / daysElapsed,
  projectedTotal: dailyAverage * daysInMonth,
  runway: remaining / dailyAverage  // Days until budget exhausted at current rate
};
```

### Step 3: Determine Alert Level

| Condition | Level | Emoji |
|-----------|-------|-------|
| percentUsed < 70 | Normal | 🟢 |
| percentUsed < 85 | Caution | 🟡 |
| percentUsed < 95 | Warning | 🟠 |
| percentUsed >= 95 | Critical | 🔴 |

### Step 4: Format Output

```markdown
## Budget Status

{EMOJI} **{PERCENT}%** of monthly budget consumed

| Metric | Value |
|--------|-------|
| Spent (MTD) | ${SPENT} |
| Remaining | ${REMAINING} |
| Days Left | {DAYS} |
| Daily Average | ${DAILY_AVG} |
| Projected Total | ${PROJECTED} |
| Runway | {RUNWAY} days |

{ALERT_MESSAGE if level > normal}

{RECOMMENDATIONS if level > caution}
```

### Step 5: Recommendations by Level

**Caution (🟡):**
- "Consider pacing heavier tasks toward end of month"
- "Current trajectory: on track / slightly over"

**Warning (🟠):**
- "Recommend deferring non-essential research"
- "Focus on high-value tasks only"
- "Consider overnight processing for batch work"

**Critical (🔴):**
- "Budget nearly exhausted"
- "Restrict to essential tasks only"
- "Wait for budget reset on {DATE}"

---

## Integration

This workflow is invoked by:
- Direct user request ("budget status", "usage")
- MorningBrief skill (daily report integration)
- AlertCheck workflow (when thresholds crossed)
