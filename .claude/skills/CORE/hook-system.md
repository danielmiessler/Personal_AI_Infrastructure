# Hook System

**Event-Driven Automation Infrastructure**

**Location:** `~/.claude/hooks/`
**Configuration:** `~/.claude/settings.json`
**Status:** Active - All hooks running in production

---

## Overview

The PAI hook system is an event-driven automation infrastructure built on Claude Code's native hook support. Hooks are executable scripts (TypeScript/Python) that run automatically in response to specific events during Claude Code sessions.

**Core Capabilities:**
- **Session Management** - Auto-load context, capture summaries, manage state
- **Voice Notifications** - Text-to-speech announcements for task completions
- **History Capture** - Automatic work/learning documentation to `~/.claude/history/`
- **Multi-Agent Support** - Agent-specific hooks with voice routing
- **Observability** - Real-time event streaming to dashboard
- **Tab Titles** - Dynamic terminal tab updates with task context

**Key Principle:** Hooks run asynchronously and fail gracefully. They enhance the user experience but never block Claude Code's core functionality.

---

## Available Hook Types

Claude Code supports the following hook events (from `~/.claude/hooks/lib/observability.ts`):

### 1. **SessionStart**
**When:** Claude Code session begins (new conversation)
**Use Cases:**
- Load PAI context from `skills/CORE/SKILL.md`
- Initialize session state
- Capture session metadata

