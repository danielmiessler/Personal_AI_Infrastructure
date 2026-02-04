# Phase 6: Observability & Monitoring — Briefing for Claude Code

## How to Use This File

You are a Claude Code instance working in the LifeOS Obsidian vault. This file is your complete briefing for **Phase 6** of the AI Genius transformation. Phases 1–5 are complete and merged to main. This is the final phase.

**Reference repo**: `~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ` — clone of Daniel Messler's PAI. Read files there for implementation patterns. Adapt, don't copy.

**Safety rule**: After EVERY sub-step (6A through 6D), commit to git with a descriptive message. If anything breaks, `git revert` that commit.

---

## PART 1: CURRENT STATE AFTER PHASE 5

### What Exists

The full system is functional: modular architecture, 7 hooks, learning engine, 4 advanced skills, The Algorithm with ISC-based execution.

What's missing: **visibility**. When the system runs a THOROUGH Algorithm execution with research + council + multiple parallel agents, there's no way to see what happened, what tools were called, how long things took, or where time was spent. You're flying blind on complex tasks.

### What Phase 6 Adds

1. **Event logging** — every hook event, tool call, and agent action logged to structured JSONL files
2. **PostToolUse capture hook** — records what every tool call actually did
3. **Enhanced session summary** — richer end-of-session reports using logged events
4. **Optional dashboard** — real-time web UI showing system activity (Bun HTTP + WebSocket)

### Design Decision: Lightweight vs Full PAI

PAI's observability is a full Vue 3 dashboard with WebSocket streaming, agent swim lanes, live pulse charts, and a Bun HTTP server. That's powerful but complex to maintain.

This vault's approach: **JSONL logging first, dashboard optional**. The JSONL files alone are useful — grep-able, readable, and feed into the weekly synthesis (Phase 3). The dashboard is a nice-to-have for debugging complex Algorithm executions.

---

## PART 2: PAI REFERENCE FILES

### Observability Server
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/server/src/index.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/server/src/file-ingest.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/server/src/types.ts
```

### Event Capture Hook
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/AgentOutputCapture.hook.ts
```

### Observability Library
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/observability.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/metadata-extraction.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/TraceEmitter.ts
```

### Settings Hook Config
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/config/settings-hooks.json
```

### Dashboard Frontend (optional — only if building 6D)
```
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/client/src/App.vue
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/client/src/composables/useWebSocket.ts
~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/client/src/composables/useEventColors.ts
```

---

## PART 3: IMPLEMENTATION STEPS

### Constraints

**DO NOT TOUCH**:
- Existing hooks, skills, policies, memory structure
- Vault folder structure, tools, plugins
- CLAUDE.md (no changes needed)

**DESIGN PRINCIPLES**:
- Logging hooks must NEVER block Claude Code (exit 0 always, fast execution)
- Fire-and-forget: if logging fails, work continues unaffected
- JSONL for structured data (one JSON object per line, append-only)
- The system must work identically with or without the dashboard running

---

### Step 6A: Event Logger Library

**What it does**: Shared utility that all hooks use to log events. Writes structured JSONL to `AI/memory/events/`. This is the foundation for all observability.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/observability.ts
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/lib/TraceEmitter.ts

□ Create directory: AI/memory/events/

□ Create AI/hooks/lib/event-logger.ts:

  A shared utility with one main function:

  logEvent(event: {
    hook_type: string;         // "PreToolUse", "PostToolUse", "UserPromptSubmit", "Stop", "SubagentStop"
    tool_name?: string;        // "Bash", "Read", "Edit", "Write", "Task", etc.
    tool_input_summary?: string; // Condensed description of what the tool was asked to do
    tool_result_summary?: string; // Condensed result (for PostToolUse only)
    session_id?: string;       // From stdin JSON if available
    agent_type?: string;       // "main", "researcher", "council-strategist", etc.
    effort_level?: string;     // If Algorithm is active
    algorithm_phase?: string;  // If Algorithm is active
    isc_row?: number;          // If working on specific ISC row
    duration_ms?: number;      // For PostToolUse: how long the tool call took
    metadata?: Record<string, any>; // Any additional context
  })

  Implementation:
  1. Add timestamp (ISO format) to the event
  2. Determine log file: AI/memory/events/YYYY-MM-DD.jsonl
  3. Append one JSON line to the file
  4. MUST: never throw, never block, wrap in try/catch
  5. MUST: fast — just a file append, no processing

  Example JSONL line:
  {"timestamp":"2026-02-04T20:15:30.000Z","hook_type":"PostToolUse","tool_name":"Bash","tool_input_summary":"git status","duration_ms":245,"session_id":"abc123"}

  Also export:
  - readTodayEvents(): Read today's JSONL file, return parsed array
  - readEventsForDateRange(start, end): Read multiple days
  - getEventStats(events): Count by tool_name, by hook_type, total duration

