# Session Commit Patterns

**Purpose:** Structured git commit patterns for multi-session work that enable clean handoffs and session resumption.

## Session Commit Format

For commits at session boundaries:

```
[SESSION] <type>: <subject>

<body describing what was attempted, succeeded, and remains>

Session: <session-identifier>
Progress: <X/Y features | percentage>
Status: <in_progress|blocked|milestone>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Type Values
- `feat` - New feature work
- `fix` - Bug fixes
- `refactor` - Code restructuring
- `test` - Adding or updating tests
- `docs` - Documentation updates
- `chore` - Maintenance tasks

### Example

```
[SESSION] feat: User authentication - login form complete

What was attempted:
- Login form with validation
- JWT token generation
- Session management

What succeeded:
- Login form renders correctly
- Validation works for email format
- Browser tests passing

What remains:
- Password reset flow
- OAuth integration
- Remember me functionality

Session: 2025-11-26-auth-feature
Progress: 2/5 features passing
Status: in_progress

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Regular Commit Format

For commits within a session (standard format):

```
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## End-of-Session Checklist

Before creating a session commit:

1. **Verify mergeable state**
   ```bash
   git status  # Clean working tree?
   bun test    # Tests passing?
   ```

2. **Update progress file**
   ```bash
   bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts next <project> "<next step 1>" "<next step 2>"
   bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts handoff <project> "<handoff notes>"
   ```

3. **Update feature registry**
   ```bash
   bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts list <project>
   # Update any feature statuses
   ```

4. **Create session commit**
   ```bash
   git add -A
   git commit -m "$(cat <<'EOF'
   [SESSION] feat: <feature> - <milestone>

   What was attempted:
   - <item>

   What succeeded:
   - <item>

   What remains:
   - <item>

   Session: <date-feature>
   Progress: <X/Y>
   Status: <status>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

## Session Identification

Session identifiers follow the pattern:
```
YYYY-MM-DD-<feature-name>
```

Example: `2025-11-26-auth-feature`

## Git Log Parsing

To find session commits:
```bash
git log --oneline --grep="\[SESSION\]"
```

To see session history for a feature:
```bash
git log --oneline --grep="auth-feature"
```

## Integration with Feature Registry

When using feature registry, commit messages should reflect registry state:
```
Progress: 2/5 features passing
```

This comes from:
```bash
bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts verify <project>
```

## Why This Matters

1. **Clean Handoffs**: Next session knows exactly where to resume
2. **Git History as Documentation**: Session boundaries visible in log
3. **Rollback Points**: Each session commit is a safe rollback target
4. **Progress Tracking**: Feature completion visible in commit messages

## Source

Based on Anthropic's "Effective Harnesses for Long-Running Agents":
> "Git commits with descriptive messages... ensure each session leaves the codebase in a mergeable state."
