# Requirement Template

**Use this format for testable requirements.**

---

## Format

```markdown
### Requirement: [Descriptive Name]

[Description using SHALL/MUST language]

#### Scenario: [Use Case Name]
- **GIVEN** [precondition/context]
- **WHEN** [action/trigger]
- **THEN** [expected outcome]
- **AND** [additional outcomes if any]
```

---

## Language Reference

| Word | Meaning | Testability |
|------|---------|-------------|
| **SHALL** | Mandatory requirement | Must have test |
| **MUST** | Absolute constraint | Must have test |
| **SHOULD** | Recommended | Optional test |
| **MAY** | Optional behavior | No test required |

---

## Examples

### Good Requirements

```markdown
### Requirement: Filename Override

The system SHALL allow users to override generated filenames via --name flag.

#### Scenario: CLI with --name flag
- **GIVEN** user is running ingest direct
- **WHEN** user provides `--name "Custom-Name"`
- **THEN** output filename SHALL contain "Custom-Name"
- **AND** caption SHALL include `[name:Custom-Name]` metadata

#### Scenario: Missing --name flag
- **GIVEN** user is running ingest direct
- **WHEN** --name flag is not provided
- **THEN** filename SHALL be auto-generated from content
```

### Bad Requirements (Avoid)

```markdown
### Requirement: Good UX
The system should work correctly and be user-friendly.
```
*Why bad: Not testable, no scenarios, vague language*

---

## Mapping to Tests

Each scenario maps to a test:

```
Requirement          →    Scenario           →    Test ID
──────────────────────────────────────────────────────────
Filename Override    →    CLI with --name    →    TEST-CLI-014
                     →    Missing --name     →    TEST-CLI-015
```

---

## Delta Format (for changes)

When modifying existing requirements:

```markdown
## ADDED Requirements
### Requirement: [New Feature]
The system SHALL [behavior].

## MODIFIED Requirements
### Requirement: [Existing Feature]
The system SHALL [updated behavior].
<!-- Changed from: [original behavior] -->
<!-- Rationale: [why changed] -->

## REMOVED Requirements
### Requirement: [Deprecated Feature]
<!-- Removal rationale: [why removed] -->
```
