# Memory System

**The unified system memory - what happened, what we learned, what we're working on.**

**Version:** 7.0 (Projects-native architecture, 2026-01-12)
**Location:** `~/.claude/MEMORY/`

---

## Architecture

**Claude Code's `projects/` is the source of truth. Hooks capture domain-specific events directly. Harvesting tools extract learnings from session transcripts.**

```
User Request
    ↓
Claude Code projects/ (native transcript storage - 30-day retention)
    ↓
Hook Events trigger domain-specific captures:
    ├── AutoWorkCreation → WORK/
    ├── ResponseCapture → WORK/, LEARNING/
    ├── RatingCapture → LEARNING/SIGNALS/
    ├── WorkCompletionLearning → LEARNING/
    ├── AgentOutputCapture → RESEARCH/
    └── SecurityValidator → SECURITY/
    ↓
Harvesting (periodic):
    ├── SessionHarvester → LEARNING/ (extracts corrections, errors, insights)
    ├── LearningPatternSynthesis → LEARNING/SYNTHESIS/ (aggregates ratings)
    └── Observability reads from projects/
```

**Key insight:** Hooks write directly to specialized directories. There is no intermediate "firehose" layer - Claude Code's `projects/` serves that purpose natively.

---

## Directory Structure

```
~/.claude/MEMORY/
├── WORK/                   # PRIMARY work tracking
│   └── {work_id}/
│       ├── META.yaml       # Status, session, lineage
│       ├── IDEAL.md        # Success criteria
│       ├── IdealState.jsonl
│       ├── items/          # Individual work items
│       ├── agents/         # Sub-agent work
│       ├── research/       # Research findings
│       ├── scratch/        # Iterative artifacts (diagrams, prototypes, drafts)
│       ├── verification/   # Evidence
│       └── children/       # Nested work
├── LEARNING/               # Learnings (includes signals)
│   ├── SYSTEM/             # PAI/tooling learnings
│   │   └── YYYY-MM/
│   ├── ALGORITHM/          # Task execution learnings
│   │   └── YYYY-MM/
│   ├── SYNTHESIS/          # Aggregated pattern analysis
│   │   └── YYYY-MM/
│   │       └── weekly-patterns.md
│   └── SIGNALS/            # User satisfaction ratings
│       └── ratings.jsonl
├── RESEARCH/               # Agent output captures
│   └── YYYY-MM/
├── SECURITY/               # Security audit events
│   └── security-events.jsonl
├── STATE/                  # Operational state
│   ├── algorithm-state.json
│   ├── current-work.json
│   ├── format-streak.json
│   ├── algorithm-streak.json
│   ├── trending-cache.json
│   ├── progress/           # Multi-session project tracking
│   └── integrity/          # System health checks
├── PAISYSTEMUPDATES/         # Architecture change history
│   ├── index.json
│   ├── CHANGELOG.md
│   └── YYYY/MM/
└── README.md
```

---

## Directory Details

### Claude Code projects/ - Native Session Storage

**Location:** `~/.claude/projects/-Users-{username}--claude/`
*(Replace `{username}` with your system username, e.g., `-Users-john--claude`)*
**What populates it:** Claude Code automatically (every conversation)
**Content:** Complete session transcripts in JSONL format
**Format:** `{uuid}.jsonl` - one file per session
**Retention:** 30 days (Claude Code manages cleanup)
**Purpose:** Source of truth for all session data; Observability and harvesting tools read from here

This is the actual "firehose" - every message, tool call, and response. PAI leverages this native storage rather than duplicating it.

### WORK/ - Primary Work Tracking

**What populates it:**
- `AutoWorkCreation.hook.ts` on UserPromptSubmit (creates work dir)
- `ResponseCapture.hook.ts` on Stop (updates work items)
- `SessionSummary.hook.ts` on SessionEnd (marks COMPLETED)

**Content:** Work directories with metadata, items, verification artifacts
**Format:** `WORK/{work_id}/` with META.yaml, items/, verification/, etc.
**Purpose:** Track all discrete work units with lineage, verification, and feedback

**Work Directory Lifecycle:**
1. `UserPromptSubmit` → AutoWorkCreation creates work dir + first item
2. `Stop` → ResponseCapture updates item with response summary
3. `SessionEnd` → SessionSummary marks work COMPLETED, clears state

### LEARNING/ - Categorized Learnings

