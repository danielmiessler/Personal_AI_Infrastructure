---
name: Config
description: "Resolves LifeOS configuration on Hermes through a five-layer stack — constitution → config.yaml → SOUL.md → TELOS → skills — where user layers override system layers and each layer owns a distinct concern. USE WHEN: configure, config, settings, preferences, operational rules, which config wins, where does this setting live, change a model, edit identity, vendor doctrine. NOT FOR active task state (workspace/ISA), durable facts (Hindsight), or the LifeOS settings.json merge machinery (retired on Hermes)."
effort: medium
---

# Config — Hermes-Native Configuration Layering

## What It Does

Answers "where does this setting live, and which layer wins?" on Hermes. LifeOS on Claude Code merged `settings.system.json` + `settings.user.json` into a generated `settings.json` at SessionStart. **Hermes does not port that merge.** Hermes manages configuration natively through its own config system, and LifeOS layers on top of it as a five-layer stack with a clear resolution order. This skill documents the stack and guides the agent when a config question or edit comes up.

## The Problem

Config drift is silent and expensive: a model set in two places, an identity rule that contradicts an operational rule, a personal path leaking into a shared surface. The failure LifeOS solved with a physical system/user split is the same one here — keep the invariant OS separate from the individual life. Hermes solves it with distinct layers rather than a settings merge: each concern has exactly one home, and the override order is fixed so there is never a question of which value applies.

## The Five Layers

Resolution order is top-down by concern; where layers overlap, **user layers override system layers**.

| # | Layer | Location | Owns | Editable? |
|---|-------|----------|------|-----------|
| 1 | **System** | `HERMES_CONSTITUTION.md` + built-in Hermes settings | Constitutional invariants, safety, execution doctrine | No (invariant in normal operation) |
| 2 | **Profile** | `$HERMES_HOME/config.yaml` | Models, providers, tools, memory, gateway, delegation, cron | Yes — the primary user-editable config |
| 3 | **Identity** | `$HERMES_HOME/SOUL.md` | DA name, personality, voice, working rules, relationship framing | Yes |
| 4 | **TELOS** | `E:/Dropbox/ARON BIJL MSC/TELOS/` | Canonical mission, goals, beliefs, strategies, current state | Yes (canonical source) |
| 5 | **Operational** | `$HERMES_HOME/skills/` | Installed skills, each carrying its own config/reference files | Yes (per skill) |

**Canonicality rules:**
- **TELOS is canonical for identity/goals.** Hindsight may hold a retained projection under `cat:telos`, but the configured source files win.
- **SOUL.md is canonical for DA behavior** — personality, voice, how the DA speaks and works.
- **The constitution is invariant.** It is loaded as an ephemeral system prompt (`purpose: ephemeral-system-prompt`) and is not user-editable in normal operation.
- **config.yaml is canonical for machinery** — model routing, tool availability, delegation limits, cron, gateway.

## What Does NOT Port

- **`settings.system.json` + `settings.user.json` → `settings.json` at SessionStart.** Retired. Hermes reads `config.yaml` natively; there is no generated merge file to guard against hand-editing.
- **`MergeSettings.ts` deep-merge driver.** Not ported — the layering above replaces it.
- **`LifeosConfig.ts` typed loader + `LIFEOS_CONFIG.toml`.** Hermes config is `config.yaml`; skills read their own reference files directly.
- **`SystemFileGuard.hook.ts` write-time enforcement.** Maps to Hermes' built-in tool approval and path protection — the constitution's "confirm scope, destination, reversibility before a consequential mutation" invariant plus Hermes tool gating do the job the hook did.
- **CLAUDE.md `@`-imports.** Hermes loads the constitution ephemerally and recalls TELOS/identity through runtime mechanisms; there is no `@`-import chain to maintain.
- **Two-repo symlink sync + ShadowRelease's 14 gates.** These are LifeOS release/distribution machinery, out of scope for a running Hermes instance.

## Workflow Routing

There are no sub-workflows — this skill is a resolution guide. Route an edit to the layer that owns the concern:

| Change | Layer | File |
|--------|-------|------|
| Model / provider / tools / delegation limits / cron / gateway | Profile | `$HERMES_HOME/config.yaml` |
| DA name / voice / personality / working rules | Identity | `$HERMES_HOME/SOUL.md` |
| Mission / goals / beliefs / strategies / current state | TELOS | `E:/Dropbox/ARON BIJL MSC/TELOS/` |
| Repo conventions / env paths / tool prefs / vendor doctrine | Operational | `$HERMES_HOME/skills/Config/OPERATIONAL_RULES.md` (see `OPERATIONAL_RULES.template.md`) |
| Constitutional invariant | System | `HERMES_CONSTITUTION.md` (rare, deliberate) |

## Gotchas

- **There is no `settings.json` to edit on Hermes.** If a request assumes the LifeOS merge (edit `settings.user.json`, regenerate at SessionStart), redirect it to `config.yaml`. The merge machinery is retired.
- **User overrides system, but only within a shared concern.** Layers mostly partition cleanly — TELOS never overrides a model choice. Override only matters when the same concern appears in two layers; then the higher-numbered (more user-specific) layer wins.
- **Never leak layer 3/4 content into a public artifact.** SOUL.md and TELOS are personal. The constitution's security rule binds here: no private identity data, private TELOS content, or local absolute paths in shared surfaces.
- **The operational-rules file is read by this skill, not `@`-imported.** It is a skill reference file. When a repo convention or vendor gotcha is relevant, read `OPERATIONAL_RULES.md`; do not expect it in the base prompt.
- **config.yaml is the machinery home, SOUL.md the behavior home — don't cross them.** A model choice is config; a personality rule is identity. Putting behavior in `config.yaml` or model routing in `SOUL.md` is the drift this layering prevents.

## Examples

### Example 1 — "which model does delegation use?"
Layer 2 (Profile). Read `delegation.*` in `$HERMES_HOME/config.yaml` (`model`, `provider`, `reasoning_effort`). Not SOUL.md, not TELOS.

### Example 2 — "change how the DA talks to me"
Layer 3 (Identity). Edit `$HERMES_HOME/SOUL.md` — personality, voice, working rules. Takes effect on the next session's constitution/SOUL load; no merge step.

### Example 3 — "add a Cloudflare deploy convention"
Layer 5 (Operational). Add it to `OPERATIONAL_RULES.md` (scaffolded from `OPERATIONAL_RULES.template.md`) under the vendor-specific section. This skill reads that file when the convention is relevant.

## Cross-References

- Source doctrine adapted: `LIFEOS/DOCUMENTATION/Config/ConfigSystem.md` (LifeOS system/user split + merge — the machinery that does NOT port)
- Constitutional layer: `HERMES_CONSTITUTION.md` (Layer 1; loaded as ephemeral system prompt)
- Identity layer: `SOUL.md` (Layer 3)
- Operational-rules template: `LifeOS/install/LIFEOS/OPERATIONAL_RULES.template.md`
- TELOS truth source: `E:/Dropbox/ARON BIJL MSC/TELOS/` (retained under `cat:telos`)
- Delegation config consumers: **Delegation** skill (`delegation.*` in `config.yaml`)
