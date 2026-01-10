# BugFix Workflow

> **Trigger:** Bug report or unexpected behavior
> **Input:** Bug description or failing behavior
> **Output:** Fixed code with regression test

## Step 1: Understand the Bug

Before writing any code:
1. Read error messages carefully
2. Reproduce the bug consistently
3. Identify the expected vs actual behavior

## Step 2: Write Failing Test

Write a test that demonstrates the bug:

```typescript
test('rejects empty email', async () => {
  const result = await validateUser({ email: '' });
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Email required');
});
```

This test MUST:
- Fail initially (proving the bug exists)
- Pass after fix (proving the bug is fixed)

## Step 3: Verify Test Fails

```bash
bun test path/to/test.test.ts
```

Confirm the test fails for the expected reason (bug behavior, not syntax error).

## Step 4: Implement Fix

Write minimal code to make the test pass:

```typescript
if (!data.email?.trim()) {
  return { valid: false, error: 'Email required' };
}
```

## Step 5: Verify Fix

```bash
bun test path/to/test.test.ts
```

Confirm:
- Bug test now passes
- All other tests still pass
- No new warnings or errors

## Step 6: Commit

```bash
git add <files>
git commit -m "fix: prevent empty email acceptance"
```

## Completion

After fix is verified:
- Return to calling workflow (ExecutingPlans, etc.)
- Mark task as complete

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Root cause unclear | SystematicDebugging |
