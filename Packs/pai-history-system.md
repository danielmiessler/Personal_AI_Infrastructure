---
name: Kai History System
pack-id: danielmiessler-kai-history-system-core-v1.0.1
version: 1.0.1
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
  <img src="icons/kai-history-system.png" alt="Kai History System" width="256">
</p>

# Kai History System (kai-history-system)

> Granular context-tracking system for the entire AI infrastructure - captures all work, decisions, and learnings automatically with zero manual effort

## Installation Prompt
You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#pack-system)

This pack adds automatic memory to your entire AI infrastructure. The Kai History System is not just about agent outputs - it's a granular context-tracking system for EVERYTHING that happens in your system:

- **Continuous Learning**: Capture insights as they happen
- **Bug Fixing**: Trace exactly what was done when debugging
- **Avoiding Mistakes**: Learn from past errors automatically
- **After-Action Reviews**: Analyze what worked and what didn't
- **Restoration Points**: Recover from data loss with historical snapshots

**Core principle:** Work normally, documentation handles itself.

No more forgotten context between sessions. No more lost learnings. Your AI remembers everything so you don't have to.

Please follow the installation instructions below to integrate this pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| Universal event capture | `hooks/capture-all-events.ts` | Log all events to JSONL for audit trail |
| Stop hook | `hooks/stop-hook.ts` | Capture main agent completions and learnings |
| Subagent stop hook | `hooks/subagent-stop-hook.ts` | Route subagent outputs by type |
| Session summary | `hooks/capture-session-summary.ts` | Summarize sessions at close |
| Metadata extraction lib | `hooks/lib/metadata-extraction.ts` | Extract agent instance metadata |

**Summary:**
- **Files created:** 5 + history directory structure
- **Hooks registered:** 7 (PreToolUse, PostToolUse, Stop, SubagentStop, SessionStart, SessionEnd, UserPromptSubmit)
- **Dependencies:** kai-hook-system (required)

---

## The Concept and/or Problem
AI agents are powerful but forgetful. Each session starts fresh with no memory of:

- What you built last week
- Why you made certain architectural decisions
- What bugs you've already fixed (and might reintroduce)
- Lessons learned from debugging sessions
- Research you've already conducted
- What agents discovered during parallel execution

This creates cascading problems across your entire AI infrastructure:

**For Development Work:**
- You fix the same bug twice because you forgot the root cause
- Architectural decisions lack rationale when revisited months later
- Code reviews miss context because the "why" is lost

**For Agent Orchestration:**
- Parallel agents complete work that's never captured
- Background research disappears when the session ends
- Agent outputs aren't categorized or searchable

**For Operational Continuity:**
- Session handoffs require manual context transfer
- Multi-day projects need constant re-explanation
- Team members can't see what the AI worked on

**For Learning and Improvement:**
- Insights get lost in conversation history
- No after-action reviews are possible
- Mistakes repeat because there's no institutional memory

**The Fundamental Problem:**

Traditional AI systems treat each interaction as ephemeral. But real work is cumulative. Today's debugging session informs tomorrow's architecture decision. Last month's research prevents this month's repeated mistake.

Without a history system, your AI is brilliant but amnesiac. Every session is day one. Every context is fresh. Every lesson must be relearned.

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
└── settings.json                    # Hook configuration (or use .claude/settings.json)
```

**Four Hooks, Complete Coverage:**

1. **capture-all-events.ts** (Universal Event Capture)
   - Hooks: ALL events (PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd, etc.)
   - Captures: Every event to daily JSONL logs with full payload
   - Output: `raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`
   - Purpose: Complete audit trail, debugging, analytics

2. **stop-hook.ts** (Main Agent Completion)
   - Hook: Stop
   - Captures: Main agent work summaries and learnings
   - Output: `learnings/` or `sessions/` based on content analysis
   - Purpose: Capture what was accomplished and what was learned

3. **subagent-stop-hook.ts** (Subagent Output Routing)
   - Hook: SubagentStop
   - Captures: All spawned agent outputs
   - Output: Routed to `research/`, `decisions/`, or `execution/` by agent type
   - Purpose: Never lose agent work, automatic categorization

4. **capture-session-summary.ts** (Session End)
   - Hook: SessionEnd
   - Captures: Session summary with files changed, commands run, tools used
   - Output: `sessions/YYYY-MM/timestamp_SESSION_focus.md`
   - Purpose: Know what happened in each session

**Design Principles:**

1. **Zero Overhead**: Hooks run silently, no action required from user
2. **Never Block**: All hooks fail gracefully - never interrupt work
3. **Future-Proof**: Generic payload capture means new fields are automatically stored
4. **Queryable**: Consistent file naming enables powerful search and filtering
5. **Categorized**: Different work types route to appropriate directories
6. **Complete**: Every component included - nothing left to figure out

**The Key Insight:**

Documentation is a byproduct, not a task. By instrumenting the work itself, you get perfect records without any effort. The history system sees everything because it's wired into the event stream.

---

## What Makes This Different

The history system's power comes from its **automatic categorization pipeline** - a multi-layered architecture that captures, analyzes, and routes every piece of work to the right location without any manual intervention.

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

### How Data Flows Through the System

**Example: You debug a tricky auth bug with a researcher agent**

```
1. You ask Claude to investigate the auth bug
         │
         ▼
