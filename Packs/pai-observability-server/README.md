---
name: PAI Observability Server
pack-id: danielmiessler-pai-observability-server-core-v2.3.0
version: 2.3.0
author: danielmiessler
description: Real-time multi-agent activity monitoring dashboard with WebSocket streaming, task tracking, and MenuBar app
type: feature
purpose-type: [observability, monitoring, development, debugging]
platform: claude-code
dependencies: [pai-hook-system]
keywords: [observability, dashboard, monitoring, agents, websocket, streaming, events, debugging, visualization, real-time, task-tracking, menubar]
---

<p align="center">
  <img src="../icons/pai-observability-server-v2.png" alt="PAI Observability Server" width="256">
</p>

# PAI Observability Server

> Real-time multi-agent activity monitoring dashboard - see exactly what your AI agents are doing as they work

> **Installation:** This pack is designed for AI-assisted installation. Give this directory to your AI and ask it to install using the wizard in `INSTALL.md`. The installation dynamically adapts to your system state. See [AI-First Installation Philosophy](../../README.md#ai-first-installation-philosophy) for details.

---

## What This Pack Does

The Observability Server streams every tool call, hook event, and agent action to a beautiful dashboard:

- **WebSocket Streaming**: Events appear instantly as they happen
- **Multi-Agent Tracking**: See activity across all agents (main, interns, researchers, etc.)
- **Event Timeline**: Chronological view of all operations
- **Agent Swim Lanes**: Compare activity between multiple agents
- **Task Monitoring**: Background task tracking and status
- **MenuBar App**: macOS native menu bar control (v2.3+)
- **Zero Configuration**: Just start the server and go

## Architecture

```
$PAI_DIR/
├── observability/                    # Observability infrastructure
│   ├── manage.sh                     # Control script (start/stop/restart)
│   ├── MenuBarApp/                   # macOS menu bar application
│   │   ├── ObservabilityApp.swift    # Native Swift app source
│   │   ├── build.sh                  # Build script
│   │   └── Observability.app/        # Compiled app bundle
│   ├── Tools/
│   │   └── ManageServer.ts           # TypeScript server management tool
│   ├── scripts/
│   │   ├── reset-system.sh           # Reset observability state
│   │   ├── test-system.sh            # System test suite
│   │   └── start-agent-observability-dashboard.sh
│   └── apps/
│       ├── server/                   # Backend (Bun + TypeScript)
│       │   ├── src/
│       │   │   ├── index.ts          # HTTP + WebSocket server
│       │   │   ├── file-ingest.ts    # JSONL file watcher
│       │   │   ├── task-watcher.ts   # Background task monitoring
│       │   │   ├── db.ts             # In-memory event database
│       │   │   ├── theme.ts          # Dashboard theme definitions
│       │   │   └── types.ts          # TypeScript interfaces
│       │   └── package.json
│       └── client/                   # Frontend (Vue 3 + Vite)
│           ├── src/
│           │   ├── App.vue           # Main dashboard
│           │   ├── components/       # UI components (15+)
│           │   ├── composables/      # Vue composition utilities
│           │   ├── styles/           # CSS themes and layouts
│           │   ├── utils/            # Helper utilities
│           │   └── types/            # TypeScript types
│           └── package.json
├── hooks/
│   ├── AgentOutputCapture.hook.ts    # Hook that logs all events
│   └── lib/
│       ├── metadata-extraction.ts    # Agent metadata extraction
│       └── observability.ts          # Observability utilities
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
│  │          AgentOutputCapture.hook.ts (PostToolUse hook)            │   │
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
| WebSocket server | `src/Observability/apps/server/src/index.ts` | HTTP API + WebSocket streaming |
| File ingestion | `src/Observability/apps/server/src/file-ingest.ts` | Watch JSONL and stream events |
| Task watcher | `src/Observability/apps/server/src/task-watcher.ts` | Background task monitoring |
| Theme system | `src/Observability/apps/server/src/theme.ts` | Dashboard theme definitions |
| In-memory DB | `src/Observability/apps/server/src/db.ts` | Event storage and queries |
| Type definitions | `src/Observability/apps/server/src/types.ts` | TypeScript interfaces |
| Vue dashboard | `src/Observability/apps/client/src/App.vue` | Real-time monitoring UI |
| UI components | `src/Observability/apps/client/src/components/` | 15+ dashboard components |
| Vue composables | `src/Observability/apps/client/src/composables/` | Reusable composition utilities |
| Event capture hook | `src/hooks/AgentOutputCapture.hook.ts` | Capture all events to JSONL |
| Metadata extraction | `src/hooks/lib/metadata-extraction.ts` | Agent instance tracking |
| Observability lib | `src/hooks/lib/observability.ts` | Observability utilities |
| Management script | `src/Observability/manage.sh` | Start/stop/restart control |
| MenuBar app | `src/Observability/MenuBarApp/` | macOS native menu bar control |
| Server tool | `src/Observability/Tools/ManageServer.ts` | TypeScript server management |

## Configuration

**Environment variables:**

| Variable | Default | Purpose |
|----------|---------|---------|
| `PAI_DIR` | `~/.claude` | Root PAI directory |
| `TIME_ZONE` | System default | Timestamp timezone |
| `DA` | `main` | Default agent name |

**Ports:**

| Service | Port | Purpose |
|---------|------|---------|
| Server | 4000 | HTTP API + WebSocket |
| Client | 5172 | Dashboard UI |

## Dependencies

- **pai-hook-system** (required) - Provides the hook infrastructure
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

- **pai-hook-system** - Required dependency
- **pai-history-system** - Permanent storage of events

## Changelog

### 2.3.0 - January 2026
- macOS MenuBar app for quick server control
- Task watcher for background task monitoring
- 15+ Vue dashboard components (swim lanes, charts, widgets)
- Advanced metrics composables with chart data utilities
- Theme system with multiple built-in themes
- HITL (Human-in-the-Loop) notification support
- Remote agent dashboard component
- Event search and filtering capabilities
- Toast notifications system
- Chat transcript modal view
- Live pulse chart visualization
- Intensity bar component
- Custom fonts and typography
- Utility scripts for system reset and testing

### 1.0.0 - Initial Release
- File-based event streaming architecture
- Bun HTTP + WebSocket server
- Vue 3 dashboard
- Multi-agent tracking with session mapping
- Management script for start/stop/restart
