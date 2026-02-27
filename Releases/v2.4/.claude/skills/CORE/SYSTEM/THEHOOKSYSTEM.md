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
- **History Capture** - Automatic work/learning documentation to `~/.claude/MEMORY/`
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
          "command": "${PAI_DIR}/hooks/LoadContext.hook.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/CheckVersion.hook.ts"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `LoadContext.hook.ts` - Reads `skills/CORE/SKILL.md` and injects PAI context as `<system-reminder>` at session start
- `CheckVersion.hook.ts` - Checks Claude Code version and notifies of updates

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
          "command": "${PAI_DIR}/hooks/SessionSummary.hook.ts"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `SessionSummary.hook.ts` - Marks current WORK directory as COMPLETED and clears session state
- Captures: work completion status, session duration

---

### 3. **UserPromptSubmit**
**When:** User submits a new prompt to Claude
**Use Cases:**
- Update UI indicators
- Pre-process user input
- Capture prompts for analysis
- Detect ratings and sentiment

**Current Hooks:**
```typescript
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/ExplicitRatingCapture.hook.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/ImplicitSentimentCapture.hook.ts"
        },
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/UpdateTabTitle.hook.ts"
        }
      ]
    }
  ]
}
```

**What They Do:**

**ExplicitRatingCapture.hook.ts** - Explicit Rating Detection
- Detects when user types explicit ratings like "7" or "8 - good work"
- Pattern: Single number (1-10) optionally followed by comment
- Writes to `~/.claude/MEMORY/SIGNALS/ratings.jsonl`
- Low ratings (<6) auto-capture as learning opportunities
- Uses shared library: `hooks/lib/learning-utils.ts`

**ImplicitSentimentCapture.hook.ts** - Implicit Sentiment Detection
- Analyzes user messages for emotional sentiment
- Detects frustration ("What the fuck, you broke it!") → rating 1-2
- Detects excitement ("Oh my god, this is amazing!") → rating 9-10
- Neutral messages return null (not logged)
- Writes to same `ratings.jsonl` with `source: "implicit"`
- Low ratings (<6) trigger learning capture with detailed context
- Includes confidence score (0.0-1.0)
- Uses shared libraries: `hooks/lib/learning-utils.ts`, `hooks/lib/time.ts`
- **Inference:** `import { inference } from '../skills/CORE/Tools/Inference'` → `inference({ level: 'standard', expectJson: true })`

**UpdateTabTitle.hook.ts** - Tab Title + Working State
- Updates Kitty terminal tab title with task summary + `…` suffix
- Sets tab to **orange background** (working state)
- Announces via voice server with context-appropriate gerund
- See `TERMINALTABS.md` for full state system documentation
- **Inference:** `import { inference } from '../skills/CORE/Tools/Inference'` → `inference({ level: 'fast' })`

---

### 4. **Stop**
**When:** Main agent ({DAIDENTITY.NAME}) completes a response
**Use Cases:**
- Voice notifications for task completion
- Capture work summaries and learnings
- **Update terminal tab with final state** (color + suffix based on outcome)

**Current Hooks:**
```typescript
{
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/StopOrchestrator.hook.ts"
        }
      ]
    }
  ]
}
```

**What It Does:**

**StopOrchestrator.hook.ts** - Unified Stop Event Handler
- Single orchestrator that delegates to specialized handlers in `${PAI_DIR}/hooks/handlers/`:
  - `voice.ts` - Voice TTS delivery (extracts `🗣️ {DAIDENTITY.NAME}:` line, POSTs to voice server)
  - `capture.ts` - Work/learning capture (updates WORK items, writes learnings, sends observability)
  - `tab-state.ts` - Tab color/title state (sets completed/awaiting/error visual state)

