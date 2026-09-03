---
provenance: proposal
status: draft-for-pr
last_updated: 2026-09-03
last_updated_by: community proposal (grimmolf)
convention: pai-freshness-v1
---

# PR: Model a real life — multiple entities, roles, and social circles

> **One-line:** LifeOS assumes one person with one job, one business, and one flat TELOS. Real lives have a day job plus several ventures, and identity spread across family, friends, and the groups we belong to. This PR adds first-class **entities**, **roles**, and **social circles** as a data model, and re-points the existing surfaces to read them, without changing the one-DA-per-human topology.

## Summary

LifeOS is built around a single-entity assumption that the codebase states out loud. `resolveCompanyDir()` picks *one* company folder "for exactly one person." The Work System binds to *one* GitHub repo for every stream of work. TELOS is one flat file that ingests per-business TELOS documents and **discards which business each goal belongs to**. Identity has one free-text `Role:` slot that, in the author's own install, has to cram five roles across five organizations into a sentence. Finances tag every expense as `business | personal | mixed`, so four separate businesses collapse into one word.

This proposal introduces three primitives and threads them through the existing surfaces:

- **Entity** — an organization you belong to: an employer, a business you own, a nonprofit, a club, a church, a neighborhood.
- **Role** — your relationship to an entity: `employee`, `owner`, `partner`, `member`, `volunteer`, `support`.
- **Circle** — the social layer a person or entity sits in relative to you, with diligence and an information boundary attached.

It is a **data-model change, not an agent-topology change**. LifeOS already tried per-entity agents and retired them in favor of one DA per human (`USER/DIGITAL_ASSISTANT/DA_IDENTITY.md:56`, `USER/PROJECTS.md:41`). This PR respects that decision.

## Problem, with evidence

Every citation below is from the live tree at `LIFEOS/`.

**Business is singular by construction.** `PULSE/Observability/observability.ts:2909-2920` — `resolveCompanyDir()` enumerates `USER/WORK/YOUR_COMPANIES/*` and returns the first dir with a `REVENUE/` folder, else `dirs[0]`. Its own comment: *"a literal name here works for exactly one person and silently returns empty revenue for everyone else."* `handleLifeBusiness()` (`:2922-2954`) returns one overview and one revenue report; the route `/api/life/business` (`:4578`) takes no entity parameter. The `/business` page types are singular (`src/app/business/page.tsx:21-28`). Meanwhile the template `YOUR_COMPANIES/README.md` *promises* "one subdirectory per company." The filesystem supports many; every reader collapses to one.

**Work is one repo for everything.** `hooks/lib/work-config.ts:8-9, 65-83` — *"Single-source loader for the Work System repo binding"*; `WorkConfig.repo: string | null`. Every issue from an employer, three businesses, and a household project funnels into one tracker. A second code path, `PULSE/checks/github-work.ts:42-44,116,122`, already loops over `config.repos` (plural) — the plural shape exists, inconsistently. `handleLifeWork()` (`observability.ts:2997-3053`) returns a flat `projects[]` with no entity field, which is why `USER/PROJECTS.md` needs a hand-written "Routing Aliases" table to know that a customer's nickname means one thing and "the shop" another.

**TELOS flattens entity provenance on ingest.** `USER/TELOS/TELOS.md` lists goals `G0..G6` spanning an employer, three businesses, and personal capability as flat sibling IDs with no entity tag. Its frontmatter `sources:` cites per-business TELOS files (one `<BUSINESS>-TELOS.md` per venture) that are merged in and lose their origin. `GenerateTelosSummary.ts` (`parseGoals:301`, `parseProjects:459`, `generate():619`) parses flat ID lists with no grouping key. `LIFEOS_STATE.json` has seven fixed `dimensions` (`health, money, freedom, creative, relationships, rhythms, infrastructure`) and no way to say "money, by entity."

