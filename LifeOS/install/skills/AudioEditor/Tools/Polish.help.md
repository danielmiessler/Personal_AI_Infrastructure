# Polish.ts

> **Path note:** Any `~/.claude/...` path in this doc's examples is illustrative, not a fact about your install. This system may be installed project-scoped (`CLAUDE_CONFIG_DIR`/`LIFEOS_DIR` pointed at a project folder) rather than at the literal global path shown — resolve the actual root (check those env vars, or `CLAUDE.md`) before running any command literally.

Cleanvoice API cloud polish for final audio cleanup.

## Usage

```bash
bun ~/.claude/skills/AudioEditor/Tools/Polish.ts <audio-file> [--output <path>]
```

## Options

| Flag | Description |
|------|-------------|
| `--output <path>` | Specify output file path (default: `<filename>_polished.<ext>`) |

## Features

- Mouth sound removal
- Remaining filler word detection
- Loudness normalization
- Polls API for completion (up to 30 min timeout)

## Requirements

- `CLEANVOICE_API_KEY` environment variable
- Get key at: cleanvoice.ai Dashboard Settings API Key
