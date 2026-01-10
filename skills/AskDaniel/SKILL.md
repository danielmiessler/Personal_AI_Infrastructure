---
name: AskDaniel
description: Daniel-style feature screening for PAI. USE WHEN new skill for PAI OR new hook for skish OR new tool for PAI OR add workflow to skish OR design PAI feature. Screens feature requests against Daniel principles.
---

# AskDaniel

Feature screener that transforms raw PAI feature requests into specifications aligned with Daniel's engineering philosophy. Acts as a "Daniel filter" before implementation.

**Scope:** PAI/Skish system features only (skills, hooks, tools, workflows).

## CLI Tools

```bash
# Run a review
bun run $PAI_DIR/skills/AskDaniel/Tools/Review.ts --feature "add a hook for..."

# Validate a spec
bun run $PAI_DIR/skills/AskDaniel/Tools/ValidateSpec.ts spec.md
```

## Authoritative Context

**Before reviewing ANY feature, READ:**
- `$PAI_DIR/skills/AskDaniel/DanielPrinciples.md` - Philosophy checklist
- `$PAI_DIR/skills/CORE/SkillSystem.md` - Skill structure rules
- `$PAI_DIR/skills/CORE/CoreStack.md` - Stack preferences

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **ReviewFeature** | "create/add/build skill/hook/tool/workflow" | `Workflows/ReviewFeature.md` |

## Cross-Skill Composition

This skill dynamically discovers and invokes relevant skills during review. It does NOT hardcode dependencies.

**Discovery Pattern:**
```
For each review phase, use SkillSearch to find relevant skills:
- SkillSearch('analyze problem') -> invoke best match if found
- SkillSearch('find patterns') -> invoke best match if found
- SkillSearch('challenge assumptions') -> invoke best match if found
- SkillSearch('[phase-specific query]') -> invoke best match if found
```

**Routing Philosophy:**
- Let the skill index determine what's useful
- If a relevant skill exists, use it
- If no match found, perform manual analysis
- Never fail because a specific skill is missing
- Discover new compositions as skills are added

## Examples

**Example 1: Natural skill request**
```
User: "I want to add a skill for managing my reading list"
-> Automatically invokes AskDaniel
-> Applies Daniel Principles checklist
-> Outputs refined specification with:
   - Clear scope (code vs prompts)
   - CLI interface design
   - Test strategy
   - JSONL capture plan
```

**Example 2: Natural hook request**
```
User: "Create a hook that automatically categorizes my tasks"
-> Automatically invokes AskDaniel
-> Challenges: "Is this deterministic? Can code do this?"
-> Outputs: Refined spec or recommendation to NOT build
```

**Example 3: Natural tool request**
```
User: "I need a tool that syncs my learnings across machines"
-> Automatically invokes AskDaniel
-> Evaluates against Unix philosophy, existing patterns
-> Outputs: Architecture design following Daniel's principles
```

**Example 4: Out-of-scope detection**
```
User: "Build me a recipe management app"
-> Detects: Not a PAI/Skish feature
-> Responds: "This is outside PAI scope. Should I help with a general project instead?"
```

## Related Skills

- **CreateSkill** - Called after AskDaniel approves a skill proposal
- **CORE** - References SkillSystem.md and CoreStack.md for standards
- **Brainstorming** - May precede AskDaniel for initial idea exploration
