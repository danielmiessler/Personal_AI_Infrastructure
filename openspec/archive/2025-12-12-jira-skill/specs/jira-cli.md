# JIRA CLI Specification

## Purpose

A deterministic command-line interface for Jira operations, following PAI's CLI-First Architecture. Supports multiple Jira instances via profile-based configuration.

## Requirements

### Requirement: Multi-Instance Profile System

The system SHALL support multiple Jira instances via profile-based configuration.

#### Scenario: Profile Directory Structure
- GIVEN the CLI is installed
- THEN it SHALL look for profiles in `bin/jira/profiles/`
- AND each profile SHALL be a `.env` file with JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN

#### Scenario: Default Profile
- GIVEN no `--profile` flag is specified
- WHEN any command executes
- THEN it SHALL use the profile symlinked as `default`
- OR fall back to env vars if no default profile exists

#### Scenario: Explicit Profile Selection
- GIVEN `--profile <name>` or `-p <name>` flag
- WHEN the user runs `jira -p work search "bug"`
- THEN it SHALL load `profiles/work.env`
- AND use those credentials for the API call

#### Scenario: List Profiles
- WHEN the user runs `jira profiles`
- THEN it SHALL list all available profiles
- AND indicate which is the default
- AND show the JIRA_URL for each (not tokens)

#### Scenario: Profile Not Found
- GIVEN `--profile nonexistent`
- WHEN any command executes
- THEN it SHALL display "Profile not found: nonexistent"
- AND list available profiles
- AND exit with code 1

### Profile .env Format

```bash
# profiles/work.env
JIRA_URL=https://company.atlassian.net
JIRA_USERNAME=user@company.com
JIRA_API_TOKEN=your-api-token-here   # Generate at: id.atlassian.com/manage-profile/security/api-tokens
JIRA_DEFAULT_PROJECT=INNOV           # Optional: default project for this instance
```

### Authentication Method (v1.0)

**API Token with Basic Auth** (recommended for personal CLI tools):
- Generate token: https://id.atlassian.com/manage-profile/security/api-tokens
- Auth header: `Authorization: Basic base64(email:api_token)`
- Works with 2FA/SAML enabled accounts
- Tokens can be revoked individually

**Future:** OAuth 2.0 (3LO) for enterprise/shared scenarios (not in v1.0 scope)

---

### Requirement: Default Instance and Project

The system SHALL support defaults to minimize repetitive scope specification.

#### Scenario: Default Instance
- GIVEN `profiles/default` symlink points to `profiles/personal.env`
- WHEN no `--profile` flag is specified
- THEN all commands SHALL use the personal instance

#### Scenario: Default Project Per Instance
- GIVEN `JIRA_DEFAULT_PROJECT=PAI` in `profiles/personal.env`
- WHEN the user runs `jira create --summary "New task"`
- THEN it SHALL use project PAI without requiring `--project`

#### Scenario: Default Project Override
- GIVEN a default project is configured
- WHEN the user runs `jira create --project OTHER --summary "..."`
- THEN it SHALL use the explicit `--project` value

#### Scenario: Show Current Defaults
- WHEN the user runs `jira config`
- THEN it SHALL display:
  ```
  Default instance: personal (https://me.atlassian.net)
  Default project:  PAI
  ```

#### Scenario: Set Default Project
- WHEN the user runs `jira config --default-project PROJ`
- THEN it SHALL update the current profile's JIRA_DEFAULT_PROJECT
- AND confirm: "Default project set to PROJ"

### Default Hierarchy

```
Command flag (--project, --profile)
    ↓ overrides
Profile default (JIRA_DEFAULT_PROJECT in .env)
    ↓ overrides
Global default (default symlink)
```

**Most common workflow (zero flags needed):**
```bash
jira search "bug"           # Default instance, searches all projects
jira create --summary "Fix" # Default instance + default project
jira get PAI-123            # Auto-detect instance from key
```

---

### Requirement: CLI Entrypoint

The system SHALL provide a `jira` command accessible from PATH.

#### Scenario: Help Display
- GIVEN the user runs `jira --help`
- WHEN the command executes
- THEN it SHALL display available commands, options, and profile usage
- AND exit with code 0

#### Scenario: Missing Configuration
- GIVEN no profile exists AND JIRA_URL or JIRA_API_TOKEN is not set
- WHEN any command executes
- THEN it SHALL display a clear error message
- AND suggest creating a profile or setting env vars
- AND exit with code 1

