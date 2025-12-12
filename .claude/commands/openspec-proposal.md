# /openspec-proposal

Create an OpenSpec change proposal with proper directory structure.

## When Invoked

1. **Ask for the change name:**
   > What feature or change are you proposing? (e.g., "add-name-flag")

2. **Determine the scope:**
   - Is this for a skill? Which one?
   - Where should the openspec/ directory live?
   - Default: `.claude/skills/[SkillName]/openspec/`

3. **Create the change directory structure:**

```bash
mkdir -p [openspec-path]/changes/[change-name]/specs
```

4. **Create proposal.md:**

```markdown
# Proposal: [Change Name]

## Summary
[One sentence: what and why]

## Impact
- **Scope:** [skill/project affected]
- **Breaking changes:** Yes/No
- **Files affected:** [list or TBD]

## Rationale
[Why this change is needed]
```

5. **Create tasks.md:**

```markdown
# Tasks: [Change Name]

## Implementation Checklist

### 1. [Phase Name]
- [ ] 1.1 [Task description]
- [ ] 1.2 [Task description]

### 2. Testing
- [ ] 2.1 Write tests for requirements
- [ ] 2.2 Verify tests fail initially

### 3. Documentation
- [ ] 3.1 Update CHANGELOG.md
- [ ] 3.2 Update relevant docs
```

6. **Create spec delta file(s) in specs/:**

```markdown
# Delta for [Domain]

## ADDED Requirements

### Requirement: [Name]
The system SHALL [behavior].

#### Scenario: [Use case]
- **GIVEN** [precondition]
- **WHEN** [action]
- **THEN** [expected outcome]

## MODIFIED Requirements
(none)

## REMOVED Requirements
(none)
```

7. **Present for review:**
   > I've created the change proposal at `[path]`. Please review:
   > - `proposal.md` - Summary and rationale
   > - `specs/` - Requirements (SHALL/MUST)
   > - `tasks.md` - Implementation checklist
   >
   > Does this match your intent? Ready to proceed with `/openspec-apply`?

## Directory Structure Created

```
openspec/
├── specs/                    # Current truth (existing specs)
├── changes/
│   └── [change-name]/        # ← Created by this command
│       ├── proposal.md       # What and why
│       ├── tasks.md          # Implementation checklist
│       └── specs/            # Spec deltas
│           └── [domain].md   # ADDED/MODIFIED/REMOVED
└── archive/                  # Completed changes
```

## Reference

- OpenSpec methodology: https://github.com/Fission-AI/OpenSpec
- SpecFirst workflow: `.claude/skills/SpecFirst/workflows/Develop.md`
