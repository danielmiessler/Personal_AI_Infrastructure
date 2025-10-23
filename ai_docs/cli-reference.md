# Claude Code CLI Reference

This document provides a comprehensive guide to Claude Code's command-line interface.

## Available Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `claude` | Launch interactive REPL session | `claude` |
| `claude "query"` | Start REPL with initial prompt | `claude "explain this project"` |
| `claude -p "query"` | Query via SDK, then exit | `claude -p "explain this function"` |
| `cat file \| claude -p "query"` | Process piped content | `cat logs.txt \| claude -p "explain"` |
| `claude -c` | Continue most recent conversation | `claude -c` |
| `claude -c -p "query"` | Continue via SDK | `claude -c -p "Check for type errors"` |
| `claude -r "<id>" "query"` | Resume specific session | `claude -r "abc123" "Finish this PR"` |
| `claude update` | Update to latest version | `claude update` |
| `claude mcp` | Configure MCP servers | See MCP documentation |

## Key Flags

The tool supports customization through various flags:

- **`--add-dir`**: Add additional working directories for Claude to access
- **`--agents`**: Define custom subagents dynamically via JSON
- **`--print`, `-p`**: Print response without interactive mode
- **`--model`**: Specify model (aliases: `sonnet`, `opus`)
- **`--max-turns`**: Limit agentic turns in non-interactive mode
- **`--verbose`**: Enable detailed logging for debugging
- **`--output-format`**: Choose output style (`text`, `json`, `stream-json`)

## Subagent Configuration

The `--agents` flag accepts JSON defining custom agents with required `description` and `prompt` fields, plus optional `tools` and `model` specifications.

## Examples

### Basic Usage

Start an interactive session:
```bash
claude
```

Start with an initial prompt:
```bash
claude "explain this project"
```

### Non-Interactive Mode

Query and exit:
```bash
claude -p "explain this function"
```

Process piped content:
```bash
cat logs.txt | claude -p "explain"
```

### Continue Conversations

Continue the most recent conversation:
```bash
claude -c
```

Continue with a new query:
```bash
claude -c -p "Check for type errors"
```

Resume a specific session:
```bash
claude -r "abc123" "Finish this PR"
```

### Advanced Options

Add additional working directories:
```bash
claude --add-dir /path/to/other/project
```

Specify a model:
```bash
claude --model opus
```

Enable verbose logging:
```bash
claude --verbose
```

Set output format:
```bash
claude --output-format json
```

### Updates

Update to the latest version:
```bash
claude update
```

### MCP Configuration

Configure MCP servers:
```bash
claude mcp
```

For more information on MCP, see the MCP documentation.
