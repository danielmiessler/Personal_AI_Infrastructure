---
name: Amber
description: "The idea supply chain — catches a high-quality idea the moment it crosses the principal's attention, preserves it forever in Hindsight (append-only, unconditional), grades it against TELOS, routes it to the right home, and lets it be found again. Capture → Preserve → Grade → Route → Resurface. USE WHEN: amber, capture idea, save this idea, preserve this, keep this thought, search ideas, route ideas, triage captures, what did I save about X. NOT FOR active task state (workspace/ISA), one-shot research (use Research), or curating the typed Knowledge graph directly (use Knowledge)."
effort: medium
---

# Amber — Idea Capture & Preservation

## What It Does

An insect caught in amber is preserved perfectly, permanently, exactly as it was the moment it was caught. Amber is the layer that makes idea-capture permanent: every idea worth catching becomes a browsable, searchable, forever record, graded against what the principal is actually trying to do, and routed to where it belongs. It fixes the failure where ideas get caught but not kept — they land somewhere throwaway, feed one moment, and evaporate.

The order is load-bearing: **preservation happens at capture, not at the end.** The failure being fixed is idea loss *before* routing — so the raw idea is written to the append-only ledger the instant it is caught, unconditionally, before any grader can reject it or any router can drop it. That is write-ahead-log semantics: nothing entering Amber is ever lost, even if everything downstream fails.

## The One Loop

```
             ┌───────────────── RESURFACE ─────────────────┐
             │        hindsight_recall · triage · promote   │
             ▼                                              │
  CAPTURE ─→ PRESERVE ─────→ GRADE ────→ ROUTE ──┬─→ Knowledge entry (promoted)
  (inputs)   Hindsight       score vs   where    ├─→ work issue / project note
             append-only     TELOS      to?      ├─→ newsletter / blog seed
             (retain)                            └─→ feed source (monitor)
```

- **Capture** grabs the raw thing (a URL, a note, a spoken thought, a feed item) with the least possible friction.
- **Preserve** writes it to Hindsight *immediately and unconditionally* — the "caught in amber, forever" guarantee. Everything downstream operates on a record that already exists.
- **Grade** summarizes and scores it — is this good, and good *for what the principal is doing* (TELOS)?
- **Route** answers "where does this belong?" and fans the idea to the destinations it earns.
- **Resurface** is the other half of preservation: an idea never dug back out is a write-only archive. Recall is part of the contract — `hindsight_recall`, triage, and promotion of the best rows into curated Knowledge.

## Hindsight Is the Ledger (Hermes-native)

LifeOS used a Cloudflare-Worker + D1 ledger for the capture contract. **Hermes replaces that with Hindsight retain as the durable, append-only store.** The capture-contract *fields stay identical*; only the substrate changes.

- **Preserve** = `hindsight_retain` with tags `cat:amber`, `source:amber_capture`, and a stable per-capture `document_id: user:aron:amber:{capture_id}` (capture_id = the dedup identity below). The raw capture is retained verbatim in the content payload so it is never lost.
- **Grade** = `hindsight_recall` for TELOS context (tags `cat:telos`), then score the capture against it. Routing is **agent-driven** — this skill reads the grade and decides the destination; there is no Cloudflare Worker.
- **Search / Resurface** = `hindsight_recall` filtered to `cat:amber`.
- **Routed marker** = after routing, `hindsight_retain` the same `document_id` with an added `routed:true` tag (Hindsight replaces the prior facts for that stable id). The raw capture stays immutable in content; the tag records disposition.

## The Capture Contract

Every capture, from any input, is one record. **Preserve these fields exactly** — an input adds itself by emitting this shape, and it inherits preservation, dedup, grading, routing, and resurfacing for free.

