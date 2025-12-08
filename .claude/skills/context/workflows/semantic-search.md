# Semantic Search Workflow

**Purpose:** Find relevant notes using natural language queries via vector similarity search.

## Trigger Phrases
- "find notes about [topic]"
- "search knowledge for [query]"
- "what do I know about [topic]"
- "related notes to [concept]"
- "what context do we have on [topic]"

## Prerequisites

Vector index must be built:
```bash
obs embed  # Full rebuild
obs embed --incremental  # Update changed only
```

## Two-Phase Retrieval: Discovery → Load

### Phase 1: Discovery (Search)
Run search with `--format index` to get numbered results:
```bash
obs semantic "${QUERY}" --format index --limit 10
obs search --tag "project/${PROJECT}" --format index
```

### Phase 2: Injection (Load)
User selects which notes to load:
```bash
obs load 1,2,5        # Specific items
obs load 1-10         # Range
obs load all          # Everything
obs load --type transcript  # Filter by type
```

## Workflow Steps

### 1. Parse Query
Extract the search intent from user's natural language request.

### 2. Execute Search with Index Format
```bash
# For semantic search
obs semantic "${QUERY}" --format index --limit 10

# For tag-based search
obs search --tag "project/${PROJECT}" --format index
```

Returns numbered list with metadata (date, type, tags, excerpt).

### 3. Present Results to User
Show the indexed table and ask which items to load:

```
📋 Search Results for "authentication"

SEMANTIC MATCHES (5 notes)
────────────────────────────────────────────────────────────────────────────────
 #  │ Score │ Date       │ Title                                    │ Excerpt
────────────────────────────────────────────────────────────────────────────────
 1  │   89% │ 2024-10-15 │ OAuth Implementation Notes               │ OAuth 2.0 flow...
 2  │   85% │ 2024-09-20 │ Security Architecture Review             │ security patterns...
 3  │   82% │ 2024-11-01 │ API Authentication Design                │ API auth approach...

Load options: "load all", "load 1,2", "load 1-3"
```

### 4. Load Selected Notes
Based on user's selection:
```bash
obs load 1,2,3
```

Output goes to stdout (summary to stderr) - ready for context injection.

## Example Session

**User:** "What context do we have on ai-tailgating?"

**Claude runs:**
```bash
obs search --tag "project/ai-tailgating" --format index --scope all
```

**Output:**
```
📋 Search Results for "#project/ai-tailgating"

TAG MATCHES (18 notes)
────────────────────────────────────────────────────────────────────────────────
 #  │ Date       │ Type       │ Title                                    │ Tags
────────────────────────────────────────────────────────────────────────────────
 1  │ 2025-12-08 │ transcript │ Compliance and Integration Discussion... │ compliance, meeting
 2  │ 2025-12-08 │ transcript │ Project methodology preferences...       │ agile, architecture
 3  │ 2025-12-08 │ transcript │ Data Readiness Planning...               │ data-platform
...
```

**Claude responds:**
"Found 18 documents for #project/ai-tailgating. Load options:
- `load all` - Load everything
- `load 1-5` - Load first 5
- `load 1,3,7` - Load specific items
- `load --type transcript` - Filter by type"

**User:** "load 1,2"

**Claude runs:**
```bash
obs load 1,2
```

**Output:**
```
✅ Loaded 2 document(s) (160KB)
  • Compliance and Integration Discussion...
  • Project methodology preferences...

[Full content follows...]
```

## Semantic vs Keyword Search

| Query | Keyword Search | Semantic Search |
|-------|----------------|-----------------|
| "auth patterns" | Matches "auth" literally | Finds "authentication", "login", "OAuth" |
| "deploy k8s" | Matches "k8s" | Finds "kubernetes", "container orchestration" |
| "team communication" | Matches exact words | Finds "collaboration", "meetings", "slack" |

## Notes

- Use `--format index` for numbered results that support `obs load`
- Results are cached in `~/.cache/obs/last-search.json`
- Semantic search finds conceptually related content
- Combine with tag filters for better precision
- Show similarity scores to indicate confidence
- Index should be updated regularly (daily or on-demand)
