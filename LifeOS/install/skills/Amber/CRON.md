# Amber — Router Cron Spec

Self-contained Hermes cron spec for the unattended grading pass. Replaces the LifeOS `com.lifeos.amberroute` launchd service (every 30 min). Grades unrouted Amber captures against TELOS and routes them to their destinations. Follows the shape of the existing `lifeos-wisdom-synthesis` cron (periodic, `deliver: local`, Hindsight recall + retain).

## Job: `amber-route`

| Field | Value |
|-------|-------|
| **name** | `amber-route` |
| **schedule** | every 30 minutes (`*/30 * * * *`) |
| **deliver** | `local` (no external delivery — routing report stays on this machine) |
| **enabled_toolsets** | `["memory"]` (Hindsight recall + retain only) |
| **no_agent** | `false` — grading is a model judgment (needs an agent turn) |
| **model** | Haiku-tier — cheap grading, ~$0.05/day |

## Prompt (paste into `hermes cron create`)

```
Run the Amber Route pass (skills/Amber/Workflows/Route.md).

1. hindsight_recall for cat:amber + source:amber_capture WITHOUT the routed:true tag —
   this is the queue of preserved captures that have not yet earned a destination.
   If the queue is empty, report "0 unrouted captures" and stop (no writes).

2. hindsight_recall once for cat:telos (document_id: user:aron:telos) — the live TELOS
   rubric. Grade "good for what the principal is actually trying to do", not just "good".

3. For each unrouted capture, grade against TELOS: classify into exactly one of
   knowledge | learning | help_understand | project_integration | tech_upgrade |
   telos_modification | work_item | reminder | blog_seed | none, with a 0–1 confidence.
   Keep it cheap — this is a Haiku-tier judgment.

4. Respect the privacy gate: a privacy_class:personal capture may only route to a
   local/private destination, never a shared or public one.

5. Route the ones that clear the threshold (confidence >= 0.7 AND an action-shaped class):
   - knowledge / blog_seed / help_understand -> hindsight_retain the same
     document_id with cat:knowledge added (promote into curated Knowledge).
   - work_item / project_integration -> a routing-report line proposing the item
     (full work-issue integration deferred in v1).
   - none / below threshold -> no destination; the capture stays in the ledger,
     recallable forever. NEVER discard.

6. Mark each routed capture: hindsight_retain the same
   document_id: user:aron:amber:{capture_id} with an added routed:true tag and the
   chosen route recorded. The raw capture content stays immutable.

7. Emit a routing report: N graded, R routed, S kept-in-ledger, one line per capture
   naming its destination or why it stayed.
```

## Cost & safety notes

- **~$0.05/day.** 48 runs/day, Haiku-tier, most runs grade an empty or tiny queue and exit early (step 1 short-circuit). Cost is bounded by capture volume, not schedule.
- **Idempotent.** A capture tagged `routed:true` is skipped on every subsequent run — the pass never double-routes.
- **Fail-safe.** If TELOS recall fails, skip grading this cycle (captures stay preserved and unrouted); the next run retries. Preservation already happened at capture time — the cron only ever *adds* a destination, never risks the raw record.
- **Local-only.** `deliver: local`; no external side effects beyond Hindsight retains and the promoted Knowledge entries.

## Register

```
hermes cron create --name amber-route --schedule "*/30 * * * *" --deliver local \
  --toolsets memory --prompt-file skills/Amber/CRON.md
```
