---
name: GitLab
description: Direct GitLab REST API for repositories, pipelines, issues, merge requests, jobs, schedules, and CI/CD variables. USE WHEN gitlab, repos, pipelines, ci/cd, merge requests, issues. CLI-first, token-efficient, no MCP server.
---

# GitLab - Direct REST API Skill

**GitLab integration via direct REST API calls.**

This skill provides CLI tools for interacting with GitLab (gitlab.com or self-hosted). It uses direct API calls instead of an MCP server for:
- Lower context usage (no MCP schema overhead)
- Higher reliability (deterministic execution)
- Token efficiency (focused JSON responses)

---

## Authentication

**Option 1: macOS Keychain (recommended)**
```bash
security add-generic-password -s "gitlab-token" -a "claude-code" -w "<your-token>"
```

**Option 2: Environment Variable**
```bash
export GITLAB_TOKEN=<your-token>
```

**Self-Hosted GitLab:**
```bash
export GITLAB_URL=https://gitlab.example.com/api/v4
```

Create token at: GitLab Settings > Access Tokens > Personal Access Tokens (with `api` scope)

---

## Tool Routing

| Tool | Trigger Keywords | Commands |
|------|------------------|----------|
| **Client** | "ping", "test connection" | `ping` |
| **Repositories** | "repos", "projects", "fork" | `list`, `get`, `create`, `delete`, `fork`, `archive`, `unarchive` |
| **Files** | "files", "tree", "content", "blame" | `tree`, `get`, `create`, `update`, `delete`, `blame` |
| **Branches** | "branches", "compare", "protect" | `list`, `get`, `create`, `delete`, `protect`, `unprotect`, `compare` |
| **Issues** | "issues", "bugs", "tickets" | `list`, `get`, `create`, `update`, `close`, `reopen`, `comment`, `comments` |
| **MergeRequests** | "merge requests", "MRs", "PRs" | `list`, `get`, `create`, `update`, `merge`, `approve`, `close`, `reopen`, `changes`, `comment`, `comments` |
| **Pipelines** | "pipelines", "CI", "builds" | `list`, `get`, `create`, `retry`, `cancel`, `delete` |
| **Jobs** | "jobs", "stages", "artifacts" | `list`, `get`, `log`, `retry`, `cancel`, `play`, `artifacts` |
| **Schedules** | "schedules", "cron", "scheduled" | `list`, `get`, `create`, `update`, `delete`, `run`, `variables`, `set-variable`, `delete-variable` |
| **Variables** | "variables", "secrets", "env vars" | `list`, `get`, `create`, `update`, `delete`, `group-*` |

---

## CLI Commands (Primary Interface)

**Location:** `$PACK_DIR/Tools/`

### Client - Connection Test
```bash
bun run Tools/Client.ts ping
```

### Repositories - Project Management
```bash
bun run Tools/Repositories.ts list [--owned] [--membership] [--search "query"]
bun run Tools/Repositories.ts get <project>
bun run Tools/Repositories.ts create "name" [--namespace <id>] [--visibility private|public]
bun run Tools/Repositories.ts fork <project>
bun run Tools/Repositories.ts archive <project>
```

### Files - Repository Content
```bash
bun run Tools/Files.ts tree <project> [--path "dir"] [--ref "branch"]
bun run Tools/Files.ts get <project> <file_path> [--ref "branch"]
bun run Tools/Files.ts create <project> <file_path> --content "..." --message "..."
bun run Tools/Files.ts blame <project> <file_path>
```

### Branches - Branch Management
```bash
bun run Tools/Branches.ts list <project>
bun run Tools/Branches.ts create <project> <branch> --ref "main"
bun run Tools/Branches.ts compare <project> --from "main" --to "feature"
bun run Tools/Branches.ts protect <project> <branch>
```

### Issues - Issue Tracking
```bash
bun run Tools/Issues.ts list <project> [--state opened|closed]
bun run Tools/Issues.ts create <project> "title" [--description "..."] [--labels "bug,urgent"]
bun run Tools/Issues.ts close <project> <issue_iid>
bun run Tools/Issues.ts comment <project> <issue_iid> "comment body"
```