□ Test:
  → Import and call logEvent() from a test script
  → Verify: AI/memory/events/YYYY-MM-DD.jsonl created with valid JSONL
  → Verify: multiple calls append correctly (not overwrite)
  → Verify: malformed input doesn't crash (silently skipped)

□ Git commit: "add: event logger library for structured JSONL observability"
```

---

### Step 6B: Event Capture Hooks (PostToolUse + Enhanced Existing)

**What it does**: Adds a PostToolUse hook that logs every tool call result. Enhances existing hooks to also log their activity via the event logger.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-hook-system/src/hooks/AgentOutputCapture.hook.ts
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/config/settings-hooks.json

□ Create AI/hooks/event-capture.ts:
  → PostToolUse hook
  → Reads JSON from stdin: { tool_name, tool_use_id, tool_result }
  → Logs via event-logger.ts:
    - hook_type: "PostToolUse"
    - tool_name: from stdin
    - tool_input_summary: condensed (first 200 chars of tool_result, or "success"/"error")
    - duration_ms: not available from PostToolUse directly — omit or estimate
  → For Task tool (subagent) completions:
    - Also log agent_type from tool input
    - Log a summary of the agent's output (first 300 chars)
  → MUST: exit 0 always, fast execution, no stdout output
    (this hook is for logging only, not content injection)

□ Enhance existing hooks to log their activity:
  Add a single logEvent() call to each existing hook:

  - security-validator.ts: log every decision (allow/block/confirm) with tool_name and pattern matched
  - on-feedback.ts: log when explicit rating is captured (rating value, has comment)
  - implicit-sentiment.ts: log when implicit signal detected (sentiment, confidence)
  - auto-work-creation.ts: log when work directory created or prompt count updated
  - on-session-start.ts: log when context injection fires (first prompt only)
  - on-session-end.ts: log when session ends (work completed, duration)
  - format-enforcer.ts: log that format reminder was injected (just a ping, no content)

  Each addition is ONE LINE: import logEvent, call it with relevant data.
  Do NOT restructure the hooks. Just add the logging call.

□ Register event-capture.ts in .claude/settings.json:
  Add to existing config:
  "PostToolUse": [
    {
      "matcher": "",
      "hooks": [
        {"type": "command", "command": "bun run /Users/krzysztofgoworek/LifeOS/AI/hooks/event-capture.ts"}
      ]
    }
  ]

□ Updated .claude/settings.json should now have:
  - PreToolUse: security-validator
  - UserPromptSubmit: on-session-start, on-feedback, format-enforcer,
      auto-work-creation, implicit-sentiment
  - PostToolUse: event-capture (NEW)
  - Stop: on-session-end

□ Test:
  → Start a session, do some work (read files, run commands, edit)
  → Verify: AI/memory/events/YYYY-MM-DD.jsonl has entries for each tool call
  → Verify: security decisions are logged
  → Verify: rating events are logged
  → Verify: session start/end events are logged
  → Verify: no impact on Claude Code performance (hooks still fast)

□ Git commit: "add: event capture hook and observability logging across all hooks"
```

---

### Step 6C: Session Activity Report

**What it does**: Enhances the session end processing to produce a brief activity report using logged events. Shows what happened in the session: tools used, effort level, ISC status, time spent.

**Implementation**:

