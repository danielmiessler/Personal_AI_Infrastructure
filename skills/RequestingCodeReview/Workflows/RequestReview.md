# RequestReview Workflow

> **Trigger:** Task completion, pre-merge
> **Input:** Completed work to review
> **Output:** Review feedback received

## Step 1: Gather Git Context

Get the commit range for review:

```bash
# For task completion
BASE_SHA=$(git rev-parse HEAD~1)
HEAD_SHA=$(git rev-parse HEAD)

# For full feature review
BASE_SHA=$(git merge-base origin/main HEAD)
HEAD_SHA=$(git rev-parse HEAD)
```

## Step 2: Prepare Context

Document what was implemented:

```markdown
## Review Request

**Changes:** {BASE_SHA}..{HEAD_SHA}
**Branch:** {BRANCH_NAME}

### What was implemented
{Brief description of changes}

### Requirements
{Link to plan or requirement list}

### Specific concerns
{Areas needing extra attention}

### How to test
{Commands to verify changes}
```

## Step 3: Dispatch Reviewer Subagent

Use Task tool to dispatch code reviewer:

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

## Step 4: Receive Feedback

Wait for reviewer response. Feedback will be categorized:

| Category | Action |
|----------|--------|
| Critical | Must fix immediately |
| Important | Must fix before merge |
| Minor | Note for later |

## Step 5: Process Feedback

```
IF Critical issues exist:
  → Use ReceivingCodeReview skill
  → Fix immediately before proceeding

IF only Important/Minor issues:
  → Use ReceivingCodeReview skill
  → Fix before merge

IF reviewer wrong:
  → Push back with technical reasoning
  → Show code/tests that prove it works
```

## Completion

After feedback received:

```
Review complete. [N] Critical, [M] Important, [P] Minor issues found.

Using ReceivingCodeReview skill to address feedback.
```

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 4-5 | ReceivingCodeReview |
| Before request | VerificationBeforeCompletion |