**Current Hooks:**
```typescript
{
  "SessionStart": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/load-core-context.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/initialize-pai-session.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type SessionStart"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `load-core-context.ts` - Reads `skills/CORE/SKILL.md` and injects PAI context as `<system-reminder>` at session start
- `initialize-pai-session.ts` - Sets up session state and environment
- `capture-all-events.ts` - Logs event to `~/.claude/history/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`

---

### 2. **SessionEnd**
**When:** Claude Code session terminates (conversation ends)
**Use Cases:**
- Generate session summaries
- Save session metadata
- Cleanup temporary state

**Current Hooks:**
```typescript
{
  "SessionEnd": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-session-summary.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type SessionEnd"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `capture-session-summary.ts` - Analyzes session activity and creates summary document in `~/.claude/history/sessions/YYYY-MM/`
- Captures: files changed, commands executed, tools used, session focus, duration

---

### 3. **UserPromptSubmit**
**When:** User submits a new prompt to Claude
**Use Cases:**
- Update UI indicators
- Pre-process user input
- Capture prompts for analysis

**Current Hooks:**
```typescript
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/update-tab-titles.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type UserPromptSubmit"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `update-tab-titles.ts` - Updates Kitty terminal tab title with task summary
- Launches background Haiku summarization for better tab titles
- Sets `♻️` emoji prefix to indicate processing

---

### 4. **Stop**
**When:** Main agent (Kai) completes a response
**Use Cases:**
- Voice notifications for task completion
- Capture work summaries and learnings
- Update terminal tab with completion status

**Current Hooks:**
```typescript
{
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/stop-hook.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type Stop"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `stop-hook.ts` - THE CRITICAL HOOK for main agent completions
  - Extracts `🎯 COMPLETED:` line from response
  - Sends to voice server with PAI's voice ID (`s3TPKV1kjDlVtZbl4Ksh`)
  - Captures work summaries to `~/.claude/history/sessions/YYYY-MM/` or learnings to `~/.claude/history/learnings/YYYY-MM/`
  - Updates Kitty tab with `✅` prefix
  - Sends event to observability dashboard

**Learning Detection:** Automatically identifies learning moments (2+ indicators: problem/issue/bug, fixed/solved, troubleshoot/debug, lesson/takeaway)

---

### 5. **SubagentStop**
**When:** Subagent (Task tool) completes execution
**Use Cases:**
- Agent-specific voice notifications
- Capture agent outputs
- Track multi-agent workflows

**Current Hooks:**
```typescript
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/subagent-stop-hook.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type SubagentStop"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `subagent-stop-hook.ts` - Agent-specific completion handling
  - Waits for Task tool result in transcript
  - Extracts `[AGENT:type]` tag and completion message
  - Routes to agent-specific voice (via agent's own voice notification in response)
  - Captures agent output to appropriate history category
  - Sends to observability dashboard

**Agent-Specific Routing:**
- `[AGENT:engineer]` → Engineer voice ID
- `[AGENT:researcher]` → Researcher voice ID
- `[AGENT:pentester]` → Pentester voice ID
- etc.

---

### 6. **PreToolUse**
**When:** Before Claude executes any tool
**Use Cases:**
- Tool usage analytics
- Pre-execution validation
- Performance monitoring

**Current Hooks:**
```typescript
{
  "PreToolUse": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type PreToolUse"
        }
      ]
    }
  ]
}
```

**What They Do:**
- Captures tool name, input parameters, timestamp
- Logs to daily events file for analysis

---

### 7. **PostToolUse**
**When:** After Claude executes any tool
**Use Cases:**
- Capture tool outputs
- Error tracking
- Performance metrics

**Current Hooks:**
```typescript
{
  "PostToolUse": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type PostToolUse"
        }
      ]
    }
  ]
}
```

**What They Do:**
- Captures tool output, execution time, success/failure
- Logs to `~/.claude/history/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`
- Powers observability dashboard

---

### 8. **PreCompact**
**When:** Before Claude compacts context (long conversations)
**Use Cases:**
- Preserve important context
- Log compaction events
- Pre-compaction cleanup

**Current Hooks:**
```typescript
{
  "PreCompact": [
    {
      "matcher": "",
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/context-compression-hook.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/capture-all-events.ts --event-type PreCompact"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `context-compression-hook.ts` - Handles context preservation before compaction
- Captures metadata about compaction events

---

## Configuration

### Location
**File:** `~/.claude/settings.json`
**Section:** `"hooks": { ... }`

### Environment Variables
Hooks have access to all environment variables from `~/.claude/settings.json` `"env"` section:

```json
{
  "env": {
    "PAI_DIR": "/Users/daniel/.claude",
    "DA": "Kai",
    "MCP_API_KEY": "...",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "64000"
  }
}
```

**Key Variables:**
- `PAI_DIR` - PAI installation directory (always `/Users/daniel/.claude`)
- `DA` - Digital Assistant name ("Kai")
- Hook scripts reference `${PAI_DIR}` in command paths

### Hook Configuration Structure

```json
{
  "hooks": {
    "HookEventName": [
      {
        "matcher": "pattern",  // Optional: filter which tools/events trigger hook
        "hooks": [
          {
            "type": "command",
            "command": "${PAI_DIR}/hooks/my-hook.ts --arg value"
          }
        ]
      }
    ]
  }
}
```

**Fields:**
- `HookEventName` - One of: SessionStart, SessionEnd, UserPromptSubmit, Stop, SubagentStop, PreToolUse, PostToolUse, PreCompact
- `matcher` - Pattern to match (use `"*"` for all tools, or specific tool names)
- `type` - Always `"command"` (executes external script)
- `command` - Path to executable hook script (TypeScript/Python/Bash)

### Hook Input (stdin)
All hooks receive JSON data on stdin:

```typescript
{
  session_id: string;         // Unique session identifier
  transcript_path: string;    // Path to JSONL transcript
  hook_event_name: string;    // Event that triggered hook
  prompt?: string;            // User prompt (UserPromptSubmit only)
  tool_name?: string;         // Tool name (PreToolUse/PostToolUse)
  tool_input?: any;           // Tool parameters (PreToolUse)
  tool_output?: any;          // Tool result (PostToolUse)
  // ... event-specific fields
}
```

---

## Common Patterns

### 1. Voice Notifications

**Pattern:** Extract completion message → Send to voice server

```typescript
// stop-hook.ts pattern
const completionMessage = extractKaiCompletion(lastMessage);

const payload = {
  title: 'PAI',
  message: completionMessage,
  voice_enabled: true,
  voice_id: 's3TPKV1kjDlVtZbl4Ksh'  // PAI's ElevenLabs voice
};

await fetch('http://localhost:8888/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

**Agent-Specific Voices:**
- Main agent (PAI): `s3TPKV1kjDlVtZbl4Ksh`
- Engineer: `fATgBRI8wg5KkDFg8vBd`
- Researcher: `AXdMgz6evoL7OPd7eU12`
- Pentester: `xvHLFjaUEpx4BOf7EiDd`
- Intern: `d3MFdIuCfbAIwiu7jC4a`

See `skills/CORE/SKILL.md` for complete voice ID mapping.

---

### 2. History Capture (UOCS Pattern)

**Pattern:** Parse structured response → Save to appropriate history directory

**File Naming Convention:**
```
YYYY-MM-DD-HHMMSS_TYPE_description.md
```

**Types:**
- `WORK` - General task completions
- `LEARNING` - Problem-solving learnings
- `SESSION` - Session summaries
- `RESEARCH` - Research findings (from agents)
- `FEATURE` - Feature implementations (from agents)
- `DECISION` - Architectural decisions (from agents)

**Example from stop-hook.ts:**
```typescript
const structured = extractStructuredSections(lastMessage);
const isLearning = isLearningCapture(text, structured);
const captureType = isLearning ? 'LEARNING' : 'WORK';

const targetDir = isLearning
  ? join(baseDir, 'history', 'learnings', yearMonth)
  : join(baseDir, 'history', 'sessions', yearMonth);

const filename = generateFilename(description, captureType);
writeFileSync(join(targetDir, filename), content);
```

**Structured Sections Parsed:**
- `📋 SUMMARY:` - Brief overview
- `🔍 ANALYSIS:` - Key findings
- `⚡ ACTIONS:` - Steps taken
- `✅ RESULTS:` - Outcomes
- `📊 STATUS:` - Current state
- `➡️ NEXT:` - Follow-up actions
- `🎯 COMPLETED:` - **Voice notification line**

---

### 3. Agent Type Detection

**Pattern:** Identify which agent is executing → Route appropriately

```typescript
// From capture-all-events.ts
let agentName = getAgentForSession(sessionId);

// Detect from Task tool
if (hookData.tool_name === 'Task' && hookData.tool_input?.subagent_type) {
  agentName = hookData.tool_input.subagent_type;
  setAgentForSession(sessionId, agentName);
}

// Detect from CLAUDE_CODE_AGENT env variable
else if (process.env.CLAUDE_CODE_AGENT) {
  agentName = process.env.CLAUDE_CODE_AGENT;
}

// Detect from path (subagents run in /agents/name/)
else if (hookData.cwd && hookData.cwd.includes('/agents/')) {
  const agentMatch = hookData.cwd.match(/\/agents\/([^\/]+)/);
  if (agentMatch) agentName = agentMatch[1];
}
```

**Session Mapping:** `~/.claude/agent-sessions.json`
```json
{
  "session-id-abc123": "engineer",
  "session-id-def456": "researcher"
}
```

---

### 4. Observability Integration

**Pattern:** Send event to dashboard → Fail silently if offline

```typescript
import { sendEventToObservability, getCurrentTimestamp, getSourceApp } from './lib/observability';

await sendEventToObservability({
  source_app: getSourceApp(),           // 'PAI' or agent name
  session_id: hookInput.session_id,
  hook_event_type: 'Stop',
  timestamp: getCurrentTimestamp(),
  transcript_path: hookInput.transcript_path,
  summary: completionMessage,
  // ... additional fields
}).catch(() => {
  // Silently fail - dashboard may not be running
});
```

**Dashboard URLs:**
- Server: `http://localhost:4000`
- Client: `http://localhost:5173`

---

### 5. Async Non-Blocking Execution

**Pattern:** Hook executes quickly → Launch background processes for slow operations

```typescript
// update-tab-titles.ts pattern
// Set immediate tab title (fast)
execSync(`printf '\\033]0;${titleWithEmoji}\\007' >&2`);

// Launch background process for Haiku summary (slow)
Bun.spawn(['bun', `${paiDir}/hooks/update-tab-title.ts`, prompt], {
  stdout: 'ignore',
  stderr: 'ignore',
  stdin: 'ignore'
});

process.exit(0);  // Exit immediately
```

**Key Principle:** Hooks must never block Claude Code. Always exit quickly, use background processes for slow work.

---

### 6. Graceful Failure

**Pattern:** Wrap everything in try/catch → Log errors → Exit successfully

```typescript
async function main() {
  try {
    // Hook logic here
  } catch (error) {
    // Log but don't fail
    console.error('Hook error:', error);
  }

  process.exit(0);  // Always exit 0
}
```

**Why:** If hooks crash, Claude Code may freeze. Always exit cleanly.

---

## Creating Custom Hooks

### Step 1: Choose Hook Event
Decide which event should trigger your hook (SessionStart, Stop, PostToolUse, etc.)

### Step 2: Create Hook Script
**Location:** `~/.claude/hooks/my-custom-hook.ts`

**Template:**
```typescript
#!/usr/bin/env bun

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  // ... event-specific fields
}

async function main() {
  try {
    // Read stdin
    const input = await Bun.stdin.text();
    const data: HookInput = JSON.parse(input);

    // Your hook logic here
    console.log(`Hook triggered: ${data.hook_event_name}`);

    // Example: Read transcript
    const fs = require('fs');
    const transcript = fs.readFileSync(data.transcript_path, 'utf-8');

    // Do something with the data

  } catch (error) {
    // Log but don't fail
    console.error('Hook error:', error);
  }

  process.exit(0);  // Always exit 0
}

main();
```

### Step 3: Make Executable
```bash
chmod +x ~/.claude/hooks/my-custom-hook.ts
```

### Step 4: Add to settings.json
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${PAI_DIR}/hooks/my-custom-hook.ts"
          }
        ]
      }
    ]
  }
}
```

### Step 5: Test
```bash
# Test hook directly
echo '{"session_id":"test","transcript_path":"/tmp/test.jsonl","hook_event_name":"Stop"}' | bun ~/.claude/hooks/my-custom-hook.ts
```

### Step 6: Restart Claude Code
Hooks are loaded at startup. Restart to apply changes.

---

## Hook Development Best Practices

### 1. **Fast Execution**
- Hooks should complete in < 500ms
- Use background processes for slow work (Haiku API calls, file processing)
- Exit immediately after launching background work

### 2. **Graceful Failure**
- Always wrap in try/catch
- Log errors to stderr (available in hook debug logs)
- Always `process.exit(0)` - never throw or exit(1)

### 3. **Non-Blocking**
- Never wait for external services (unless they respond quickly)
- Use `.catch(() => {})` for async operations
- Fail silently if optional services are offline

### 4. **Stdin Reading**
- Use timeout when reading stdin (Claude Code may not send data immediately)
- Handle empty/invalid input gracefully

```typescript
const decoder = new TextDecoder();
const reader = Bun.stdin.stream().getReader();