**Architecture Benefits:**
- Single transcript read (parsed once, shared across handlers)
- Isolated failures (one handler failing doesn't break others)
- Clean orchestration (handlers are pure functions)

**Handler Details:**

`handlers/voice.ts` - Voice TTS Delivery
- Extracts `🗣️ {DAIDENTITY.NAME}:` line from response
- POSTs to `http://localhost:8888/notify` with configured voice ID
- Voice server handles sanitization and TTS conversion

`handlers/capture.ts` - Work/Learning Capture
- Extracts structured sections (SUMMARY, ANALYSIS, etc.)
- Updates current WORK items with response summaries
- Writes learnings to `${PAI_DIR}/MEMORY/LEARNING/<category>/YYYY-MM/` when applicable
- Sends event to observability dashboard
- Sends push notification for long tasks (>5 min)

`handlers/tab-state.ts` - Tab Color/Title State
- Sets final tab state (color + suffix):
  - Completed: Green `#022800`, no suffix
  - Awaiting Input: Teal `#0D6969`, `?` suffix (AskUserQuestion detected)
  - Error: Orange `#B35A00`, `!` suffix (error patterns detected)

**Learning Detection:** Automatically identifies learning moments (2+ indicators: problem/issue/bug, fixed/solved, troubleshoot/debug, lesson/takeaway)

**Tab State System:** See `TERMINALTABS.md` for complete documentation

---

### 5. **SubagentStop**
**When:** Subagent (Task tool) completes execution
**Use Cases:**
- Capture agent outputs to UOCS history
- Track multi-agent workflows
- Send events to observability dashboard

**Current Hooks:**
```typescript
{
  "SubagentStop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/AgentOutputCapture.hook.ts"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `AgentOutputCapture.hook.ts` - Agent output capture and observability
  - Waits for Task tool result in parent transcript (up to 6 attempts, 7.5s max)
  - Extracts `[AGENT:type]` tag and completion message
  - Captures agent output to appropriate history category (`research/`, `execution/`, etc.)
  - Sends event to observability dashboard

**Tab Title Updates (Simplified Approach):**
- Tab title updates are now handled by the **parent session** directly
- After receiving Task result, parent calls: `bun ~/.claude/skills/CORE/Tools/UpdateTabTitle.ts "Message"`
- This avoids transcript parsing race conditions
- See `~/.claude/skills/CORE/Tools/UpdateTabTitle.ts` for implementation

**Agent-Specific Routing:**
- `[AGENT:engineer]` → Captured to `execution/features/`
- `[AGENT:researcher]` → Captured to `research/`
- `[AGENT:pentester]` → Captured to `research/`
- `[AGENT:intern]` → Captured to `research/`
- etc.

---

### 6. **PreToolUse**
**When:** Before Claude executes any tool
**Use Cases:**
- Security validation (e.g., block dangerous commands)
- Tool-specific pre-processing

**Current Hooks:**
```typescript
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/SecurityValidator.hook.ts"
        }
      ]
    },
    {
      "matcher": "AskUserQuestion",
      "hooks": [
        {
          "type": "command",
          "command": "${PAI_DIR}/hooks/SetQuestionTab.hook.ts"
        }
      ]
    }
  ]
}
```

**What They Do:**
- `SecurityValidator.hook.ts` - Validates Bash commands against security patterns
- `SetQuestionTab.hook.ts` - Updates tab state when question is asked

---

### 7. **PostToolUse**
**When:** After Claude executes any tool
**Status:** Not currently configured

**Potential Use Cases:**
- Capture tool outputs for analytics
- Error tracking
- Performance metrics

---

### 8. **PreCompact**
**When:** Before Claude compacts context (long conversations)
**Status:** Not currently configured

**Potential Use Cases:**
- Preserve important context before compaction
- Log compaction events

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
    "PAI_DIR": "$HOME/.claude",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "64000"
  }
}
```

**Key Variables:**
- `PAI_DIR` - PAI installation directory (typically `~/.claude`)
- Hook scripts reference `${PAI_DIR}` in command paths

### Identity Configuration (Central to Install Wizard)

**settings.json is the single source of truth for all daidentity/configuration.**

