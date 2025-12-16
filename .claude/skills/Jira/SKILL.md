---
name: Jira
description: |
  Jira issue tracking integration via TypeScript CLI.

  USE WHEN: "create issue", "search jira", "update ticket", "find issues",
  "jira status", "transition to done", "add comment", "link issues",
  "what branches are linked", "show PR status", "change issue type",
  "show my filters", "use saved filter", "search with filter",
  "open issues in HD", "my open tickets", "created today", "unassigned".

  Two-phase retrieval: SEARCH (show index, wait) → LOAD (only when user requests)

  Profile auto-detection: CLI automatically selects profile based on project key.
  Quick filters: Built-in Service Desk filters (open, my open, created today, etc.)
---

# Jira Skill

**Purpose:** Search, create, update, and manage Jira issues via CLI.

## Workflow Routing

**When user wants to search/find issues:**
Examples: "search jira for X", "find issues about Y", "what tickets are open", "issues in project Z"
→ **EXECUTE:** `jira search "<query>"` or `jira search --project <PROJECT>`
→ **ORDER:** Add `--order <field>` (updated, created, key, priority, status) and `--asc` for ascending
→ **WAIT:** Show results table, wait for user to select

**When user wants to load/view issues:**
Examples: "load 1,2,3", "show me PROJ-123", "get details on that ticket", "load all as JSON"
→ **EXECUTE:** `jira load <key|indices|all>` - loads full details
→ **NOTE:** Use `--format json` for structured context, `--vision` for image analysis

**When user wants to work on/interact with an issue:**
Examples: "open PROJ-123", "work on that ticket", "I want to update PROJ-456"
→ **EXECUTE:** `jira open <KEY|index>` - opens ticket for single-ticket operations
→ **THEN:** `update`, `comment`, `transition` work on opened ticket without key
→ **FINALLY:** `jira close` when done

**When user asks what ticket is open:**
Examples: "what's open", "current ticket", "status"
→ **EXECUTE:** `jira status` - shows currently opened ticket

**When user wants to create an issue:**
Examples: "create a ticket for X", "new bug in project Y", "add task for Z"
→ **EXECUTE:** `jira create --project <PROJECT> --type <TYPE> --summary "<summary>"`

**When user wants to update an issue:**
Examples: "update PROJ-123", "change the description", "assign to me", "change type to Epic"
→ **EXECUTE:** `jira update <KEY> [--summary] [--description] [--assignee] [--type]`

**When user wants to change issue type:**
Examples: "change SMS-123 to Epic", "convert to Story", "make it a Bug"
→ **EXECUTE:** `jira update <KEY> --type <TYPE>`

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

**When user wants to manage labels:**
Examples: "add label urgent", "remove label", "what labels are on this"
→ **EXECUTE:** `jira label add <KEY> <label>` or `jira label remove <KEY> <label>`

**When user wants to use saved filters:**
Examples: "show my filters", "list jira filters", "use my sprint filter", "search with filter"
→ **EXECUTE:** `jira filters` - list favourite/saved filters
→ **THEN:** `jira search --filter "<name>"` - search using a saved filter

**When user wants quick/default filters:**
Examples: "show open issues in HD", "my open tickets", "what was created today", "unassigned issues"
→ **EXECUTE:** `jira search --quick "<filter>" --project <PROJECT>`
→ **LIST:** `jira search --quick list` - show available quick filters

**Quick Filter Reference:**
| User Says | Quick Filter |
|-----------|--------------|
| "open issues" | `--quick "open"` |
| "my open issues" | `--quick "my open"` |
| "assigned to me" | `--quick "assigned to me"` |
| "unassigned" | `--quick "unassigned"` |
| "reported by me" | `--quick "reported by me"` |
| "done/completed" | `--quick "done"` |
| "created today" | `--quick "created today"` |
| "updated recently" | `--quick "updated recently"` |
| "high priority" | `--quick "high priority"` |

---

## Instance Routing (Profile Selection)

The CLI supports multiple Jira instances via profiles. **Auto-detection** selects the correct profile based on project key.

### Automatic Profile Detection

When `JIRA_PROJECTS` is configured in profiles, the CLI auto-detects:

```bash
jira get SMS-123              # Auto-selects personal (SMS is in personal.env)
jira get ETG-456              # Auto-selects work (ETG is in work.env)
```

### Manual Profile Override

