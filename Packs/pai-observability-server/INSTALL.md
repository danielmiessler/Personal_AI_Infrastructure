# PAI Observability Server v2.3.0 - Installation Guide

**This guide is designed for AI agents installing this pack into a user's infrastructure.**

---

## AI Agent Instructions

**This is a wizard-style installation.** Use Claude Code's native tools to guide the user through installation:

1. **AskUserQuestion** - For user decisions and confirmations
2. **TodoWrite** - For progress tracking
3. **Bash/Read/Write** - For actual installation
4. **VERIFY.md** - For final validation

### Welcome Message

Before starting, greet the user:
```
"I'm installing PAI Observability Server v2.3.0 - Real-time multi-agent activity monitoring dashboard with WebSocket streaming, task tracking, and MenuBar app.

Let me analyze your system and guide you through installation."
```

---

## Phase 1: System Analysis

**Execute this analysis BEFORE any file operations.**

### 1.1 Run These Commands

```bash
# Check for PAI directory
PAI_CHECK="${PAI_DIR:-$HOME/.claude}"
echo "PAI_DIR: $PAI_CHECK"

# Check if pai-core-install is installed (REQUIRED)
if [ -f "$PAI_CHECK/skills/CORE/SKILL.md" ]; then
  echo "✓ pai-core-install is installed"
else
  echo "❌ pai-core-install NOT installed - REQUIRED!"
fi

# Check if pai-hook-system is installed (REQUIRED)
if [ -f "$PAI_CHECK/hooks/lib/observability.ts" ]; then
  echo "✓ pai-hook-system is installed"
else
  echo "❌ pai-hook-system NOT installed - REQUIRED!"
fi

# Check for existing observability directory
if [ -d "$PAI_CHECK/observability" ]; then
  echo "⚠️  Existing observability directory found at: $PAI_CHECK/observability"
  ls -la "$PAI_CHECK/observability/"
else
  echo "✓ No existing observability directory (clean install)"
fi

# Check for Bun runtime
if command -v bun &> /dev/null; then
  echo "✓ Bun is installed: $(bun --version)"
else
  echo "❌ Bun not installed - REQUIRED!"
fi

# Check for Node.js (for Vite)
if command -v node &> /dev/null; then
  echo "✓ Node.js is installed: $(node --version)"
else
  echo "⚠️  Node.js not installed - needed for Vite dev server"
fi

# Check for port availability
if lsof -i :4000 &> /dev/null; then
  echo "⚠️  Port 4000 is in use"
else
  echo "✓ Port 4000 is available (server)"
fi

if lsof -i :5172 &> /dev/null; then
  echo "⚠️  Port 5172 is in use"
else
  echo "✓ Port 5172 is available (client)"
fi
```

### 1.2 Present Findings

Tell the user what you found:
```
"Here's what I found on your system:
- pai-core-install: [installed / NOT INSTALLED - REQUIRED]
- pai-hook-system: [installed / NOT INSTALLED - REQUIRED]
- Existing observability: [Yes at path / No]
- Bun runtime: [installed vX.X / NOT INSTALLED - REQUIRED]
- Node.js: [installed vX.X / NOT INSTALLED - needed for Vite]
- Port 4000 (server): [available / in use]
- Port 5172 (client): [available / in use]"
```

**STOP if pai-core-install, pai-hook-system, or Bun is not installed.** Tell the user:
```
"pai-core-install and pai-hook-system are required. Please install them first, then return to install this pack.

Install order:
1. pai-core-install
2. pai-hook-system
3. pai-observability-server (this pack)"
```

---

## Phase 2: User Questions

**Use AskUserQuestion tool at each decision point.**

### Question 1: Conflict Resolution (if existing found)

**Only ask if existing observability directory detected:**

