# Load Project Context Workflow

**Purpose:** Load relevant context for a specific project from the Obsidian vault.

## Trigger Phrases
- "load context for [project]"
- "get context for [project]"
- "what's the context for [project]"
- "background on [project]"
- "what do we have on [project]"

## CRITICAL: Iterative Search → Load Loop

**This is an ITERATIVE workflow. User may search and load multiple times.**

---

### Step 1: SEARCH (then STOP and WAIT)

Run project context search with `--format json`:
```bash
obs context ${PROJECT} --format json --scope all
```

**Parse the JSON** and present as markdown table:

| # | Date | Type | Title | Tags |
|---|------|------|-------|------|
| 1 | Dec 7 | transcript | Meeting about X | compliance, data |
| 2 | Dec 7 | note | Planning notes | architecture |
...

**STOP.** Ask user:
> "Found N documents for #project/${PROJECT}. Which to load?"
> (e.g., `1,2,5` or `all` or `all transcripts`)

**WAIT for user response.**

---

### Step 2: LOAD (then check if more needed)

When user selects:
```bash
obs load 1,2,5
```

Summarize loaded content, then offer:
> "Loaded N documents. Need more context?
> - Load more from this search
> - Search for related topic
> - Ask questions about loaded context"

---

## Iteration Example

```
User: "Load context for ai-tailgating"
Claude: [shows 18 project notes] "Which to load?"
User: "all transcripts"
Claude: [loads 14 transcripts] "Need more?"
User: "Also search for safety compliance"
Claude: [new search, shows 5 results] "Which to load?"
User: "3,4"
Claude: [loads 2 more] "Now have 16 docs loaded. Questions?"
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
