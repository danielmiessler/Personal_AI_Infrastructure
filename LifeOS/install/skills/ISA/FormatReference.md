# ISA Format — Quick Reference

Skimmable cheat sheet for the ISA file shape. The full, authoritative spec is
`LifeOS/install/LIFEOS/DOCUMENTATION/Isa/IsaFormat.md` (v2.13.0, Algorithm v6.25.0) —
on any contradiction, **the full spec wins** and this reference is corrected to match.

---

## Frontmatter (YAML)

Eight required fields, plus optional groups.

```yaml
---
task: "8-word task description"           # the deliverable, imperative, ≤60 chars
slug: YYYYMMDD-HHMMSS_kebab-task          # unique ID = directory name
effort: standard                          # standard|extended|advanced|deep|comprehensive
effort_source: auto                       # auto|explicit (set via /eN)
phase: observe                            # observe|think|plan|build|execute|verify|learn|complete
progress: 0/8                             # checked ISCs / total ISCs
mode: iterate                             # iterate|optimize|ideate|loop
started: 2026-07-25T00:00:00Z             # creation, never modified
updated: 2026-07-25T00:00:00Z             # every write, current ISO 8601
---
```

**Optional (add only when they apply):**
- `iteration: 2` — set on first continuation of a completed task, incremented thereafter.
- `parent:` / `children:` — hierarchy links (see Hierarchy section in SKILL.md). Omit for standalone ISAs.
- `principal_stated_goal:` (+ `_source` / `_signal` / `_locked`) — verbatim user quote, never paraphrased; only when OBSERVE goal-detection fired on ≥6 tokens of propositional content.
- `current_state:` / `ideal_state:` — one-line before/after for the journey surface.

Empty/inapplicable fields are omitted entirely (Bitter Pill discipline). Parsers tolerate unknown keys.

---

## Body — 14 sections, fixed order

Sections appear only when populated; never emit empty placeholders.

| # | Section | One-line purpose |
|---|---------|------------------|
| 1 | `## Problem` | what is broken/missing now |
| 2 | `## Vision` | experiential intent — euphoric surprise, 1–5 sentences |
| 3 | `## Out of Scope` | anti-vision, declared in prose |
| 4 | `## Principles` | substrate-independent truths the work must respect |
| 5 | `## Constraints` | immovable solution-space mandates (+ inherited from `parent:`) |
| 6 | `## Dependencies` | `requires: <slug> — <contract>` — hierarchy-only |
| 7 | `## Goal` | hard-to-vary spine, 1–3 sentences naming verifiable done |
| 8 | `## Criteria` | atomic ISCs, one binary probe each (incl. `Anti:` / `Antecedent:`) |
| 9 | `## Bridge Criteria` | cross-ISA integration ISCs (`Bridge:`) — hierarchy-only |
| 10 | `## Test Strategy` | per-ISC probe table |
| 11 | `## Features` | work breakdown, vertical slices |
| 12 | `## Decisions` | timestamped log incl. dead ends; `refined:` prefix |
| 13 | `## Changelog` | conjecture/refutation/learning trail |
| 14 | `## Verification` | evidence each ISC passed |

`## Dependencies` and `## Bridge Criteria` are conditional-required: mandatory when the ISA is in a hierarchy, omitted otherwise.

**Tier gate (HARD):** E1 = Goal+Criteria · E2 = +Problem+Test Strategy · E3 = +Vision+Out of Scope+Constraints+Features · E4 = all 14 · E5 = all 14 + Interview before BUILD. Any `<project>/ISA.md` requires E3+ regardless of task tier.

---

## ID-stability rule

ISC IDs **never re-number on edit** — Reconcile keys on them.

- Split `ISC-7` → preserve `ISC-7` as parent, add `ISC-7.1`, `ISC-7.2` (leaf granularity applies at leaves).
- Drop an ISC → leave a tombstone: `- [ ] ISC-7: [DROPPED — see Decisions YYYY-MM-DD]`.
- Never collapse the numbering; historical references in Decisions/Changelog/Verification must stay valid.

---

## Criteria conventions

```
- [ ] ISC-1: End-state claim, 8–12 words, binary, one probe          # normal (pending)
- [x] ISC-2: Satisfied claim                                          # passed
- [ ] ISC-3: Anti: what must NOT happen                               # anti-criterion (≥1 required)
- [ ] ISC-4: Antecedent: precondition that produces the experience    # required when goal is experiential
- [ ] ISC-5: Bridge: what must hold across a cross-ISA seam           # hierarchy-only
```

- All ISCs number sequentially in **one pool**; the `Anti:` / `Antecedent:` / `Bridge:` prose prefix carries the kind.
- **Atomic** — one verifiable thing per ISC. Splitting Test: contains and/with/including → split; part A can pass while B fails → split; all/every/complete → enumerate; crosses UI/API/data/logic → one per boundary.
- **Coverage Gate replaces count floors** (v6.25.0): every subsystem named in Vision/Goal has a container ISC decomposed to single-probe leaves. Coverage is the gate; count never is. Never split to hit a number.
- Check `- [x]` immediately on satisfaction; update `progress:` on every change.

---

## Fog section

- `## Not yet specified` holds in-scope questions too dim to be ISCs yet — named, not answered.
- Graduation test: can you *state* the question precisely (not answer it)? If yes it can become an ISC; if not, it stays fog. Fog graduates to an ISC or dies in `## Decisions`.

---

## Test Strategy table

```
| isc | anchors_to | type | check | threshold | tool |
```

- `type` (closed vocab): `bun-test` · `bun-property` (`property | generator | runs | tool`) · `bash` · `manual` · `screenshot` · `eval`.
- `anchors_to`: `literal` · `derived: <sub-claim>` · `cross: <slug>` (bridge ISCs).
- High-blast surface (secrets/auth/principal-data/money/public-push/prod) must name a deterministic probe, never `manual`.

---

## Changelog format (non-negotiable, all four in order)

```
- conjectured: <the claim/approach tried>
  refuted by: <the probe/evidence that killed or confirmed it>
  learned: <what the refutation taught>
  criterion now: <the ISC as it now reads>
```

Append refuses a partial C/R/L — a missing piece makes the entry a `## Decisions` row, not a Changelog entry. This is the Deutsch error-correction trail; it is what makes learning auditable across sessions.