```json
{
  "header": "Conflict",
  "question": "Existing observability installation detected. How should I proceed?",
  "multiSelect": false,
  "options": [
    {"label": "Backup and Replace (Recommended)", "description": "Creates timestamped backup, then installs new version"},
    {"label": "Replace Without Backup", "description": "Overwrites existing without backup"},
    {"label": "Abort Installation", "description": "Cancel installation, keep existing"}
  ]
}
```

### Question 2: Auto-Start Configuration

```json
{
  "header": "Auto-Start",
  "question": "How should the observability server start?",
  "multiSelect": false,
  "options": [
    {"label": "Manual start (Recommended)", "description": "Start with manage.sh when you want to observe"},
    {"label": "Start on login", "description": "Create a LaunchAgent to auto-start (macOS only)"}
  ]
}
```

### Question 3: MenuBar App (macOS only)

```json
{
  "header": "MenuBar App",
  "question": "Install the macOS MenuBar app for quick server control?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install MenuBar app", "description": "Build and install native macOS menu bar control"},
    {"label": "No, skip MenuBar app", "description": "Use manage.sh only"}
  ]
}
```

### Question 4: Final Confirmation

```json
{
  "header": "Install",
  "question": "Ready to install PAI Observability Server v2.3.0?",
  "multiSelect": false,
  "options": [
    {"label": "Yes, install now (Recommended)", "description": "Proceeds with installation using choices above"},
    {"label": "Show me what will change", "description": "Lists all files that will be created/modified"},
    {"label": "Cancel", "description": "Abort installation"}
  ]
}
```

---

## Phase 3: Backup (If Needed)

**Only execute if user chose "Backup and Replace":**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
BACKUP_DIR="$PAI_DIR/Backups/observability-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$PAI_DIR/observability" ] && cp -r "$PAI_DIR/observability" "$BACKUP_DIR/"
echo "Backup created at: $BACKUP_DIR"
```

---

## Phase 4: Installation

**Create a TodoWrite list to track progress:**

```json
{
  "todos": [
    {"content": "Create directory structure", "status": "pending", "activeForm": "Creating directory structure"},
    {"content": "Copy server files", "status": "pending", "activeForm": "Copying server files"},
    {"content": "Copy client files", "status": "pending", "activeForm": "Copying client files"},
    {"content": "Copy hook files", "status": "pending", "activeForm": "Copying hook files"},
    {"content": "Copy management scripts", "status": "pending", "activeForm": "Copying management scripts"},
    {"content": "Copy MenuBar app (macOS)", "status": "pending", "activeForm": "Copying MenuBar app"},
    {"content": "Install server dependencies", "status": "pending", "activeForm": "Installing server dependencies"},
    {"content": "Install client dependencies", "status": "pending", "activeForm": "Installing client dependencies"},
    {"content": "Build MenuBar app (macOS)", "status": "pending", "activeForm": "Building MenuBar app"},
    {"content": "Register capture hooks", "status": "pending", "activeForm": "Registering capture hooks"},
    {"content": "Run verification", "status": "pending", "activeForm": "Running verification"}
  ]
}
```

### 4.1 Create Directory Structure

**Mark todo "Create directory structure" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Create observability directories
mkdir -p "$PAI_DIR/observability/apps/server/src"
mkdir -p "$PAI_DIR/observability/apps/client/src/components"
mkdir -p "$PAI_DIR/observability/apps/client/src/composables"
mkdir -p "$PAI_DIR/observability/apps/client/src/styles"
mkdir -p "$PAI_DIR/observability/apps/client/src/utils"
mkdir -p "$PAI_DIR/observability/apps/client/src/types"
mkdir -p "$PAI_DIR/observability/MenuBarApp"
mkdir -p "$PAI_DIR/observability/Tools"
mkdir -p "$PAI_DIR/observability/scripts"

# Create history directory for event storage
mkdir -p "$PAI_DIR/history/raw-outputs"

# Create hooks lib directory if not exists
mkdir -p "$PAI_DIR/hooks/lib"
```

**Mark todo as completed.**

### 4.2 Copy Server Files

