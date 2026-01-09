# MEMORY System

PAI's persistent memory architecture for session history, learnings, and operational state.

## Directory Structure

```
MEMORY/
├── research/          # Research session outputs (timestamped subdirs)
├── sessions/          # Session summaries and context
├── learnings/         # Learning artifacts and insights
├── decisions/         # Architectural decision records
├── execution/         # Task execution logs
├── security/          # Security event logs
├── recovery/          # Recovery snapshots and journals
├── raw-outputs/       # JSONL event streams
├── backups/           # Pre-change backups
├── State/             # Operational state files
└── History/           # Historical archives
```

## Directory Purposes

| Directory | Purpose | Retention |
|-----------|---------|-----------|
| `research/` | Deep research outputs, organized by date | Permanent |
| `sessions/` | Session summaries captured at session end | Rolling 90 days |
| `learnings/` | Extracted insights and learnings | Permanent |
| `decisions/` | ADRs (Architecture Decision Records) | Permanent |
| `execution/` | Task/feature execution logs | Rolling 30 days |
| `security/` | Security events and audit logs | Permanent |
| `recovery/` | Recovery snapshots, journals | Rolling 7 days |
| `raw-outputs/` | JSONL event streams | Rolling 7 days |
| `backups/` | Pre-refactoring state backups | As needed |
| `State/` | Current operational state | Active |
| `History/` | Historical archives | Permanent |

## Event Capture

Events are captured automatically via the `pai-history-system` hooks:

- **SessionStart**: Session initialization logged
- **UserPromptSubmit**: User inputs captured
- **PreToolUse/PostToolUse**: Tool invocations logged
- **Stop/SubagentStop**: Session/agent termination captured
- **SessionEnd**: Full session summary generated

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
