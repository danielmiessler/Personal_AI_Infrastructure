---
name: PAI Hook System
pack-id: danielmiessler-pai-hook-system-v2.3.0
version: 2.3.0
author: danielmiessler
description: Event-driven automation framework for Claude Code - the foundation for all hook-based capabilities including security validation, session management, context injection, learning capture, and sentiment analysis
type: feature
purpose-type: [automation, security, development, learning]
platform: claude-code
dependencies: [pai-core-install]
keywords: [hooks, automation, events, security, validation, sessions, context, claude-code, preprocessing, postprocessing, learning, sentiment]
---

<p align="center">
  <img src="../icons/pai-hook-system.png" alt="PAI Hook System" width="256">
</p>

# PAI Hook System (pai-hook-system)

> Event-driven automation framework for Claude Code - the foundation for all hook-based capabilities

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What's Included

| Component | Count | Purpose |
|-----------|-------|---------|
| Hook files | 15 | Event handlers for all lifecycle events |
| Library files | 12 | Shared utilities and helpers |
| Handler files | 4 | Specialized processing handlers |

**Summary:**
- **Files created:** 31
- **Hooks registered:** 15 (SessionStart x3, PreToolUse x1, UserPromptSubmit x3, Stop x7, SubagentStop x1)
- **Dependencies:** pai-core-install (foundation pack)

## The Problem

Claude Code fires events throughout its operation, but by default nothing listens to them:

- **PreToolUse**: Before any tool runs - opportunity to validate, block, or modify
- **PostToolUse**: After any tool runs - opportunity to capture, log, or react
- **Stop**: When the agent finishes responding - opportunity to capture work
- **SubagentStop**: When a subagent finishes - opportunity to capture agent output
- **SessionStart**: When a new session begins - opportunity to initialize
- **SessionEnd**: When a session closes - opportunity to summarize
- **UserPromptSubmit**: When the user sends a message - opportunity to process

Without a hook system:
- Dangerous commands execute without validation
- Sessions start cold without context
- No automation layer between events and actions
- Each capability must be built from scratch
- Learning opportunities are missed
- Sentiment and feedback go uncaptured

## The Solution

The PAI Hook System provides a complete framework for event-driven automation:

**Core Architecture:**

```
$PAI_DIR/
├── hooks/                           # Hook implementations
│   ├── SecurityValidator.hook.ts    # PreToolUse: Block dangerous commands
│   ├── LoadContext.hook.ts          # SessionStart: Context injection
│   ├── StartupGreeting.hook.ts      # SessionStart: Voice greeting
│   ├── CheckVersion.hook.ts         # SessionStart: Version compatibility
│   ├── UpdateTabTitle.hook.ts       # UserPromptSubmit: Tab automation
│   ├── SetQuestionTab.hook.ts       # UserPromptSubmit: Question state
│   ├── ExplicitRatingCapture.hook.ts# UserPromptSubmit: Rating capture
│   ├── FormatEnforcer.hook.ts       # Stop: Format compliance
│   ├── StopOrchestrator.hook.ts     # Stop: Post-response coordination
│   ├── SessionSummary.hook.ts       # Stop: Session summaries
│   ├── QuestionAnswered.hook.ts     # Stop: Question completion
│   ├── AutoWorkCreation.hook.ts     # Stop: Work entry creation
│   ├── WorkCompletionLearning.hook.ts # Stop: Learning capture
│   ├── ImplicitSentimentCapture.hook.ts # Stop: Sentiment analysis
│   ├── AgentOutputCapture.hook.ts   # SubagentStop: Agent output routing
│   ├── lib/                         # Shared libraries (12 files)
│   └── handlers/                    # Specialized handlers (4 files)
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
| `UserPromptSubmit` | User sends message | Process input, update UI, capture ratings |
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
+-------------------------------------------------------------------------+
|                        HOOK SYSTEM ARCHITECTURE                          |
+-------------------------------------------------------------------------+
|                                                                         |
|  +----------------+                                                     |
|  |  Claude Code   | --> Events fire at every operation                  |
|  +-------+--------+                                                     |
|          |                                                              |
|          v                                                              |
|  +------------------------------------------------------------------+  |
|  |                    LAYER 1: Event Stream                          |  |
|  |  SessionStart --> PreToolUse --> PostToolUse --> Stop --> SessionEnd  |
|  +------------------------------------------------------------------+  |
|          |                                                              |
|          v                                                              |
|  +------------------------------------------------------------------+  |
|  |                    LAYER 2: Hook Registry                         |  |
|  |  settings.json defines which hooks fire on which events           |  |
|  |  Matchers filter by tool name (Bash, Edit, *) or context          |  |
|  +------------------------------------------------------------------+  |
|          |                                                              |
|          v                                                              |
|  +------------------------------------------------------------------+  |
|  |                    LAYER 3: Hook Implementations                  |  |
|  |  TypeScript files that process events and take actions            |  |
|  |  15 hooks covering security, UI, learning, and orchestration      |  |
|  +------------------------------------------------------------------+  |
|          |                                                              |
|          v                                                              |
|  +------------------------------------------------------------------+  |
|  |                    LAYER 4: Shared Libraries                      |  |
|  |  Common utilities: observability, notifications, identity         |  |
|  |  Fail-safe patterns, logging, integration helpers                 |  |
|  +------------------------------------------------------------------+  |
|          |                                                              |
|          v                                                              |
|  +------------------------------------------------------------------+  |
|  |                    LAYER 5: External Integrations                 |  |
|  |  Observability dashboards, voice servers, notification systems    |  |
|  +------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

### How Data Flows Through the System

**Example: User runs `rm -rf important/`**

```
1. Claude Code invokes Bash tool
         |
         v
