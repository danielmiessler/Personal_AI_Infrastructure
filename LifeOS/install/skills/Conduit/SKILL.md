---
name: Conduit
description: "The sensory layer — the current-state pole of the current→ideal loop. A local, continuous, opt-in capture layer that records where attention actually goes (active window, git commits, Hermes sessions), rolls it into a deterministic daily record, and feeds that record to Hindsight and the TELOS gap. USE WHEN: conduit, what am I actually doing, attention audit, daily review, where did my time go, current-state capture. NOT FOR editing goals/ideal state (use Telos) or preserving ideas (use Amber)."
effort: medium
---

# Conduit — LifeOS's Sensory Layer

## What It Does

LifeOS has always known the principal's **ideal state** (TELOS) but not their **actual state** — what they do day to day — so it could not answer "are we working on the right stuff?" Conduit gives LifeOS eyes: a local, continuous, opt-in capture layer that records where attention actually goes, rolls it into a daily record, and feeds that record to the memory (Hindsight) and TELOS systems. It hands the principal their own attention back.

## Design Principles

- **A mirror you pull, not a watcher that pushes.** Conduit hands you your attention back; it never volunteers a verdict and never produces a single alignment "score" (that just invites gaming — Meadows LP3). Distribution + record; you judge.
- **Perception feeds the existing loop.** Conduit is one new input that makes memory curation, TELOS state, and the Algorithm smarter — not a second dashboard.
- **Highest signal tier per source.** Where a source has an API/log (git, Hermes sessions), read the account/log, not pixels.
- **Stable by construction.** v1 is deterministic — no model, no cloud, no long-lived daemon. Stateless cron polls, fault-isolated adapters, a pure rollup.
- **Privacy is absolute.** All data under `$HERMES_HOME/conduit/`, on this machine, never leaves it. No keystrokes, no message content.

## Windows/Hermes Adaptation

LifeOS Conduit polled via macOS **launchd** and captured the front app via `osascript`. The Hermes port keeps the event schema, the rollup logic, and the TELOS-gap invariant **unchanged**, and swaps the platform layer:

| LifeOS (macOS) | Hermes (Windows) |
|----------------|------------------|
| launchd `com.lifeos.conduit` every 120s | Hermes cron `conduit-capture` every 2 min (see `CRON.md`) |
| launchd `com.lifeos.conduit.insight` hourly | Hermes cron `conduit-rollup` daily (deterministic — no hourly model call in v1) |
| `osascript` front-app (`appFocus`) | `ctypes` + `user32.dll` active-window title, PowerShell fallback (`Tools/capture.py`) |
| `git` adapter (unchanged concept) | `git log` over configured repos, Windows paths (`Tools/capture.py`) |
| `claudeSession` reads `MEMORY/STATE/work-events.jsonl` | `hermesSession` reads `$HERMES_HOME/sessions/` recent session files |
| Bun/TypeScript CLI (`conduit.ts`) | Python stdlib scripts (`Tools/capture.py`, `Tools/rollup.py`) |

## Adapters (fault-isolated)

Each adapter is isolated in its own try/except so one failure never blocks the others.

- **appFocus** — the foreground window title, captured once per poll. `ctypes.windll.user32.GetForegroundWindow` + `GetWindowText`; PowerShell `Get-Process | Where MainWindowTitle` fallback. Emits `type: "app-focus"`, `app: <process/window>`. Handles "no window focused" gracefully.
- **git** — new commits across configured repos since the last capture. `git -C <repo> log --since=<cursor>`; each commit files under its author-date. Emits `type: "git-commit"`, `repo: <basename>`, `detail.sha`, `detail.subject`. A per-repo cursor advances only when every repo scans cleanly.
- **hermesSession** — Hermes session activity since the last capture, read from `$HERMES_HOME/sessions/`. The Hermes-native replacement for `claudeSession` (which read `work-events.jsonl`). Emits `type: "hermes-session"`, `detail.events`, `detail.lastSlug`.

## Event Schema

One JSONL line per captured signal — spans + metadata only, never keystrokes or content. Written to `$HERMES_HOME/conduit/events.jsonl`.

```json
{ "ts": "ISO-8601 UTC", "type": "app-focus|git-commit|hermes-session",
  "source": "adapter id", "app": "…", "repo": "…", "detail": { } }
```

## Deterministic Rollup

