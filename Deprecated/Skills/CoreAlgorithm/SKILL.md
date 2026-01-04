---
name: CoreAlgorithm
description: Universal 7-phase execution pattern for all substantive work. USE WHEN substantive task, workflow execution, Core Algorithm, OBSERVE THINK PLAN BUILD EXECUTE VERIFY LEARN, OR execution pattern needed. The meta-skill that all other skills implement.
---

# CoreAlgorithm

**THE Universal Execution Pattern for Kai**

All work follows this algorithm. No exceptions. Skills, workflows, and custom workflows all implement this pattern.

---

## Voice Notification

**When executing the algorithm workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Executing task using the Core Algorithm at EFFORT_LEVEL effort"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Executing this task using the **Core Algorithm** at **[Effort Level]** effort...
   ```

**Full documentation:** `~/.claude/Skills/CORE/SkillNotifications.md`

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **ExecuteCoreAlgorithm** | Substantive task detected by hook | `Workflows/ExecuteCoreAlgorithm.md` |

## The Algorithm

```
OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN
```

## Quick Reference

**The 7 Phases:**

| # | Phase | Purpose | Output |
|---|-------|---------|--------|
| 1 | OBSERVE | Gather context | Current state + constraints |
| 2 | THINK | Generate hypotheses (min 3) | Selected approach + verification plan |
| 3 | PLAN | Design solution | Execution specification |
| 4 | BUILD | Create Test Plan | Executable test criteria table |
| 5 | EXECUTE | Implement | Deliverables |
| 6 | VERIFY | Execute Test Plan | Pass/fail per criterion |
| 7 | LEARN | Improve algorithm itself | Algorithm adjustments |

**Effort Levels:**

| Level | Time | Agents | Trigger Words |
|-------|------|--------|---------------|
| Fast | <30s | Kai only | "quick", "just", "simple" |
| Standard | <2min | Up to 3 | Default for most work |
| Deep | <10min | Up to 5 | "think about", "explore" |
| Excellence | Continuous | Up to 16 | "best possible", "critical" |

## Context Files

| File | Purpose |
|------|---------|
| `CoreAlgorithm.md` | Full algorithm definition, LEARN phase details, effort matrix |
| `WorkflowExecution.md` | Detailed 7-phase execution guide, test plan structure |
| `~/.claude/CustomWorkflows/README.md` | Custom workflow directory system |

## Examples

**Example 1: Deep strategic plan**
```
User: "Create a marketing plan for PAI"
→ Hook detects substantive task (Deep effort)
→ Invokes ExecuteCoreAlgorithm workflow
→ OBSERVE: Gather PAI context, platforms, audience
→ THINK: Generate 5+ marketing strategy hypotheses with agents
→ PLAN: Design campaign structure with Architect
→ BUILD: Define success criteria table (8+ criteria)
→ EXECUTE: Create the marketing plan with parallel Engineers
→ VERIFY: Check against criteria with QA agent
→ LEARN: Capture algorithm improvements
```

**Example 2: Standard bug fix**
```
User: "Fix the auth bug in login.ts"
→ Hook detects substantive task (Standard effort)
→ OBSERVE: Read relevant code
→ THINK: 3 hypotheses for root cause
→ PLAN: Fix approach
→ BUILD: Test plan with 5 criteria
→ EXECUTE: Implement fix
→ VERIFY: Run tests
→ LEARN: Note if algorithm pattern needs adjustment
```

**Example 3: Fast simple edit**
```
User: "Fix this typo"
→ Hook detects simple task (Fast effort)
→ Quick 7-phase cycle (mostly mental)
→ Execute the fix
→ Verify it works
```

---

**Last Updated:** 2025-12-31
