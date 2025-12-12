# SpecFirst Skill Specification

## Purpose

Define requirements for the SpecFirst skill - a spec-driven development methodology for Claude Code.

---

## File Structure Requirements

### Requirement: Core Skill Files

The skill SHALL have the following files at `.claude/skills/SpecFirst/`:

| File | Purpose |
|------|---------|
| `SKILL.md` | Entry point with workflow routing |
| `CHANGELOG.md` | Release history |
| `workflows/Develop.md` | Development workflow |
| `workflows/Release.md` | Release workflow |
| `workflows/ProposeChange.md` | Change proposal workflow |
| `workflows/ValidateSpec.md` | Validation workflow |

#### Scenario: File existence check
- **GIVEN** SpecFirst skill is installed
- **WHEN** checking skill directory
- **THEN** all core files SHALL exist
- **AND** each file SHALL have content (not empty)

### Requirement: Slash Command Files

The skill SHALL have slash commands at `.claude/commands/`:

| File | Command |
|------|---------|
| `openspec-proposal.md` | `/openspec-proposal` |
| `openspec-apply.md` | `/openspec-apply` |
| `openspec-archive.md` | `/openspec-archive` |
| `specfirst-propose.md` | `/specfirst-propose` |
| `specfirst-release.md` | `/specfirst-release` |
| `specfirst-validate.md` | `/specfirst-validate` |

#### Scenario: Command availability
- **GIVEN** SpecFirst skill is loaded
- **WHEN** user types `/openspec-`
- **THEN** proposal, apply, archive commands SHALL appear
- **AND** each command SHALL have documentation

### Requirement: OpenSpec Directory Structure

When using OpenSpec methodology, the skill SHALL support this structure:

```
openspec/
├── specs/          # Current truth
├── changes/        # Active proposals
│   └── [name]/
│       ├── proposal.md
│       ├── tasks.md
│       └── specs/
└── archive/        # Completed changes
```

#### Scenario: Structure creation
- **WHEN** user invokes `/openspec-proposal`
- **THEN** change folder SHALL be created
- **AND** proposal.md, tasks.md, specs/ SHALL exist

---

## Functional Requirements

### Requirement: Spec-First Flow

The skill SHALL provide a workflow where specifications are defined before implementation.

#### Scenario: New feature development
- **WHEN** user starts developing a new feature
- **THEN** the skill SHALL route to spec creation first
- **AND** implementation SHALL only proceed after spec approval

### Requirement: OpenSpec Integration

The skill SHALL integrate with OpenSpec methodology for spec management.

#### Scenario: Creating a change proposal
- **WHEN** user invokes `/openspec-proposal`
- **THEN** the skill SHALL create a change folder structure
- **AND** the folder SHALL contain proposal.md, tasks.md, and specs/

#### Scenario: Implementing from specs
- **WHEN** user invokes `/openspec-apply`
- **THEN** the skill SHALL read specs and implement accordingly
- **AND** tests SHALL be written to validate spec requirements

#### Scenario: Archiving completed changes
- **WHEN** user invokes `/openspec-archive`
- **THEN** the skill SHALL merge spec deltas into specs/
- **AND** CHANGELOG.md SHALL be updated

### Requirement: Release Discipline

The skill SHALL enforce strict release discipline with human approval gates.

#### Scenario: Preparing a release
- **WHEN** user invokes `/specfirst-release`
- **THEN** the skill SHALL create a file inventory (include/exclude)
- **AND** the skill SHALL require human approval at each gate

#### Scenario: PAI contribution
- **WHEN** releasing to upstream PAI
- **THEN** the skill SHALL enforce contrib branch pattern
- **AND** sanitization checks SHALL be required

### Requirement: Universal Applicability

The skill SHALL work for any software project, not just PAI skills.

#### Scenario: Standard development
- **WHEN** developing for non-PAI projects
- **THEN** the skill SHALL provide simplified workflow
- **AND** contrib branch pattern SHALL be optional

### Requirement: Slash Commands

The skill SHALL provide slash commands for key workflows.

#### Scenario: Command availability
- **GIVEN** SpecFirst skill is loaded
- **WHEN** user types `/openspec-` or `/specfirst-`
- **THEN** relevant commands SHALL be available
- **AND** commands SHALL have clear documentation

## Non-Functional Requirements

### Requirement: Documentation

The skill SHALL be self-documenting with clear examples.

#### Scenario: Learning the skill
- **WHEN** user reads SKILL.md
- **THEN** they SHALL understand the core workflow
- **AND** examples SHALL show command usage

### Requirement: Dogfooding

The skill SHALL use itself for its own development.

#### Scenario: SpecFirst development
- **WHEN** developing the SpecFirst skill
- **THEN** openspec/ structure SHALL be used
- **AND** specs SHALL be defined before implementation
