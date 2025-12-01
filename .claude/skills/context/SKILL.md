---
name: context
description: |
  Load and search context from the Obsidian knowledge vault. Provides tag-based
  project context loading and semantic search across all notes. USE WHEN user
  says "load context for X", "find notes about Y", "search knowledge base",
  "what do I know about Z", or needs background information for a task.
---

# Context Skill

**Purpose:** Load relevant context from the Obsidian vault when working on tasks.

## Required Configuration

Add these to `~/.claude/.env` or `~/.config/fabric/.env`:

```bash
# Required
OBSIDIAN_VAULT_PATH=~/Documents/my_vault    # Your Obsidian vault location
OPENAI_API_KEY=sk-...                        # For semantic search embeddings

# Optional (for Telegram ingestion)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=-100your_channel_id
INGEST_PROFILE=zettelkasten
```

## Quick Reference

```bash
# Load project context
obs search --tag "project/my-project" --recent 20

# Semantic search
obs semantic "kubernetes deployment strategies"

# Full-text search
obs search --text "authentication flow"

# Read specific note
obs read "2024-12-01-Meeting-Notes"
```

## Routing

### Load Project Context
**Triggers:** "load context for X", "get project context", "what's the context for X"
**Workflow:** `workflows/load-project.md`
**Action:** Search vault by project tag, return relevant notes

### Semantic Search
**Triggers:** "find notes about X", "search knowledge for Y", "what do I know about Z"
**Workflow:** `workflows/semantic-search.md`
**Action:** Vector similarity search across entire vault

### Quick Context
**Triggers:** "remind me about X", "background on Y"
**Action:** Direct `obs search` or `obs semantic` based on query type

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OBSIDIAN_VAULT_PATH` | Yes | Path to your Obsidian vault |
| `OPENAI_API_KEY` | Yes | For semantic embeddings |
| `CONTEXT_EMBEDDINGS_DB` | No | Custom path for embeddings.db |

## Tag Taxonomy

See `tag-taxonomy.md` for complete reference. Summary:

### Processing Status Tags
- `incoming` - Needs processing
- `fabric-extraction` - Processed by fabric
- `wisdom` - Fabric wisdom extraction
- `main` - Core knowledge
- `raw` - Unprocessed dump

### People Tags (snake_case)
- `firstname_lastname` - e.g., `john_doe`, `jane_smith`

### Project Tags (hierarchical)
- `project/project-name` - e.g., `project/my-app`, `project/research-2024`

### Content Type Tags
- `meeting-notes`, `1on1`, `transcript`
- `bibliography`, `link`
- `ideas`, `howto`

### Topic Tags
- `ai`, `genai`, `llm` - AI topics
- Free-form topic tags

## Integration

This skill uses:
- `obs` CLI for vault operations
- Existing fabric patterns for processing
- sqlite-vec for semantic search

## Related Skills

- `vault/` - Vault maintenance and organization
- `fabric/` - Content processing patterns
- `brightdata/` - URL fetching for difficult sites

## Examples

**Load project context:**
```
User: "Load context for the data-platform project"
→ obs search --tag "project/data-platform" --recent 15
→ Returns list of recent related notes
→ Read most relevant ones for context
```

**Semantic search:**
```
User: "What do I know about data pipeline architecture?"
→ obs semantic "data pipeline architecture patterns"
→ Returns notes ranked by semantic similarity
```

**Combined search:**
```
User: "Find meeting notes about tech trends"
→ obs search --tag "meeting-notes" --text "tech trends"
→ Returns meeting notes containing tech trends discussions
```

**Person context:**
```
User: "What meetings have I had with John?"
→ obs search --tag "john_doe" --tag "meeting-notes"
→ Returns all meeting notes tagged with that person
```
