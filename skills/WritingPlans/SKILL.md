---
name: WritingPlans
description: Create detailed implementation plans with bite-sized TDD steps. USE WHEN you have requirements for a multi-step task OR after brainstorming OR before touching code for complex features. Plans assume zero codebase context.
---

# Writing Implementation Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for the codebase. Document everything: which files to touch, complete code, how to test, exact commands.

**Core principle:** Bite-sized TDD steps. DRY. YAGNI. Frequent commits.

**Announce at start:** "I'm using the WritingPlans skill to create the implementation plan."

## Prerequisites

This skill expects ONE of:
1. **Design from Brainstorming** - Approved approach from Brainstorming skill
2. **Clear requirements** - User provided explicit, unambiguous requirements
3. **Simple task** - Straightforward implementation with known approach

**If requirements are unclear:** Go back to Brainstorming first.

## Workflow Routing

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **CreatePlan** | Requirements ready | Generate detailed task plan |

## Plan Location

Save plans to: `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Plan Document Header

Every plan MUST start with:

```markdown
# [Feature Name] Implementation Plan

> **For execution:** Use ExecutingPlans skill to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Bite-Sized Task Granularity

**Each step is ONE action (2-5 minutes):**

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`
- Test: `tests/exact/path/to/test.ts`

**Step 1: Write the failing test**

```typescript
test('specific behavior description', () => {
  const result = functionName(input);
  expect(result).toBe(expected);
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/path/test.ts`
Expected: FAIL with "functionName is not defined"

**Step 3: Write minimal implementation**

```typescript
export function functionName(input: Type): ReturnType {
  return expected;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/path/test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.ts src/path/file.ts
git commit -m "feat: add specific feature"
```
```

## Plan Requirements

| Requirement | Why |
|-------------|-----|
| **Exact file paths** | No ambiguity about where code goes |
| **Complete code in plan** | Not "add validation" - show the actual code |
| **Exact commands** | Include expected output |
| **TDD steps** | Write test → fail → implement → pass → commit |
| **One thing per step** | Each step is 2-5 minutes |

## Execution Handoff

After saving the plan, offer execution choice:

```
Plan complete and saved to `docs/plans/<filename>.md`.

Ready to execute? Use the ExecutingPlans skill to implement task-by-task with review checkpoints.
```

## Examples

**Example 1: API endpoint**
```markdown
### Task 1: User validation endpoint

**Files:**
- Create: `src/api/validate.ts`
- Test: `tests/api/validate.test.ts`

**Step 1: Write failing test**
```typescript
test('rejects empty email', async () => {
  const result = await validateUser({ email: '' });
  expect(result.valid).toBe(false);
  expect(result.error).toBe('Email required');
});
```

**Step 2: Run test**
Run: `bun test tests/api/validate.test.ts`
Expected: FAIL - validateUser not defined

**Step 3: Implement**
```typescript
export async function validateUser(data: UserInput): Promise<ValidationResult> {
  if (!data.email?.trim()) {
    return { valid: false, error: 'Email required' };
  }
  return { valid: true };
}
```

**Step 4: Verify**
Run: `bun test tests/api/validate.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/api/validate.ts tests/api/validate.test.ts
git commit -m "feat: add user validation with email check"
```
```

## Red Flags

- Vague steps ("add validation")
- Missing file paths
- Multiple actions per step
- No test commands
- No expected output
- Steps longer than 5 minutes

## Related Skills

- **Brainstorming** - Precedes this (design exploration)
- **ExecutingPlans** - Follows this (implementation)
- **TestDrivenDevelopment** - Embedded in each task
