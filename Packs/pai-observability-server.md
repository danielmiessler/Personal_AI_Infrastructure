---
name: Kai Observability Server
pack-id: danielmiessler-kai-observability-server-core-v1.0.0
version: 1.0.0
author: danielmiessler
description: Real-time multi-agent activity monitoring dashboard with WebSocket streaming - see exactly what your AI agents are doing as they work
type: feature
purpose-type: [observability, monitoring, development, debugging]
platform: claude-code
dependencies: [kai-hook-system]
keywords: [observability, dashboard, monitoring, agents, websocket, streaming, events, debugging, visualization, real-time]
---

<p align="center">
  <img src="icons/kai-observability-server-v2.png" alt="Kai Observability Server" width="256">
</p>

# Kai Observability Server (kai-observability-server)

> Real-time multi-agent activity monitoring dashboard - see exactly what your AI agents are doing as they work

## Installation Prompt
You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#pack-system)

This Pack adds real-time monitoring capabilities to your AI infrastructure. The Observability Server streams every tool call, hook event, and agent action to a beautiful dashboard:

- **WebSocket Streaming**: Events appear instantly as they happen
- **Multi-Agent Tracking**: See activity across all agents (main, interns, researchers, etc.)
- **Event Timeline**: Chronological view of all operations
- **Agent Swim Lanes**: Compare activity between multiple agents
- **Zero Configuration**: Just start the server and go

**Core principle:** You can't improve what you can't see. This dashboard gives you complete visibility into your AI's operations.

**Dependency:** Requires the [kai-hook-system](kai-hook-system.md) pack to capture events.

Please follow the installation instructions below to integrate this Pack into your infrastructure.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| WebSocket server | `Observability/server/index.ts` | HTTP API + WebSocket streaming |
| File ingestion | `Observability/server/file-ingest.ts` | Watch JSONL and stream events |
| Type definitions | `Observability/server/types.ts` | TypeScript interfaces |
| Vue dashboard | `Observability/dashboard/App.vue` | Real-time monitoring UI |
| Event capture hook | `hooks/capture-all-events.ts` | Capture all events to JSONL |
| Metadata extraction | `hooks/lib/metadata-extraction.ts` | Agent instance tracking |

**Summary:**
- **Files created:** 8+ (server, dashboard, hooks)
- **Hooks registered:** 7 (all event types via capture-all-events)
- **Dependencies:** kai-hook-system (required)

---

## The Concept and/or Problem

When running AI agents, especially multiple agents in parallel, you're flying blind:

- **What's happening now?** No visibility into real-time operations
- **Which agent did what?** When you spawn multiple agents, you lose track of their activity
- **Where did it fail?** No way to trace back through operations when something breaks
- **What was the sequence?** Tool calls happen fast - you can't see the order
- **How long did it take?** No performance visibility

**The Problem:**

Claude Code logs events through hooks, but the data just... sits there. You can grep through JSONL files after the fact, but that's like trying to debug by reading logs - tedious and slow.

Meanwhile, your agents are doing hundreds of operations:
- File reads and writes
- Bash commands executing
- Sub-agents spawning and completing
- API calls succeeding or failing

Without real-time visibility, you're working in the dark.

**The Opportunity:**

What if you could watch your AI infrastructure like a control room? Every operation visible. Every agent tracked. Every event timestamped and streaming live. That's what observability enables - complete operational awareness.

## The Solution

The Observability Server provides a complete monitoring stack:

**Architecture:**

```
$PAI_DIR/
├── observability/                    # Observability infrastructure
│   ├── manage.sh                     # Control script (start/stop/restart)
│   └── apps/
│       ├── server/                   # Backend (Bun + TypeScript)
│       │   ├── src/
│       │   │   ├── index.ts          # HTTP + WebSocket server
│       │   │   ├── file-ingest.ts    # JSONL file watcher
│       │   │   └── types.ts          # TypeScript interfaces
│       │   └── package.json
│       └── client/                   # Frontend (Vue 3 + Vite)
│           ├── src/
│           │   ├── App.vue           # Main dashboard
│           │   └── components/       # UI components
│           └── package.json
├── hooks/
│   ├── capture-all-events.ts         # Hook that logs all events
│   └── lib/
│       └── metadata-extraction.ts    # Agent metadata extraction
└── history/
    └── raw-outputs/
        └── YYYY-MM/
            └── YYYY-MM-DD_all-events.jsonl  # Event storage
```