**What populates it:**
- `ResponseCapture.hook.ts` (if content qualifies as learning)
- `ExplicitRatingCapture.hook.ts` (explicit ratings + low-rating learnings)
- `ImplicitSentimentCapture.hook.ts` (detected frustration)
- `WorkCompletionLearning.hook.ts` (significant work session completions)
- `SessionHarvester.ts` (periodic extraction from projects/ transcripts)
- `LearningPatternSynthesis.ts` (aggregates ratings into pattern reports)

**Structure:**
- `LEARNING/SYSTEM/YYYY-MM/` - PAI/tooling learnings (infrastructure issues)
- `LEARNING/ALGORITHM/YYYY-MM/` - Task execution learnings (approach errors)
- `LEARNING/SYNTHESIS/YYYY-MM/` - Aggregated pattern analysis (weekly/monthly reports)
- `LEARNING/SIGNALS/ratings.jsonl` - All user satisfaction ratings

**Categorization logic:**
| Directory | When Used | Example Triggers |
|-----------|-----------|------------------|
| `SYSTEM/` | Tooling/infrastructure failures | hook crash, config error, deploy failure |
| `ALGORITHM/` | Task execution issues | wrong approach, over-engineered, missed the point |
| `SYNTHESIS/` | Pattern aggregation | weekly analysis, recurring issues |

### RESEARCH/ - Agent Outputs

**What populates it:** `AgentOutputCapture.hook.ts` on SubagentStop
**Content:** Agent completion outputs (researchers, architects, engineers, etc.)
**Format:** `RESEARCH/YYYY-MM/YYYY-MM-DD-HHMMSS_AGENT-type_description.md`
**Purpose:** Archive of all spawned agent work

### SECURITY/ - Security Events

**What populates it:** `SecurityValidator.hook.ts` on tool validation
**Content:** Security audit events (blocks, confirmations, alerts)
**Format:** `SECURITY/security-events.jsonl`
**Purpose:** Security decision audit trail

### STATE/ - Fast Runtime Data

**What populates it:** Various tools and hooks
**Content:** High-frequency read/write JSON files for runtime state
**Key Property:** Ephemeral - can be rebuilt from RAW or other sources. Optimized for speed, not permanence.

**Files:**
- `current-work.json` - Active work directory pointer
- `algorithm-state.json` - THEALGORITHM execution phase
- `format-streak.json`, `algorithm-streak.json` - Performance metrics
- `trending-cache.json` - Cached analysis (TTL-based)
- `progress/` - Multi-session project tracking
- `integrity/` - System health check results

This is mutable state that changes during execution - not historical records. If deleted, system recovers gracefully.

### PAISYSTEMUPDATES/ - Change History

**What populates it:** Manual via CreateUpdate.ts tool
**Content:** Canonical tracking of all system changes
**Purpose:** Track architectural decisions and system changes over time

---

## Hook Integration

| Hook | Trigger | Writes To |
|------|---------|-----------|
| AutoWorkCreation.hook.ts | UserPromptSubmit | WORK/, STATE/current-work.json |
| ResponseCapture.hook.ts | Stop | WORK/items, LEARNING/ (if applicable) |
| WorkCompletionLearning.hook.ts | SessionEnd | LEARNING/ (significant work) |
| SessionSummary.hook.ts | SessionEnd | WORK/META.yaml (status), clears STATE |
| ExplicitRatingCapture.hook.ts | UserPromptSubmit | LEARNING/SIGNALS/, LEARNING/ (low ratings) |
| ImplicitSentimentCapture.hook.ts | UserPromptSubmit | LEARNING/SIGNALS/, LEARNING/ (frustration) |
| AgentOutputCapture.hook.ts | SubagentStop | RESEARCH/ |
| SecurityValidator.hook.ts | PreToolUse | SECURITY/ |

## Harvesting Tools

| Tool | Purpose | Reads From | Writes To |
|------|---------|------------|-----------|
| SessionHarvester.ts | Extract learnings from transcripts | projects/ | LEARNING/ |
| LearningPatternSynthesis.ts | Aggregate ratings into patterns | LEARNING/SIGNALS/ | LEARNING/SYNTHESIS/ |
| ActivityParser.ts | Parse recent file changes | projects/ | (analysis only) |

---

## Data Flow

