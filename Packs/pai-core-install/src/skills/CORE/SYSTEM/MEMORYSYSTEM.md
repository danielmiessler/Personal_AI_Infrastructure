<!--
================================================================================
PAI CORE - SYSTEM/MEMORYSYSTEM.md
================================================================================

PURPOSE:
The unified memory system - what happened, what we learned, what we're working
on. Combines historical archives, learning artifacts, operational state, and
per-task work directories.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/MEMORYSYSTEM.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/MEMORYSYSTEM.md

CUSTOMIZATION:
- Paths use ${PAI_DIR} - replace with your installation directory
- Directory structure is standard, but you can add categories

RELATED FILES:
- BACKUPS.md - Backup strategies
- PAISYSTEMARCHITECTURE.md - Core architecture

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# Memory System

**The unified system memory - what happened, what we learned, what we're working on.**

The Memory System combines historical archives, learning artifacts, operational state, and per-task work directories into one coherent architecture.

**Location:** `${PAI_DIR}/MEMORY/`

---

## Directory Structure

```
${PAI_DIR}/MEMORY/
├── research/          # Research session outputs
├── sessions/          # Session summaries (auto-captured)
├── learnings/         # Learning moments
├── decisions/         # Architectural decisions
├── execution/         # Feature/bug/refactor executions
├── security/          # Security event logs
├── recovery/          # Recovery snapshots and journals
├── raw-outputs/       # JSONL event streams
├── backups/           # Pre-refactoring backups
├── archive/           # Compressed historical archives
├── analysis/          # Analysis documents
├── ideas/             # Brainstorm captures
├── releases/          # Release notes
├── skills/            # Skill-related history
├── session-events.jsonl  # Main session event log
├── Learning/          # Phase-based curated learnings
│   ├── OBSERVE/
│   ├── THINK/
│   ├── PLAN/
│   ├── BUILD/
│   ├── EXECUTE/
│   ├── VERIFY/
│   ├── ALGORITHM/
│   └── sessions/
├── State/             # Real-time operational state
│   ├── algorithm-stats.json
│   ├── algorithm-streak.json
│   ├── format-streak.json
│   ├── last-judge-rating.json
│   └── active-work.json
├── Signals/           # Pattern detection and anomalies
│   ├── failures.jsonl
│   ├── loopbacks.jsonl
│   ├── patterns.jsonl
│   └── agent-routing.jsonl
└── Work/              # Per-task memory (active work items)
    └── [Task-Name_TIMESTAMP]/
```

---

## Three-Tier Memory Model

### 1. CAPTURE (Hot) - Per-Task Work

Current work items with real-time traces.

**Each work item directory:**
```
Work/[Task-Name_TIMESTAMP]/
├── Work.md           # Goal, result, signal tracking
├── IdealState.jsonl  # Success criteria evolution (append-only)
├── TRACE.jsonl       # Decision trace (theory of mind)
├── Output/           # Deliverables produced
└── Learning/         # Per-phase learnings
```

### 2. SYNTHESIS (Warm) - Aggregated Learning

Learnings organized by algorithm phase for targeted retrieval.

```
Learning/
├── OBSERVE/     # Learnings about gathering context
├── THINK/       # Learnings about hypothesis generation
├── PLAN/        # Learnings about execution planning
├── BUILD/       # Learnings about success criteria
├── EXECUTE/     # Learnings about implementation
└── VERIFY/      # Learnings about verification
```

**Curation criteria - learning bubbles up if it is:**
- **Generalizable** - Applies beyond this specific task
- **Algorithm-focused** - Improves how we execute phases
- **Actionable** - Contains specific pattern or recommendation
- **Non-obvious** - Wasn't already in permanent learnings

### 3. APPLICATION (Cold) - Archived History

Immutable archive of all historical data (directly in MEMORY/).

```
${PAI_DIR}/MEMORY/
├── research/YYYY-MM/        # Investigation reports
├── sessions/YYYY-MM/        # Session summaries
├── learnings/YYYY-MM/       # Learning moments
├── decisions/YYYY-MM/       # Architectural decisions
├── execution/               # Feature/bug/refactor work
├── security/                # Security event logs
├── recovery/                # Recovery snapshots
│   ├── journal/YYYY-MM-DD.jsonl
│   ├── snapshots/YYYY-MM-DD/
│   └── index.json
├── raw-outputs/YYYY-MM/     # JSONL event streams
└── archive/                 # Compressed old months
```

---

## State Tracking

Real-time operational state at `${PAI_DIR}/MEMORY/State/`:

| File | Purpose |
|------|---------|
| `algorithm-stats.json` | Total/compliant task counts |
| `algorithm-streak.json` | Consecutive compliant tasks |
| `format-streak.json` | Consecutive correct format |
| `last-judge-rating.json` | Most recent quality rating |
| `active-work.json` | Currently active work item |

---

## Signal Files

Real-time pattern detection at `${PAI_DIR}/MEMORY/Signals/`:

### failures.jsonl
Every VERIFY failure with context.
```json
{"timestamp": "...", "work_item": "...", "phase": "VERIFY", "criterion": "...", "expected": "...", "observed": "...", "root_cause": "..."}
```

### loopbacks.jsonl
When execution loops back to earlier phases.
```json
{"timestamp": "...", "work_item": "...", "from_phase": "VERIFY", "to_phase": "THINK", "reason": "...", "iteration": 2}
```

### patterns.jsonl
Weekly aggregated patterns from failures and loopbacks.
```json
{"week": "2026-W01", "pattern": "...", "frequency": 4, "recommendation": "...", "source_items": [...]}
```

### ratings.jsonl
User satisfaction ratings (both explicit and implicit).

---

## Quick Reference

### Find work items
```bash
ls ${PAI_DIR}/MEMORY/Work/              # All work
ls -lt ${PAI_DIR}/MEMORY/Work/ | head   # Most recent
grep -r "search" ${PAI_DIR}/MEMORY/     # Search content
```

### Check state
```bash
cat ${PAI_DIR}/MEMORY/State/algorithm-stats.json
cat ${PAI_DIR}/MEMORY/State/algorithm-streak.json
```

### Check signals
```bash
tail ${PAI_DIR}/MEMORY/Signals/failures.jsonl
cat ${PAI_DIR}/MEMORY/Signals/loopbacks.jsonl | jq .
```

### Search history
```bash
ls ${PAI_DIR}/MEMORY/research/2026-01/
grep -r "pattern" ${PAI_DIR}/MEMORY/
```

---

## Related Documentation

- **Architecture:** `PAISYSTEMARCHITECTURE.md`
- **Hook System:** `THEHOOKSYSTEM.md`
- **Backups:** `BACKUPS.md`