**Data Flow:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY DATA FLOW                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐                                                        │
│  │  Claude Code │ ──► Hook events fire (PreToolUse, PostToolUse, etc.)   │
│  └──────┬───────┘                                                        │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │             capture-all-events.ts (PostToolUse hook)              │   │
│  │  Receives JSON via stdin → Appends to daily JSONL file            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │           YYYY-MM-DD_all-events.jsonl (file storage)              │   │
│  │  One line per event, organized by date in monthly directories     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              file-ingest.ts (server component)                    │   │
│  │  Watches file for changes → Parses new lines → Streams to WS      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              index.ts (Bun HTTP + WebSocket server)               │   │
│  │  Port 4000 → WebSocket: /stream → HTTP: /events/*                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │              Vue 3 Dashboard (Vite dev server)                    │   │
│  │  Port 5172 → Connects to WS → Renders real-time event timeline    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key Components:**

| Component | Purpose | Technology |
|-----------|---------|------------|
| `capture-all-events.ts` | Hook that captures ALL events to JSONL | TypeScript/Bun |
| `file-ingest.ts` | Watches JSONL file, streams new events | Node fs.watch |
| `index.ts` | HTTP API + WebSocket server | Bun.serve |
| `App.vue` | Main dashboard UI | Vue 3 + Tailwind |
| `manage.sh` | Start/stop/restart script | Bash |

**Design Principles:**

1. **No Database**: Events stream from files directly - no persistence overhead
2. **Fire and Forget**: Hook writes and exits fast - never blocks Claude Code
3. **Fresh Start**: Each server launch starts clean - no stale state
4. **In-Memory Only**: Recent events cached in memory, not stored in DB
5. **Graceful Degradation**: Dashboard down? Hooks still log. Server restarts? Just reload.

---

## What Makes This Different

The observability system's power comes from its **file-based streaming architecture** - a simple but effective pattern that separates event capture from event display.

### Why File-Based Streaming?

**Naive approach:** Send events directly to a server via HTTP
- Complex: Need error handling, retries, connection management
- Fragile: Server down = events lost
- Blocking: Network latency affects hook performance

**File-based approach:** Write to local file, server watches and streams
- Simple: Just append to a file (atomic, fast, reliable)
- Robust: File persists even if server is down
- Non-blocking: File writes are fast, hook exits immediately
- Portable: JSONL files can be processed by any tool

### The Critical Insight

Hooks must NEVER block Claude Code. The file-based approach ensures:

1. Hook receives event via stdin
2. Hook appends one line to JSONL file
3. Hook exits immediately (exit 0)

Total time: ~1-2ms. Claude Code barely notices.

Meanwhile, the server:
1. Watches the JSONL file for changes
2. Reads only new lines (tracks file position)
3. Parses JSON and broadcasts to WebSocket clients

This decoupling means the expensive work (UI rendering, WebSocket management) happens outside the critical path.

### In-Memory Design

The server maintains only recent events in memory:

```typescript
const MAX_EVENTS = 1000;
const events: HookEvent[] = [];
```

Why? Because observability is about the NOW, not historical analysis:
- You want to see what's happening right now
- Old events can be analyzed from JSONL files if needed
- Memory stays bounded regardless of how long server runs

### Agent Session Tracking

One clever feature: the system tracks which agent is active:

```typescript
// Session-to-agent mapping
const agentSessions = new Map<string, string>();

// When Task tool spawns a subagent:
if (hookData.tool_name === 'Task' && hookData.tool_input?.subagent_type) {
  agentName = hookData.tool_input.subagent_type;
  setAgentForSession(sessionId, agentName);
}
```

This enables the dashboard to show "Intern is running" vs "Main agent is running" - crucial when you have multiple agents working in parallel.

---

## Why This Is Different

This sounds similar to just tailing log files, which you could do with `tail -f`. What makes this approach different?

Raw log tailing gives you text that scrolls by too fast to read. The Observability Server transforms raw events into a structured, filterable, real-time dashboard. You can see which agent made each call, filter by tool type, watch activity patterns over time, and compare agents side-by-side. It's the difference between watching raw network packets vs using Wireshark.

- Real-time WebSocket streaming with sub-second latency
- Agent identification and tracking across sessions
- Beautiful Vue 3 dashboard with swimlane visualization
- Filterable by agent, tool type, and time range
- Zero configuration - just start and use

---

## Installation

### Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Node.js 18+** (for Vite dev server)
- **Claude Code** (or compatible agent system)
- **kai-hook-system** pack installed
- **Write access** to `$PAI_DIR/`

---

### Pre-Installation: System Analysis

**IMPORTANT:** Before installing, verify the hook system is in place.

#### Step 0.1: Verify Hook System

```bash
# Check that kai-hook-system is installed
ls -la $PAI_DIR/hooks/
# Should show: security-validator.ts, initialize-session.ts, etc.

# Check that hooks are configured in Claude settings
grep -A 10 '"hooks"' ~/.claude/settings.json
# Should show PostToolUse hooks configured
```

#### Step 0.2: Check for Existing Observability

```bash
# Check if observability directory exists
if [ -d "$PAI_DIR/observability" ]; then
  echo "⚠️  Observability directory EXISTS"
  ls -la "$PAI_DIR/observability"
else
  echo "✓ No existing observability (clean install)"
fi
```

---

### Step 1: Create Directory Structure

```bash
# Create observability directories
mkdir -p $PAI_DIR/observability/apps/server/src
mkdir -p $PAI_DIR/observability/apps/client/src/components
mkdir -p $PAI_DIR/observability/apps/client/src/composables
mkdir -p $PAI_DIR/history/raw-outputs

# Create hooks lib directory if not exists
mkdir -p $PAI_DIR/hooks/lib

# Verify structure
ls -la $PAI_DIR/observability/
```

---

### Step 2: Create the Event Capture Hook

This hook captures ALL events and writes them to a daily JSONL file.

#### 2.1: Create metadata-extraction.ts

```typescript
// $PAI_DIR/hooks/lib/metadata-extraction.ts
// Extracts agent instance metadata from Task tool calls

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

  // Strategy 3: Extract parent session from prompt
  if (toolInput?.prompt && typeof toolInput.prompt === 'string') {
    const parentSessionMatch = toolInput.prompt.match(/\[PARENT_SESSION:\s*([^\]]+)\]/);
    if (parentSessionMatch) {
      result.parent_session_id = parentSessionMatch[1].trim();
    }

    const parentTaskMatch = toolInput.prompt.match(/\[PARENT_TASK:\s*([^\]]+)\]/);
    if (parentTaskMatch) {
      result.parent_task_id = parentTaskMatch[1].trim();
    }
  }

  // Strategy 4: Fallback to subagent_type
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
  if (metadata.parent_session_id) enrichedEvent.parent_session_id = metadata.parent_session_id;
  if (metadata.parent_task_id) enrichedEvent.parent_task_id = metadata.parent_task_id;

  return enrichedEvent;
}

/**
 * Check if a tool call is spawning a subagent
 */
