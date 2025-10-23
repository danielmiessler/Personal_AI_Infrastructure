# Claude Code Headless Mode Documentation

## Overview
Headless mode enables programmatic execution of Claude Code from command-line scripts and automation tools without interactive UI components.

## Core Command Structure
The primary interface uses the `claude` command with the `--print` or `-p` flag for non-interactive operation:

```bash
claude -p "Your prompt here" --allowedTools "Bash,Read"
```

## Key Configuration Options

| Flag | Purpose |
|------|---------|
| `--print` / `-p` | Enable non-interactive mode |
| `--output-format` | Set output type (text, json, stream-json) |
| `--resume` / `-r` | Resume session by ID |
| `--continue` / `-c` | Continue most recent conversation |
| `--verbose` | Enable detailed logging |
| `--allowedTools` | Specify permitted tools |
| `--mcp-config` | Load MCP server configuration |

## Output Format Options

**Text Output** returns plain response text (default behavior).

**JSON Output** provides structured data with metadata:
```json
{
  "type": "result",
  "total_cost_usd": 0.003,
  "duration_ms": 1234,
  "result": "Response text...",
  "session_id": "abc123"
}
```

**Streaming JSON Output** emits messages individually as received via jsonl format.

## Multi-Turn Conversations

Resume previous sessions for context persistence:
```bash
claude --resume SESSION_ID "Follow-up question"
claude --continue "Next prompt"
```

## Input Methods

**Text Input**: Direct arguments or stdin
**Streaming JSON Input**: jsonl format via stdin with `--input-format=stream-json`

## Practical Applications

- **Incident Response**: Automate SRE diagnostics with system prompts and tool access
- **Security Audits**: Process pull request diffs for vulnerability detection
- **Legal Reviews**: Maintain conversation state across document analysis steps

## Best Practices

- Parse JSON responses programmatically using tools like `jq`
- Implement error handling via exit codes and stderr monitoring
- Use session management for maintaining conversation context
- Add timeouts for extended operations
- Respect API rate limits between requests

---
*Source: https://docs.claude.com/en/docs/claude-code/headless*
*Scraped: 2025-10-23*
