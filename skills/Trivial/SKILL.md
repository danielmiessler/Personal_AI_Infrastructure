---
name: Trivial
description: Pass-through skill for simple tasks. USE WHEN no methodology needed OR quick fixes OR greetings OR confirmations.
tier: deferred
---

# Trivial

Pass-through skill for tasks that don't require methodology enforcement.

## Overview

When skill-router cannot confidently match a prompt to a methodology skill, it routes to Trivial. This is the explicit "no methodology needed" decision.

## When This Skill Activates

- Simple questions or clarifications
- Greetings and confirmations
- Quick fixes explicitly marked as trivial
- Prompts with confidence < 0.5 for all other skills

## Behavior

**No special behavior.** This skill exists to make routing deterministic:
- Every prompt routes to SOME skill
- Trivial = explicit permission to proceed without methodology
- Logged for observability

## Examples

**Routed to Trivial:**
- "hi" -> Trivial (greeting)
- "thanks" -> Trivial (acknowledgment)
- "what time is it" -> Trivial (no skill match)
- "yes continue" -> Trivial (confirmation)

**NOT routed to Trivial:**
- "fix the bug" -> SystematicDebugging
- "add a feature" -> Brainstorming
- "create a skill" -> AskDaniel
