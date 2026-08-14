# FindCulprit Workflow

"Why is my Mac slow right now?" — name the specific thing taxing the system, with evidence.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the FindCulprit workflow in the Vitals skill to find what is slowing the system"}' \
  > /dev/null 2>&1 &
```

Running **FindCulprit** in **Vitals**...

## Ideal state

A named culprit (or an explicit "nothing is actually wrong — here's what you noticed and why it's normal"), where every culprit claim carries two evidence classes per `../Interpretation.md` § Diagnosis shape: the process's live numbers AND a corroborating system signal. Known macOS background processes are identified as such (Interpretation.md § Known processes) so the operator never kills Spotlight indexing or kernel_task thinking it's malware. The report ends with a specific recommended action per culprit — a command or setting change — offered for approval, never pre-executed.

## Tools

```bash
bun ~/.claude/skills/Vitals/Tools/Vitals.ts hogs      # live CPU + energy, second-sample (~3s)
bun ~/.claude/skills/Vitals/Tools/Vitals.ts check     # system context: load, pressure, thermal, disk
bun ~/.claude/skills/Vitals/Tools/Vitals.ts gpu       # GPU utilization (no sudo)
```

## Intent-to-Flag Mapping

| User Says | Command |
|-----------|---------|
| "what's eating my CPU" | `hogs` |
| "what's eating my memory" / "RAM" | `check` (TOP MEMORY section) + `memory` |
| "GPU" / "graphics" / "fans on a video call" | `gpu` + `hogs` |
| "everything" / "slow and I don't know why" | `check` + `hogs` + `gpu` |
| "JSON" / scripted use | append `--json` |

## Gotcha

A browser "Helper (Renderer)" hog is one tab or extension, not the browser — point the operator at the browser's own task manager with the PID to find which.
