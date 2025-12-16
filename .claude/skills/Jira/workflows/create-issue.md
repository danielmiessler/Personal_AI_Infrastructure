# Create Issue Workflow

**Purpose:** Create new Jira issues with appropriate fields and project targeting.

## Trigger Phrases
- "create a jira ticket"
- "new issue for [topic]"
- "add a bug for [problem]"
- "create story for [feature]"
- "make a task for [work]"

---

## Workflow Steps

### Step 1: Gather Required Information

**Required fields:**
- **Type**: Bug, Story, Task, Epic, Sub-task
- **Summary**: Brief title (required)
- **Project**: Which Jira instance (work/personal, defaults to configured default)

**Optional fields:**
- **Description**: Detailed description
- **Priority**: Highest, High, Medium, Low, Lowest
- **Labels**: Comma-separated labels
- **Assignee**: User to assign (default: unassigned)
- **Components**: Project components
- **Epic**: Parent epic key

### Step 2: Confirm Details

Before creating, confirm with user:

```
Creating issue:
  Project: INNOV (work)
  Type: Bug
  Summary: Login fails with SSO when using Chrome
  Priority: High
  Labels: security, authentication

Proceed? (y/n or edit fields)
```

### Step 3: Create Issue

```bash
jira create --type Bug --summary "Login fails with SSO" --priority High --labels "security,authentication"
```

### Step 4: Report Result

```
✅ Created INNOV-47: Login fails with SSO when using Chrome
   URL: https://company.atlassian.net/browse/INNOV-47
   Status: Open
   Assignee: Unassigned
```

---

## Command Reference

### Basic Creation

```bash
# Minimal (type + summary required)
jira create --type Bug --summary "Button not responding"

# With description
jira create --type Story --summary "Add dark mode" --description "User preference for dark theme across the app"

# Pipe description from stdin
echo "Detailed description here..." | jira create --type Bug --summary "API timeout"
```

### With All Options

```bash
jira create \
  --project work \
  --type Story \
  --summary "Implement user preferences API" \
  --description "REST endpoints for user settings management" \
  --priority High \
  --labels "api,backend" \
  --assignee "me" \
  --epic "INNOV-10"
```

### Personal Project

```bash
jira create --project personal --type Task --summary "Review insurance documents"
```

---

## Issue Types

| Type | Use For |
|------|---------|
| Bug | Defects, errors, unexpected behavior |
| Story | User-facing features |
| Task | Technical work, non-feature items |
| Epic | Large initiatives containing multiple stories |
| Sub-task | Child of another issue |

---

## From Conversation Context

When user discusses a problem and asks to create a ticket:

1. **Extract key information** from conversation
2. **Suggest issue type** based on context (bug vs story vs task)
3. **Draft summary and description** from discussion
4. **Confirm with user** before creating

Example:
```
User: "The login is broken when using SSO. Can you create a ticket for that?"

Claude: I'll create a bug ticket for this:

  Type: Bug
  Summary: Login fails when using SSO authentication
  Description: Users are unable to log in when using SSO.
               The login page shows an error after redirect.
  Priority: High (blocking user access)

Shall I create this? (y/n or suggest changes)
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Project not found" | Invalid project key | Check `jira projects` for valid aliases |
| "Issue type not valid" | Wrong type for project | Check `jira types --project work` |
| "Required field missing" | Missing summary or type | Provide all required fields |
| "Permission denied" | No create permission | Check Jira permissions |

---

## Best Practices

1. **Be specific in summaries** - Good: "Login fails with SSO on Chrome" / Bad: "Login broken"
2. **Add context in description** - Include steps to reproduce, expected vs actual
3. **Set appropriate priority** - Don't make everything High
4. **Use labels consistently** - Check existing labels with `jira search --labels`
5. **Link to parent epic** - Keep work organized under epics
