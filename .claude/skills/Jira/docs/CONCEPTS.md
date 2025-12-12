# Concepts

Core concepts behind the Jira skill architecture.

## CLI-First Architecture

Following PAI's deterministic-first principle, the Jira skill is built as:

```
Goal: Jira integration
    ↓
Code: bin/jira/jira.ts (TypeScript CLI)
    ↓
CLI: jira search|create|update|transition
    ↓
Prompts: SKILL.md translates natural language → CLI
    ↓
Agents: Claude executes workflows
```

**Why CLI-first?**
- **Deterministic:** Same input → same output, testable without AI
- **Scriptable:** Can be used in automation, CI/CD, scripts
- **Debuggable:** Easy to test commands directly
- **Composable:** Combine with other CLI tools (`|`, `xargs`, etc.)

---

## Multi-Instance Profiles

The CLI supports multiple Jira instances through profile files.

### Profile Structure

```
bin/jira/
├── profiles/              ← Your profiles (gitignored)
│   ├── personal.env
│   ├── work.env
│   └── default → personal.env  (symlink)
└── profiles.example/      ← Template (example.env.template)
    └── example.env.template
```

### Profile Contents

```bash
# profiles/personal.env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_DEFAULT_PROJECT=PROJ
```

### Profile Selection

| Command | Profile Used |
|---------|--------------|
| `jira search "bug"` | Default profile |
| `jira search "bug" -p work` | Work profile |
| `jira search "bug" -p personal` | Personal profile |
| `jira search "bug" -p all` | All profiles (parallel) |

### Default Profile

Set via symlink:
```bash
ln -sf personal.env profiles/default
```

Or set `JIRA_DEFAULT_PROFILE` environment variable.

### Fallback Chain

1. `-p <profile>` flag
2. `profiles/default` symlink
3. Environment variables (`JIRA_URL`, etc.)

---

## Two-Phase Retrieval

Inspired by the Context skill's `obs search` → `obs load` pattern.

### The Problem

Loading full details for 50 issues:
- Wastes tokens (descriptions, comments, links)
- Slow API calls
- Information overload

### The Solution

**Phase 1: Search (Discovery)**
```bash
jira search "authentication"
```

Returns compact index:
```
| #  | Key      | Type  | Summary                    | Status      |
|----|----------|-------|----------------------------|-------------|
| 1  | PROJ-123 | Bug   | Auth token expiring        | In Progress |
| 2  | PROJ-456 | Story | Add OAuth2 support         | To Do       |
```

**Phase 2: Load (Detail)**
```bash
jira get PROJ-123
```

Returns full details for selected issue(s).

### Claude Integration

When Claude searches Jira:
1. Runs `jira search` → shows table
2. **Waits** for user to select items
3. User says "load 1,2" → runs `jira get`

This keeps context window lean.

---

## Cross-Instance Search

Query all configured profiles in parallel.

### How It Works

```bash
jira search "deployment" -p all
```

1. Loads all profiles from `profiles/`
2. Sends search to each instance in parallel
3. Merges results with instance indicator
4. Handles timeouts gracefully (shows partial results)

### Output

```
| #  | Instance | Key       | Summary              | Status |
|----|----------|-----------|----------------------|--------|
| 1  | personal | SIDE-42   | Deploy v2.0          | To Do  |
| 2  | work     | PROJ-789  | Production deploy    | Done   |
```

### Auto-Detection

When you `jira get PROJ-123`, the CLI:
1. Checks cached project→instance mapping
2. If known, uses that instance
3. If unknown, queries all instances

This means you can usually omit `-p` for `get` operations.

---

## Labels as Tags

Use Jira labels like Obsidian vault tags.

### Taxonomy Alignment

If your vault uses tags like:
- `#project/pai`
- `#status/blocked`
- `#priority/p0`

Use matching Jira labels:
- `project-pai`
- `status-blocked`
- `priority-p0`

### Label Operations

```bash
# List all labels
jira labels

# Search by label
jira search --label priority-p0
jira search --any-label urgent blocked  # OR logic

# Add/remove labels
jira label add PROJ-123 needs-review
jira label remove PROJ-123 wontfix
```

### AND vs OR Logic

```bash
# AND: issues with BOTH labels
jira search --label urgent --label p0

# OR: issues with ANY of the labels
jira search --any-label urgent p0 blocked
```

---

## Issue Hierarchy

Jira supports issue hierarchy:

```
Epic (EPIC-100)
├── Story (PROJ-123)
│   ├── Sub-task (PROJ-124)
│   └── Sub-task (PROJ-125)
└── Story (PROJ-126)
```

### Creating Hierarchy

```bash
# Create story under epic
jira create -t Story -s "New feature" --epic EPIC-100

# Create sub-task under story
jira create -t Sub-task -s "Write tests" --parent PROJ-123
```

### Linking to Epic

```bash
# Add existing issue to epic
jira link PROJ-123 --epic EPIC-100
```

---

## GitHub Integration

The dev panel shows branches, PRs, and commits linked to issues.

### How Linking Works

1. Include issue key in branch name: `feature/PROJ-123-fix-auth`
2. Include issue key in PR title or description
3. Jira automatically links via GitHub integration

### Viewing Dev Info

```bash
jira dev PROJ-123
```

Shows:
- Branches containing the issue key
- Pull requests referencing the issue
- Commit count
- PR status (Open, Merged, Declined)

### Branch Name Suggestion

```bash
jira dev PROJ-123 --create-branch
```

Suggests: `feature/PROJ-123-summary-as-slug`

---

## Authentication

### API Token (Current)

Uses Basic Auth with API token:

```
Authorization: Basic base64(email:api_token)
```

Get token from: https://id.atlassian.com/manage-profile/security/api-tokens

### OAuth 2.0 (Future)

Enterprise SSO integration planned for v1.1.

---

## API Reference

The CLI wraps Jira REST API v3:

| Operation | Endpoint |
|-----------|----------|
| Search | `GET /rest/api/3/search` |
| Get Issue | `GET /rest/api/3/issue/{key}` |
| Create Issue | `POST /rest/api/3/issue` |
| Update Issue | `PUT /rest/api/3/issue/{key}` |
| Transitions | `GET /rest/api/3/issue/{key}/transitions` |
| Transition | `POST /rest/api/3/issue/{key}/transitions` |
| Comment | `POST /rest/api/3/issue/{key}/comment` |
| Link Types | `GET /rest/api/3/issueLinkType` |
| Create Link | `POST /rest/api/3/issueLink` |
| Dev Info | `GET /rest/dev-status/latest/issue/detail` |
| Projects | `GET /rest/api/3/project` |
| Issue Types | `GET /rest/api/3/issuetype` |

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid credentials | Check API token |
| 403 Forbidden | No permission | Check project access |
| 404 Not Found | Issue doesn't exist | Check issue key |
| 400 Bad Request | Invalid input | Check field values |

### Profile Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No profiles found" | No `.env` files | Create profile |
| "Profile not found" | Typo in `-p` | Check profile name |
| "Missing JIRA_URL" | Incomplete profile | Check profile contents |

### Network Errors

The CLI has a 30-second timeout. For cross-instance search, partial results are returned if some instances timeout.
