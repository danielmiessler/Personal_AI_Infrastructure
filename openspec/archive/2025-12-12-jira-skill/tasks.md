# Tasks: JIRA Skill Implementation

## Phase 1: Core CLI (bin/jira/)

- [x] **TASK-001**: Create `bin/jira/` directory structure
  - `jira.ts` - CLI entrypoint with command routing
  - `lib/api.ts` - Jira REST API client (fetch-based)
  - `lib/config.ts` - Config + profile management
  - `lib/format.ts` - Output formatters
  - `profiles/` - Instance-specific .env files (gitignored)
  - `profiles.example/` - Example profiles for setup
  - `package.json` - Bun project with types

- [x] **TASK-002**: Implement multi-instance profile system
  - Profile directory: `bin/jira/profiles/*.env`
  - Each profile contains: JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN, JIRA_DEFAULT_PROJECT
  - Default profile via symlink: `profiles/default -> profiles/personal.env`
  - Default project per profile (optional JIRA_DEFAULT_PROJECT)
  - `--profile <name>` / `-p <name>` flag for explicit selection
  - Fallback to env vars if no profile specified and no default
  - `jira profiles` command to list available profiles
  - `jira config` command to show/set defaults
  - Profile .env files gitignored, examples provided

- [x] **TASK-003**: Implement Jira REST API client
  - `GET /rest/api/3/issue/{issueKey}` - Get issue
  - `GET /rest/api/3/search?jql=...` - Search issues
  - `POST /rest/api/3/issue` - Create issue
  - `PUT /rest/api/3/issue/{issueKey}` - Update issue
  - `POST /rest/api/3/issue/{issueKey}/transitions` - Transition
  - `POST /rest/api/3/issue/{issueKey}/comment` - Add comment
  - Error handling with clear messages

- [x] **TASK-004**: Implement CLI commands (Two-Phase Pattern)
  **Discovery (compact index, low tokens):**
  - `jira search <jql|text>` - Search issues, returns numbered index
  - `jira search -p all` - Cross-instance search (parallel queries)
  - `jira projects` - List accessible projects (per instance or all)
  - `jira transitions <key>` - List available transitions

  **Load (full details, on demand):**
  - `jira get <key>` - Get full issue details (auto-detect instance)

  **Write (instance-specific):**
  - `jira create --project --type --summary [--description] [--assignee]`
  - `jira update <key> [--summary] [--description] [--assignee]`
  - `jira transition <key> <status>` - Change status
  - `jira comment <key> <text>` - Add comment

- [x] **TASK-004a**: Implement cross-instance search
  - `--profile all` queries all profiles in parallel
  - Merge results with instance indicator column
  - Cache project→instance mapping for auto-detection
  - Handle timeouts gracefully (show partial results)

- [x] **TASK-004b**: Implement issue linking commands
  - `jira link-types` - List available link types
  - `jira link PROJ-123 "blocks" PROJ-456` - Create link
  - `jira link PROJ-123 --epic EPIC-100` - Add to epic
  - `jira unlink PROJ-123 PROJ-456` - Remove link
  - `jira links PROJ-123` - Show all links on issue
  - API: `/rest/api/3/issueLink`, `/rest/api/3/issueLinkType`

- [x] **TASK-004c**: Implement GitHub dev integration
  - `jira dev PROJ-123` - Show branches, commits, PRs
  - `jira dev PROJ-123 --branches` - Branches only
  - `jira dev PROJ-123 --prs` - PRs only
  - `jira dev PROJ-123 --create-branch` - Suggest branch name
  - API: `/rest/dev-status/latest/issue/detail` (internal but stable)
  - Handle case when no dev info linked

- [x] **TASK-005**: Implement output formatters
  - `--format table` (default) - Human-readable table
  - `--format json` - Machine-readable JSON
  - `--format markdown` - For inclusion in notes/docs

## Phase 2: Skill Definition (.claude/skills/Jira/)

- [x] **TASK-006**: Create SKILL.md with routing
  - Trigger patterns ("create issue", "search jira", etc.)
  - Command mapping table
  - **Instance routing logic:**
    - "in work Jira" / "on personal board" → explicit profile
    - "across all Jira" / "in any instance" → `-p all`
    - Default behavior documentation
  - Two-turn workflow (search → wait → get)
  - Example workflows for multi-instance scenarios

- [x] **TASK-007**: Create ACCEPTANCE_TESTS.md
  - Manual test scenarios
  - Expected CLI output
  - Natural language → CLI mapping tests

## Phase 3: Integration

- [x] **TASK-008**: Update .env.example with JIRA_* vars
- [x] **TASK-009**: Create wrapper script in ~/bin/jira (like obs/ingest)
- [x] **TASK-010**: Test end-to-end with real Jira instance (manual validation pending profiles)

## Verification Checklist

- [x] Code compiles with `bun build`
- [x] Command works standalone (no AI needed)
- [x] Same input produces same output
- [x] Help text is accurate and complete
