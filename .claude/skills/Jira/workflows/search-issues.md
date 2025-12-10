# Search Issues Workflow

**Purpose:** Find Jira issues using JQL queries and load selected issues into context.

## Trigger Phrases
- "what jira issues do I have"
- "search jira for [query]"
- "my open tickets"
- "issues in [project]"
- "bugs assigned to me"
- "what's in the backlog"

## CRITICAL: Iterative Search → Load Loop

**This is an ITERATIVE workflow. Each cycle has two steps: Search → Load.**
**User may run multiple cycles until they have enough context.**

```
┌─────────────────────────────────────────────────────┐
│                  SEARCH → LOAD LOOP                 │
│                                                     │
│   ┌─────────┐     ┌──────┐     ┌───────────────┐   │
│   │ SEARCH  │ ──► │ WAIT │ ──► │ LOAD selected │   │
│   └─────────┘     └──────┘     └───────────────┘   │
│        ▲                              │            │
│        │                              ▼            │
│        │         ┌──────────────────────────┐      │
│        └──────── │ Need more context? ──────┼──► Done
│                  └──────────────────────────┘      │
└─────────────────────────────────────────────────────┘
```

---

### Step 1: SEARCH (then STOP and WAIT)

Run search with `--format index`:
```bash
# Text search
jira search "authentication bug" --format index

# By assignee
jira search --assignee me --format index

# Combined filters
jira search --project work --status open --type Bug --format index

# Custom JQL
jira search --jql "project = INNOV AND assignee = currentUser()" --format index
```

**Parse the output** and present as markdown table:

| # | Key | Type | Status | Summary | Assignee |
|---|-----|------|--------|---------|----------|
| 1 | INNOV-42 | Bug | Open | Login fails with SSO | me |
| 2 | INNOV-38 | Story | In Progress | Add OAuth2 support | me |
...

**STOP.** Ask user:
> "Found N issues. Which to load? (e.g., `1,2,5` or `all` or `1-10`)"

**WAIT for user response.**

---

### Step 2: LOAD (then check if more needed)

When user selects (e.g., "1,2,5"):
```bash
jira load 1,2,5
```

Summarize what was loaded, then ask:
> "Loaded 3 issues. Need more context? You can:
> - Search again with different criteria
> - Load more from the previous search
> - Ask questions about what's loaded"

---

## Search Parameters

### Filter Options

| Flag | Description | Example |
|------|-------------|---------|
| `--project` | Project alias (work/personal) | `--project work` |
| `--assignee` | Issue assignee | `--assignee me`, `--assignee "john.doe"` |
| `--status` | Issue status | `--status open`, `--status "In Progress"` |
| `--type` | Issue type | `--type Bug`, `--type Story` |
| `--priority` | Issue priority | `--priority High` |
| `--labels` | Issue labels | `--labels "security"` |
| `--updated` | Updated within | `--updated 7d`, `--updated 1w` |
| `--created` | Created within | `--created 30d` |
| `--jql` | Custom JQL query | `--jql "project = INNOV AND ..."` |

### Common JQL Patterns

```bash
# My open issues
jira search --assignee me --status open --format index

# Unassigned bugs in project
jira search --project work --type Bug --assignee unassigned --format index

# High priority items
jira search --priority High --status open --format index

# Recently updated
jira search --project work --updated 7d --format index

# Custom JQL for complex queries
jira search --jql "project = INNOV AND status IN ('Open', 'In Progress') AND labels = 'security' ORDER BY priority DESC" --format index
```

---

## Iteration Examples

**Example 1: Single search, partial load**
```
User: "What jira issues do I have?"
Claude: [shows 15 results] "Which to load?"
User: "1-5"
Claude: [loads 5] "Need more?"
User: "Also 8"
Claude: [loads 1 more] "Now have 6 issues loaded."
```

**Example 2: Multiple searches**
```
User: "My open bugs"
Claude: [shows 8 results] "Which to load?"
User: "all"
Claude: [loads 8] "Need more context?"
User: "Also search for security-related stories"
Claude: [new search, shows 4 results] "Which to load?"
User: "all"
Claude: [loads 4 more] "Now have 12 issues total."
```

**Example 3: Refine search**
```
User: "Issues in INNOV project"
Claude: [shows 50 results] "Which to load?"
User: "Too many. Filter to just bugs"
Claude: [runs filtered search, shows 12 results] "Which to load?"
```

---

## Key Principles

1. **Always STOP after showing results** - Never auto-load
2. **User controls what gets loaded** - They manage their context window
3. **Support iteration** - Multiple searches, cumulative loading
4. **Summarize loaded context** - Help user track what's in context
5. **Use project aliases** - `work` and `personal` map to configured Jira instances

---

## Output Format

Search results are cached in `~/.cache/jira/last-search.json` for the load command:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "query": "--assignee me --status open",
  "project": "work",
  "results": [
    {
      "index": 1,
      "key": "INNOV-42",
      "type": "Bug",
      "status": "Open",
      "summary": "Login fails with SSO",
      "assignee": "me",
      "priority": "High",
      "created": "2025-01-10",
      "updated": "2025-01-14"
    }
  ]
}
```

Load command reads this cache and fetches full details for selected indices.
