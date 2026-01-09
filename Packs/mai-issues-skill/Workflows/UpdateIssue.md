# UpdateIssue Workflow

**Purpose:** Update issue properties including status, priority, or close/complete issues.

**Triggers:** "complete task", "close issue", "mark as done", "update priority", "change status", "finish task", "cancel issue"

---

## Steps

1. **Identify the issue** to update:
   - By explicit ID
   - By title search (partial match)
   - By context (most recent, currently working on)

2. **Determine update action:**
   - Status change (open, in_progress, done, cancelled)
   - Priority change
   - Assignment change
   - Label/tag update

3. **If search needed**, find matching issue:
```bash
bun run Tools/search.ts "issue title or keyword"
```

4. **Confirm match** if multiple results or ambiguous

5. **Apply update:**
```bash
bun run Tools/update.ts <issue-id> --status done
```

6. **Confirm change** with updated issue summary

---

## Examples

**Example 1: Complete a task by name**
```
User: "Mark the firewall task as done"

Process:
1. Search: bun run Tools/search.ts "firewall" --limit 5
2. Found: ISS-42 "Update firewall rules"
3. Confirm: "Found 'Update firewall rules'. Mark as done?"
4. Run: bun run Tools/update.ts ISS-42 --status done
5. Return: "Completed: ISS-42 Update firewall rules"
```

**Example 2: Start working on an issue**
```
User: "I'm starting work on the login bug"

Process:
1. Search: bun run Tools/search.ts "login bug"
2. Found: BUG-23 "Login timeout issue"
3. Run: bun run Tools/update.ts BUG-23 --status in_progress
4. Return: "Started: BUG-23 Login timeout issue (now In Progress)"
```

**Example 3: Change priority**
```
User: "Make the backup task urgent"

Process:
1. Search: bun run Tools/search.ts "backup"
2. Found: ISS-56 "Review backup scripts"
3. Run: bun run Tools/update.ts ISS-56 --priority urgent
4. Return: "Updated: ISS-56 Review backup scripts (Priority: Urgent)"
```

**Example 4: Cancel an issue**
```
User: "Cancel the documentation task, we're using a wiki instead"

Process:
1. Search: bun run Tools/search.ts "documentation"
2. Found: ISS-78 "Document network topology"
3. Confirm: "Cancel 'Document network topology'?"
4. Run: bun run Tools/update.ts ISS-78 --status cancelled
5. Return: "Cancelled: ISS-78 Document network topology"
```

**Example 5: Update by ID directly**
```
User: "Close issue ISS-42"

Process:
1. Parse: id=ISS-42, status=done
2. Run: bun run Tools/update.ts ISS-42 --status done
3. Return: "Closed: ISS-42 Update firewall rules"
```

**Example 6: Bulk complete**
```
User: "Mark all the network tasks as done"

Process:
1. Search: bun run Tools/search.ts "network" --status open
2. Found: 3 matching issues
3. Confirm: "Found 3 network tasks. Complete all?"
4. For each:
   Run: bun run Tools/update.ts <id> --status done
5. Return: "Completed 3 issues: ISS-12, ISS-34, ISS-56"
```

---

## CLI Reference

```bash
bun run Tools/update.ts <issue-id> [options]

Options:
  --status <status>    Set status: open, in_progress, done, cancelled
  --priority <level>   Set priority: urgent, high, medium, low
  --assignee <user>    Assign to user
  --labels <list>      Set labels (comma-separated)
  --add-label <label>  Add a single label
  --remove-label <l>   Remove a single label
```

---

## Status Transitions

| From | Valid Transitions |
|------|-------------------|
| open | in_progress, done, cancelled |
| in_progress | open, done, cancelled |
| done | open (reopen) |
| cancelled | open (reopen) |

---

## Error Handling

- Issue not found -> "No issue found matching '<query>'. Try a different search term or check the ID."
- Multiple matches -> Present list and ask: "Multiple issues match. Which one?"
- Invalid transition -> "Cannot mark a cancelled issue as in_progress. Reopen it first."
- Permission denied -> "You don't have permission to update this issue."

---

## Confirmation Patterns

Always confirm before:
- Bulk updates (more than 1 issue)
- Cancelling issues
- Reopening completed issues

Skip confirmation for:
- Single issue status changes (open -> in_progress -> done)
- Priority updates
- Label changes

---

## Common Shortcuts

| User Says | Action Applied |
|-----------|----------------|
| "done" / "complete" / "finish" | status=done |
| "start" / "working on" | status=in_progress |
| "cancel" / "won't do" | status=cancelled |
| "reopen" | status=open |
| "urgent" / "critical" | priority=urgent |
| "deprioritize" / "lower priority" | priority=low |

---

## Notes

- When completing via search, always confirm the match before updating
- The `done` status may be called `closed` or `completed` in some backends
- For Joplin backend, completing a task sets the `todo_completed` timestamp
- Some backends (Linear, Jira) may have workflow-specific status values