---

### Requirement: Get Issue (jira get)

The system SHALL retrieve a single Jira issue by key.

#### Scenario: Get Existing Issue
- GIVEN a valid issue key (e.g., "PROJ-123")
- WHEN the user runs `jira get PROJ-123`
- THEN it SHALL display: key, summary, status, type, assignee, description
- AND format output as human-readable table by default

#### Scenario: Get Non-existent Issue
- GIVEN an invalid issue key
- WHEN the user runs `jira get INVALID-999`
- THEN it SHALL display "Issue not found: INVALID-999"
- AND exit with code 1

#### Scenario: JSON Output
- GIVEN `--format json` flag
- WHEN the user runs `jira get PROJ-123 --format json`
- THEN it SHALL output valid JSON matching Jira API response shape

---

### Requirement: Two-Phase Retrieval (Token-Conscious)

The system SHALL separate discovery (search) from content loading (get) to minimize token usage.

**Pattern:** Search returns compact INDEX → User selects → Load returns FULL details

#### Scenario: Search Returns Index Only
- WHEN the user runs `jira search "bug"`
- THEN it SHALL return a compact index with: Key, Summary, Status, Assignee
- AND NOT include full descriptions, comments, or history
- AND include total count and note if results are truncated

#### Scenario: Load Full Details
- GIVEN search results show `PROJ-123` exists
- WHEN the user runs `jira get PROJ-123`
- THEN it SHALL load full issue details including description, comments, history

---

### Requirement: Cross-Instance Search

The system SHALL support searching across all configured instances or a specific instance.

#### Scenario: Search All Instances
- GIVEN `--profile all` or `-p all` flag
- WHEN the user runs `jira search "bug" -p all`
- THEN it SHALL query ALL configured profiles in parallel
- AND return combined results with instance indicator column
- AND format: `[work] PROJ-123` or `[personal] PAI-456`

#### Scenario: Search Single Instance
- GIVEN `--profile work` flag
- WHEN the user runs `jira search "bug" -p work`
- THEN it SHALL query only the work instance

#### Scenario: Default Instance Search
- GIVEN no `--profile` flag
- WHEN the user runs `jira search "bug"`
- THEN it SHALL query only the default profile

---

### Requirement: Scope for All Operations

**Like Context skill's vault operations, JIRA operations require scope awareness:**

| Operation | Scope Behavior |
|-----------|----------------|
| **Search** | Which instance(s) to query |
| **Load/Get** | Which instance to fetch from (auto-detect or explicit) |
| **Create/Write** | Which instance to write to (MUST be explicit) |

#### Scenario: Search Scope
- `jira search "bug"` → Default instance only
- `jira search "bug" -p work` → Work instance only
- `jira search "bug" -p all` → All instances (federated)

#### Scenario: Load Scope (Auto-Detection)
- `jira get PROJ-123` → Auto-detect which instance has PROJ-123
- `jira get PROJ-123 -p work` → Explicit instance (faster, no probing)

#### Scenario: Write Scope (Explicit Required)
- `jira create -p work --project PROJ --summary "..."` → Creates in work instance
- `jira create --project PROJ --summary "..."` → Uses default OR prompts if ambiguous
- `jira comment PROJ-123 "text"` → Auto-detect instance from issue key

---

### Requirement: Instance-Specific Writes

Write operations (create, update, transition, comment) MUST target a specific instance.

#### Scenario: Create Requires Instance
- GIVEN the user runs `jira create --project PROJ --summary "..."`
- WHEN no profile is specified AND multiple profiles exist
- THEN it SHALL prompt: "Which instance? [personal/work]"
- OR use default if only one profile exists

#### Scenario: Issue Key Determines Instance
- GIVEN the user runs `jira get PROJ-123` without `--profile`
- WHEN PROJ-123 exists in the work instance
- THEN it SHALL auto-detect the correct instance by trying each
- AND cache the mapping for future commands

#### Scenario: Cached Instance Mapping
- GIVEN a project key has been resolved to an instance before
- WHEN any operation targets that project key
- THEN it SHALL use the cached mapping
- AND skip instance probing for speed

---

### Requirement: Search Issues (jira search)

The system SHALL search Jira issues using JQL or text queries.

#### Scenario: JQL Search
- GIVEN a JQL query
- WHEN the user runs `jira search "project = PROJ AND status = Open"`
- THEN it SHALL return matching issues as a compact index table
- AND include columns: Key, Summary, Status, Assignee, Updated