`rollup.py` is a **pure function**: input events → daily record, no side effects, no model. Each app-focus event contributes one poll interval to its app's time (a sleep gap never inflates time — no polls fire while the machine is off). The classifier splits apps into **creation / consumption / neutral** by a static, editable map. `narrative` and `telosTags` are reserved seams, null/empty in v1. It writes `$HERMES_HOME/conduit/daily/{date}.md` (human) and `{date}.json` (machine), idempotently, and retains the record to Hindsight (`cat:conduit`, `source:conduit_daily`, `document_id: user:aron:conduit:daily:{date}`).

## Integration with TELOS (current → ideal)

- **Invariant:** TELOS owns ideal state, Conduit owns observed state — **neither writes the other's file.** They meet only at the gap computation. Conduit may never edit a goal.
- **Read side:** the rollup reads live TELOS (via `hindsight_recall cat:telos`) as its rubric — no cached goal copy, so a TELOS change is picked up on the next rollup (no drift).
- **Write side:** Conduit writes the daily record to Hindsight; the gap between observed (Conduit) and ideal (TELOS) is computed separately, downstream.

## CLI

```
python skills/Conduit/Tools/capture.py     # run enabled adapters once, append events
python skills/Conduit/Tools/rollup.py [date]   # build + persist + retain the daily record (default: today)
python skills/Conduit/Tools/rollup.py --today  # print today's live distribution (not persisted)
python skills/Conduit/Tools/capture.py --status  # config + today's event count
```

Scheduling (capture every 2 min, rollup daily) is in `CRON.md`.

## Configuration (`$HERMES_HOME/conduit/config.json`)

```json
{ "enabled": true, "pollIntervalSec": 120,
  "sources": { "appFocus": true, "git": true, "hermesSession": true },
  "repos": [], "retentionDays": 30 }
```

Per-source opt-in is first-class. `repos` is the list of absolute Windows paths watched for commits. Raw events older than `retentionDays` are pruned after rollup; daily records are kept.

## Privacy Contract

- Local-only; all data under `$HERMES_HOME/conduit/`; nothing leaves the machine.
- Per-source opt-in; disable any source in config. Kill switch: `enabled: false`.
- Tiered retention: raw discarded after `retentionDays`; daily record kept.
- No message content, no keystrokes. Window *titles* are captured (v1 Windows tradeoff — see Gotchas); disable `appFocus` to exclude them.

## Gotchas

- **Window titles can leak context.** Unlike the macOS v1 (front-app name only), the Windows `ctypes` path reads the full window *title*, which may contain a document name or URL. This is a deliberate v1 tradeoff for signal; it is captured locally only and never leaves the machine. Disable `appFocus` in config to exclude titles entirely.
- **`ctypes` may return an empty title** when no window has focus or for elevated windows without permission. `capture.py` treats empty as "no focus" and skips the event — it never guesses, and it never blocks the other adapters. The PowerShell fallback is slower but more robust; document the tradeoff, don't hide it.
- **Advance the git cursor only on a clean full scan.** If any configured repo fails to scan, do not advance the cursor — otherwise commits in the un-scanned window are silently skipped. The rollup de-dupes the re-scan overlap by SHA.
- **The rollup must stay pure.** No model calls, no network. The only external write is the Hindsight retain at the very end. A rollup that calls a model is no longer deterministic or idempotent.
- **Conduit never edits TELOS.** The gap is computed downstream; the invariant is one-directional. Writing a goal from an observation is a boundary violation.

## Examples

### Example 1 — "what am I actually doing today?"
`python Tools/rollup.py --today` → prints today's live deterministic distribution (time per app, creation/consumption ratio, commit + session counts) without persisting. Nothing is graded — the principal reads the mirror and judges.

### Example 2 — the scheduled loop
`conduit-capture` cron fires `capture.py` every 2 min, appending events to `events.jsonl`. At midnight `conduit-rollup` fires `rollup.py`, which builds the pure daily record, writes `daily/{date}.{md,json}`, and retains it to Hindsight — feeding the next day's memory curation and the TELOS gap.

## Cross-References

- Source doctrine adapted: `LIFEOS/DOCUMENTATION/Conduit/ConduitSystem.md`
- Scheduling: `CRON.md`
- Capture / rollup scripts: `Tools/capture.py`, `Tools/rollup.py`
- Memory boundaries + tags: `PORT_SCHEMAS/hindsight_memory_schema.md`
- Ideal-state counterpart: **Telos** skill; the loop that consumes the gap: **Algorithm** skill
