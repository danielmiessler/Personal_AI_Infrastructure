---
name: teach-me
description: Interactive voice-narrated tutorial on the current conversation topic (or a named one) — ASCII diagrams, spoken lesson content, one question per beat, quizzes. Routes to the Teach skill's Teach workflow. USE WHEN /teach-me, teach me, tutorial, quiz me, learn mode. NOT FOR plain written explanations with no dialogue (just answer directly).
argument-hint: [topic]
---

# teach-me — Teach skill Teach workflow

Invoke the Teach skill's **Teach** workflow on `$ARGUMENTS`:

```
Skill("Teach", "teach me $ARGUMENTS")
```

If `$ARGUMENTS` is empty, the topic defaults to whatever this conversation has been working on or asking about; on a fresh session with no topic, the workflow asks.

Full procedure: `~/.claude/skills/Teach/Workflows/Teach.md`.