```
□ Enhance AI/hooks/on-session-end.ts:
  → After existing session-end logic (work completion, state cleanup):
  → Import readTodayEvents() and getEventStats() from event-logger.ts
  → Read today's events, filter to current session_id
  → Compute:
    - Total tool calls (by type: Read, Bash, Edit, Write, Task)
    - Security events (any blocks or confirmations?)
    - Ratings captured (explicit + implicit)
    - Session duration (first event to last event)
    - Algorithm usage (was ISC created? How many rows? Final status?)
  → Write summary to the session's work directory:
    AI/memory/work/{session-dir}/activity-report.md

    # Session Activity Report
    **Date**: YYYY-MM-DD HH:MM - HH:MM
    **Duration**: N minutes
    **Effort**: [level]

    ## Tool Usage
    | Tool | Calls |
    |---|---|
    | Read | 15 |
    | Bash | 8 |
    | Edit | 5 |
    | Task | 3 |
    | Write | 2 |

    ## Security Events
    - N tool calls checked, N blocked, N confirmed

    ## Ratings
    - Explicit: N (avg: X.X)
    - Implicit: N (avg: X.X)

    ## Algorithm (if used)
    - ISC: [summary] — N rows, N done, N blocked
    - Iterations: N

  → This report is readable in Obsidian and feeds into weekly synthesis (Phase 3)
  → Remember: Stop hook stdout is NOT displayed — this writes to file only

□ Enhance AI/scripts/learning-synthesis.sh (Phase 3):
  → Add to the synthesis prompt:
    "Also read AI/memory/events/ for the past 7 days.
     Compute: total tool calls, most-used tools, average session duration,
     security events, and include in the Weekly Summary section."

□ Test:
  → Run a session with varied activity
  → Exit session
  → Verify: AI/memory/work/{session}/activity-report.md exists
  → Verify: report has accurate tool call counts
  → Verify: readable in Obsidian

□ Git commit: "add: session activity reports from event logs"
```

---

### Step 6D: Real-Time Dashboard (OPTIONAL)

**What it does**: A lightweight web dashboard that streams events in real-time via WebSocket. Shows what the system is doing right now. Useful for monitoring complex Algorithm executions with parallel agents.

**This step is OPTIONAL.** Steps 6A-6C provide full observability via JSONL files and activity reports. The dashboard adds a live visual interface on top.

**Skip this step if**: you're comfortable reading JSONL files and activity reports. Come back to it later if you find yourself wanting real-time visibility.

**Implementation**:

```
□ Read PAI references:
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/server/src/index.ts
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/server/src/file-ingest.ts
  - ~/Daniel-Messler-personal_ai_infrastructure-claude-ai-genius-system-design-GcvOQ/Packs/pai-observability-server/src/Observability/apps/client/src/App.vue

□ Create AI/observability/ directory

□ Create AI/observability/server.ts:
  A Bun HTTP + WebSocket server. Simplified version of PAI's:

  HTTP endpoints:
  - GET /events/recent — last 50 events from today's JSONL
  - GET /events/today — all events from today
  - GET /health — server status

  WebSocket endpoint:
  - /stream — real-time event streaming

  File watching:
  - Watch AI/memory/events/ directory for changes
  - When JSONL file is appended: read new lines, broadcast to WebSocket clients
  - Track file position to only read new content

  Server config:
  - Port: 4200 (avoid conflicts with other services)
  - Host: localhost (not exposed externally)
  - No authentication needed (local only)

  Keep it simple:
  - No database (read JSONL files directly)
  - No persistence (events already in JSONL)
  - No themes (minimal UI)
  - Stateless restarts (re-read from files on start)

□ Create AI/observability/dashboard.html:
  A SINGLE HTML file with embedded CSS and JavaScript. No build step.
  No Vue, no React — plain HTML + vanilla JS + WebSocket.

  Features:
  - WebSocket connection to ws://localhost:4200/stream
  - Auto-reconnect on disconnect (3 second delay)
  - Event list (newest first, max 200 displayed)
  - Each event shows: timestamp, hook_type, tool_name, summary
  - Color coding by hook_type:
    - PreToolUse: yellow
    - PostToolUse: orange
    - UserPromptSubmit: cyan
    - Stop: red
    - SubagentStop: purple
  - Filter buttons: All / Tools / Prompts / Security / Ratings
  - Simple stats bar: events today, active sessions, last event time
  - Auto-scroll to newest event (toggle on/off)

  Style: dark background (#1a1b26), monospace font, minimal.
  The whole thing should be < 500 lines of HTML/CSS/JS.

□ Create AI/observability/start.sh:
  #!/bin/bash
  # Start the observability dashboard
  cd "$(dirname "$0")"
  echo "Starting observability server on http://localhost:4200"
  bun run server.ts &
  SERVER_PID=$!
  echo "Server PID: $SERVER_PID"
  echo "Dashboard: open AI/observability/dashboard.html in browser"
  echo "Or: open http://localhost:4200/events/recent for raw events"

  Make executable: chmod +x AI/observability/start.sh

□ Optionally create launchd plist to auto-start:
  AI/scripts/plists/com.lifeos.observability.plist
  → Start on login
  → Keep alive
  → Log to AI/scripts/logs/observability.log

□ Update event-logger.ts (from 6A):
  → After writing to JSONL, also attempt to POST to http://localhost:4200/events
  → Fire-and-forget: if server is not running, silently fail (no retry)
  → This enables real-time streaming when dashboard is active

□ Test:
  → Run: bash AI/observability/start.sh
  → Open dashboard.html in browser
  → Start a Claude Code session, do some work
  → Verify: events appear in real-time on dashboard
  → Verify: filter buttons work
  → Stop the server → verify Claude Code still works normally (no impact)

□ Git commit: "add: optional real-time observability dashboard"
```

---

## PART 4: MANUAL TESTING CHECKLIST

```
□ Test 1: Event Logging (6A + 6B)
  → Start session, read a file, run a command, edit a file
  → Verify: AI/memory/events/YYYY-MM-DD.jsonl has entries
  → Verify: each entry is valid JSON on one line
  → Verify: entries include tool_name, hook_type, timestamp

□ Test 2: Security Event Logging
  → Trigger a security check (try a risky command)
  → Verify: security decision logged in events JSONL

□ Test 3: Rating Event Logging
  → Give an explicit rating "7 - good"
  → Verify: rating event logged in events JSONL

□ Test 4: Session Activity Report (6C)
  → Run a session with 10+ tool calls
  → Exit session
  → Verify: activity-report.md in work directory
  → Verify: tool counts match actual usage
  → Verify: readable in Obsidian

□ Test 5: Event File Rotation
  → Check that events are in date-stamped files (YYYY-MM-DD.jsonl)
  → Verify: new day = new file (no unbounded growth)

□ Test 6: Graceful Degradation
  → Delete AI/memory/events/ directory
  → Start a session → verify Claude Code works normally
  → Verify: event logger recreates the directory silently

□ Test 7: Dashboard (if 6D implemented)
  → Start server: bash AI/observability/start.sh
  → Open dashboard in browser
  → Do work in Claude Code
  → Verify: events stream in real-time
  → Stop server → verify Claude Code unaffected

□ Test 8: Synthesis Integration
  → Accumulate a few days of event logs
  → Run learning-synthesis.sh
  → Verify: synthesis report includes tool usage stats
```

---

## PART 5: EVENT LOG STRUCTURE

After Phase 6, the events directory:

```
AI/memory/events/
├── 2026-02-04.jsonl    # One file per day, auto-rotated
├── 2026-02-05.jsonl
└── ...
```

Each line is a JSON object:
```json
{"timestamp":"2026-02-04T20:15:30.000Z","hook_type":"PostToolUse","tool_name":"Read","tool_input_summary":"AI/skills/research.md","session_id":"abc123","agent_type":"main"}
{"timestamp":"2026-02-04T20:15:31.500Z","hook_type":"PostToolUse","tool_name":"Bash","tool_input_summary":"git status","session_id":"abc123","agent_type":"main","duration_ms":245}
{"timestamp":"2026-02-04T20:15:35.000Z","hook_type":"PostToolUse","tool_name":"Task","tool_input_summary":"research agent spawned","session_id":"abc123","agent_type":"researcher"}
```

