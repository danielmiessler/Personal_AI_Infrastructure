# VerifyBeforeClaim Workflow

> **Trigger:** Any completion claim
> **Input:** Claim about work status
> **Output:** Claim with evidence or corrected status

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## Step 1: Identify Verification Command

What command proves this claim?

| Claim Type | Command |
|------------|---------|
| Tests pass | `bun test` |
| Build succeeds | `bun build` or project build command |
| Lint clean | `bun run lint` or project lint command |
| Bug fixed | Reproduction steps |
| Requirements met | Checklist against plan |

## Step 2: Run Full Command

Execute the FULL command (fresh, complete):

```bash
# Example: Run all tests
bun test

# Example: Run build
bun build
```

**No shortcuts:**
- Full test suite, not single file
- Fresh run, not cached
- Complete output, not partial

## Step 3: Read Output

Read the complete output:
- Check exit code (0 = success)
- Count failures/errors
- Note warnings
- Look for unexpected output

## Step 4: Verify Against Claim

Does output confirm the claim?

```
IF output confirms claim:
  State claim WITH evidence
  "All 47 tests pass (see output above)"

IF output contradicts claim:
  State actual status with evidence
  "3 tests failing: [list failures]"
```

## Step 5: Make Claim (Only Now)

Only after Steps 1-4 are complete can you claim:

```
RIGHT: "Build passes - exit 0, no errors"
RIGHT: "Tests pass - 34/34 green"
RIGHT: "Lint clean - 0 errors, 0 warnings"

WRONG: "Should pass now"
WRONG: "Tests probably pass"
WRONG: "I'm confident it works"
```

## Red Flags - STOP

If you catch yourself:
- Using "should", "probably", "seems to"
- Expressing satisfaction before verification
- About to commit without verification
- Trusting agent success reports
- Relying on partial verification

**STOP and return to Step 1.**

## Completion

After verification evidence is shown:

```
[Claim] verified. Returning to [caller skill] to continue.
```

## Skills Invoked

None - this is a terminal discipline.

## Called By

| Skill | Context |
|-------|---------|
| ExecutingPlans | Before claiming task done |
| FinishingBranch | Step 1 test verification |
| RequestingCodeReview | Before requesting review |
| SystematicDebugging | Verify fix worked |
| ReceivingCodeReview | After implementing feedback |
