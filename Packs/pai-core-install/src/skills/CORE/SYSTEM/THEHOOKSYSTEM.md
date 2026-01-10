<!--
================================================================================
PAI CORE - SYSTEM/THEHOOKSYSTEM.md
================================================================================

PURPOSE:
Hook system documentation. Event-driven automation that fires at key lifecycle
points - session start, tool use, session end.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/THEHOOKSYSTEM.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/THEHOOKSYSTEM.md

CUSTOMIZATION:
- [ ] Configure your hooks in settings.json
- [ ] Add voice server URL if using voice notifications
- [ ] Adjust hook implementations for your needs

RELATED FILES:
- PAISYSTEMARCHITECTURE.md - Core architecture
- THENOTIFICATIONSYSTEM.md - Notification channels
- MEMORYSYSTEM.md - Memory system integration

LAST UPDATED: 2026-01-08
VERSION: 1.1.0
================================================================================
-->

# Hook System

Event-driven automation for AI coding assistants.

---

## What Are Hooks?

Hooks are scripts that execute at specific lifecycle points:
- **SessionStart** - When a new AI session begins
- **PreToolUse** - Before a tool is executed
- **PostToolUse** - After a tool completes
- **Stop** - When the session ends

---

## Hook Configuration

Located in `${PAI_DIR}/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "SessionStart",
        "hooks": [
          {
            "type": "command",
            "command": "bun run ${PAI_DIR}/hooks/LoadContext.hook.ts"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "Stop",
        "hooks": [
          {
            "type": "command",
            "command": "bun run ${PAI_DIR}/hooks/SessionSummary.hook.ts"
          }
        ]
      }
    ]
  }
}
```

---

## Core Hook Types

### SessionStart Hooks

Fire when a new session begins. Common uses:
- Load CORE context and skill files
- Initialize state
- Check for reminders or active tasks

**Example: LoadContext.hook.ts**
```typescript
// Reads and outputs CORE skill content
// Creates system prompt with identity, preferences, security
```

### Stop Hooks

Fire when session ends. Common uses:
- Capture session summary
- Save learnings to memory
- Clean up temporary state

**Example: SessionSummary.hook.ts**
```typescript
// Summarizes session activity
// Saves to MEMORY/sessions/
// Extracts learnings
```

### PreToolUse Hooks

Fire before tool execution. Common uses:
- Security validation
- Logging
- Rate limiting

### PostToolUse Hooks

Fire after tool completion. Common uses:
- Event logging
- Metrics capture
- Voice notifications

---

## Hook Implementation Pattern

```typescript
#!/usr/bin/env bun
/**
 * HookName.hook.ts
 * Description of what this hook does
 */

import { readFileSync, writeFileSync } from 'fs';

async function main() {
  // Read stdin for hook context
  const stdin = readFileSync(0, 'utf-8');
  const context = JSON.parse(stdin);

  // Hook logic here
  console.log("Hook output goes to stdout");

  // Optionally write to memory
  // writeFileSync(`${PAI_DIR}/MEMORY/...`, data);
}

main().catch(console.error);
```

---

## Voice Notification Integration

Hooks can trigger voice notifications via the voice server:

```typescript
// Fire and forget voice notification
await fetch(`${VOICE_SERVER_URL}/notify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Task completed",
    voice_id: process.env.ELEVENLABS_VOICE_ID
  })
}).catch(() => {}); // Never fail on notification
```

**Configuration:**
- `VOICE_SERVER_URL` - Voice server endpoint (default: `http://localhost:8888`)
- `ELEVENLABS_VOICE_ID` - Your voice clone ID

---

## Standard Hooks

| Hook | Event | Purpose |
|------|-------|---------|
| LoadContext.hook.ts | SessionStart | Load CORE context |
| SessionSummary.hook.ts | Stop | Capture session |
| EventLogger.hook.ts | PostToolUse | Log tool executions |
| VoiceNotification.hook.ts | PostToolUse | Voice feedback |

---

## Hook Design Principles

1. **Fire and forget** - Hooks should not block execution
2. **Fail gracefully** - Errors should be logged, not thrown
3. **Single responsibility** - One hook, one purpose
4. **Minimal overhead** - Keep hooks fast (<100ms)

---

## Adding Custom Hooks

1. Create hook file in `${PAI_DIR}/hooks/`
2. Add to `settings.json` under appropriate event
3. Test with: `echo '{}' | bun run hooks/YourHook.hook.ts`
4. Restart AI session to apply changes

---

## Debugging Hooks

```bash
# Test hook directly
echo '{"event": "test"}' | bun run ${PAI_DIR}/hooks/HookName.hook.ts

# Check hook output in logs
tail -f ${PAI_DIR}/MEMORY/raw-outputs/*.jsonl

# Verify settings.json configuration
cat ${PAI_DIR}/settings.json | jq '.hooks'
```

---

## Related Documentation

- **Architecture:** `PAISYSTEMARCHITECTURE.md`
- **Notifications:** `THENOTIFICATIONSYSTEM.md`
- **Memory:** `MEMORYSYSTEM.md`
