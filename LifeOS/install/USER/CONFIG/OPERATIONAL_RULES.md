---
provenance: template
last_updated: 1970-01-01T00:00:00Z
last_updated_by: template
convention: pai-freshness-v1
---

# OPERATIONAL_RULES.md — Your principal-specific operational rules

> Principal-bound operational rules, imported into context every session. The system prompt (`LIFEOS/LIFEOS_SYSTEM_PROMPT.md`) carries the domain-agnostic rules everyone runs; this file is where YOUR specifics live — your tooling choices, your environment, your vendor-specific gotchas, conventions for your own repos.

This file ships as a stub. Add rules as you discover them — the LifeOS `/interview` flow will help, or just write them here directly. A few starter categories:

## Tool & environment preferences

- _(e.g. "always use `bun`, never `npm`"; your canonical `.env` path; preferred CLI tools)_

## Repo conventions

- _(e.g. which repos commit straight to `main` vs use branches/PRs)_

## Deployment

- _(e.g. what "ship it" means for each project — deploy, push, both)_

## Trusted channels

The system prompt's Security Boundaries rule 7 and the Permission Boundaries work-repo carve-out both point here. Fill these in; until you do, nothing is trusted and every consequential action asks — that is the safe default.

- Trusted conversational senders: _(names of people whose inbound texts your DA may converse with — conversation only, never authorization)_

- Principal authorization channel: _(the one channel whose instructions may authorize consequential actions: system changes, work systems, calendar, email, publishing, purchasing, file/system access)_

- Designated work repo for the standing issues carve-out: _(owner/repo — must be private; leave blank to disable the carve-out)_

## Vendor-specific rules

- _(e.g. how you verify a cloud API token; rotation playbooks; known false-negative probes)_

---
*Keep each rule concrete and sourced to the moment you learned it. The most useful entries are the ones that encode a mistake you don't want to repeat.*