**Finances know many payers but no entities.** `USER/FINANCES/schema.yaml` `income_source.payer` is already free-text and multi-source (W-2, 1099, product, investment). But `observability.ts:1768-1789` types expense/vendor `scope` as `"business" | "personal" | "mixed"`, normalized at `:2655` and `:2681`. Four businesses become the literal `"business"`. `handleLifeFinances()` (`:2550-2760`) emits one aggregate income with no `byEntity` breakdown.

**Identity has one slot for "what you do."** `USER/PRINCIPAL/PRINCIPAL_IDENTITY.md:20` — a single `Role:` field carrying employee + practice-lead + founder×3 + support-partner. Three relationship types, five organizations, one sentence.

**The Life page can't render plurality.** `src/app/life/page.tsx:355-403` — `DomainGrid()` has exactly one `Business` card and one `Work` card, each showing a single headline number; `BusinessData`/`WorkData` (`:78-95`) are singular at the type level; `DOMAIN_DIMENSION` (`:249-258`) maps both to `"creative"`, so work and business aren't even distinct dimensions.

**The social model exists, but outside LifeOS.** The author's estate already runs a battle-tested social-layer model in a sibling agent's configuration ("Duty of Care — Tiered Diligence"), with proportional diligence per tier and a hard confidentiality rule: *information from one context does not leak into another; Tier 1 personal information never appears in professional or business output.* LifeOS's own `USER/CONTACTS.md:11` echoes it informally (`## Inner circle (Tier 0)`, then per-customer and per-employer entity headings) as H2 prose with no schema.

## The model

### Circles (the social axis)

Grimm's canonical definition, adopted here:

| Circle | Who | Diligence | Boundary |
|---|---|---|---|
| **0 — Family** | The household; sibling AI agents are members. Children get extra scrutiny. | Highest | Nothing about Circle 0 leaves Circle 0 without explicit authorization. |
| **1 — Friends** | Named people the household trusts deeply. | High | Personal details never appear in any entity's business or professional output. |
| **2 — Social-contract groups** | Groups you hold a formal or informal contract with: the workplace, a church, a club, the neighborhood. | Standard-plus | Information stays inside its entity unless the role permits sharing. |
| **3 — Everyone else** | Baseline honesty, accuracy, no harm, no risk shifted onto them. | Baseline | — |

**Circle 2 is the entity model.** An employer, a business you own, a nonprofit you volunteer with, a club you belong to — each is a Circle-2 body you hold a *role* in. "Multiple businesses plus a day job plus social layers" is therefore one system, not two: entities are Circle-2 bodies; circles describe how close the people inside them are to you; the confidentiality rule becomes an information boundary between entities.

### Three axes that currently share one word

The word "Tier" is overloaded three ways in the author's estate, and any generalization must not conflate them. This PR proposes distinct names:

| Axis | Current word | Proposed word | What it orders |
|---|---|---|---|
| Agent self-model (Honest Identity → Personality → Ethics → Duty of Care → Operational) | Layer 0–5 | **Layer** (unchanged) | What an *agent* is, precedence when its own rules conflict |
| Social closeness + diligence + info boundary | Tier 0–3 / Circle 0 | **Circle 0–3** | How close *people and entities* are to the principal |
| TELOS conflict resolution (circle protection > financial independence > capability network) | Tier 0–2 | **Priority 0–2** | Which *activity* wins when two collide |

"Circle" is chosen because the author already says "Circle 0" and it is unambiguous next to "Layer" and "Priority." "Tier" is kept as a read-only alias for one release for compatibility with existing files.

### Entities and roles

A new registry, `USER/ENTITIES.yaml`, is the single source of truth for what you belong to:

