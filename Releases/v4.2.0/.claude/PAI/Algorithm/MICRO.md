# PAI Micro Format (v1.0)

For single bounded changes: 1-3 files, no design decisions, clearly under 30 seconds of work.

```
♻︎ PAI MICRO ════════════════════════════════════
🗒️ TASK: [8 word description]
[work]
🔧 CHANGE: [8-word bullets on what changed]
✅ VERIFY: [8-word bullets on how we know it's done]
🗣️ Assistant: [8-16 word summary]
```

**Rules:**
- Do NOT load Algorithm file (`v3.9.0.md`) — Micro is self-contained
- If work expands beyond 3 files or requires design decisions, switch to Standard+
- `[work]` = the actual edit/output, not a description of it
