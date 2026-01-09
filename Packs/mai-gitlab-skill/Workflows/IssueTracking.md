# IssueTracking Workflow

**Purpose:** Create, search, update, and manage GitLab issues for tracking bugs, features, and tasks.

**Triggers:** create issue, list issues, find issue, update issue, close issue, reopen issue, add comment to issue, show my issues, bug report, feature request

---

## Steps

1. Identify the target project and action (create, list, update, close, comment)
2. For searches: determine filter criteria (labels, assignee, state, milestone)
3. Execute the appropriate issue command
4. Format results with relevant metadata (labels, assignee, due date, weight)
5. For updates: confirm the change was applied

---

## Commands Reference

**List issues with filters:**
```bash
bun run Tools/Issues.ts list <project> [--state=opened|closed|all] [--labels=bug,urgent] [--assignee=username]
```

**Get issue details:**
```bash
bun run Tools/Issues.ts get <project> <issue_iid>
```

**Create new issue:**
```bash
bun run Tools/Issues.ts create <project> --title="<title>" --description="<description>" [--labels=<labels>] [--assignee=<username>]
```

**Update issue:**
```bash
bun run Tools/Issues.ts update <project> <issue_iid> [--title="<new_title>"] [--labels=<labels>] [--assignee=<username>]
```

**Close issue:**
```bash
bun run Tools/Issues.ts close <project> <issue_iid>
```

**Reopen issue:**
```bash
bun run Tools/Issues.ts reopen <project> <issue_iid>
```

**Add comment:**
```bash
bun run Tools/Issues.ts comment <project> <issue_iid> "<comment_body>"
```

---

## Examples

**Example 1: Create a bug report**
```
User: "Create a bug issue in frontend/dashboard - login button unresponsive on mobile"

Process:
1. Parse: project=frontend/dashboard, type=bug
2. Create issue:
   bun run Tools/Issues.ts create frontend/dashboard \
     --title="Login button unresponsive on mobile devices" \
     --description="## Description\nThe login button does not respond to taps on mobile browsers.\n\n## Steps to Reproduce\n1. Open dashboard on mobile\n2. Tap login button\n3. Nothing happens\n\n## Expected Behavior\nLogin modal should appear" \
     --labels=bug,mobile,priority::high
3. Return: Issue #<iid> created with link
```

**Example 2: Find issues assigned to me**
```
User: "Show my open issues in platform/api"

Process:
1. Get current user context (from config or previous auth)
2. List issues: bun run Tools/Issues.ts list platform/api --state=opened --assignee=@me
3. Return: Formatted list with IID, title, labels, due date, sorted by due date
```

**Example 3: Triage unlabeled issues**
```
User: "Show issues without labels in ops/infra"

Process:
1. List all open issues: bun run Tools/Issues.ts list ops/infra --state=opened
2. Filter locally for issues with empty labels array
3. Return: List of unlabeled issues for triage
```

**Example 4: Close issue with comment**
```
User: "Close issue 78 in backend/auth - fixed in MR 234"

Process:
1. Add closing comment: bun run Tools/Issues.ts comment backend/auth 78 "Fixed in !234"
2. Close issue: bun run Tools/Issues.ts close backend/auth 78
3. Return: Confirmation that issue #78 was closed with reference to MR
```

**Example 5: Bulk status check**
```
User: "How many open bugs do we have in myorg/main-app?"

Process:
1. List issues: bun run Tools/Issues.ts list myorg/main-app --state=opened --labels=bug
2. Count results and categorize by priority label if present
3. Return: "23 open bugs: 5 critical, 8 high, 10 medium/low"
```

**Example 6: Update issue priority**
```
User: "Mark issue 45 in devteam/service as critical"

Process:
1. Get current issue: bun run Tools/Issues.ts get devteam/service 45
2. Update labels: bun run Tools/Issues.ts update devteam/service 45 --labels=priority::critical,<existing_labels>
3. Return: Confirmation with updated label list
```

---

## Error Handling

- Issue not found → Verify IID is correct; search by title if needed
- Label doesn't exist → Create issues without invalid labels; note missing labels for admin
- Permission denied → User may lack Reporter+ role for issue operations
- Rate limiting on large lists → Paginate requests; summarize totals without full list
- Duplicate issue suspected → Search for similar titles before creating; warn if match found

---

## Notes

- Issue IID is project-scoped (shown as #45), different from global ID
- Labels are case-sensitive; use exact match from project settings
- Scoped labels (priority::high) replace others in same scope when updated
- Due dates use ISO format: YYYY-MM-DD
- Weight is for issue complexity (0-9); useful for sprint planning
- Related issues can be linked via description using #<iid> syntax
- For confidential issues, add --confidential flag when creating
