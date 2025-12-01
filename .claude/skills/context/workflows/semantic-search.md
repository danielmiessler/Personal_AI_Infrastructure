# Semantic Search Workflow

**Purpose:** Find relevant notes using natural language queries via vector similarity search.

## Trigger Phrases
- "find notes about [topic]"
- "search knowledge for [query]"
- "what do I know about [topic]"
- "related notes to [concept]"

## Prerequisites

Vector index must be built:
```bash
obs embed  # Full rebuild
obs embed --incremental  # Update changed only
```

## Workflow Steps

### 1. Parse Query
Extract the search intent from user's natural language request.

### 2. Execute Semantic Search
```bash
obs semantic "${QUERY}" --limit 10
```

Returns notes ranked by semantic similarity, not just keyword matches.

### 3. Filter Results (Optional)
Combine with tag filters for precision:
```bash
obs semantic "${QUERY}" --tag "type/research" --limit 10
```

### 4. Present Results
Show ranked results with relevance scores and excerpts.

### 5. Load Relevant Notes
Based on user selection or top results:
```bash
obs read "note-name"
```

## Example

**User:** "What do I know about authentication patterns?"

**Execution:**
```bash
obs semantic "authentication patterns security login"

# Results (ranked by similarity):
# 1. [0.89] 2024-10-15-OAuth-Implementation-Notes.md
# 2. [0.85] 2024-09-20-Security-Architecture-Review.md
# 3. [0.82] 2024-11-01-API-Authentication-Design.md
# 4. [0.78] 2024-08-10-SSO-Research.md
```

**Response:**
"Found 4 relevant notes about authentication:

1. **OAuth Implementation Notes** (Oct 15) - Highest relevance
   - OAuth 2.0 flow implementation details

2. **Security Architecture Review** (Sep 20)
   - Broader security patterns including auth

3. **API Authentication Design** (Nov 1)
   - API-specific authentication approach

Would you like me to load any of these?"

## Semantic vs Keyword Search

| Query | Keyword Search | Semantic Search |
|-------|----------------|-----------------|
| "auth patterns" | Matches "auth" literally | Finds "authentication", "login", "OAuth" |
| "deploy k8s" | Matches "k8s" | Finds "kubernetes", "container orchestration" |
| "team communication" | Matches exact words | Finds "collaboration", "meetings", "slack" |

## Notes

- Semantic search finds conceptually related content
- Combine with tag filters for better precision
- Show similarity scores to indicate confidence
- Index should be updated regularly (daily or on-demand)
