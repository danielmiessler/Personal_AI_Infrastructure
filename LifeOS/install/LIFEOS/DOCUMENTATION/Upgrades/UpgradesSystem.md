---
last_updated: 2026-07-23T19:00:00Z
last_updated_by: da
convention: pai-freshness-v1
version: 1.0.2
---

# The Upgrades System

> **Private component — parts of the tooling described here are NOT in the public release payload.** Workflows that route through the underscore-prefixed release-management skill are rsync-excluded from public releases, so those commands will not resolve on a fresh public install.

> **One queue for every system-improvement candidate, from every source, with one lifecycle — the pending half of the change pipeline. The Ledger is the applied half.**

## Why it exists

Before 2026-07-23, improvement signals lived in six places with no shared schema: corrections in `LEARNING/FAILURES/`, hypotheses in `WISDOM/FRAMES/_hypotheses/`, memory proposals in `pending-proposals.jsonl`, Upgrade-skill recommendations nowhere (ephemeral reports), /algo proposals in per-run REPORT.md files, and applied changes in the Ledger. The middle of the pipeline — proposed → decided → applied — had no home, and standing directives ("from now on X") had no deterministic capture at all.

## The store

`LIFEOS/MEMORY/UPGRADES/` (private, in the USER data repo via the MEMORY symlink):

- `records/<id>.md` — one record per candidate: frontmatter (`id`, `status`, `source`, `created`, `expires`, `confidence`, `target_surface`, `session_id`, `ledger_id`, `evidence`) + body (`## Claim`, `## Current State`, `## Recommendation`, `## Notes` history).
- `.state.json` — claim-hash dedup sidecar (same normalized-claim hashing pattern as the hypotheses deriver).

Tool: `LIFEOS/TOOLS/Upgrades.ts` — `add | list | show | accept | reject | apply | verify | expire | stats`. Exported functions (`addUpgrade`, `listUpgrades`, `setStatus`, …) are imported directly by the hook and the Pulse module.

## Lifecycle

`recommended → accepted → applied → verified`, or `rejected` / `expired` (30-day TTL, swept opportunistically on each Pulse API read). Illegal transitions are refused by the tool.

## Sources (producers)

> **Note:** `_`-prefixed skill paths referenced below (e.g. `skills/_LIFEOS/`) are **private skills, absent from the public release** — those paths do not exist on a public install.

| Source | Producer | When |
|---|---|---|
| `directive` | `SatisfactionCapture.hook.ts` standing-directive leg | The turn {{PRINCIPAL_NAME}} says "from now on / in the future / always X / never X / new rule / {{DA_NAME}} should always…" — deterministic phrase match, no LLM |
| `correction` | Same hook, correction leg | Any detected explicit correction (also writes the FAILURES incident, unchanged) |
| `upgrade-skill` | `skills/Upgrade` Workflows (persist step) | Every 🔴/🟠/🟡 recommendation of a scan run |
| `algo-run` | `skills/_LIFEOS/Workflows/AlgorithmImprovement.md` (persist step) | Every ranked proposal of an /algo pass |
| `autonomous` | Nightly deriver (`LearningPatternSynthesis.ts --hypothesize`) | Unchanged — still writes `WISDOM/FRAMES/_hypotheses/`; the Pulse layer maps pending hypotheses into the queue as `source=autonomous`, and accept/reject proxy to graduate/reject (PromoteFixture flow intact) |
| `manual` | `Upgrades.ts add` | Ad-hoc |

## Ledger integration

The Ledger (`MEMORY/SYSTEMUPDATES/`) stays constitutively applied-only. The link: `LIFEOS/TOOLS/CreateUpdate.ts --upgrade-id <id>` (or `upgrade_id` in stdin JSON) stamps `upgrade_id` into the ledger entry's frontmatter AND marks the upgrade record `applied` with `ledger_id` pointing back. Pulse `/upgrades` Implemented view shows the join.

## Pulse surface

`/upgrades` (System plane; replaced `/hypotheses` in the nav — that route now redirects). Three views: **Recommended** (pending + accepted, source-badged), **Implemented** (applied/verified with ledger ids), **Rejected/Expired**. Module: `LIFEOS/PULSE/modules/upgrades.ts`; routes `GET /api/upgrades`, `GET/POST /api/upgrades/:id[/accept|/reject]`. Hypothesis-backed items carry `hyp:<slug>` ids.

## Boundaries

- **Synapse** captures content ideas, not system changes (its `tech_upgrade` route may forward here later — not yet wired).
- **Memory Tier-C proposals** about identity/contacts/style stay in the Memory lane; facts about {{PRINCIPAL_NAME}} are memory, changes to how the system works are Upgrades.
- The store never auto-applies anything; acceptance is human (Pulse buttons) or {{PRINCIPAL_NAME}}'s explicit instruction in-session.