2. Claude spawns a researcher agent (Task tool)
         │
         ├──► PreToolUse event captured to raw-outputs/
         │
         ▼
3. Researcher agent investigates, finds root cause
         │
         ▼
4. Agent completes with: "🎯 COMPLETED: Found root cause - JWT tokens not refreshing"
         │
         ├──► SubagentStop fires
         │
         ▼
5. subagent-stop-hook.ts:
   a) Extracts completion message
   b) Detects agent_type = "researcher"
   c) Routes to research/YYYY-MM/
         │
         ▼
6. Main Claude fixes the bug based on research
         │
         ▼
7. Claude responds with "fixed", "root cause", "solved" in message
         │
         ├──► Stop fires
         │
         ▼
8. stop-hook.ts:
   a) Analyzes content for learning indicators
   b) Detects 3+ learning keywords
   c) Routes to learnings/YYYY-MM/
         │
         ▼
9. Result: TWO history entries automatically created:
   - research/2025-12/..._AGENT-researcher_RESEARCH_jwt-token-issue.md
   - learnings/2025-12/..._LEARNING_jwt-refresh-fix.md
```

### Why This Architecture Matters

**1. Zero Manual Effort**
- No "save this" commands needed
- No copy-paste to documentation
- Work normally; history captures itself

**2. Automatic Categorization**
- Content analysis detects learnings vs sessions
- Agent type determines output location
- Never manually file anything

**3. Complete Audit Trail**
- Raw JSONL captures EVERYTHING (even things not categorized)
- Can replay/analyze any session retroactively
- Nothing lost, ever

**4. Queryable Structure**
- Consistent file naming: `TIMESTAMP_TYPE_description.md`
- Time-based directories: `YYYY-MM/`
- Standard Unix tools work: `grep -r "authentication" history/`

**5. Agent Awareness**
- Each spawned agent's output is captured separately
- Agent type informs categorization
- Parallel work doesn't get lost or merged

### The Categorization Logic (Deep Dive)

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

### What Problems This Architecture Prevents

| Problem | How History Solves It |
|---------|----------------------|
| "What did we work on last week?" | `ls history/sessions/2025-01/` |
| "Why did we choose that architecture?" | `grep -l "architecture" history/decisions/` |
| "I fixed this bug before, what was the fix?" | `grep -r "auth" history/learnings/` |
| "What did that researcher agent find?" | Automatically in `history/research/` |
| "Can we audit what happened?" | Complete JSONL in `raw-outputs/` |

### The Fundamental Insight

**Naive approach:** Ask the AI to "remember" or manually save important things
- Requires explicit action (never happens)
- AI memory is session-scoped (resets on restart)
- No searchable archive

**History approach:** Instrument the event stream, capture automatically
- Zero effort (hooks run silently)
- Permanent markdown files (never lost)
- Searchable with grep/ls

The history system transforms ephemeral AI interactions into **permanent, searchable institutional memory**. Every debugging session, every research finding, every architectural decision - captured automatically, categorized intelligently, queryable forever.

---

## Why This Is Different

This sounds similar to ChatGPT's Memory feature or vector databases like Pinecone, which also preserve context. What makes this approach different?

Memory systems and vector databases store what you explicitly save or what gets embedded. They require manual tagging, intentional capture, and structured queries. The Kai History System captures everything automatically through hooks—every agent output, every research finding, every debugging session—without any manual effort. History is organized by time and category, searchable by grep, and stored in plain markdown. You work normally; documentation handles itself.

- Automatic capture through hooks needs no manual effort
- Plain markdown files searchable with standard Unix tools
- Categorized by type: learnings, research, sessions, projects
- Every agent's output is routed and preserved automatically

---

## Installation

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Claude Code** (or compatible agent system with hook support)
- **Write access** to `$PAI_DIR/` (or your PAI directory)
- **kai-hook-system Pack** installed (this pack depends on the hook infrastructure)

---

### Pre-Installation: System Analysis

**IMPORTANT:** Before installing, analyze the current system state to detect conflicts and ensure dependencies are met.

#### Step 0.1: Verify Dependencies

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check that hook system is installed
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ Hook system is installed"
else
  echo "❌ Hook system NOT installed - install kai-hook-system first!"
fi

# Check hooks directory exists
if [ -d "$PAI_CHECK/hooks" ]; then
  echo "✓ Hooks directory exists"
  ls "$PAI_CHECK/hooks"/*.ts 2>/dev/null | head -5
else
  echo "❌ Hooks directory missing - install kai-hook-system first!"
fi
```

#### Step 0.2: Detect Existing History System

