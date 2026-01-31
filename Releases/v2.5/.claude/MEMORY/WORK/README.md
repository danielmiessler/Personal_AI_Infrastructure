# WORK - Primary Work Tracking

**Purpose:** Track discrete work units with metadata, items, verification, and lineage.

---

## Structure

```
WORK/
└── {work_id}/
    ├── META.yaml           # Status, session, lineage
    ├── ISC.json            # Ideal State Criteria (auto-captured by hooks)
    ├── items/              # Individual work items
    ├── agents/             # Sub-agent work
    ├── research/           # Research findings
    ├── scratch/            # Iterative artifacts (diagrams, prototypes, drafts)
    ├── verification/       # Evidence of completion
    └── children/           # Nested work units
```

---

## ISC.json - Ideal State Criteria

The ISC file tracks success criteria throughout algorithm execution. It is **automatically populated by the ResponseCapture hook** - you don't write to it directly.

**Format:**
```json
{
  "workId": "20260118-...",
  "effortTier": "STANDARD",
  "current": {
    "criteria": ["Criterion 1", "Criterion 2"],
    "antiCriteria": ["Anti-criterion 1"],
    "phase": "VERIFY",
    "timestamp": "2026-01-18T..."
  },
  "history": [...],
  "satisfaction": {"satisfied": 3, "partial": 1, "failed": 0, "total": 4}
}
```

**Capture depth by effort tier:**
| Effort Level | What's Captured |
|--------------|-----------------|
| QUICK/TRIVIAL | Final satisfaction summary only |
| STANDARD | Initial criteria + final satisfaction |
| DEEP/COMPREHENSIVE | Full version history with every phase update |

---

## Work Directory Lifecycle

1. **UserPromptSubmit** → `AutoWorkCreation.hook.ts` creates work directory
2. **Stop** → `ResponseCapture.hook.ts` updates work items and ISC.json
3. **SessionEnd** → `SessionSummary.hook.ts` marks COMPLETED

---

## META.yaml Schema

```yaml
work_id: "20260111-123456_description"
session_id: "abc-123"
status: "ACTIVE" | "COMPLETED"
created_at: "2026-01-11T12:34:56-08:00"
completed_at: null | "2026-01-11T13:00:00-08:00"
parent_work_id: null | "parent-id"
```

---

## What Populates This

- `AutoWorkCreation.hook.ts` - Creates directory on UserPromptSubmit
- `ResponseCapture.hook.ts` - Updates items and ISC.json on Stop
- `SessionSummary.hook.ts` - Marks COMPLETED on SessionEnd

---

## Current Work Pointer

Active work directory is tracked in `STATE/current-work.json`.
