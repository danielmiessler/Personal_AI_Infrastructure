---
name: BrainDump
description: Structured thought and emotion processing — receive raw thoughts, match against TELOS patterns, structure into MEMORY. USE WHEN brain dump, unload thoughts, process emotions, decompress, vent, think out loud, end of day, debrief, what happened today, need to talk.
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/BrainDump/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.


## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the BrainDump skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **BrainDump** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# BrainDump Skill

Structured processing of thoughts, emotions, and experiences. Turns raw, unstructured input into pattern-matched, structured content connected to {PRINCIPAL.NAME}'s TELOS system. The skill listens first, reflects patterns back, then structures and stores.


## Workflow Routing

Route to the appropriate workflow based on the request.

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow in the **BrainDump** skill to ACTION...
```

| Trigger | Workflow |
|---------|----------|
| Full structured dump (all 5 phases: receive → pattern match → structure → validate → cross-reference) | `Workflows/FullDump.md` |
| Quick capture (just receive and structure, skip pattern matching) | `Workflows/QuickDump.md` |
| Analyze existing content against TELOS patterns | `Workflows/PatternMatch.md` |

## Quick Reference

| Workflow | Purpose | Phases | Output |
|----------|---------|--------|--------|
| **FullDump** | Complete thought processing | 5 | Structured content + pattern analysis + MEMORY update |
| **QuickDump** | Rapid capture | 2 | Structured content in MEMORY |
| **PatternMatch** | Pattern analysis only | 1 | Pattern connections to TELOS |

## Examples

```
"I need to unload what's on my mind"
-> Invokes FullDump workflow -> 5-phase processing

"Quick dump: had a weird interaction at work today"
-> Invokes QuickDump workflow -> Rapid capture

"Look at what I wrote yesterday and find patterns"
-> Invokes PatternMatch workflow -> TELOS pattern analysis
```

## Integration

**Works well with:**
- **Telos** — Pattern matching reads from `~/.claude/PAI/USER/TELOS/` (BELIEFS, CHALLENGES, GOALS, LEARNED, NARRATIVES, TRAUMAS, WRONG)
- **FocusAlignment** — If dump touches goals/direction, suggest running alignment check
- **Research** — If dump reveals knowledge gaps, suggest research

## Principles

1. **Dump first, structure later** — don't impose structure on the dump itself
2. **Patterns are tools, not labels** — use them to help see connections, not to categorize
3. **Corrections are expected** — memory is imperfect, especially emotional memory
4. **Their voice, not yours** — structured output should sound like {PRINCIPAL.NAME} wrote it
5. **Direct over diplomatic** — if you see something concerning, say it
6. **Not everything is a pattern** — sometimes a bad day is just a bad day
7. **Ask before writing elsewhere** — MEMORY is fair game, other files need permission

---

**Last Updated:** 2026-03-02
