---
name: Kai GitLab Skill
pack-id: mai-gitlab-skill-v1.0.0
version: 1.0.0
author: PAI Community
description: Direct GitLab REST API integration for repositories, pipelines, issues, merge requests, jobs, schedules, and CI/CD variables - CLI-first with token-efficient design, no MCP server
type: skill
purpose-type: [devops, automation, cicd]
platform: claude-code
dependencies: []
keywords: [gitlab, repositories, pipelines, ci-cd, merge-requests, issues, jobs, schedules, variables, devops]
---

# Kai GitLab Skill

> Direct GitLab REST API integration with CLI-first design for DevOps workflows

## Installation Prompt

You are receiving a PAI Pack - a modular upgrade for AI agent systems.

**What is PAI?** See: [PAI Project Overview](../README.md#what-is-pai)

**What is a Pack?** See: [Pack System](../README.md#the-journey-pai-v1x--v20)

This pack adds GitLab integration to your AI infrastructure. Unlike MCP-based approaches, it uses direct REST API calls for:

- **Lower context usage** - No MCP schema overhead
- **Higher reliability** - Deterministic CLI execution
- **Token efficiency** - Focused JSON responses

Use cases include: repository management, CI/CD pipeline monitoring, issue tracking, merge request workflows, and DevOps automation.

---

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| API Client | `Tools/Client.ts` | Shared REST client with Keychain auth |
| Repositories | `Tools/Repositories.ts` | Project CRUD, fork, archive |
| Files | `Tools/Files.ts` | Repository file operations |
| Branches | `Tools/Branches.ts` | Branch management, protection, compare |
| Issues | `Tools/Issues.ts` | Issue tracking, comments |
| MergeRequests | `Tools/MergeRequests.ts` | MR lifecycle, approvals, diffs |
| Pipelines | `Tools/Pipelines.ts` | Pipeline management |
| Jobs | `Tools/Jobs.ts` | Job operations, logs, artifacts |
| Schedules | `Tools/Schedules.ts` | Scheduled pipeline management |
| Variables | `Tools/Variables.ts` | CI/CD variable management |

**Summary:**
- **Tools created:** 10
- **Workflows included:** 5 (documented in SKILL.md)
- **Dependencies:** Bun runtime

---

## The Problem

GitLab MCP servers add significant overhead:
- MCP schema loaded into every session (~20K+ tokens)
- Indirect execution through MCP protocol
- Generic responses not optimized for AI consumption

Additionally, many GitLab operations require multiple API calls:
- Checking pipeline status requires listing then getting details
- Debugging failures requires pipeline -> jobs -> logs chain
- Merge request review requires MR + changes + comments

## The Solution

Direct REST API calls via deterministic TypeScript CLI tools:

```bash
# Direct, efficient API calls
bun run Tools/Pipelines.ts list myproject --status failed
bun run Tools/Jobs.ts log myproject 12345 --tail 50
```

**Benefits:**
- No MCP schema overhead
- Chainable commands for complex workflows
- Focused JSON output for AI parsing
- Works with gitlab.com and self-hosted instances

---

## Configuration

### Authentication (Required)

**Option 1: macOS Keychain (recommended)**
```bash
security add-generic-password -s "gitlab-token" -a "claude-code" -w "<your-token>"
```

**Option 2: Environment Variable**
```bash
export GITLAB_TOKEN=<your-token>
```

### Self-Hosted GitLab (Optional)

```bash
export GITLAB_URL=https://gitlab.example.com/api/v4
```

### Token Permissions

Create a Personal Access Token with these scopes:
- `api` - Full API access (required)

For read-only usage:
- `read_api` - Read-only API access

Generate at: GitLab > User Settings > Access Tokens

---

## Quick Start

1. **Install dependencies:**
   ```bash
   cd /path/to/mai-gitlab-skill
   bun install
   ```

2. **Set up authentication:**
   ```bash
   security add-generic-password -s "gitlab-token" -a "claude-code" -w "glpat-xxxx"
   ```

3. **Test connection:**
   ```bash
   bun run Tools/Client.ts ping
   ```

4. **List your projects:**
   ```bash
   bun run Tools/Repositories.ts list --owned
   ```

---

## Common Workflows

### Check Pipeline Status
```bash
# List recent pipelines
bun run Tools/Pipelines.ts list mygroup/myproject --limit 5

# Get failed pipeline details
bun run Tools/Pipelines.ts get mygroup/myproject 12345

# View job logs
bun run Tools/Jobs.ts log mygroup/myproject 67890 --tail 100
```

### Merge Request Workflow
```bash
# List open MRs
bun run Tools/MergeRequests.ts list myproject --state opened

# Create new MR
bun run Tools/MergeRequests.ts create myproject --source "feature" --target "main" "Add new feature"

# View changes
bun run Tools/MergeRequests.ts changes myproject 42

# Merge
bun run Tools/MergeRequests.ts merge myproject 42 --squash --delete-source
```

### Issue Management
```bash
# Create issue
bun run Tools/Issues.ts create myproject "Bug: Login broken" --labels "bug,urgent"

# Add comment
bun run Tools/Issues.ts comment myproject 15 "Fixed in commit abc123"

# Close issue
bun run Tools/Issues.ts close myproject 15
```

---

## Credits

- **Inspired by:** PAI's file-based MCP pattern, mai-joplin-skill design
- **Architecture:** CLI-first design with direct REST API calls

---

## Changelog

### 1.0.0 - 2026-01-06
- Initial release
- 10 CLI tools for complete GitLab integration
- Support for gitlab.com and self-hosted instances
- macOS Keychain + environment variable authentication
- Comprehensive CI/CD pipeline and job management
- Issue and merge request workflows