```json
{
  "daidentity": {
    "name": "PAI",
    "fullName": "Personal AI",
    "displayName": "PAI",
    "color": "#3B82F6",
    "voiceId": "s3TPKV1kjDlVtZbl4Ksh"
  },
  "principal": {
    "name": "{YourName}",
    "pronunciation": "{YourName}",
    "timezone": "America/Los_Angeles"
  }
}
```

**Using the Identity Module:**
```typescript
import { getIdentity, getPrincipal, getDAName, getPrincipalName, getVoiceId } from './lib/identity';

// Get full identity objects
const identity = getIdentity();    // { name, fullName, displayName, voiceId, color }
const principal = getPrincipal();  // { name, pronunciation, timezone }

// Convenience functions
const DA_NAME = getDAName();        // "PAI"
const USER_NAME = getPrincipalName(); // "{YourName}"
const VOICE_ID = getVoiceId();        // "s3TPKV1kjDlVtZbl4Ksh"
```

**Why settings.json?**
- Programmatic access via `JSON.parse()` - no regex parsing markdown
- Central to the PAI install wizard
- Single source of truth for all configuration
- Tool-friendly: easy to read/write from any language

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
// handlers/voice.ts pattern
import { getIdentity } from './lib/identity';

const identity = getIdentity();
const completionMessage = extractCompletionMessage(lastMessage);

const payload = {
  title: identity.name,
  message: completionMessage,
  voice_enabled: true,
  voice_id: identity.voiceId  // From settings.json
};

