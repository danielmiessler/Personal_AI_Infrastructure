# Unified Event System

PAI includes a unified event system for hook observability. All events are logged to `MEMORY/STATE/events.jsonl` in append-only JSONL format.

## Setup

Add EventLogger to your `settings.json` hooks section:

```json
{
  "hooks": {
    "SubagentStart": [{ "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/EventLogger.hook.ts" }] }],
    "SubagentStop": [{ "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/EventLogger.hook.ts" }] }],
    "TaskCompleted": [{ "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/EventLogger.hook.ts" }] }],
    "InstructionsLoaded": [{ "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/EventLogger.hook.ts" }] }],
    "TeammateIdle": [{ "hooks": [{ "type": "command", "command": "${PAI_DIR}/hooks/EventLogger.hook.ts" }] }]
  }
}
```

## Event Format

Each event is a JSON line with:
- `type` — dot-separated event category (e.g., `agent.start`, `hook.error`)
- `timestamp` — ISO 8601 (auto-injected)
- `session_id` — from `CLAUDE_SESSION_ID` env var (auto-injected)
- `source` — hook or handler name

## Adding New Events

1. Add a handler function in `EventLogger.hook.ts`
2. Add to the `HANDLERS` routing table
3. (Optional) Add to `RESPONDERS` if the hook needs JSON output
4. Register in `settings.json`

## Routing Table Pattern

Instead of creating separate hook files for each event, EventLogger uses a routing table:
- `HANDLERS` — maps event names to handler functions (for logging)
- `RESPONDERS` — maps event names to response generators (for hooks that need stdout output)

This consolidates pure-observability hooks into one file, reducing file count and maintenance burden.

## Event Types

| Event | Type | Description |
|-------|------|-------------|
| SubagentStart | `agent.start` | Agent spawned with type and description |
| SubagentStop | `agent.stop` | Agent completed with transcript path |
| TaskCompleted | `task.completed` | Background task finished |
| InstructionsLoaded | `instructions.loaded` | CLAUDE.md files loaded at startup |
| TeammateIdle | `teammate.idle` | Teammate went idle (auto-stopped) |
| (any hook error) | `hook.error` | Hook failed silently |
| (unknown) | `custom.unknown` | Unrecognized event routed here |

## Error Tracking

Import `emitHookError` from `hooks/lib/hook-error-emitter.ts` in any hook to track silent failures:

```typescript
import { emitHookError } from './lib/hook-error-emitter';

try {
  // hook logic
} catch (error) {
  emitHookError('MyHook', error);
  // still exit 0 — fail-open
}
```

## Querying Events

Events are plain JSONL — query with standard tools:

```bash
# Count events by type
jq -s 'group_by(.type) | map({type: .[0].type, count: length})' MEMORY/STATE/events.jsonl

# Recent agent starts
jq 'select(.type == "agent.start")' MEMORY/STATE/events.jsonl | tail -5

# Errors in the last hour
jq 'select(.type == "hook.error")' MEMORY/STATE/events.jsonl
```
