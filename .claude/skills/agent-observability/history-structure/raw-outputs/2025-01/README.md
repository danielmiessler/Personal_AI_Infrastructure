# Example Event File

This file (`EXAMPLE.jsonl`) shows the structure of event data captured by the agent-observability system.

**Note:** This is sample data for illustration. Real event files will be created automatically in your `~/.claude/history/raw-outputs/` directory when you use Claude Code with the agent-observability hooks configured.

Each line is a complete JSON object representing one event.

## Event Types Shown in Example

- **SessionStart**: When an agent session begins
- **UserPromptSubmit**: User input captured
- **PreToolUse**: Before a tool is executed
- **PostToolUse**: After a tool completes
- **Stop**: When an agent stops/pauses
- **SessionEnd**: When a session completes

## Using the Example

You can use this file to:
- Understand the JSONL format
- Test parsing scripts
- See what data structure to expect
- Learn about different event types
