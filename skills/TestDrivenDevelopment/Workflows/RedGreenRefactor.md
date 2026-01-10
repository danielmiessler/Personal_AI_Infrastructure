# RedGreenRefactor Workflow

> **Trigger:** Any implementation task
> **Input:** Feature requirement or change request
> **Output:** Working code with tests

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

## RED - Write Failing Test

Write one minimal test showing what should happen.

```typescript
test('specific behavior description', () => {
  const result = functionName(input);
  expect(result).toBe(expected);
});
```

**Requirements:**
- One behavior only
- Clear descriptive name
- Real code (no mocks unless unavoidable)

## Verify RED

```bash
bun test path/to/test.test.ts
```

Confirm:
- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

## GREEN - Minimal Code

Write simplest code to pass the test.

```typescript
function functionName(input: Type): ReturnType {
  return expected;
}
```

Don't add features, refactor other code, or "improve" beyond the test.

## Verify GREEN

```bash
bun test path/to/test.test.ts
```

Confirm:
- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

## REFACTOR

After green only:
- Remove duplication
- Improve names
- Extract helpers

Keep tests green. Don't add behavior.

## Repeat

Next failing test for next feature.

## Verification Checklist

Before marking complete:
- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Tests use real code (mocks only if unavoidable)

Can't check all boxes? Start over.

## Completion

When all tests pass and verification checklist is complete:

```
TDD cycle complete. All tests passing, code is minimal and clean.
```

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| None | This workflow does not invoke other skills |