#### Scenario: Text Search
- GIVEN a text query (not valid JQL)
- WHEN the user runs `jira search "login bug"`
- THEN it SHALL convert to JQL: `text ~ "login bug"`
- AND return matching issues as compact index

#### Scenario: Limit Results
- GIVEN `--limit N` flag
- WHEN the user runs `jira search "..." --limit 5`
- THEN it SHALL return at most 5 results

#### Scenario: Project Filter
- GIVEN `--project PROJ` flag
- WHEN the user runs `jira search "bug" --project PROJ`
- THEN it SHALL add `project = PROJ` to JQL

#### Scenario: Label Filter (Single)
- GIVEN `--label <label>` flag
- WHEN the user runs `jira search "bug" --label "project/pai"`
- THEN it SHALL add `labels = "project/pai"` to JQL

#### Scenario: Label Filter (Multiple AND)
- GIVEN multiple `--label` flags
- WHEN the user runs `jira search --label security --label urgent`
- THEN it SHALL require BOTH labels (AND logic)
- AND convert to JQL: `labels = "security" AND labels = "urgent"`

#### Scenario: Label Filter (Multiple OR)
- GIVEN `--any-label` flags
- WHEN the user runs `jira search --any-label project/pai --any-label project/work`
- THEN it SHALL match ANY label (OR logic)
- AND convert to JQL: `labels IN ("project/pai", "project/work")`

#### Scenario: Index Format Output
- GIVEN `--format index` flag (default for search)
- WHEN search completes
- THEN output SHALL be numbered for easy selection:
  ```
  Found 12 issues:

  | #  | Key      | Summary                    | Status    | Assignee |
  |----|----------|----------------------------|-----------|----------|
  | 1  | PROJ-123 | Login fails on mobile      | Open      | john     |
  | 2  | PROJ-124 | API timeout errors         | In Review | jane     |

  Load details: jira get PROJ-123
  ```

---

### Requirement: Create Issue (jira create)

The system SHALL create new Jira issues of any type.

#### Scenario: List Issue Types
- WHEN the user runs `jira types`
- THEN it SHALL display available issue types for the project
- AND include: Epic, Story, Task, Bug, Sub-task, and any custom types

#### Scenario: Create Standard Issue
- GIVEN required fields: project, type, summary
- WHEN the user runs `jira create --project PROJ --type Bug --summary "Login fails"`
- THEN it SHALL create the issue
- AND return the new issue key (e.g., "PROJ-456")

#### Scenario: Create Epic
- GIVEN type is Epic
- WHEN the user runs `jira create --type Epic --summary "User Authentication" --description "..."`
- THEN it SHALL create an Epic
- AND return the epic key (e.g., "PROJ-100")

#### Scenario: Create Story/Task in Epic
- GIVEN an existing epic
- WHEN the user runs `jira create --type Story --summary "..." --epic PROJ-100`
- THEN it SHALL create the story linked to the epic
- AND confirm: "Created PROJ-457 in epic PROJ-100"

#### Scenario: Create Sub-task
- GIVEN an existing parent issue
- WHEN the user runs `jira create --type Sub-task --summary "..." --parent PROJ-123`
- THEN it SHALL create a sub-task under the parent
- AND confirm: "Created PROJ-458 as sub-task of PROJ-123"

#### Scenario: Full Creation
- GIVEN all fields including description and assignee
- WHEN the user runs with `--description "..." --assignee john.doe`
- THEN it SHALL create the issue with all fields populated

#### Scenario: Create with Labels
- GIVEN `--labels` flag with comma-separated values
- WHEN the user runs `jira create --summary "..." --labels "project/pai,security"`
- THEN it SHALL create the issue with both labels applied

#### Scenario: Create with Label (repeatable)
- GIVEN multiple `--label` flags
- WHEN the user runs `jira create --summary "..." --label project/pai --label urgent`
- THEN it SHALL create the issue with both labels applied

#### Scenario: Missing Required Field
- GIVEN missing --project flag AND no default project
- WHEN the user runs `jira create --type Bug --summary "..."`
- THEN it SHALL display "Missing required: --project (or set JIRA_DEFAULT_PROJECT)"
- AND exit with code 1

### Create Command Options

