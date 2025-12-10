---
name: jira
domain: commitment
description: |
  📋 COMMITMENT DOMAIN: "What do I owe?"

  Jira Integration - Search, create, and manage Jira issues across projects.
  Part of the Life OS framework (see discussion #157).

  USE WHEN: "jira issues", "what's my backlog", "create a ticket", "update issue",
  "search jira for", "my open issues", "transition to done", "jira status",
  "what am I committed to", "what tasks are assigned to me".

  Two-phase retrieval: SEARCH (discovery) → LOAD (injection)
  Multi-project: work vs personal Jira instances
  CLI-First: All operations via `jira` CLI tool
---

# Jira Skill (📋 Commitment Domain)

> **Life OS Domain:** Commitment — "What do I owe?"
>
> This skill tracks work commitments, assigned tasks, and deliverables across Jira projects.
> Related domains: Knowledge (Context skill), Attention (future), Awareness (future).

**Purpose:** Search, create, and manage Jira issues across multiple projects.

## Workflow Routing (SYSTEM PROMPT)

**CRITICAL: READ the appropriate workflow file FIRST before executing commands.**

**When user asks about Jira issues or backlog:**
Examples: "what jira issues do I have", "my open tickets", "search jira for X", "what's in the backlog", "issues assigned to me"
→ **READ:** `${PAI_DIR}/.claude/skills/Jira/workflows/search-issues.md`
→ **EXECUTE:** **TWO-TURN WORKFLOW:**
  1. Run search with `--format index`, present results as table
  2. **STOP IMMEDIATELY** - respond with ONLY the results table and "Which to load?"
  3. **WAIT** for user response before loading full details

⚠️ **CRITICAL: STOP AFTER SHOWING RESULTS**
Your response after search should look like this and NOTHING MORE:
```
Found 12 issues matching "authentication":

[table of results]

Which to load? (all / 1-5 / 1,3,7)
```

**When user wants to create a Jira issue:**
Examples: "create a jira ticket", "new issue for X", "add a bug for Y", "create story"
→ **READ:** `${PAI_DIR}/.claude/skills/Jira/workflows/create-issue.md`
→ **EXECUTE:** Gather required fields, create issue

**When user wants to update/transition an issue:**
Examples: "move ABC-123 to done", "update issue", "transition to in progress", "add comment to"
→ **READ:** `${PAI_DIR}/.claude/skills/Jira/workflows/manage-issue.md`
→ **EXECUTE:** Update or transition the specified issue

**When user selects items to load (after a search):**
Examples: "load 1,2,5", "load all", "show me 3", "1,2,5", "all"
→ **EXECUTE:** `jira load <selection>` command - this is Turn 2 of the workflow

**When user asks about already-loaded issue details:**
→ **DO NOT** re-query Jira
→ **EXECUTE:** Answer directly from conversation context

---

## When to Activate This Skill

Activate this skill when user:
- Asks about Jira issues, tickets, or backlog
- Wants to search for issues by text, assignee, status, etc.
- Wants to create new issues or tickets
- Wants to update, transition, or comment on issues
- Mentions specific issue keys (ABC-123 format)
- Asks "what's assigned to me" or "my open issues"
- Wants to check Jira project status

**NOT for:** Obsidian vault queries (use Context skill), general task lists, non-Jira project management

---

## Quick Reference

**CLI Path** (run from PAI_DIR):
- `jira`: `cd ${PAI_DIR}/bin/jira && bun run jira.ts`

| User Says | Command | Notes |
|-----------|---------|-------|
| "My open issues" | `jira search --assignee me --status open --format index` | Default project |
| "Search jira for auth" | `jira search "authentication" --format index` | Text search |
| "Issues in INNOV project" | `jira search --project work --format index` | By project |
| "Load 1,2,5" | `jira load 1,2,5` | After search |
| "Show issue ABC-123" | `jira view ABC-123` | Direct view |
| "Create bug for login" | `jira create --type Bug --summary "Login issue"` | Create |
| "Move ABC-123 to Done" | `jira transition ABC-123 "Done"` | Transition |
| "Comment on ABC-123" | `jira comment ABC-123 "Fixed in commit xyz"` | Add comment |
| "What projects?" | `jira projects` | List configured |
| "Jira status" | `jira status` | Health check |

---

## CLI Overview

Single tool for all Jira operations:

| Command | Purpose | Key Flags |
|---------|---------|-----------|
| `search` | Find issues with JQL | `--project`, `--status`, `--assignee`, `--type` |
| `load` | Load issue details into context | Selection from last search |
| `view` | View single issue | Issue key |
| `create` | Create new issue | `--type`, `--summary`, `--description` |
| `update` | Update issue fields | `--assignee`, `--priority`, `--labels` |
| `transition` | Change issue status | Status name |
| `comment` | Add comment | Comment text |
| `projects` | List configured projects | - |
| `status` | Connection health check | - |

---

## 1. SEARCH — Discovery Phase

Find issues matching criteria. Use `--format index` for numbered results.

### Basic Search

```bash
# Text search with numbered index
jira search "deployment bug" --format index

# By assignee
jira search --assignee me --format index
jira search --assignee "john.doe" --format index

# By status
jira search --status open --format index
jira search --status "In Progress" --format index

# By project (configured alias)
jira search --project work --format index    # Uses INNOV project
jira search --project personal --format index # Uses personal Jira

# By type
jira search --type Bug --format index
jira search --type Story --format index
```

### Combined Filters

```bash
# My open bugs in work project
jira search --project work --assignee me --status open --type Bug --format index

# Recent issues
jira search --updated 7d --format index

# Custom JQL
jira search --jql "project = INNOV AND status = 'In Review'" --format index
```

### Output Format

```
📋 Jira Search Results

 #  │ Key      │ Type  │ Status      │ Summary                          │ Assignee
────┼──────────┼───────┼─────────────┼──────────────────────────────────┼─────────
 1  │ INNOV-42 │ Bug   │ Open        │ Login fails with SSO             │ me
 2  │ INNOV-38 │ Story │ In Progress │ Add OAuth2 support               │ me
 3  │ INNOV-35 │ Task  │ Open        │ Update deployment docs           │ unassigned

Load options: "load all", "load 1,2", "load 1-3"
```

---

## 2. LOAD — Injection Phase

Load selected issues from last search into context.

```bash
# Load by selection
jira load 1,2,5              # Specific items
jira load 1-10               # Range
jira load all                # Everything from last search

# Direct view (bypass index)
jira view INNOV-42
```

**Two-Phase Workflow:**
1. `jira search --assignee me --format index` → Shows numbered list
2. `jira load 1,2,5` → Loads full issue details

---

## 3. CREATE — New Issues

```bash
# Basic creation
jira create --type Bug --summary "Login button unresponsive"

# With description
jira create --type Story --summary "Add dark mode" --description "User preference for dark theme"

# With project override
jira create --project personal --type Task --summary "Review insurance docs"

# Pipe description
echo "Detailed bug description..." | jira create --type Bug --summary "API timeout"
```

---

## 4. UPDATE — Modify Issues

```bash
# Update fields
jira update INNOV-42 --assignee "jane.doe"
jira update INNOV-42 --priority High
jira update INNOV-42 --labels "security,urgent"

# Transition status
jira transition INNOV-42 "In Progress"
jira transition INNOV-42 "Done"

# Add comment
jira comment INNOV-42 "Fixed in commit abc123"
jira comment INNOV-42 "Needs review from security team"
```

---

## 5. UTILITIES

```bash
# List configured projects
jira projects

# Health check
jira status

# Show available statuses for project
jira statuses --project work

# Show available issue types
jira types --project work
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_WORK_URL` | Yes | Work Jira instance URL |
| `JIRA_WORK_EMAIL` | Yes | Work Jira email |
| `JIRA_WORK_TOKEN` | Yes | Work Jira API token |
| `JIRA_PERSONAL_URL` | No | Personal Jira instance URL |
| `JIRA_PERSONAL_EMAIL` | No | Personal Jira email |
| `JIRA_PERSONAL_TOKEN` | No | Personal Jira API token |

### Project Configuration

Projects are configured in `${PAI_DIR}/.claude/skills/Jira/projects.json`:

```json
{
  "default": "work",
  "projects": {
    "work": {
      "key": "INNOV",
      "url": "https://company.atlassian.net",
      "description": "Innovation project"
    },
    "personal": {
      "key": "PERS",
      "url": "https://yourname.atlassian.net",
      "description": "Personal Jira"
    }
  }
}
```

---

## Examples by Intent

**"What Jira issues do I have?"**
```bash
jira search --assignee me --status open --format index
# Shows numbered list
jira load all  # Load all for context
```

**"Any bugs in the innovation project?"**
```bash
jira search --project work --type Bug --format index
jira load 1-5  # Load first 5
```

**"Create a story for the new feature"**
```bash
jira create --type Story --summary "Implement user preferences API" --description "REST endpoints for user settings"
```

**"Move INNOV-42 to done and add a comment"**
```bash
jira transition INNOV-42 "Done"
jira comment INNOV-42 "Completed and deployed to staging"
```

**"What's the status of my personal tasks?"**
```bash
jira search --project personal --assignee me --format index
```
