---
name: Vitals
version: 1.0.0
description: "macOS system performance diagnostics — see how the machine is running and what's slowing it down: CPU/GPU/memory/energy hogs, thermal throttling, memory and swap pressure, disk usage, Spotlight indexing, launchd/startup load, via a deterministic read-only CLI with known-process interpretation (kernel_task, WindowServer, mds_stores). USE WHEN mac slow, system slow, what's slowing down my mac, computer is slow, what's eating CPU, CPU usage, GPU usage, what's using the GPU, memory pressure, RAM usage, swap, runaway process, fans loud, mac running hot, thermal throttling, system health, check my mac, how's my system running, top processes, energy hogs, activity monitor, startup items, launch agents load, system taxed. NOT FOR network/wifi diagnostics, website or deployed-app health monitoring, or security scanning."
---

# Vitals

Read-only macOS performance inspection: a deterministic CLI gathers the numbers, `Interpretation.md` turns them into a diagnosis instead of a data dump.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Vitals/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running WORKFLOWNAME in Vitals"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**: `Running **WorkflowName** in **Vitals**...`

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **HealthCheck** | "how's my system", "check my mac", "system health" | `Workflows/HealthCheck.md` |
| **FindCulprit** | "mac is slow", "what's eating CPU/GPU/memory", "fans loud" | `Workflows/FindCulprit.md` |
| **DeepDiagnosis** | "full diagnosis", "deep check", chronic/recurring slowness | `Workflows/DeepDiagnosis.md` |

**Interpretation reference (load with any workflow):** `Interpretation.md` — thresholds, known-process table, diagnosis shape.

## Quick Reference

```bash
bun ~/.claude/skills/Vitals/Tools/Vitals.ts check     # fast snapshot (<1s)
bun ~/.claude/skills/Vitals/Tools/Vitals.ts hogs      # live per-process CPU/energy (~3s)
bun ~/.claude/skills/Vitals/Tools/Vitals.ts full      # everything (~4s)
# also: gpu · memory · disk · thermal · startup · --json · --top N
```

The tool is read-only by contract: it never kills, renices, unloads, or writes system state. Remediation is recommended to the operator, never executed by the skill.

## Examples

**Example 1: Something feels slow**
```
User: "My Mac is dragging, what's going on?"
→ FindCulprit: run hogs + check + gpu
→ Cross-reference Interpretation.md (is the hog a known background process?)
→ Report: named culprit with two evidence classes, recommended action for approval
```

**Example 2: Routine check**
```
User: "How's my system doing?"
→ HealthCheck: run check
→ One-screen verdict: 🟢/🟡/🔴 per subsystem, abnormalities flagged against thresholds
```

**Example 3: Fans blasting**
```
User: "Why are my fans so loud?"
→ FindCulprit: thermal + hogs + gpu
→ If kernel_task is the top consumer: that IS the cooling response — report the thermal cause, not the process
```

## Gotchas

- **`top`'s first sample is garbage** — CPU% is cumulative since boot. The tool always runs `-l 2` and parses the SECOND sample; never "optimize" this away.
- **`ps -m` does not reliably sort by memory** on modern macOS (observed mis-ordering by GB-scale RSS). The tool sorts in code; keep it that way.
- **`kernel_task` high CPU is the thermal system working**, not a runaway process — it pins cores to force cooling. Never recommend killing it.
- **macOS "used" memory is not a problem signal.** Free RAM is deliberately spent on cache; `kern.memorystatus_vm_pressure_level` (1 normal / 2 warning / 4 critical) and live swapouts are the real signals.
- **`powermetrics` requires sudo and runs forever without `-n`.** It's the only accurate source of per-process energy and GPU power — keep it as the optional consent-gated leg in DeepDiagnosis.
- **`top -l` truncates command names** (~16 chars) regardless of COLUMNS in logging mode. Use the PID to identify the full process (`ps -p <pid> -o comm=`).
- **GPU via `ioreg -c IOAccelerator` works without sudo on Apple Silicon** (`Device Utilization %` in PerformanceStatistics) but is not guaranteed on every GPU — the tool degrades to an explicit unavailable-message, never a silent blank.
- **`pmset -g therm` may not report `CPU_Speed_Limit` on desktops** — the tool treats a missing key as not-throttled rather than erroring.