**Mark todo "Copy server files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy server source files from src/Observability/apps/server/
cp -r "$PACK_DIR/src/Observability/apps/server/src/"* "$PAI_DIR/observability/apps/server/src/"
cp "$PACK_DIR/src/Observability/apps/server/package.json" "$PAI_DIR/observability/apps/server/"
```

**Files copied:**
- `types.ts` - TypeScript interfaces
- `file-ingest.ts` - JSONL file watcher
- `task-watcher.ts` - Background task monitoring
- `db.ts` - In-memory event database
- `theme.ts` - Dashboard theme definitions
- `index.ts` - HTTP + WebSocket server
- `package.json` - Server dependencies

**Mark todo as completed.**

### 4.3 Copy Client Files

**Mark todo "Copy client files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy client source files from src/Observability/apps/client/
cp -r "$PACK_DIR/src/Observability/apps/client/src/"* "$PAI_DIR/observability/apps/client/src/"

# Copy client config files
cp "$PACK_DIR/src/Observability/apps/client/package.json" "$PAI_DIR/observability/apps/client/"
cp "$PACK_DIR/src/Observability/apps/client/vite.config.ts" "$PAI_DIR/observability/apps/client/"
cp "$PACK_DIR/src/Observability/apps/client/index.html" "$PAI_DIR/observability/apps/client/"
cp "$PACK_DIR/src/Observability/apps/client/tailwind.config.js" "$PAI_DIR/observability/apps/client/"
cp "$PACK_DIR/src/Observability/apps/client/postcss.config.js" "$PAI_DIR/observability/apps/client/"
cp "$PACK_DIR/src/Observability/apps/client/tsconfig.json" "$PAI_DIR/observability/apps/client/"
cp "$PACK_DIR/src/Observability/apps/client/tsconfig.app.json" "$PAI_DIR/observability/apps/client/"
cp "$PACK_DIR/src/Observability/apps/client/tsconfig.node.json" "$PAI_DIR/observability/apps/client/"
```

**Files copied:**
- `src/` - Vue components, composables, styles, utils
- `package.json` - Client dependencies
- Config files for Vite, Tailwind, PostCSS, TypeScript

**Mark todo as completed.**

### 4.4 Copy Hook Files

**Mark todo "Copy hook files" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy capture hook
cp "$PACK_DIR/src/hooks/AgentOutputCapture.hook.ts" "$PAI_DIR/hooks/"

# Copy metadata extraction library
cp "$PACK_DIR/src/hooks/lib/metadata-extraction.ts" "$PAI_DIR/hooks/lib/"
cp "$PACK_DIR/src/hooks/lib/observability.ts" "$PAI_DIR/hooks/lib/"
```

**Files copied:**
- `AgentOutputCapture.hook.ts` - Captures all events to JSONL
- `lib/metadata-extraction.ts` - Extract agent metadata
- `lib/observability.ts` - Observability utilities

**Mark todo as completed.**

### 4.5 Copy Management Scripts

**Mark todo "Copy management scripts" as in_progress.**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy management script
cp "$PACK_DIR/src/Observability/manage.sh" "$PAI_DIR/observability/"
chmod +x "$PAI_DIR/observability/manage.sh"

# Copy utility scripts
cp -r "$PACK_DIR/src/Observability/scripts/"* "$PAI_DIR/observability/scripts/"
chmod +x "$PAI_DIR/observability/scripts/"*.sh

# Copy Tools
cp -r "$PACK_DIR/src/Observability/Tools/"* "$PAI_DIR/observability/Tools/"
```

**Mark todo as completed.**

### 4.6 Copy MenuBar App (macOS)

**Mark todo "Copy MenuBar app (macOS)" as in_progress.**

**Only execute on macOS:**

```bash
PACK_DIR="$(pwd)"
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

# Copy MenuBar app source
cp -r "$PACK_DIR/src/Observability/MenuBarApp/"* "$PAI_DIR/observability/MenuBarApp/"
chmod +x "$PAI_DIR/observability/MenuBarApp/build.sh"
```

