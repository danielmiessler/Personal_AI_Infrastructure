---
name: TokenAnalysis
description: "Token consumption analysis and ComplexityRouter effectiveness dashboard. USE WHEN token analysis, token consumption, routing stats, cost analysis, model efficiency, token usage, how much tokens, routing effectiveness, savings report."
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/PAI/USER/SKILLCUSTOMIZATIONS/TokenAnalysis/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running TokenAnalysis to show token consumption and routing effectiveness"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **TokenAnalysis** skill to analyze token consumption and routing effectiveness...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# TokenAnalysis

Analyzes token consumption across all sessions, showing ComplexityRouter tier
distribution, average costs per tier, and estimated savings vs a flat-Sonnet baseline.

## Workflow Routing

Route to the appropriate workflow based on the request.

| Trigger | Workflow | Description |
|---------|----------|-------------|
| report, show, stats, dashboard, analyze, how much, consumption, effectiveness | `Workflows/Report.md` | Full routing dashboard with cost breakdown |
| reset, clear, wipe, start fresh, restart tracking | `Workflows/Reset.md` | Clear accumulated metrics data |

**Default (no explicit trigger) → `Workflows/Report.md`**

## Examples

**Show dashboard:**
```
/TokenAnalysis
/TokenAnalysis report
/TokenAnalysis how much tokens am I using
```

**Clear data:**
```
/TokenAnalysis reset
/TokenAnalysis clear metrics
```

## Boundaries

**Will:**
- Read and display routing-metrics.jsonl data
- Show tier distribution, avg tokens, estimated costs
- Clear metrics file on request (with confirmation)

**Will Not:**
- Modify token usage or routing behavior
- Access billing APIs or external cost services
- Show per-conversation breakdowns (only aggregate)
