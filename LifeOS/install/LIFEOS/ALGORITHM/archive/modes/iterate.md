---
status: RETIRED 2026-07-11 — historical doctrine. Modes/tiers were abolished with Algorithm v8 and system prompt v3.0.0 (one adaptive format). Kept as record only; nothing routes here.
last_updated: 2026-05-13
last_updated_by: da
convention: pai-freshness-v1
mode: iterate
---

# Iterate Mode

The default Algorithm mode. Standard 7-phase pursuit of current state → ideal state via ISCs.

---

## When this fires

- Default for any ALGORITHM response-mode run that doesn't trigger ideate / optimize / loop.
- ISA frontmatter `mode:` is unset OR `iterate`.
- No special invocation — this is the baseline.

## Pulse surface

- Tab: **Iterate**
- Dashboard: `UnifiedWorkDashboard` (`LIFEOS/PULSE/Observability/src/components/activity/UnifiedWorkDashboard.tsx`)
- Filter: shows all sessions where `s.mode === "iterate"` or `mode` is unset, plus the active in-flight Algorithm run.

## Execution pattern

Standard seven phases, no compression:

```
OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
```

Each phase transition requires a voice announcement and ISA frontmatter `phase:` update. Full doctrine: `../v6.5.0.md` (or follow `../LATEST`).

## Fast-Path Compression (E1 only, within Iterate)

Fast-path is a phase-compression strategy WITHIN Iterate mode — not a separate mode. Triggers at Standard tier (E1) when the task is one of: rename a symbol, fix a typo, run a command, read-and-report-on a file, append a single line, format/lint, single-package install, single test run; with single-file / single-command scope; no multi-step transformation; no new architecture / endpoints / dependencies / migrations.

Compressed to:

```
OBSERVE → EXECUTE → VERIFY    (skip THINK/PLAN/BUILD/LEARN)
```

Whitelist enforcement is strict — any condition failing reverts to full 7-phase Algorithm. See `../v6.5.0.md` § "E1 fast-path exception" for full whitelist.

## Research Compression (analysis/review framing)

When the request is purely analytical (no code changes), Iterate compresses to:

```
OBSERVE → THINK → EXECUTE → VERIFY → LEARN    (skip PLAN/BUILD)
```

Triggered by analysis/review framing in the prompt. Still surfaces as Iterate in Pulse — research framing is a compression within the default mode.

## ISA shape

Standard twelve-section ISA per tier completeness gate:

| Tier | Required sections |
|------|-------------------|
| E1 | Goal, Criteria |
| E2 | Problem, Goal, Criteria, Test Strategy |
| E3 | Problem, Vision, Out of Scope, Constraints, Goal, Criteria, Features, Test Strategy |
| E4 | All twelve |
| E5 | All twelve + Interview workflow run before BUILD |

## Goal anchor

When the classifier detects GOAL_SIGNAL (v6.4.0), the Iterate run captures the verbatim goal as `principal_stated_goal:` in ISA frontmatter. Every ISC traces to the literal via Test Strategy `anchors_to` column. The goal is the evidence anchor, not the optimization target.

## Examples

- "Add a column to the auth table" → Iterate, E2
- "Refactor X to use new API" → Iterate, E3
- "Audit the cache layer and fix the eviction bug" → Iterate, E3
- "Fix the typo on line 12 of foo.ts" → Iterate, E1 fast-path
- "What does X do" → Iterate (research-compressed), E1

## Cross-references

- Canonical doctrine: `../v6.5.0.md`
- All modes: [`README.md`](README.md)
- Goal anchor mechanism: `../v6.5.0.md` § "Principal-Stated Goal"
