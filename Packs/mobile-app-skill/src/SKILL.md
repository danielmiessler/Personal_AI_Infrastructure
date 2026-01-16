---
name: MobileApp
description: |
  PAI Mobile App - Unified mobile interface for Claude Code chat, file browsing, and Obsidian knowledge base access.

  A self-hosted web application accessible from iPhone/iPad via Tailscale.

  ## Quick Start

  ```bash
  cd ~/.claude/Skills/MobileApp
  ./manage.sh install         # Install dependencies
  ./manage.sh build           # Build client
  ./manage.sh service install # Enable auto-restart (recommended)
  ```

  ## Access

  - Local: http://localhost:5050
  - Via Tailscale: http://<tailscale-ip>:5050

  ## Auto-Restart (Production)

  The server can be managed by launchd for automatic restart on crash/reboot:

  ```bash
  ./manage.sh service install   # Enable auto-restart
  ./manage.sh service uninstall # Disable auto-restart
  ./manage.sh service status    # Check service status
  ./manage.sh service logs      # View launchd logs
  ```

  ## Development

  ```bash
  ./manage.sh dev  # Hot reload (auto-pauses launchd service)
  ```

  Dev mode automatically:
  - Pauses the launchd auto-restart service
  - Runs server + client with hot reload
  - Resumes auto-restart when you Ctrl+C

  ## Features

  - **Chat**: Claude Code interaction with streaming responses
  - **Files**: Full home directory browser with file preview
  - **Knowledge**: Obsidian vault viewer with wiki-link support

  ## Architecture

  - **Server**: Bun + TypeScript (port 5050)
  - **Client**: Vue.js + Tailwind CSS (PWA)
  - **API**: REST + WebSocket for real-time chat
---

# PAI Mobile App

Unified mobile interface for Personal AI Infrastructure.

## Commands

| Command | Description |
|---------|-------------|
| `./manage.sh start` | Start production server (manual) |
| `./manage.sh stop` | Stop server |
| `./manage.sh restart` | Restart server |
| `./manage.sh dev` | Development mode with hot reload (pauses auto-restart) |
| `./manage.sh build` | Build client for production |
| `./manage.sh status` | Check server + service status |
| `./manage.sh install` | Install dependencies |
| `./manage.sh service install` | Enable auto-restart on crash/reboot |
| `./manage.sh service uninstall` | Disable auto-restart |
| `./manage.sh service status` | Show launchd service status |
| `./manage.sh service logs` | View launchd logs |

## API Endpoints

### Files
- `GET /api/files/list?path=<path>` - List directory
- `GET /api/files/read?path=<path>` - Read file content
- `GET /api/files/stat?path=<path>` - Get file info
- `GET /api/files/search?q=<query>` - Search files

### Knowledge
- `GET /api/knowledge/notes` - List recent notes
- `GET /api/knowledge/note?path=<path>` - Get note with wiki-links
- `GET /api/knowledge/search?q=<query>` - Search vault

### Chat
- `WS /chat` - WebSocket for real-time Claude Code streaming

## Mobile Setup

1. Enable auto-restart: `./manage.sh service install`
2. On iPhone, open Safari and navigate to your Mac's Tailscale IP:5050
3. Tap Share → Add to Home Screen
4. Open the installed app for native-like experience