export function isAgentSpawningCall(toolName: string, toolInput: any): boolean {
  return toolName === 'Task' && toolInput?.subagent_type !== undefined;
}
```

#### 2.2: Create capture-all-events.ts

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

  try {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return new Date().toISOString();
  }
}

function getEventsFilePath(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const now = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');

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
      return mappings[sessionId] || process.env.DA || 'main';
    }
  } catch {
    // Ignore errors
  }
  return process.env.DA || 'main';
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
  } catch {
    // Silently fail
  }
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

    // Update agent mapping based on event type
    if (hookData.tool_name === 'Task' && hookData.tool_input?.subagent_type) {
      agentName = hookData.tool_input.subagent_type;
      setAgentForSession(sessionId, agentName);
    } else if (eventType === 'SubagentStop' || eventType === 'Stop') {
      agentName = process.env.DA || 'main';
      setAgentForSession(sessionId, agentName);
    } else if (process.env.CLAUDE_CODE_AGENT) {
      agentName = process.env.CLAUDE_CODE_AGENT;
      setAgentForSession(sessionId, agentName);
    } else if (hookData.agent_type) {
      agentName = hookData.agent_type;
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

    // Enrich with agent instance metadata for Task calls
    if (isAgentSpawningCall(hookData.tool_name, hookData.tool_input)) {
      event = enrichEventWithAgentMetadata(event, hookData.tool_input, hookData.description);
    }

    // Append to events file
    const eventsFile = getEventsFilePath();
    const jsonLine = JSON.stringify(event) + '\n';
    appendFileSync(eventsFile, jsonLine, 'utf-8');

  } catch (error) {
    console.error('Event capture error:', error);
  }

  process.exit(0);
}

main();
```

---

### Step 3: Create the Server

#### 3.1: Create server package.json

```json
// $PAI_DIR/observability/apps/server/package.json
{
  "name": "pai-observability-server",
  "version": "1.0.0",
  "module": "src/index.ts",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.8.3"
  }
}
```

#### 3.2: Create server types.ts

```typescript
// $PAI_DIR/observability/apps/server/src/types.ts

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  agent_name?: string;
  hook_event_type: string;
  payload: Record<string, any>;
  summary?: string;
  timestamp?: number;
  todos?: TodoItem[];
  completedTodos?: TodoItem[];
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}
```

#### 3.3: Create file-ingest.ts

