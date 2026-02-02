# AlertCheck Workflow

**Purpose:** Check budget thresholds and trigger alerts when crossed.

---

## Trigger

Called by:
- TrackSession (after each session)
- Overnight processor (nightly check)
- Manual request

---

## Steps

### Step 1: Load Current State

```typescript
const config = loadConfig('~/.claude/BUDGET/config.yaml');
const usage = loadUsage('~/.claude/BUDGET/usage.jsonl');
const currentPercent = calculatePercentUsed(usage, config);
const previousAlert = loadState('~/.claude/BUDGET/Data/alert-state.json');
```

### Step 2: Determine Current Level

```typescript
function getAlertLevel(percent, thresholds) {
  if (percent >= thresholds.critical) return 'critical';
  if (percent >= thresholds.warning) return 'warning';
  if (percent >= thresholds.caution) return 'caution';
  return 'normal';
}

const currentLevel = getAlertLevel(currentPercent, config.alerts);
```

### Step 3: Check for Level Change

```typescript
const levelOrder = ['normal', 'caution', 'warning', 'critical'];
const previousIndex = levelOrder.indexOf(previousAlert.level);
const currentIndex = levelOrder.indexOf(currentLevel);

const escalated = currentIndex > previousIndex;
const deescalated = currentIndex < previousIndex;
```

### Step 4: Take Action on Escalation

**Caution (70%):**
```bash
# Log the transition
echo "$(date): Entered CAUTION at ${currentPercent}%" >> ~/.claude/BUDGET/alerts.log
```

**Warning (85%):**
```bash
# Voice notification
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Budget warning: 85 percent of monthly limit consumed"}'

# Log
echo "$(date): Entered WARNING at ${currentPercent}%" >> ~/.claude/BUDGET/alerts.log
```

**Critical (95%):**
```bash
# Urgent voice notification
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Budget critical: 95 percent consumed. Restricting to essential tasks only."}'

# Log
echo "$(date): Entered CRITICAL at ${currentPercent}%" >> ~/.claude/BUDGET/alerts.log

# Write restriction flag
echo "critical" > ~/.claude/BUDGET/Data/restriction-mode
```

### Step 5: Save State

```typescript
saveState('~/.claude/BUDGET/Data/alert-state.json', {
  level: currentLevel,
  percent: currentPercent,
  timestamp: new Date().toISOString(),
  runway_days: calculateRunway()
});
```

---

## Monthly Reset

On the first of each month (or config.plan.reset_day):

1. Archive current month's usage to `history/YYYY-MM.jsonl`
2. Clear `usage.jsonl`
3. Reset alert state to 'normal'
4. Log: "Monthly budget reset"

---

## Integration with Resource Consciousness (Phase 3)

When Phase 3 is enabled, the alert state is exposed in the PAI algorithm output:

```markdown
🤖 PAI ALGORITHM ════════════════════════════════════════════
   Task: [task description]
   📊 Resources: 🟡 72% | $28 remaining | 8 days
```

This enables Aineko to make resource-aware decisions.
