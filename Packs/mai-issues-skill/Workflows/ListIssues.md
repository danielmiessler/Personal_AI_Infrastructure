# ListIssues Workflow

**Purpose:** List and filter issues from the configured issue tracker with flexible query options.

**Triggers:** "list issues", "my tasks", "open issues", "show backlog", "what's on my plate", "pending tasks", "show bugs"

---

## Steps

1. **Parse filter criteria** from user request:
   - Status (open, in_progress, done, cancelled)
   - Type (task, bug, feature, story, epic)
   - Priority (urgent, high, medium, low)
   - Project/notebook scope
   - Limit count

2. **Build query** from parsed criteria

3. **Execute list command:**
```bash
bun run Tools/list.ts --status open --project <id> --format table
```

4. **Format and present results** in readable table or grouped view

---

## Examples

**Example 1: All open tasks**
```
User: "Show my open tasks"

Process:
1. Parse: status=open, type=task
2. Run: bun run Tools/list.ts --status open --type task --format table
3. Return:
   | ID       | Status | Priority | Title                        |
   |----------|--------|----------|------------------------------|
   | abc123   | open   | high     | Update firewall rules        |
   | def456   | open   | medium   | Review backup scripts        |
   | ghi789   | open   | low      | Document network topology    |
```

**Example 2: Project-specific issues**
```
User: "What issues are in the infrastructure project?"

Process:
1. Parse: project=infrastructure
2. Run: bun run Tools/list.ts --project infrastructure --format table
3. Return: Filtered list for infrastructure project
```

**Example 3: High priority bugs**
```
User: "Show me high priority bugs"

Process:
1. Parse: type=bug, priority=high
2. Run: bun run Tools/list.ts --type bug --priority high --format table
3. Return:
   | ID       | Status      | Priority | Title                    |
   |----------|-------------|----------|--------------------------|
   | bug001   | open        | high     | Login timeout issue      |
   | bug002   | in_progress | high     | Data sync failure        |
```

**Example 4: In-progress work**
```
User: "What am I currently working on?"

Process:
1. Parse: status=in_progress
2. Run: bun run Tools/list.ts --status in_progress --format table
3. Return: List of in-progress items
```

**Example 5: Backlog view with limit**
```
User: "Show me the next 10 items in backlog"

Process:
1. Parse: status=open, limit=10
2. Run: bun run Tools/list.ts --status open --limit 10 --format table
3. Return: Top 10 backlog items (usually sorted by priority)
```

---

## CLI Reference

```bash
bun run Tools/list.ts [options]

Options:
  --status <status>    Filter by: open, in_progress, done, cancelled
  --type <type>        Filter by: task, bug, feature, story, epic
  --priority <level>   Filter by: urgent, high, medium, low
  --project <id>       Filter by project/notebook
  --limit <num>        Maximum results to return (default: 50)
  --format <fmt>       Output format: table, json (default: table)
```

---

## Output Formats

### Table Format (default)
```
ID          Status        Priority    Title
--------------------------------------------------------------------------------
abc123      open          high        Update firewall rules
def456      in_progress   medium      Review backup scripts
```

### JSON Format
```json
[
  {
    "id": "abc123",
    "title": "Update firewall rules",
    "status": "open",
    "priority": "high",
    "type": "task",
    "projectId": "infrastructure"
  }
]
```

### Grouped View (for presentation)
When presenting to user, group by status or project:
```
Open (3)
  - [HIGH] Update firewall rules
  - [MEDIUM] Review backup scripts
  - [LOW] Document network topology

In Progress (1)
  - [HIGH] Data sync debugging
```

---

## Error Handling

- No results found -> "No issues match your criteria. Try broadening your search."
- Invalid filter value -> "Invalid status 'xyz'. Valid options: open, in_progress, done, cancelled"
- Backend unavailable -> "Cannot connect to issue tracker. Run `bun run Tools/health.ts` to diagnose."

---

## Common Query Patterns

| User Request | Filters Applied |
|--------------|-----------------|
| "my tasks" | status=open, type=task |
| "open bugs" | status=open, type=bug |
| "what's urgent" | priority=urgent |
| "backlog" | status=open |
| "done this week" | status=done (+ date filter if supported) |
| "features in progress" | status=in_progress, type=feature |

---

## Notes

- Default limit is 50 items to prevent overwhelming output
- Results are typically sorted by priority (urgent first), then by creation date
- For Joplin backend, only todo-type notes are returned
- Use `--format json` when piping to other tools or scripts
