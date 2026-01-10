<!--
================================================================================
PAI CORE - SYSTEM/THENOTIFICATIONSYSTEM.md
================================================================================

PURPOSE:
Notification system documentation. How to send notifications through various
channels - voice, push, desktop, webhooks.

LOCATION:
- Kai (Private): ${PAI_DIR}/skills/CORE/SYSTEM/THENOTIFICATIONSYSTEM.md
- PAI Pack: Packs/pai-core-install/src/skills/CORE/SYSTEM/THENOTIFICATIONSYSTEM.md

CUSTOMIZATION:
- [ ] Configure your notification channels
- [ ] Set up voice server if using TTS
- [ ] Add webhook URLs for your services
- [ ] Customize routing rules

RELATED FILES:
- THEHOOKSYSTEM.md - Hook integration
- USER/DAIDENTITY.md - AI name and voice ID
- AGENTS.md - Agent voice personalities
- pai-voice-system pack - Full voice server implementation

LAST UPDATED: 2026-01-08
VERSION: 1.4.0
================================================================================
-->

# Notification System

How PAI sends notifications across various channels.

---

## Design Principles

1. **Fire and forget** - Notifications never block execution
2. **Fail gracefully** - Missing services don't cause errors
3. **Conservative defaults** - Avoid notification fatigue
4. **Duration-aware** - Escalate for long-running tasks

---

## Notification Channels

### Voice (TTS)

Primary spoken feedback via text-to-speech.

**Configuration:**
```bash
# Environment variables
VOICE_SERVER_URL=http://localhost:8888
ELEVENLABS_VOICE_ID=[YOUR_VOICE_ID]
```

**Usage:**
```bash
curl -s -X POST ${VOICE_SERVER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Task completed"}' \
  > /dev/null 2>&1 &
```

**Best Practices:**
- Keep messages under 450 characters
- Use for immediate feedback
- Fire in background (don't await)

### Push (ntfy)

Mobile push notifications via ntfy.sh or self-hosted.

**Configuration:**
```bash
# Environment variables
NTFY_TOPIC=your-topic-name
NTFY_SERVER=https://ntfy.sh  # or self-hosted
```

**Usage:**
```bash
curl -s -X POST "${NTFY_SERVER}/${NTFY_TOPIC}" \
  -H "Title: Task Complete" \
  -d "Your task has finished" \
  > /dev/null 2>&1 &
```

**Best Practices:**
- Use for completed long-running tasks
- Include actionable information
- Set priority levels appropriately

### Desktop

Native OS notifications.

**Usage (macOS):**
```bash
osascript -e 'display notification "Message" with title "PAI"'
```

**Best Practices:**
- Use for focus-requiring updates
- Don't spam - consolidate notifications

### Webhooks (Discord, Slack, etc.)

Team or server alerts via webhooks.

**Configuration:**
```bash
# Environment variables
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Usage (Discord):**
```bash
curl -s -X POST "${DISCORD_WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d '{"content": "Task completed"}' \
  > /dev/null 2>&1 &
```

---

## Event Routing

Route notifications based on event type and priority:

| Event Type | Channels | Priority |
|------------|----------|----------|
| Task start | Voice | Low |
| Task complete | Voice, Push | Medium |
| Long task (>5min) | Voice, Push, Desktop | High |
| Error/Failure | Voice, Push, Desktop | Critical |
| Security alert | All channels | Critical |

---

## Voice Notification Patterns

### Task Start Announcement

```bash
# Fire at task start
curl -s -X POST ${VOICE_SERVER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Starting the deployment workflow"}' \
  > /dev/null 2>&1 &
```

### Task Completion

```bash
# Fire when task completes
curl -s -X POST ${VOICE_SERVER_URL}/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Deployment complete. All tests passing."}' \
  > /dev/null 2>&1 &
```

### Context-Aware Messages

| User Request | Announcement |
|--------------|--------------|
| "Where is...?" | "Checking...", "Looking up..." |
| "Fix this" | "Fixing...", "Updating..." |
| "Why isn't...?" | "Investigating...", "Debugging..." |
| "Create..." | "Creating...", "Building..." |

### Workflow Invocation Notifications

**For skills with `Workflows/` directories, use "Executing..." format:**

```
Executing the **WorkflowName** workflow within the **SkillName** skill...
```

**Examples:**
- "Executing the **GIT** workflow within the **CORE** skill..."
- "Executing the **Publish** workflow within the **Blogging** skill..."

**NEVER announce fake workflows:**
- "Executing the file organization workflow..." - NO SUCH WORKFLOW EXISTS
- If it's not listed in a skill's Workflow Routing, DON'T use "Executing" format
- For non-workflow tasks, use context-appropriate gerund

### When to Skip Notifications

**Always skip when:**
- **Conversational responses** - Greetings, acknowledgments, simple Q&A
- **Skill has no workflows** - The skill has no `Workflows/` directory
- **Direct skill handling** - SKILL.md handles request without invoking a workflow file
- **Quick utility operations** - Simple file reads, status checks
- **Sub-workflows** - When a workflow calls another workflow (avoid double notification)

---

## Notification Library

```typescript
// hooks/lib/notifications.ts

export async function notify(message: string, channel: 'voice' | 'push' | 'desktop' = 'voice') {
  try {
    switch (channel) {
      case 'voice':
        await fetch(`${process.env.VOICE_SERVER_URL}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        break;
      case 'push':
        await fetch(`${process.env.NTFY_SERVER}/${process.env.NTFY_TOPIC}`, {
          method: 'POST',
          body: message
        });
        break;
      case 'desktop':
        Bun.spawn(['osascript', '-e', `display notification "${message}" with title "PAI"`]);
        break;
    }
  } catch {
    // Never fail on notification
  }
}
```

---

## Configuration Template

Add to your `.env`:

```bash
# Voice
VOICE_SERVER_URL=http://localhost:8888
ELEVENLABS_VOICE_ID=your_voice_id_here

# Push (ntfy)
NTFY_SERVER=https://ntfy.sh
NTFY_TOPIC=your-topic-here

# Webhooks
DISCORD_WEBHOOK_URL=your_webhook_url_here
SLACK_WEBHOOK_URL=your_webhook_url_here
```

---

## Related Documentation

- **Hooks:** `THEHOOKSYSTEM.md`
- **Identity:** `USER/DAIDENTITY.md`
- **Agents:** `AGENTS.md`
- **Voice Pack:** `pai-voice-system`