### MergeRequests - Code Review
```bash
bun run Tools/MergeRequests.ts list <project> [--state opened]
bun run Tools/MergeRequests.ts create <project> --source "feature" --target "main" "MR title"
bun run Tools/MergeRequests.ts merge <project> <mr_iid> [--squash] [--delete-source]
bun run Tools/MergeRequests.ts approve <project> <mr_iid>
bun run Tools/MergeRequests.ts changes <project> <mr_iid>
```

### Pipelines - CI/CD Pipelines
```bash
bun run Tools/Pipelines.ts list <project> [--status running|failed|success]
bun run Tools/Pipelines.ts create <project> --ref "main"
bun run Tools/Pipelines.ts retry <project> <pipeline_id>
bun run Tools/Pipelines.ts cancel <project> <pipeline_id>
```

### Jobs - Pipeline Jobs
```bash
bun run Tools/Jobs.ts list <project> --pipeline <id>
bun run Tools/Jobs.ts log <project> <job_id> [--tail 100]
bun run Tools/Jobs.ts retry <project> <job_id>
bun run Tools/Jobs.ts play <project> <job_id>
bun run Tools/Jobs.ts artifacts <project> <job_id>
```

### Schedules - Scheduled Pipelines
```bash
bun run Tools/Schedules.ts list <project>
bun run Tools/Schedules.ts create <project> "Nightly build" --ref "main" --cron "0 0 * * *"
bun run Tools/Schedules.ts run <project> <schedule_id>
```

### Variables - CI/CD Variables
```bash
bun run Tools/Variables.ts list <project>
bun run Tools/Variables.ts create <project> API_KEY "secret" [--protected] [--masked]
bun run Tools/Variables.ts group-list <group>
```

---

## Project Identifiers

Most commands accept project in two formats:
- **Numeric ID:** `12345`
- **Path:** `group/project` or `group/subgroup/project`

Examples:
```bash
bun run Tools/Repositories.ts get 12345
bun run Tools/Repositories.ts get "mygroup/myproject"
bun run Tools/Issues.ts list "myorg/backend/api"
```

---

## Workflow Routing

| Workflow | Trigger | Reference |
|----------|---------|-----------|
| CodeReview | "review MR", "check pipeline", "approve" | `Workflows/CodeReview.md` |
| IssueTracking | "create issue", "list bugs", "close issue" | `Workflows/IssueTracking.md` |
| CIDebugging | "why did build fail", "job logs", "retry" | `Workflows/CIDebugging.md` |
| BranchOps | "create branch", "compare branches", "protect" | `Workflows/BranchOps.md` |
| ReleaseMgmt | "trigger pipeline", "deploy", "schedule" | `Workflows/ReleaseMgmt.md` |

---

## Examples

**Example 1: Check pipeline status**
```
User: "Why did the pipeline fail?"

-> bun run Tools/Pipelines.ts list mygroup/myproject --status failed --limit 1
-> Get pipeline ID from result
-> bun run Tools/Jobs.ts list mygroup/myproject --pipeline <id>
-> Find failed job
-> bun run Tools/Jobs.ts log mygroup/myproject <job_id> --tail 50
-> Report failure reason
```

**Example 2: Create and merge MR**
```
User: "Create MR from feature-x to main"

-> bun run Tools/MergeRequests.ts create mygroup/myproject --source "feature-x" --target "main" "Add feature X"
-> Return MR URL
```

**Example 3: List open issues**
```
User: "What issues are open in the backend repo?"

-> bun run Tools/Issues.ts list backend/api --state opened --limit 20
-> Present list with titles, labels, assignees
```

**Example 4: Retry failed pipeline**
```
User: "Retry the failed pipeline on main"

-> bun run Tools/Pipelines.ts list myproject --ref main --status failed --limit 1
-> bun run Tools/Pipelines.ts retry myproject <pipeline_id>
-> Return new pipeline URL
```
