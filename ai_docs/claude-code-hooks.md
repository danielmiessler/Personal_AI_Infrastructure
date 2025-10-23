# Claude Code Hooks Reference

## Overview

Hooks in Claude Code are automated scripts that execute at specific events during your workflow. They're configured in settings files and can validate, approve, or modify tool usage, manage prompts, and handle session lifecycle events.

## Configuration Structure

Hooks are organized by event type with matchers for tool-specific targeting:

```json
{
  "hooks": {
    "EventName": [
      {
        "matcher": "ToolPattern",
        "hooks": [
          {
            "type": "command",
            "command": "your-command-here",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

**Key configuration elements:**
- **matcher**: Pattern matching tool names (case-sensitive). Supports regex like `Edit|Write` or `Notebook.*`
- **type**: Currently only `"command"` supported
- **timeout**: Optional execution limit in seconds per command

## Hook Events

### PreToolUse
Executes after Claude creates tool parameters but before processing the call. Matchers include: `Task`, `Bash`, `Glob`, `Grep`, `Read`, `Edit`, `Write`, `WebFetch`, `WebSearch`.

### PostToolUse
Runs immediately after successful tool completion. Uses same matchers as PreToolUse.

### Notification
Triggers when Claude sends notifications (permission requests or idle waiting messages).

### UserPromptSubmit
Executes when users submit prompts, before Claude processes them. Enables context injection and prompt validation.

### Stop / SubagentStop
Stop runs when the main agent finishes; SubagentStop when subagents finish.

### PreCompact
Runs before compacting the context. Matchers: `manual` or `auto`.

### SessionStart
Executes at session initialization. Matchers: `startup`, `resume`, `clear`, `compact`. Supports persisting environment variables via `CLAUDE_ENV_FILE`.

### SessionEnd
Runs when sessions terminate. Reason field indicates: `clear`, `logout`, `prompt_input_exit`, or `other`.

## Hook Input

Hooks receive JSON via stdin with common fields:
- `session_id`: Unique session identifier
- `transcript_path`: Conversation history location
- `cwd`: Current working directory
- `hook_event_name`: Triggering event type

Event-specific fields vary (e.g., `tool_name`, `tool_input`, `prompt`).

## Hook Output Mechanisms

### Exit Codes
- **0**: Success. Stdout visible in transcript mode (except UserPromptSubmit/SessionStart, where it's added as context)
- **2**: Blocking error. Stderr provided to Claude for processing
- **Other**: Non-blocking error. Stderr shown to user only

### JSON Output
Hooks can return structured JSON for advanced control:

```json
{
  "continue": true,
  "stopReason": "Optional message",
  "suppressOutput": false,
  "systemMessage": "Warning to user",
  "hookSpecificOutput": {
    "hookEventName": "EventType",
    "additionalContext": "Extra info for Claude"
  }
}
```

## Decision Control by Event

**PreToolUse**: `permissionDecision` can be `"allow"`, `"deny"`, or `"ask"`

**PostToolUse**: `decision` can be `"block"` (prompts Claude) or undefined (no action)

**UserPromptSubmit**: `decision` "block" prevents prompt processing; context can be injected

**Stop/SubagentStop**: `decision` "block" prevents stoppage; requires `reason` for Claude

**SessionStart**: `additionalContext` field injects context at session start

## MCP Tools Integration

MCP tools follow naming pattern `mcp__<server>__<tool>`. Configure hooks using regex:

```json
{
  "matcher": "mcp__memory__.*",
  "hooks": [...]
}
```

## Security Considerations

**Disclaimer**: Hooks execute arbitrary shell commands automatically. Users are solely responsible for configured commands, which can access/modify any files the user can access.

**Best practices:**
- Validate and sanitize all inputs
- Quote shell variables: `"$VAR"` not `$VAR`
- Block path traversal (check for `..`)
- Use absolute paths
- Skip sensitive files (`.env`, `.git/`, credentials)

Configuration snapshots are captured at startup; external modifications trigger warnings.

## Execution Details

- **Timeout**: 60 seconds default, configurable per command
- **Parallelization**: Matching hooks run in parallel
- **Deduplication**: Identical commands execute once
- **Environment**: `CLAUDE_PROJECT_DIR` provides project root; `CLAUDE_CODE_REMOTE` indicates execution context
- **Input**: JSON via stdin
- **Output**: Progress shown in transcript (Ctrl-R) for tool events

## Debugging

Use `claude --debug` to inspect hook execution:
- Displays which hooks are running
- Shows command execution status
- Reveals output and error messages

Basic troubleshooting:
- Run `/hooks` command to verify registration
- Test commands manually first
- Verify script executable permissions
- Check JSON syntax validity
- Review debug logs for details

---

**Note**: For practical examples and implementation guides, refer to the "Get started with Claude Code hooks" quickstart documentation.
