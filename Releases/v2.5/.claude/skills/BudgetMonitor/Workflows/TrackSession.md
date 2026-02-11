# TrackSession Workflow

**Purpose:** Record usage data for a completed session.

---

## Trigger

This workflow is called:
1. By session-end hook (automatic)
2. Manually via "track this session"
3. By overnight processor for batch recording

---

## Steps

### Step 1: Gather Session Data

Collect from environment/context:
```typescript
const sessionData = {
  timestamp: new Date().toISOString(),
  session_id: process.env.CLAUDE_SESSION_ID || generateId(),
  duration_minutes: calculateDuration(),
  messages: countMessages(),
  tokens_estimated: {
    input: estimateInputTokens(),
    output: estimateOutputTokens()
  }
};
```

### Step 2: Estimate Cost

```typescript
// Load config
const config = loadConfig('~/.claude/BUDGET/config.yaml');

// Calculate cost based on plan type
if (config.plan.type === 'subscription') {
  // For subscription, estimate based on typical usage distribution
  // This is approximate - subscription doesn't have per-token billing
  sessionData.cost_estimated = estimateSubscriptionCost(sessionData);
} else if (config.plan.type === 'api') {
  // For API, calculate exact cost
  const inputCost = (sessionData.tokens_estimated.input / 1_000_000) * config.plan.api.input_cost_per_1m;
  const outputCost = (sessionData.tokens_estimated.output / 1_000_000) * config.plan.api.output_cost_per_1m;
  sessionData.cost_estimated = inputCost + outputCost;
}
```

### Step 3: Add Metadata

```typescript
// If available, add quality/value data
sessionData.rating = getSessionRating();  // If user rated
sessionData.tasks_completed = countVerifiedISC();  // ISC criteria verified
sessionData.skills_used = getSkillsInvoked();  // Which skills were used
```

### Step 4: Append to Log

```bash
# Append as JSONL
echo '${JSON.stringify(sessionData)}' >> ~/.claude/BUDGET/usage.jsonl
```

### Step 5: Update Tracker

Update `~/.claude/BUDGET/TRACKER.md` with new totals:
- Increment session count
- Add to running cost total
- Update daily log table
- Recalculate averages

### Step 6: Check Alerts

Invoke AlertCheck workflow to see if thresholds crossed.

---

## Token Estimation Heuristics

Since exact token counts aren't always available:

| Content Type | Avg Tokens/Message |
|--------------|-------------------|
| User message (short) | 50-200 |
| User message (with code) | 500-2000 |
| Assistant response (short) | 200-500 |
| Assistant response (with code) | 1000-5000 |
| Tool call | 100-300 |
| Tool result | 200-2000 |

### Formula
```typescript
function estimateTokens(messages) {
  let input = 0, output = 0;

  for (const msg of messages) {
    const base = msg.content.length / 4;  // Rough char-to-token
    const adjustment = hasCode(msg) ? 1.5 : 1.0;

    if (msg.role === 'user') input += base * adjustment;
    else output += base * adjustment;
  }

  return { input, output };
}
```

---

## Integration

### Session End Hook

Add to `~/.claude/hooks/session-end.sh`:
```bash
#!/bin/bash
# Track session usage
bun run ~/.claude/skills/BudgetMonitor/Tools/TrackSession.ts \
  --session-file="$1" \
  >> ~/.claude/BUDGET/tracking.log 2>&1
```

### Manual Tracking

```
User: "Track this session"
→ Invokes TrackSession with current session data
→ Returns: "Session recorded: ~$X.XX estimated, Y messages, Z tasks"
```
