---
name: DamageControl
description: Defense-in-depth protection blocking dangerous commands and protected paths via PreToolUse hooks. USE WHEN user asks about security patterns OR blocked commands OR path protection OR wants to modify damage control rules.
---

# DamageControl

Defense-in-depth security system that intercepts Claude Code tool calls (Bash, Edit, Write) and blocks potentially dangerous operations before execution. Complements the existing `security-validator.ts` with expanded patterns and path-based access control.

## Protection Layers

| Layer | Tool | Protection |
|-------|------|------------|
| **Bash Patterns** | Bash | Blocks dangerous commands (rm -rf, git reset --hard, terraform destroy, etc.) |
| **Path Access** | Bash, Edit, Write | Enforces zeroAccess/readOnly/noDelete tiers |
| **Ask Patterns** | Bash | Confirmation dialogs for risky-but-valid operations |

## Path Protection Tiers

| Tier | Read | Write | Edit | Delete | Examples |
|------|------|-------|------|--------|----------|
| **zeroAccessPaths** | No | No | No | No | `~/.ssh/`, `~/.aws/`, `.env` |
| **readOnlyPaths** | Yes | No | No | No | `/etc/`, `~/.bashrc`, `*.lock` |
| **noDeletePaths** | Yes | Yes | Yes | No | `~/.claude/`, `LICENSE`, `.git/` |

## CLI Tools

```bash
# Interactive test mode
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts -i

# Test specific command
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts bash Bash "rm -rf /tmp" --expect-blocked

# Test Edit tool
bun run $PAI_DIR/skills/DamageControl/Tools/TestDamageControl.ts edit Edit "~/.ssh/id_rsa" --expect-blocked
```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **ModifyPatterns** | "add path to zero access", "block command", "update damage control" | `Workflows/ModifyPatterns.md` |
| **TestDamageControl** | "test damage control", "verify hooks", "run security tests" | `Workflows/TestDamageControl.md` |

## Configuration

All patterns are defined in `patterns.yaml`:

- **bashToolPatterns**: Regex patterns for dangerous bash commands
- **zeroAccessPaths**: Complete lockdown paths
- **readOnlyPaths**: Read-only paths
- **noDeletePaths**: No-delete paths

## Hook Integration

Three PreToolUse hooks run alongside existing `security-validator.ts`:

1. `BashToolDamageControl.ts` - Validates bash commands
2. `EditToolDamageControl.ts` - Validates edit file paths
3. `WriteToolDamageControl.ts` - Validates write file paths

**Exit Codes:**
- `0` = Allow operation
- `2` = Block operation (stderr fed back to Claude)
- JSON output = Ask for confirmation

## Examples

**Example 1: Blocked dangerous command**
```
User: "Delete the temp folder recursively"
Claude: Attempts `rm -rf /tmp/project`
→ BashToolDamageControl blocks with exit code 2
→ Claude sees: "SECURITY: Blocked rm with recursive or force flags"
```

**Example 2: Protected path edit**
```
User: "Update my SSH config"
Claude: Attempts to Edit `~/.ssh/config`
→ EditToolDamageControl blocks with exit code 2
→ Claude sees: "SECURITY: Blocked edit to zero-access path ~/.ssh/"
```

**Example 3: Ask pattern confirmation**
```
User: "Delete user ID 5 from the database"
Claude: Attempts `DELETE FROM users WHERE id = 5`
→ BashToolDamageControl outputs JSON with ask=true
→ User sees confirmation dialog
```

## Related Skills

| Skill | Relationship |
|-------|--------------|
| SystematicDebugging | May invoke when security blocks unexpected operations |
| VerificationBeforeCompletion | Called to verify security tests pass |

## Attribution

Based on [claude-code-damage-control](https://github.com/disler/claude-code-damage-control) by disler.