```yaml
# USER/ENTITIES.yaml — one record per organization you belong to.
entities:
  - id: dayjob
    name: Acme Corp
    kind: employer            # employer | business | nonprofit | club | church | neighborhood | community
    circle: 2
    role: employee             # employee | owner | partner | member | volunteer | support
    since: 2019-01
    revenue_generating: true   # income flows from this entity
    show_on_business_card: false
    work_repo: null            # optional GitHub repo for this entity's work items
    telos_source: null         # optional per-entity TELOS document
    finances_scope: dayjob     # value used in FINANCES scope: fields
  - id: shop
    name: The Shop
    kind: business
    circle: 2
    role: support              # a household member runs it; principal supports
    revenue_generating: true
    show_on_business_card: true
    companies_dir: YOUR_COMPANIES/SHOP
    finances_scope: shop
  - id: sidebiz
    name: Side Business LLC
    kind: business
    role: owner
    revenue_generating: true
    show_on_business_card: false
    telos_source: TELOS/sidebiz/TELOS.md   # per-entity TELOS, relative to USER/
    finances_scope: sidebiz
  - id: parish
    name: St. Example Parish
    kind: church
    circle: 2
    role: member
    revenue_generating: false
    show_on_business_card: false
```

Reserved `finances_scope` value: `personal`. `mixed` is retired in favor of explicit multi-entity attribution.

`PRINCIPAL_IDENTITY.md` gains a structured `roles:` block generated from the registry, replacing the run-on `Role:` sentence (kept as a one-line summary for humans).

### Information boundary

A single rule, enforced at read time by every surface: **content tagged to one entity is not surfaced in another entity's context, and Circle-0/1 personal content is never surfaced in any entity's output.** This is the LifeOS-native home for the rule that sibling-agent configuration already enforces, expressed as data rather than prose.

## Changes, by chokepoint (ranked by leverage)

1. **`resolveCompanyDir()` / `handleLifeBusiness()`** → `resolveCompanies()` returns every entity with `kind: business` (or any entity with `companies_dir`); `/api/life/business` gains `?entity=<id>` and returns `{ entities: [...] }`. The business card's default filter is `show_on_business_card: true`, so "one business only, for now" is a **flag**, not a hard-code. *Single fix, two consumers.*

2. **`work-config.ts` `WorkConfig.repo`** → `repos: Record<entityId, string>` with the single existing repo mapped to a `default` entity. Reconcile `github-work.ts`'s plural `config.repos` onto the same loader so there is one work-repo contract. Work items carry an `entity` field; the existing `Property:` GitHub label taxonomy (`work.ts:713-722`) is extended with `entity:<id>` labels rather than inventing a parallel mechanism.

3. **TELOS ingest keeps provenance.** `GenerateTelosSummary.ts` reads `entity:` tags on goals/projects and the registry's `telos_source` paths; per-entity TELOS documents are ingested *with* their entity id. Rendering groups by entity, then by ID. The **Telos skill's existing "Project TELOS" analyzer** becomes the per-entity engine instead of a new one. `LIFEOS_STATE.json` gains an optional `by_entity` map under dimensions that meaningfully split (money, work).

4. **Finances `scope` widens.** `observability.ts:1768-1789` `scope` type becomes `string` = an entity id or `personal`; normalization at `:2655`/`:2681` validates against the registry. `handleLifeFinances()` adds `income.byEntity` and `expenses.byEntity`. **Cheapest change in the set**, and the one that makes "how much of my income comes from my employer vs. my side business" answerable.

5. **Identity + frontmatter contract.** Add `roles:` to `PRINCIPAL_IDENTITY.md`. Add optional `entity:` and `circle:` fields to the **live** `pai-freshness-v1` frontmatter contract (`DOCUMENTATION/Freshness/FreshnessSystem.md`), *not* to the superseded §3 contract in `LifeOsSchema.md`, or nothing takes effect.

6. **Life page renders lists.** `DomainGrid()` Business and Work cards become list-capable: one row per entity with its headline number, collapsed to a single card when only one entity exists (so a one-business install looks exactly as it does today). `BusinessData`/`WorkData` become arrays. Give `work` and `business` their own dimension colors instead of both mapping to `creative`.

