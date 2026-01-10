---
name: DailyReview
description: Daily task synthesis and review. USE WHEN starting the day OR asking "what should I work on" OR wanting a daily overview OR running /today command.
---

# DailyReview

Generate a daily view of active projects, in-progress work, goals, and backlog items.

**Announce at start:** "Let me generate your daily review."

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **GenerateDaily** | "/today", "what should I work on", "daily review" | `Workflows/GenerateDaily.md` |

## CLI Tools

### Today.ts

Generate daily review document.

```bash
# Generate today.md file
bun run $PAI_DIR/skills/DailyReview/Tools/Today.ts

# Print to stdout instead
bun run $PAI_DIR/skills/DailyReview/Tools/Today.ts --output stdout
```

**Sources:**
- `skills/CORE/Telos.md` - Active projects, goals, challenges
- `plans/*.md` - Recent implementation plans (last 7 days)
- `docs/future-ideas.md` - Backlog items

**Output sections:**
- Active Projects (from Telos PROJECTS)
- In Progress (recent plans)
- Goals (context from Telos)
- Challenges to Address
- Backlog (future ideas)

## Examples

**Example 1: Morning kickoff**
```
User: "/today"
→ Runs Today.ts
→ Generates today.md with daily overview
→ Opens or displays the file
```

**Example 2: What to work on**
```
User: "What should I work on today?"
→ Runs Today.ts --output stdout
→ Shows prioritized list of active work
```

## Related Skills

**Calls:**
- None (reads from static files)

**Called by:**
- Could be called by SessionStart hook for automatic daily review
