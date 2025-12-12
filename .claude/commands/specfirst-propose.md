# /specfirst-propose

Create a change proposal before implementing significant changes.

## When Invoked

1. **Ask for the change name and description:**
   > What change are you proposing? (e.g., "Add --name flag to ingest direct")

2. **Draft proposal using this format:**

```markdown
# Change Proposal: [Feature Name]

## Summary
[One sentence: what and why]

## Requirements

### Requirement: [Name]
The system SHALL [behavior].

#### Scenario: [Use case]
- **GIVEN** [precondition]
- **WHEN** [action]
- **THEN** [expected outcome]

## Impact
- **Files affected:** [list]
- **Breaking changes:** Yes/No

## Tasks
- [ ] Task 1
- [ ] Task 2

## Test Plan
- [ ] TEST-XXX: [description]
```

3. **Present for review:**
   > Here's my proposal. Does this match your intent?

4. **After approval, proceed to implementation** following the spec-first pattern:
   - Write tests first
   - Implement to make tests pass
   - Validate

## Reference

See `.claude/skills/SpecFirst/workflows/ProposeChange.md` for full workflow.
