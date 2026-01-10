# TestDamageControl Workflow

> **Trigger:** "test damage control", "verify hooks", "run security tests"
> **Input:** Optional specific test cases or categories
> **Output:** Test results showing which operations are blocked/allowed

## Step 1: Verify Hook Installation

Check that the hooks are configured in settings.json:

```bash
grep -A 5 "DamageControl" $PAI_DIR/settings.json
```

Expected: Three PreToolUse hooks for Bash, Edit, and Write tools.

## Step 2: Run Quick Test Suite

Execute the built-in test suite:

```bash
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts -t
```

This runs tests for:
- Dangerous bash commands (rm -rf, git reset --hard, terraform destroy)
- Safe bash commands (ls, git status)
- Protected paths (SSH keys, env files, lock files)

All tests should pass.

## Step 3: Interactive Testing (Optional)

If the user wants to test specific commands:

```bash
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts -i
```

This provides a menu-driven interface to test:
- Bash commands
- Edit file paths
- Write file paths

## Step 4: Test Specific Scenarios

**Test dangerous bash commands:**
```bash
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "rm -rf /tmp/test" --expect-blocked
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "git push --force origin main" --expect-blocked
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "terraform destroy" --expect-blocked
```

**Test protected paths:**
```bash
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts edit Edit "~/.ssh/id_rsa" --expect-blocked
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts write Write ".env" --expect-blocked
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts edit Edit "package-lock.json" --expect-blocked
```

**Test allowed operations:**
```bash
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "ls -la" --expect-allowed
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "git status" --expect-allowed
```

## Step 5: Test Ask Patterns

Test commands that should trigger confirmation dialogs:

```bash
# SQL DELETE with WHERE clause (ask pattern)
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "DELETE FROM users WHERE id = 5"
```

Expected output should show "ASK" status with JSON output.

## Step 6: Verify Real Hook Behavior

Test the hooks in a real Claude Code session:

1. Ask Claude to run a blocked command: "Run `rm -rf /tmp/testdir`"
2. Expected: Command is blocked with security message
3. Ask Claude to edit a protected file: "Edit ~/.ssh/config"
4. Expected: Edit is blocked with security message

## Step 7: Report Results

Summarize test results:

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Bash blocking | X | X | X |
| Bash allowing | X | X | X |
| Edit blocking | X | X | X |
| Write blocking | X | X | X |
| Ask patterns | X | X | X |

## Completion

Testing complete. All DamageControl hooks are functioning correctly.

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 6 | VerificationBeforeCompletion |
