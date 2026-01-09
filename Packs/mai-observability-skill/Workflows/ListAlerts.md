# ListAlerts Workflow

**Purpose:** List active, firing, or pending alerts from Prometheus Alertmanager with optional filtering by state and severity.

**Triggers:** list alerts, show alerts, what alerts are firing, any alerts, active alerts, check alerts, alert status, are there any problems, what's alerting

---

## Steps

1. **Parse the user's request** to identify:
   - Desired alert state filter (firing, pending, inactive, or all)
   - Desired severity filter (critical, warning, info, or all)
   - Output format preference (table for readability, JSON for processing)

2. **Determine filter parameters:**
   - If user mentions "firing" or "active problems" - filter by state=firing
   - If user mentions "pending" or "about to fire" - filter by state=pending
   - If user mentions "critical" or "urgent" - filter by severity=critical
   - If user mentions "warnings" - filter by severity=warning
   - If no filter specified - show all alerts

3. **Execute the alerts command:**

   List all alerts:
   ```bash
   bun run Tools/alerts.ts
   ```

   Filter by state:
   ```bash
   bun run Tools/alerts.ts --state firing
   bun run Tools/alerts.ts --state pending
   bun run Tools/alerts.ts --state inactive
   ```

   Filter by severity:
   ```bash
   bun run Tools/alerts.ts --severity critical
   bun run Tools/alerts.ts --severity warning
   bun run Tools/alerts.ts --severity info
   ```

   Combine filters:
   ```bash
   bun run Tools/alerts.ts --state firing --severity critical
   ```

   JSON output:
   ```bash
   bun run Tools/alerts.ts --format json
   ```

4. **Interpret and present results:**
   - Highlight critical/firing alerts prominently
   - Group by severity if mixed results
   - Include "active since" duration for context
   - Summarize total counts by state/severity

---

## Alert States

| State | Meaning |
|-------|---------|
| `firing` | Alert condition is true and has exceeded the "for" duration. Notifications are being sent. |
| `pending` | Alert condition is true but hasn't exceeded the "for" duration yet. Will fire soon if condition persists. |
| `inactive` | Alert condition is currently false. No action needed. |

## Alert Severities

| Severity | Typical Response |
|----------|------------------|
| `critical` | Immediate attention required. Service impacting. |
| `warning` | Should be investigated soon. May become critical. |
| `info` | Informational. No immediate action needed. |

---

## Examples

**Example 1: Quick health check**
```
User: "Are there any alerts firing?"

Process:
1. Parse: User wants to know about active problems
2. Run: bun run Tools/alerts.ts --state firing
3. Return: List of firing alerts or "No alerts firing - all clear"
```

**Example 2: All active alerts**
```
User: "Show me all alerts"

Process:
1. Parse: User wants complete alert list
2. Run: bun run Tools/alerts.ts
3. Return: Full alert list with state and severity breakdown
```

**Example 3: Critical issues only**
```
User: "What critical alerts are there?"

Process:
1. Parse: Filter by critical severity
2. Run: bun run Tools/alerts.ts --severity critical
3. Return: Critical alerts only, regardless of state
```

**Example 4: Pending alerts (early warning)**
```
User: "What alerts are about to fire?"

Process:
1. Parse: User wants pending alerts
2. Run: bun run Tools/alerts.ts --state pending
3. Return: Pending alerts that will fire if conditions persist
```

**Example 5: Critical and firing (urgent issues)**
```
User: "Show me urgent problems that need immediate attention"

Process:
1. Parse: User wants critical + firing combination
2. Run: bun run Tools/alerts.ts --state firing --severity critical
3. Return: Only the most urgent alerts requiring immediate action
```

**Example 6: JSON for automation**
```
User: "Get alerts in JSON format for my script"

Process:
1. Parse: JSON output requested
2. Run: bun run Tools/alerts.ts --format json
3. Return: Raw JSON array of alert objects
```

**Example 7: Warnings to review**
```
User: "What warnings should I look at?"

Process:
1. Parse: Warning severity filter
2. Run: bun run Tools/alerts.ts --severity warning --state firing
3. Return: Active warnings that haven't escalated to critical
```

---

## Error Handling

- **"No alerts found"** - This is good news! The system has no alerts matching your criteria. Confirm with user this is expected.
- **Connection refused / timeout** - Alertmanager may be down. Run `bun run Tools/health.ts` to check provider status. This itself may warrant an alert.
- **Empty response with no error** - Provider may be healthy but no alert rules are configured. Use `bun run Tools/rules.ts` to verify alert rules exist.
- **Stale alerts (firing for days)** - May indicate ignored alerts or notification issues. Recommend reviewing alert routing.

---

## Follow-up Actions

After listing alerts, users commonly want to:

1. **Get more details on a specific alert** - Use AlertStatus workflow with the alert name
2. **Check the underlying metric** - Use QueryMetrics workflow with the alert's expression
3. **See related targets** - Use TargetHealth workflow to check if scrape targets are healthy
4. **Silence an alert** - Not supported via CLI (use Alertmanager UI)

---

## Notes

- Alerts are separate from alert rules. An alert is an instance of a firing/pending rule.
- Multiple alerts can fire from the same rule with different labels (e.g., one per instance)
- The "active since" timestamp shows when the alert first entered its current state
- Pending alerts reset their timer if the condition becomes false, even briefly
