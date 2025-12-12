# CLI Reference

Complete reference for the `jira` command-line tool.

## Global Options

These options apply to all commands:

| Flag | Short | Description |
|------|-------|-------------|
| `--profile <name>` | `-p` | Use specific profile (or `all` for cross-instance) |
| `--format <type>` | `-f` | Output format: `table`, `json`, `markdown` |
| `--help` | `-h` | Show help |

---

## Search Commands

### `jira search`

Search for issues using text or JQL.

```bash
# Text search (converted to JQL)
jira search "authentication bug"

# Direct JQL
jira search "project = PROJ AND status = 'In Progress'"

# With filters
jira search "API" --project PROJ --type Bug --status "In Progress"

# Cross-instance
jira search "deployment" -p all

# With labels
jira search --label urgent --label high-priority

# Limit results
jira search "bug" --limit 20
```

**Options:**

| Flag | Description |
|------|-------------|
| `--project <key>` | Filter by project |
| `--type <type>` | Filter by issue type (Bug, Story, Task, etc.) |
| `--status <status>` | Filter by status |
| `--assignee <user>` | Filter by assignee |
| `--label <label>` | Filter by label (can use multiple) |
| `--any-label <labels...>` | Match any of these labels (OR logic) |
| `--limit <n>` | Max results (default: 20) |
| `--format <type>` | Output format |

**Output (table format):**

```
| #  | Key      | Type  | Summary                    | Status      | Assignee |
|----|----------|-------|----------------------------|-------------|----------|
| 1  | PROJ-123 | Bug   | Auth token expiring early  | In Progress | alice    |
| 2  | PROJ-456 | Story | Add OAuth2 support         | To Do       | -        |

Which to load? (1,2,3 / all / --type Bug)
```

---

### `jira get`

Get full details for a specific issue.

```bash
jira get PROJ-123

# From specific instance
jira get PROJ-123 -p work

# JSON output
jira get PROJ-123 --format json
```

**Output includes:**
- Key, Type, Status, Priority
- Summary and Description
- Assignee and Reporter
- Labels
- Links (blocks, is blocked by, epic)
- Comments (last 5)
- Dev info (branches, PRs)

---

## Write Commands

### `jira create`

Create a new issue.

```bash
# Minimal
jira create --project PROJ --type Bug --summary "Login fails on Safari"

# With description
jira create -p PROJ -t Story -s "Add dark mode" \
  --description "Users want dark mode support"

# With assignee and labels
jira create -p PROJ -t Task -s "Update docs" \
  --assignee alice \
  --labels documentation,urgent

# As sub-task
jira create -p PROJ -t Sub-task -s "Write tests" \
  --parent PROJ-123

# Under epic
jira create -p PROJ -t Story -s "New feature" \
  --epic PROJ-100
```

**Options:**

| Flag | Short | Required | Description |
|------|-------|----------|-------------|
| `--project <key>` | `-p` | Yes* | Project key |
| `--type <type>` | `-t` | Yes | Issue type |
| `--summary <text>` | `-s` | Yes | Issue summary |
| `--description <text>` | `-d` | No | Issue description |
| `--assignee <user>` | `-a` | No | Assignee username |
| `--labels <labels>` | `-l` | No | Comma-separated labels |
| `--parent <key>` | | No | Parent issue (for sub-tasks) |
| `--epic <key>` | | No | Epic to add issue to |
| `--priority <priority>` | | No | Priority (Highest, High, Medium, Low, Lowest) |

*Uses default project if not specified.

---

### `jira update`

Update an existing issue.

```bash
# Update summary
jira update PROJ-123 --summary "New summary"

# Update description
jira update PROJ-123 --description "Updated description"

# Change assignee
jira update PROJ-123 --assignee bob

# Add labels
jira update PROJ-123 --add-labels urgent,reviewed

# Remove labels
jira update PROJ-123 --remove-labels wontfix
```

**Options:**

| Flag | Description |
|------|-------------|
| `--summary <text>` | New summary |
| `--description <text>` | New description |
| `--assignee <user>` | New assignee |
| `--add-labels <labels>` | Labels to add |
| `--remove-labels <labels>` | Labels to remove |
| `--priority <priority>` | New priority |

---

### `jira transition`

Change issue status.

```bash
# Transition to status
jira transition PROJ-123 "Done"
jira transition PROJ-123 "In Progress"

# See available transitions first
jira transitions PROJ-123
```

---

### `jira comment`

Add a comment to an issue.

```bash
jira comment PROJ-123 "This is my comment"

# Multi-line (use quotes)
jira comment PROJ-123 "Line 1
Line 2
Line 3"
```

---

## Discovery Commands

### `jira projects`

List accessible projects.

```bash
jira projects

# From specific instance
jira projects -p work

# All instances
jira projects -p all
```

**Output:**

```
| Key  | Name              | Lead    |
|------|-------------------|---------|
| PROJ | Main Project      | alice   |
| API  | API Development   | bob     |
```

---

### `jira types`

List issue types for a project.