```bash
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Check for existing history directory
if [ -d "$PAI_CHECK/history" ]; then
  echo "⚠️  History directory EXISTS at: $PAI_CHECK/history"
  echo "Existing categories:"
  ls -la "$PAI_CHECK/history" 2>/dev/null
  echo ""
  echo "Existing files count per category:"
  for dir in "$PAI_CHECK/history"/*/; do
    if [ -d "$dir" ]; then
      count=$(ls -1 "$dir" 2>/dev/null | wc -l)
      echo "  $(basename "$dir"): $count files"
    fi
  done
else
  echo "✓ No existing history directory (clean install)"
fi

# Check for existing history hooks
echo ""
echo "Checking for existing history hooks..."
for hook in "capture-all-events" "stop-hook" "subagent-stop-hook" "capture-session-summary"; do
  if [ -f "$PAI_CHECK/hooks/${hook}.ts" ]; then
    echo "⚠️  ${hook}.ts already exists"
  else
    echo "✓ ${hook}.ts not found (will be created)"
  fi
done
```

#### Step 0.3: Conflict Resolution Matrix

| Scenario | Existing State | Action |
|----------|---------------|--------|
| **Clean Install** | No history dir, no hooks | Proceed normally with Step 1 |
| **History Directory Exists** | Files in history/ | New captures added alongside; existing files preserved |
| **History Hooks Exist** | Hook files present | Compare versions; backup old hooks before replacing |
| **Missing Dependencies** | No hook system | Install kai-hook-system first |

#### Step 0.4: Backup Existing History (If Needed)

```bash
BACKUP_DIR="$HOME/.pai-backup/$(date +%Y%m%d-%H%M%S)"
PAI_CHECK="${PAI_DIR:-$HOME/.config/pai}"

# Backup history directory if exists
if [ -d "$PAI_CHECK/history" ]; then
  mkdir -p "$BACKUP_DIR"
  cp -r "$PAI_CHECK/history" "$BACKUP_DIR/history"
  echo "✓ Backed up history to $BACKUP_DIR/history"
fi

# Backup history-related hooks
mkdir -p "$BACKUP_DIR/hooks" 2>/dev/null
for hook in "capture-all-events" "stop-hook" "subagent-stop-hook" "capture-session-summary"; do
  if [ -f "$PAI_CHECK/hooks/${hook}.ts" ]; then
    cp "$PAI_CHECK/hooks/${hook}.ts" "$BACKUP_DIR/hooks/"
    echo "✓ Backed up ${hook}.ts"
  fi
done
```

**After completing system analysis, proceed to Step 1.**

---

### Step 1: Create Directory Structure

```bash
# Create all required directories
mkdir -p $PAI_DIR/hooks/lib
mkdir -p $PAI_DIR/history/{sessions,learnings,research,decisions,raw-outputs}
mkdir -p $PAI_DIR/history/execution/{features,bugs,refactors}

# Verify structure
ls -la $PAI_DIR/
ls -la $PAI_DIR/history/
```

Expected output: All directories created with no errors.

---

### Step 2: Create Library Files

These shared libraries are used by multiple hooks.

#### 2.1: Create metadata-extraction.ts

```typescript
// $PAI_DIR/hooks/lib/metadata-extraction.ts
// Extract agent instance metadata from Task tool calls

export interface AgentInstanceMetadata {
  agent_instance_id?: string;
  agent_type?: string;
  instance_number?: number;
  parent_session_id?: string;
  parent_task_id?: string;
}

/**
 * Extract agent instance ID from Task tool input
 */
export function extractAgentInstanceId(
  toolInput: any,
  description?: string
): AgentInstanceMetadata {
  const result: AgentInstanceMetadata = {};

  // Strategy 1: Extract from description [agent-type-N]
  if (description) {
    const descMatch = description.match(/\[([a-z-]+-researcher)-(\d+)\]/);
    if (descMatch) {
      result.agent_type = descMatch[1];
      result.instance_number = parseInt(descMatch[2], 10);
      result.agent_instance_id = `${result.agent_type}-${result.instance_number}`;
    }
  }

  // Strategy 2: Extract from prompt [AGENT_INSTANCE: ...]
  if (!result.agent_instance_id && toolInput?.prompt && typeof toolInput.prompt === 'string') {
    const promptMatch = toolInput.prompt.match(/\[AGENT_INSTANCE:\s*([^\]]+)\]/);
    if (promptMatch) {
      result.agent_instance_id = promptMatch[1].trim();
      const parts = result.agent_instance_id.match(/^([a-z-]+)-(\d+)$/);
      if (parts) {
        result.agent_type = parts[1];
        result.instance_number = parseInt(parts[2], 10);
      }
    }
  }

  // Strategy 3: Fallback to subagent_type
  if (!result.agent_type && toolInput?.subagent_type) {
    result.agent_type = toolInput.subagent_type;
  }

  return result;
}

/**
 * Enrich event with agent metadata
 */
export function enrichEventWithAgentMetadata(
  event: any,
  toolInput: any,
  description?: string
): any {
  const metadata = extractAgentInstanceId(toolInput, description);
  const enrichedEvent = { ...event };

  if (metadata.agent_instance_id) enrichedEvent.agent_instance_id = metadata.agent_instance_id;
  if (metadata.agent_type) enrichedEvent.agent_type = metadata.agent_type;
  if (metadata.instance_number !== undefined) enrichedEvent.instance_number = metadata.instance_number;

  return enrichedEvent;
}

/**
 * Check if a tool call is spawning a subagent
 */
export function isAgentSpawningCall(toolName: string, toolInput: any): boolean {
  return toolName === 'Task' && toolInput?.subagent_type !== undefined;
}
```