```
User Request
    ↓
Claude Code → projects/{uuid}.jsonl (native transcript)
    ↓
AutoWorkCreation → WORK/{id}/ + STATE/current-work.json
    ↓
[Work happens - all tool calls captured in projects/]
    ↓
ResponseCapture → Updates WORK/items, optionally LEARNING/
    ↓
RatingCapture/SentimentCapture → LEARNING/SIGNALS/ + LEARNING/
    ↓
WorkCompletionLearning → LEARNING/ (for significant work)
    ↓
SessionSummary → WORK/META.yaml (COMPLETED), clears STATE/current-work.json

[Periodic harvesting]
    ↓
SessionHarvester → scans projects/ → writes LEARNING/
LearningPatternSynthesis → analyzes SIGNALS/ → writes SYNTHESIS/
```

---

## Quick Reference

### Check current work
```bash
cat ~/.claude/MEMORY/STATE/current-work.json
ls ~/.claude/MEMORY/WORK/ | tail -5
```

### Check ratings
```bash
tail ~/.claude/MEMORY/LEARNING/SIGNALS/ratings.jsonl
```

### View session transcripts
```bash
# List recent sessions (newest first)
# Replace {username} with your system username
ls -lt ~/.claude/projects/-Users-{username}--claude/*.jsonl | head -5

# View last session events
tail ~/.claude/projects/-Users-{username}--claude/$(ls -t ~/.claude/projects/-Users-{username}--claude/*.jsonl | head -1) | jq .
```

### Check learnings
```bash
ls ~/.claude/MEMORY/LEARNING/SYSTEM/
ls ~/.claude/MEMORY/LEARNING/ALGORITHM/
ls ~/.claude/MEMORY/LEARNING/SYNTHESIS/
```

### Check multi-session progress
```bash
ls ~/.claude/MEMORY/STATE/progress/
```

### Run harvesting tools
```bash
# Harvest learnings from recent sessions
bun run ~/.claude/skills/CORE/Tools/SessionHarvester.ts --recent 10

# Generate pattern synthesis
bun run ~/.claude/skills/CORE/Tools/LearningPatternSynthesis.ts --week
```

---

## Migration History

**2026-01-12:** v7.0 - Projects-native architecture
- Eliminated RAW/ directory entirely - Claude Code's `projects/` is the source of truth
- Removed EventLogger.hook.ts (was duplicating what projects/ already captures)
- Created SessionHarvester.ts to extract learnings from projects/ transcripts
- Created WorkCompletionLearning.hook.ts for session-end learning capture
- Created LearningPatternSynthesis.ts for rating pattern aggregation
- Added LEARNING/SYNTHESIS/ for pattern reports
- Updated Observability to read from projects/ instead of RAW/
- Updated ActivityParser.ts to use projects/ as data source
- Removed archive functionality from pai.ts (Claude Code handles 30-day cleanup)

**2026-01-11:** v6.1 - Removed RECOVERY system
- Deleted RECOVERY/ directory (5GB of redundant snapshots)
- Removed RecoveryJournal.hook.ts, recovery-engine.ts, snapshot-manager.ts
- Git provides all necessary rollback capability

**2026-01-11:** v6.0 - Major consolidation
- WORK is now the PRIMARY work tracking system (not SESSIONS)
- Deleted SESSIONS/ directory entirely
- Merged SIGNALS/ into LEARNING/SIGNALS/
- Merged PROGRESS/ into STATE/progress/
- Merged integrity-checks/ into STATE/integrity/
- Fixed AutoWorkCreation hook (prompt vs user_prompt field)
- Updated all hooks to use correct paths

**2026-01-10:** v5.0 - Documentation consolidation
- Consolidated WORKSYSTEM.md into MEMORYSYSTEM.md

**2026-01-09:** v4.0 - Major restructure
- Moved BACKUPS to `~/.claude/BACKUPS/` (outside MEMORY)
- Renamed RAW-OUTPUTS to RAW
- All directories now ALL CAPS

**2026-01-05:** v1.0 - Unified Memory System migration
- Previous: `~/.claude/history/`, `~/.claude/context/`, `~/.claude/progress/`
- Current: `~/.claude/MEMORY/`
- Files migrated: 8,415+

---

## Related Documentation

- **Hook System:** `THEHOOKSYSTEM.md`
- **Architecture:** `PAISYSTEMARCHITECTURE.md`
