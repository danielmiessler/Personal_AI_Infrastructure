# ExecutePlan Workflow

> **Trigger:** Plan document ready
> **Input:** Implementation plan from WritingPlans
> **Output:** Implemented features with tests passing

## Step 1: Load and Review Plan

1. Read the plan file completely
2. Review critically:
   - Identify questions or concerns
   - Check for missing information
   - Verify file paths exist or can be created
3. If concerns: Raise before starting
4. If no concerns: Create todo list and proceed

## Step 2: Execute Batch (3 tasks per batch)

For each task:

1. Mark as `in_progress` in todo list
2. Follow each step exactly as written
3. Run verifications as specified
4. **Use TestDrivenDevelopment skill** for TDD steps
5. **Use VerificationBeforeCompletion** before claiming done
6. Mark as `completed`

## Step 3: Report for Review

After each batch:

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

**Optional:** Use **RequestingCodeReview** skill for complex batches.

## Step 4: Continue or Adjust

Based on feedback:
- Apply changes if needed
- Execute next batch
- Repeat until complete

## Step 5: Complete Development

After all tasks complete and verified:

1. Announce: "Using FinishingBranch skill to complete this work."
2. **Use FinishingBranch skill**
3. Follow that skill to verify, present options, execute choice

## When to Stop and Ask

**STOP immediately when:**
- Hit a blocker mid-batch
- Missing dependency or unclear instruction
- Test fails unexpectedly → Use **SystematicDebugging**
- Verification fails repeatedly
- Plan has critical gaps

**Ask for clarification rather than guessing.**

## Completion

After all tasks complete and verified:

```
All tasks complete. Using FinishingBranch skill to finalize this work.
```

**Next skill:** FinishingBranch

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Per-task TDD | TestDrivenDevelopment |
| Before claiming done | VerificationBeforeCompletion |
| Test fails unexpectedly | SystematicDebugging |
| After batch (optional) | RequestingCodeReview |
| All tasks complete | FinishingBranch |
