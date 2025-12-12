# /openspec-apply

Implement a change from an approved OpenSpec proposal.

## When Invoked

1. **Identify the change to implement:**
   > Which change should I implement?
   >
   > List active changes with: `ls [openspec-path]/changes/`

2. **Read the proposal and specs:**
   - Read `proposal.md` for context
   - Read `specs/*.md` for requirements (SHALL/MUST)
   - Read `tasks.md` for implementation checklist

3. **Confirm understanding:**
   > Here's what I'll implement:
   >
   > **Requirements:**
   > - [List each SHALL/MUST requirement]
   >
   > **Tasks:**
   > - [List tasks from tasks.md]
   >
   > Ready to proceed?

4. **Consult on test approach:**
   > Which testing approach would you like to use?
   >
   > | Approach | Description | Best For |
   > |----------|-------------|----------|
   > | **Automated (TDD)** | pai-tooling pattern with test specs | Complex features, CI/CD, ongoing maintenance |
   > | **Manual** | ACCEPTANCE_TESTS.md with human verification | Simple changes, quick iteration, exploration |
   >
   > Please choose: `automated` or `manual`

5. **Write tests (based on chosen approach):**

   **If Automated (TDD):**
   - Each spec requirement → test case
   - Tests SHOULD fail initially (no implementation yet)
   - Map test IDs to requirements

   ```
   SPEC: Requirement: --name flag
   TEST: TEST-CLI-014

   SPEC: Scenario: CLI usage
   TEST: command: ingest direct --name "X"
   ```

   **If Manual:**
   - Create/update ACCEPTANCE_TESTS.md in the skill directory
   - Each spec requirement → manual test case
   - Define clear pass/fail criteria

   ```markdown
   ## Test: [Requirement Name]
   **Precondition:** [Setup required]
   **Steps:**
   1. [Action to take]
   2. [Action to take]
   **Expected:** [What should happen]
   **Pass Criteria:** [How to verify]
   ```

6. **Implement:**
   - Follow tasks.md checklist
   - Update tasks.md as you complete items
   - Commit frequently
   - **If Automated:** Run tests after each change
   - **If Manual:** Verify against acceptance criteria

7. **Validate:**
   - **If Automated:** All tests pass, no regressions
   - **If Manual:** Walk through ACCEPTANCE_TESTS.md with user
   - Implementation matches spec requirements

8. **Report completion:**
   > Implementation complete for `[change-name]`:
   >
   > **Testing approach:** [Automated/Manual]
   > **Tests:** [X passed / X manual tests verified]
   > **Tasks:** X/X completed
   >
   > Ready to archive with `/openspec-archive`?

## Spec → Test → Code Flow

```
openspec/changes/[name]/specs/    →    tests/[name].spec.ts    →    src/[impl].ts
         (requirements)                  (validation)               (code)
```

## Reference

- SpecFirst workflow: `.claude/skills/SpecFirst/workflows/Develop.md`
- Test pyramid: `.claude/skills/SpecFirst/docs/TestPyramid.md`
