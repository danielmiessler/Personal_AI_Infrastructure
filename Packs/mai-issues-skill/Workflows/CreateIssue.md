# CreateIssue Workflow

**Purpose:** Create a new issue, task, bug, or feature request in the configured issue tracker.

**Triggers:** "create task", "new issue", "add bug", "file a ticket", "create a feature request", "add to backlog"

---

## Steps

1. **Parse user request** for issue details:
   - Title (required)
   - Type (task, bug, feature, story, epic)
   - Priority (urgent, high, medium, low)
   - Project/notebook context
   - Description or body content

2. **Determine project context** from:
   - Explicit project flag
   - Current workshop context (if loaded)
   - Default project from providers.yaml

3. **Create the issue:**
```bash
bun run Tools/create.ts "Issue Title" --type task --priority medium --project <project-id>
```

4. **Confirm creation** with issue ID and summary

5. **Optional: Add tags/labels** if specified:
```bash
bun run Tools/update.ts <issue-id> --labels "bug,urgent"
```

---

## Examples

**Example 1: Simple task creation**
```
User: "Create a task to update the firewall rules"

Process:
1. Parse: title="Update the firewall rules", type=task (default)
2. Context: infrastructure workshop -> project=infrastructure
3. Run: bun run Tools/create.ts "Update the firewall rules" --type task --project infrastructure
4. Return: "Created task ISS-42: Update the firewall rules"
```

**Example 2: Bug with priority**
```
User: "Add a high priority bug for the login timeout issue"

Process:
1. Parse: title="Login timeout issue", type=bug, priority=high
2. Run: bun run Tools/create.ts "Login timeout issue" --type bug --priority high
3. Return: "Created bug ISS-43: Login timeout issue (Priority: High)"
```

**Example 3: Feature request with description**
```
User: "Create a feature request for dark mode support. Users have been asking for this for months."

Process:
1. Parse: title="Dark mode support", type=feature, description="Users have been asking..."
2. Run: bun run Tools/create.ts "Dark mode support" --type feature --body "Users have been asking for this for months."
3. Return: "Created feature ISS-44: Dark mode support"
```

**Example 4: Epic for project planning**
```
User: "Create an epic for the Q1 infrastructure overhaul project"

Process:
1. Parse: title="Q1 Infrastructure Overhaul", type=epic
2. Run: bun run Tools/create.ts "Q1 Infrastructure Overhaul" --type epic --project infrastructure
3. Return: "Created epic ISS-45: Q1 Infrastructure Overhaul"
```

---

## CLI Reference

```bash
bun run Tools/create.ts "Title" [options]

Options:
  --type <type>        Issue type: task, bug, feature, story, epic (default: task)
  --priority <level>   Priority: urgent, high, medium, low (default: medium)
  --project <id>       Project or notebook ID
  --body <text>        Description/body content
  --labels <list>      Comma-separated labels
  --assignee <user>    Assign to user (if supported by backend)
```

---

## Error Handling

- Missing title -> Prompt: "What should I call this issue?"
- Invalid project -> "Project '<id>' not found. Available projects: [list]"
- Backend unavailable -> "Cannot connect to issue tracker. Run `bun run Tools/health.ts` to diagnose."
- Permission denied -> "You don't have permission to create issues in this project."

---

## Backend-Specific Behavior

| Backend | Project Mapping | Notes |
|---------|-----------------|-------|
| Joplin | Notebook name | Creates todo note in specified notebook |
| Linear | Team/Project ID | Creates issue in team backlog |
| Jira | Project key | Creates issue with project prefix (e.g., INFRA-123) |

---

## Notes

- If no type is specified, defaults to "task"
- If no priority is specified, defaults to "medium"
- Workshop context (if loaded) can provide default project
- For Joplin backend, issues are created as todo-type notes