```typescript
// $PAI_DIR/observability/apps/server/src/file-ingest.ts
// File-based event streaming - watches JSONL files

import { watch, existsSync } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { HookEvent } from './types';

const MAX_EVENTS = 1000;
const events: HookEvent[] = [];
const filePositions = new Map<string, number>();
const watchedFiles = new Set<string>();
let onEventsReceived: ((events: HookEvent[]) => void) | null = null;
const agentSessions = new Map<string, string>();
const sessionTodos = new Map<string, any[]>();

function getTodayEventsFile(): string {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const now = new Date();
  const tz = process.env.TIME_ZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');

    const monthDir = join(paiDir, 'history', 'raw-outputs', `${year}-${month}`);
    return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
  } catch {
    // Fallback to UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return join(paiDir, 'history', 'raw-outputs', `${year}-${month}`, `${year}-${month}-${day}_all-events.jsonl`);
  }
}

function enrichEventWithAgentName(event: HookEvent): HookEvent {
  if (event.hook_event_type === 'UserPromptSubmit') {
    return { ...event, agent_name: 'User' };
  }

  const mainAgentName = process.env.DA || 'main';
  const subAgentTypes = ['artist', 'intern', 'engineer', 'pentester', 'architect', 'designer', 'qatester', 'researcher'];

  if (event.source_app && subAgentTypes.includes(event.source_app.toLowerCase())) {
    const capitalizedName = event.source_app.charAt(0).toUpperCase() + event.source_app.slice(1);
    return { ...event, agent_name: capitalizedName };
  }

  const agentName = agentSessions.get(event.session_id) || mainAgentName;
  return { ...event, agent_name: agentName };
}

function processTodoEvent(event: HookEvent): HookEvent[] {
  if (event.payload.tool_name !== 'TodoWrite') {
    return [event];
  }

  const currentTodos = event.payload.tool_input?.todos || [];
  const previousTodos = sessionTodos.get(event.session_id) || [];
  const completedTodos = [];

  for (const currentTodo of currentTodos) {
    if (currentTodo.status === 'completed') {
      const prevTodo = previousTodos.find((t: any) => t.content === currentTodo.content);
      if (!prevTodo || prevTodo.status !== 'completed') {
        completedTodos.push(currentTodo);
      }
    }
  }

  sessionTodos.set(event.session_id, currentTodos);
  const events: HookEvent[] = [event];

  for (const completedTodo of completedTodos) {
    const completionEvent: HookEvent = {
      ...event,
      id: event.id,
      hook_event_type: 'Completed',
      payload: { task: completedTodo.content },
      summary: undefined,
      timestamp: event.timestamp
    };
    events.push(completionEvent);
  }

  return events;
}

function readNewEvents(filePath: string): HookEvent[] {
  if (!existsSync(filePath)) return [];

  const lastPosition = filePositions.get(filePath) || 0;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const newContent = content.slice(lastPosition);
    filePositions.set(filePath, content.length);

    if (!newContent.trim()) return [];

    const lines = newContent.trim().split('\n');
    const newEvents: HookEvent[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        let event = JSON.parse(line);
        event.id = events.length + newEvents.length + 1;
        event = enrichEventWithAgentName(event);
        const processedEvents = processTodoEvent(event);

        for (let i = 0; i < processedEvents.length; i++) {
          processedEvents[i].id = events.length + newEvents.length + i + 1;
        }
        newEvents.push(...processedEvents);
      } catch (error) {
        console.error(`Failed to parse line: ${line.slice(0, 100)}...`, error);
      }
    }

    return newEvents;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

function storeEvents(newEvents: HookEvent[]): void {
  if (newEvents.length === 0) return;

  events.push(...newEvents);

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  console.log(`✅ Received ${newEvents.length} event(s) (${events.length} in memory)`);

  if (onEventsReceived) {
    onEventsReceived(newEvents);
  }
}

function loadAgentSessions(): void {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const sessionsFile = join(paiDir, 'agent-sessions.json');

  if (!existsSync(sessionsFile)) {
    console.log('⚠️  agent-sessions.json not found, agent names will use defaults');
    return;
  }

  try {
    const content = readFileSync(sessionsFile, 'utf-8');
    const data = JSON.parse(content);

    agentSessions.clear();
    Object.entries(data).forEach(([sessionId, agentName]) => {
      agentSessions.set(sessionId, agentName as string);
    });

    console.log(`✅ Loaded ${agentSessions.size} agent sessions`);
  } catch (error) {
    console.error('❌ Error loading agent-sessions.json:', error);
  }
}

function watchAgentSessions(): void {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');
  const sessionsFile = join(paiDir, 'agent-sessions.json');

  if (!existsSync(sessionsFile)) return;

  console.log('👀 Watching agent-sessions.json for changes');

  const watcher = watch(sessionsFile, (eventType) => {
    if (eventType === 'change') {
      console.log('🔄 agent-sessions.json changed, reloading...');
      loadAgentSessions();
    }
  });

  watcher.on('error', (error) => {
    console.error('❌ Error watching agent-sessions.json:', error);
  });
}

function watchFile(filePath: string): void {
  if (watchedFiles.has(filePath)) return;

  console.log(`👀 Watching: ${filePath}`);
  watchedFiles.add(filePath);

  // Position at END of file - only read NEW events
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8');
    filePositions.set(filePath, content.length);
    console.log(`📍 Positioned at end of file - only new events will be captured`);
  }

  const watcher = watch(filePath, (eventType) => {
    if (eventType === 'change') {
      const newEvents = readNewEvents(filePath);
      storeEvents(newEvents);
    }
  });

  watcher.on('error', (error) => {
    console.error(`Error watching ${filePath}:`, error);
    watchedFiles.delete(filePath);
  });
}

export function startFileIngestion(callback?: (events: HookEvent[]) => void): void {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.config', 'pai');

  console.log('🚀 Starting file-based event streaming (in-memory only)');
  console.log(`📂 Reading from ${paiDir}/history/raw-outputs/`);

  if (callback) {
    onEventsReceived = callback;
  }

  loadAgentSessions();
  watchAgentSessions();

  const todayFile = getTodayEventsFile();
  watchFile(todayFile);

  // Check for new day's file every hour
  setInterval(() => {
    const newTodayFile = getTodayEventsFile();
    if (!watchedFiles.has(newTodayFile)) {
      console.log('📅 New day detected, watching new file');
      watchFile(newTodayFile);
    }
  }, 60 * 60 * 1000);

  console.log('✅ File streaming started');
}

export function getRecentEvents(limit: number = 100): HookEvent[] {
  return events.slice(-limit).reverse();
}

export function getFilterOptions() {
  const sourceApps = new Set<string>();
  const sessionIds = new Set<string>();
  const hookEventTypes = new Set<string>();

  for (const event of events) {
    if (event.source_app) sourceApps.add(event.source_app);
    if (event.session_id) sessionIds.add(event.session_id);
    if (event.hook_event_type) hookEventTypes.add(event.hook_event_type);
  }

  return {
    source_apps: Array.from(sourceApps).sort(),
    session_ids: Array.from(sessionIds).slice(0, 100),
    hook_event_types: Array.from(hookEventTypes).sort()
  };
}
```

