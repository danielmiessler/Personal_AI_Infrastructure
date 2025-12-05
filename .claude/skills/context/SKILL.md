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

## Core Operations

### 1. INGEST — Capture to Vault
```bash
# Pipe content directly
pbpaste | ingest direct --tags "project/pai,meeting"
cat document.md | ingest direct --name "My Document"

# Ingest files
ingest direct document.pdf --scope private
ingest direct --text "Quick note" --tags "ideas"
```

**Supports:** Text, voice memos, photos, documents, URLs, YouTube links.

**Inline hints:** Use `#tag @person /command ~scope` in content for automatic tagging.

### 2. SEARCH — Discovery Phase
```bash
# Semantic search - returns index of matching notes
ingest search "project planning"

# Tag filter
ingest search --tag project/pai

# Person filter
ingest search --person ed_overy

# Combined
ingest search "architecture" --tag project/pai --limit 20

# Scope: work (default), private, all
ingest search "meeting notes" --scope all
```

### 3. LOAD — Injection Phase
```bash
# Load by name - outputs full markdown content
ingest load "2025-01-15-Planning"

# Load by tag
ingest load --tag project/pai --limit 5

# JSON output
ingest load --tag incoming --json
```

## Typical Workflow
```bash
# 1. Discover relevant notes
ingest search "authentication" --tag project/api --limit 10

# 2. Load the ones you need
ingest load --tag project/api --limit 3
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OBSIDIAN_VAULT_PATH` | Yes | Path to your Obsidian vault |
| `OPENAI_API_KEY` | Yes | For semantic embeddings |

## Examples

**Capture a note:**
```
User: "Save this meeting summary to the vault"
→ echo "Meeting summary content" | ingest direct --tags "meeting-notes"
```

**Load project context:**
```
User: "Load context for the data-platform project"
→ ingest search --tag "project/data-platform" --limit 10
→ ingest load --tag "project/data-platform" --limit 5
```

**Semantic search:**
```
User: "What do I know about data pipeline architecture?"
→ ingest search "data pipeline architecture patterns"
→ Load relevant results
```

**Person context:**
```
User: "What meetings have I had with John?"
→ ingest search --tag "john_doe" --tag "meeting-notes"
```
