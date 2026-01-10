# EvaluateFeedback Workflow

> **Trigger:** Receiving review comments
> **Input:** Code review feedback
> **Output:** Feedback addressed or pushed back

## The Response Pattern

```
WHEN receiving code review feedback:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate requirement in own words (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## Step 1: Read Complete Feedback

Read ALL feedback items before acting:
- Don't react emotionally
- Don't implement immediately
- Note categories (Critical, Important, Minor)

## Step 2: Clarify Unclear Items

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**
```
"I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

## Step 3: Verify Against Codebase

For each suggestion:

```bash
# Check if referenced code exists
grep -r "pattern" .

# Check if suggestion would break existing code
git diff --stat
```

Questions to answer:
- Technically correct for THIS codebase?
- Breaks existing functionality?
- Reason for current implementation?
- Works on all platforms/versions?
- Does reviewer understand full context?

## Step 4: Evaluate and Respond

### If Feedback is Correct

```
RIGHT: "Fixed. [Brief description of what changed]"
RIGHT: "Good catch - [specific issue]. Fixed in [location]."
RIGHT: [Just fix it and show in the code]

WRONG: "You're absolutely right!"
WRONG: "Great point!"
WRONG: "Thanks for catching that!"
```

### If Feedback is Wrong

Push back with technical reasoning:

```
RIGHT: "This breaks backward compat - we support macOS 10.15+ but this API needs 13+. Keep legacy path?"
RIGHT: "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)?"
```

## Step 5: Implement Fixes

Order of implementation:

1. **Blocking issues** - Breaks, security vulnerabilities
2. **Simple fixes** - Typos, imports, formatting
3. **Complex fixes** - Refactoring, logic changes

For each fix:
```
1. Make the change
2. Run tests
3. Verify no regressions
4. Move to next item
```

## Step 6: Re-verify

After all fixes:

```
Using VerificationBeforeCompletion to confirm all fixes work.
```

## Forbidden Responses

**NEVER say:**
- "You're absolutely right!"
- "Great point!"
- "Excellent feedback!"
- "Thanks for catching that!"
- ANY gratitude expression before verification

## Completion

After feedback addressed:

```
Feedback addressed. [N] items fixed, [M] pushed back with reasoning.

Using VerificationBeforeCompletion to confirm fixes.
```

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 6 | VerificationBeforeCompletion |
| If changes significant | RequestingCodeReview (re-review) |
