# ModifyPatterns Workflow

> **Trigger:** "add path to zero access", "block command", "update damage control", "modify security rules"
> **Input:** User request to add/remove patterns or paths
> **Output:** Updated patterns.yaml with new security rules

## Step 1: Understand the Request

Clarify what the user wants to modify:

1. **Add bash pattern** - Block a new command pattern
2. **Add path to zeroAccessPaths** - Complete lockdown on a path
3. **Add path to readOnlyPaths** - Allow read, block modifications
4. **Add path to noDeletePaths** - Allow all except deletion
5. **Remove a pattern or path** - Reduce restrictions
6. **Add ask pattern** - Require confirmation instead of blocking

Ask the user which category their request falls into if unclear.

## Step 2: Read Current Configuration

Read the current patterns.yaml:

```bash
cat $PAI_DIR/skills/DamageControl/patterns.yaml
```

Identify the section to modify:
- `bashToolPatterns` for command patterns
- `zeroAccessPaths`, `readOnlyPaths`, or `noDeletePaths` for path restrictions

## Step 3: Validate the Request

**For bash patterns:**
- Ensure the regex is valid
- Test the pattern matches intended commands
- Verify it doesn't have false positives (blocking safe commands)

**For path patterns:**
- Verify the path syntax (absolute, relative, or glob)
- Check for conflicts with existing patterns
- Ensure the protection level is appropriate

## Step 4: Edit patterns.yaml

Add the new entry to the appropriate section in patterns.yaml.

**Example - Adding a bash pattern:**
```yaml
bashToolPatterns:
  # ... existing patterns ...
  - pattern: '\bnew-dangerous-cmd\b'
    reason: Custom blocked command
```

**Example - Adding an ask pattern:**
```yaml
bashToolPatterns:
  # ... existing patterns ...
  - pattern: '\brisky-but-valid\b'
    reason: Risky operation requiring confirmation
    ask: true
```

**Example - Adding a path:**
```yaml
zeroAccessPaths:
  # ... existing paths ...
  - ~/.secrets/
```

## Step 5: Test the Change

Run the test tool to verify the new pattern works:

```bash
# For bash patterns
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "your-command" --expect-blocked

# For path patterns
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts edit Edit "/your/path" --expect-blocked
```

## Step 6: Verify No Regressions

Run the quick test suite:

```bash
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts -t
```

All existing tests should still pass.

## Step 7: Restart Claude Code

Remind the user:

> **Important:** Restart Claude Code for changes to take effect. Hooks are loaded at session start.

## Completion

The patterns.yaml has been updated with the new security rule. The change will be active after restarting Claude Code.

## Skills Invoked

| Step | Skill |
|------|-------|
| Step 6 | VerificationBeforeCompletion |
