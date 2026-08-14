# HealthCheck Workflow

Quick pass: how is the machine running right now? One screen, verdict first.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the HealthCheck workflow in the Vitals skill to check system health"}' \
  > /dev/null 2>&1 &
```

Running **HealthCheck** in **Vitals**...

## Ideal state

A one-screen report the operator can absorb in ten seconds: an overall verdict (🟢 healthy / 🟡 something's working hard / 🔴 degraded), then per-subsystem lines (CPU load, memory, thermal, disk, top processes) with anything abnormal called out against the thresholds in `../Interpretation.md`. Normal-but-scary-looking readings (high "used" memory, kernel_task) are explicitly de-flagged, not reported as problems.

## Tool

```bash
bun ~/.claude/skills/Vitals/Tools/Vitals.ts check          # human-readable
bun ~/.claude/skills/Vitals/Tools/Vitals.ts check --json   # structured
bun ~/.claude/skills/Vitals/Tools/Vitals.ts check --top 15 # longer process lists
```

Runs in under a second, no sudo. If anything looks off, offer to run the FindCulprit workflow rather than padding this report.
