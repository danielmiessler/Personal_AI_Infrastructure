# Conduit — Cron Specs

Two Hermes cron jobs replace the LifeOS launchd services (`com.lifeos.conduit` every 120s, `com.lifeos.conduit.insight` hourly). Both are Windows-native and run Python scripts. Capture is high-frequency and deterministic; rollup is once-daily and deterministic. Neither needs an LLM.

## Job 1: `conduit-capture` (every 2 minutes)

Runs one poll of the enabled adapters, appends events to `$HERMES_HOME/conduit/events.jsonl`. Deterministic — no agent, no model.

| Field | Value |
|-------|-------|
| **name** | `conduit-capture` |
| **schedule** | every 2 minutes (`*/2 * * * *`) |
| **deliver** | `local` |
| **enabled_toolsets** | `["terminal", "file", "memory"]` |
| **no_agent** | `true` (pure script — no LLM needed) |
| **script** | `python "$HERMES_HOME/skills/Conduit/Tools/capture.py"` |

```
hermes cron create --name conduit-capture --schedule "*/2 * * * *" --deliver local \
  --toolsets terminal,file,memory --no-agent \
  --script 'python "%HERMES_HOME%/skills/Conduit/Tools/capture.py"'
```

## Job 2: `conduit-rollup` (daily at midnight)

Builds the deterministic daily record from the day's events, writes `daily/{date}.{md,json}`, and retains the record to Hindsight (`cat:conduit`, `source:conduit_daily`, `document_id: user:aron:conduit:daily:{date}`). Deterministic — no agent, no model in the compute path; the single external write is the Hindsight retain.

| Field | Value |
|-------|-------|
| **name** | `conduit-rollup` |
| **schedule** | daily at 00:00 (`0 0 * * *`) |
| **deliver** | `local` |
| **enabled_toolsets** | `["terminal", "file", "memory"]` |
| **no_agent** | `true` (deterministic rollup — no LLM needed) |
| **script** | `python "$HERMES_HOME/skills/Conduit/Tools/rollup.py"` |

```
hermes cron create --name conduit-rollup --schedule "0 0 * * *" --deliver local \
  --toolsets terminal,file,memory --no-agent \
  --script 'python "%HERMES_HOME%/skills/Conduit/Tools/rollup.py"'
```

## Notes

- **Missed midnight is fine.** If the machine is off at 00:00, the rollup fires on next boot. `rollup.py` targets a specific date and is idempotent — re-running overwrites the same `daily/{date}.{md,json}` and re-retains the same stable `document_id`, so no duplication.
- **`memory` toolset on `conduit-rollup`** is required because `rollup.py` performs the Hindsight retain (via the `hermes` CLI; a durable `retain-queue.jsonl` fallback catches the record if the CLI is unavailable).
- **Privacy.** Both jobs are `deliver: local`; all data stays under `$HERMES_HOME/conduit/`. Disable any source in `config.json` (`appFocus`/`git`/`hermesSession`), or set `enabled: false` as the kill switch.
- **Path variable.** Use whatever `$HERMES_HOME` expansion the Hermes cron runner supports on Windows (`%HERMES_HOME%` shown above); if the runner does not expand it, substitute the absolute path.
