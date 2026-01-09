# GateManagement Workflow

## Purpose

Manage project gates - check status, pass gates, handle blockers.

## Trigger Phrases

- "mai gate status"
- "pass gate"
- "check gates"
- "gate blocked"

## Gate Lifecycle

```
PENDING → IN_REVIEW → PASSED
                   ↘ BLOCKED → (resolve) → PENDING
                   ↘ FAILED → (fix) → PENDING
```

## Steps

### 1. View Gate Status

Display all gates with current status:

```
=== Gate Status ===

Project: mai-project-skill
Type: software

| Gate | Status | Date | Notes |
|------|--------|------|-------|
| SPEC_APPROVED | PASSED | 2026-01-05 | - |
| DESIGN_APPROVED | PASSED | 2026-01-08 | - |
| TESTS_EXIST | PENDING | - | Current gate |
| SECURITY_REVIEW | PENDING | - | - |
| VERIFY_COMPLETE | PENDING | - | - |

Next: Pass TESTS_EXIST gate
```

### 2. Pass a Gate

Requirements before passing:
- Verify criteria are met
- Document evidence
- Record timestamp

```bash
mai-gate pass TESTS_EXIST
```

### 3. Block a Gate

When a gate cannot be passed due to external dependency:

```bash
mai-gate block SECURITY_REVIEW --reason "Waiting for penetration test results"
```

### 4. Fail a Gate

When a gate check reveals issues:

```bash
mai-gate fail TESTS_EXIST --reason "Test coverage below 80%"
```

## Gate Types by Project

### Software Gates

| Gate | Criteria |
|------|----------|
| SPEC_APPROVED | Spec document complete and reviewed |
| DESIGN_APPROVED | Design document complete and reviewed |
| TESTS_EXIST | Unit tests written for core functionality |
| SECURITY_REVIEW | Security checklist completed |
| VERIFY_COMPLETE | All tests pass, documentation complete |

### Physical Gates

| Gate | Criteria |
|------|----------|
| MATERIALS_LIST | All materials identified and sourced |
| DESIGN_APPROVED | Plans reviewed, safety checked |
| BUILD_COMPLETE | Construction finished |
| SAFETY_CHECK | Safety inspection passed |
| ACCEPTANCE | Client/user acceptance |

### Documentation Gates

| Gate | Criteria |
|------|----------|
| OUTLINE_APPROVED | Structure and scope agreed |
| DRAFT_COMPLETE | First draft written |
| REVIEW_COMPLETE | Feedback incorporated |
| PUBLISH_READY | Final approval for publication |

### Infrastructure Gates

| Gate | Criteria |
|------|----------|
| DESIGN_APPROVED | Architecture reviewed |
| STAGING_DEPLOYED | Deployed to test environment |
| SECURITY_REVIEW | Security scan passed |
| PRODUCTION_READY | Ready for production deployment |

## CLI Reference

```bash
mai-gate status              # Show all gates
mai-gate current             # Show current gate
mai-gate pass <name>         # Mark gate as passed
mai-gate fail <name> -r "x"  # Mark gate as failed
mai-gate block <name> -r "x" # Mark gate as blocked
mai-gate init                # Initialize from CLAUDE.md
```

## Integration with CLAUDE.md

Gates are stored in `project-state.yaml` but referenced in `CLAUDE.md`:

```markdown
## Current Phase

**Phase:** BUILD
**Gate Required:** TESTS_EXIST
**Previous Gate:** DESIGN_APPROVED (2026-01-08)
```

Update CLAUDE.md when gates change to maintain visibility in sessions.