2. PreToolUse event fires with payload:
   { tool_name: "Bash", tool_input: { command: "rm -rf important/" } }
         |
         v
3. settings.json routes to SecurityValidator.hook.ts (matcher: "Bash")
         |
         v
4. Hook receives JSON via stdin, pattern-matches against attack tiers
         |
         v
5. MATCH: Catastrophic deletion pattern detected
         |
         v
6. Hook exits with code 2 (BLOCK) + outputs warning message
         |
         v
7. Claude Code sees exit 2, BLOCKS the command
         |
         v
8. User sees: "BLOCKED: Catastrophic deletion detected"
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
| Feedback goes uncaptured | Rating hooks capture explicit and implicit signals |
| Learnings are lost | WorkCompletionLearning extracts insights |

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
| `PAI_DIR` | `~/.claude` | Root PAI directory |
| `TIME_ZONE` | System default | Timestamp timezone |
| `DA` | `PAI` | AI assistant name |
| `PAI_OBSERVABILITY_URL` | `http://localhost:4000/events` | Dashboard endpoint |
| `PAI_TAB_PREFIX` | ` ` | Tab title prefix |

## Hook Registry

### SessionStart Hooks (3)

| Hook | Purpose |
|------|---------|
| `LoadContext.hook.ts` | Inject CORE skill into context |
| `StartupGreeting.hook.ts` | Display PAI banner with voice |
| `CheckVersion.hook.ts` | Check for Claude Code updates |

### PreToolUse Hooks (1)

| Hook | Purpose |
|------|---------|
| `SecurityValidator.hook.ts` | Block dangerous commands |

### UserPromptSubmit Hooks (3)

| Hook | Purpose |
|------|---------|
| `UpdateTabTitle.hook.ts` | Update tab with task context |
| `SetQuestionTab.hook.ts` | Mark tab for questions |
| `ExplicitRatingCapture.hook.ts` | Capture 1-10 ratings |

### Stop Hooks (7)

| Hook | Purpose |
|------|---------|
| `FormatEnforcer.hook.ts` | Enforce response format |
| `StopOrchestrator.hook.ts` | Coordinate post-response handlers |
| `SessionSummary.hook.ts` | Generate session summaries |
| `QuestionAnswered.hook.ts` | Track question completion |
| `AutoWorkCreation.hook.ts` | Create work entries |
| `WorkCompletionLearning.hook.ts` | Extract learnings |
| `ImplicitSentimentCapture.hook.ts` | Analyze sentiment |

### SubagentStop Hooks (1)

| Hook | Purpose |
|------|---------|
| `AgentOutputCapture.hook.ts` | Capture subagent outputs |

## Credits

- **Original concept**: Daniel Miessler - developed as part of PAI personal AI infrastructure
- **Contributors**: The PAI community
- **Hook system**: Anthropic Claude Code team

## Related Packs

- **pai-core-install** - Required foundation pack
- **pai-voice-system** - Uses hooks for voice notification triggers
- **pai-observability-server** - Receives hook events for dashboard display

## Changelog

### 2.3.0 - 2026-01-14
- Major release with 15 hooks (up from 4)
- Added learning capture system (WorkCompletionLearning, ExplicitRatingCapture, ImplicitSentimentCapture)
- Added work tracking (AutoWorkCreation, SessionSummary)
- Added agent orchestration (AgentOutputCapture)
- Added question tracking (QuestionAnswered, SetQuestionTab)
- Added format enforcement (FormatEnforcer)
- Expanded shared libraries to 12 files
- Added handlers directory with 4 specialized handlers
- Complete hook documentation with inter-hook dependencies

### 1.0.0 - 2025-12-29
- Initial release
- Four core hooks: security-validator, initialize-session, load-core-context, update-tab-titles
- One lib file: observability
- Complete hook event reference documentation
