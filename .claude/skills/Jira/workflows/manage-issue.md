# Manage Issue Workflow

**Purpose:** Update, transition, and comment on existing Jira issues.

## Trigger Phrases
- "move [issue] to done"
- "update [issue]"
- "transition [issue] to [status]"
- "add comment to [issue]"
- "assign [issue] to [person]"
- "change priority of [issue]"

---

## Operations

### 1. View Issue Details

```bash
# Full issue details
jira view INNOV-42

# Output includes:
# - Key, Type, Status, Priority
# - Summary and Description
# - Assignee, Reporter
# - Labels, Components
# - Comments (recent)
# - Linked issues
# - Created/Updated dates
```

### 2. Transition Status

Move issue through workflow states:

```bash
# Common transitions
jira transition INNOV-42 "In Progress"
jira transition INNOV-42 "In Review"
jira transition INNOV-42 "Done"

# Check available transitions
jira transitions INNOV-42
```

**Available Transitions** depend on current status and workflow:
- Open → In Progress
- In Progress → In Review
- In Review → Done
- Any → Blocked (with resolution)

### 3. Update Fields

```bash
# Single field
jira update INNOV-42 --assignee "jane.doe"
jira update INNOV-42 --priority High
jira update INNOV-42 --labels "security,urgent"

# Multiple fields
jira update INNOV-42 --assignee me --priority High --labels "urgent"

# Update description
echo "Updated description..." | jira update INNOV-42 --description -
```

### 4. Add Comments

```bash
# Simple comment
jira comment INNOV-42 "Fixed in commit abc123"

# Multi-line comment
jira comment INNOV-42 "Investigation complete:
- Root cause: race condition in auth flow
- Fix: added mutex lock
- Testing: unit tests added"

# From stdin
echo "Detailed analysis..." | jira comment INNOV-42
```

### 5. Link Issues

```bash
# Link to another issue
jira link INNOV-42 INNOV-38 "blocks"
jira link INNOV-42 INNOV-50 "is blocked by"
jira link INNOV-42 INNOV-45 "relates to"
```

---

## Common Workflows

### Bug Fix Workflow

```bash
# 1. Pick up the bug
jira transition INNOV-42 "In Progress"
jira update INNOV-42 --assignee me

# 2. Add investigation notes
jira comment INNOV-42 "Investigating: appears to be auth token expiry issue"

# 3. Fix complete, ready for review
jira transition INNOV-42 "In Review"
jira comment INNOV-42 "Fix in PR #123"

# 4. After approval
jira transition INNOV-42 "Done"
jira comment INNOV-42 "Deployed to production"
```

### Story Completion

```bash
# Start work
jira transition INNOV-38 "In Progress"

# Update with progress
jira comment INNOV-38 "API endpoints complete, starting UI"

# Ready for review
jira transition INNOV-38 "In Review"

# Done
jira transition INNOV-38 "Done"
```

### Blocking Issue

```bash
# Mark as blocked
jira transition INNOV-42 "Blocked"
jira comment INNOV-42 "Blocked by: waiting for API access from external team"
jira link INNOV-42 EXT-15 "is blocked by"

# When unblocked
jira transition INNOV-42 "In Progress"
jira comment INNOV-42 "Unblocked: API access granted"
```

---

## Batch Operations

### Update Multiple Issues

```bash
# From previous search results
jira search --assignee "old.user" --status open --format index
jira batch-update 1-10 --assignee "new.user"

# Or by key list
jira batch-update INNOV-42,INNOV-43,INNOV-44 --labels "sprint-5"
```

### Bulk Transition

```bash
# Move all "In Review" to "Done"
jira search --status "In Review" --format index
jira batch-transition all "Done"
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Transition not available" | Invalid status change | Check `jira transitions INNOV-42` |
| "Issue not found" | Wrong key | Verify issue key exists |
| "Field not editable" | Permission or workflow restriction | Check field permissions |
| "User not found" | Invalid assignee | Use email or account ID |

---

## Field Reference

| Field | Flag | Example |
|-------|------|---------|
| Assignee | `--assignee` | `me`, `john.doe@company.com` |
| Priority | `--priority` | `Highest`, `High`, `Medium`, `Low`, `Lowest` |
| Labels | `--labels` | `"security,urgent"` (comma-separated) |
| Components | `--components` | `"backend,api"` |
| Fix Version | `--fix-version` | `"v2.1.0"` |
| Sprint | `--sprint` | Sprint name or ID |
| Story Points | `--story-points` | Numeric value |
| Description | `--description` | Text or `-` for stdin |

---

## Integration with Context

When discussing issues already loaded in context:

1. **Reference by key** - Use exact issue key from loaded context
2. **Batch operations** - Can update multiple issues mentioned in conversation
3. **Smart suggestions** - Claude can suggest transitions based on discussion

Example:
```
User: "The SSO bug is fixed, can you close it?"
Claude: [finds INNOV-42 in loaded context]
        Moving INNOV-42 to Done...
        ✅ INNOV-42 transitioned to Done

        Would you like me to add a comment about the fix?
```