---

### Step 3: Create Hook Files

#### 3.1: Create capture-all-events.ts (Universal Event Capture)

```typescript
#!/usr/bin/env bun
// $PAI_DIR/hooks/capture-all-events.ts
// Captures ALL Claude Code hook events to JSONL

import { readFileSync, appendFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { enrichEventWithAgentMetadata, isAgentSpawningCall } from './lib/metadata-extraction';

interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  timestamp: number;
  timestamp_local: string;
}

function getLocalTimestamp(): string {
  const date = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getEventsFilePath(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const monthDir = join(paiDir, 'history', 'raw-outputs', `${year}-${month}`);
  if (!existsSync(monthDir)) {
    mkdirSync(monthDir, { recursive: true });
  }

  return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

function getSessionMappingFile(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  return join(paiDir, 'agent-sessions.json');
}

function getAgentForSession(sessionId: string): string {
  try {
    const mappingFile = getSessionMappingFile();
    if (existsSync(mappingFile)) {
      const mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
      return mappings[sessionId] || 'main';
    }
  } catch (error) {}
  return 'main';
}

function setAgentForSession(sessionId: string, agentName: string): void {
  try {
    const mappingFile = getSessionMappingFile();
    let mappings: Record<string, string> = {};
    if (existsSync(mappingFile)) {
      mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
    }
    mappings[sessionId] = agentName;
    writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf-8');
  } catch (error) {}
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const eventTypeIndex = args.indexOf('--event-type');

    if (eventTypeIndex === -1) {
      console.error('Missing --event-type argument');
      process.exit(0);
    }

    const eventType = args[eventTypeIndex + 1];
    const stdinData = await Bun.stdin.text();
    const hookData = JSON.parse(stdinData);

    const sessionId = hookData.session_id || 'main';
    let agentName = getAgentForSession(sessionId);

    // Track agent type from Task tool calls
    if (hookData.tool_name === 'Task' && hookData.tool_input?.subagent_type) {
      agentName = hookData.tool_input.subagent_type;
      setAgentForSession(sessionId, agentName);
    } else if (eventType === 'SubagentStop' || eventType === 'Stop') {
      agentName = 'main';
      setAgentForSession(sessionId, 'main');
    } else if (process.env.CLAUDE_CODE_AGENT) {
      agentName = process.env.CLAUDE_CODE_AGENT;
      setAgentForSession(sessionId, agentName);
    }

    let event: HookEvent = {
      source_app: agentName,
      session_id: hookData.session_id || 'main',
      hook_event_type: eventType,
      payload: hookData,
      timestamp: Date.now(),
      timestamp_local: getLocalTimestamp()
    };

    // Enrich with agent metadata if spawning subagent
    if (isAgentSpawningCall(hookData.tool_name, hookData.tool_input)) {
      event = enrichEventWithAgentMetadata(event, hookData.tool_input, hookData.description);
    }

    const eventsFile = getEventsFilePath();
    appendFileSync(eventsFile, JSON.stringify(event) + '\n', 'utf-8');

  } catch (error) {
    console.error('Event capture error:', error);
  }

  process.exit(0);
}

main();
```

#### 3.2: Create stop-hook.ts (Main Agent Completion)

```typescript
#!/usr/bin/env bun
// $PAI_DIR/hooks/stop-hook.ts
// Captures main agent work summaries and learnings

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface StopPayload {
  stop_hook_active: boolean;
  transcript_path?: string;
  response?: string;
  session_id?: string;
}

function getLocalTimestamp(): string {
  const date = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function hasLearningIndicators(text: string): boolean {
  const indicators = [
    'problem', 'solved', 'discovered', 'fixed', 'learned', 'realized',
    'figured out', 'root cause', 'debugging', 'issue was', 'turned out',
    'mistake', 'error', 'bug', 'solution'
  ];
  const lowerText = text.toLowerCase();
  const matches = indicators.filter(i => lowerText.includes(i));
  return matches.length >= 2;
}

function extractSummary(response: string): string {
  // Look for COMPLETED section
  const completedMatch = response.match(/🎯\s*COMPLETED[:\s]*(.+?)(?:\n|$)/i);
  if (completedMatch) {
    return completedMatch[1].trim().slice(0, 100);
  }

  // Look for SUMMARY section
  const summaryMatch = response.match(/📋\s*SUMMARY[:\s]*(.+?)(?:\n|$)/i);
  if (summaryMatch) {
    return summaryMatch[1].trim().slice(0, 100);
  }

  // Fallback: first meaningful line
  const lines = response.split('\n').filter(l => l.trim().length > 10);
  if (lines.length > 0) {
    return lines[0].trim().slice(0, 100);
  }

  return 'work-session';
}

function generateFilename(type: string, description: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
  const kebab = description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${timestamp}_${type}_${kebab}.md`;
}

