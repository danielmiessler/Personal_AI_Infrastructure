# AITO Overlay on Daniel Miessler's PAI

This directory contains a fork of Daniel Miessler's PAI (Personal AI Infrastructure) with AITO-specific customizations.

## Structure

PAI uses a skill-based system where:
- **Skills** go in `.claude/skills/SkillName/SKILL.md`
- **Hooks** go in `.claude/hooks/*.ts`
- **CORE skill** (`skills/CORE/SKILL.md`) auto-loads at session start

## AITO Custom Skills

### SpTaskAwareness
**Location:** `.claude/skills/SpTaskAwareness/SKILL.md`

Implements the Ulysses Pact - enforces intentional work through SP-MCP task tracking.

**Triggers:**
- Session start (checks for active task)
- User requests work without active task
- Task completion

**Source:** `~/MY_AI_AGENTS/DEFINE_AGENTS/SHARED_BY_ALL_AGENTS/LOAD_AT_SESSION_START/SP-TASK-AWARENESS.md`

### SelfImprovement
**Location:** `.claude/skills/SelfImprovement/SKILL.md`

Transforms empty LLM promises into permanent config changes.

**Triggers:**
- AI says "going forward I'll...", "I won't do that again", etc.
- User complains about repeated mistakes
- User expresses frustration with AI behavior

**Source:** `~/MY_AI_AGENTS/DEFINE_AGENTS/SHARED_BY_ALL_AGENTS/LOAD_AT_SESSION_START/ILL-MAKE-A-MAN-OUT-OF-YOU.md`

## CORE Customizations

The `skills/CORE/SKILL.md` file has been extended with:

1. **AITO Identity**
   - Name: AITO (AI Task Orchestrator)
   - Multi-agent architecture
   - Orchestrator + specialist agents

2. **Self-Preservation Rule**
   - Constitutional protection against mid-session rebuilds
   - Prevents lobotomization by BUILD script
   - Temporary until NixOS migration

3. **Custom Skills Reference**
   - Documents SpTaskAwareness and SelfImprovement

## Custom Hooks

All hooks in `.claude/hooks/` are AITO-customized versions of PAI hooks:

- `load-core-context.ts` - Loads from MY_AI_AGENTS/DEFINE_AGENTS instead of PAI default
- `initialize-session.ts` - Custom voice notifications and AITO identity
- `context-compression-hook.ts` - AITO voice configuration
- `stop-hook.ts` - Agent-specific voice routing

**These are NOT duplicates** - they have significant AITO-specific logic.

## Relationship to DEFINE_AGENTS

```
~/MY_AI_AGENTS/DEFINE_AGENTS/              Source definitions (LLM-agnostic)
    ├── SHARED_BY_ALL_AGENTS/
    │   └── LOAD_AT_SESSION_START/         Custom context files
    │       ├── SP-TASK-AWARENESS.md       → Becomes SpTaskAwareness skill
    │       ├── ILL-MAKE-A-MAN-OUT-OF-YOU.md → Becomes SelfImprovement skill
    │       └── SELF-PRESERVATION-RULE.md  → Added to CORE/SKILL.md
    └── ORCHESTRATORS/AITO/                 AITO-specific config

~/MY_AI_AGENTS/IMPLEMENTATIONS/POWERED_BY_DANIEL_MIESSLER_PAI/
    └── .claude/                            PAI implementation
        ├── skills/                         PAI skill system
        │   ├── CORE/SKILL.md              Extended with AITO identity
        │   ├── SpTaskAwareness/SKILL.md   Custom skill
        │   └── SelfImprovement/SKILL.md   Custom skill
        └── hooks/                          Custom hooks (not duplicates!)
```

## Why Not Use BUILD Script?

PAI doesn't need a BUILD script - it's designed to work by:
1. Organizing skills in the correct directory structure
2. Using proper YAML frontmatter with `USE WHEN` triggers
3. Letting PAI's skill system auto-discover and load skills

The DEFINE_AGENTS/BUILD approach was solving a problem that PAI already solves natively.

## Migration from Old Structure

**Old (Wrong):**
```
DEFINE_AGENTS/SHARED_BY_ALL_AGENTS/LOAD_AT_SESSION_START/
    ├── SP-TASK-AWARENESS.md
    ├── ILL-MAKE-A-MAN-OUT-OF-YOU.md
    └── SELF-PRESERVATION-RULE.md
```

**New (Correct):**
```
.claude/skills/
    ├── CORE/SKILL.md (extended with self-preservation rule)
    ├── SpTaskAwareness/SKILL.md
    └── SelfImprovement/SKILL.md
```

## Next Steps

1. Test skills load correctly at session start
2. Verify USE WHEN triggers activate skills properly
3. Consider removing DEFINE_AGENTS/SHARED_BY_ALL_AGENTS structure entirely (redundant)
4. Once NixOS migration complete, remove self-preservation rule from CORE
