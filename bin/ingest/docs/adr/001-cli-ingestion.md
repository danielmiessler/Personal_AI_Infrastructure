# ADR-001: CLI Ingestion Tool

**Status:** Accepted
**Date:** 2024-12-05
**Author:** Andreas

## Context

The ingest system currently supports Telegram as the primary input channel via the `watch` command. However, there's a need to ingest content directly from the command line - from clipboard (`pbpaste`), files, or stdin - using the same processing pipeline.

This follows the Unix philosophy of composable tools, similar to how Fabric provides helper tools like `yt` (YouTube transcripts) and `ts` (timestamps).

## Decision

We will extend the existing CLI with two new commands:

### 1. Enhanced `direct` Command

Ingest content from stdin, clipboard, or files into the vault.

```bash
# From stdin (most common)
pbpaste | ingest direct
echo "Quick note" | ingest direct

# From file
ingest direct document.pdf
ingest direct meeting.m4a

# With processing hints
pbpaste | ingest direct --tags "project/pai,meeting" --pipeline wisdom
ingest direct receipt.pdf --scope private --pipeline archive
```

**Flags:**
- `--tags, -t` - Add tags (comma-separated)
- `--pipeline, -p` - Force specific pipeline
- `--scope, -s` - Set scope (private/work/public)
- `--name, -n` - Override filename
- `--date, -d` - Set document date
- `--dry-run` - Show plan without saving

### 2. New `search` Command

Semantic search across the vault using embeddings.

```bash
ingest search "how does tag matching work"
ingest search --limit 5 "authentication implementation"
```

### 3. Global CLI Access

Create wrapper script for global `ingest` command:

```bash
#!/bin/bash
exec bun run /path/to/bin/ingest/ingest.ts "$@"
```

Symlinked to `~/.local/bin/ingest` or aliased in shell config.

## Architecture

```
stdin/file/clipboard
        │
        ▼
┌───────────────────┐
│  direct command   │
│  (parse hints,    │
│   detect type)    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   process.ts      │  ← Same pipeline as Telegram
│   (existing)      │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   Vault output    │
│   (notes, files,  │
│    embeddings)    │
└───────────────────┘
```

## Type Detection

Content type is auto-detected from:
1. File extension (if file argument)
2. MIME type detection (for binary stdin)
3. Content inspection (for text stdin)

| Input Type | Detection | Pipeline |
|------------|-----------|----------|
| Plain text | Default | note |
| PDF | Extension/magic bytes | archive |
| Audio (m4a, ogg, wav) | Extension | transcribe → note |
| Image (jpg, png) | Extension/magic | vision → note |
| Markdown | Extension | note |

## Test Coverage

### CLI Integration Tests (`test/specs/cli.spec.ts`)

| ID | Test | Description |
|----|------|-------------|
| CLI-010 | Direct stdin text | Echo text, verify vault note |
| CLI-011 | Direct with --tags | Verify tags applied |
| CLI-012 | Direct with --pipeline | Force pipeline selection |
| CLI-013 | Direct file PDF | File argument ingestion |
| CLI-014 | Direct audio file | Transcription workflow |
| CLI-015 | Search returns results | Query existing notes |
| CLI-016 | Search --limit | Respects limit flag |
| CLI-017 | Direct --dry-run | Shows plan, no write |

### Acceptance Tests (`test/specs/acceptance.spec.ts`)

| ID | Test | Description |
|----|------|-------------|
| ACC-010 | pbpaste workflow | Real clipboard to vault |
| ACC-011 | PDF archive | File → archive pipeline |
| ACC-012 | Search context | Query returns relevant |
| ACC-013 | Piped with hints | Full hint parsing |
| ACC-014 | Search recent | Finds just-ingested note |

## Example Workflows

```bash
# Morning reading: save article from clipboard
pbpaste | ingest direct --tags "reading,ai" --pipeline wisdom

# Archive a receipt
ingest direct receipt.pdf --tags "finance,2024" --scope private

# Voice memo processing
ingest direct voice-memo.m4a --pipeline meeting-notes

# Find context before a task
ingest search "authentication implementation" | head -10

# Quick thought capture
echo "Remember: review PR #123 tomorrow" | ingest direct
```

## Consequences

### Positive
- Same processing pipeline for all input sources
- Unix-composable (pipes, redirects, timeouts)
- Enables scripting and automation
- Semantic search from CLI
- Consistent with existing test framework

### Negative
- Additional code to maintain
- Need to handle stdin buffering correctly
- Binary type detection can be tricky

## Implementation Order

1. Enhance `direct` command (stdin, flags)
2. Add `search` command
3. Create wrapper script
4. Add CLI integration tests (CLI-010+)
5. Add acceptance tests (ACC-010+)

## References

- Fabric helper tools: `yt`, `ts`, `save`
- Unix philosophy: "Write programs that do one thing and do it well"
- Existing `direct` command in `ingest.ts`
