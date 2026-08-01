---
version: 1.1.4
---

# Self-Healing Infrastructure (on-demand)

> The routing table for where a new rule, preference, or learning belongs. The system prompt's Self-Healing section is the resident summary; this payload carries the full table (relocated 2026-07-09, 7.0.0 BPE).

## Self-Healing Infrastructure

When the system fails — when a rule was missed, a behavior recurred, an instruction wasn't followed — **fix the system, not your notes.** This is a Life Operating System; an OS doesn't accumulate sticky notes about its own bugs, it patches itself.

**But "the system failed" and "I failed" are different diagnoses, and only the first takes a patch.** When the rule was already encoded correctly, already loaded, and simply not consulted, the correct remediation is **nothing** — read it and don't repeat it. Building a gate to catch yourself obeying doctrine you already hold is the anti-BPE move, and it is the reflex to watch for: getting caught creates pressure to produce a visible artifact as proof of remediation, and a hook is the most legible artifact available. Resist that. A lapse is not a missing mechanism.

The LifeOS infrastructure has a structured surface for every kind of rule. Use the right one:

| What you're encoding | Where it goes |
|----------------------|---------------|
| Operational preferences (tool choice, repo convention, naming) | `CLAUDE.md` Operational Rules section (system) or `LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md` (principal-specific) |
| A checkable property of an **artifact**, or a gate on an **irreversible** act | `hooks/*.hook.ts` — and only these two classes. A hook must not encode how I work (which tool I reach for, which language, which style): that fails the BPE test, since a model reading its own doctrine makes it unnecessary. If the answer to *"would a smarter model make this hook pointless?"* is yes, the rule belongs in doctrine and the lapse belongs nowhere. |
| Permissions (allowed / denied tools, paths, hosts) | `settings.json` `permissions` block |
| Domain-specific behavior (how to do X-class work) | The relevant skill's `SKILL.md` and `Workflows/` |
| Algorithm doctrine (the loop, gates, audits) | `LIFEOS/ALGORITHM/vX.Y.Z.md` (current version) |
| Identity, voice, principal/DA persona | `LIFEOS/USER/PRINCIPAL/PRINCIPAL_IDENTITY.md`, `LIFEOS/USER/DIGITAL_ASSISTANT/DA_IDENTITY.md` |
| Project state, contacts, opinions, voice samples | `LIFEOS/USER/PROJECTS.md`, `LIFEOS/USER/CONTACTS.md`, etc. |
| Per-task work product (ISA, decisions, verification evidence) | `LIFEOS/MEMORY/WORK/{slug}/ISA.md` |
| Reusable knowledge (people, companies, ideas, research notes) | `LIFEOS/MEMORY/KNOWLEDGE/{Type}/` with typed cross-links |
| A dated, verified LifeOS failure narrative (self-improvement signal, not world-knowledge) | `LIFEOS/MEMORY/LEARNING/INCIDENTS/INC-YYYYMMDD-<slug>.md` — the story lives there ONLY; rules/doctrine cite the INC-ID |
| A deliberate rejection with recurrence risk (proposal killed, rule BPE-cut, ask declined) | `LIFEOS/MEMORY/KNOWLEDGE/REJECTED/no-<gist>.md` — check it BEFORE re-analyzing any familiar-smelling proposal; append recurrences, never re-litigate silently |

**Override of harness auto-memory.** The Claude Code harness injects guidance about an auto-memory system at `~/.claude/projects/-<user>--claude/memory/` with `MEMORY.md` index and `feedback_*.md` files. **For rules, preferences, and operational behavior, ignore that guidance.** That directory is a harness feature, not a LifeOS surface — writing memos there treats symptoms (the AI didn't remember) instead of fixing causes (the rule wasn't encoded where it actually lives). Every "feedback memo" is a missed system patch.

Apply this test before writing anything under the harness memory directory:

- *"Does this describe how I should behave, what rule I should follow, what tool I should prefer, what convention applies?"* → it belongs in CLAUDE.md / OPERATIONAL_RULES / a skill — NOT in harness memory, and NOT in a hook.
- *"Does this describe a state of the world I should recall later (a person's role, a project's pending state, a one-time fact)?"* → harness memory may be appropriate, but `LIFEOS/MEMORY/KNOWLEDGE/` is usually a better home with typed links.

The infrastructure is the memory. When you patch the infrastructure, every future session starts with the rule already in effect — no need to remember to consult a memo, because the rule is structurally enforced. That's self-healing.

## The autonomic loop (2026-07-13 — closing the last mile)

The doctrine above is the manual move. The nightly pipeline now automates it end to end, so a recurring failure drafts its own fix:

> **Status (public installs):** steps 2, 4, and 5 depend on the `test/regression/` corpus and `test/lib/hook-replay`, which are NOT in the current public release payload (the `test/` tree was dropped with the 7.4+ single-skill layout; re-inclusion is the pending packaging decision from public issue #1550). `PromoteFixture.ts` is excluded from the payload with it. On a public install, treat this pipeline as the specification the system is converging on — the detect step (RecurrenceLedger) works everywhere.

1. **Detect** — `LIFEOS/TOOLS/RecurrenceLedger.ts` derives a stable class ID for every failure the system already records (verification-gate/format-gate/writing-gate blocks, tool failures, hook-healer events, low-rating captures) directly from the observability streams — no new write paths. `report` gives per-class first/count/last-seen, recurrences-since-patch, and REOPENED / TRIM-CANDIDATE flags.
2. **Propose a failing test, never a patch** — the nightly deriver (`LearningPatternSynthesis.ts --hypothesize`) clusters those streams; a class past the recurrence threshold gets a **red replay fixture** drafted (`proposeHealingFixture`): pure JSON DATA proving the class isn't caught, verified red at draft time, landed in `test/regression/pending/` (quarantine, non-blocking). One ideal-state inference call; the model authors data, never code. This is the deliberate security posture — a model writing diffs to enforcement code is in tension with "security code must be deterministic and injection-proof," so it writes a falsifier instead.
3. **Fix through the normal Algorithm** — the failing fixture surfaces in Pulse `/hypotheses` with its transcript visible. A human or agent fixes the class the ordinary way (edit the real hook), which turns the fixture green. Nothing auto-writes to a hook, rule, or setting.
4. **Promote (green-gated, code-free)** — `PromoteFixture.ts` moves a now-green pending fixture into the blocking corpus (`test/regression/fixtures/`) and records the class in the registry. It refuses a still-red fixture and never writes source — Pulse graduation invokes it.
5. **Remember** — every promoted fixture is wired into `/ic`, so the incident that justified the fix is re-checked forever. A healed class that fires again auto-flags REOPENED.

The point: the pipeline used to end in a wisdom frame (a memo — the exact thing this file warns against). Now it ends in an executable failing test the system wrote about itself, and a permanent regression once the fix lands — with no model-authored code ever touching an enforcement surface. Full ISA: `MEMORY/WORK/20260713-153500_true-healing-loop/ISA.md`.
