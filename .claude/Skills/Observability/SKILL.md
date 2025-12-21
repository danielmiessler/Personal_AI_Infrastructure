---
name: Observability
description: Real-time monitoring dashboard for PAI multi-agent activity. USE WHEN user says 'start observability', 'stop dashboard', 'restart observability', 'monitor agents', 'show agent activity', or needs to debug multi-agent workflows.
---

# Agent Observability Dashboard

Real-time monitoring of PAI multi-agent activity with WebSocket streaming.

## Quick Start

```bash
# Start server and dashboard
~/.claude/Skills/Observability/manage.sh start

# Stop everything
~/.claude/Skills/Observability/manage.sh stop

# Restart both
~/.claude/Skills/Observability/manage.sh restart

# Check status
~/.claude/Skills/Observability/manage.sh status
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
cd ~/.claude/Skills/Observability/apps/server
bun install
bun run dev
```

### Client
```bash
cd ~/.claude/Skills/Observability/apps/client
bun install
bun run dev
```

## Troubleshooting

### Dashboard not loading
- Check server is running: `curl http://localhost:4000/health`
- Check client is running: `curl http://localhost:5172`
- Restart: `./manage.sh restart`

### No events showing
- Verify events file exists: `~/.claude/History/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl`
- Check hooks are configured in `~/.claude/settings.json`
- Try triggering an event (use any tool or agent)

### Port conflicts
- Server uses: 4000
- Client uses: 5172
- Check nothing else is using these ports

## Files

```
~/.claude/Skills/Observability/
├── SKILL.md                          # This file
├── manage.sh                         # Control script
├── apps/
│   ├── server/                       # Backend (Bun + Express)
│   │   ├── src/index.ts
│   │   └── package.json
│   └── client/                       # Frontend (Vite + Vue)
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
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
