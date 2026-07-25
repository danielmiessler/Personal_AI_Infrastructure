---
name: Freshness
description: "Tracks how current the principal's constitutional context is — TELOS files, SOUL.md, and HERMES_CONSTITUTION.md — by grading each file A–F against a per-type staleness threshold and rolling them into an overall grade. Files age silently; this surfaces when the DA is optimizing toward a stale picture of the principal. USE WHEN: freshness, stale, review, checkin, check-in, how current is, when did I last, is my TELOS out of date, what needs reviewing. NOT FOR editing TELOS content (use Telos) or the conversational constitutional review (use Interview)."
effort: low
---

# Freshness — Constitutional Staleness Tracker

## What It Does

Constitutional files age silently. The DA loads TELOS, SOUL.md, and the constitution at every session start and optimizes the principal's current→ideal loop against them — so when those files drift out of date, every downstream recommendation drifts with them, invisibly. Freshness makes the drift visible: it grades each tracked file **A–F** against a threshold chosen for how fast that kind of content moves, and rolls the per-file grades into one overall grade the DA can act on.

This is a read-only sensing skill. It never edits content — it reports what is stale so the principal (via `Telos` or `Interview`) can refresh it.

## The Two-Timestamp Distinction

Borrowed from the LifeOS FreshnessSystem, and load-bearing:

- **`last_updated`** — when the bytes last changed (any write, including a migration or a reformat).
- **`last_reviewed`** — when a human last vouched for the *content* being correct.

**The grade is computed from `last_reviewed`, not `last_updated`.** A migration that rewrites every byte does not reset the review clock — reformatting a file does not mean anyone re-checked that it is still true.

### Hermes adaptation

The Dropbox TELOS files carry no `last_reviewed` frontmatter — they are plain principal content keyed by filesystem mtime. Hermes therefore:

- Uses **filesystem mtime as a proxy for `last_updated`**, and grades from it with an explicit **"last human review unknown"** qualifier for any file lacking an explicit review timestamp. The grade is honest about being an upper bound on freshness (mtime ≥ true last-review).
- Reads mtimes with `read_file` metadata or `terminal(stat)` — no network, no model.
- May, in future, carry `last_reviewed` as durable metadata in **Hindsight** (a retained "principal reviewed TELOS/mission on <date>" fact), at which point the grade tightens from the mtime proxy to the true review clock. Until then the qualifier stays.

## Tracked Sources

| Source | Path | Content |
|--------|------|---------|
| **TELOS files** | `E:/Dropbox/ARON BIJL MSC/TELOS/` (canonical) | the principal's mission, goals, strategies, beliefs, current state — canonical, ~25 files |
| **SOUL.md** | `$HERMES_HOME/SOUL.md` | DA identity — voice, personality, relationship |
| **HERMES_CONSTITUTION.md** | `LifeOS/install/LIFEOS/HERMES_CONSTITUTION.md` | the constitutional / ephemeral-system-prompt layer |

TELOS is the canonical principal content — an empty template shipped with the repo is *not* the source of truth; the configured Dropbox directory is (`TELOS_DIR` env var overrides the default).

## A–F Grading

For each file, age is measured in days from its review clock (mtime proxy on Hermes), then scored against the file's threshold:

```
pct = max(0, 100 - (age_days / threshold_days) * 100)
```

| Grade | Meaning | Band |
|-------|---------|------|
| **A** | recently reviewed | pct ≥ 75  (age ≤ 25% of threshold) |
| **B** | comfortable | pct ≥ 50  (age ≤ 50%) |
| **C** | approaching | pct ≥ 25  (age ≤ 75%) |
| **D** | overdue soon | pct > 0   (age ≤ 100%) |
| **F** | overdue / never reviewed | pct = 0   (age > threshold, or no timestamp at all) |

**Overall grade** = GPA-style mean of the per-file `pct` values, mapped back through the same bands. One F badly stale file drags the mean; that is intended — a stale mission matters more than a fresh movie list.

## Thresholds (by file type)

Foundational content moves slowly and should not nag; state moves fast and should.

| File type | Threshold | Rationale |
|-----------|-----------|-----------|
| TELOS current_state / status | **7–14 days** | fast-moving — where attention actually is |
| TELOS goals / strategies | **30 days** | tactical direction shifts within a quarter |
| TELOS mission / beliefs / frames / wisdom / models | **90 days** | slow-moving, foundational — reviewing weekly is noise |
| SOUL.md (DA identity) | **180 days** | voice/personality changes rarely |
| HERMES_CONSTITUTION.md | **180 days** | constitutional layer — stable by design |

The thresholds live as a static dict in `Tools/check.py`, kept in sync with this table.

## Workflow Routing

| Intent | Action |
|--------|--------|
| "freshness", "what's stale", "how current is my TELOS", "check-in" | Run `python Tools/check.py --text` and read back the overall grade + the stalest files. |
| "which files need review" / machine-readable | Run `python Tools/check.py` (JSON) and surface every file graded D or F. |
| "review this now" | Report the grade, then hand off to `Telos` (edit) or `Interview` (conversational refresh) — Freshness itself never edits content. |

## Examples

- *"How fresh is my TELOS?"* → run `check.py --text`; report e.g. "Overall B. Mission (A, 12d), Goals (C, 24/30d), current_state is **F** — 21 days, threshold 14. Worth a check-in on where your attention actually is." Note the "last human review unknown" qualifier since mtime is a proxy.
- *"When did I last touch my beliefs file?"* → stat the file, give age in days against the 90-day threshold and its grade.
- *"Anything overdue?"* → run JSON, list only D/F files, offer to route to `Interview`.

## Gotchas

- **mtime is an upper bound, not the truth.** A file edited today reads as grade A even if the *content* is a year stale — the human just reformatted it. Always attach the "last human review unknown" qualifier until a real `last_reviewed` exists (via Hindsight). Do not present the mtime grade as if a human vouched for the content on that date.
- **Grade from the review clock, never the write clock.** If/when Hindsight carries a `last_reviewed` fact, it wins over mtime. A migration bumping every mtime must not be read as "everything reviewed today."
- **The overall grade is a mean, not a min.** It intentionally lets fresh foundational files offset a stale fast-mover — but a single F on `mission` or `current_state` is the signal to act on, so always surface the stalest file explicitly, not just the aggregate.
- **Report-only.** This skill does not write to TELOS, SOUL.md, or the constitution. Surfacing staleness and *fixing* it are separate steps; the fix routes to `Telos` / `Interview`.
- **Threshold table and script must agree.** The dict in `Tools/check.py` is the executable copy of the thresholds table above; edit both together or the report drifts from the doctrine.
- **Not ported from LifeOS:** the per-section TELOS.md HTML-comment markers and the Pulse freshness routes/statusline. Hermes surfaces freshness through this skill's CLI, not a persistent dashboard.
