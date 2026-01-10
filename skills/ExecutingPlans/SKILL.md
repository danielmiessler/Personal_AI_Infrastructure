---
name: ExecutingPlans
description: Execute implementation plans with review checkpoints. USE WHEN you have a written plan to implement OR executing multi-task development OR following a plan document. Batch execution with verification.
---

# Executing Implementation Plans

## Overview

Load plan, review critically, execute tasks in batches, report for review between batches.

**Core principle:** Batch execution with checkpoints for review.

**Announce at start:** "I'm using the ExecutingPlans skill to implement this plan."

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **ExecutePlan** | Plan document ready | Batch execution with checkpoints |

## The Process

### Step 1: Load and Review Plan

1. **Read the plan file completely**
2. **Review critically**
   - Identify any questions or concerns
   - Check for missing information
   - Verify file paths exist or can be created
3. **If concerns:** Raise them before starting
4. **If no concerns:** Create todo list and proceed

### Step 2: Execute Batch

**Default: 3 tasks per batch**

For each task:
1. Mark as `in_progress` in todo list
2. Follow each step exactly as written
3. Run verifications as specified
4. Use **TestDrivenDevelopment** skill for TDD steps
5. Use **VerificationBeforeCompletion** before claiming done
6. Mark as `completed`

### Step 3: Report for Review

When batch complete:
```
Batch complete (Tasks 1-3):

✅ Task 1: [name] - [brief outcome]
✅ Task 2: [name] - [brief outcome]
✅ Task 3: [name] - [brief outcome]

Verification:
- Tests: [X/X pass]
- Build: [status]

Ready for feedback before continuing to Tasks 4-6.
```

**Optional: Request formal code review**

For complex batches or before critical milestones:
- Use **RequestingCodeReview** skill to dispatch reviewer
- Address feedback using **ReceivingCodeReview** discipline
- Then continue to next batch

### Step 4: Continue or Adjust

Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

### Step 5: Complete Development

After all tasks complete and verified:
1. Announce: "Using FinishingBranch skill to complete this work."
2. Use **FinishingBranch** skill
3. Follow that skill to verify, present options, execute choice

## When to Stop and Ask

**STOP executing immediately when:**
- Hit a blocker mid-batch
- Missing dependency or unclear instruction
- Test fails unexpectedly
- Verification fails repeatedly
- Plan has critical gaps

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- User updates the plan based on feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Batch Execution Rules

| Rule | Why |
|------|-----|
| **3 tasks per batch** | Manageable review chunks |
| **Follow steps exactly** | Plan was validated |
| **Don't skip verifications** | Catch issues early |
| **Report between batches** | Enable course correction |
| **Stop when blocked** | Don't guess |

## Examples

**Example 1: Normal execution**
```
Plan: 9 tasks

Batch 1 (Tasks 1-3): Execute, verify, report
-> User: "Looks good, continue"

Batch 2 (Tasks 4-6): Execute, verify, report
-> User: "Task 5 needs adjustment" -> Fix, re-verify

Batch 3 (Tasks 7-9): Execute, verify, report
-> All complete -> FinishingBranch skill
```

**Example 2: Blocked**
```
Batch 1: Task 2 fails - dependency missing

STOP. Report:
"Blocked on Task 2: Package X not installed.
 Plan doesn't mention this dependency.
 Should I: (a) add it, (b) skip this task, (c) revise plan?"
```

## Red Flags

- Executing without reading full plan
- Skipping verification steps
- Continuing past blockers
- Not reporting between batches
- Claiming done without evidence

## Related Skills

- **WritingPlans** - Creates the plan being executed
- **TestDrivenDevelopment** - Used within each task
- **VerificationBeforeCompletion** - Before claiming task done
- **SystematicDebugging** - When tests fail unexpectedly
- **FinishingBranch** - After all tasks complete