const timeoutPromise = new Promise<void>((resolve) => {
  setTimeout(() => resolve(), 500);  // 500ms timeout
});

await Promise.race([readPromise, timeoutPromise]);
```

### 5. **File I/O**
- Check `existsSync()` before reading files
- Create directories with `{ recursive: true }`
- Use PST timestamps for consistency

### 6. **Environment Access**
- All `settings.json` env vars available via `process.env`
- Use `${PAI_DIR}` in settings.json for portability
- Access in code via `process.env.PAI_DIR`

### 7. **Observability**
- Send events to dashboard for visibility
- Include all relevant metadata (session_id, tool_name, etc.)
- Use `.catch(() => {})` - dashboard may be offline

---

## Troubleshooting

### Hook Not Running

**Check:**
1. Is hook script executable? `chmod +x ~/.claude/hooks/my-hook.ts`
2. Is path correct in settings.json? Use `${PAI_DIR}/hooks/...`
3. Is settings.json valid JSON? `jq . ~/.claude/settings.json`
4. Did you restart Claude Code after editing settings.json?

**Debug:**
```bash
# Test hook directly
echo '{"session_id":"test","transcript_path":"/tmp/test.jsonl","hook_event_name":"Stop"}' | bun ~/.claude/hooks/my-hook.ts

