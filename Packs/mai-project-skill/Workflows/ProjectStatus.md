# ProjectStatus Workflow

## Purpose

Display the current status of a MAI project, including phase, gates, and task progress.

## Trigger Phrases

- "project status"
- "show project"
- "where are we"

## Steps

### 1. Locate Project State

Look for project state in order:
1. `project-state.yaml` (preferred)
2. `CLAUDE.md` (fallback, parse gates from markdown)
3. `CLAUDE.local.md` (session state)

### 2. Display Project Summary

Present:
- Project name
- Project type
- Current phase
- Gate status overview

### 3. Gate Status Table

Show all gates with their status:

| Gate | Status | Date |
|------|--------|------|
| SPEC_APPROVED | Passed | 2026-01-05 |
| DESIGN_APPROVED | Passed | 2026-01-08 |
| TESTS_EXIST | Pending | - |
| SECURITY_REVIEW | Pending | - |

### 4. Current Task

If `CLAUDE.local.md` exists, show:
- Current in-progress task
- Task progress percentage
- Recent decisions

### 5. Running Agents

If agents are active, show:
- Agent ID
- Task description
- Status (running/completed)

### 6. Modified Files

Show files changed in the current session.

## CLI Alternative

```bash
mai-gate status    # Show gate status
mai-gate current   # Show current gate only
```

## Output Format

```
=== Project: <name> ===

Type: Software
Phase: BUILD
Progress: 60% (3/5 gates passed)

Gates:
  [x] SPEC_APPROVED (2026-01-05)
  [x] DESIGN_APPROVED (2026-01-08)
  [ ] TESTS_EXIST (current)
  [ ] SECURITY_REVIEW
  [ ] VERIFY_COMPLETE

Current Task: Build mai-project-skill
Task Progress: 2/8 (25%)

Recent Files:
  - src/Tools/mai-init.ts
  - src/Workflows/CreateProject.md
```

## Next Steps Suggestion

Based on current phase, suggest the next action:
- **SPEC**: "Complete the specification document"
- **DESIGN**: "Finish design document and get approval"
- **BUILD**: "Implement features and add tests"
- **VERIFY**: "Complete security review and verification"
