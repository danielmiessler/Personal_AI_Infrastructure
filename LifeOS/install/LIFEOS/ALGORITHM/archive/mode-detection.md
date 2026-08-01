---
status: RETIRED 2026-07-11 — historical doctrine. Modes/tiers were abolished with Algorithm v8 and system prompt v3.0.0 (one adaptive format). Kept as record only; nothing routes here.
last_updated: 2026-05-13
last_updated_by: da
convention: pai-freshness-v1
status: redirect
---

# Mode Detection — Moved

> **This file has moved.** Canonical mode reference is now at [`modes/README.md`](modes/README.md), with one file per mode in [`modes/`](modes/).
>
> Reason: the prior structure had Algorithm-internal modes here, with `ideate-loop.md` and `optimize-loop.md` holding per-mode doctrine separately. Three files with overlapping content. The 2026-05-13 reorg consolidated into a `modes/` directory with one file per mode, and added [`modes/loop.md`](modes/loop.md) for the Loop-Goal compression.

## Where things live now

- **Canonical reference & taxonomy:** [`modes/README.md`](modes/README.md)
- **Per-mode docs:**
  - [`modes/iterate.md`](modes/iterate.md) — default mode + fast-path + research compression
  - [`modes/optimize.md`](modes/optimize.md) — eval/metric-driven refinement (was `optimize-loop.md`)
  - [`modes/ideate.md`](modes/ideate.md) — 9-phase evolutionary ideation (was `ideate-loop.md`)
  - [`modes/loop.md`](modes/loop.md) — Goal-absorbed iteration primitive (NEW — runtime LoopRunner.ts ships next ISA)
  - [`modes/native.md`](modes/native.md) — response-mode crossover

## Backwards-compat note

References to this file from older code/docs still resolve to this redirect pointer. The single-source-of-truth content is at [`modes/README.md`](modes/README.md). When you update mode logic, update the per-mode file under `modes/` — not this file.