#### 3.4: Create index.ts (main server)

```typescript
// $PAI_DIR/observability/apps/server/src/index.ts
// HTTP + WebSocket server for observability dashboard

import { startFileIngestion, getRecentEvents, getFilterOptions } from './file-ingest';

const wsClients = new Set<any>();

// Start file-based ingestion with WebSocket broadcast callback
startFileIngestion((events) => {
  events.forEach(event => {
    const message = JSON.stringify({ type: 'event', data: event });
    wsClients.forEach(client => {
      try {
        client.send(message);
      } catch (err) {
        wsClients.delete(client);
      }
    });
  });
});

const server = Bun.serve({
  port: 4000,

  async fetch(req: Request) {
    const url = new URL(req.url);

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // GET /events/filter-options
    if (url.pathname === '/events/filter-options' && req.method === 'GET') {
      const options = getFilterOptions();
      return new Response(JSON.stringify(options), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // GET /events/recent
    if (url.pathname === '/events/recent' && req.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const events = getRecentEvents(limit);
      return new Response(JSON.stringify(events), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // GET /events/by-agent/:agentName
    if (url.pathname.startsWith('/events/by-agent/') && req.method === 'GET') {
      const agentName = decodeURIComponent(url.pathname.split('/')[3]);
      const limit = parseInt(url.searchParams.get('limit') || '100');

      if (!agentName) {
        return new Response(JSON.stringify({ error: 'Agent name is required' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      const allEvents = getRecentEvents(limit);
      const agentEvents = allEvents.filter(e => e.agent_name === agentName);

      return new Response(JSON.stringify(agentEvents), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // WebSocket upgrade
    if (url.pathname === '/stream') {
      const success = server.upgrade(req);
      if (success) {
        return undefined;
      }
    }

    return new Response('PAI Observability Server', {
      headers: { ...headers, 'Content-Type': 'text/plain' }
    });
  },

  websocket: {
    open(ws) {
      console.log('WebSocket client connected');
      wsClients.add(ws);

      const events = getRecentEvents(50);
      ws.send(JSON.stringify({ type: 'initial', data: events }));
    },

    message(ws, message) {
      console.log('Received message:', message);
    },

    close(ws) {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    },

    error(ws, error) {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    }
  }
});

console.log(`🚀 Server running on http://localhost:${server.port}`);
console.log(`📊 WebSocket endpoint: ws://localhost:${server.port}/stream`);
```

---

### Step 4: Create the Client

The client is a Vue 3 + Vite application. Due to its complexity, a simplified starter client is provided here.

#### 4.1: Create client package.json

```json
// $PAI_DIR/observability/apps/client/package.json
{
  "name": "pai-observability-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-vue-next": "^0.548.0",
    "vue": "^3.5.17"
  },
  "devDependencies": {
    "@types/node": "^22.11.2",
    "@vitejs/plugin-vue": "^6.0.0",
    "@vue/tsconfig": "^0.7.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.16",
    "typescript": "~5.8.3",
    "vite": "^7.0.4",
    "vue-tsc": "^2.2.12"
  }
}
```

#### 4.2: Create vite.config.ts

```typescript
// $PAI_DIR/observability/apps/client/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5172
  }
})
```

#### 4.3: Create index.html

```html
<!-- $PAI_DIR/observability/apps/client/index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PAI Observability</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

