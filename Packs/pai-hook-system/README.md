---
name: Kai Hook System
pack-id: danielmiessler-pai-hook-system-core-v1.0.0
version: 1.0.0
author: danielmiessler
description: Event-driven automation framework for Claude Code - the foundation for all hook-based capabilities including security validation, session management, and context injection
type: feature
purpose-type: [automation, security, development]
platform: claude-code
dependencies: []
keywords: [hooks, automation, events, security, validation, sessions, context, claude-code, preprocessing, postprocessing]
---

<p align="center">
  <img src="../icons/pai-hook-system.png" alt="Kai Hook System" width="256">
</p>

# Kai Hook System (pai-hook-system)

> Event-driven automation framework for Claude Code - the foundation for all hook-based capabilities

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Security validator | `src/security-validator.ts` | Block dangerous commands before execution |
| Session initializer | `src/initialize-session.ts` | Set up session context and three-tier MEMORY structure |
| Context loader | `src/load-core-context.ts` | Load CORE skill at session start |
| Tab title updater | `src/update-tab-titles.ts` | Update terminal tabs with task context |
| **Event capture** | `src/capture-all-events.ts` | Universal event logging to JSONL (RESTORED v2.1.1) |
| **Session summary** | `src/capture-session-summary.ts` | Auto-generate session summaries (RESTORED v2.1.1) |
| **Stop handler** | `src/stop-hook.ts` | Capture work at session end (RESTORED v2.1.1) |
| **Subagent handler** | `src/subagent-stop-hook.ts` | Track delegated agent results (RESTORED v2.1.1) |
| Observability lib | `src/lib/observability.ts` | Event logging and dashboard integration (RESTORED v2.1.1) |
| Metadata lib | `src/lib/metadata-extraction.ts` | Agent metadata enrichment (RESTORED v2.1.1) |
| Hook config | `config/settings-hooks.json` | Claude Code hook registration template |
| Migration script | `migrate-to-memory.ts` | Migrate existing history/ data to MEMORY/ |

**Summary:**
- **Files created:** 12 (6 core + 4 memory hooks + 2 libraries)
- **Hooks registered:** 8 (PreToolUse, PostToolUse, SessionStart ×2, Stop, SubagentStop, SessionEnd, UserPromptSubmit)
- **Dependencies:** None (foundation pack)

## The Problem

Claude Code fires events throughout its operation, but by default nothing listens to them:

- **PreToolUse**: Before any tool runs - opportunity to validate, block, or modify
- **PostToolUse**: After any tool runs - opportunity to capture, log, or react
- **Stop**: When the agent finishes responding - opportunity to capture work
- **SessionStart**: When a new session begins - opportunity to initialize
- **SessionEnd**: When a session closes - opportunity to summarize
- **UserPromptSubmit**: When the user sends a message - opportunity to process

Without a hook system:
- Dangerous commands execute without validation
- Sessions start cold without context
- No automation layer between events and actions
- Each capability must be built from scratch

Claude Code's hook system is powerful but undocumented in practice. You can configure hooks in settings.json, but:
- What events are available?
- What data does each event provide?
- How do you write hooks that never block or crash?
- How do you chain multiple hooks together?

## The Solution

The Kai Hook System provides a complete framework for event-driven automation:

**Core Architecture:**

```
$PAI_DIR/
├── hooks/                           # Hook implementations
│   ├── security-validator.ts        # PreToolUse: Block dangerous commands
│   ├── initialize-session.ts        # SessionStart: Session setup
│   ├── load-core-context.ts         # SessionStart: Context injection
│   ├── update-tab-titles.ts         # UserPromptSubmit: Tab automation
│   └── lib/                         # Shared libraries
│       └── observability.ts         # Dashboard integration
└── settings.json                    # Hook configuration
```

**Hook Event Types:**

| Event | When It Fires | Use Cases |
|-------|---------------|-----------|
| `PreToolUse` | Before a tool executes | Security validation, command modification, blocking |
| `PostToolUse` | After a tool executes | Logging, capturing output, triggering actions |
| `Stop` | Main agent finishes | Capture work summaries, voice notifications |
| `SubagentStop` | Subagent finishes | Capture agent outputs, route to categories |
| `SessionStart` | New session begins | Load context, initialize state |
| `SessionEnd` | Session closes | Summarize work, cleanup |
| `UserPromptSubmit` | User sends message | Process input, update UI |
| `PreCompact` | Before context compaction | Save important context |

**Design Principles:**

1. **Never Block**: Hooks must always exit 0 - never crash Claude Code
2. **Fail Silently**: Errors are logged but don't interrupt work
3. **Fast Execution**: Hooks should complete in milliseconds
4. **Stdin/Stdout**: Events come via stdin JSON, output via stdout
5. **Composable**: Multiple hooks can chain on the same event

