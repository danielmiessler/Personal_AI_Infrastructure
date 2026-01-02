---
name: Kai History System
pack-id: danielmiessler-kai-history-system-core-v1.0.0
version: 1.0.0
author: danielmiessler
description: Granular context-tracking system for the entire AI infrastructure - captures all work, decisions, and learnings automatically
type: feature
purpose-type: [productivity, automation, development]
platform: claude-code
dependencies:
  - kai-hook-system (required) - History capture depends on hook events
keywords: [history, documentation, memory, capture, hooks, sessions, learnings, automation, context, recovery, debugging]
---

<p align="center">
  <img src="../icons/kai-history-system.png" alt="Kai History System" width="256">
</p>

# Kai History System (kai-history-system)

> Granular context-tracking system for the entire AI infrastructure - captures all work, decisions, and learnings automatically with zero manual effort

## Platform Compatibility

- **Claude Code**: Full native support via `settings.json` hooks.
- **Gemini CLI**: Supported via the `gemini-pai` adapter, which simulates the hook lifecycle (SessionStart and Stop).

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Universal event capture | `src/capture-all-events.ts` | Log all events to JSONL for audit trail |
| Stop hook | `src/stop-hook.ts` | Capture main agent completions and learnings |
| Subagent stop hook | `src/subagent-stop-hook.ts` | Route subagent outputs by type |
| Session summary | `src/capture-session-summary.ts` | Summarize sessions at close |
| Metadata extraction lib | `src/lib/metadata-extraction.ts` | Extract agent instance metadata |
| Hook config | `config/settings-hooks.json` | Claude Code hook registration template |

**Summary:**
- **Files created:** 6 + history directory structure
- **Hooks registered:** 7 (PreToolUse, PostToolUse, Stop, SubagentStop, SessionStart, SessionEnd, UserPromptSubmit)
- **Dependencies:** kai-hook-system (required)

## The Problem

AI agents are powerful but forgetful. Each session starts fresh with no memory of:

- What you built last week
- Why you made certain architectural decisions
- What bugs you've already fixed (and might reintroduce)
- Lessons learned from debugging sessions
- Research you've already conducted
- What agents discovered during parallel execution

This creates cascading problems:

**For Development Work:**
- You fix the same bug twice because you forgot the root cause
- Architectural decisions lack rationale when revisited months later
- Code reviews miss context because the "why" is lost

**For Agent Orchestration:**
- Parallel agents complete work that's never captured
- Background research disappears when the session ends
- Agent outputs aren't categorized or searchable

**For Learning and Improvement:**
- Insights get lost in conversation history
- No after-action reviews are possible
- Mistakes repeat because there's no institutional memory

## The Solution

The Kai History System solves this through **automatic, hook-based documentation**. Instead of requiring manual effort, it captures work as a byproduct of doing the work.

**Core Architecture:**

```
$PAI_DIR/
├── hooks/                           # Hook implementations
│   ├── capture-all-events.ts        # Universal event capture (all hooks)
│   ├── stop-hook.ts                 # Main agent completion capture
│   ├── subagent-stop-hook.ts        # Subagent output routing
│   ├── capture-session-summary.ts   # Session end summarization
│   └── lib/                         # Shared libraries
│       └── metadata-extraction.ts   # Agent instance tracking
├── history/                         # Captured outputs
│   ├── sessions/YYYY-MM/            # Session summaries
│   ├── learnings/YYYY-MM/           # Problem-solving narratives
│   ├── research/YYYY-MM/            # Investigation reports
│   ├── decisions/YYYY-MM/           # Architectural decisions
│   ├── execution/
│   │   ├── features/YYYY-MM/        # Feature implementations
│   │   ├── bugs/YYYY-MM/            # Bug fixes
│   │   └── refactors/YYYY-MM/       # Code improvements
│   └── raw-outputs/YYYY-MM/         # JSONL event logs
└── settings.json                    # Hook configuration
```

**Four Hooks, Complete Coverage:**

1. **capture-all-events.ts** - Captures every event to daily JSONL logs
2. **stop-hook.ts** - Categorizes main agent responses as learnings or sessions
3. **subagent-stop-hook.ts** - Routes agent outputs by type (research, decisions, features)
4. **capture-session-summary.ts** - Creates session summaries with files changed, tools used

## Architecture Deep Dive

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HISTORY SYSTEM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   LAYER 1: Event Capture                         │   │
│  │  capture-all-events.ts hooks into EVERY Claude Code event        │   │
│  │  PreToolUse │ PostToolUse │ Stop │ SubagentStop │ SessionEnd     │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   LAYER 2: Raw Storage                           │   │
│  │  Every event → JSONL file with full payload                      │   │
│  │  raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl                 │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   LAYER 3: Content Analysis                      │   │
│  │  Hooks analyze response content for category indicators          │   │
│  │  "problem + solved + root cause" → LEARNING                      │   │
│  │  "completed + deployed" → SESSION                                │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   LAYER 4: Agent Type Routing                    │   │
│  │  SubagentStop routes by agent type automatically                 │   │
│  │  researcher/intern → research/                                   │   │
│  │  architect → decisions/                                          │   │
│  │  engineer/designer → execution/features/                         │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   LAYER 5: Organized Storage                     │   │
│  │  Markdown files with YAML frontmatter in categorized dirs        │   │
│  │  learnings/ │ research/ │ decisions/ │ sessions/ │ execution/    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Categorization Logic

**Learning Detection (stop-hook.ts):**
```
Contains 2+ of these indicators:
  problem, solved, discovered, fixed, learned, realized,
  figured out, root cause, debugging, issue was, turned out,
  mistake, error, bug, solution

YES → learnings/
NO  → sessions/
```

**Agent Routing (subagent-stop-hook.ts):**
```
Agent Type          → Output Directory
─────────────────────────────────────
*researcher, intern → research/
architect           → decisions/
engineer, designer  → execution/features/
```

## What Problems This Solves

| Problem | How History Solves It |
|---------|----------------------|
| "What did we work on last week?" | `ls history/sessions/2025-01/` |
| "Why did we choose that architecture?" | `grep -l "architecture" history/decisions/` |
| "I fixed this bug before, what was the fix?" | `grep -r "auth" history/learnings/` |
| "What did that researcher agent find?" | Automatically in `history/research/` |
| "Can we audit what happened?" | Complete JSONL in `raw-outputs/` |

## Installation

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

## Verification

See [VERIFY.md](VERIFY.md) for testing and verification procedures.

## Configuration

**Environment variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `PAI_DIR` | `~/.config/pai` | Root PAI directory |
| `TIME_ZONE` | System default | Timestamp timezone |
| `DA` | `PAI` | AI assistant name |

## Credits

- **Original concept**: Daniel Miessler - developed as part of Kai personal AI infrastructure
- **Inspired by**: Git's version history, engineering logbooks, Zettelkasten method

## Related Packs

- **kai-hook-system** - Required foundation; provides the event stream
- **kai-core-install** - Skills can reference past learnings
- **kai-voice-system** - Voice notifications for significant captures

## Changelog

### 1.0.0 - 2025-12-28
- Initial release
- Four hooks: capture-all-events, stop-hook, subagent-stop-hook, capture-session-summary
- One lib file: metadata-extraction
- Automatic categorization by content and agent type