async function main() {
  try {
    const stdinData = await Bun.stdin.text();
    if (!stdinData.trim()) {
      process.exit(0);
    }

    const payload: StopPayload = JSON.parse(stdinData);
    if (!payload.response) {
      process.exit(0);
    }

    const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
    const historyDir = join(paiDir, 'history');

    const isLearning = hasLearningIndicators(payload.response);
    const type = isLearning ? 'LEARNING' : 'SESSION';
    const subdir = isLearning ? 'learnings' : 'sessions';

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const outputDir = join(historyDir, subdir, yearMonth);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const summary = extractSummary(payload.response);
    const filename = generateFilename(type, summary);
    const filepath = join(outputDir, filename);

    const content = `---
capture_type: ${type}
timestamp: ${getLocalTimestamp()}
session_id: ${payload.session_id || 'unknown'}
executor: main
---

# ${type}: ${summary}

${payload.response}

---

*Captured by PAI History System stop-hook*
`;

    writeFileSync(filepath, content);
    console.log(`📝 Captured ${type} to ${subdir}/${yearMonth}/${filename}`);

  } catch (error) {
    console.error('Stop hook error:', error);
  }

  process.exit(0);
}

main();
```

#### 3.3: Create subagent-stop-hook.ts (Subagent Output Routing)

```typescript
#!/usr/bin/env bun
// $PAI_DIR/hooks/subagent-stop-hook.ts
// Routes subagent outputs to appropriate history directories

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { extractAgentInstanceId } from './lib/metadata-extraction';

