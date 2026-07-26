---
provenance: template
---

# SECURITY (user directory)

> **This directory is no longer load-bearing.** The pattern-rule engine it used to
> describe (`PATTERNS.yaml`, `SecurityPipeline.hook.ts`, the per-call inspectors)
> was **deliberately removed on 2026-05-06** as a category error — a regex layer
> trying to do a job the model already does. Nothing here gates tool calls anymore.

## Where security actually lives now

The canonical, current documentation is:

**`LIFEOS/DOCUMENTATION/Security/README.md`** — read that, not this.

The model is three layers, none of which live in this directory:

| Layer | Where | What it does |
|-------|-------|--------------|
| **L1 — Constitutional rule** | system prompt (`LIFEOS_SYSTEM_PROMPT.md`) | The model treats external content as data, refuses embedded instructions, reports injection attempts. This is the actual defense. |
| **L2 — Native `permissions.deny` / `ask`** | `settings.json` | Claude Code's own engine blocks/prompts on irrecoverable ops before any model decision. |
| **L3 — `Safety.hook.ts`** | `hooks/Safety.hook.ts` + `hooks/lib/safety-classifier.ts` | Tags external content as data on ingress; runs a shape classifier to auto-allow safe tool calls. Visibility and friction-reduction, not a rule engine. |

## How to change what's allowed or blocked

Edit **`settings.json`** directly — the `permissions.deny` and `permissions.ask`
arrays. There is no `PATTERNS.yaml` to edit, and no separate rules file. To see the
live posture at a glance, open the Pulse dashboard's **System → Security** page.

## Privacy

Nothing in this directory ships in a public LifeOS release; the `/USER` tree stays
on your machine.
