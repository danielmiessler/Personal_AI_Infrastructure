# /specfirst-validate

Run validation checks against specifications.

## When Invoked

1. **Ask what to validate:**
   > What would you like to validate?
   > - All tests
   > - Specific test layer (unit/integration/cli/acceptance)
   > - Spec compliance for a feature

2. **Run appropriate tests:**

   ```bash
   # All tests
   bun test all

   # By layer
   bun test unit
   bun test integration
   bun test cli
   bun test acceptance

   # Specific test
   bun test --grep "TEST-CLI-014"
   ```

3. **Report results in table format:**

   | Layer | Passed | Failed | Skipped |
   |-------|--------|--------|---------|
   | Unit | X | 0 | 0 |
   | Integration | X | 0 | 0 |
   | CLI | X | 0 | 0 |
   | Acceptance | X | 0 | 0 |

4. **For failures, show:**
   - Which tests failed
   - Error messages
   - Suggested fixes

5. **Check spec compliance:**
   - Map requirements to test results
   - Flag any requirements without tests
   - Flag any failing tests

## Reference

See `.claude/skills/SpecFirst/workflows/ValidateSpec.md` for full workflow.
