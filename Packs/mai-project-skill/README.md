# mai-project-skill

PAI Skill Pack for project creation and management using the MAI methodology.

## Features

- **Interactive Project Creation**: Guided wizard for setting up new projects
- **Gate Management**: Track project phases with quality gates
- **Project Status**: View current phase, progress, and recent activity
- **Multiple Project Types**: Software, Physical, Documentation, Infrastructure

## Installation

```bash
bun add mai-project-skill
```

Or link locally:

```bash
bun link
```

## CLI Tools

### mai-init

Interactive project creation wizard:

```bash
mai-init                    # Start interactive wizard
mai-init --existing         # Initialize in existing directory
mai-init --type=software    # Pre-select project type
```

### mai-gate

Gate management for projects:

```bash
mai-gate status             # Show all gates
mai-gate current            # Show current gate
mai-gate pass <gate>        # Mark gate as passed
mai-gate fail <gate>        # Mark gate as failed
mai-gate block <gate>       # Mark gate as blocked
mai-gate init               # Initialize from CLAUDE.md
```

## Skill Triggers

When loaded as a PAI Skill, responds to:

| Phrase | Action |
|--------|--------|
| "new project" | Start CreateProject workflow |
| "init project" | Start CreateProject workflow |
| "project status" | Show project status |
| "update project" | Update project settings |
| "mai gate" | Gate management |

## Project Types

### Software
- Languages, runtime, package manager
- SPEC.md template generated
- Gates: SPEC_APPROVED, DESIGN_APPROVED, TESTS_EXIST, SECURITY_REVIEW, VERIFY_COMPLETE

### Physical
- Materials, safety, budget tracking
- Gates: MATERIALS_LIST, DESIGN_APPROVED, BUILD_COMPLETE, SAFETY_CHECK, ACCEPTANCE

### Documentation
- Audience, format requirements
- Gates: OUTLINE_APPROVED, DRAFT_COMPLETE, REVIEW_COMPLETE, PUBLISH_READY

### Infrastructure
- Dependencies, rollback plans
- Gates: DESIGN_APPROVED, STAGING_DEPLOYED, SECURITY_REVIEW, PRODUCTION_READY

## Generated Files

When creating a project:

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project identity (checked in) |
| `.gitignore` | Excludes CLAUDE.local.md |
| `tasks.yaml` | Task storage |
| `SPEC.md` | Specification template (software only) |

## Dependencies

- `mai-project-core`: Templates and gate definitions
- `@inquirer/prompts`: Interactive prompts
- `commander`: CLI framework
- `yaml`: YAML parsing/writing

## License

MIT
