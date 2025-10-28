# History Directory Structure

This directory shows the expected structure that will be created in your actual PAI directory (`~/.claude/` or `$PAI_DIR`).

**DO NOT use this directory directly.** This is just a template showing what will be created automatically when you run the agent-observability system.

## Actual Location

Events will be written to:
```
~/.claude/history/raw-outputs/YYYY-MM/YYYY-MM-DD_all-events.jsonl
```

Example:
```
~/.claude/history/raw-outputs/2025-01/2025-01-28_all-events.jsonl
```

## Directory Creation

The `capture-all-events.ts` hook automatically creates these directories when it runs for the first time.

If you want to create them manually:

```bash
mkdir -p ~/.claude/history/raw-outputs
```

## File Format

Events are stored in JSONL (JSON Lines) format - one JSON object per line:

```jsonl
{"source_app":"kai","session_id":"abc123","hook_event_type":"PreToolUse","payload":{...},"timestamp":1234567890,"timestamp_pst":"2025-01-28 14:30:00 PST"}
{"source_app":"designer","session_id":"def456","hook_event_type":"PostToolUse","payload":{...},"timestamp":1234567891,"timestamp_pst":"2025-01-28 14:30:01 PST"}
```

This format is:
- ✅ Human-readable (each line is valid JSON)
- ✅ Grep-able (search with standard tools)
- ✅ Streamable (process line-by-line)
- ✅ Append-only (fast writes, no database locking)
