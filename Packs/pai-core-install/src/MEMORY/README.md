# MEMORY System

PAI's persistent memory architecture for session history, learnings, and operational state.

## Directory Structure

Three-tier architecture (Hot → Warm → Cold):

```
MEMORY/
├── Work/              # HOT: Per-task active tracking
│   └── [Task-Name_TIMESTAMP]/
│       ├── Work.md              # Goals and signal tracking
│       ├── IdealState.jsonl     # Success criteria evolution
│       ├── TRACE.jsonl          # Decision reasoning logs
│       ├── Output/              # Task outputs
│       └── Learning/            # Task-specific learnings
│
├── Learning/          # WARM: Phase-based synthesis
│   ├── OBSERVE/       # Context-gathering insights
│   ├── THINK/         # Hypothesis generation learnings
│   ├── PLAN/          # Execution planning lessons
│   ├── BUILD/         # Success criteria documentation
│   ├── EXECUTE/       # Implementation insights
│   ├── VERIFY/        # Verification learnings
│   └── ALGORITHM/     # Meta-learnings about the algorithm
│
├── History/           # COLD: Immutable archive (YYYY-MM format)
│   ├── sessions/      # Session summaries
│   ├── learnings/     # Extracted insights
│   ├── research/      # Research outputs
│   ├── decisions/     # ADRs (Architecture Decision Records)
│   └── raw-outputs/   # JSONL event streams
│
├── State/             # Real-time operational metrics
│   ├── algorithm-stats.json
│   ├── algorithm-streak.json
│   ├── format-streak.json
│   ├── last-judge-rating.json
│   └── active-work.json
│
├── Signals/           # Pattern detection
│   ├── failures.jsonl    # VERIFY failures with root cause
│   ├── loopbacks.jsonl   # Phase reversions
│   ├── patterns.jsonl    # Weekly aggregated trends
│   └── ratings.jsonl     # User satisfaction tracking
│
├── backups/           # Pre-change backups
├── execution/         # Task execution logs
├── recovery/          # Recovery snapshots
└── security/          # Security event logs
```

## Data Flow

**Per-Task → Learning → History**

1. Active work generates `Work/[Task]/TRACE.jsonl` and phase-specific learnings
2. Learnings "bubble up" to `Learning/[PHASE]/` when:
   - Generalizable beyond single task
   - Algorithm-focused
   - Actionable
   - Non-obvious
3. Historical data archives to `History/` organized by month (YYYY-MM)
4. Signals track patterns: failures, loopbacks, ratings
5. State files update in real-time with operational metrics

## Directory Purposes

| Directory | Purpose | Retention |
|-----------|---------|-----------|
| `Work/` | Active per-task tracking with TRACE logs | Active + 7 days |
| `Learning/` | Phase-based synthesized learnings | Permanent |
| `History/research/` | Deep research outputs | Permanent |
| `History/sessions/` | Session summaries | Rolling 90 days |
| `History/learnings/` | Archived insights | Permanent |
| `History/decisions/` | ADRs | Permanent |
| `History/raw-outputs/` | JSONL event streams | Rolling 7 days |
| `State/` | Current operational metrics | Active |
| `Signals/` | Pattern detection logs | Rolling 30 days |
| `execution/` | Task execution logs | Rolling 30 days |
| `security/` | Security events and audit logs | Permanent |
| `recovery/` | Recovery snapshots | Rolling 7 days |
| `backups/` | Pre-refactoring state backups | As needed |

## Event Capture

Events are captured automatically via the `pai-hook-system` hooks (v2.1.1+):

- **SessionStart**: Session initialization, creates directory structure
- **UserPromptSubmit**: User inputs captured
- **PreToolUse/PostToolUse**: All tool invocations logged to raw-outputs/
- **Stop**: Session work captured, learnings extracted
- **SubagentStop**: Delegated agent results captured
- **SessionEnd**: Full session summary generated

**Required hooks** (installed with pai-hook-system):
- `capture-all-events.ts` - Universal event logging
- `capture-session-summary.ts` - Session summary generation
- `stop-hook.ts` - Main session stop handler
- `subagent-stop-hook.ts` - Subagent completion handler

## File Formats

- **Session summaries**: Markdown with YAML frontmatter
- **Event logs**: JSONL (JSON Lines) format
- **Learnings**: Markdown with structured headers
- **State**: JSON files

## Privacy

This directory contains your interaction history. Keep it in your private repo:

```gitignore
# Add to .gitignore if version controlling
MEMORY/raw-outputs/
MEMORY/sessions/
MEMORY/security/
```

## Related Documentation

- Full architecture: `skills/CORE/SYSTEM/MEMORYSYSTEM.md`
- Hook configuration: `skills/CORE/SYSTEM/THEHOOKSYSTEM.md`
- Session continuity: `skills/CORE/Workflows/SessionContinuity.md`