```
jira create [options]

Required (unless defaults set):
  --project, -P <key>     Project key (or use JIRA_DEFAULT_PROJECT)
  --type, -T <type>       Issue type: Epic, Story, Task, Bug, Sub-task
  --summary, -s <text>    Issue summary/title

Optional:
  --description, -d <text>  Issue description
  --assignee, -a <user>     Assign to user
  --labels <label,label>    Comma-separated labels
  --label <label>           Single label (repeatable)
  --epic <key>              Parent epic (for Story/Task/Bug)
  --parent <key>            Parent issue (for Sub-task)
  --priority <name>         Priority: Highest, High, Medium, Low, Lowest
```

---

### Requirement: Update Issue (jira update)

The system SHALL update existing Jira issues.

#### Scenario: Update Summary
- GIVEN an existing issue and new summary
- WHEN the user runs `jira update PROJ-123 --summary "New title"`
- THEN it SHALL update the summary
- AND confirm: "Updated PROJ-123"

#### Scenario: Update Multiple Fields
- GIVEN multiple field flags
- WHEN the user runs `jira update PROJ-123 --summary "..." --description "..."`
- THEN it SHALL update all specified fields in one API call

---

### Requirement: Transition Issue (jira transition)

The system SHALL change issue status via transitions.

#### Scenario: Valid Transition
- GIVEN an issue with available "In Progress" transition
- WHEN the user runs `jira transition PROJ-123 "In Progress"`
- THEN it SHALL execute the transition
- AND confirm: "PROJ-123 → In Progress"

#### Scenario: Invalid Transition
- GIVEN a transition not available for current status
- WHEN the user runs `jira transition PROJ-123 "Done"`
- THEN it SHALL list available transitions
- AND display: "Cannot transition to 'Done'. Available: In Progress, Blocked"

#### Scenario: List Transitions
- GIVEN `jira transitions <key>` command
- WHEN the user runs `jira transitions PROJ-123`
- THEN it SHALL list all available transitions for that issue

---

### Requirement: Add Comment (jira comment)

The system SHALL add comments to issues.

#### Scenario: Add Comment
- GIVEN an issue key and comment text
- WHEN the user runs `jira comment PROJ-123 "Fixed in commit abc123"`
- THEN it SHALL add the comment
- AND confirm: "Comment added to PROJ-123"

#### Scenario: Multiline Comment
- GIVEN stdin input with multiple lines
- WHEN the user runs `echo "Line 1\nLine 2" | jira comment PROJ-123 -`
- THEN it SHALL add the full multiline comment

---

### Requirement: List Projects (jira projects)

The system SHALL list accessible Jira projects.

#### Scenario: List All
- WHEN the user runs `jira projects`
- THEN it SHALL display: Key, Name, Lead
- AND sort by key alphabetically

---

### Requirement: Issue Linking (jira link)

The system SHALL support creating and managing links between issues.

#### Scenario: List Link Types
- WHEN the user runs `jira link-types`
- THEN it SHALL display available link types (e.g., "blocks", "is blocked by", "relates to", "is parent of")

#### Scenario: Link Two Issues
- GIVEN two existing issues
- WHEN the user runs `jira link PROJ-123 "blocks" PROJ-456`
- THEN it SHALL create the link
- AND confirm: "PROJ-123 blocks PROJ-456"

#### Scenario: Link to Epic
- GIVEN an epic and a story/task
- WHEN the user runs `jira link PROJ-123 --epic EPIC-100`
- THEN it SHALL add PROJ-123 to the epic
- AND confirm: "PROJ-123 added to epic EPIC-100"

#### Scenario: Remove Link
- GIVEN a link exists between issues
- WHEN the user runs `jira unlink PROJ-123 PROJ-456`
- THEN it SHALL remove the link
- AND confirm: "Removed link between PROJ-123 and PROJ-456"

#### Scenario: Show Links on Issue
- WHEN the user runs `jira get PROJ-123` or `jira links PROJ-123`
- THEN it SHALL display all linked issues grouped by link type

---

### Requirement: GitHub Development Integration (jira dev)

The system SHALL display GitHub development info linked to issues.

**Note:** Uses `/rest/dev-status/` API (internal but commonly used). Branch/commit/PR must include issue key (e.g., "PROJ-123") to be linked.

#### Scenario: Show Dev Info
- GIVEN an issue with linked GitHub activity
- WHEN the user runs `jira dev PROJ-123`
- THEN it SHALL display:
  - Branches (name, repo, status)
  - Commits (hash, message, author)
  - Pull Requests (number, title, status)

#### Scenario: Show Branches Only
- WHEN the user runs `jira dev PROJ-123 --branches`
- THEN it SHALL show only linked branches

