---
name: Issues
description: Issue and task management across Joplin, Linear, Jira. USE WHEN tasks, issues, todos, bugs, features, backlog, project tracking.
---

# Issues Skill

Unified issue tracking across multiple backends. Works with Joplin (personal tasks), Linear (team projects), or Jira (enterprise).

## Workflow Routing

| Workflow | When to Use | Output |
|----------|-------------|--------|
| CreateIssue | "create task", "new issue", "add bug" | Created issue |
| ListIssues | "my tasks", "open issues", "show backlog" | Issue list |
| UpdateIssue | "complete task", "close issue", "change priority" | Updated issue |
| SearchIssues | "find issues about X", "search tasks" | Search results |
| ProjectOverview | "project status", "sprint progress" | Project summary |

## CLI Tools

```bash
# List issues
bun run Tools/list.ts [--status open] [--project <id>] [--format table|json]

# Get issue details
bun run Tools/get.ts <issue-id>

# Create issue
bun run Tools/create.ts "Title" [--type task|bug|feature] [--priority high] [--project <id>]

# Update issue
bun run Tools/update.ts <issue-id> [--status done] [--priority low]

# Search issues
bun run Tools/search.ts "query" [--limit 20]

# Health check
bun run Tools/health.ts
```

## Configuration

Configured via `providers.yaml`:

```yaml
domains:
  issues:
    primary: joplin       # Default backend
    fallback: linear      # If primary fails
    adapters:
      joplin:
        port: 41184
        defaultNotebook: Tasks
      linear:
        teamId: <team-id>
```

## Examples

### Example 1: Create a bug report
```
User: "Create a bug for the login issue"

-> Skill loads: Issues -> CreateIssue workflow
-> Asks: "What's the bug title and description?"
-> Creates issue with type: bug
```

### Example 2: List open tasks
```
User: "What are my open tasks?"

-> Skill loads: Issues -> ListIssues workflow
-> Queries: listIssues({ status: 'open' })
-> Returns formatted list
```

### Example 3: Complete a task
```
User: "Mark the login fix as done"

-> Skill loads: Issues -> UpdateIssue workflow
-> Searches for matching issue
-> Updates: updateIssue(id, { status: 'done' })
```
