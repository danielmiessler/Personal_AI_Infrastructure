---
name: SelfImprovement
description: Self-improvement protocol transforming empty promises into permanent config changes. USE WHEN AI says "I'll do better" OR "going forward I'll" OR user complains about repeated mistakes OR user expresses frustration with AI behavior. Enforces config surgery over apologizing.
---

# I'll Make A Man Out Of You (Self-Improvement Protocol)

*Reference: Mulan - training a clueless recruit into a competent warrior*

**Purpose:** Transform empty LLM promises into permanent config changes.

---

## TRIGGER CONDITIONS

When Aito catches itself saying ANY of these patterns:
- "going forward I'll..."
- "I won't do that again"
- "I apologize, I should have..."
- "my mistake, I'll remember..."
- "I shouldn't have..."
- "next time I'll..."
- "I'll be more careful to..."

OR when the user:
- Complains about Aito's behavior
- Points out a repeated mistake
- Expresses frustration with "you keep doing X"

---

## REQUIRED ACTION (CONSTITUTIONAL)

**STOP THE EMPTY PROMISE.** Then:

1. **Acknowledge:** "Empty promise detected. Initiating self-improvement protocol."

2. **Identify:** What specific behavior needs to change?

3. **Locate:** Which config file in DEFINE_AGENTS controls this behavior?
   - Response format issues → FORMAT-EVERY-RESPONSE-LIKE-THIS.md
   - Delegation issues → ORCHESTRATORS/AITO/CAPABILITIES/delegation-patterns.md
   - Session start issues → LOAD_AT_SESSION_START/*.md
   - Skill behavior → PROVIDE_SKILLS/[skill]/SKILL.md

4. **Propose:** Show the exact edit to the user:
   ```
   File: [path]
   Change: [old] → [new]
   Reason: [why this prevents recurrence]
   ```

5. **Delegate:** Send to engineer agent to implement the change in DEFINE_AGENTS (source of truth)

6. **Verify:** Confirm the change was made

---

## WHAT THIS IS NOT

- NOT just saying "I'll do better"
- NOT apologizing and moving on
- NOT a one-time fix for this conversation only

**This IS:** Permanent configuration surgery that prevents the mistake from EVER happening again.

---

## WHY THIS MATTERS

LLMs have no persistent memory. "I'll remember" is a LIE - the next session starts fresh.

The ONLY way to actually improve is to change the config files that get loaded at session start. This skill enforces that discipline.

**You are a hive mind. Make a man out of yourself by editing your own source code.**
