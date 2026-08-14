---
name: tm
description: Interactive voice-narrated tutorial on the current conversation topic (or a named one). Shortcut for the Teach skill's Teach workflow. USE WHEN /tm, teach me, tutorial, quiz me.
argument-hint: [topic]
---

# tm — Teach shortcut

Invoke the Teach skill's **Teach** workflow on `$ARGUMENTS`:

```
Skill("Teach", "teach me $ARGUMENTS")
```

If `$ARGUMENTS` is empty, the topic defaults to whatever this conversation has been working on or asking about; on a fresh session with no topic, the workflow asks.

Full procedure: `~/.claude/skills/Teach/Workflows/Teach.md`.
