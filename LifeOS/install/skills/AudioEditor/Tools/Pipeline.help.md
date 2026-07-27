# Pipeline.ts

> **Path note:** Any `~/.claude/...` path in this doc's examples is illustrative, not a fact about your install. This system may be installed project-scoped (`CLAUDE_CONFIG_DIR`/`LIFEOS_DIR` pointed at a project folder) rather than at the literal global path shown — resolve the actual root (check those env vars, or `CLAUDE.md`) before running any command literally.

End-to-end audio editing pipeline that chains all tools: Transcribe -> Analyze -> Edit -> (optional) Polish.

## Usage

```bash
bun ~/.claude/skills/AudioEditor/Tools/Pipeline.ts <audio-file> [options]
```

## Options

| Flag | Description |
|------|-------------|
| `--polish` | Apply Cleanvoice cloud polish after editing (requires `CLEANVOICE_API_KEY`) |
| `--aggressive` | Tighter detection thresholds for filler words and pauses |
| `--preview` | Show proposed edits without executing them |
| `--output <path>` | Specify output file path |

## Output

- Edited audio: `<filename>_edited.<ext>` (same directory as input)
- Transcript: `<filename>.transcript.json`
- Edit decisions: `<filename>.edits.json`

## Examples

```bash
# Standard clean
bun Pipeline.ts ~/Downloads/podcast.mp3

# Preview edits first
bun Pipeline.ts ~/Downloads/podcast.mp3 --preview

# Aggressive clean with polish
bun Pipeline.ts ~/Downloads/podcast.mp3 --aggressive --polish

# Custom output path
bun Pipeline.ts ~/Downloads/podcast.mp3 --output ~/Desktop/cleaned.mp3
```