# Check hook logs (stderr output)
tail -f ~/.claude/hooks/debug.log  # If you add logging
```

---

### Hook Hangs/Freezes Claude Code

**Cause:** Hook not exiting (infinite loop, waiting for input, blocking operation)

**Fix:**
1. Add timeouts to all blocking operations
2. Ensure `process.exit(0)` is always reached
3. Use background processes for long operations
4. Check stdin reading has timeout

**Prevention:**
```typescript
// Always use timeout
setTimeout(() => {
  console.error('Hook timeout - exiting');
  process.exit(0);
}, 5000);  // 5 second max
```

---

### Voice Notifications Not Working

**Check:**
1. Is voice server running? `curl http://localhost:8888/health`
2. Is voice_id correct? See `skills/CORE/SKILL.md` for mappings
3. Is message format correct? `{"message":"...", "voice_id":"...", "title":"..."}`
4. Is ElevenLabs API key in `~/.claude/.env`?

**Debug:**
```bash
# Test voice server directly
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message","voice_id":"s3TPKV1kjDlVtZbl4Ksh","title":"Test"}'
```

**Common Issues:**
- Wrong voice_id → Silent failure (invalid ID)
- Voice server offline → Hook continues (graceful failure)
- No `🎯 COMPLETED:` line → No voice notification extracted

---

### History Not Capturing

