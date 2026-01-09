# VERIFY Phase

**Purpose:** CHECK each ISC row against its success criteria.

**ISC Mutation:** VERIFY results (PASS/ADJUSTED/BLOCKED)

**Gate Question:** Does reality match ideal? What gaps remain?

## What Happens

1. **Verify each row** - Test against success criteria from BUILD phase
2. **Use appropriate verification method** - Tests, visual checks, browser automation
3. **Record results** - PASS, ADJUSTED (acceptable deviation), or BLOCKED
4. **Identify gaps** - What didn't work as expected?

## Verification Traits

**CRITICAL:** Verification agents ALWAYS use skeptical traits, regardless of effort level.

```bash
# Verification always uses these traits:
--traits "skeptical,meticulous,adversarial"
```

This ensures verification is independent and rigorous, not just confirming what we expect.

## Verification Methods

| Verification Type | Method | Example |
|-------------------|--------|---------|
| **Automated Tests** | `bun test`, `npm test` | "All tests pass" |
| **Type Checking** | `tsc --noEmit` | "TypeScript compiles" |
| **Visual** | Browser skill screenshot | "Button visible in navbar" |
| **Functional** | Browser skill interaction | "Click logs out user" |
| **Performance** | Timing measurement | "Response < 200ms" |
| **Security** | Security scan tools | "No XSS vulnerabilities" |

## Browser Verification

For UI/UX verification, use the Browser skill:

```bash
# Take screenshot
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot <url> /tmp/verify.png

# Verify element exists
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts verify <url> "button.logout"

# View screenshot
Read /tmp/verify.png
```

## Verification Results

| Result | Meaning | Action |
|--------|---------|--------|
| **PASS** | Meets success criteria exactly | Row complete |
| **ADJUSTED** | Acceptable deviation from ideal | Document why, row complete |
| **BLOCKED** | Cannot verify, issue found | Escalate or iterate |

## Recording Results

```bash
# Row passes verification
bun run ISCManager.ts verify --row 1 --result PASS

# Row adjusted (acceptable deviation)
bun run ISCManager.ts verify --row 2 --result ADJUSTED --reason "250ms instead of 200ms - acceptable"

# Row blocked (verification failed)
bun run ISCManager.ts verify --row 3 --result BLOCKED --reason "Button not visible on mobile"
```

## Example Verification

**ISC rows to verify:**
| # | What Ideal Looks Like | Verification Method |
|---|------------------------|---------------------|
| 1 | Logout button visible (top-right) | Browser screenshot |
| 2 | Click logout → redirect to /login | Browser interaction |
| 3 | Tests pass | `bun test` |
| 4 | TypeScript compiles | `tsc --noEmit` |

**Verification sequence:**

```bash
# 1. Screenshot verification
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts screenshot http://localhost:3000 /tmp/navbar.png
# Check: Is logout button visible top-right?

# 2. Functional verification
bun run $PAI_DIR/skills/Browser/Tools/Browse.ts open http://localhost:3000
# Click logout, verify redirect to /login

# 3. Test verification
bun test
# Check: Exit code 0?

# 4. Type verification
tsc --noEmit
# Check: No errors?
```

**Results:**
```bash
bun run ISCManager.ts verify --row 1 --result PASS
bun run ISCManager.ts verify --row 2 --result PASS
bun run ISCManager.ts verify --row 3 --result PASS
bun run ISCManager.ts verify --row 4 --result ADJUSTED --reason "1 type warning, non-blocking"
```

## Parallel Verification

Independent verifications can run in parallel:

- Screenshot checks (different pages)
- Independent test suites
- Separate type checks

Sequential verification needed for:
- Tests that modify state
- Checks that depend on prior results

## Commands

```bash
# Update phase
bun run ISCManager.ts phase -p VERIFY

# Record verification result
bun run ISCManager.ts verify --row <id> --result <PASS|ADJUSTED|BLOCKED> [--reason "..."]

# View current state
bun run ISCManager.ts show -o markdown
```

## Handling Failures

If verification finds issues:

1. **Minor issue** → Mark ADJUSTED with reason, continue
2. **Significant issue** → Mark BLOCKED, return to EXECUTE
3. **Scope change needed** → Mark BLOCKED, return to THINK/PLAN

## Exit Criteria

- Every row has been verified
- Results recorded: PASS, ADJUSTED, or BLOCKED
- BLOCKED rows have clear reasons
- Decision made: LEARN (success) or iterate (blocked rows)
