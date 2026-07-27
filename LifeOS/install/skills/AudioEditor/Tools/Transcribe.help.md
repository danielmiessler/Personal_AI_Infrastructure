# Transcribe.ts

> **Path note:** Any `~/.claude/...` path in this doc's examples is illustrative, not a fact about your install. This system may be installed project-scoped (`CLAUDE_CONFIG_DIR`/`LIFEOS_DIR` pointed at a project folder) rather than at the literal global path shown — resolve the actual root (check those env vars, or `CLAUDE.md`) before running any command literally.

Word-level transcription via Whisper. Uses insanely-fast-whisper (MPS accelerated) with fallback to standard whisper CLI.

## Usage

```bash
bun ~/.claude/skills/AudioEditor/Tools/Transcribe.ts <audio-file> [--output <path>]
```

## Options

| Flag | Description |
|------|-------------|
| `--output <path>` | Specify output JSON path (default: `<filename>.transcript.json`) |

## Output Format

JSON with word-level timestamps (insanely-fast-whisper format):

```json
{
  "text": "Full transcript text...",
  "chunks": [
    { "text": "word", "timestamp": [0.0, 0.5] }
  ]
}
```

## Requirements

One of:
- `insanely-fast-whisper` (preferred, MPS accelerated)
- `whisper` (standard OpenAI whisper CLI)