**Check:**
1. Does `~/.claude/history/` directory exist?
2. Are structured sections present in response? (`📋 SUMMARY:`, `🎯 COMPLETED:`, etc.)
3. Is hook actually running? Check `~/.claude/history/raw-outputs/` for events
4. File permissions? `ls -la ~/.claude/history/sessions/`

**Debug:**
```bash
# Check recent captures
ls -lt ~/.claude/history/sessions/$(date +%Y-%m)/ | head -10
ls -lt ~/.claude/history/learnings/$(date +%Y-%m)/ | head -10

# Check raw events
tail ~/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
```

**Common Issues:**
- Missing structured format → No parsing
- No `🎯 COMPLETED:` line → Capture may fail
- Learning detection too strict → Adjust `isLearningCapture()` logic

---

### Stop Event Not Firing (CRITICAL KNOWN ISSUE)

**Symptom:** Stop hook configured and working, but Stop events not firing consistently

**Evidence:**
```bash
# Check if Stop events fired today
grep '"event_type":"Stop"' ~/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
# Result: 0 matches (no Stop events)

# But other hooks ARE working
grep '"event_type":"PostToolUse"' ~/.claude/history/raw-outputs/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
# Result: 80+ matches (PostToolUse working fine)
```

**Impact:**
- Automatic work summaries NOT captured to history (despite Stop hook logic being correct)
- Learning moments NOT auto-detected
- Voice notifications from main agent responses NOT sent
- Manual verification and capture REQUIRED

**Root Cause:**
- Claude Code event trigger issue (external to hook system)
- Stop event not being emitted when main agent completes responses
- Hook configuration is correct, hook script works, event just never fires
- Other event types (PostToolUse, SessionEnd, UserPromptSubmit) work fine

**Workaround (MANDATORY):**

1. **Added CAPTURE field to response format** (see `~/.claude/skills/CORE/SKILL.md`)
   - MANDATORY field in every response
   - Forces verification before completing responses
   - Must document: "Auto-captured" / "Manually saved" / "N/A"

2. **Added MANDATORY VERIFICATION GATE** to file organization section
   - Before completing valuable work, MUST run verification commands
   - Check if auto-capture happened (ls -lt history directories)
   - If not, manually save to appropriate history location

3. **Verification Commands:**
   ```bash
   # Check if auto-captured (should happen, but often doesn't due to Stop event bug)
   ls -lt ~/.claude/history/sessions/$(date +%Y-%m)/ | head -5
   ls -lt ~/.claude/history/learnings/$(date +%Y-%m)/ | head -5

   # If 0 results or doesn't match current work → Manual capture required
   ```

**Status:** UNRESOLVED (Claude Code issue, not hook configuration)
**Mitigation:** Structural enforcement via response format (cannot complete valuable work without verification)
**Tracking:** Documented in `~/.claude/skills/CORE/SKILL.md` (History Capture System section)

**Long-term Fix:**
- Report to Anthropic (Claude Code team) as Stop event reliability issue
- Monitor future Claude Code updates for fix
- Keep workaround in place until Stop events fire reliably

---

### Agent Detection Failing

**Check:**
1. Is `~/.claude/agent-sessions.json` writable?
2. Is `[AGENT:type]` tag in `🎯 COMPLETED:` line?
3. Is agent running from correct directory? (`/agents/name/`)

**Debug:**
```bash
# Check session mappings
cat ~/.claude/agent-sessions.json | jq .

# Check subagent-stop debug log
tail -f ~/.claude/hooks/subagent-stop-debug.log
```

**Fix:**
- Ensure agents include `[AGENT:type]` in completion line
- Verify Task tool passes `subagent_type` parameter
- Check cwd includes `/agents/` in path

---

### Observability Dashboard Not Receiving Events

**Check:**
1. Is dashboard server running? `curl http://localhost:4000/health`
2. Are hooks sending events? Check `sendEventToObservability()` calls
3. Network issues? `netstat -an | grep 4000`

**Debug:**
```bash
# Start dashboard server
cd ~/.claude/skills/system/observability/dashboard/apps/server
bun run dev

# Check server logs
# Events should appear in real-time
```

**Note:** Hooks fail silently if dashboard offline (by design). Not critical for operation.

---

### Context Loading Issues (SessionStart)

**Check:**
1. Does `~/.claude/skills/CORE/SKILL.md` exist?
2. Is `load-core-context.ts` executable?
3. Is `PAI_DIR` env variable set correctly?

