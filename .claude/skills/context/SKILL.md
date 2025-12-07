---
name: context
description: |
  Knowledge Management - Capture and retrieve from Obsidian vault.

  INGEST: "ingest to knowledge base", "capture this", "save note", pipe content.
  SEARCH: "find notes about X", "what do I know about Y", discovery phase.
  LOAD: "load context for X", "get notes about Y", injection phase.

  Two-phase retrieval: SEARCH (discovery) → LOAD (injection)
---

# Context Skill (Knowledge Layer)

**Purpose:** Capture, store, and retrieve knowledge from Obsidian vault.

## Quick Reference

**CLI Paths** (run from PAI_DIR):
- `obs`: `cd ${PAI_DIR}/bin/obs && bun run obs.ts`
- `ingest`: `cd ${PAI_DIR}/bin/ingest && bun run ingest.ts`

| User Says | Command | Tool |
|-----------|---------|------|
| "Save this to vault" | `echo "content" \| ingest direct --tags "tag"` | ingest |
| "Capture this note" | `ingest direct --text "..." --tags "..."` | ingest |
| "What do I know about X?" | `obs search "X"` or `obs semantic "X"` | obs |
| "Find notes tagged Y" | `obs search --tag Y` | obs |
| "Load context for project Z" | `obs context Z` | obs |
| "What's incoming?" | `obs incoming` | obs |
| "Read that note" | `obs read "note-name"` | obs |
| "Notes from last week" | `obs search --since 1w` | obs |

## CLI Overview

Two complementary tools:

| Tool | Purpose | Key Commands |
|------|---------|--------------|
| `ingest` | **Capture** content into vault | `direct`, `poll`, `watch` |
| `obs` | **Query** content from vault | `search`, `semantic`, `read`, `context` |

---

## 1. INGEST — Capture to Vault

### Telegram Ingestion (Automated)

The Telegram bot automatically captures voice memos, photos, documents, and text messages.

```bash
# Check Telegram ingestion status
ingest status

# Process pending Telegram items
ingest poll
ingest process

# Watch for new items continuously
ingest watch
```

**Auto-Tagging:** Transcribed content uses fuzzy matching (70% Levenshtein threshold + phonetic boost) to match spoken tags against existing vault tags.
- `"ProjectPie"` → `project/pai`
- `"edovry"` → `ed_overy`

Unmatched tags are kept and flagged for review.

### CLI Direct Ingestion

```bash
# Pipe content directly
pbpaste | ingest direct --tags "project/pai,meeting"
cat document.md | ingest direct --name "My Document"

# Inline text
ingest direct --text "Quick note about API design" --tags "ideas"

# Files (PDF, images, etc.)
ingest direct document.pdf --scope private
```

**Inline Hints:** Use markers in content for automatic tagging:
- `#tag` → adds tag
- `@person` → adds person tag
- `~scope` → sets scope (work/private)

---

## 2. SEARCH — Discovery Phase

Find notes matching criteria. Returns index of matches.

### Basic Search

```bash
# Semantic search (AI-powered)
obs semantic "deployment strategies"

# Text search (grep-based)
obs search "kubernetes config"

# Tag filter (multiple = AND logic)
obs search --tag project/pai
obs search --tag ai --tag nvidia   # Must have BOTH
```

### Temporal Filters

Three date filters for different use cases:

| Flag | Meaning | Source |
|------|---------|--------|
| `--since` | Captured since | Frontmatter `generation_date` |
| `--modified` | Changed since | File modification time |
| `--created` | File created since | File creation time (birthtime) |

```bash
# Captured since (frontmatter date - when content was originally captured)
obs search --since 7d              # Last 7 days
obs search --since 2w              # Last 2 weeks
obs search --since 1m              # Last month (30 days)
obs search --since today           # Today only
obs search --since yesterday       # Since yesterday
obs search --since "this week"     # Current week (Mon-Sun)
obs search --since "this month"    # Current month
obs search --since 2025-12-01      # Since specific date

# Modified since (file system mtime - when file was last changed)
obs search --modified 7d           # Modified in last 7 days
obs search --modified today        # Modified today

# Created since (file system birthtime - when file appeared)
obs search --created 7d            # Created in last 7 days
```

### Scope Filters

```bash
obs search --scope work            # Default: only scope/work tagged
obs search --scope private         # Only private/untagged
obs search --scope all             # Everything
```

### Combined Examples

```bash
obs search "authentication" --tag project/api --since 1w
obs semantic "database optimization" --limit 5 --scope all
obs search --tag meeting --tag ed_overy --since "this month"
```

---

## 3. LOAD — Injection Phase

Read full content from discovered notes.

```bash
# Read single note by name
obs read "2025-01-15-Planning"

# Project context (shortcut for tag search + display)
obs context pai                    # All #project/pai notes
obs context pai --recent 10        # Limited to 10 most recent
```

---

## 4. Convenience Commands

```bash
# Incoming notes (need processing)
obs incoming
obs incoming --recent 20

# List all tags
obs tags
obs tags --counts

# Build/update embeddings for semantic search
obs embed --verbose
obs embed --stats
```

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OBSIDIAN_VAULT_PATH` | Yes | Path to your Obsidian vault |
| `OPENAI_API_KEY` | Yes | For semantic embeddings |

---

## Examples by Intent

**"I just had a meeting, save these notes"**
```bash
pbpaste | ingest direct --tags "meeting,project/pai"
```

**"What have I captured about Kubernetes recently?"**
```bash
obs semantic "kubernetes" --since 2w
obs search --tag kubernetes --since 1m
```

**"Load everything about the API project"**
```bash
obs context api --recent 20
```

**"What's waiting for me to process?"**
```bash
obs incoming
```

**"Find all notes mentioning Ed from this week"**
```bash
obs search --tag ed_overy --since "this week"
```

**"Quick capture an idea"**
```bash
ingest direct --text "Consider using Redis for caching layer #ideas #project/api" --scope work
```
