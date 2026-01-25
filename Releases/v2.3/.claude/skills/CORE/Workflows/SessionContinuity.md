# Session Continuity Protocol

**Purpose:** Maintain structured continuity artifacts for multi-session work based on Anthropic's agent harness patterns.

**When to Use:**
- Starting complex multi-session tasks
- Resuming work from a previous session
- Need explicit handoff context between sessions

## Core Principle

> "Each new session begins with no memory of what came before" - Anthropic
>
> Session continuity files are the handoff documentation that makes multi-session work reliable.

## Tools Available

### Session Progress CLI
```bash
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts <command>
```

**Commands:**
- `create <project> [objectives...]` - Start new progress tracking
- `decision <project> <decision> <rationale>` - Record key decisions
- `work <project> <description> [artifacts...]` - Log completed work
- `blocker <project> <blocker> [resolution]` - Track blockers
- `next <project> <step1> <step2>...` - Set next steps
- `handoff <project> <notes>` - Set handoff context
- `resume <project>` - Display full context for resuming
- `list` - Show all active progress files
- `complete <project>` - Mark as completed

### Feature Registry CLI
```bash
bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts <command>
```

**Commands:**
- `init <project>` - Initialize feature tracking
- `add <project> <name>` - Add feature with `--priority P1|P2|P3`
- `update <project> <id>` - Update status
- `list <project>` - Show all features
- `verify <project>` - Run verification report
- `next <project>` - Show next priority feature

## Session Initialization Sequence

**Based on Anthropic's 6-step startup that "conserves tokens by eliminating redundant setup reasoning":**

### Step 1: Confirm Working Directory
```bash
pwd
```

### Step 2: Load CORE Context
Automatic via startup hook - PAI context loaded

### Step 3: Check for Active Tasks
**Automatic!** The startup hook now checks `~/.claude/MEMORY/progress/` for active work and displays it at session start. You'll see:

```
📋 ACTIVE WORK (from previous sessions):

🔵 my-feature
   Objectives:
   • Implement user authentication
   • Add OAuth providers
   Handoff: Auth model complete, ready for service implementation
   Next steps:
   → Write auth service tests
   → Implement login endpoint
```

Manual check: `bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts list`

### Step 4: Review Last Session State (if resuming)
```bash
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts resume <project>
```

### Step 5: Execute Project Init (if exists)
```bash
# Check for project-level init script
ls kai-init.sh 2>/dev/null && bash kai-init.sh
```

### Step 6: Run Baseline Validation
```bash
# For existing projects with tests
bun test 2>/dev/null || npm test 2>/dev/null || echo "No tests configured"
```

## Workflow: Starting Multi-Session Task

```bash
# 1. Create progress file
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts create my-feature \
  "Implement user authentication" \
  "Add OAuth providers"

# 2. Initialize feature registry (if multiple features)
bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts init my-feature
bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts add my-feature "Login form" --priority P1
bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts add my-feature "Password reset" --priority P2

# 3. Work on task, recording progress
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts decision my-feature \
  "Using JWT tokens" "Simpler than sessions for API-first architecture"

bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts work my-feature \
  "Created User model and migration" src/models/user.ts src/migrations/001_users.sql

# 4. Before ending session, set handoff
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts next my-feature \
  "Write auth service tests" "Implement login endpoint" "Add JWT validation"

bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts handoff my-feature \
  "Auth model complete, ready for service implementation. Tests should verify JWT claims."
```

## Workflow: Resuming Session

```bash
# 1. Check for active tasks
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts list

# 2. Load context for specific project
bun run ~/.claude/skills/CORE/Tools/SessionProgress.ts resume my-feature

# 3. Check feature status
bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts list my-feature

# 4. Get next feature to work on
bun run ~/.claude/skills/CORE/Tools/FeatureRegistry.ts next my-feature
```

## Integration with Development Skill

When using the Development Skill for complex features:

1. **Phase 0 (Init)**: Create session progress file
2. **Phase 1-3 (Spec/Plan/Tasks)**: Record decisions in progress file
3. **Phase 4 (Implement)**: Update feature registry as features complete
4. **End of Session**: Always set handoff notes and next steps

## JSON vs Markdown

**Why JSON for feature tracking:**
> "JSON for feature tracking proved more robust than Markdown, as models were less likely to inadvertently corrupt structured data." - Anthropic

- Feature registries use JSON for reliability
- Progress files use JSON for machine-readability
- Human-readable summaries generated on demand

## Single-Feature Focus

**From Anthropic's research:**
> "Rather than attempting comprehensive implementations, agents work on one feature sequentially."

When working on multi-feature tasks:
1. Use feature registry to track all features
2. Work on ONE feature at a time
3. Mark feature as `passing` before starting next
4. Use `verify` command before claiming completion

## Best Practices

1. **Always create progress files** for tasks expected to span multiple sessions
2. **Record decisions with rationale** - future you will thank present you
3. **Set explicit next steps** before ending any session
4. **Use feature registry** for complex multi-feature work
5. **Single-feature focus** prevents sprawl and ensures mergeable state
6. **Verify before completing** - run `feature-registry verify` before declaring done

## Source

Based on Anthropic's "Effective Harnesses for Long-Running Agents" engineering blog:
- `claude-progress.txt` pattern for chronological activity logs
- JSON feature registries with pass/fail status
- 6-step session initialization sequence
- Single-feature focus methodology