| User Says | Profile Flag |
|-----------|--------------|
| "in work Jira" / "work instance" | `-p work` |
| "in personal Jira" / "my board" | `-p personal` |
| "across all Jira" / "in any instance" | `-p all` |
| (no mention) | Auto-detect or default profile |

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
| "Show oldest first" | `jira search --order created --asc` |
| "Order by priority" | `jira search --order priority` |
| "Newest issues first" | `jira search --order created` |
| "Load issues 1,2,5" | `jira load 1,2,5` |
| "Load all as JSON" | `jira load all -f json` |
| "Show me PROJ-123" | `jira load PROJ-123` |
| "Open PROJ-123 to work on it" | `jira open PROJ-123` |
| "Open #3 from search" | `jira open 3` |
| "What ticket is open?" | `jira status` |
| "Done with this ticket" | `jira close` |
| "Create bug for login failure" | `jira create -P PROJECT -T Bug -s "Login failure"` |
| "Create story under epic" | `jira create -T Story -s "Feature" --epic EPIC-100` |
| "Create subtask" | `jira create -T Subtask -s "Task" --parent PROJ-123` |
| "Move PROJ-123 to done" | `jira transition PROJ-123 "Done"` |
| "Change to Epic" | `jira update PROJ-123 --type Epic` |
| "Comment on PROJ-123" | `jira comment PROJ-123 "text"` |
| "What projects are available?" | `jira projects` |
| "What can I transition to?" | `jira transitions PROJ-123` |
| "Link PROJ-123 blocks PROJ-456" | `jira link PROJ-123 blocks PROJ-456` |
| "Add PROJ-123 to epic EPIC-100" | `jira link PROJ-123 --epic EPIC-100` |
| "Show branches for PROJ-123" | `jira dev PROJ-123` |
| "Add label 'urgent' to PROJ-123" | `jira label add PROJ-123 urgent` |
| "Remove label from issue" | `jira label remove PROJ-123 urgent` |
| "Search by label" | `jira search --label urgent` |
| "Search across all instances" | `jira search "query" -p all` |
| "Show my saved filters" | `jira filters` |
| "Show filters by owner" | `jira filters "name" --owner "Paige"` |
| "Show only my filters" | `jira filters "name" --mine` |
| "Search using my filter" | `jira search --filter "Filter Name"` |
| "Use filter by ID" | `jira search --filter 12345` |
| "Open issues in HD" | `jira search --quick "open" -P HD` |
| "My open HD tickets" | `jira search --quick "my open" -P HD` |
| "Created today in HD" | `jira search --quick "created today" -P HD` |
| "Unassigned HD tickets" | `jira search --quick "unassigned" -P HD` |
| "High priority open" | `jira search --quick "high priority" -P HD` |
| "List quick filters" | `jira search --quick list` |
| "Analyze screenshots in ticket" | `jira load PROJ-123 --vision` |

---

## Two-Phase Workflow

**CRITICAL: Follow the same pattern as Context skill.**

🚫 **NEVER AUTO-LOAD:** After search, STOP and wait for user to select items.

### Phase 1: Search (Discovery)
```bash
jira search "authentication"
```

Returns compact table with useful fields:
```
#  Key       Type   Summary                      Status       Created     Labels
─────────────────────────────────────────────────────────────────────────────────────
1  PROJ-123  Bug    Auth token expiring early    In Progress  2025-12-10  security, urgent
2  PROJ-456  Story  Add OAuth2 support           To Do        2025-12-08  authentication

Which to load? (jira load <KEY> / jira load 1,2,5 / jira load all -f json)
```

**STOP AND WAIT** for user selection.

### Phase 2: Load (Detail)

```bash
jira load PROJ-123           # By key
jira load 1,2,5              # By index from search
jira load 1-10               # Range from search
jira load all                # All from search
jira load all -f json        # JSON for context loading
jira load PROJ-123 --vision  # With image analysis
```

Returns full issue details with description, comments, links, dev info.

**JSON format** is structured for context loading:
```json
[{
  "key": "PROJ-123",
  "summary": "...",
  "description": "...",
  "comments": [...]
}]
```

---

## Single-Ticket Workflow (Open/Close)

For safe, one-at-a-time ticket interaction:

```bash
# 1. Search and find tickets
jira search "authentication bugs"

# 2. Open ONE ticket to work on
jira open 3                    # Open #3 from search
# or: jira open SMS-123        # Open by key

# 3. Perform operations (no key needed)
jira update --summary "Fixed auth bug"
jira comment "Root cause was expired token"
jira transition "Done"

# 4. Close when done
jira close
```

**Why single-ticket mode?**
- Prevents accidental bulk modifications
- Clear context for each operation
- Safe for work/production instances
- Operations confirm which ticket they're modifying

**Commands show opened ticket:**
```
Updating opened ticket: SMS-123
Updated SMS-123
```

---

## Configuration

### Initial Setup

**First-time setup for new installations:**

```bash
# 1. Create profiles directory
mkdir -p ~/.claude/jira/profiles

# 2. Create profile files (one per Jira instance)
# See "Profile Format" below

# 3. Run setup to discover projects (optional but recommended)
jira setup

# 4. Set default profile
cd ~/.claude/jira/profiles && ln -sf personal.env default
```

### Profile Location

Profiles are stored in `~/.claude/jira/profiles/` for persistence across branch checkouts.

**Why?** Profile files contain API tokens and are gitignored. Storing them in `~/.claude/` ensures they survive `git checkout` operations.

### Profile Format

```bash
# ~/.claude/jira/profiles/personal.env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_DEFAULT_PROJECT=PROJ
JIRA_PROJECTS=PROJ,SMS,PAI      # Projects this profile handles (for auto-detection)
```

**Required fields:**
- `JIRA_URL` - Your Jira instance URL
- `JIRA_USERNAME` - Your Atlassian account email
- `JIRA_API_TOKEN` - API token from https://id.atlassian.com/manage-profile/security/api-tokens

