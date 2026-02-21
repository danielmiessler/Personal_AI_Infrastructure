# The Text Notification System

**External push notifications via ntfy (and optionally Discord).**

> **Opt-in by default:** All channels are disabled unless explicitly enabled in `settings.json`.
> Configure `settings.json → notifications` to enable channels you want.

---

## Available Channels

| Channel | Service | Purpose | Status |
|---------|---------|---------|--------|
| **ntfy** | ntfy.sh | Mobile push notifications | Supported — opt-in |
| **Discord** | Webhook | Team/server notifications | Not yet implemented |

---

## Smart Routing

Notifications are automatically routed based on event type:

| Event | Default Channels | Trigger |
|-------|------------------|---------|
| `taskComplete` | (none) | Normal task completion |
| `longTask` | ntfy | Task duration > 5 minutes |
| `backgroundAgent` | ntfy | Background agent completes |
| `error` | ntfy | Error in response |
| `security` | ntfy | Security alert |

---

## Configuration

Located in `~/.claude/settings.json`. **All channels default to disabled** — opt in by setting `enabled: true`:

```json
{
  "notifications": {
    "ntfy": {
      "enabled": false,
      "topic": "your-random-topic-here",
      "server": "ntfy.sh"
    },
    "thresholds": {
      "longTaskMinutes": 5
    },
    "routing": {
      "taskComplete": [],
      "longTask": ["ntfy"],
      "backgroundAgent": ["ntfy"],
      "error": ["ntfy"],
      "security": ["ntfy"]
    }
  }
}
```

---

## ntfy.sh Setup

1. **Generate a private topic**: `echo "pai-$(openssl rand -hex 8)"`
2. **Install app**: iOS App Store or Android Play Store → search "ntfy"
3. **Subscribe**: Add your topic in the app
4. **Update settings.json**: Set `topic` to your generated string, `enabled: true`
5. **Test**: `curl -d "Test from PAI" ntfy.sh/your-topic`

Topic name acts as password — use a random string for security.

---

## Implementation

The notification service lives at `~/.claude/hooks/lib/notifications.ts`:

```typescript
import { notify, notifyTaskComplete, notifyBackgroundAgent, notifyError } from './lib/notifications';

// Smart routing based on task duration and event type
await notifyTaskComplete("Task completed successfully");

// Background agent completion
await notifyBackgroundAgent("Researcher", "Found 5 relevant articles");

// Error notification
await notifyError("Database connection failed");
```

---

## Design Principles

1. **Opt-in only** — All channels default to disabled; never surprise the user with unsolicited pushes
2. **Fire and forget** — Notifications never block hook execution
3. **Fail gracefully** — Missing or misconfigured services don't cause errors
4. **Duration-aware** — Only push for long-running tasks (>5 min) by default
