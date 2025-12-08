# Load Project Context Workflow

**Purpose:** Load relevant context for a specific project from the Obsidian vault.

## Trigger Phrases
- "load context for [project]"
- "get context for [project]"
- "what's the context for [project]"
- "background on [project]"
- "what do we have on [project]"

## Two-Phase Retrieval: Discovery → Load

### Phase 1: Discovery
Show numbered index of project notes:
```bash
obs context ${PROJECT} --format index
```

### Phase 2: Selection & Load
User chooses what to load:
```bash
obs load 1,2,5        # Specific items
obs load 1-10         # Range
obs load all          # Everything
obs load --type transcript  # Filter by type
```

## Workflow Steps

### 1. Identify Project
Extract project name from user request.

Common projects:
- `pai` - Personal AI Infrastructure
- `ai-tailgating` - AI Tailgating project
- Other projects as tagged in vault

### 2. Show Project Index
```bash
obs context ${PROJECT} --format index --recent 20
```

This returns a numbered table of notes tagged with the project.

### 3. Present Selection Options
Show the user the indexed results and offer load options:
- "load all" - Load everything
- "load 1-5" - Load first N items
- "load 1,3,7" - Load specific items
- "load --type transcript" - Filter by content type
- "load --since 2025-12-01" - Filter by date

### 4. Load Selected Notes
Based on user's selection:
```bash
obs load 1,2,5
```

Content is output to stdout, summary to stderr.

### 5. Summarize Context
Present a brief summary of loaded context:
- Number of documents loaded
- Total size
- Key themes found

## Example Session

**User:** "What context do we have on PAI project?"

**Claude runs:**
```bash
obs context pai --format index --recent 20
```

**Output:**
```
📋 Search Results for "#project/pai"

TAG MATCHES (15 notes)
────────────────────────────────────────────────────────────────────────────────
 #  │ Date       │ Type       │ Title                                    │ Tags
────────────────────────────────────────────────────────────────────────────────
 1  │ 2025-12-08 │ transcript │ Context System Design Discussion...      │ architecture
 2  │ 2025-12-07 │ note       │ Ingest Pipeline Updates...               │ telegram
 3  │ 2025-12-06 │ transcript │ Meeting with Ed on PAI...                │ ed_overy
...

Load options: obs load <selection>
  • obs load all              - Load all results
  • obs load 1,2,5            - Load specific items
  • obs load --type transcript - Load by type
```

**Claude responds:**
"Found 15 notes for #project/pai. Which would you like to load?
- `load all` - Load everything
- `load 1-5` - Most recent 5
- `load --type transcript` - Meeting transcripts only"

**User:** "load 1,2"

**Claude runs:**
```bash
obs load 1,2
```

**Output:**
```
✅ Loaded 2 document(s) (85KB)
  • Context System Design Discussion
  • Ingest Pipeline Updates

[Full content follows...]
```

## Alternative: Topic-Specific Context

If user wants context on a specific topic within the project:

```bash
# Combine tag + semantic search
obs search --tag "project/${PROJECT}" --text "${TOPIC}" --format index
```

**Example:**
```bash
obs search --tag "project/pai" --text "telegram ingestion" --format index
```

## Notes

- Use `--format index` for numbered results compatible with `obs load`
- Results are cached in `~/.cache/obs/last-search.json`
- Default to recent notes (last 20) unless user specifies otherwise
- Don't overwhelm context window - let user select what to load
- Always summarize what was loaded (count, size, themes)
