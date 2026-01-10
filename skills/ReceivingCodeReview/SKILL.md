---
name: ReceivingCodeReview
description: Handle code review feedback with technical rigor. USE WHEN receiving code review feedback OR implementing reviewer suggestions OR feedback seems unclear OR feedback seems technically questionable. No performative agreement, verify before implementing.
---

# Receiving Code Review

## Overview

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **EvaluateFeedback** | Receiving review comments | Verify, evaluate, respond |

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

## Forbidden Responses

**NEVER:**
- "You're absolutely right!"
- "Great point!" / "Excellent feedback!"
- "Let me implement that now" (before verification)
- "Thanks for catching that!"
- ANY gratitude expression

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**
```
Reviewer: "Fix 1-6"
You understand 1,2,3,6. Unclear on 4,5.

WRONG: Implement 1,2,3,6 now, ask about 4,5 later
RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

## Source-Specific Handling

### From User (Trusted)
- Implement after understanding
- Still ask if scope unclear
- No performative agreement
- Skip to action or technical acknowledgment

### From External Reviewers
```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF can't easily verify:
  Say so: "I can't verify this without [X]. Should I [investigate/ask/proceed]?"

IF conflicts with user's prior decisions:
  Stop and discuss with user first
```

## YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint isn't called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

## Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with user's architectural decisions

**How to push back:**
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve user if architectural

## Acknowledging Correct Feedback

When feedback IS correct:
```
RIGHT: "Fixed. [Brief description of what changed]"
RIGHT: "Good catch - [specific issue]. Fixed in [location]."
RIGHT: [Just fix it and show in the code]

WRONG: "You're absolutely right!"
WRONG: "Great point!"
WRONG: "Thanks for catching that!"
```

**Why no thanks:** Actions speak. Just fix it. The code itself shows you heard the feedback.

## Gracefully Correcting Your Pushback

If you pushed back and were wrong:
```
RIGHT: "You were right - I checked [X] and it does [Y]. Implementing now."
RIGHT: "Verified this and you're correct. My initial understanding was wrong because [reason]. Fixing."

WRONG: Long apology
WRONG: Defending why you pushed back
WRONG: Over-explaining
```

State the correction factually and move on.

## Examples

**Example 1: Performative Agreement (Bad)**
```
Reviewer: "Remove legacy code"
WRONG: "You're absolutely right! Let me remove that..."
```

**Example 2: Technical Verification (Good)**
```
Reviewer: "Remove legacy code"
RIGHT: "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**Example 3: YAGNI Check (Good)**
```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
RIGHT: "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |

## After Implementing Feedback

Once you've addressed review feedback:

1. **Re-run verification** - Use VerificationBeforeCompletion
2. **Return to execution** - If in ExecutingPlans, mark task as needing re-verification
3. **Request re-review** - Use RequestingCodeReview if significant changes made
4. **Continue workflow** - Return to FinishingBranch for completion options

**Handoff:** "Feedback addressed. Using VerificationBeforeCompletion to confirm fixes."

## Related Skills

**Called by:**
- **RequestingCodeReview** - After review is requested
- **FinishingBranch** - Option 2 (Create PR) may trigger review

**Returns to:**
- **ExecutingPlans** - After implementing feedback
- **FinishingBranch** - To continue completion flow

## The Bottom Line

**External feedback = suggestions to evaluate, not orders to follow.**

Verify. Question. Then implement.

No performative agreement. Technical rigor always.
