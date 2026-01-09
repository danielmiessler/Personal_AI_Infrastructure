# AlertStatus Workflow

**Purpose:** Check the detailed status of a specific alert rule, including its current state, associated alerts, and configuration.

**Triggers:** alert status, check alert, is alert firing, status of alert, alert details, alert rule status, what's happening with alert, why is alert firing

---

## Steps

1. **Parse the user's request** to identify:
   - The alert name or partial name they're asking about
   - Whether they want rule configuration or current alert instances
   - Any specific group they're interested in

2. **Look up the alert rule:**

   List all rules to find the one matching the name:
   ```bash
   bun run Tools/rules.ts
   ```

   Filter by specific group if known:
   ```bash
   bun run Tools/rules.ts --group <group-name>
   ```

   Filter by state to find firing rules:
   ```bash
   bun run Tools/rules.ts --state firing
   ```

   Get detailed JSON for parsing:
   ```bash
   bun run Tools/rules.ts --format json
   ```

3. **Cross-reference with active alerts:**

   Check if this rule has active alerts:
   ```bash
   bun run Tools/alerts.ts --state firing --format json
   ```

4. **If deeper investigation needed, query the underlying metric:**

   ```bash
   bun run Tools/query.ts "<alert_expression>"
   ```

5. **Present comprehensive status:**
   - Rule name and group
   - Current state (inactive/pending/firing)
   - Number of active alerts from this rule
   - How long it's been in current state
   - The PromQL expression (so user understands what triggers it)
   - Current metric values if relevant

---

## Examples

**Example 1: Check specific alert status**
```
User: "Is the HighMemoryUsage alert firing?"

Process:
1. Parse: User wants status of "HighMemoryUsage" alert
2. Run: bun run Tools/rules.ts --format json
3. Filter JSON output for rule named "HighMemoryUsage"
4. Run: bun run Tools/alerts.ts --state firing --format json
5. Check if any alerts match "HighMemoryUsage"
6. Return: "HighMemoryUsage is currently [state]. [X] instance(s) affected."
```

**Example 2: Why is an alert firing?**
```
User: "Why is DiskSpaceLow firing?"

Process:
1. Parse: User wants explanation of firing alert
2. Run: bun run Tools/rules.ts --format json
3. Find "DiskSpaceLow" rule and extract its expression
4. Run: bun run Tools/query.ts "<extracted_expression>"
5. Run: bun run Tools/alerts.ts --state firing --format json
6. Return: "DiskSpaceLow is firing because: [expression evaluation shows X]. Affected instances: [list]"
```

**Example 3: Check all alerts in a group**
```
User: "What's the status of the infrastructure alerts?"

Process:
1. Parse: User wants alerts from "infrastructure" group
2. Run: bun run Tools/rules.ts --group infrastructure
3. Return: Summary of all rules in that group with their states
```

**Example 4: Detailed alert investigation**
```
User: "Give me details on the APILatencyHigh alert"

Process:
1. Parse: User wants comprehensive details
2. Run: bun run Tools/rules.ts --format json
3. Extract rule: name, group, expression, for duration, labels, annotations
4. Run: bun run Tools/query.ts "<rule_expression>"
5. Run: bun run Tools/alerts.ts --format json | filter for this alert
6. Return:
   - Rule configuration (threshold, for duration)
   - Current metric value vs threshold
   - Alert instances with their labels
   - How long each instance has been alerting
```

**Example 5: Check if alert has fired recently**
```
User: "Has NodeDown fired in the last hour?"

Process:
1. Parse: User wants historical/current state of NodeDown
2. Run: bun run Tools/rules.ts --format json
3. Check if NodeDown is currently firing/pending
4. If inactive, note when it was last active (if available in alert data)
5. Return: Current state and any recent activity
```

**Example 6: All firing rules summary**
```
User: "Which alert rules are currently firing?"

Process:
1. Parse: User wants list of firing rules
2. Run: bun run Tools/rules.ts --state firing
3. Return: List of firing rules with alert counts
```

---

## Understanding Alert Rule Output

The rules.ts tool returns:

| Field | Meaning |
|-------|---------|
| NAME | The alert rule name (what you reference) |
| GROUP | The rule group (organizational unit) |
| STATE | inactive/pending/firing |
| ALERTS | Number of alert instances from this rule |

A rule with STATE=firing and ALERTS=3 means the rule triggered for 3 different label combinations (e.g., 3 different hosts).

---

## Error Handling

- **Alert not found** - The alert name may be misspelled or the rule doesn't exist. Run `bun run Tools/rules.ts` to list all available rules and suggest similar names.
- **Rule exists but no alerts** - The rule is defined but condition isn't met. This is normal - explain the threshold and current metric value.
- **Multiple rules with similar names** - Ask user to clarify which specific rule they mean, or show all matches.
- **Rule group not found** - List available groups with `bun run Tools/rules.ts` and show unique group names.

---

## Deep Dive Investigation

When a user needs to understand why an alert is (or isn't) firing:

1. **Get the rule expression** from rules.ts JSON output
2. **Query the current metric value** using query.ts
3. **Compare against threshold** in the expression
4. **Check "for" duration** - alert may be pending but not yet firing
5. **Review labels** - alert may fire for some instances but not others

Example investigation:
```bash
# 1. Get rule details
bun run Tools/rules.ts --format json

# 2. From JSON, extract expression (e.g., "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1")

# 3. Query current value
bun run Tools/query.ts "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes"

# 4. Result shows 0.15 - above 0.1 threshold, so alert is not firing
```

---

## Notes

- Alert rules define WHEN to alert; alerts are the INSTANCES of those rules firing
- A single rule can produce multiple alerts (one per unique label set)
- The "for" duration must pass before pending becomes firing
- Rules are evaluated at the global evaluation interval (typically 15-60 seconds)
- If a rule is missing, it may need to be added to the Prometheus configuration