| Field | Required | Meaning |
|-------|----------|---------|
| `source` | yes | which input produced it (`manual`, `summarize-hotkey`, `feed`, `lifelog`, …) |
| `external_id` | yes | the input's own id for the item (tweet id, feed item id, url hash) — half the dedup key |
| `url` | url **or** content | normalized source URL |
| `content` | url **or** content | raw text/transcript when there is no URL (spoken thoughts, pasted notes) |
| `captured_at` | yes | when it entered Amber (ISO-8601), not when it was published |
| `content_kind` | yes | `article` \| `video` \| `tweet` \| `paper` \| `note` \| `tool` \| … |
| `title` / `author` | no | when the input knows them |
| `privacy_class` | yes | `public` \| `personal` — gates whether it may cross a local→cloud boundary |

**Contract behavior (non-negotiable):**

- **Write-ahead.** The record is retained *first*, unconditionally, before grading. Nothing is lost if grading or routing fails.
- **Idempotent.** Dedup identity = normalized `url` + content hash (falling back to `source` + `external_id`). The same item arriving via three inputs is one record; a retry never duplicates. This identity *is* the `capture_id` in the `document_id`.
- **Async downstream.** Grade and route run after the write, off the capture path — capture is always fast and never blocks on a model call.
- **Privacy-gated.** A `personal` record never crosses to any cloud/shared surface without an explicit rule.

## Workflow Routing

| Verb / Intent | Workflow | File |
|---------------|----------|------|
| "capture", "save this idea", "preserve this", "keep this thought" | **Capture** | `Workflows/Capture.md` |
| "search ideas", "what did I save about X", "resurface", "find that idea" | **Search** | `Workflows/Search.md` |
| "route", "triage captures", "grade unrouted", "where does this go" | **Route** | `Workflows/Route.md` |

The unattended grading pass is scheduled — see `CRON.md`.

## Gotchas

- **Preserve before grade — always.** Never let a grade or a routing decision gate the retain. If the grader is unavailable, the capture is still preserved; grade later. Reversing the order re-introduces the exact failure Amber exists to fix.
- **The ledger is the source of truth; Knowledge notes are a curated view of its best rows.** Two co-equal histories diverge and rot. Promote from the ledger into Knowledge; never build a parallel history.
- **Dedup on normalized URL + content hash, not the raw URL.** `?utm_*` / `fbclid` variants and re-posts must collapse to one `capture_id`, or the ledger fills with dupes and grading needlessly re-runs.
- **`personal` captures never cross a privacy boundary silently.** The local→cloud analog of the private-data rule — check `privacy_class` before any routing destination that is shared/public.
- **Below-threshold ideas still live forever.** An idea that doesn't clear the grade just hasn't earned a *destination* yet — it stays in the ledger, recallable, permanently. Never discard a low grade.

## Examples

### Example 1 — capture a URL from the terminal
`/skill Amber "capture https://example.com/essay"` → normalize the URL, hash it → `capture_id` → `hindsight_retain` (tags `cat:amber`, `source:amber_capture`, `document_id: user:aron:amber:{hash}`, `privacy_class: public`, `content_kind: article`). Confirm the retain succeeded (provider result) before reporting "preserved". Grading is deferred to the Route pass.

### Example 2 — search everything caught about a topic
`/skill Amber "search ideas about local-first sync"` → `hindsight_recall` filtered to `cat:amber`, ranked by relevance × recency, newest first, with the routed marker shown per row.

### Example 3 — triage the unrouted queue
`/skill Amber "route unrouted captures"` → recall `cat:amber` + `source:amber_capture` without `routed:true`, `hindsight_recall` the TELOS context, grade each against it, fan the ones that clear the threshold to their destination, and re-retain each with `routed:true`.

## Cross-References

- Source doctrine adapted: `LIFEOS/DOCUMENTATION/Amber/AmberSystem.md`
- Memory boundaries + tag taxonomy: `PORT_SCHEMAS/hindsight_memory_schema.md`
- TELOS truth source: `E:/Dropbox/ARON BIJL MSC/TELOS/` (retained under `cat:telos`, `document_id: user:aron:telos`)
- Curated destination: **Knowledge** skill; the loop that operates on captures: **Algorithm** skill
- Unattended grading pass: `CRON.md`
