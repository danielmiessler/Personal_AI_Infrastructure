---
name: RequestingCodeReview
description: Request code review at appropriate checkpoints. USE WHEN completing tasks OR implementing major features OR before merging OR before creating PRs OR after fixing complex bugs. Review early, review often.
---

# Requesting Code Review

## Overview

Dispatch code reviewer subagent to catch issues before they cascade.

**Core principle:** Review early, review often.

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **RequestReview** | Task completion, pre-merge | Gather context, dispatch reviewer |

## When to Request Review

**Mandatory:**
- After each task in multi-task development
- After completing major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Gather context:**
- What was implemented
- What requirements/plan it should meet
- Base and head commits
- Brief description

**3. Dispatch reviewer subagent:**

Use Task tool with code review prompt:

```
Review the changes between {BASE_SHA} and {HEAD_SHA}.

What was implemented: {DESCRIPTION}
Requirements: {PLAN_OR_REQUIREMENTS}

Check for:
- Correctness: Does it do what's required?
- Completeness: Any missing pieces?
- Quality: Clean code, good names, no duplication?
- Tests: Adequate coverage?
- Edge cases: What could break?

Categorize issues as:
- Critical: Must fix before proceeding
- Important: Should fix before merge
- Minor: Nice to have
```

**4. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Examples

**Example 1: After completing a task**
```
[Just completed: Add verification function]

1. Get commits:
   BASE_SHA=a7981ec (before changes)
   HEAD_SHA=3df7661 (after changes)

2. Dispatch reviewer:
   "Review changes a7981ec..3df7661
    Implemented: Verification and repair functions
    Requirements: Task 2 from implementation plan
    Check for correctness, completeness, tests"

3. Reviewer returns:
   Important: Missing progress indicators
   Minor: Magic number for reporting interval

4. Fix progress indicators, then continue
```

**Example 2: Before merge**
```
[Feature complete, ready to merge]

1. Get commits:
   BASE_SHA=origin/main
   HEAD_SHA=HEAD

2. Dispatch reviewer with full feature scope

3. Fix all Critical and Important issues

4. Merge only when clean
```

## Integration with Workflows

**Multi-task Development:**
- Review after EACH task
- Catch issues before they compound
- Fix before moving to next task

**Executing Plans:**
- Review after each batch (3 tasks)
- Get feedback, apply, continue

**Ad-Hoc Development:**
- Review before merge
- Review when stuck

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Argue with valid technical feedback

**If reviewer wrong:**
- Push back with technical reasoning
- Show code/tests that prove it works
- Request clarification

## Review Request Template

```markdown
## Code Review Request

**Changes:** {BASE_SHA}..{HEAD_SHA}
**Branch:** {BRANCH_NAME}

### What was implemented
{BRIEF_DESCRIPTION}

### Requirements
{LINK_TO_PLAN_OR_LIST}

### Specific concerns
{ANY_AREAS_YOU_WANT_EXTRA_ATTENTION}

### How to test
{COMMANDS_TO_VERIFY}
```

## Related Skills

- **ReceivingCodeReview** - How to handle the feedback you receive
- **VerificationBeforeCompletion** - Verify your own work before requesting review

## The Bottom Line

**Don't merge without review.**

Small issues caught early save hours of debugging later.