**Mark todo as completed.**

### 4.7 Install Server Dependencies

**Mark todo "Install server dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/observability/apps/server"
bun install
```

**Mark todo as completed.**

### 4.8 Install Client Dependencies

**Mark todo "Install client dependencies" as in_progress.**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/observability/apps/client"
bun install
```

**Mark todo as completed.**

### 4.9 Build MenuBar App (macOS)

**Mark todo "Build MenuBar app (macOS)" as in_progress.**

**Only execute on macOS if user requested MenuBar app:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"
cd "$PAI_DIR/observability/MenuBarApp"
./build.sh
```

**Mark todo as completed.**

### 4.10 Register Capture Hooks

**Mark todo "Register capture hooks" as in_progress.**

Add the event capture hooks to `~/.claude/settings.json`. These hooks capture all Claude Code events to the JSONL file that the server watches.

Read `config/settings-hooks.json` and merge the hooks into the user's existing settings.

**Important:** Merge the hooks, don't replace existing hooks.

**Mark todo as completed.**

---

## Phase 5: Verification

**Mark todo "Run verification" as in_progress.**

**Execute all checks from VERIFY.md:**

```bash
PAI_DIR="${PAI_DIR:-$HOME/.claude}"

echo "=== PAI Observability Server v2.3.0 Verification ==="

# Check server files
echo "Checking server files..."
[ -f "$PAI_DIR/observability/apps/server/src/index.ts" ] && echo "✓ server/index.ts" || echo "❌ server/index.ts missing"
[ -f "$PAI_DIR/observability/apps/server/src/file-ingest.ts" ] && echo "✓ server/file-ingest.ts" || echo "❌ server/file-ingest.ts missing"
[ -f "$PAI_DIR/observability/apps/server/src/task-watcher.ts" ] && echo "✓ server/task-watcher.ts" || echo "❌ server/task-watcher.ts missing"
[ -f "$PAI_DIR/observability/apps/server/package.json" ] && echo "✓ server/package.json" || echo "❌ server/package.json missing"

# Check client files
echo ""
echo "Checking client files..."
[ -f "$PAI_DIR/observability/apps/client/src/App.vue" ] && echo "✓ client/App.vue" || echo "❌ client/App.vue missing"
[ -f "$PAI_DIR/observability/apps/client/package.json" ] && echo "✓ client/package.json" || echo "❌ client/package.json missing"

# Check hook files
echo ""
echo "Checking hook files..."
[ -f "$PAI_DIR/hooks/AgentOutputCapture.hook.ts" ] && echo "✓ AgentOutputCapture.hook.ts" || echo "❌ AgentOutputCapture.hook.ts missing"
[ -f "$PAI_DIR/hooks/lib/metadata-extraction.ts" ] && echo "✓ metadata-extraction.ts" || echo "❌ metadata-extraction.ts missing"
[ -f "$PAI_DIR/hooks/lib/observability.ts" ] && echo "✓ observability.ts" || echo "❌ observability.ts missing"

# Check management script
echo ""
echo "Checking management script..."
[ -x "$PAI_DIR/observability/manage.sh" ] && echo "✓ manage.sh is executable" || echo "❌ manage.sh not executable"

# Check MenuBar app (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo ""
  echo "Checking MenuBar app..."
  [ -f "$PAI_DIR/observability/MenuBarApp/ObservabilityApp.swift" ] && echo "✓ MenuBar source" || echo "❌ MenuBar source missing"
fi

# Test server start (quick test)
echo ""
echo "Testing server..."
$PAI_DIR/observability/manage.sh start &
sleep 5
if curl -s http://localhost:4000/events/filter-options | grep -q "agents"; then
  echo "✓ Server responding on port 4000"
else
  echo "❌ Server not responding"
fi
$PAI_DIR/observability/manage.sh stop