## Architecture Deep Dive

The hook system's power comes from its **event-driven middleware pattern** - a layered architecture that intercepts, processes, and extends every AI operation without modifying Claude Code itself.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HOOK SYSTEM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐                                                       │
│  │  Claude Code │ ──► Events fire at every operation                    │
│  └──────┬───────┘                                                       │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    LAYER 1: Event Stream                          │  │
│  │  SessionStart ─► PreToolUse ─► PostToolUse ─► Stop ─► SessionEnd  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    LAYER 2: Hook Registry                         │  │
│  │  settings.json defines which hooks fire on which events           │  │
│  │  Matchers filter by tool name (Bash, Edit, *) or context          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    LAYER 3: Hook Implementations                  │  │
│  │  TypeScript files that process events and take actions            │  │
│  │  security-validator.ts │ initialize-session.ts │ update-tabs.ts   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    LAYER 4: Shared Libraries                      │  │
│  │  Common utilities: observability.ts, prosody-enhancer.ts          │  │
│  │  Fail-safe patterns, logging, integration helpers                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                                                               │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    LAYER 5: External Integrations                 │  │
│  │  Observability dashboards, voice servers, notification systems    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### How Data Flows Through the System

**Example: User runs `rm -rf important/`**

```
1. Claude Code invokes Bash tool
         │
         ▼
2. PreToolUse event fires with payload:
   { tool_name: "Bash", tool_input: { command: "rm -rf important/" } }
         │
         ▼
3. settings.json routes to security-validator.ts (matcher: "Bash")
         │
         ▼
4. Hook receives JSON via stdin, pattern-matches against attack tiers
         │
         ▼
5. MATCH: Catastrophic deletion pattern detected
         │
         ▼
6. Hook exits with code 2 (BLOCK) + outputs warning message
         │
         ▼
7. Claude Code sees exit 2, BLOCKS the command
         │
         ▼
8. User sees: "🚨 BLOCKED: Catastrophic deletion detected"
```

### Why This Architecture Matters

**1. Separation of Concerns**
- Event stream (Claude Code) is separate from hook logic (your code)
- Registration (settings.json) is separate from implementation (.ts files)
- Each hook does one thing well (UNIX philosophy)

**2. Fail-Safe by Design**
- Hooks NEVER crash Claude Code (exit 0 on errors)
- External integrations fail silently (observability down? keep working)
- Fast execution (milliseconds, not seconds)

**3. Composable Pipeline**
- Multiple hooks can chain on the same event
- Each hook processes independently
- Order defined in settings.json

**4. Deterministic Behavior**
- Same event + same hook = same outcome
- Pattern matching is explicit, not fuzzy
- Exit codes have precise meanings (0=allow, 2=block)

**5. Zero-Overhead Extensibility**
- Add new hooks without modifying existing ones
- Add new event handlers without touching Claude Code
- Shared libraries reduce duplication

## What Problems This Architecture Prevents

| Problem | How Hooks Solve It |
|---------|-------------------|
| Dangerous commands execute | PreToolUse validates before execution |
| Sessions start cold | SessionStart injects context automatically |
| Work disappears | Stop/SubagentStop capture everything |
| No visibility into operations | PostToolUse logs to observability |
| UI doesn't show context | UserPromptSubmit updates tab titles |

## The Fundamental Insight

**Naive approach:** Build safety/automation INTO the AI prompts
- Fragile (prompts can be ignored)
- Inconsistent (varies by session)
- Invisible (no audit trail)

**Hook approach:** Build safety/automation AROUND the AI as middleware
- Robust (code can't be prompt-injected)
- Consistent (same code runs every time)
- Observable (events logged, actions traced)

The hook system transforms Claude Code from a standalone tool into an **observable, controllable, extensible infrastructure**. Every operation can be validated, logged, modified, or blocked. This is the foundation that enables all other PAI capabilities.

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
| `PAI_OBSERVABILITY_URL` | `http://localhost:4000/events` | Dashboard endpoint |
| `PAI_TAB_PREFIX` | `🤖` | Tab title prefix |

## Credits

- **Original concept**: Daniel Miessler - developed as part of Kai personal AI infrastructure
- **Contributors**: The PAI community
- **Hook system**: Anthropic Claude Code team

## Related Packs

- **pai-history-system** - Uses hooks for capturing session work and learnings
- **pai-voice-system** - Uses hooks for voice notification triggers
- **pai-core-install** - Uses SessionStart hooks for CORE skill context injection

## Changelog

### 1.0.0 - 2025-12-29
- Initial release
- Four core hooks: security-validator, initialize-session, load-core-context, update-tab-titles
- One lib file: observability
- Complete hook event reference documentation
- Security validation with 10 tiers of attack pattern detection
