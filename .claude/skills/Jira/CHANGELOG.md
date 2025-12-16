# Changelog

All notable changes to the Jira skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-16

### Added

- **Saved Filters Support** (SMS-340)
  - `jira filters` command to list favourite/saved filters
  - `--filter` flag on search to use saved filter by name or ID
  - `--owner` flag to filter filters by owner name
  - `--mine` flag to show only your own filters
  - Share permissions display (global, project, group, user)

- **Quick Filters** (Service Desk patterns)
  - Built-in JQL templates for common queries
  - `--quick` flag on search (open, my open, done, created today, etc.)
  - `jira search --quick list` to show available quick filters
  - Project-aware: uses `JIRA_DEFAULT_PROJECT` or `--project` flag

- **Search Ordering**
  - `--order` flag: updated, created, key, priority, status
  - `--asc` flag for ascending order (default: descending)
  - Default: ORDER BY updated DESC

- **Single-Ticket Workflow**
  - `jira open <KEY|index>` - Opens ticket for focused work
  - `jira status` - Shows currently opened ticket
  - `jira close` - Closes opened ticket
  - Operations work on opened ticket without key

- **Vision Support** (SMS-336)
  - `--vision` flag on load/open to analyze image attachments
  - Uses OpenAI Vision API for screenshot analysis
  - Supports PNG, JPEG, GIF, WebP formats

- **CLI Improvements**
  - Merged `get` command into `load` (SMS-339)
  - Load by index from search: `jira load 1,2,5`
  - Load by range: `jira load 1-10`
  - Profile storage in `~/.claude/jira/profiles/` for persistence (SMS-305)
  - Change issue type via `jira update --type Epic` (SMS-304)
  - Project-to-profile auto-detection with `jira setup` (SMS-334)

### Fixed

- JQL filtering not working in search (SMS-303)

### Changed

- Search now defaults to ORDER BY updated DESC
- Two-phase workflow enforced: search → load (never auto-load)
- Profile auto-detection uses `JIRA_PROJECTS` config (SMS-334)

### Documentation

- SKILL.md updated with filter and quick filter workflow routing
- Quick Filter Reference table added
- Ordering documentation added

## [1.0.0] - 2025-12-12

### Added

- **Core CLI** (`bin/jira/jira.ts`)
  - Search issues with text or JQL
  - Get full issue details
  - Create issues (all types including sub-tasks and epics)
  - Update issue fields
  - Transition issue status
  - Add comments

- **Multi-Instance Support**
  - Profile-based configuration (`profiles/*.env`)
  - Default profile via symlink
  - Cross-instance search with `-p all`
  - Auto-detection of instance from issue key

- **Issue Linking**
  - Create/remove links between issues
  - Link to epics
  - List all links on an issue
  - Support for all standard link types

- **GitHub Integration**
  - View branches linked to issues
  - View pull requests and their status
  - View commit counts
  - Suggest branch names

- **Label Management**
  - List all labels
  - Add/remove labels from issues
  - Search by label (AND/OR logic)

- **Output Formats**
  - Table (human-readable)
  - JSON (machine-readable)
  - Markdown (for notes)

- **Skill Layer** (`.claude/skills/Jira/`)
  - SKILL.md with routing
  - Two-phase workflow (search → get)
  - CORE routing integration
  - Comprehensive documentation

### Architecture

- TypeScript + Bun (no Python, no MCP)
- Direct Jira REST API v3 integration
- Basic Auth with API token
- CLI-first, deterministic design

### Documentation

- README.md with quick start
- docs/CLI-REFERENCE.md - Full command reference
- docs/CONCEPTS.md - Architecture and concepts
- ACCEPTANCE_TESTS.md - Manual test cases
