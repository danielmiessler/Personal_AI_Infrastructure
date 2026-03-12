# Issues - Multi-Backend Inference

> **Purpose**: Problems encountered and their resolutions.
> **Format**: `## [TIMESTAMP] Task: {task-id}` followed by issue description and resolution.
> **Instruction to Subagents**: APPEND issues and resolutions here. Never overwrite.

---


## 2026-03-12 Task: 3 (F1 Oracle Rejection - Test Suite Regression)

**Context**: F1 oracle reported 1/21 tests failing in Inference.test.ts after Task 7 completed with all tests passing. Test was "inference uses LiteLLM path when config enabled=true" (Group 4, line 457).

**Root Cause Identified**:
- Test failure: Expected output "from litellm", received "from claude"
- This indicates the LiteLLM code path was skipped and fallback spawn was called
- Investigation showed `readInferenceConfig()` was not respecting the test variant parameter
- The function was reading the REAL `~/.claude/settings.json` file which has `inference.enabled: false`
- The file read succeeded (not an exception), so the test variant check at line 135 was never reached
- The test variant check only happened in the `if (!inference || ...)` branch, which was SKIPPED when settings contained an inference object

**Code Analysis**:
- The test loads module with `?test=fallback-enabled-path` to signal test mode
- Module-level `TEST_VARIANT = new URL(import.meta.url).searchParams.get('test')` correctly captures this
- However, the check `if (TEST_VARIANT.includes('fallback-enabled'))` was only in the "no inference settings" branch
- When real settings.json exists with `inference: { enabled: false, ... }`, the branch is skipped
- Result: Test variant override never applied, config stayed with `enabled: false`, LiteLLM path skipped

**Fix Applied**:
- Moved test variant override check to END of `readInferenceConfig()` function (after all settings processing)
- Added lines 70-71: Check for 'fallback-enabled' test variant and force `base.enabled = true`
- This ensures test variant overrides always apply REGARDLESS of settings file contents
- Test isolation is now guaranteed: test variants cannot be broken by production settings

**Files Modified**:
- `PAI/Tools/Inference.ts` - Added 3 lines for test variant override at end of function

**Verification Results**:
- ✅ Re-run full test suite: 21 pass, 0 fail (was 20 pass, 1 fail)
- ✅ Specific test now passes: "inference uses LiteLLM path when config enabled=true"
- ✅ No other tests affected by the change
- ✅ Test variant check now works even when production settings exist

**Lessons Learned**:
1. Test variant checks must be at the END of config loading, not middle
2. File-based settings will always "win" over test variants unless explicitly overridden
3. The pattern of checking a test variant/flag should apply to the FINAL config, not intermediate states
4. This bug wouldn't have appeared in a fresh environment without real settings.json

**Impact**:
- Resolves F1 oracle rejection issue #3
- All 21 tests now pass consistently
- Test suite is now isolated from production settings.json

