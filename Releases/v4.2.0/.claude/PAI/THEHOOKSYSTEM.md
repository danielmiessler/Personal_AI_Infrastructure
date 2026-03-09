# Hook System

**Event-Driven Automation Infrastructure**

**Location:** `~/.claude/hooks/` | **Config:** `~/.claude/settings.json`

*Full spec: [PAI/dev/THEHOOKSYSTEM-Reference.md](dev/THEHOOKSYSTEM-Reference.md)*

---

## 8 Hook Events

| Event | Trigger | Key Uses |
|-------|---------|----------|
| **SessionStart** | New conversation begins | Load context, persist Kitty env, reset tab state, compact recovery |
| **UserPromptSubmit** | User sends a message | Mode classification, rating capture, tab title, session naming |
| **PreToolUse** | Before any tool executes | Security validation, AskUserQuestion tab, agent/skill guards |
| **PostToolUse** | After any tool executes | PRD sync, count updates |
| **Stop** | Claude finishes responding | Tab reset, voice completion, response cache, doc integrity |
| **SessionEnd** | Session terminates | Work learning, session cleanup, relationship memory, integrity check |
| **SubagentStop** | Subagent completes | (reserved) |
| **PreCompact** | Before context compaction | (reserved) |

---

## Hook Output Protocol

Hooks communicate via stdout JSON and exit codes:

```typescript
// Inject context into next Claude turn
console.log(JSON.stringify({ additionalContext: "..." }));

// Block the action (PreToolUse only)
console.log(JSON.stringify({ decision: "block", reason: "..." }));

// Exit codes
process.exit(0);  // success / allow
process.exit(1);  // block (PreToolUse) or error
process.exit(2);  // hard block with message
```

Stderr is for diagnostic logging only — never shown to user.

---

## Hook File Convention

```typescript
#!/usr/bin/env bun
import { readHookInput } from './lib/hook-io';

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  // Route by event
  const event = input.hook_event_name;
  // ... handle event ...

  process.exit(0);
}

main().catch(() => process.exit(0));
```

- Always `#!/usr/bin/env bun` shebang
- Read stdin via `readHookInput()` from `hooks/lib/hook-io.ts`
- Always exit — never hang
- Fail gracefully: `catch(() => process.exit(0))`

---

## Settings.json Registration

```json
"hooks": {
  "EventName": [
    {
      "matcher": "ToolName",  // optional — filter by tool
      "hooks": [
        { "type": "command", "command": "${PAI_DIR}/hooks/MyHook.hook.ts" }
      ]
    }
  ]
}
```

`${PAI_DIR}` expands to `PAI_DIR` env var (portable — no hardcoded paths).

---

*Full spec with all 20 hooks documented, handler patterns, and architecture diagrams: [PAI/dev/THEHOOKSYSTEM-Reference.md](dev/THEHOOKSYSTEM-Reference.md)*
