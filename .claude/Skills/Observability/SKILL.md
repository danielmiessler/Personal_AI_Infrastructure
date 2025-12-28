---
name: Observability
description: Real-time monitoring dashboard for PAI multi-agent activity. USE WHEN user says 'start observability', 'stop dashboard', 'restart observability', 'monitor agents', 'show agent activity', or needs to debug multi-agent workflows.
---

# Agent Observability Dashboard

Real-time monitoring of PAI multi-agent activity with WebSocket streaming.

## Quick Start

### Option 1: Docker (Recommended)

**Prerequisites:** Docker Desktop or OrbStack installed

```bash
# Start using Docker containers
~/.claude/Skills/observability/manage.sh docker-start

# Stop Docker containers
~/.claude/Skills/observability/manage.sh docker-stop

# Restart containers
~/.claude/Skills/observability/manage.sh docker-restart

# Check container status
~/.claude/Skills/observability/manage.sh docker-status

# View logs (live tail)
~/.claude/Skills/observability/manage.sh docker-logs

# View logs for specific service
~/.claude/Skills/observability/manage.sh docker-logs server
~/.claude/Skills/observability/manage.sh docker-logs client

# Rebuild images after code changes
~/.claude/Skills/observability/manage.sh docker-build
```

**Benefits of Docker:**
- ✅ Automatic process lifecycle management
- ✅ Health checks with auto-restart on failure
- ✅ Structured logging (no more /dev/null)
- ✅ Clean isolation and resource management
- ✅ No orphaned processes
- ✅ Consistent environment across machines

### Option 2: Shell Scripts (Legacy)

```bash
# Start server and dashboard
~/.claude/Skills/observability/manage.sh start

# Stop everything
~/.claude/Skills/observability/manage.sh stop

# Restart both
~/.claude/Skills/observability/manage.sh restart

# Check status
~/.claude/Skills/observability/manage.sh status
```

## Access Points

- **Dashboard UI**: http://localhost:5172
- **Server API**: http://localhost:4000
- **WebSocket Stream**: ws://localhost:4000/stream

## What It Monitors

### Real-Time Tracking
- Agent session starts/ends
- Tool calls across all agents
- Hook event execution
- Session timelines and traces
- WebSocket live updates

### Data Sources
- **Primary**: `~/.claude/History/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`
- **Format**: JSONL with structured event data
- **Hooks**: Events logged automatically by PAI hook system

## Architecture

**Stack:**
- Server: Bun + Express + TypeScript
- Client: Vite + Vue + TypeScript
- Storage: In-memory streaming (no database)
- Protocol: WebSocket for real-time updates

**Key Features:**
- Watch filesystem with automatic reload
- Tail-follow for today's event file
- Cache events in-memory
- Broadcast WebSocket to all clients
- No persistence (fresh start each launch)

## When to Activate This Skill

- "Start observability"
- "Stop the dashboard"
- "Restart observability"
- "Monitor agents"
- "Show agent activity"
- "Observability status"
- "Debug agent workflow"

## Examples

**Example 1: Start monitoring agents**
```
User: "start observability"
→ Launches server on port 4000
→ Starts dashboard on port 5172
→ Opens browser to live agent activity view
```

**Example 2: Debug a stuck workflow**
```
User: "something's weird with my agents, show me what's happening"
→ Opens observability dashboard
→ Shows real-time tool calls across all agents
→ Reveals which agent is blocked or looping
```

**Example 3: Check dashboard status**
```
User: "is observability running?"
→ Runs manage.sh status
→ Reports server and client running state
→ Shows access URLs if active
```

## Development

### Server
```bash
cd ~/.claude/Skills/observability/apps/server
bun install
bun run dev
```

### Client
```bash
cd ~/.claude/Skills/observability/apps/client
bun install
bun run dev
```

## Deployment Options

### Docker Deployment

The observability system can be deployed using Docker for improved reliability and management.

**Architecture:**
- Server container: Bun runtime with health checks
- Client container: Multi-stage build (Vite build → nginx serve)
- Networking: Bridge network for inter-container communication
- Volumes: Event files and .env mounted read-only

**Health Checks:**
- Server: Polls `/events/filter-options` endpoint
- Client: Polls root URL
- Auto-restart: Services automatically restart on failure
- Startup grace period: 10-15 seconds

**Resource Requirements:**
- Server: ~50MB RAM, minimal CPU
- Client: ~20MB RAM (after build), minimal CPU
- Disk: ~200MB for images

### Shell Script Deployment

Traditional background process deployment using Bun directly.

**Pros:**
- No Docker dependency
- Simpler setup for development
- Direct access to source code

**Cons:**
- Manual process management
- No automatic restart on failure
- Logs redirected to /dev/null
- Process can become orphaned

## Troubleshooting

### Dashboard not loading (Shell Script Mode)
- Check server is running: `curl http://localhost:4000/events/filter-options`
- Check client is running: `curl http://localhost:5172`
- Restart: `./manage.sh restart`

### Dashboard not loading (Docker Mode)
- Check container status: `./manage.sh docker-status`
- View logs: `./manage.sh docker-logs`
- Check health: `docker compose ps` (should show "healthy")
- Restart: `./manage.sh docker-restart`

### No events showing
- Verify events file exists: `~/.claude/History/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`
- Check hooks are configured in `~/.claude/settings.json`
- Try triggering an event (use any tool or agent)
- Check server logs: `./manage.sh docker-logs server` (Docker) or check console output (shell script)

### Port conflicts
- Server uses: 4000
- Client uses: 5172
- Check nothing else is using these ports: `lsof -i :4000` and `lsof -i :5172`
- Docker: Stop containers with `./manage.sh docker-stop`
- Shell: Stop processes with `./manage.sh stop`

## Files

```
~/.claude/Skills/observability/
├── SKILL.md                          # This file
├── manage.sh                         # Control script (shell + Docker modes)
├── docker-compose.yml                # Docker orchestration
├── apps/
│   ├── server/                       # Backend (Bun + Express)
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── Dockerfile                # Server container image
│   └── client/                       # Frontend (Vite + Vue)
│       ├── src/
│       ├── package.json
│       ├── vite.config.ts
│       └── Dockerfile                # Client container image (multi-stage)
└── scripts/                          # Utility scripts
```

## Key Principles

1. **Real-time** - Events stream as they happen
2. **Ephemeral** - No persistence, in-memory only
3. **Simple** - No database, no configuration
4. **Transparent** - Full visibility into agent activity
5. **Unobtrusive** - Doesn't interfere with PAI operation

## Hook Integration

For the observability dashboard to receive events, configure your PAI hooks to log to:
`~/.claude/History/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`

The `capture-all-events.ts` hook in `~/.claude/Hooks/` handles this automatically.
