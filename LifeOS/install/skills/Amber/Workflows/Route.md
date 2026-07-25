# Amber · Route

Grade unrouted captures against TELOS and fan each to the destination it earns. Runs on demand or unattended (see `CRON.md`). Grade and route are conceptually distinct stages but are fused into one pass here.

## Input

None required (defaults to the full unrouted queue), or a specific `capture_id` to (re-)route.

## Steps

1. **Pull the unrouted queue.** `hindsight_recall` for `cat:amber` + `source:amber_capture` **without** the `routed:true` tag. Each is a preserved capture that has not yet earned a destination.

2. **Load TELOS context once.** `hindsight_recall` for `cat:telos` (the projection of `E:/Dropbox/ARON BIJL MSC/TELOS/` retained under `document_id: user:aron:telos`). This is the rubric — *good for what the principal is actually trying to do*, not just *good*. Read live; do not cache a stale copy.

3. **Grade each capture** against TELOS. Produce, per capture:
   - a one-way classification into exactly one route:
     `knowledge | learning | help_understand | project_integration | tech_upgrade | telos_modification | work_item | reminder | blog_seed | none`
   - a score / confidence (0–1).
   - Keep it cheap — this is a Haiku-tier judgment, not a deep analysis.

4. **Check the privacy gate.** A `personal` capture may only route to a local/private destination. Never fan a `personal` item to a shared or public surface.

5. **Route the ones that clear the threshold** (start ~score ≥ 0.7 / classifier confidence ≥ 0.7 *and* an action-shaped class). Destinations (Hermes v1):
   - `knowledge` / `blog_seed` / `help_understand` → promote into a curated **Knowledge** entry (`hindsight_retain` with `cat:knowledge` added, keeping the same `document_id`).
   - `work_item` → an explicit routing report line proposing a work-queue item (full work-issue integration is deferred in v1).
   - `project_integration` → an explicit routing report line proposing a project note.
   - `none` / below threshold → **no destination**; the capture stays in the ledger forever, recallable — never discarded.

6. **Mark routed.** For each routed capture, `hindsight_retain` the same `document_id: user:aron:amber:{capture_id}` with an added `routed:true` tag and the chosen route recorded. Hindsight replaces the prior facts for that stable id; the raw capture content stays immutable.

7. **Idempotency.** A capture already tagged `routed:true` is skipped. Re-routing a specific `capture_id` is allowed only when explicitly requested.

## Output

A routing report:
```
Amber route — {N} graded, {R} routed, {S} below-threshold (kept in ledger)
 → {capture_id[:10]}  {class}  score {x.xx}  → {destination}
 · {capture_id[:10]}  none     score {x.xx}  → kept (unrouted)
```
Every routed row names its destination; every kept row names why it stayed. No capture is ever dropped.
