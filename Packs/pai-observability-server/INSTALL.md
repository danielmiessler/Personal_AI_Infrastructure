# Kai Observability Server - Installation Guide

## Prerequisites

- **Bun runtime**: `curl -fsSL https://bun.sh/install | bash`
- **Node.js 18+** (for Vite dev server)
- **Claude Code** (or compatible agent system)
- **kai-hook-system** pack installed
- **Write access** to `$PAI_DIR/`

## Pre-Installation Checks

### Verify Hook System

```bash
# Check that kai-hook-system is installed
ls -la $PAI_DIR/hooks/
# Should show: security-validator.ts, initialize-session.ts, etc.

# Check that hooks are configured in Claude settings
grep -A 10 '"hooks"' ~/.claude/settings.json
# Should show PostToolUse hooks configured
```

### Check for Existing Observability

```bash
if [ -d "$PAI_DIR/observability" ]; then
  echo "Warning: Observability directory EXISTS"
  ls -la "$PAI_DIR/observability"
else
  echo "Clean install - no existing observability"
fi
```

## Installation Steps

### Step 1: Create Directory Structure

```bash
# Create observability directories
mkdir -p $PAI_DIR/observability/apps/server/src
mkdir -p $PAI_DIR/observability/apps/client/src/components
mkdir -p $PAI_DIR/observability/apps/client/src/composables
mkdir -p $PAI_DIR/history/raw-outputs

# Create hooks lib directory if not exists
mkdir -p $PAI_DIR/hooks/lib
```

### Step 2: Copy Source Files

Copy the following files from `src/` to their destinations:

| Source | Destination |
|--------|-------------|
| `src/hooks/lib/metadata-extraction.ts` | `$PAI_DIR/hooks/lib/metadata-extraction.ts` |
| `src/hooks/capture-all-events.ts` | `$PAI_DIR/hooks/capture-all-events.ts` |
| `src/observability/apps/server/src/types.ts` | `$PAI_DIR/observability/apps/server/src/types.ts` |
| `src/observability/apps/server/src/file-ingest.ts` | `$PAI_DIR/observability/apps/server/src/file-ingest.ts` |
| `src/observability/apps/server/src/index.ts` | `$PAI_DIR/observability/apps/server/src/index.ts` |
| `src/observability/apps/server/package.json` | `$PAI_DIR/observability/apps/server/package.json` |
| `src/observability/apps/client/src/main.ts` | `$PAI_DIR/observability/apps/client/src/main.ts` |
| `src/observability/apps/client/src/style.css` | `$PAI_DIR/observability/apps/client/src/style.css` |
| `src/observability/apps/client/src/App.vue` | `$PAI_DIR/observability/apps/client/src/App.vue` |
| `src/observability/apps/client/package.json` | `$PAI_DIR/observability/apps/client/package.json` |
| `src/observability/apps/client/vite.config.ts` | `$PAI_DIR/observability/apps/client/vite.config.ts` |
| `src/observability/apps/client/index.html` | `$PAI_DIR/observability/apps/client/index.html` |
| `src/observability/apps/client/tailwind.config.js` | `$PAI_DIR/observability/apps/client/tailwind.config.js` |
| `src/observability/apps/client/postcss.config.js` | `$PAI_DIR/observability/apps/client/postcss.config.js` |
| `src/observability/manage.sh` | `$PAI_DIR/observability/manage.sh` |

### Step 3: Make Management Script Executable

```bash
chmod +x $PAI_DIR/observability/manage.sh
```

### Step 4: Register Capture Hooks

Add the following to your `~/.claude/settings.json` hooks section:

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

### Step 5: Install Dependencies

```bash
# Install server dependencies
cd $PAI_DIR/observability/apps/server
bun install

# Install client dependencies
cd $PAI_DIR/observability/apps/client
bun install
```

### Step 6: Verify Installation

```bash
# Start observability
$PAI_DIR/observability/manage.sh start

# In another terminal, check health
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":...}

# Open browser to http://localhost:5172
# Should see the observability dashboard

# Stop when done testing
$PAI_DIR/observability/manage.sh stop
```

## Post-Installation

After installation:
1. Start observability: `$PAI_DIR/observability/manage.sh start`
2. Open http://localhost:5172
3. Use Claude Code - events should stream to dashboard
4. Use `/observability status` to check status from Claude Code

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :4000
lsof -i :5172

# Kill the processes if needed
$PAI_DIR/observability/manage.sh stop
```

### No Events Appearing

1. Check hooks are registered: `grep -A5 'capture-all-events' ~/.claude/settings.json`
2. Check the JSONL file is being written: `ls -la $PAI_DIR/history/raw-outputs/*/`
3. Check server is watching the right file: Server logs show "Watching: ..."

### WebSocket Not Connecting

1. Ensure server is running on port 4000
2. Check browser console for errors
3. Try `curl http://localhost:4000/health`
