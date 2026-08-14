# Interpreting macOS Vitals

Reference for turning `Tools/Vitals.ts` output into a diagnosis. Load when running any Vitals workflow.

## Thresholds that matter (and ones that don't)

| Signal | Healthy | Investigate | Why |
|--------|---------|-------------|-----|
| Load per core (1m) | < 0.7 | > 1.0 sustained | Absolute load means nothing without core count |
| Memory pressure level | normal | warning / critical | THE memory signal on macOS — "used %" is meaningless because free RAM is deliberately spent on cache |
| Swap used + swapouts | ~0 growing slowly | growing during use | Swapouts climbing in real time = genuine RAM shortage |
| CPU_Speed_Limit | 100 (or unreported) | < 100 | The machine is literally slowed down; performance complaints while throttled are thermal, not software |
| GPU device utilization | < 60% idle-ish desktop | > 90% with no GPU app running | Points at WindowServer pressure or a runaway GPU consumer |
| Disk capacity | < 85% | > 90% | APFS gets slow and unstable near-full |

## Known processes — don't chase ghosts

| Process | What high usage means | Action |
|---------|----------------------|--------|
| `kernel_task` | Usually thermal management pinning cores to force cooling — NOT a runaway process. Also covers driver work. | Check thermal state, vents, ambient temp — never try to kill it |
| `WindowServer` | Display compositing: many windows/spaces/monitors, screen recording, overlays, high-refresh external displays | Close windows/spaces, check screen-capture apps, reduce transparency |
| `mds_stores` / `mdworker` | Spotlight indexing — heavy after big file changes, migrations, OS updates | Confirm via `mdutil -s /`; it finishes on its own — only exclude dirs if chronic |
| `photoanalysisd` / `mediaanalysisd` | Photos ML scanning; runs when idle on AC | Harmless; pauses when you're active |
| `bird` / `cloudd` / `fileproviderd` | iCloud Drive sync | Heavy only during big syncs |
| `backupd` | Time Machine | Let it finish |
| `corespotlightd` | App-content indexing (Mail, Notes) | Same as Spotlight |
| `syspolicyd` / `XProtect` | Gatekeeper/malware scans after installs | Transient |
| Browser Helper (Renderer) | One tab/extension, not "the browser" | The PID's tab can be found via the browser's own task manager |
| `coreaudiod` | Audio processing; elevated is normal with pro-audio interfaces and DAWs running | Only suspicious with no audio hardware in use |

## Diagnosis shape

A culprit claim needs two evidence classes: the process's own numbers (CPU%/power/RSS from `hogs`) AND a corroborating system signal (throttle state, pressure level, GPU%, swapouts). One `ps` snapshot alone over-indexes on a momentary spike — `hogs` (live second-sample) is the confirming probe.

Remediation is always a recommendation to the operator — a `kill <pid>`, `launchctl bootout`, Spotlight exclusion, or app setting — never executed by the skill unprompted (see skill Anti-claims).