7. **CONTACTS gets schema.** Port Circle 0–3 into `USER/CONTACTS.md` as `circle:` frontmatter per person and `entity:` tags replacing the informal per-customer / per-employer headings. The DA and Pulse can then enforce the information boundary from data.

8. **Formalize per-entity nesting.** `LifeOsSchema.md §8` already permits "one more level of nesting for per-entity isolation." Make `<Domain>/<EntityId>/` the documented rule for `YOUR_COMPANIES/`, `WORK/`, and (new) `TELOS/` so readers have a contract to conform to.

## Reuse, don't duplicate

- The sibling-agent Layer-3 social model → ported into LifeOS `USER/` schema as Circles.
- Telos skill "Project TELOS" workflow → the per-entity TELOS engine.
- `YOUR_COMPANIES/<name>/` and `WORK/<customer>/` conventions → already per-entity on disk; only readers collapse them.
- `Property:` label taxonomy → extended with `entity:` labels.
- `income_source.payer` (already multi-source) and `scope` (widened, not replaced).
- Cortex Knowledge `company` object type (`MEMORY/KNOWLEDGE/_schema.md:20,59`) → can carry a `role` field so the knowledge graph and the registry agree.

## Phases (each independently shippable, each non-breaking)

| Phase | Scope | Behavior change for a one-entity install |
|---|---|---|
| **1 — Registry + contract** | `ENTITIES.yaml` (auto-synthesized from the existing single company dir if absent), `roles:` in identity, `entity:`/`circle:` fields in `pai-freshness-v1`, this doc. | None. |
| **2 — Readers** | `resolveCompanies()`, `?entity=` on the business API, `scope` widening + `byEntity` in finances, `repos` map in `work-config` (single repo → `default`). | None; single entity resolves identically. |
| **3 — Surfaces** | Life page list-capable cards (collapse to one), `/business` entity selector, distinct work/business dimension colors. | Visual only when >1 entity. |
| **4 — TELOS + Contacts** | Provenance-preserving ingest, grouped rendering, `by_entity` in state, Circles in CONTACTS, boundary enforcement. | None until entity tags are present. |

## Backward compatibility

- No `ENTITIES.yaml` → one entity is synthesized from the first `YOUR_COMPANIES/*` dir and the single work repo; every surface behaves as today.
- `scope: business` → maps to that default entity; `scope: mixed` → warns once and is treated as the default entity.
- `Tier N` in existing files → read as `Circle N` for one release, with a deprecation note.
- Files without `entity:` frontmatter → attributed to `personal`.

## Non-goals

- **Per-entity agents.** Tried, retired; one DA per human stands. This PR is data-model only.
- **Multiple principals.** Households with several humans each run their own LifeOS; that is a separate design.
- **Re-litigating the TELOS priority stack.** It is renamed to *Priority*, not changed.

## Verification

- Unit: `resolveCompanies()` returns N entities for N dirs, and exactly the single legacy result for a one-dir tree.
- Unit: finances normalization accepts any registered entity id, rejects unknown ids, maps `business`/`mixed` to the default.
- Snapshot: Life page renders byte-identically for a one-entity install before and after (the collapse rule).
- Live: on the author's install, the business card shows only the flagged business; finances show income split employer vs. business; TELOS renders each venture's goals under its own entity; a Circle-1 contact never appears in any entity's output.
- Doctor: a new check confirms every `entity:` reference resolves to the registry.

## Open questions for review

1. Should `ENTITIES.yaml` live in `USER/` (private, per-install) or ship a template under `YOUR_COMPANIES/`? (Proposed: `USER/ENTITIES.yaml`, template shipped.)
2. Is "Circle" acceptable as the canonical social word, or should we keep "Tier" and rename only the TELOS stack? (Proposed: Circle.)
3. Should `role` be an enum or free text with a suggested vocabulary? (Proposed: enum, extensible via config.)