echo "=== Verification Complete ==="
```

**Mark todo as completed when all checks pass.**

---

## Success/Failure Messages

### On Success

```
"PAI Observability Server v2.3.0 installed successfully!

What's available:
- Real-time event streaming via WebSocket
- Multi-agent activity tracking
- Event timeline visualization
- Agent swim lanes
- Background task monitoring
- MenuBar app for quick control (macOS)

To start the dashboard:
1. Run: $PAI_DIR/observability/manage.sh start
2. Open: http://localhost:5172

To stop: $PAI_DIR/observability/manage.sh stop"
```

### On Failure

```
"Installation encountered issues. Here's what to check:

1. Ensure pai-core-install is installed first
2. Ensure pai-hook-system is installed second
3. Verify Bun is installed: `bun --version`
4. Check ports 4000 and 5172 are available
5. Check directory permissions on $PAI_DIR/
6. Run the verification commands in VERIFY.md

Need help? Check the Troubleshooting section below."
```

---

## Troubleshooting

### "pai-core-install not found"

This pack requires pai-core-install. Install it first:
```
Give the AI the pai-core-install pack directory and ask it to install.
```

### "pai-hook-system not found"

This pack requires pai-hook-system for hook infrastructure. Install it:
```
Give the AI the pai-hook-system pack directory and ask it to install.
```

### "bun: command not found"

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
# Restart terminal or source ~/.bashrc
```

### Port already in use

```bash
# Check what's using the ports
lsof -i :4000
lsof -i :5172

# Kill existing processes
$PAI_DIR/observability/manage.sh stop
```

### No events appearing in dashboard

```bash
# Check hooks are registered
grep -A5 'AgentOutputCapture' ~/.claude/settings.json

# Check JSONL file is being written
ls -la $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/

# Restart Claude Code to reload hooks
```

### WebSocket not connecting

```bash
# Check server is running
curl http://localhost:4000/events/filter-options

# Check browser console for errors
# Open DevTools > Console tab
```

### MenuBar app not building (macOS)

```bash
# Ensure Xcode command line tools are installed
xcode-select --install

# Try building manually
cd $PAI_DIR/observability/MenuBarApp
./build.sh
```

---

## What's Included

| File | Purpose |
|------|---------|
| `src/Observability/apps/server/src/index.ts` | HTTP + WebSocket server |
| `src/Observability/apps/server/src/file-ingest.ts` | JSONL file watcher |
| `src/Observability/apps/server/src/task-watcher.ts` | Background task monitoring |
| `src/Observability/apps/server/src/db.ts` | In-memory event database |
| `src/Observability/apps/server/src/theme.ts` | Dashboard theme definitions |
| `src/Observability/apps/server/src/types.ts` | TypeScript interfaces |
| `src/Observability/apps/client/src/App.vue` | Vue dashboard |
| `src/Observability/apps/client/src/components/` | UI components (15+) |
| `src/Observability/apps/client/src/composables/` | Vue composition utilities |
| `src/Observability/manage.sh` | Start/stop/restart script |
| `src/Observability/MenuBarApp/` | macOS menu bar app |
| `src/Observability/Tools/ManageServer.ts` | Server management tool |
| `src/hooks/AgentOutputCapture.hook.ts` | Event capture hook |
| `src/hooks/lib/metadata-extraction.ts` | Agent metadata extraction |
| `src/hooks/lib/observability.ts` | Observability utilities |
| `config/settings-hooks.json` | Hook registration template |

---

## Usage

### Starting the Dashboard

```bash
# Start both server and client
$PAI_DIR/observability/manage.sh start

# Open in browser
open http://localhost:5172

# Check status
$PAI_DIR/observability/manage.sh status
```

### Stopping the Dashboard

```bash
$PAI_DIR/observability/manage.sh stop
```

### Running in Background

```bash
# Start detached (survives terminal close)
$PAI_DIR/observability/manage.sh start-detached
```

### From Claude Code

```
"Start observability"
"Check observability status"
"Stop observability"
```

---

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
