# CreatePlan Workflow

> **Trigger:** Requirements ready (from Brainstorming or direct user input)
> **Input:** Approved design or clear requirements
> **Output:** Implementation plan saved to `docs/plans/`

## Prerequisites Check

Verify ONE of:
1. Design from Brainstorming - approved approach
2. Clear requirements - explicit, unambiguous
3. Simple task - straightforward implementation

**If unclear:** Go back to Brainstorming first.

## Step 1: Create Plan Header

```markdown
# [Feature Name] Implementation Plan

> **For execution:** Use ExecutingPlans skill to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Step 2: Break Into Bite-Sized Tasks

Each task is ONE action (2-5 minutes):

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts:123-145`
- Test: `tests/exact/path/to/test.ts`

**Step 1: Write the failing test**
[Complete test code]

**Step 2: Run test to verify it fails**
Run: `bun test tests/path/test.ts`
Expected: FAIL with "[error message]"

**Step 3: Write minimal implementation**
[Complete implementation code]

**Step 4: Run test to verify it passes**
Run: `bun test tests/path/test.ts`
Expected: PASS

**Step 5: Commit**
git add ... && git commit -m "..."
```

## Step 3: Validate Plan Quality

Checklist:
- [ ] Exact file paths (no ambiguity)
- [ ] Complete code in plan (not "add validation")
- [ ] Exact commands with expected output
- [ ] TDD steps (test → fail → implement → pass → commit)
- [ ] Each step is 2-5 minutes

## Step 4: Save Plan

Save to: `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Completion

```
Plan complete and saved to `docs/plans/<filename>.md`.

Ready to execute? Use the ExecutingPlans skill to implement task-by-task with review checkpoints.
```

**Next skill:** ExecutingPlans

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| Plan ready for execution | ExecutingPlans |