#### 4.4: Create src/main.ts

```typescript
// $PAI_DIR/observability/apps/client/src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
```

#### 4.5: Create src/style.css

```css
/* $PAI_DIR/observability/apps/client/src/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #1a1b26;
  --bg-secondary: #16161e;
  --text-primary: #c0caf5;
  --text-secondary: #565f89;
  --accent-blue: #7aa2f7;
  --accent-green: #9ece6a;
  --accent-red: #f7768e;
  --accent-yellow: #e0af68;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
}
```

#### 4.6: Create src/App.vue (Simplified Starter)

```vue
<!-- $PAI_DIR/observability/apps/client/src/App.vue -->
<template>
  <div class="min-h-screen bg-[var(--bg-primary)] p-6">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-[var(--accent-blue)]">
        🔭 PAI Observability
      </h1>
      <p class="text-[var(--text-secondary)]">
        {{ isConnected ? '🟢 Connected' : '🔴 Disconnected' }}
        · {{ events.length }} events
      </p>
    </header>

    <div class="space-y-2">
      <div
        v-for="event in events"
        :key="event.id"
        class="bg-[var(--bg-secondary)] rounded-lg p-4 border-l-4"
        :class="getBorderColor(event.hook_event_type)"
      >
        <div class="flex justify-between items-start">
          <div>
            <span class="font-mono text-sm text-[var(--accent-blue)]">
              {{ event.agent_name || event.source_app }}
            </span>
            <span class="mx-2 text-[var(--text-secondary)]">·</span>
            <span class="text-sm">{{ event.hook_event_type }}</span>
          </div>
          <span class="text-xs text-[var(--text-secondary)]">
            {{ formatTime(event.timestamp) }}
          </span>
        </div>

        <div v-if="event.payload?.tool_name" class="mt-2">
          <span class="text-[var(--accent-green)]">
            {{ event.payload.tool_name }}
          </span>
          <span v-if="event.payload?.tool_input?.command" class="ml-2 font-mono text-xs text-[var(--text-secondary)]">
            {{ truncate(event.payload.tool_input.command, 60) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="events.length === 0" class="text-center text-[var(--text-secondary)] py-12">
      No events yet. Start using Claude Code to see activity here.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface HookEvent {
  id: number
  source_app: string
  agent_name?: string
  hook_event_type: string
  payload: Record<string, any>
  timestamp?: number
}

const events = ref<HookEvent[]>([])
const isConnected = ref(false)
let ws: WebSocket | null = null

function connect() {
  ws = new WebSocket('ws://localhost:4000/stream')

  ws.onopen = () => {
    isConnected.value = true
    console.log('Connected to observability server')
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'initial') {
      events.value = data.data
    } else if (data.type === 'event') {
      events.value.unshift(data.data)
      if (events.value.length > 100) {
        events.value.pop()
      }
    }
  }

  ws.onclose = () => {
    isConnected.value = false
    console.log('Disconnected from observability server')
    // Reconnect after 3 seconds
    setTimeout(connect, 3000)
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
}

function getBorderColor(eventType: string): string {
  const colors: Record<string, string> = {
    'PreToolUse': 'border-[var(--accent-blue)]',
    'PostToolUse': 'border-[var(--accent-green)]',
    'Stop': 'border-[var(--accent-yellow)]',
    'Completed': 'border-[var(--accent-green)]',
    'UserPromptSubmit': 'border-[var(--text-secondary)]',
  }
  return colors[eventType] || 'border-[var(--text-secondary)]'
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return str.slice(0, len) + '...'
}

onMounted(() => {
  connect()
})

onUnmounted(() => {
  ws?.close()
})
</script>
```

#### 4.7: Create tailwind.config.js

