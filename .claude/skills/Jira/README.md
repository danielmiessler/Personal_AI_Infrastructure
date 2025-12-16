# Jira Skill

TypeScript CLI for Jira issue management following PAI's deterministic-first architecture.

**Key Concept:** All Jira operations go through a CLI (`jira`) that wraps the Jira REST API. Multi-instance support allows managing personal and work Jira from a single interface. Two-phase retrieval keeps token usage efficient.

## Quick Start

```bash
# 1. Install dependencies
cd bin/jira && bun install

# 2. Create wrapper script
echo '#!/bin/bash
cd /path/to/PAI/bin/jira && exec bun run jira.ts "$@"' > ~/bin/jira
chmod +x ~/bin/jira

# 3. Create profiles directory (persistent location)
mkdir -p ~/.claude/jira/profiles

# 4. Configure a profile
cp bin/jira/profiles.example/example.env.template ~/.claude/jira/profiles/personal.env
# Edit ~/.claude/jira/profiles/personal.env with your credentials

# 5. Set default profile
cd ~/.claude/jira/profiles && ln -sf personal.env default

# 6. (Optional) Auto-discover projects
jira setup

# 7. Test it works
jira --help
jira profiles
```

## Documentation

### Getting Started

| Doc | Purpose | When to Read |
|-----|---------|--------------|
| [Jira Setup](#jira-cloud-setup) | Get API token, configure profile | First setup |
| [Profile Configuration](#profile-configuration) | Multi-instance setup | Multiple Jira instances |

### Concepts & Reference

| Doc | Purpose | When to Read |
|-----|---------|--------------|
| [Concepts](./docs/CONCEPTS.md) | Multi-instance, two-phase workflow, labels | Understanding the system |
| [CLI Reference](./docs/CLI-REFERENCE.md) | Full `jira` command reference | Using the CLI |

### For Claude

| Doc | Purpose |
|-----|---------|
| [SKILL.md](./SKILL.md) | Skill definition (loaded by Claude) |
| [ACCEPTANCE_TESTS.md](./ACCEPTANCE_TESTS.md) | Manual test cases |

## Components

### `jira` CLI

Single CLI for all Jira operations.

```bash
# Discovery (compact, low tokens)
jira search "authentication"     # Text search
jira search --project PROJ       # Project filter
jira search -p all               # Cross-instance search
jira projects                    # List projects
jira transitions PROJ-123        # Available transitions

# Load (full details)
jira get PROJ-123                # Full issue details

# Write operations
jira create -p PROJ -t Bug -s "Summary"
jira update PROJ-123 --description "New desc"
jira transition PROJ-123 "Done"
jira comment PROJ-123 "Comment text"

# Issue linking
jira link PROJ-123 blocks PROJ-456
jira link PROJ-123 --epic EPIC-100
jira links PROJ-123

# GitHub integration
jira dev PROJ-123                # Show branches, PRs, commits

# Labels
jira labels                      # List all labels
jira label add PROJ-123 urgent
jira search --label urgent
```

## Jira Cloud Setup

### 1. Create API Token

API tokens are required for Jira Cloud authentication. Each Jira instance needs its own token.

**Step-by-step:**

1. Log into your Atlassian account at https://id.atlassian.com
2. Navigate to **Security** > **API tokens** or go directly to:
   https://id.atlassian.com/manage-profile/security/api-tokens
3. Click **Create API token**
4. Enter a label (e.g., "PAI Jira CLI")
5. Click **Create**
6. **Copy the token immediately** - it's only shown once!
7. Store it safely (password manager, secure note, etc.)

**Important notes:**
- Tokens inherit your account permissions - they can do anything you can do
- Tokens don't expire automatically, but you can revoke them anytime
- Create separate tokens for different applications for better security
- If you have multiple Jira instances (personal + work), you need a token for each

### 2. Find Your Jira URL

Your Jira Cloud URL is: `https://your-domain.atlassian.net`

You can find this in your browser when logged into Jira.

### 3. Get Your Username

Your username is your **Atlassian account email address** (the email you use to log in).

**Note:** This is NOT your display name or Jira username - it must be the email address.

## Profile Configuration

Profiles live in `~/.claude/jira/profiles/` as `.env` files. This location persists across git branch checkouts.

### Single Instance

```bash
# ~/.claude/jira/profiles/personal.env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_DEFAULT_PROJECT=PROJ
JIRA_PROJECTS=PROJ,SMS,PAI    # For auto-detection (optional)
```

Set as default:
```bash
cd ~/.claude/jira/profiles && ln -sf personal.env default
```

### Multiple Instances

```bash
# ~/.claude/jira/profiles/personal.env
JIRA_URL=https://personal.atlassian.net
JIRA_USERNAME=me@personal.com
JIRA_API_TOKEN=token-1
JIRA_DEFAULT_PROJECT=SIDE
JIRA_PROJECTS=SIDE,PAI

# ~/.claude/jira/profiles/work.env
JIRA_URL=https://company.atlassian.net
JIRA_USERNAME=me@company.com
JIRA_API_TOKEN=token-2
JIRA_DEFAULT_PROJECT=PROJ
JIRA_PROJECTS=PROJ,API
```

Usage:
```bash
jira search "bug" -p personal    # Search personal Jira
jira search "bug" -p work        # Search work Jira
jira search "bug" -p all         # Search all instances
jira get SMS-123                 # Auto-selects personal (SMS in JIRA_PROJECTS)
```

### Auto-Discovery with Setup

Run `jira setup` to auto-discover projects and configure `JIRA_PROJECTS`:

```bash
jira setup                # Discover for all profiles
jira setup -p personal    # Just one profile
```

### Environment Variables (Alternative)

If you don't use profiles, set these environment variables:

```bash
export JIRA_URL=https://your-domain.atlassian.net
export JIRA_USERNAME=your-email@example.com
export JIRA_API_TOKEN=your-api-token
export JIRA_DEFAULT_PROJECT=PROJ
```

## Two-Phase Workflow

The CLI follows a two-phase pattern for token efficiency:

### Phase 1: Search (Discovery)

```bash
jira search "authentication" --limit 10
```

Returns compact index:
```
| #  | Key      | Type  | Summary                    | Status      | Assignee |
|----|----------|-------|----------------------------|-------------|----------|
| 1  | PROJ-123 | Bug   | Auth token expiring early  | In Progress | alice    |
| 2  | PROJ-456 | Story | Add OAuth2 support         | To Do       | -        |

Which to load? (1,2,3 / all / --type Bug)
```

### Phase 2: Load (Detail)

```bash
jira get PROJ-123
```

Returns full details with description, comments, links, dev info.

**Why two phases?** Loading full details for 50 issues wastes tokens. Search first, then load only what you need.

## Cross-Instance Search

Search all configured profiles in parallel:

```bash
jira search "deployment" -p all
```

Returns merged results with instance indicator:

```
| #  | Instance | Key       | Type  | Summary              | Status |
|----|----------|-----------|-------|----------------------|--------|
| 1  | personal | SIDE-42   | Task  | Deploy v2.0          | To Do  |
| 2  | work     | PROJ-789  | Story | Production deploy    | Done   |
```

## Claude Code Integration

The Jira skill works standalone via CLI. For natural language integration with Claude Code, CORE/SKILL.md includes routing:

```markdown
**When user asks about Jira issues, tickets, or project management:**
Examples: "search jira", "create issue", "update ticket", "find issues"
→ **READ:** ${PAI_DIR}/skills/Jira/SKILL.md
→ **EXECUTE:** Follow two-phase workflow: SEARCH → GET
```

This enables queries like "Search jira for authentication bugs" to automatically invoke the CLI.

## Output Formats

```bash
jira search "bug" --format table      # Default: human-readable
jira search "bug" --format json       # Machine-readable
jira search "bug" --format markdown   # For notes/docs
```

## Troubleshooting

### "No profiles configured"

Create a profile:
```bash
cp profiles.example/example.env.template profiles/personal.env
# Edit with your credentials
ln -sf personal.env profiles/default
```

### "401 Unauthorized"

Check your API token:
1. Token may have expired - create a new one
2. Username should be your email, not display name
3. URL should include `https://`

### "Project not found"

List accessible projects:
```bash
jira projects
```

### "Issue not found"

The issue key may be from a different instance:
```bash
jira get PROJ-123 -p work  # Specify instance
```