#### Scenario: Show PRs Only
- WHEN the user runs `jira dev PROJ-123 --prs`
- THEN it SHALL show only linked pull requests with status (open/merged/declined)

#### Scenario: No Dev Info
- GIVEN an issue with no linked GitHub activity
- WHEN the user runs `jira dev PROJ-123`
- THEN it SHALL display: "No development info linked to PROJ-123"
- AND hint: "Add 'PROJ-123' to branch name or commit message to link"

#### Scenario: Create Branch (Helper)
- WHEN the user runs `jira dev PROJ-123 --create-branch`
- THEN it SHALL output a suggested branch name: `PROJ-123-issue-summary-slug`
- AND optionally run `git checkout -b` if `--checkout` flag provided

---

### Requirement: Label Management (jira label)

The system SHALL support viewing and managing labels on issues.

#### Scenario: List All Labels
- WHEN the user runs `jira labels`
- THEN it SHALL list all labels used in the instance
- AND show usage count per label
- AND sort by usage (most used first)

#### Scenario: List Labels with Prefix
- GIVEN a prefix filter
- WHEN the user runs `jira labels --prefix "project/"`
- THEN it SHALL show only labels starting with "project/"

#### Scenario: Add Label to Issue
- GIVEN an existing issue
- WHEN the user runs `jira label add PROJ-123 "project/pai"`
- THEN it SHALL add the label to the issue
- AND confirm: "Added 'project/pai' to PROJ-123"

#### Scenario: Remove Label from Issue
- GIVEN an issue with a label
- WHEN the user runs `jira label remove PROJ-123 "project/pai"`
- THEN it SHALL remove the label
- AND confirm: "Removed 'project/pai' from PROJ-123"

#### Scenario: Show Labels on Issue
- WHEN the user runs `jira labels PROJ-123`
- THEN it SHALL list all labels on that specific issue

### Label Taxonomy Integration

**Reusing Obsidian tag taxonomy:** Labels can mirror your vault tag structure:
- `project/pai` - Project tags
- `scope/work`, `scope/private` - Scope tags
- `priority/high` - Priority tags
- Person tags, topic tags, etc.

The SKILL.md can map Context skill tags to Jira labels for consistency across systems.

---

### Requirement: Output Formats

The system SHALL support multiple output formats.

#### Scenario: Table Format (Default)
- GIVEN no --format flag
- WHEN any list/get command runs
- THEN it SHALL output a human-readable table

#### Scenario: JSON Format
- GIVEN `--format json`
- WHEN any command runs
- THEN it SHALL output valid JSON
- AND include all fields from API response

#### Scenario: Markdown Format
- GIVEN `--format markdown`
- WHEN any command runs
- THEN it SHALL output markdown suitable for notes
- AND include links to Jira web UI

---

## Non-Functional Requirements

### Requirement: Determinism
- Same input SHALL produce same output
- No AI/LLM calls in CLI layer
- Timestamps excluded from output unless explicitly requested

### Requirement: Error Handling
- Network errors SHALL display: "Cannot reach Jira at {URL}"
- Auth errors SHALL display: "Authentication failed. Check JIRA_API_TOKEN"
- API errors SHALL display the Jira error message

### Requirement: Performance
- Commands SHALL complete within 10 seconds for normal operations
- Search results SHALL be streamed for large result sets

---

## v1.0 Scope

### Included in v1.0

| Category | Commands |
|----------|----------|
| **Core CRUD** | search, get, create, update |
| **Issue Types** | types, create --type Epic/Story/Task/Bug/Sub-task |
| **Hierarchy** | create --epic, create --parent (sub-tasks) |
| **Workflow** | transition, transitions, comment |
| **Discovery** | projects, labels, types |
| **Label Mgmt** | label add, label remove |
| **Issue Linking** | link, unlink, link-types, links |
| **GitHub Dev** | dev (branches, commits, PRs) |
| **Config** | config, profiles |

### Deferred to Future Versions

| Feature | Reason |
|---------|--------|
| Agile (boards, sprints) | Separate workflow, v1.1 |
| Worklogs | Time tracking feature, v1.1 |
| Attachments | File handling complexity, v1.1 |
| Versions / Releases | Release management, v1.2 |
| Batch operations | Optimization, v1.1 |
| Delete issue | Dangerous, requires confirmation UX |
| OAuth 2.0 | Enterprise auth, v1.1 |