```javascript
// $PAI_DIR/observability/apps/client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

#### 4.8: Create postcss.config.js

```javascript
// $PAI_DIR/observability/apps/client/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

### Step 5: Create the Management Script

```bash
#!/bin/bash
# $PAI_DIR/observability/manage.sh
# Observability Dashboard Manager

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure bun is in PATH
# Only add Homebrew path if it exists (macOS-specific)
if [ -d "/opt/homebrew/bin" ]; then
  export PATH="$HOME/.bun/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
else
  export PATH="$HOME/.bun/bin:/usr/local/bin:$PATH"
fi

case "${1:-}" in
    start)
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "❌ Already running. Use: manage.sh restart"
            exit 1
        fi

        # Start server
        cd "$SCRIPT_DIR/apps/server"
        bun run dev >/dev/null 2>&1 &
        SERVER_PID=$!

        # Wait for server
        for i in {1..10}; do
            curl -s http://localhost:4000/health >/dev/null 2>&1 && break
            sleep 1
        done

        # Start client
        cd "$SCRIPT_DIR/apps/client"
        bun run dev >/dev/null 2>&1 &
        CLIENT_PID=$!

        # Wait for client
        for i in {1..10}; do
            curl -s http://localhost:5172 >/dev/null 2>&1 && break
            sleep 1
        done

        echo "✅ Observability running at http://localhost:5172"

        cleanup() {
            kill $SERVER_PID $CLIENT_PID 2>/dev/null
            exit 0
        }
        trap cleanup INT
        wait $SERVER_PID $CLIENT_PID
        ;;

    stop)
        SERVER_PID=$(lsof -ti :4000 2>/dev/null)
        CLIENT_PID=$(lsof -ti :5172 2>/dev/null)

        [ -n "$SERVER_PID" ] && kill -9 $SERVER_PID 2>/dev/null
        [ -n "$CLIENT_PID" ] && kill -9 $CLIENT_PID 2>/dev/null

        pkill -9 -f "observability/apps/(server|client)" 2>/dev/null

        sleep 0.5
        echo "✅ Observability stopped"
        ;;

    restart)
        echo "🔄 Restarting..."
        "$0" stop 2>/dev/null
        sleep 2
        exec "$0" start
        ;;

    status)
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "✅ Running at http://localhost:5172"
        else
            echo "❌ Not running"
        fi
        ;;

    start-detached)
        if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo "❌ Already running. Use: manage.sh restart"
            exit 1
        fi

        cd "$SCRIPT_DIR/apps/server"
        nohup bun run dev >/dev/null 2>&1 &
        disown

        for i in {1..10}; do
            curl -s http://localhost:4000/health >/dev/null 2>&1 && break
            sleep 1
        done

        cd "$SCRIPT_DIR/apps/client"
        nohup bun run dev >/dev/null 2>&1 &
        disown

        for i in {1..10}; do
            curl -s http://localhost:5172 >/dev/null 2>&1 && break
            sleep 1
        done

        echo "✅ Observability running at http://localhost:5172"
        ;;

    *)
        echo "Usage: manage.sh {start|stop|restart|status|start-detached}"
        exit 1
        ;;
esac
```

Make it executable:
```bash
chmod +x $PAI_DIR/observability/manage.sh
```

---

### Step 6: Register the Capture Hook

Add the capture hook to your Claude settings.json:

**File location:** `~/.claude/settings.json`

Add to the hooks section:

```json
{
  "hooks": {
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
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type Stop"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bun run $PAI_DIR/hooks/capture-all-events.ts --event-type SubagentStop"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
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

---

### Step 7: Install Dependencies

```bash
# Install server dependencies
cd $PAI_DIR/observability/apps/server
bun install

# Install client dependencies
cd $PAI_DIR/observability/apps/client
bun install
```

---

### Step 8: Verify Installation

```bash
# 1. Start observability
$PAI_DIR/observability/manage.sh start

# 2. Open browser to http://localhost:5172

# 3. In another terminal, use Claude Code - events should stream to dashboard

# 4. Check status
$PAI_DIR/observability/manage.sh status

# 5. Stop when done
$PAI_DIR/observability/manage.sh stop
```

**Success indicators:**
- Dashboard loads at http://localhost:5172
- Events appear in real-time as you use Claude Code
- Agent names show correctly (main agent, interns, etc.)
- WebSocket connection stays stable

---

## Example Usage

### Example 1: Basic Monitoring

```
User: "start observability"

→ $PAI_DIR/observability/manage.sh start
→ Opens http://localhost:5172 in browser
→ Events stream as you work
```

### Example 2: Watching Agent Spawns

```
User: (Working with multiple agents)