**Optional fields:**
- `JIRA_DEFAULT_PROJECT` - Default project when `--project` not specified
- `JIRA_PROJECTS` - Comma-separated list of projects for auto-detection

### Setup Command (Project Discovery)

After configuring profiles, run setup to auto-discover projects:

```bash
jira setup                      # Discover projects for all profiles
jira setup -p personal          # Just one profile
```

Setup will:
1. Query each Jira instance for accessible projects
2. Display discovered projects for confirmation
3. Write `JIRA_PROJECTS=...` to profile files

**Note:** Setup is optional. You can manually edit `JIRA_PROJECTS` or always use `-p` flag.

### Default Profile

Set default profile via symlink:
```bash
cd ~/.claude/jira/profiles && ln -sf personal.env default
```

When no `-p` flag and project not auto-detected, the default profile is used.

---

## Update Options

The update command supports multiple field changes:

```bash
jira update <KEY> [options]

Options:
  --summary, -s <text>     New summary
  --description, -d <text> New description
  --assignee, -a <user>    New assignee (account ID)
  --type, -t <type>        Change issue type (Task, Story, Epic, Bug, Subtask)
  --priority <name>        New priority
  --labels <l1,l2>         Replace all labels
  --label <label>          Add single label (repeatable)
```

**Examples:**
```bash
jira update SMS-123 --type Epic                    # Change to Epic
jira update SMS-123 --summary "New title"          # Change summary
jira update SMS-123 --type Story --priority High   # Multiple changes
```

---

## CLI Help

```bash
jira --help              # Show all commands
jira search --help       # Search command help
jira profiles            # List available profiles
jira config              # Show current configuration
jira config -p work      # Show specific profile config
jira setup               # Discover and configure projects
```

---

## Troubleshooting

**"No Jira configuration found"**
- Create a profile in `~/.claude/jira/profiles/`
- Or set a default: `ln -sf personal.env default`

**"Profile not found: X"**
- Check `jira profiles` for available profiles
- Create the missing profile .env file

**"Authentication failed"**
- Verify `JIRA_API_TOKEN` is correct
- Generate new token at https://id.atlassian.com/manage-profile/security/api-tokens

**Search returns wrong project's issues**
- Ensure JQL syntax is correct: `project = SMS` (not `project: SMS`)
- Check profile has correct `JIRA_URL`

---

## Vision Support for Screenshots

Service Desk tickets often contain embedded screenshots that are hard to understand from filenames alone:
```
!image-20251216-023637.png|width=1087,alt="screenshot"!
```

The `--vision` flag analyzes image attachments using OpenAI Vision API:

```bash
jira load HD-210123 --vision         # Analyze images in ticket
jira load 1,2,3 --vision             # Batch analyze from search
jira load all --vision -f json       # JSON with vision analysis
jira open HD-210123 --vision         # Open with vision analysis
```

**Requirements:**
- `OPENAI_API_KEY` in environment or `~/.claude/.env`
- Supports: PNG, JPEG, GIF, WebP

**Output:**
```
Image Attachments (3):
────────────────────────────────────────
  screenshot-error.png
    → Shows a dialog box with error "Connection timeout" and retry button.
  user-interface.png
    → Admin panel showing user permissions table with role assignments.
```

**Configuration:**
- `OPENAI_VISION_MODEL` - Model to use (default: gpt-5.2)
- `OPENAI_VISION_MAX_TOKENS` - Max response tokens (default: 300)
- Limits to first 5 images per ticket to manage API costs

---

## Saved Filters

Jira filters are saved JQL queries that can be starred as favourites. Use them for complex, reusable searches.

### List Filters

```bash
jira filters                     # List favourite filters (starred in Jira)
jira filters "sprint"            # Search filters by name
jira filters "HD" --owner "Paige"  # Filter by owner name
jira filters "HD" --mine         # Show only your filters
jira filters -f json             # JSON output for automation
```

**Output:**
```
Favourite filters:

#  ID       Name                                    Owner
─────────────────────────────────────────────────────────────────────────
★ 1  12345    My Active Issues                        Andreas
★ 2  12346    Current Sprint                          Andreas
★ 3  12347    Bugs in Review                          Andreas

Use with search: jira search --filter "My Active Issues"
Or by ID:        jira search --filter 12345
```

### Search Using Filter

```bash
jira search --filter "My Active Issues"     # By name
jira search --filter 12345                   # By ID
jira search --filter "Sprint" --limit 50     # With options
```

The filter's JQL is retrieved and used for the search. Additional options like `--limit` can be combined.

**Note:** Filters are tied to the Jira instance, so cross-instance search (`-p all`) cannot use `--filter`.

---

## Future Enhancements

### Service Desk / Help Desk Projects

Additional fields to support:
- Priority, Request type, Components, Support team
- Request category, Request participants
- Custom fields specific to the project

For high-volume scenarios:
- Filter by priority: `jira search --priority High`
- Filter by component: `jira search --component "API"`
- Summary statistics by status/priority
