---
name: Jira
description: |
  Jira issue tracking integration via TypeScript CLI.

  USE WHEN: "create issue", "search jira", "update ticket", "find issues",
  "jira status", "transition to done", "add comment", "link issues",
  "what branches are linked", "show PR status".

  Two-phase retrieval: SEARCH (show index, wait) → GET (only when user requests)
---

# Jira Skill

**Purpose:** Search, create, update, and manage Jira issues via CLI.

## Workflow Routing

**When user wants to search/find issues:**
Examples: "search jira for X", "find issues about Y", "what tickets are open", "issues in project Z"
→ **EXECUTE:** `jira search "<query>"` or `jira search --project <PROJECT>`
→ **WAIT:** Show results table, wait for user to select which to load

**When user wants full issue details:**
Examples: "load 1,2,3", "show me PROJ-123", "get details on that ticket"
→ **EXECUTE:** `jira get <KEY>` to load full details

**When user wants to create an issue:**
Examples: "create a ticket for X", "new bug in project Y", "add task for Z"
→ **EXECUTE:** `jira create --project <PROJECT> --type <TYPE> --summary "<summary>"`

**When user wants to update an issue:**
Examples: "update PROJ-123", "change the description", "assign to me"
→ **EXECUTE:** `jira update <KEY> [--summary] [--description] [--assignee]`

**When user wants to transition an issue:**
Examples: "move to done", "start working on PROJ-123", "close this ticket"
→ **EXECUTE:** `jira transition <KEY> "<status>"`

**When user wants to add a comment:**
Examples: "add comment to PROJ-123", "note on that ticket"
→ **EXECUTE:** `jira comment <KEY> "<text>"`

**When user asks about branches/PRs:**
Examples: "what branches are linked", "show PR status", "dev info for PROJ-123"
→ **EXECUTE:** `jira dev <KEY>`

**When user wants to link issues:**
Examples: "link PROJ-123 to PROJ-456", "add to epic", "blocks relationship"
→ **EXECUTE:** `jira link <KEY1> "<type>" <KEY2>` or `jira link <KEY> --epic <EPIC>`

---

## Instance Routing

The CLI supports multiple Jira instances via profiles.

| User Says | Profile Flag |
|-----------|--------------|
| "in work Jira" / "work instance" | `-p work` |
| "in personal Jira" / "my board" | `-p personal` |
| "across all Jira" / "in any instance" | `-p all` |
| (no mention) | Default profile |

**Cross-instance search:**
```bash
jira search "authentication" -p all    # Queries all instances in parallel
```

---

## Quick Reference

| User Says | Command |
|-----------|---------|
| "Search jira for X" | `jira search "X"` |
| "Find issues in project Y" | `jira search --project Y` |
| "Show me PROJ-123" | `jira get PROJ-123` |
| "Create bug for login failure" | `jira create -p PROJECT -t Bug -s "Login failure"` |
| "Move PROJ-123 to done" | `jira transition PROJ-123 "Done"` |
| "Comment on PROJ-123" | `jira comment PROJ-123 "text"` |
| "What projects are available?" | `jira projects` |
| "What can I transition to?" | `jira transitions PROJ-123` |
| "Link PROJ-123 blocks PROJ-456" | `jira link PROJ-123 blocks PROJ-456` |
| "Add PROJ-123 to epic EPIC-100" | `jira link PROJ-123 --epic EPIC-100` |
| "Show branches for PROJ-123" | `jira dev PROJ-123` |
| "Add label 'urgent' to PROJ-123" | `jira label add PROJ-123 urgent` |
| "Search by label" | `jira search --label urgent` |

---

## Two-Phase Workflow

**CRITICAL: Follow the same pattern as Context skill.**

### Phase 1: Search (Discovery)
```bash
jira search "authentication" --format index
```

Returns compact table:
```
| #  | Key      | Type  | Summary                    | Status      | Assignee |
|----|----------|-------|----------------------------|-------------|----------|
| 1  | PROJ-123 | Bug   | Auth token expiring early  | In Progress | alice    |
| 2  | PROJ-456 | Story | Add OAuth2 support         | To Do       | -        |

Which to load? (1,2,3 / all / --type Bug)
```

**STOP AND WAIT** for user selection.

### Phase 2: Load (Detail)
```bash
jira get PROJ-123
```

Returns full issue details with description, comments, links, dev info.

---

## Configuration

Profiles are stored in `bin/jira/profiles/*.env`:

```bash
# profiles/personal.env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_DEFAULT_PROJECT=PROJ
```

Set default profile via symlink:
```bash
ln -sf personal.env profiles/default
```

---

## CLI Help

```bash
jira --help              # Show all commands
jira search --help       # Search command help
jira profiles            # List available profiles
jira config              # Show current configuration
```