Dashboard shows:
- Main agent: Reading files, running commands
- Intern-1: Spawned, researching topic A
- Intern-2: Spawned, researching topic B
- All activity visible in real-time
```

### Example 3: Debugging a Workflow

```
User: "Something's wrong with my workflow"

→ Open observability dashboard
→ Watch events in timeline
→ See where the sequence differs from expected
→ Identify which tool call failed or returned unexpected output
```

---

## Configuration

**Environment variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `PAI_DIR` | `~/.config/pai` | Root PAI directory |
| `TIME_ZONE` | System default | Timestamp timezone |
| `DA` | `main` | Default agent name |

**Ports:**

| Service | Port | Purpose |
|---------|------|---------|
| Server | 4000 | HTTP API + WebSocket |
| Client | 5172 | Dashboard UI |

---

## Customization

### Recommended Customization

**Customize the Dashboard for Your Workflow**

The default dashboard shows all events in a simple timeline. Customize it to highlight what matters most to your work.

**What to Customize:** `$PAI_DIR/observability/apps/client/src/App.vue`

**Why:** Different developers care about different things. Security-focused work might want to highlight Bash commands. Research workflows might want to emphasize agent spawns. A customized dashboard surfaces the information you need.

**Process:**

1. **Identify Your Key Events**
   - What events do you care about most?
   - Which agents do you want prominently displayed?
   - What information should be visible at a glance?

2. **Customize Event Colors**
   Edit the `getBorderColor` function:
   ```typescript
   function getBorderColor(eventType: string): string {
     const colors: Record<string, string> = {
       'PreToolUse': 'border-[var(--accent-blue)]',
       'PostToolUse': 'border-[var(--accent-green)]',
       'Stop': 'border-[var(--accent-yellow)]',
       'Completed': 'border-[var(--accent-green)]',
       // Add your custom highlights:
       'SecurityWarning': 'border-red-500',
       'AgentSpawn': 'border-purple-500',
     }
     return colors[eventType] || 'border-[var(--text-secondary)]'
   }
   ```

3. **Add Custom Filtering**
   Modify the template to add agent or tool filters:
   ```vue
   <select v-model="selectedAgent" class="...">
     <option value="">All Agents</option>
     <option v-for="agent in agents" :value="agent">{{ agent }}</option>
   </select>
   ```

**Expected Outcome:** A dashboard that immediately shows you what you care about.

---

### Optional Customization

| Customization | File | Impact |
|---------------|------|--------|
| **Theme Colors** | `style.css` | Change the color scheme |
| **Event Limit** | `file-ingest.ts` | Adjust MAX_EVENTS for memory usage |
| **Ports** | `manage.sh`, `vite.config.ts`, `index.ts` | Change server/client ports |
| **Agent Name Mapping** | `file-ingest.ts` | Add recognition for custom agent types |

**Example: Change Theme Colors**

Edit `$PAI_DIR/observability/apps/client/src/style.css`:

```css
:root {
  --bg-primary: #0d1117;      /* Darker background */
  --accent-blue: #58a6ff;      /* GitHub-style blue */
  --accent-green: #3fb950;     /* GitHub-style green */
}
```

**Example: Add Custom Agent Recognition**

Edit `file-ingest.ts` to recognize your custom agents:

```typescript
const subAgentTypes = [
  'artist', 'intern', 'engineer', 'pentester', 'architect',
  // Add your custom agent types:
  'security-researcher', 'documentation-writer', 'code-reviewer'
];
```

---

## Credits

- **Original concept**: Daniel Miessler - developed as part of Kai personal AI infrastructure
- **Contributors**: The PAI community
- **Underlying systems**: Bun.js, Vue 3, Tailwind CSS

## Related Work

- **kai-hook-system** - Required dependency - provides the event capture hooks
- **Grafana/Prometheus** - Enterprise monitoring inspiration
- **Datadog APM** - Distributed tracing concepts

## Works Well With

- **kai-hook-system** - Required - captures the events that this pack displays
- **kai-core-install** - Skills show their activity in the dashboard
- **kai-voice-system** - Voice notifications can be triggered from events

## Recommended

- **kai-history-system** - Permanent storage of events for later analysis

## Relationships

### Parent Of
*None*

### Child Of
- **kai-hook-system** - Depends on hooks for event capture

### Sibling Of
- **kai-history-system** - Both consume hook events, different purposes

### Part Of Collection
**Kai Core Bundle** - One of the foundational packs that together create the complete Kai personal AI infrastructure.

---

## Changelog

### 1.0.0 - 2025-12-29
- Initial release
- File-based event streaming architecture
- Bun HTTP + WebSocket server
- Vue 3 starter dashboard
- Multi-agent tracking with session mapping
- Management script for start/stop/restart
- Complete hook integration for event capture

