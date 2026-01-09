# UpdateProject Workflow

## Purpose

Modify project settings, update goals, or adjust constraints after initial creation.

## Trigger Phrases

- "update project"
- "change project goals"
- "modify constraints"
- "update success criteria"

## Steps

### 1. Load Current State

Read from:
- `CLAUDE.md` - Current project identity
- `project-state.yaml` - Gate status

### 2. Identify Update Type

Ask what the user wants to update:
- Goals/Problem Statement
- Success Criteria
- Constraints
- Type-Specific Details
- Owner/Location

### 3. Present Current Values

Show the current value of the selected field before making changes.

### 4. Collect New Values

Interactive prompts for new values, pre-filled with current values where possible.

### 5. Review Changes

Show a diff-style preview:

```
Problem Statement:
- OLD: Build a chicken coop that can house 12 chickens
+ NEW: Build a chicken coop that can house 20 chickens with automated feeding

Accept changes? [Y/n]
```

### 6. Apply Updates

Write changes to:
- `CLAUDE.md` - Update the relevant section
- `project-state.yaml` - If gate-related changes

### 7. Log Change

Optionally record the change in a changelog or decision log.

## Common Updates

### Add Success Criterion

```
Adding new success criterion:
- Existing: "Coop can house 12 chickens"
- Existing: "Built within budget"
+ New: "Automated door installed"
```

### Modify Constraint

```
Updating constraint:
- OLD: Budget: $500
+ NEW: Budget: $750 (increased due to material costs)
```

### Change Project Type

Warning: Changing project type will reset gates to match the new type.

## CLI Alternative

Most updates require interactive CLAUDE.md editing, but gate operations can use:

```bash
mai-gate pass <gate>     # Mark gate passed
mai-gate block <gate>    # Mark gate blocked
```

## Safety

- Always show preview before applying
- Create backup of CLAUDE.md before modification
- Log significant changes for audit trail
