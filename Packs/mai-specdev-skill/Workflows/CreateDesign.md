# CreateDesign Workflow

## Purpose

Guide the user through creating a design document that implements an approved specification.

## Trigger Phrases

- "design breakdown"
- "create design"
- "design for [feature]"

## Prerequisites

- `SPEC.md` should exist and ideally be approved
- Project should be in DESIGN phase (SPEC_APPROVED gate passed)

## Steps

### 1. Locate Specification

Look for `SPEC.md` in current directory:
- If found, extract title and use as reference
- If not found, ask for spec reference (file path or ID)

### 2. Component Identification

For each major component:

1. **Name**: Component identifier
2. **Type**: service, module, library, ui, data
3. **Description**: What does it do?
4. **Responsibilities**: What is it responsible for?
5. **Dependencies**: What does it depend on?
6. **Interfaces**: What interfaces does it expose?

### 3. Interface Definition

For each interface identified:
- Type (API, event, data, UI)
- Contract details
- Security requirements

### 4. Data Flow

Document how data moves through the system:
- Sources (where data comes from)
- Processes (what transforms data)
- Stores (where data persists)
- Sinks (where data goes)

### 5. Test Strategy

Define testing approach:

**Unit Tests:**
- Framework (default: bun:test)
- Coverage target (default: 80%)
- Test patterns

**Integration Tests:**
- Framework
- Scope

**E2E Tests (if applicable):**
- Framework
- Key scenarios

### 6. Security Controls

For each identified security implication from spec:
- Control ID
- Control name
- Type (preventive, detective, corrective)
- Implementation approach
- Validation method

### 7. Generate Document

Create `DESIGN.md` with all sections populated.

## CLI Alternative

```bash
mai-design                   # Interactive wizard
mai-design --spec SPEC.md    # Link to specific spec
```

## Validation Rules

| Section | Rule |
|---------|------|
| Components | At least 1 component |
| Security Controls | At least 1 control |
| Test Strategy | Coverage target defined |
| Spec Reference | Must reference existing spec |

## Output

Creates `DESIGN.md` with status `draft`. The document must be reviewed and approved before proceeding to build phase.

## Next Steps

After design creation:
1. Review with stakeholders
2. Pass DESIGN_APPROVED gate
3. Proceed to BUILD phase
