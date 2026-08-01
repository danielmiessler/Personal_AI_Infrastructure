# MineReflections Workflow

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the MineReflections workflow to extract upgrade candidates from algorithm reflections"}' \
  > /dev/null 2>&1 &
```

Running the **MineReflections** workflow in the **Upgrade** skill to mine internal algorithm reflections...

**Mines internal algorithm reflections for recurring patterns that suggest Algorithm or system upgrades.**

**Trigger:** "mine reflections", "check reflections", "what have we learned", "internal improvements", "reflection insights"

---

## Overview

The Algorithm writes a reflection after every run that did real work to `~/.claude/LIFEOS/MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl` via `LIFEOS/TOOLS/Reflect.ts` (the only sanctioned writer — never append by hand). The improvement signal is the **`reflection` field**: what a smarter run would have done. This workflow mines that channel for **recurring themes** and produces **actionable upgrade candidates** for the Algorithm, skills, hooks, or system architecture.

---

## Data Schema — three corpus eras

The corpus spans schema generations; mine the improvement channel by era:

| Era | Entries | Improvement channel |
|-----|---------|---------------------|
| Legacy (pre-2026-07-11) | `reflection_q1/q2/q3` questions, `implied_sentiment`, `criteria_*` | Q2 primarily; Q1/Q3 secondary |
| Interim schema 7/8 (2026-07-11 → 07-28) | operational telemetry only (`claims_total`, `within_budget`, `notes`, ...) | optional `notes` where present — the channel was dark here |
| Schema 9 (2026-07-28 →) | Reflect.ts-gated; `within_budget`/`spend` DERIVED from spend-audit | **required `reflection` field** |

Current-era entry (schema 9, authoritative shape in `LIFEOS/TOOLS/Reflect.ts`):

```json
{
  "schema": 9,
  "ts": "ISO",
  "session_id": "...",
  "slug": "...",
  "iteration": 1,
  "work_kind": "feature-build",
  "claims_closed": ["ISC-1"],
  "evidence_classes": ["bun-test"],
  "deploys": [],
  "within_budget": null,
  "spend": { "verdict": null, "verdict_confidence": null, "dispatches": 0, "rung_mix": {} },
  "context_sufficient": null,
  "reflection": "What a smarter run would have done",
  "notes": "operational notes"
}
```

---

## Execution

### Step 1: Read All Reflections

```
Read ~/.claude/LIFEOS/MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl

Parse each line as JSON. Collect all entries into an array.
Report: "Found N reflections spanning [date range]"
```

### Step 2: Signal Prioritization

**Not all reflections are equally valuable.** Weight entries by signal strength:

| Signal | Weight | Rationale |
|--------|--------|-----------|
| `within_budget: false` | HIGH | Measured over/underspend = structural issue (schema 9: derived from spend-audit, trustworthy) |
| `context_sufficient: false` | BOOST | Run started without what it needed |
| unclosed claims (`claims_closed` short of the run's claim set) | BOOST | Verification gap |
| legacy `implied_sentiment` <= 5 | HIGH | Low satisfaction = something went wrong (legacy era only) |
| legacy `criteria_failed > 0` / `rework_count > 0` | BOOST | Failed criteria or rework (legacy era only) |

**Highest signal entries:** substantive `reflection` (or legacy Q2) + a boosted operational signal. These are the gold. Join `LEARNING/SIGNALS/ratings.jsonl` by `session_id` for satisfaction where available.

### Step 3: Theme Extraction

Cluster the improvement channel (`reflection`, falling back to `notes` in the interim era and `reflection_q2`/`q1`/`q3` in the legacy era) into themes:

- Group similar answers together; count frequency across reflections
- Identify the underlying structural issue each theme points to
- Example themes: "ISC quality gates too lenient", "class-sweep runs at VERIFY not plan time", "delegates idle silently"
- Legacy Q3-style entries (what a fundamentally smarter AI would do) inform longer-term architecture decisions — keep them as an ASPIRATIONAL bucket

### Step 4: Synthesize Upgrade Candidates

For each theme with **2+ occurrences** (or 1 occurrence if sentiment <= 4):

```
UPGRADE CANDIDATE: [Theme Name]
  Frequency: N reflections
  Signal strength: HIGH/MEDIUM/LOW
  Supporting reflections:
    - [timestamp] [task_description] — "[relevant reflection quote]"
    - [timestamp] [task_description] — "[relevant reflection quote]"
  Root cause: [What structural issue causes this pattern]
  Proposed fix: [Specific change to Algorithm, skill, hook, or system]
  Target file(s): [Which LifeOS files would change]
  Effort estimate: [Instant/Fast/Standard/Extended]
```

### Step 5: Prioritize and Output

Sort upgrade candidates by:
1. Frequency (most recurring first)
2. Signal strength (highest first)
3. Effort estimate (lowest first — quick wins bubble up)

---

## Output Format

```
# Internal Reflection Mining Report

**Source:** ~/.claude/LIFEOS/MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl
**Entries analyzed:** N
**Date range:** [earliest] to [latest]
**High-signal entries:** N (sentiment <= 5 or over-budget or failed criteria)

## Top Upgrade Candidates

### 1. [Theme Name] (N occurrences, HIGH signal)
**Root cause:** ...
**Proposed fix:** ...
**Target:** ...
**Effort:** ...
**Evidence:**
- ...

### 2. [Theme Name] ...

## Execution Pattern Warnings (from Q1)
- [Recurring mistake] — seen N times
- ...

## Aspirational Insights (from Q3)
- [Fundamental improvement] — seen N times
- ...
```

---

## Integration with Upgrade Workflow

This workflow can run:
1. **Standalone:** User says "mine reflections" or "check reflections"
2. **As Thread 3 in the main Upgrade workflow:** Runs in parallel with external source collection, adding an internal perspective to upgrade recommendations
