# GenerateDaily Workflow

> **Trigger:** "/today", "what should I work on", "daily review", "morning kickoff"
> **Input:** Optional flags (--output)
> **Output:** Generated today.md or stdout display

## Step 1: Run Today Tool

```bash
bun run $PAI_DIR/skills/DailyReview/Tools/Today.ts --output stdout
```

Display the output to the user.

## Step 2: Offer Actions

After showing the daily view, offer:
- "Want me to focus on any of these?"
- "Should I open any of the plans?"
- "Want to add something to the backlog?"

## Completion

Daily review generated. User can:
- Pick a project/plan to work on
- Add new items to future-ideas.md
- Start a focused work session

## Skills Invoked

| Condition | Skill |
|-----------|-------|
| User picks a plan | ExecutingPlans |
| User wants to brainstorm | Brainstorming |
| User wants to add idea | (manual edit to future-ideas.md) |