```bash
jira types --project PROJ

# Or use default project
jira types
```

**Output:**

```
| Name     | Subtask |
|----------|---------|
| Bug      | No      |
| Story    | No      |
| Task     | No      |
| Epic     | No      |
| Sub-task | Yes     |
```

---

### `jira transitions`

List available transitions for an issue.

```bash
jira transitions PROJ-123
```

**Output:**

```
| ID | Name          | To Status   |
|----|---------------|-------------|
| 11 | Start Work    | In Progress |
| 21 | Done          | Done        |
| 31 | Won't Do      | Won't Do    |
```

---

## Link Commands

### `jira link`

Create a link between issues.

```bash
# Standard link
jira link PROJ-123 blocks PROJ-456
jira link PROJ-123 "is blocked by" PROJ-456
jira link PROJ-123 "relates to" PROJ-456

# Add to epic
jira link PROJ-123 --epic EPIC-100
```

---

### `jira unlink`

Remove a link between issues.

```bash
jira unlink PROJ-123 PROJ-456
```

---

### `jira links`

Show all links on an issue.

```bash
jira links PROJ-123
```

**Output:**

```
| Type       | Direction | Issue     | Summary              |
|------------|-----------|-----------|----------------------|
| blocks     | outward   | PROJ-456  | Blocked feature      |
| Epic Link  | inward    | EPIC-100  | Q4 Roadmap           |
```

---

### `jira link-types`

List available link types.

```bash
jira link-types
```

**Output:**

```
| Name       | Inward           | Outward          |
|------------|------------------|------------------|
| Blocks     | is blocked by    | blocks           |
| Clones     | is cloned by     | clones           |
| Duplicate  | is duplicated by | duplicates       |
| Relates    | relates to       | relates to       |
```

---

## Label Commands

### `jira labels`

List all labels in the instance.

```bash
jira labels

# From specific instance
jira labels -p work
```

---

### `jira label add`

Add labels to an issue.

```bash
jira label add PROJ-123 urgent
jira label add PROJ-123 reviewed documentation
```

---

### `jira label remove`

Remove labels from an issue.

```bash
jira label remove PROJ-123 wontfix
```

---

## GitHub Integration

### `jira dev`

Show development information for an issue.

```bash
jira dev PROJ-123

# Branches only
jira dev PROJ-123 --branches

# Pull requests only
jira dev PROJ-123 --prs

# Suggest branch name
jira dev PROJ-123 --create-branch
```

**Output:**

```
Development Info for PROJ-123
=============================

Branches (2):
  - feature/PROJ-123-auth-fix (repo: myapp)
  - PROJ-123-hotfix (repo: myapp)

Pull Requests (1):
  - #42: Fix authentication (MERGED)
    https://github.com/org/myapp/pull/42

Commits: 5

Suggested branch name: feature/PROJ-123-login-fails-on-safari
```

---

## Configuration Commands

### `jira profiles`

List configured profiles.

```bash
jira profiles
```

**Output:**

```
| Name     | URL                              | Default |
|----------|----------------------------------|---------|
| personal | https://me.atlassian.net         | *       |
| work     | https://company.atlassian.net    |         |
```

---

### `jira config`

Show current configuration.

```bash
jira config

# Show specific profile
jira config -p work
```

**Output:**

```
Profile: personal (default)
URL: https://me.atlassian.net
Username: me@example.com
Default Project: PROJ
```

---

## Output Formats

### Table (default)

Human-readable table format.

```bash
jira search "bug" --format table
```

### JSON

Machine-readable JSON.

```bash
jira search "bug" --format json
```

### Markdown

For inclusion in notes or documentation.

```bash
jira get PROJ-123 --format markdown
```

---

## Examples by Use Case

### Find and fix a bug

```bash
# 1. Search for bugs
jira search "login" --type Bug --status "To Do"

# 2. Get details on one
jira get PROJ-123

# 3. Start working
jira transition PROJ-123 "In Progress"

# 4. Create branch (see suggested name)
jira dev PROJ-123 --create-branch

# 5. Add comment when done
jira comment PROJ-123 "Fixed in PR #42"

# 6. Close it
jira transition PROJ-123 "Done"
```

### Create a feature with subtasks

```bash
# 1. Create the story
jira create -p PROJ -t Story -s "Add dark mode" --epic PROJ-100

# Output: Created PROJ-456

# 2. Add subtasks
jira create -p PROJ -t Sub-task -s "Design mockups" --parent PROJ-456
jira create -p PROJ -t Sub-task -s "Implement CSS" --parent PROJ-456
jira create -p PROJ -t Sub-task -s "Write tests" --parent PROJ-456
```

### Cross-instance status check

```bash
# Find all your in-progress issues across all Jira instances
jira search "assignee = currentUser() AND status = 'In Progress'" -p all
```

### Label-based workflow

```bash
# Find urgent items
jira search --label urgent --label p0

# Add review label
jira label add PROJ-123 needs-review

# Find items needing review
jira search --label needs-review --assignee me
```
