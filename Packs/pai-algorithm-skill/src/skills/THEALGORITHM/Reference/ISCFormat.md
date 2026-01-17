# ISC (Ideal State Criteria) Format Reference

The ISC is THE ALGORITHM's central artifact - a living document that tracks the gap between current state and ideal state.

## ISC Table Structure

```markdown
## ISC: [Request Summary]

**Effort:** [LEVEL] | **Phase:** [PHASE] | **Iteration:** [N]

| # | What Ideal Looks Like | Source | Status | [P] |
|---|------------------------|--------|--------|-----|
| 1 | [Criterion 1]          | [SRC]  | [STAT] | [✓] |
| 2 | [Criterion 2]          | [SRC]  | [STAT] | [✓] |
```

## Row Fields

### ID (#)
- Sequential number
- Assigned at creation
- Never changes

### What Ideal Looks Like
- Description of success criterion
- Should be specific and testable
- Gets refined during BUILD phase

**Evolution:**
```
OBSERVE: "Logout button"
THINK:   "Logout button in navbar"
BUILD:   "Logout button visible in navbar (top-right, matches existing style)"
```

### Source

| Source | Meaning | Example |
|--------|---------|---------|
| **EXPLICIT** | Directly stated by user | "Add a logout button" |
| **INFERRED** | Derived from user context | "Uses TypeScript" (from prefs) |
| **IMPLICIT** | Universal standards | "Tests pass", "No security issues" |

### Status

| Status | Meaning | Set During |
|--------|---------|------------|
| **PENDING** | Not started | Initial state |
| **ACTIVE** | Work in progress | EXECUTE phase |
| **DONE** | Successfully completed | EXECUTE phase |
| **ADJUSTED** | Completed with deviation | EXECUTE or VERIFY |
| **BLOCKED** | Cannot proceed | EXECUTE or VERIFY |

### Parallel [P]
- ✓ = Can run in parallel with other rows
- (empty) = Must run sequentially
- Set during PLAN phase

## JSON Storage Format

ISC is stored at `~/.claude/MEMORY/Work/current-isc.json`:

```json
{
  "request": "Add logout button to navbar",
  "effort": "STANDARD",
  "created": "2024-01-15T10:30:00Z",
  "lastModified": "2024-01-15T11:45:00Z",
  "phase": "EXECUTE",
  "iteration": 1,
  "rows": [
    {
      "id": 1,
      "description": "Logout button visible in navbar",
      "source": "EXPLICIT",
      "status": "DONE",
      "parallel": true,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "description": "Click logout clears session",
      "source": "EXPLICIT",
      "status": "ACTIVE",
      "parallel": false,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "log": [
    "[2024-01-15T10:30:00Z] ISC created for: Add logout button",
    "[2024-01-15T10:31:00Z] Added row 1: Logout button visible",
    "[2024-01-15T11:00:00Z] Row 1: PENDING → ACTIVE",
    "[2024-01-15T11:30:00Z] Row 1: ACTIVE → DONE"
  ]
}
```

## Evolution Log

The log tracks all changes to the ISC:

```
[timestamp] ISC created for: [request]
[timestamp] Added row N: [description] ([source])
[timestamp] Row N: [old_status] → [new_status]
[timestamp] Phase: [old_phase] → [new_phase]
[timestamp] Verify row N: [result] ([reason])
[timestamp] Starting iteration N
```

## ISC Lifecycle

```
CREATE (OBSERVE)
    ↓
COMPLETE (THINK) - add missing rows
    ↓
ORDER (PLAN) - set parallel, sequence
    ↓
REFINE (BUILD) - make testable
    ↓
STATUS CHANGES (EXECUTE) - PENDING → ACTIVE → DONE
    ↓
VERIFY RESULTS (VERIFY) - PASS/ADJUSTED/BLOCKED
    ↓
ARCHIVE (LEARN) - save and clear
```

## CLI Commands

```bash
# Create new ISC
bun run ISCManager.ts create --request "Add feature X" --effort STANDARD

# Add rows
bun run ISCManager.ts add -d "Feature works" -s EXPLICIT
bun run ISCManager.ts add -d "Uses TypeScript" -s INFERRED
bun run ISCManager.ts add -d "Tests pass" -s IMPLICIT

# Update status
bun run ISCManager.ts update --row 1 --status ACTIVE
bun run ISCManager.ts update --row 1 --status DONE
bun run ISCManager.ts update --row 2 --status BLOCKED --reason "API unavailable"

# Set verification result
bun run ISCManager.ts verify --row 1 --result PASS
bun run ISCManager.ts verify --row 2 --result ADJUSTED --reason "250ms vs 200ms"

# Change phase
bun run ISCManager.ts phase -p EXECUTE

# View ISC
bun run ISCManager.ts show              # default text
bun run ISCManager.ts show -o markdown  # markdown table
bun run ISCManager.ts show -o json      # full JSON

# View log
bun run ISCManager.ts log

# View summary
bun run ISCManager.ts summary

# Archive and clear
bun run ISCManager.ts clear
```

## Best Practices

### Row Descriptions
- **Specific** over vague: "Button top-right" not "Button somewhere"
- **Testable**: Must be verifiable somehow
- **Outcome-focused**: "User sees X" not "Code does Y"

### Source Assignment
- When in doubt, use INFERRED
- EXPLICIT only for direct quotes from request
- IMPLICIT for universal quality standards

### Status Management
- Update immediately when status changes
- Never skip ACTIVE - always mark work in progress
- Always include reason for BLOCKED/ADJUSTED

### Parallelization
- Default to parallel unless clear dependency
- Mark [P] only during PLAN phase
- Don't parallelize if rows touch same files
