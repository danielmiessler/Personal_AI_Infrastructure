---
name: Mobile App Skill
version: 1.0.0
type: skill
platform: claude-code
description: Unified mobile interface for Claude Code chat, file browsing, and Obsidian knowledge base access
author: Rob Taylor
license: MIT
---

# Mobile App Skill

A self-hosted Progressive Web App (PWA) that provides mobile access to Claude Code, file system browsing, and Obsidian vault viewing from iPhone/iPad.

## What's Included

| Component | Description |
|-----------|-------------|
| `src/SKILL.md` | Skill routing and command documentation |
| `src/manage.sh` | Service management CLI tool |
| `src/service-wrapper.sh` | Launchd service wrapper for auto-restart |
| `src/apps/server/` | Bun + TypeScript backend server (port 5050) |
| `src/apps/client/` | Vue.js + Tailwind CSS PWA frontend |
| `src/scripts/` | Icon generation and build utilities |

## The Problem

**Mobile AI Interaction is Fragmented**: Using Claude Code from mobile devices presents several challenges:

1. **No Native Mobile Access** - Claude Code CLI requires desktop terminal access
2. **File System Isolation** - No mobile-friendly way to browse home directory files
3. **Knowledge Base Disconnection** - Obsidian vaults are inaccessible from mobile devices
4. **Context Switching Overhead** - Need to SSH or remote desktop for simple queries
5. **Poor Mobile UX** - Terminal interfaces don't translate to touch interfaces

When away from desk, users lose access to their AI assistant, project files, and personal knowledge base—severely limiting productivity during commutes, meetings, or travel.

## The Solution

The Mobile App Skill provides a **unified PWA** that connects mobile devices to your Personal AI Infrastructure:

```
iPhone/iPad (Safari) → Tailscale VPN → Mac (localhost:5050)
                                        ↓
                            ┌───────────┴────────────┐
                            │   Mobile App Server    │
                            │   (Bun + TypeScript)   │
                            └───────────┬────────────┘
                                        ↓
                ┌───────────────────────┼───────────────────────┐
                ↓                       ↓                       ↓
        ┌───────────────┐      ┌────────────────┐     ┌──────────────┐
        │  Claude Code  │      │  File System   │     │  Obsidian    │
        │   WebSocket   │      │   REST API     │     │  Vault API   │
        └───────────────┘      └────────────────┘     └──────────────┘
```

### Key Innovations

1. **PWA Installation** - Add to Home Screen for app-like experience
2. **Real-Time Streaming** - WebSocket integration for live Claude responses
3. **Context-Aware File Browser** - Navigate home directory with inline previews
4. **Wiki-Link Resolution** - Obsidian notes with working internal links
5. **Auto-Restart Service** - Launchd integration for crash recovery and boot persistence

## Architecture

### Server Stack
- **Runtime**: Bun (fast JavaScript/TypeScript runtime)
- **Server**: Native Bun HTTP server with WebSocket support
- **Port**: 5050 (configurable)
- **Session Storage**: JSON files for chat history persistence

### Client Stack
- **Framework**: Vue.js 3 with Composition API
- **Styling**: Tailwind CSS for responsive mobile design
- **Build Tool**: Vite for fast development and optimized production builds
- **State Management**: Pinia stores for WebSocket and session state
- **PWA**: Service worker for offline capabilities and app installation

### Service Management
- **Production**: Launchd daemon for automatic restart on crash/reboot
- **Development**: Hot reload mode that pauses production service
- **Process Control**: PID-based management for clean shutdown

## Features

### 📱 Chat Interface
- Stream Claude Code responses in real-time via WebSocket
- Session management with history persistence
- Markdown rendering with syntax highlighting
- Tool call visualization (file operations, searches, etc.)
- Mobile-optimized input with auto-growing text areas

### 📁 File System Browser
- Navigate entire home directory from mobile
- File type detection with appropriate icons
- Inline previews for text, code, images, and PDFs
- Search functionality across file names
- Path breadcrumb navigation
- File stats (size, modified date, permissions)

### 📚 Knowledge Base Viewer
- Browse Obsidian vault structure
- Markdown rendering with custom styling
- Wiki-link resolution (automatic `[[link]]` to URL conversion)
- Recent notes list sorted by modification time
- Full-text search across vault
- Tag filtering and navigation

### 🛠️ Terminal View
- Execute bash commands from mobile
- View command output with streaming support
- Command history for quick re-execution
- Working directory management

### 📊 Todo Management
- View Kai's task queue from mobile
- Add new tasks with priority levels
- Mark tasks complete or remove them
- Priority-based task sorting

## Example Usage

### Initial Setup

```bash
# Navigate to skill directory
cd ~/.claude/skills/MobileApp

# Install dependencies
./manage.sh install

# Build production client
./manage.sh build

# Enable auto-restart service
./manage.sh service install

# Verify service is running
./manage.sh status
```

### Daily Usage

```bash
# Check server status
./manage.sh status

# View logs for debugging
./manage.sh service logs

# Restart if needed
./manage.sh restart
```

### Development Workflow

```bash
# Start development mode (hot reload)
./manage.sh dev

# Make changes to client or server code
# Browser auto-refreshes on save

# Stop with Ctrl+C (auto-resumes production service)
```

### Mobile Access

1. **Get Tailscale IP**: Run `tailscale ip` on your Mac
2. **Open in Safari**: Navigate to `http://<tailscale-ip>:5050`
3. **Add to Home Screen**: Tap Share → Add to Home Screen
4. **Use as App**: Open from home screen for full-screen experience

## API Endpoints

### Files API
```
GET /api/files/list?path=/Users/robt/Documents
GET /api/files/read?path=/Users/robt/.bashrc
GET /api/files/stat?path=/Users/robt/project
GET /api/files/search?q=config
```

### Knowledge API
```
GET /api/knowledge/notes         # Recent notes
GET /api/knowledge/note?path=... # Single note with wiki-links
GET /api/knowledge/search?q=...  # Full-text search
```

### Chat API
```
WS /chat                          # WebSocket for streaming chat
POST /api/chat/sessions           # List chat sessions
GET /api/chat/session/:id         # Load specific session
```

### Todo API
```
GET /api/todo/list                # All tasks
POST /api/todo/add                # Add new task
POST /api/todo/complete/:id       # Mark complete
DELETE /api/todo/remove/:id       # Remove task
```

## Invocation Scenarios

The skill is a standalone service, not invoked via Claude Code commands. However, it integrates with these PAI components:

| Component | Integration Point | Purpose |
|-----------|------------------|---------|
| Claude Code | WebSocket API | Real-time chat streaming |
| Obsidian Vault | MCP server tools | Note reading and wiki-link resolution |
| File System | Node.js fs API | File browsing and preview |
| Kai Todo | SKILL.md parsing | Task queue management |

## Requirements

- **Platform**: macOS (tested on macOS 14.x+)
- **Runtime**: Bun 1.0+ (install via `curl -fsSL https://bun.sh/install | bash`)
- **Network**: Tailscale VPN for secure remote access
- **Claude Code**: Installed and configured at `~/.claude/`
- **Obsidian**: Optional, for knowledge base features

## Changelog

### v1.0.0 (2026-01-13)
- Initial release with chat, files, and knowledge base features
- Launchd auto-restart service integration
- PWA support for iOS home screen installation
- WebSocket streaming for real-time Claude responses
- Obsidian wiki-link resolution
- File system browser with inline previews
- Todo management interface
- Terminal command execution view

---

**📖 See INSTALL.md for detailed installation instructions**
**✅ See VERIFY.md for verification checklist**