**Debug:**
```bash
# Test context loading directly
bun ~/.claude/hooks/load-core-context.ts

# Should output <system-reminder> with SKILL.md content
```

**Common Issues:**
- Subagent sessions loading main context → Fixed (subagent detection in hook)
- File not found → Check `PAI_DIR` environment variable
- Permission denied → `chmod +x ~/.claude/hooks/load-core-context.ts`

---

## Advanced Topics

### Multi-Hook Execution Order

Hooks in same event execute **sequentially** in order defined in settings.json:

```json
{
  "Stop": [
    {
      "hooks": [
        { "command": "${PAI_DIR}/hooks/stop-hook.ts" },      // Runs first
        { "command": "${PAI_DIR}/hooks/capture-all-events.ts" }  // Runs second
      ]
    }
  ]
}
```

**Note:** If first hook hangs, second won't run. Keep hooks fast!

---

### Matcher Patterns

`"matcher"` field filters which events trigger hook:

```json
{
  "PostToolUse": [
    {
      "matcher": "Bash",  // Only Bash tool executions
      "hooks": [...]
    },
    {
      "matcher": "*",     // All tool executions
      "hooks": [...]
    }
  ]
}
```

**Patterns:**
- `"*"` - All events
- `"Bash"` - Specific tool name
- `""` - Empty (all events, same as `*`)

---

### Hook Data Payloads by Event Type

**SessionStart:**
```typescript
{
  session_id: string;
  transcript_path: string;
  hook_event_name: "SessionStart";
  cwd: string;
}
```

**UserPromptSubmit:**
```typescript
{
  session_id: string;
  transcript_path: string;
  hook_event_name: "UserPromptSubmit";
  prompt: string;  // The user's prompt text
}
```

**PreToolUse:**
```typescript
{
  session_id: string;
  transcript_path: string;
  hook_event_name: "PreToolUse";
  tool_name: string;
  tool_input: any;  // Tool parameters
}
```

**PostToolUse:**
```typescript
{
  session_id: string;
  transcript_path: string;
  hook_event_name: "PostToolUse";
  tool_name: string;
  tool_input: any;
  tool_output: any;  // Tool result
  error?: string;    // If tool failed
}
```

**Stop:**
```typescript
{
  session_id: string;
  transcript_path: string;
  hook_event_name: "Stop";
}
```

**SubagentStop:**
```typescript
{
  session_id: string;
  transcript_path: string;
  hook_event_name: "SubagentStop";
}
```

**SessionEnd:**
```typescript
{
  conversation_id: string;  // Note: different field name
  timestamp: string;
}
```

---

## Related Documentation

- **Voice System:** `~/.claude/voice-server/USAGE.md`
- **Agent Architecture:** `~/.claude/skills/CORE/agent-protocols.md`
- **History/UOCS:** `~/.claude/skills/CORE/history-system.md`
- **Observability Dashboard:** `~/.claude/skills/system-observability/`

---

## Quick Reference Card

```
HOOK LIFECYCLE:
1. Event occurs (SessionStart, Stop, etc.)
2. Claude Code writes hook data to stdin
3. Hook script executes
4. Hook reads stdin (with timeout)
5. Hook performs actions (voice, capture, etc.)
6. Hook exits 0 (always succeeds)
7. Claude Code continues

KEY FILES:
~/.claude/settings.json           Hook configuration
~/.claude/hooks/                  Hook scripts
~/.claude/hooks/lib/observability.ts   Helper library
~/.claude/history/raw-outputs/    Event logs (JSONL)
~/.claude/history/sessions/       Work summaries
~/.claude/history/learnings/      Learning captures
~/.claude/agent-sessions.json     Session→Agent mapping

CRITICAL HOOKS:
stop-hook.ts          Voice + history capture (main agent)
subagent-stop-hook.ts Voice + history capture (subagents)
load-core-context.ts  PAI context loading
capture-all-events.ts Universal event logger

VOICE SERVER:
URL: http://localhost:8888/notify
Payload: {"message":"...", "voice_id":"...", "title":"..."}
Main Voice: s3TPKV1kjDlVtZbl4Ksh (PAI)

OBSERVABILITY:
Server: http://localhost:4000
Client: http://localhost:5173
Events: All hooks send to /events endpoint
```

---

**Last Updated:** 2025-11-01
**Status:** Production - All hooks active and tested
**Maintainer:** Daniel Miessler (maintainer@example.com)
