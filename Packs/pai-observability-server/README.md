---
name: Kai Observability Server
pack-id: danielmiessler-kai-observability-server-core-v1.0.0
version: 1.0.0
author: danielmiessler
description: Real-time multi-agent activity monitoring dashboard with WebSocket streaming
type: feature
purpose-type: [observability, monitoring, development, debugging]
platform: claude-code
dependencies: [kai-hook-system]
keywords: [observability, dashboard, monitoring, agents, websocket, streaming, events, debugging, visualization, real-time]
---

# Kai Observability Server

> Real-time multi-agent activity monitoring dashboard - see exactly what your AI agents are doing as they work

## What This Pack Does

The Observability Server streams every tool call, hook event, and agent action to a beautiful dashboard:

- **WebSocket Streaming**: Events appear instantly as they happen
- **Multi-Agent Tracking**: See activity across all agents (main, interns, researchers, etc.)
- **Event Timeline**: Chronological view of all operations
- **Agent Swim Lanes**: Compare activity between multiple agents
- **Zero Configuration**: Just start the server and go

## Architecture

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

## Data Flow

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

## Design Principles

1. **No Database**: Events stream from files directly - no persistence overhead
2. **Fire and Forget**: Hook writes and exits fast - never blocks Claude Code
3. **Fresh Start**: Each server launch starts clean - no stale state
4. **In-Memory Only**: Recent events cached in memory, not stored in DB
5. **Graceful Degradation**: Dashboard down? Hooks still log. Server restarts? Just reload.

## Why File-Based Streaming?

**Naive approach:** Send events directly to a server via HTTP
- Complex: Need error handling, retries, connection management
- Fragile: Server down = events lost
- Blocking: Network latency affects hook performance

**File-based approach:** Write to local file, server watches and streams
- Simple: Just append to a file (atomic, fast, reliable)
- Robust: File persists even if server is down
- Non-blocking: File writes are fast, hook exits immediately
- Portable: JSONL files can be processed by any tool

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| WebSocket server | `observability/apps/server/src/index.ts` | HTTP API + WebSocket streaming |
| File ingestion | `observability/apps/server/src/file-ingest.ts` | Watch JSONL and stream events |
| Type definitions | `observability/apps/server/src/types.ts` | TypeScript interfaces |
| Vue dashboard | `observability/apps/client/src/App.vue` | Real-time monitoring UI |
| Event capture hook | `hooks/capture-all-events.ts` | Capture all events to JSONL |
| Metadata extraction | `hooks/lib/metadata-extraction.ts` | Agent instance tracking |
| Management script | `observability/manage.sh` | Start/stop/restart control |

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

## Dependencies

- **kai-hook-system** (required) - Provides the hook infrastructure
- **Bun runtime** - For TypeScript execution
- **Node.js 18+** - For Vite dev server

## Usage

```bash
# Start observability
$PAI_DIR/observability/manage.sh start

# Check status
$PAI_DIR/observability/manage.sh status

# Stop
$PAI_DIR/observability/manage.sh stop

# Restart
$PAI_DIR/observability/manage.sh restart

# Start detached (background)
$PAI_DIR/observability/manage.sh start-detached
```

Open http://localhost:5172 to view the dashboard.

## Related Packs

- **kai-hook-system** - Required dependency
- **kai-history-system** - Permanent storage of events

## Changelog

### 1.0.0 - Initial Release
- File-based event streaming architecture
- Bun HTTP + WebSocket server
- Vue 3 dashboard
- Multi-agent tracking with session mapping
- Management script for start/stop/restart
