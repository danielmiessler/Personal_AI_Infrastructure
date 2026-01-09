# Verification Guide: Kai History System

## Quick Verification

```bash
# 1. Check all hooks exist
ls -la $PAI_DIR/hooks/*.ts
# Should show: capture-all-events.ts, stop-hook.ts,
#              subagent-stop-hook.ts, capture-session-summary.ts

# 2. Check lib files exist
ls -la $PAI_DIR/hooks/lib/*.ts
# Should show: metadata-extraction.ts (plus observability.ts from hook-system)

# 3. Check directory structure
ls -la $PAI_DIR/history/
# Should show: sessions, learnings, research, decisions, execution, raw-outputs

# 4. Verify Bun can run the hooks
bun run $PAI_DIR/hooks/capture-all-events.ts --event-type Test <<< '{"test": true}'
# Should create an entry in raw-outputs

# 5. Check raw-outputs for the test entry
ls $PAI_DIR/history/raw-outputs/$(date +%Y-%m)/
# Should show today's events file
```

---

## Mandatory Completion Checklist

**AI agents MUST verify each item before claiming installation is complete:**

### File Verification

- [ ] `$PAI_DIR/hooks/capture-all-events.ts` exists
- [ ] `$PAI_DIR/hooks/stop-hook.ts` exists
- [ ] `$PAI_DIR/hooks/subagent-stop-hook.ts` exists
- [ ] `$PAI_DIR/hooks/capture-session-summary.ts` exists
- [ ] `$PAI_DIR/hooks/lib/metadata-extraction.ts` exists

### Directory Verification

- [ ] `$PAI_DIR/history/sessions/` exists
- [ ] `$PAI_DIR/history/learnings/` exists
- [ ] `$PAI_DIR/history/research/` exists
- [ ] `$PAI_DIR/history/decisions/` exists
- [ ] `$PAI_DIR/history/raw-outputs/` exists
- [ ] `$PAI_DIR/history/execution/features/` exists
- [ ] `$PAI_DIR/history/execution/bugs/` exists
- [ ] `$PAI_DIR/history/execution/refactors/` exists

### Configuration Verification

- [ ] `~/.claude/settings.json` contains `PreToolUse` hook for capture-all-events
- [ ] `~/.claude/settings.json` contains `PostToolUse` hook for capture-all-events
- [ ] `~/.claude/settings.json` contains `Stop` hook for stop-hook
- [ ] `~/.claude/settings.json` contains `SubagentStop` hook for subagent-stop-hook
- [ ] `~/.claude/settings.json` contains `SessionEnd` hook for capture-session-summary

### Functional Verification

- [ ] capture-all-events.ts runs without errors
- [ ] JSONL files appear in `raw-outputs/` after events
- [ ] Stop hook categorizes responses correctly
- [ ] Session summaries appear after ending sessions

### Code Integrity Check

```bash
# Check file sizes (should be > 1KB each)
wc -c $PAI_DIR/hooks/capture-all-events.ts \
      $PAI_DIR/hooks/stop-hook.ts \
      $PAI_DIR/hooks/subagent-stop-hook.ts \
      $PAI_DIR/hooks/capture-session-summary.ts \
      $PAI_DIR/hooks/lib/metadata-extraction.ts

# Expected approximate sizes:
# capture-all-events.ts     ~3000 bytes
# stop-hook.ts              ~2500 bytes
# subagent-stop-hook.ts     ~4000 bytes
# capture-session-summary.ts ~3000 bytes
# metadata-extraction.ts    ~2000 bytes
```

---

## Invocation Scenarios

The history system triggers automatically on Claude Code events:

| Event | Hook | Output Location | Captured Data |
|-------|------|-----------------|---------------|
| Any tool starts | PreToolUse | `raw-outputs/` | Tool name, input, session |
| Any tool completes | PostToolUse | `raw-outputs/` | Tool name, input, output |
| Main agent finishes | Stop | `learnings/` or `sessions/` | Full response, categorized |
| Subagent completes | SubagentStop | `research/`, `decisions/`, or `execution/` | Agent output, routed by type |
| User quits session | SessionEnd | `sessions/` | Files changed, tools used |

---

## Example Searches

```bash
# Search past work
grep -r "authentication" $PAI_DIR/history/

# Review recent sessions
ls -lt $PAI_DIR/history/sessions/2025-12/ | head -5

# Find architectural decisions
grep -l "architecture" $PAI_DIR/history/decisions/

# Check agent work from today
ls $PAI_DIR/history/research/2025-12/ | grep AGENT
```

---

## Troubleshooting

### No files appearing in raw-outputs

1. Check hooks are registered in settings.json
2. Verify PAI_DIR is set correctly
3. Restart Claude Code

### Learnings not being categorized

1. Check stop-hook.ts is registered
2. Verify learning keywords in the hook match your vocabulary
3. Check file permissions on history directories

### Subagent outputs not captured

1. Verify SubagentStop hook is registered
2. Check that Task tool is being used for agents
3. Look for errors in hook stderr output
