# Start Agent Observability Workflow

## Trigger
User says: "start observability", "monitor agents", "track agent activity"

## Purpose
Initialize and configure the agent observability dashboard for tracking AI agent activity.

## Workflow

### 1. Prerequisites Check
- Bun installed
- Agent observability skill configured
- Hook enabled in settings.json

### 2. Start Server
```bash
cd ~/.claude/skills/agent-observability/apps/server
bun install
bun run dev
```

### 3. Start Client
```bash
cd ~/.claude/skills/agent-observability/apps/client
bun install
bun run dev
```

### 4. Configure Hook
Ensure capture-all-events hook is active in settings.json:
```json
{
  "hooks": {
    "postToolUse": [
      ".claude/skills/agent-observability/hooks/capture-all-events.ts"
    ]
  }
}
```

### 5. Verify Capture
- Execute some agent tasks
- Check dashboard at http://localhost:3000
- Verify events are being captured

### 6. Monitor Activity
Dashboard shows:
- Agent invocations
- Tool usage
- Session timelines
- Performance metrics

## Configuration
See agent-observability/README.md for:
- Database setup
- Custom event filtering
- Performance tuning
- Troubleshooting

## Reference
Main agent-observability SKILL.md for complete documentation.
