# BUILD Phase

**Purpose:** REFINE ISC rows for testability.

**ISC Mutation:** REFINE rows (make each verifiable)

**Gate Question:** Is each row specific enough to verify?

## What Happens

1. **Review each row** - Can it be tested?
2. **Add success criteria** - How do we know it's done?
3. **Make rows measurable** - Specific, not vague
4. **Prepare verification plan** - How will VERIFY phase check this?

## Testability Checklist

For each row, ask:
- [ ] Can I write a test for this?
- [ ] Can I visually verify this?
- [ ] Is there a measurable outcome?
- [ ] Will I know when it's done?

## Refinement Examples

**Vague → Specific:**

| Before | After |
|--------|-------|
| "Works well" | "Response time < 200ms" |
| "Looks good" | "Matches design mockup, passes visual diff" |
| "Secure" | "No XSS, SQL injection, or CSRF vulnerabilities" |
| "Tests pass" | "All existing tests pass, 2+ new tests added" |
| "Handles errors" | "Shows user-friendly error message on failure" |

**Adding verification method:**

| Row | Verification Method |
|-----|---------------------|
| "Button in navbar" | Browser screenshot shows button |
| "Logout works" | Click test, verify redirect |
| "Tests pass" | `bun test` exits 0 |
| "TypeScript" | `tsc --noEmit` passes |

## Example

**Before BUILD:**
| # | What Ideal Looks Like |
|---|------------------------|
| 1 | Logout button in navbar |
| 2 | Clicking logs out and redirects |
| 7 | Browser-verified |

**After BUILD:**
| # | What Ideal Looks Like |
|---|------------------------|
| 1 | Logout button visible in navbar (top-right, matches existing button style) |
| 2 | Click logout → clears session → redirects to /login within 500ms |
| 7 | Browser screenshot confirms button visible and functional |

## Commands

```bash
# Update phase
bun run ISCManager.ts phase -p BUILD

# Rows are refined in place (update descriptions if needed)
bun run ISCManager.ts show -o markdown
```

## Exit Criteria

- Every row has clear success criteria
- Verification method identified for each
- No vague or unmeasurable rows
- Ready for EXECUTE phase
