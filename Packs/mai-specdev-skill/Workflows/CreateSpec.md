# CreateSpec Workflow

## Purpose

Guide the user through creating a specification document following spec-first development principles.

## Trigger Phrases

- "new spec"
- "create spec"
- "spec for [feature]"

## Steps

### 1. Check for Existing Spec

Look for `SPEC.md` in the current directory. If found, ask if user wants to:
- Edit existing spec
- Create new version
- Cancel

### 2. Gather Core Information

**Required fields:**

1. **Title**: Name of the feature/system being specified
2. **Problem Statement**: What problem are we solving?
3. **Success Criteria**: How do we know we're done? (minimum 1)
4. **Approach**: How will we solve this?
5. **Security Implications**: What security considerations exist? (minimum 1)

**Optional fields:**
- Constraints
- Open Questions
- Interface definitions

### 3. Extract from CLAUDE.md

If `CLAUDE.md` exists in the project, offer to pre-fill:
- Title from project name
- Problem statement from Goals
- Owner as author

### 4. Validate Document

Run validation to ensure:
- All required fields are populated
- At least one success criterion
- At least one security consideration
- Problem statement is substantive (not placeholder text)

### 5. Generate Markdown

Create `SPEC.md` with:
- Frontmatter (title, version, date, author, status)
- Numbered sections for each component
- Checkboxes for success criteria and open questions
- Approval section (pending)

### 6. Next Steps

After spec creation:
1. Review the generated SPEC.md
2. Get approval from stakeholders
3. Pass SPEC_APPROVED gate
4. Proceed to design phase

## CLI Alternative

```bash
mai-spec                     # Interactive wizard
mai-spec --from-claude       # Extract from CLAUDE.md
mai-spec --title "Auth"      # Pre-fill title
```

## Validation Rules

| Field | Rule |
|-------|------|
| Title | Non-empty string |
| Problem Statement | Minimum 20 characters |
| Success Criteria | At least 1 item |
| Approach | Non-empty string |
| Security Implications | At least 1 item |

## Output

Creates `SPEC.md` with status `draft`. The document must be reviewed and approved before proceeding to design phase.
