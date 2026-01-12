---
name: MultiLLM
description: Multi-LLM orchestration infrastructure with session management. USE WHEN coordinating multiple AI providers, querying external LLMs, or managing LLM sessions.
load_tier: 2
---

# MultiLLM - Multi-LLM Orchestration

Infrastructure for orchestrating multiple LLM providers with intelligent session management.

## Quick Reference

| Tool | Command | Purpose |
|------|---------|---------|
| Detect | `bun run detect` | Auto-detect available LLM CLIs |
| Query | `bun run query -p "prompt"` | Query any configured provider |
| Generate | `bun run generate-team` | Generate team.yaml from detected providers |
| Health | `bun run health` | Check provider availability |
| Sessions | `bun run SessionManager.ts -l` | List active sessions |

## Examples

**Query a specific provider:**
```bash
bun run query -p "Explain this code" --provider codex
```

**Query by role:**
```bash
bun run query -p "Creative ideas for..." --role creative_thinker
```

**Continue a session (preserve context):**
```bash
bun run query -p "Now refactor it" --continue --provider claude
```

**List available providers:**
```bash
bun run query --list
```

## Session Management

Sessions are automatically tracked per provider. When you query the same provider again, the system continues the existing session to preserve context.

**Session Commands:**
```bash
# List active sessions
bun run SessionManager.ts --list

# Clear session for a provider
bun run SessionManager.ts --clear claude

# Clear all sessions
bun run SessionManager.ts --clear-all
```

## Team Configuration

Your LLM team is configured in `$PAI_DIR/config/team.yaml`.

Each provider has:
- `name` - Provider identifier
- `cli` - Command template with `{prompt}` placeholder
- `session` - Session management configuration
- `role` - User-defined role (e.g., "code_expert", "creative_thinker")
- `use_for` - List of task types this provider excels at

## Supported Providers

| Provider | Session Support | Notes |
|----------|-----------------|-------|
| Claude | Full | `-c` continue, `-r` resume by ID |
| Codex | Full | `resume --last`, `resume <id>` |
| Gemini | Full | `--resume`, `--resume <uuid>` |
| Ollama | Manual | Use `/save` and `/load` in interactive mode |
| OpenCode | Partial | `/continue`, `/resume` in TUI |

## Files

- `Tools/DetectProviders.ts` - Auto-detection logic
- `Tools/SessionManager.ts` - Session tracking
- `Tools/Query.ts` - Unified query interface
- `Tools/GenerateTeam.ts` - Team config generator
- `Tools/HealthCheck.ts` - Provider health checks