function getLocalTimestamp(): string {
  const date = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findTaskResult(transcriptPath: string, maxAttempts: number = 2): Promise<{ result: string | null, agentType: string | null, description: string | null, toolInput: any | null }> {
  let actualTranscriptPath = transcriptPath;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await delay(200);

    if (!existsSync(actualTranscriptPath)) {
      const dir = dirname(transcriptPath);
      if (existsSync(dir)) {
        const files = readdirSync(dir)
          .filter(f => f.startsWith('agent-') && f.endsWith('.jsonl'))
          .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtime }))
          .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

        if (files.length > 0) {
          actualTranscriptPath = join(dir, files[0].name);
        }
      }
      if (!existsSync(actualTranscriptPath)) continue;
    }

    try {
      const transcript = readFileSync(actualTranscriptPath, 'utf-8');
      const lines = transcript.trim().split('\n');

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.type === 'assistant' && entry.message?.content) {
            for (const content of entry.message.content) {
              if (content.type === 'tool_use' && content.name === 'Task') {
                const toolInput = content.input;
                const description = toolInput?.description || null;

                for (let j = i + 1; j < lines.length; j++) {
                  const resultEntry = JSON.parse(lines[j]);
                  if (resultEntry.type === 'user' && resultEntry.message?.content) {
                    for (const resultContent of resultEntry.message.content) {
                      if (resultContent.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                        let taskOutput: string;
                        if (typeof resultContent.content === 'string') {
                          taskOutput = resultContent.content;
                        } else if (Array.isArray(resultContent.content)) {
                          taskOutput = resultContent.content
                            .filter((item: any) => item.type === 'text')
                            .map((item: any) => item.text)
                            .join('\n');
                        } else {
                          continue;
                        }

                        let agentType = toolInput?.subagent_type || 'default';
                        return { result: taskOutput, agentType, description, toolInput };
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  return { result: null, agentType: null, description: null, toolInput: null };
}

function extractCompletionMessage(taskOutput: string): { message: string | null, agentType: string | null } {
  // Look for COMPLETED section
  const patterns = [
    /🎯\s*COMPLETED[:\s]*\[AGENT:(\w+[-\w]*)\]\s*(.+?)(?:\n|$)/is,
    /🎯\s*COMPLETED[:\s]*(.+?)(?:\n|$)/i,
    /COMPLETED[:\s]*(.+?)(?:\n|$)/i
  ];

  for (const pattern of patterns) {
    const match = taskOutput.match(pattern);
    if (match) {
      if (match[2]) {
        return { message: match[2].trim(), agentType: match[1].toLowerCase() };
      }
      return { message: match[1].trim(), agentType: null };
    }
  }

  return { message: null, agentType: null };
}

async function captureAgentOutput(
  agentType: string,
  completionMessage: string,
  taskOutput: string,
  transcriptPath: string
) {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const historyDir = join(paiDir, 'history');

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Route by agent type
  let captureType = 'RESEARCH';
  let category = 'research';

  if (agentType.includes('researcher') || agentType === 'intern') {
    captureType = 'RESEARCH';
    category = 'research';
  } else if (agentType === 'architect') {
    captureType = 'DECISION';
    category = 'decisions';
  } else if (agentType === 'engineer' || agentType === 'designer') {
    captureType = 'FEATURE';
    category = 'execution/features';
  }

  const description = completionMessage
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  const filename = `${timestamp}_AGENT-${agentType}_${captureType}_${description}.md`;
  const outputDir = join(historyDir, category, yearMonth);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const document = `---
capture_type: ${captureType}
timestamp: ${getLocalTimestamp()}
executor: ${agentType}
agent_completion: ${completionMessage}
---

# ${captureType}: ${completionMessage}

**Agent:** ${agentType}
**Completed:** ${timestamp}

---

## Agent Output

${taskOutput}

---

## Metadata

**Transcript:** \`${transcriptPath}\`
**Captured:** ${getLocalTimestamp()}

---

*Captured by PAI History System subagent-stop-hook*
`;

  writeFileSync(join(outputDir, filename), document);
  console.log(`📝 Captured ${agentType} output to ${category}/${yearMonth}/${filename}`);
}

async function main() {
  try {
    let input = '';
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();

    const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 500));
    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (!input) process.exit(0);

    const parsed = JSON.parse(input);
    const transcriptPath = parsed.transcript_path;
    if (!transcriptPath) process.exit(0);

    const { result: taskOutput, agentType, description, toolInput } = await findTaskResult(transcriptPath);
    if (!taskOutput) process.exit(0);

    const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);
    if (!completionMessage) process.exit(0);

    const finalAgentType = extractedAgentType || agentType || 'default';

    await captureAgentOutput(finalAgentType, completionMessage, taskOutput, transcriptPath);

  } catch (error) {
    console.error('Subagent stop hook error:', error);
  }

  process.exit(0);
}

main();
```

#### 3.4: Create capture-session-summary.ts (Session End)

```typescript
#!/usr/bin/env bun
// $PAI_DIR/hooks/capture-session-summary.ts
// Creates session summary when Claude Code session ends

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface SessionData {
  conversation_id: string;
  timestamp: string;
  [key: string]: any;
}

function getLocalTimestamp(): string {
  const date = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');
  const seconds = String(localDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function determineSessionFocus(filesChanged: string[], commandsExecuted: string[]): string {
  const filePatterns = filesChanged.map(f => f.toLowerCase());

  if (filePatterns.some(f => f.includes('/blog/') || f.includes('/posts/'))) return 'blog-work';
  if (filePatterns.some(f => f.includes('/hooks/'))) return 'hook-development';
  if (filePatterns.some(f => f.includes('/skills/'))) return 'skill-updates';
  if (filePatterns.some(f => f.includes('/agents/'))) return 'agent-work';
  if (commandsExecuted.some(cmd => cmd.includes('test'))) return 'testing-session';
  if (commandsExecuted.some(cmd => cmd.includes('git commit'))) return 'git-operations';
  if (commandsExecuted.some(cmd => cmd.includes('deploy'))) return 'deployment';

  if (filesChanged.length > 0) {
    const mainFile = filesChanged[0].split('/').pop()?.replace(/\.(md|ts|js)$/, '');
    if (mainFile) return `${mainFile}-work`;
  }

  return 'development-session';
}

async function analyzeSession(conversationId: string, yearMonth: string): Promise<any> {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const rawOutputsDir = join(paiDir, 'history', 'raw-outputs', yearMonth);

  let filesChanged: string[] = [];
  let commandsExecuted: string[] = [];
  let toolsUsed: Set<string> = new Set();

  try {
    if (existsSync(rawOutputsDir)) {
      const files = readdirSync(rawOutputsDir).filter(f => f.endsWith('.jsonl'));

      for (const file of files) {
        const content = readFileSync(join(rawOutputsDir, file), 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (entry.payload?.tool_name) {
              toolsUsed.add(entry.payload.tool_name);
            }
            if (entry.payload?.tool_name === 'Edit' || entry.payload?.tool_name === 'Write') {
              if (entry.payload?.tool_input?.file_path) {
                filesChanged.push(entry.payload.tool_input.file_path);
              }
            }
            if (entry.payload?.tool_name === 'Bash' && entry.payload?.tool_input?.command) {
              commandsExecuted.push(entry.payload.tool_input.command);
            }
          } catch (e) {}
        }
      }
    }
  } catch (error) {}

  return {
    focus: determineSessionFocus([...new Set(filesChanged)], commandsExecuted),
    filesChanged: [...new Set(filesChanged)].slice(0, 10),
    commandsExecuted: commandsExecuted.slice(0, 10),
    toolsUsed: Array.from(toolsUsed)
  };
}

async function main() {
  try {
    const input = await Bun.stdin.text();
    if (!input.trim()) process.exit(0);

    const data: SessionData = JSON.parse(input);
    const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
    const historyDir = join(paiDir, 'history');

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0];
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const sessionInfo = await analyzeSession(data.conversation_id, yearMonth);
    const filename = `${timestamp}_SESSION_${sessionInfo.focus}.md`;

    const sessionDir = join(historyDir, 'sessions', yearMonth);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    const sessionDoc = `---
capture_type: SESSION
timestamp: ${getLocalTimestamp()}
session_id: ${data.conversation_id}
executor: main
---

# Session: ${sessionInfo.focus}

**Session ID:** ${data.conversation_id}
**Ended:** ${getLocalTimestamp()}

---

## Tools Used

${sessionInfo.toolsUsed.length > 0 ? sessionInfo.toolsUsed.map((t: string) => `- ${t}`).join('\n') : '- None recorded'}

---

## Files Modified

${sessionInfo.filesChanged.length > 0 ? sessionInfo.filesChanged.map((f: string) => `- \`${f}\``).join('\n') : '- None recorded'}

---

## Commands Executed

${sessionInfo.commandsExecuted.length > 0 ? '```bash\n' + sessionInfo.commandsExecuted.join('\n') + '\n```' : 'None recorded'}

---

*Session summary captured by PAI History System*
`;

    writeFileSync(join(sessionDir, filename), sessionDoc);
    console.log(`📝 Session summary saved to sessions/${yearMonth}/${filename}`);

  } catch (error) {
    console.error('Session summary error:', error);
  }

  process.exit(0);
}

main();
```

---

### Step 4: Register Hooks in settings.json

Claude Code looks for settings in `~/.claude/settings.json`. Add or merge the following hook configuration:

**File location:** `~/.claude/settings.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type PreToolUse"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type PostToolUse"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/stop-hook.ts"
          },
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type Stop"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/subagent-stop-hook.ts"
          },
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SubagentStop"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-session-summary.ts"
          },
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SessionEnd"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SessionStart"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type UserPromptSubmit"
          }
        ]
      }
    ]
  }
}
```

**Important:** If you already have a settings.json, merge the hooks section with your existing configuration.

---

### Step 5: Set Environment Variables (Optional)

**If you used the Kai Bundle wizard:** These are already in `$PAI_DIR/.env` - skip this step.

**For manual installation:** Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
# PAI configuration
export PAI_DIR="$HOME/.config/pai"
export TIME_ZONE="America/Los_Angeles"  # Your timezone
export DA="PAI"  # Your AI assistant name

# Reload shell
source ~/.zshrc
```

---

### Step 6: Verify Installation

```bash
# 1. Check all hooks exist and are executable
ls -la $PAI_DIR/hooks/*.ts
# Should show 4 hook files

# 2. Check lib files exist
ls -la $PAI_DIR/hooks/lib/*.ts
# Should show metadata-extraction.ts

# 3. Check directory structure
ls -la $PAI_DIR/history/
# Should show: sessions, learnings, research, decisions, execution, raw-outputs

# 4. Verify Bun can run the hooks
bun run $PAI_DIR/hooks/capture-all-events.ts --event-type Test <<< '{"test": true}'
# Should create an entry in raw-outputs

# 5. Check raw-outputs for the test entry
ls $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/
# Should show today's events file

# 6. Restart Claude Code to activate hooks
# Then run any command and check for new files in history/
```

**Success indicators:**
- No errors when running hooks
- Files appearing in `$PAI_DIR/history/raw-outputs/`
- Session summaries appearing after ending sessions
- Agent outputs captured in appropriate subdirectories

## Invocation Scenarios
The history system triggers automatically on Claude Code events:

| Event | Hook | Output Location | Captured Data |
|-------|------|-----------------|---------------|
| Any tool starts | PreToolUse | `raw-outputs/` | Tool name, input, session |
| Any tool completes | PostToolUse | `raw-outputs/` | Tool name, input, output |
| Main agent finishes | Stop | `learnings/` or `sessions/` | Full response, categorized |
| Subagent completes | SubagentStop | `research/`, `decisions/`, or `execution/` | Agent output, routed by type |
| User quits session | SessionEnd | `sessions/` | Files changed, tools used |
| User starts session | SessionStart | `raw-outputs/` | Session metadata |
| User sends prompt | UserPromptSubmit | `raw-outputs/` | Prompt content |

**Automatic Categorization Logic:**

The Stop hook analyzes response content for learning indicators:
- Contains 2+ of: problem, solved, discovered, fixed, learned, realized, bug, error, root cause
- **YES** → Saves to `learnings/`
- **NO** → Saves to `sessions/`

**Agent Routing Logic:**

The SubagentStop hook routes by agent type:
- `*researcher`, `intern` → `research/`
- `architect` → `decisions/`
- `engineer`, `designer` → `execution/features/`

## Example Usage
### Example 1: Searching Past Work

```bash
# User: "Have we worked on authentication before?"

grep -r "authentication" $PAI_DIR/history/

# Results:
# learnings/2025-10/20251013T143022_LEARNING_jwt-token-refresh.md
# execution/features/2025-09/20250928T091530_FEATURE_user-login.md
# decisions/2025-09/20250925T162045_DECISION_auth-strategy.md
```

### Example 2: Reviewing Session Activity

```bash
# After a session ends, check what was captured

ls -lt $PAI_DIR/history/sessions/2025-12/ | head -5

# Shows recent session files with their focus:
# 20251228T153045_SESSION_hook-development.md
# 20251228T142312_SESSION_blog-work.md
# 20251228T101523_SESSION_testing-session.md
```

### Example 3: Finding Why a Decision Was Made

```bash
# User: "Why did we choose that architecture?"

grep -l "architecture\|decision\|chose" $PAI_DIR/history/decisions/

# Returns files with architectural decisions and rationale
```

### Example 4: Checking Agent Work

```bash
# See all research agents completed today

ls $PAI_DIR/history/research/2025-12/ | grep AGENT

# Shows:
# 20251228T143022_AGENT-researcher_RESEARCH_market-analysis.md
# 20251228T142518_AGENT-intern_RESEARCH_competitor-review.md
```

## Configuration
**Environment variables:**

```bash
# Override default PAI directory (default: ~/.config/pai)
export PAI_DIR="$HOME/.config/pai"

# Set timezone for timestamps (default: system timezone)
export TIME_ZONE="America/Los_Angeles"

# Set source app name for observability (default: PAI)
export DA="MyAI"
export PAI_SOURCE_APP="MyAI"
```

**Settings file location:**
- Claude Code: `~/.claude/settings.json`
- OpenCode: Check your platform's hook configuration location

**Directory structure is fixed** - categorization depends on consistent paths. Only customize the root PAI_DIR location if needed.

---

## Customization

### Recommended Customization

**Tune the Learning Detection Keywords**

The history system automatically categorizes responses as "learnings" or "sessions" based on keyword detection. Customize these keywords to match your vocabulary and ensure valuable insights get properly captured.

**What to Customize:** `$PAI_DIR/hooks/stop-hook.ts`

**Why:** Different developers express learning differently. If you say "figured out" but not "root cause", or "aha moment" instead of "discovered", your learnings might not be captured in the learnings/ directory. Tuning these keywords ensures your insights get properly categorized.

**Process:**

1. **Review Your Recent Sessions**
   ```bash
   # Look at recent sessions
   ls -lt $PAI_DIR/history/sessions/ | head -10

   # Check if any should have been learnings
   grep -l "aha\|insight\|realized" $PAI_DIR/history/sessions/
   ```

2. **Add Your Keywords**
   Edit the `hasLearningIndicators` function in `stop-hook.ts`:
   ```typescript
   function hasLearningIndicators(text: string): boolean {
     const indicators = [
       'problem', 'solved', 'discovered', 'fixed', 'learned', 'realized',
       'figured out', 'root cause', 'debugging', 'issue was', 'turned out',
       'mistake', 'error', 'bug', 'solution',
       // Add your personal indicators:
       'aha', 'insight', 'trick was', 'key was', 'finally', 'breakthrough'
     ];
     // ...
   }
   ```

3. **Adjust Threshold**
   Default requires 2+ matches. Adjust if needed:
   ```typescript
   return matches.length >= 2;  // Change to 1 for more sensitive capture
   ```

**Expected Outcome:** Your valuable learnings are properly categorized and easily searchable.

---

### Optional Customization

| Customization | File | Impact |
|---------------|------|--------|
| **Agent Routing** | `subagent-stop-hook.ts` | Add new agent types and their output directories |
| **Summary Extraction** | `stop-hook.ts` | Modify how completion summaries are extracted |
| **Session Focus Detection** | `capture-session-summary.ts` | Add patterns for your project types |
| **File Naming** | All hooks | Change timestamp format or description extraction |

**Example: Add New Agent Type Routing**

Edit `subagent-stop-hook.ts` to add routing for custom agents:

```typescript
// Add to agent routing logic
if (agentType === 'security-researcher' || agentType === 'pentester') {
  captureType = 'SECURITY';
  category = 'security';  // Creates history/security/
} else if (agentType === 'code-reviewer') {
  captureType = 'REVIEW';
  category = 'reviews';   // Creates history/reviews/
}
```

**Example: Custom Session Focus Detection**

Edit `capture-session-summary.ts` to detect your project types:

```typescript
function determineSessionFocus(filesChanged: string[], commandsExecuted: string[]): string {
  // Add your project-specific patterns
  if (filePatterns.some(f => f.includes('/api/'))) return 'api-development';
  if (filePatterns.some(f => f.includes('/tests/'))) return 'test-writing';
  // ...
}
```

---

## Credits
- **Original concept**: Daniel Miessler - developed as part of Kai personal AI infrastructure
- **Contributors**: The PAI community
- **Inspired by**: Git's version history, engineering logbooks, Zettelkasten method

## Related Work

- **Git version control** - Inspired by git's approach to tracking history
- **Engineering logbooks** - Traditional approach to capturing work and learnings
- **Zettelkasten method** - Interconnected knowledge capture system

## Works Well With

- **kai-hook-system** - Required foundation; provides the event stream this pack captures
- **kai-core-install** - Skills can reference past learnings and research from history; CORE skill guides what gets captured
- **kai-voice-system** - Voice notifications can announce when significant history is captured

## Recommended

- **kai-hook-system** - Required dependency; without it no events are captured
- **kai-core-install** - Enables skill-based categorization of learnings

## Relationships

### Parent Of
*None - this is a data capture layer, not a foundation for other packs.*

### Child Of
- **kai-hook-system** - Depends entirely on hook events (Stop, SubagentStop, SessionEnd) for all capture

### Sibling Of
- **kai-core-install** - Both are foundation packs that depend on kai-hook-system
- **kai-voice-system** - Both consume hook events for their functionality

### Part Of Collection
**Kai Core Bundle** - One of 4 foundational packs that together create the complete Kai personal AI infrastructure.

## Changelog

### 1.0.0 - 2025-12-28
- Initial release
- Four hooks: capture-all-events, stop-hook, subagent-stop-hook, capture-session-summary
- One lib file: metadata-extraction
- Automatic categorization by content and agent type
- Full settings.json configuration included
- Note: Observability dashboard integration is a separate pack (observability-server)
