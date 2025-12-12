# Changelog

All notable changes to the Jira skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
