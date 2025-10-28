# Agent Observability Setup

This guide will help you set up the Agent Observability system to monitor and visualize your Claude Code sessions in real-time.

## Prerequisites

- Claude Code installed and configured
- Bun runtime installed (`brew install bun` or see [bun.sh](https://bun.sh))
- Basic familiarity with terminal commands

## 1. Environment Variable

Add the PAI_DIR environment variable to your shell profile:

**For zsh users** (macOS default):
```bash
echo 'export PAI_DIR="$HOME/.claude"' >> ~/.zshrc
source ~/.zshrc
```

**For bash users**:
```bash
echo 'export PAI_DIR="$HOME/.claude"' >> ~/.bashrc
source ~/.bashrc
```

Verify it's set:
```bash
echo $PAI_DIR
# Should output: /Users/yourname/.claude
```

## 2. Configure Hooks

The hooks capture all Claude Code events and store them for the observability dashboard.

### Option A: Fresh Installation (No existing settings.json)

If you don't have a `~/.claude/settings.json` file yet:

```bash
# Create the .claude directory if it doesn't exist
mkdir -p ~/.claude

# Copy the example settings
cp ~/Projects/PAI/skills/agent-observability/settings.json.example ~/.claude/settings.json

# Update PAI_DIR to your actual path (if not $HOME/.claude)
# Edit ~/.claude/settings.json and change the PAI_DIR value if needed
```

### Option B: Existing settings.json (Merge Configuration)

If you already have `~/.claude/settings.json`:

1. Open both files side-by-side:
   - Your existing: `~/.claude/settings.json`
   - Template: `~/Projects/PAI/skills/agent-observability/settings.json.example`

2. Add the `PAI_DIR` environment variable to your `env` section if not present

3. Merge the `hooks` section from the template into your existing hooks

4. **Important**: Each hook type (PreToolUse, PostToolUse, etc.) can have multiple hooks. Add the `capture-all-events.ts` hook to each type alongside your existing hooks.

Example merged hook:
```json
"SessionStart": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "${PAI_DIR}/hooks/my-existing-hook.ts"
      },
      {
        "type": "command",
        "command": "${PAI_DIR}/skills/agent-observability/hooks/capture-all-events.ts --event-type SessionStart"
      }
    ]
  }
]
```

## 3. Create Directory Structure

Create the required directories for storing event data:

```bash
mkdir -p ~/.claude/history/raw-outputs
mkdir -p ~/.claude/skills/agent-observability/logs
```

## 4. Copy Hook Script

Copy the capture-all-events hook to your PAI directory:

```bash
# Create hooks directory if it doesn't exist
mkdir -p ~/.claude/skills/agent-observability/hooks

# Copy the hook script
cp ~/Projects/PAI/skills/agent-observability/hooks/capture-all-events.ts \
   ~/.claude/skills/agent-observability/hooks/

# Make it executable
chmod +x ~/.claude/skills/agent-observability/hooks/capture-all-events.ts
```

## 5. Install Dashboard Dependencies

Install dependencies for both the server and client applications:

```bash
# Server dependencies
cd ~/Projects/PAI/skills/agent-observability/apps/server
bun install

# Client dependencies
cd ~/Projects/PAI/skills/agent-observability/apps/client
bun install
```

## 6. Run the Observability Dashboard

Open two terminal windows/tabs:

**Terminal 1 - Backend Server**:
```bash
cd ~/Projects/PAI/skills/agent-observability/apps/server
bun run dev
```

You should see:
```
Server running on http://localhost:3001
Watching for events...
```

**Terminal 2 - Frontend Client**:
```bash
cd ~/Projects/PAI/skills/agent-observability/apps/client
bun run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## 7. Open Dashboard

Open your browser to:
```
http://localhost:5173
```

You should see the Agent Observability dashboard with a timeline view.

## 8. Test It

1. Open Claude Code
2. Start a new conversation
3. Use any tool (Read, Write, Bash, etc.)
4. Watch the dashboard update in real-time!

You should see:
- 🟢 SessionStart event when you open Claude Code
- 🔵 PreToolUse events before each tool is used
- 🟣 PostToolUse events after each tool completes
- 📝 UserPromptSubmit events when you send messages
- 🛑 Stop/SessionEnd events when you close or stop

## Troubleshooting

### Events Not Appearing in Dashboard

1. **Check hook is running**:
   ```bash
   # After using a tool in Claude Code, check if events are being written
   ls -lt ~/.claude/history/raw-outputs/ | head -5
   ```
   You should see recent `.jsonl` files

2. **Check server logs**:
   Look at Terminal 1 (server) for any error messages

3. **Verify PAI_DIR is set**:
   ```bash
   echo $PAI_DIR
   ```

4. **Check hook permissions**:
   ```bash
   ls -l ~/.claude/skills/agent-observability/hooks/capture-all-events.ts
   ```
   Should show `-rwxr-xr-x` (executable)

### Server Won't Start

1. **Port already in use**:
   ```bash
   lsof -i :3001
   # Kill any process using port 3001
   kill -9 <PID>
   ```

2. **Dependencies not installed**:
   ```bash
   cd ~/Projects/PAI/skills/agent-observability/apps/server
   rm -rf node_modules
   bun install
   ```

### Dashboard Shows Old Data

The dashboard watches for new events but doesn't automatically reload historical data. To see old events:
1. Stop the server (Ctrl+C in Terminal 1)
2. Restart with `bun run dev`
3. Refresh the browser

## Advanced Configuration

### Custom Output Directory

To change where events are stored, edit `~/.claude/settings.json`:

```json
{
  "env": {
    "PAI_DIR": "/path/to/your/custom/directory"
  }
}
```

Then create the required structure:
```bash
mkdir -p /path/to/your/custom/directory/history/raw-outputs
```

### Filter Events

To only capture specific event types, remove unwanted hooks from your `~/.claude/settings.json`. For example, to only capture tool usage (not prompts or session events), keep only:
- PreToolUse
- PostToolUse

## Next Steps

- Explore the timeline view to see event sequences
- Use the filters to focus on specific event types
- Check the event details panel for full context
- Monitor agent performance and behavior patterns

## Getting Help

- Review the main README: `~/Projects/PAI/skills/agent-observability/README.md`
- Check the PAI documentation: `~/Projects/PAI/.claude/documentation/`
- Open an issue on GitHub: [github.com/danielmiessler/PAI](https://github.com/danielmiessler/PAI)
