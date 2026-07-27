# Edit.ts

> **Path note:** Any `~/.claude/...` path in this doc's examples is illustrative, not a fact about your install. This system may be installed project-scoped (`CLAUDE_CONFIG_DIR`/`LIFEOS_DIR` pointed at a project folder) rather than at the literal global path shown — resolve the actual root (check those env vars, or `CLAUDE.md`) before running any command literally.

Execute audio edits with ffmpeg. Reads an edit decision list and applies cuts with crossfades.

## Usage

```bash
bun ~/.claude/skills/AudioEditor/Tools/Edit.ts <audio-file> <edits.json> [--output <path>]
```

## Options

| Flag | Description |
|------|-------------|
| `--output <path>` | Specify output file path (default: `<filename>_edited.<ext>`) |

## Features

- 40ms qsin crossfades at every edit point
- Room tone extraction and gap filling
- Preserves original codec and bitrate
- Supports MP3, WAV, FLAC, M4A/AAC

## Requirements

- `ffmpeg` and `ffprobe` installed