await fetch('http://localhost:8888/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

**Agent-Specific Voices:**
Configure voice IDs in `skills/CORE/SYSTEM/AGENTPERSONALITIES.md` or via environment variables.
Each agent can have a unique ElevenLabs voice configured.

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

**Example from handlers/capture.ts:**
```typescript
import { getLearningCategory, isLearningCapture } from './lib/learning-utils';
import { getPSTTimestamp, getYearMonth } from './lib/time';

const structured = extractStructuredSections(lastMessage);
const isLearning = isLearningCapture(text, structured.summary, structured.analysis);

// Update current work item
const currentWork = readCurrentWork();  // from STATE/current-work.json
if (currentWork) {
  updateWorkItem(currentWork.work_dir, structured);
}

// If learning content detected, also capture to LEARNING/
if (isLearning) {
  const category = getLearningCategory(text);  // 'SYSTEM' or 'ALGORITHM'
  const targetDir = join(baseDir, 'MEMORY', 'LEARNING', category, getYearMonth());
  const filename = generateFilename(description, 'LEARNING');
  writeFileSync(join(targetDir, filename), content);
}
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
// Agent detection pattern
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

**Session Mapping:** `~/.claude/MEMORY/STATE/agent-sessions.json`
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

### 5. Tab Title + Color State Architecture

**Pattern:** Visual state feedback through tab colors and title suffixes

**State Flow:**

| Event | Hook | Tab Title | Inactive Color | State |
|-------|------|-----------|----------------|-------|
| UserPromptSubmit | `UpdateTabTitle.hook.ts` | `⚙️ Summary…` | Orange `#B35A00` | Working |
| Inference | `UpdateTabTitle.hook.ts` | `🧠 Analyzing…` | Orange `#B35A00` | Inference |
| Stop (success) | `handlers/tab-state.ts` | `Summary` | Green `#022800` | Completed |
| Stop (question) | `handlers/tab-state.ts` | `Summary?` | Teal `#0D6969` | Awaiting Input |
| Stop (error) | `handlers/tab-state.ts` | `Summary!` | Orange `#B35A00` | Error |

**Active Tab:** Always Dark Blue `#002B80` (state colors only affect inactive tabs)

**Why This Design:**
- **Instant visual feedback** - See state at a glance without reading
- **Color-coded priority** - Teal tabs need attention, green tabs are done
- **Suffix as state indicator** - Works even in narrow tab bars
- **Haiku only on user input** - One AI call per prompt (not per tool)

**State Detection (in Stop hook):**
1. Check transcript for `AskUserQuestion` tool → `awaitingInput`
2. Check `📊 STATUS:` for error patterns → `error`
3. Default → `completed`

**Text Colors:**
- Active tab: White `#FFFFFF` (always)
- Inactive tab: Gray `#A0A0A0` (always)

**Active Tab Background:** Dark Blue `#002B80` (always - state colors only affect inactive tabs)

**Tab Icons:**
- 🧠 Brain - AI inference in progress (Haiku/Sonnet thinking)
- ⚙️ Gear - Processing/working state

**Full Documentation:** See `~/.claude/skills/CORE/SYSTEM/TERMINALTABS.md`

---

### 6. Async Non-Blocking Execution

**Pattern:** Hook executes quickly → Launch background processes for slow operations

```typescript
// update-tab-titles.ts pattern
// Set immediate tab title (fast)
execSync(`printf '\\033]0;${titleWithEmoji}\\007' >&2`);

// Launch background process for Haiku summary (slow)
Bun.spawn(['bun', `${paiDir}/hooks/UpdateTabTitle.ts`, prompt], {
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
4. Is ElevenLabs API key in `${PAI_DIR}/.env`?

**Debug:**
```bash
# Test voice server directly
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message":"Test message","voice_id":"[YOUR_VOICE_ID]","title":"Test"}'
```

**Common Issues:**
- Wrong voice_id → Silent failure (invalid ID)
- Voice server offline → Hook continues (graceful failure)
- No `🎯 COMPLETED:` line → No voice notification extracted

---

### Work Not Capturing

**Check:**
1. Does `~/.claude/MEMORY/` directory exist?
2. Is AutoWorkCreation hook running? Check `~/.claude/MEMORY/STATE/current-work.json`
3. Is hook actually running? Check `~/.claude/MEMORY/RAW/` for events
4. File permissions? `ls -la ~/.claude/MEMORY/WORK/`

**Debug:**
```bash
# Check current work
cat ~/.claude/MEMORY/STATE/current-work.json

# Check recent work directories
ls -lt ~/.claude/MEMORY/WORK/ | head -10
ls -lt ~/.claude/MEMORY/LEARNING/$(date +%Y-%m)/ | head -10

# Check raw events
tail ~/.claude/MEMORY/RAW/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
```

**Common Issues:**
- Missing current-work.json → AutoWorkCreation hook not running
- Work not updating → capture handler not finding current work
- Learning detection too strict → Adjust `isLearningCapture()` logic

---

### Stop Event Not Firing (CRITICAL KNOWN ISSUE)

**Symptom:** Stop hook configured and working, but Stop events not firing consistently

**Evidence:**
```bash
# Check if Stop events fired today
grep '"event_type":"Stop"' ~/.claude/MEMORY/RAW/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
# Result: 0 matches (no Stop events)

# But other hooks ARE working
grep '"event_type":"PostToolUse"' ~/.claude/MEMORY/RAW/$(date +%Y-%m)/$(date +%Y-%m-%d)_all-events.jsonl
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
   # Check if work is being tracked
   cat ~/.claude/MEMORY/STATE/current-work.json
   ls -lt ~/.claude/MEMORY/WORK/ | head -5
   ls -lt ~/.claude/MEMORY/LEARNING/$(date +%Y-%m)/ | head -5

   # If no current work or work items empty → Check AutoWorkCreation hook
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
1. Is `~/.claude/MEMORY/STATE/agent-sessions.json` writable?
2. Is `[AGENT:type]` tag in `🎯 COMPLETED:` line?
3. Is agent running from correct directory? (`/agents/name/`)

**Debug:**
```bash
# Check session mappings
cat ~/.claude/MEMORY/STATE/agent-sessions.json | jq .

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

### Transcript Type Mismatch (Fixed 2026-01-11)

**Symptom:** Context reading functions return empty results even though transcript has data

**Root Cause:** Claude Code transcripts use `type: "user"` but hooks were checking for `type: "human"`.

**Affected Hooks:**
- `UpdateTabTitle.hook.ts` - Couldn't read user messages for context
- `ImplicitSentimentCapture.hook.ts` - Same issue

**Fix Applied:**
1. Changed `entry.type === 'human'` → `entry.type === 'user'`
2. Improved content extraction to skip `tool_result` blocks and only capture actual text

**Verification:**
```bash
# Check transcript type field
grep '"type":"user"' ~/.claude/projects/-Users-daniel--claude/*.jsonl | head -1 | jq '.type'
# Should output: "user" (not "human")
```

**Prevention:** When parsing transcripts, always verify the actual JSON structure first.

---

### Context Loading Issues (SessionStart)

**Check:**
1. Does `~/.claude/skills/CORE/SKILL.md` exist?
2. Is `LoadContext.hook.ts` executable?
3. Is `PAI_DIR` env variable set correctly?

**Debug:**
```bash
# Test context loading directly
bun ~/.claude/hooks/LoadContext.hook.ts

# Should output <system-reminder> with SKILL.md content
```

**Common Issues:**
- Subagent sessions loading main context → Fixed (subagent detection in hook)
- File not found → Check `PAI_DIR` environment variable
- Permission denied → `chmod +x ~/.claude/hooks/LoadContext.hook.ts`

---

## Advanced Topics

### Multi-Hook Execution Order

Hooks in same event execute **sequentially** in order defined in settings.json:

```json
{
  "Stop": [
    {
      "hooks": [
        { "command": "${PAI_DIR}/hooks/StopOrchestrator.hook.ts" }  // Single orchestrator
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

- **Voice System:** `~/.claude/VoiceServer/SKILL.md`
- **Agent System:** `~/.claude/skills/CORE/SYSTEM/AGENTPERSONALITIES.md`
- **History/Memory:** `~/.claude/skills/CORE/SYSTEM/MEMORYSYSTEM.md`
- **Observability Dashboard:** `~/.claude/Observability/`

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
~/.claude/settings.json              Hook configuration (daidentity, principal, env vars)
~/.claude/hooks/                     Hook scripts
~/.claude/hooks/lib/identity.ts      Identity loader (reads from settings.json)
~/.claude/hooks/lib/observability.ts Observability helper library
~/.claude/hooks/lib/learning-utils.ts Learning categorization (SYSTEM/ALGORITHM)
~/.claude/hooks/lib/time.ts      PST timestamp utilities
~/.claude/MEMORY/RAW/                Event logs (JSONL) - source of truth
~/.claude/MEMORY/WORK/               Primary work tracking (work directories)
~/.claude/MEMORY/LEARNING/           Learning captures (SYSTEM/, ALGORITHM/, SIGNALS/)
~/.claude/MEMORY/STATE/              Runtime state (current-work.json, progress/, etc.)
~/.claude/MEMORY/STATE/agent-sessions.json  Session→Agent mapping

STOP HOOKS (main agent completion):
StopOrchestrator.hook.ts        Unified Stop handler with internal handlers:
  → handlers/voice.ts           Voice TTS delivery
  → handlers/capture.ts         Session/learning capture + observability
  → handlers/tab-state.ts       Tab color/title state

USER PROMPT HOOKS:
ExplicitRatingCapture.hook.ts   Explicit ratings ("7", "8 - good")
ImplicitSentimentCapture.hook.ts Sentiment analysis (level: standard)
UpdateTabTitle.hook.ts          Tab title + working state (level: fast)

INFERENCE TOOL (for hooks needing AI):
Path: ~/.claude/skills/CORE/Tools/Inference.ts
Import: import { inference } from '../skills/CORE/Tools/Inference'
Levels: fast (haiku/15s) | standard (sonnet/30s) | smart (opus/90s)
Usage: inference({ systemPrompt, userPrompt, level: 'fast', expectJson: true })

OTHER CRITICAL HOOKS:
AgentOutputCapture.hook.ts      Agent output capture (subagents)
LoadContext.hook.ts             PAI context loading
SecurityValidator.hook.ts       Security validation for Bash commands

TAB STATE SYSTEM:
Inference: 🧠…  Orange #B35A00  (AI thinking)
Working:   ⚙️…  Orange #B35A00  (processing)
Completed:      Green  #022800  (task done)
Awaiting:  ?    Teal   #0D6969  (needs input)
Error:     !    Orange #B35A00  (problem detected)
Active Tab: Always Dark Blue #002B80 (state colors = inactive only)

VOICE SERVER:
URL: http://localhost:8888/notify
Payload: {"message":"...", "voice_id":"...", "title":"..."}
Configure voice IDs in AgentPersonalities.md

OBSERVABILITY:
Server: http://localhost:4000
Client: http://localhost:5173
Events: All hooks send to /events endpoint
```

---

## Shared Libraries

The hook system uses shared TypeScript libraries to eliminate code duplication:

### `hooks/lib/learning-utils.ts`
Shared learning categorization logic.

```typescript
import { getLearningCategory, isLearningCapture } from './lib/learning-utils';

// Categorize learning as SYSTEM (tooling/infra) or ALGORITHM (task execution)
const category = getLearningCategory(content, comment);
// Returns: 'SYSTEM' | 'ALGORITHM'

// Check if response contains learning indicators
const isLearning = isLearningCapture(text, summary, analysis);
// Returns: boolean (true if 2+ learning indicators found)
```

**Used by:** ExplicitRatingCapture, ImplicitSentimentCapture, handlers/capture.ts

### `hooks/lib/time.ts`
Shared PST timestamp utilities.

```typescript
import {
  getPSTTimestamp,    // "2026-01-10 20:30:00 PST"
  getPSTDate,         // "2026-01-10"
  getYearMonth,       // "2026-01"
  getISOTimestamp,    // ISO8601 with offset
  getFilenameTimestamp, // "2026-01-10-203000"
  getPSTComponents    // { year, month, day, hours, minutes, seconds }
} from './lib/time';
```

**Used by:** ExplicitRatingCapture, ImplicitSentimentCapture, handlers/capture.ts, SessionSummary

### `hooks/lib/identity.ts`
Identity and principal configuration from settings.json.

```typescript
import { getIdentity, getPrincipal, getDAName, getPrincipalName, getVoiceId } from './lib/identity';

const identity = getIdentity();    // { name, fullName, displayName, voiceId, color }
const principal = getPrincipal();  // { name, pronunciation, timezone }
```

**Used by:** handlers/voice.ts, ImplicitSentimentCapture, handlers/capture.ts, handlers/tab-state.ts

### `skills/CORE/Tools/Inference.ts`
Unified AI inference with three run levels.

```typescript
import { inference } from '../skills/CORE/Tools/Inference';

// Fast (Haiku) - quick tasks, 15s timeout
const result = await inference({
  systemPrompt: 'Summarize in 3 words',
  userPrompt: text,
  level: 'fast',
});

// Standard (Sonnet) - balanced reasoning, 30s timeout
const result = await inference({
  systemPrompt: 'Analyze sentiment',
  userPrompt: text,
  level: 'standard',
  expectJson: true,
});

// Smart (Opus) - deep reasoning, 90s timeout
const result = await inference({
  systemPrompt: 'Strategic analysis',
  userPrompt: text,
  level: 'smart',
});

// Result shape
interface InferenceResult {
  success: boolean;
  output: string;
  parsed?: unknown;  // if expectJson: true
  error?: string;
  latencyMs: number;
  level: 'fast' | 'standard' | 'smart';
}
```

**Used by:** ImplicitSentimentCapture, UpdateTabTitle, AutoWorkCreation

---

**Last Updated:** 2026-01-13
**Status:** Production - All hooks active and tested (refactored for SRP)
**Maintainer:** PAI System