Benefits:
- **Grep-able**: `grep '"tool_name":"Bash"' AI/memory/events/2026-02-04.jsonl | wc -l` → bash call count
- **Readable in Obsidian**: JSONL files open as text
- **Date-partitioned**: no unbounded growth, easy to archive old files
- **Feeds into synthesis**: weekly learning script reads events for tool usage stats
- **Feeds into activity reports**: session end hook summarises per-session activity

---

## PART 6: COMPLETE SYSTEM OVERVIEW

With Phase 6 complete, here is the full LifeOS AI Genius architecture:

```
┌─────────────────────────────────────────────────────────┐
│                     CLAUDE.md                            │
│              (Slim router, ~1,700 tokens)                │
│  Identity → Effort Classification → Skill Routing       │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────────┐
         ▼             ▼                 ▼
   ┌──────────┐  ┌──────────┐    ┌──────────────┐
   │  Skills  │  │ Policies │    │ The Algorithm │
   │  (28+)   │  │  (10+)   │    │  (Phase 5)   │
   └────┬─────┘  └──────────┘    │ OBSERVE→LEARN│
        │                        │   ISC Table   │
        │  ┌─────────────────────┘
        ▼  ▼
   ┌──────────────┐     ┌──────────────┐
   │ Context Maps │     │    Hooks     │
   │    (9+)      │     │    (8)       │
   └──────────────┘     └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌────────────┐
      │    Memory     │ │   Signals    │ │   Events   │
      │  work/        │ │ ratings.jsonl│ │ YYYY-MM-DD │
      │  learnings/   │ │ (explicit +  │ │   .jsonl   │
      │  proposals/   │ │  implicit)   │ │ (Phase 6)  │
      │  research/    │ │              │ │            │
      │  telos/       │ │              │ │            │
      └──────┬────────┘ └──────┬───────┘ └─────┬──────┘
             │                 │                │
             └─────────────────┼────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │  Weekly Synthesis    │
                    │  (Phase 3)          │
                    │  → Proposals        │
                    │  → Skill Improvement│
                    │  → Preference Promo │
                    └─────────────────────┘
```

### All Hooks (Final State)

| Hook | Event Type | Purpose |
|---|---|---|
| on-session-start.ts | UserPromptSubmit | Context injection (first prompt only) |
| on-feedback.ts | UserPromptSubmit | Explicit rating capture (1-10) |
| format-enforcer.ts | UserPromptSubmit | Format reminder injection |
| auto-work-creation.ts | UserPromptSubmit | Automatic session tracking |
| implicit-sentiment.ts | UserPromptSubmit | Passive frustration/satisfaction detection |
| security-validator.ts | PreToolUse | Security pattern checking |
| event-capture.ts | PostToolUse | Tool call logging (Phase 6) |
| on-session-end.ts | Stop | Work completion + activity report |

### All Scripts

| Script | Schedule | Purpose |
|---|---|---|
| daily-brief.sh | 8:00 AM daily | Morning briefing with WIP + proposals reminder |
| deep-work-block.sh | 8:30 AM weekdays | Calendar analysis, deep work setup |
| learning-synthesis.sh | 9:00 AM Sunday | Weekly signal analysis + proposals |
| weekly-review.sh | 10:00 AM Sunday | GTD review + AI system health |
| vault-cleanup.sh | 11:00 AM 1st Saturday | Vault maintenance |
| daily-close.sh | 10:00 PM daily | End-of-day processing + WIP update |

### The Feedback Loop

```
User works with Claude
    → Hooks capture: ratings, sentiment, tool usage, security events
    → Memory accumulates: preferences, mistakes, execution patterns
    → Weekly synthesis: analyses signals, finds patterns
    → Proposals generated: skill improvements, preference promotions, new rules
    → User reviews: approve / reject
    → Skills & policies improve
    → Next week: better performance
    → Repeat
```

This is a self-improving system. Every interaction makes it slightly better. Phase 6 adds the visibility layer so you can see the improvement happening.
