# DeepDiagnosis Workflow

Full sweep when a quick check isn't enough: chronic slowness, recurring fan noise, degraded-over-time feel.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the DeepDiagnosis workflow in the Vitals skill for a full system diagnosis"}' \
  > /dev/null 2>&1 &
```

Running **DeepDiagnosis** in **Vitals**...

## Ideal state

A complete picture across every subsystem — CPU, memory, GPU, thermal, disk, startup load — with each reading judged against `../Interpretation.md` thresholds, a ranked list of findings (worst first, each with its evidence), and a remediation plan the operator approves item by item. Startup findings distinguish failed agents (non-zero last exit) from merely numerous ones; a large agent count alone is not a finding.

## Tools

```bash
bun ~/.claude/skills/Vitals/Tools/Vitals.ts full --top 15   # everything, no sudo (~4s)
bun ~/.claude/skills/Vitals/Tools/Vitals.ts startup         # launchd agent audit
```

## Optional sudo leg (only with operator consent — never required)

`powermetrics` is the only source for per-process energy impact, CPU frequency/residency, accurate GPU power, and thermal pressure detail. Ask before using; skip cleanly if declined:

```bash
sudo powermetrics -n 1 -i 2000 --samplers tasks,cpu_power,gpu_power,thermal
sudo sfltool dumpbtm    # login items + background task management inventory
```

## Gotchas

- `powermetrics` with no `-n` runs FOREVER — always pass `-n 1` (or `-n 2` for a settle sample).
- On Apple Silicon, `cpu_power` reports per-cluster (E-core/P-core) frequency and residency — E-cores pinned at max with P-cores idle usually means background QoS work, not user-facing load.
