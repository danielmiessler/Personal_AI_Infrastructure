# SearchIssues Workflow

**Purpose:** Full-text search across issues to find items by keyword, content, or pattern.

**Triggers:** "find issues about", "search tasks", "look for bugs", "issues mentioning", "find tickets"

---

## Steps

1. **Parse search query** from user request:
   - Keywords or phrases
   - Optional filters (status, type, project)
   - Result limit

2. **Execute search:**
```bash
bun run Tools/search.ts "query" --limit 20
```

3. **Present results** with relevance context:
   - Show matching title
   - Highlight where query matched
   - Include status and priority

4. **Offer actions** on results (view details, update, etc.)

---

## Examples

**Example 1: Simple keyword search**
```
User: "Find issues about authentication"

Process:
1. Parse: query="authentication"
2. Run: bun run Tools/search.ts "authentication" --limit 20
3. Return:
   Found 3 issues matching "authentication":

   | ID     | Status      | Title                          |
   |--------|-------------|--------------------------------|
   | ISS-42 | open        | Fix authentication timeout     |
   | ISS-23 | done        | Add OAuth authentication       |
   | BUG-12 | in_progress | Authentication fails on mobile |
```

**Example 2: Search with filters**
```
User: "Find open bugs related to database"

Process:
1. Parse: query="database", status=open, type=bug
2. Run: bun run Tools/search.ts "database" --status open --type bug
3. Return:
   Found 2 open bugs matching "database":

   - BUG-45: Database connection pool exhaustion
   - BUG-67: Database migration fails silently
```

**Example 3: Search in specific project**
```
User: "Search for network issues in infrastructure"

Process:
1. Parse: query="network", project=infrastructure
2. Run: bun run Tools/search.ts "network" --project infrastructure
3. Return: Filtered results from infrastructure project
```

**Example 4: Phrase search**
```
User: "Find issues mentioning 'memory leak'"

Process:
1. Parse: query="memory leak" (exact phrase)
2. Run: bun run Tools/search.ts "memory leak"
3. Return:
   Found 1 issue matching "memory leak":

   - BUG-89: Memory leak in background worker process
```

**Example 5: Search completed work**
```
User: "What security issues did we close last month?"

Process:
1. Parse: query="security", status=done
2. Run: bun run Tools/search.ts "security" --status done
3. Return:
   Completed issues matching "security":

   - ISS-101: Security audit for API endpoints (done)
   - ISS-102: Update security headers (done)
   - ISS-103: SSL certificate renewal (done)
```

**Example 6: Broad discovery search**
```
User: "What issues do we have about performance?"

Process:
1. Parse: query="performance"
2. Run: bun run Tools/search.ts "performance" --limit 30
3. Return grouped by status:

   Open (2):
   - ISS-201: Improve query performance on reports page
   - ISS-202: Performance testing for new features

   In Progress (1):
   - ISS-199: Performance optimization sprint

   Done (4):
   - ISS-180: Fixed performance regression
   - ISS-175: Database performance tuning
   - ...
```

---

## CLI Reference

```bash
bun run Tools/search.ts "query" [options]

Options:
  --status <status>    Filter results: open, in_progress, done, cancelled
  --type <type>        Filter by: task, bug, feature, story, epic
  --priority <level>   Filter by: urgent, high, medium, low
  --project <id>       Limit to specific project
  --limit <num>        Maximum results (default: 20)
  --format <fmt>       Output: table, json (default: table)
```

---

## Search Behavior

### What Gets Searched
- Issue title (primary)
- Issue description/body
- Labels/tags
- Comments (if supported by backend)

### Search Syntax
| Pattern | Meaning |
|---------|---------|
| `word` | Issues containing "word" |
| `"exact phrase"` | Exact phrase match |
| `word1 word2` | Issues containing both words |
| `auth*` | Wildcard (if supported) |

---

## Error Handling

- No results -> "No issues found matching '<query>'. Try different keywords or broader terms."
- Query too short -> "Search query must be at least 2 characters."
- Too many results -> "Found 150+ results. Showing first 20. Add filters to narrow down."
- Backend error -> "Search failed: [error details]. Try again or check connection."

---

## Result Presentation

### Compact List (default for < 10 results)
```
Found 3 issues matching "firewall":
1. [ISS-42] Fix firewall rules (open, high)
2. [ISS-56] Document firewall configuration (open, low)
3. [ISS-34] Firewall audit complete (done)
```

### Table View (for 10+ results)
```
| ID     | Status | Priority | Title                           |
|--------|--------|----------|---------------------------------|
| ISS-42 | open   | high     | Fix firewall rules              |
| ISS-56 | open   | low      | Document firewall configuration |
```

### Grouped View (for status overview)
```
Open (5)     In Progress (2)     Done (8)
```

---

## Post-Search Actions

After presenting results, offer:
- "View details" -> Get full issue with `bun run Tools/get.ts <id>`
- "Update" -> Transition to UpdateIssue workflow
- "Narrow search" -> Add filters

---

## Notes

- Search is case-insensitive by default
- Results are sorted by relevance, then by creation date
- For Joplin backend, searches note title and body content
- Linear/Jira may have more advanced search syntax (JQL, Linear filters)
- Use ListIssues workflow for structured filtering without keyword search
