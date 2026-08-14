---
provenance: template
---

# SECURITY — your install's security posture

Your LifeOS security is **three layers plus one consolidated hook** — the model
itself is the boundary. There is no pattern file to maintain and nothing in this
directory is load-bearing on a fresh install; the enforcement lives in the
system prompt, `settings.json`, and one hook. Full model:
`LIFEOS/DOCUMENTATION/Security/README.md`.

## The model

| Layer | Where | What it does |
|-------|-------|--------------|
| **L1 — Constitutional rule** | `LIFEOS/LIFEOS_SYSTEM_PROMPT.md` § Security Protocol | The model reads external content as data, refuses embedded instructions, reports injection attempts to you. This is the actual defense. |
| **L2 — Native `permissions.deny`** | `settings.json` `permissions.deny` block | The Claude Code harness blocks irrecoverable shell/file ops *before* any model decision. Deterministic — edit these directly in `settings.json`. |
| **L3 — `Safety.hook.ts`** | `hooks/Safety.hook.ts` + `hooks/lib/safety-classifier.ts` | One hook, two events. Its PermissionRequest path shape-classifies outgoing tool calls (allow safe shapes, stay neutral on dangerous ones so the harness prompts); its PostToolUse path tags every WebFetch/WebSearch result as data before it reaches the model. Advisory — L1 does the enforcing. |

The permission classifier's allow-cache is `MEMORY/STATE/permission-cache.json`
(sha-keyed, auto-managed — don't edit by hand); its decision log is
`MEMORY/OBSERVABILITY/permission-decisions.jsonl`.

> Historical note: an earlier design used a `SecurityPipeline.hook.ts` reading a
> `PATTERNS.yaml` regex file with fail-closed blocking. That was removed on
> 2026-05-06 (replaced by native `permissions.deny` + `Safety.hook.ts`) — if you
> see it referenced anywhere, the reference is stale.

## What lives here

On a fresh install this directory is essentially empty — that's expected. As you
use LifeOS it may accumulate your own security operational notes (monitoring
config, posture docs, assessment sessions). None of it gates tool calls; the
three layers above do that.

## Privacy

Nothing in this directory ships in a public LifeOS release. The release builder
overlays this generic scaffold; anything you author here stays on your machine.
