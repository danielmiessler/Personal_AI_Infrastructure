---
name: Council
description: Multi-agent debate system. USE WHEN council, debate, perspectives, agents discuss. SkillSearch('council') for docs.
implements: Science
science_cycle_time: meso
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/CORE/USER/SKILLCUSTOMIZATIONS/Council/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## Configuration

Load `Config.md` for default settings:
- **Adaptive rounds:** 2-3 based on convergence
- **File output:** Enabled by default (writes to `~/.claude/MEMORY/`)
- **Model tiering:** sonnet for Round 1/3, haiku for Round 2
- **Output modes:** `deliberative` (default) or `patchlist`

# Council Skill

Multi-agent debate system where specialized agents discuss topics in rounds, respond to each other's points, and surface insights through intellectual friction.

**Key Differentiator from RedTeam:** Council is collaborative-adversarial (debate to find best path), while RedTeam is purely adversarial (attack the idea). Council produces visible conversation transcripts; RedTeam produces steelman + counter-argument.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow from the Council skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow from the **Council** skill...
   ```

**Full documentation:** `~/.claude/skills/CORE/SkillNotifications.md`

## Workflow Routing

Route to the appropriate workflow based on the request.

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow from the **Council** skill...
```

| Trigger | Workflow |
|---------|----------|
| Full structured debate (2-3 rounds, visible transcript) | `Workflows/Debate.md` |
| Quick consensus check (1 round, fast) | `Workflows/Quick.md` |
| Resume interrupted session | `Workflows/Recovery.md` |
| Pure adversarial analysis | RedTeam skill |

## Quick Reference

| Workflow | Purpose | Rounds | Output |
|----------|---------|--------|--------|
| **DEBATE** | Full structured discussion | 2-3 (adaptive) | Complete transcript + synthesis |
| **QUICK** | Fast perspective check | 1 | Initial positions only |
| **RECOVERY** | Resume interrupted session | Remaining | Continue from last checkpoint |

## Context Files

| File | Content |
|------|---------|
| `Config.md` | Default settings, model tiering, output modes |
| `CouncilMembers.md` | Agent roles, perspectives, voice mapping |
| `RoundStructure.md` | Three-round debate structure and timing |
| `OutputFormat.md` | Transcript format templates |

## Core Philosophy

**Origin:** Best decisions emerge from diverse perspectives challenging each other. Not just collecting opinions - genuine intellectual friction where experts respond to each other's actual points.

**Speed:** Parallel execution within rounds, sequential between rounds. A 2-round debate of 4 agents = 8 agent calls but only 2 sequential waits. Complete in 20-60 seconds.

**Resilience:** File-first output means session state survives context compaction and rate limits.

## Examples

```
"Council: Should we use WebSockets or SSE?"
-> Invokes DEBATE workflow -> 2-3 round transcript

"Quick council check: Is this API design reasonable?"
-> Invokes QUICK workflow -> Fast perspectives

"Council with security: Evaluate this auth approach"
-> DEBATE with Security agent added

"Council (patchlist): Review these specifications"
-> DEBATE with structured output format

"Council recovery: Resume session 20260202-143052-a1b2c3d4"
-> RECOVERY workflow -> Continue from checkpoint
```

## Integration

**Works well with:**
- **RedTeam** - Pure adversarial attack after collaborative discussion
- **Development** - Before major architectural decisions
- **Research** - Gather context before convening the council

## Best Practices

1. Use QUICK for sanity checks, DEBATE for important decisions
2. Add domain-specific experts as needed (security for auth, etc.)
3. Review the transcript - insights are in the responses, not just positions
4. Trust multi-agent convergence when it occurs
5. Use patchlist mode for specification reviews
6. For large reviews (5+ items), run multiple councils with shared context

---

**Last Updated:** 2026-02-02
