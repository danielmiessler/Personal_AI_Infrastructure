# Windows 11 Support — Development & Testing Rules

> **Read this before making ANY changes to Windows compatibility code.**
> These rules ensure cross-platform quality and prevent regressions.

**PRD Location:** `../../.prd/PRD-20260219-windows-11-support.md`

---

## 1. Forbidden Patterns (Hard Gates)

After ANY code change related to Windows support, these patterns MUST NOT exist in v3.0 TypeScript files. Verify with grep before claiming completion.

| Pattern | Grep Command | Allowed Count |
|---------|-------------|---------------|
| Bare `process.env.HOME!` without fallback | `grep -rn "process\.env\.HOME!" --include="*.ts"` | 0 |
| Hardcoded `/tmp/` in TypeScript | `grep -rn '"/tmp/' --include="*.ts"` | 0 |
| Hardcoded `/usr/bin/` or `/bin/` in spawn | `grep -rn "'/usr/bin/\|'/bin/" --include="*.ts"` | 0 |
| `chmod` or `chown` without platform guard | `grep -rn "chmod\|chown" --include="*.ts"` then verify each has `process.platform` check | 0 unguarded |
| `lsof` without platform guard | `grep -rn "lsof" --include="*.ts"` then verify each has platform check | 0 unguarded |
| Hardcoded Windows paths (`C:\\`, `%APPDATA%`) | `grep -rn 'C:\\\\|%APPDATA%|%USERPROFILE%' --include="*.ts"` | 0 (use abstractions) |
| `kill -9` without platform guard | `grep -rn "kill -9\|kill.*SIGTERM" --include="*.ts"` then verify | 0 unguarded |

**Rule:** If ANY forbidden pattern count is non-zero and unguarded, the work is NOT complete. Fix before proceeding.

## 2. Per-File Validation Gate

Before and after editing ANY file for Windows support:

1. **Before:** Note the bad-pattern grep count for patterns this file touches
2. **Edit:** Make the change
3. **After — Grep:** Re-run the relevant forbidden pattern greps. Count must decrease or stay at zero.
4. **After — Types:** Run `tsc --noEmit` (or `bun build --no-emit` if no tsconfig). No new type errors.
5. **After — Tests:** Run tests affected by this file. All must pass.

**Rule:** Never batch multiple files without running this gate between them. One file, one validation cycle.

## 3. Per-Phase Validation Gate

Before marking ANY milestone complete:

1. **Full Pattern Audit:** Run ALL forbidden pattern greps from Section 1 against the entire v3.0 directory. Report exact counts.
2. **Type Check:** Run full `tsc --noEmit` across the project. Zero errors.
3. **Test Suite:** Run the project's full test suite. All tests pass.
4. **Diff Review:** Review the complete `git diff`. Every change must either:
   - Use the `platform.ts` abstraction (not inline platform checks), OR
   - Be a platform guard (`if (process.platform !== 'win32')`) in a location where abstraction is overkill
5. **No Regressions:** Verify macOS/Linux code paths are unchanged or strictly additive.

**Rule:** Present the full pattern audit counts and test results as evidence. "PASS" without evidence is a violation of these rules.

## 4. Smoke Test Checkpoints (Require Windows Machine)

| After | What to Test | Why |
|-------|-------------|-----|
| platform.ts changes | Import and call `platform.ts` functions on Windows | Validates foundation |
| Hook changes | Run affected hooks on Windows — none should crash | Validates graceful degradation |
| Installer changes | Run installer on Windows from scratch | Validates end-to-end installation |
| Statusline/Banner changes | Visual check in Windows Terminal | Validates user-facing output |

## 5. Test Writing Requirements

For every platform abstraction created:

1. **Dual-platform unit tests:** Each function must have tests that mock `process.platform` as both `'darwin'` and `'win32'` and verify correct behavior on each.
2. **Regression test file:** `platform-audit.test.ts` greps for ALL forbidden patterns and fails if any survive. This test runs in CI and prevents future regressions.
3. **No-op verification:** For features that gracefully degrade on Windows (e.g., Kitty tab colors), test that the no-op path executes without error and without side effects.

## 6. Evidence Standards

When marking any criterion as PASS:

- **Grep criteria:** Cite the exact grep command and its output (count = 0)
- **Test criteria:** Cite the test file, test name, and pass/fail output
- **Visual criteria:** Attach or describe a screenshot from Windows Terminal
- **Behavioral criteria:** Describe the specific action taken and observed result

**Rule:** "Verified" or "looks good" is never acceptable evidence. State what you checked, what you found, and what the expected value was.

## 7. Architectural Constraints

1. **All platform logic flows through `platform.ts`** — No inline `process.platform` checks scattered across files. If you need to check the platform, add a function to `platform.ts` and call it.
2. **No new dependencies** — Solve Windows support with Bun/TypeScript built-ins and OS-level commands. Do not add npm packages for platform detection, path handling, or process management.
3. **Preserve the `hooks/lib/paths.ts` pattern** — This file is the reference implementation. New platform code should follow its conventions (`homedir()`, `tmpdir()`, env fallback chains).
4. **Hook output channels:** User-visible output goes to `stderr` (`process.stderr.write` or `console.error`). Structured JSON data for Claude Code goes to `stdout` (`console.log`).

## 8. Course Correction Protocol

1. **A grep count goes UP instead of down** — STOP. You introduced a new forbidden pattern. Revert and fix.
2. **Tests fail after a change** — STOP. Do not proceed to the next file. Fix the regression first.
3. **You discover a platform dependency NOT covered** — Add it immediately (new test + audit entry). Do not silently handle it.
4. **A smoke test fails on Windows** — STOP all work. Diagnose the root cause. Update the platform.ts foundation before touching anything else.
5. **You're unsure if a Windows API behaves as expected** — Do NOT guess. Research it or ask. Wrong assumptions compound.
