---
name: VerificationBeforeCompletion
description: Verification discipline before claiming completion. INTERNAL DISCIPLINE - invoked by ExecutingPlans, FinishingBranch, SystematicDebugging, and code review skills. Evidence before assertions. Not directly triggered by user requests.
tier: internal
---

# Verification Before Completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

**Violating the letter of this rule is violating the spirit of this rule.**

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **VerifyBeforeClaim** | Any completion claim | Run verification, show evidence |

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows changes | Agent reports "success" |
| Requirements met | Line-by-line checklist | Tests passing |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence != evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter != compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion != excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**
```
[Run test command] [See: 34/34 pass] "All tests pass"
NOT: "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**
```
Write -> Run (pass) -> Revert fix -> Run (MUST FAIL) -> Restore -> Run (pass)
NOT: "I've written a regression test" (without red-green verification)
```

**Build:**
```
[Run build] [See: exit 0] "Build passes"
NOT: "Linter passed" (linter doesn't check compilation)
```

**Requirements:**
```
Re-read plan -> Create checklist -> Verify each -> Report gaps or completion
NOT: "Tests pass, phase complete"
```

**Agent delegation:**
```
Agent reports success -> Check VCS diff -> Verify changes -> Report actual state
NOT: Trust agent report
```

## Examples

**Example 1: Claiming tests pass**
```
WRONG: "The tests should pass now"
RIGHT: *runs bun test* "34/34 tests pass (output above)"
```

**Example 2: Claiming bug is fixed**
```
WRONG: "Fixed the bug"
RIGHT: *runs reproduction steps* "Bug no longer reproduces - see output"
```

**Example 3: Claiming work complete**
```
WRONG: "All done!"
RIGHT: *runs full verification suite*
       "Build: exit 0
        Tests: 47/47 pass
        Lint: 0 errors
        Work complete."
```

## When To Apply

**ALWAYS before:**
- ANY variation of success/completion claims
- ANY expression of satisfaction
- ANY positive statement about work state
- Committing, PR creation, task completion
- Moving to next task
- Delegating to agents

**Rule applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

## Related Skills

**Called by:**
- **ExecutingPlans** - Before claiming task done
- **FinishingBranch** - Step 1 test verification
- **RequestingCodeReview** - Before requesting review
- **SystematicDebugging** - Verify fix worked
- **ReceivingCodeReview** - After implementing feedback

**Pairs with:**
- **TestDrivenDevelopment** - Ensures tests exist to verify
- **SystematicDebugging** - Verify fix worked at Phase 4

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.
