---
name: ISA
version: 1.0.21
description: "Owns the Ideal State Artifact — the primitive holding a project or task's articulated ideal state; scaffolds, interviews, scores completeness, reconciles feature excerpts to master, seeds from a repo, and appends decisions/changelog/verification across a locked sixteen-section order. USE WHEN ISA, ISC, ideal state, ideal state criteria, project specification, hill-climb, articulating done, fog, not yet specified. NOT FOR creating new skills (use CreateSkill)."
---

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the ISA skill"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **ISA** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# ISA — Ideal State Artifact

## What It Does

The ISA is the single document that articulates "done" for any thing whose ideal state we are pursuing — a project, an application, a library, infrastructure, a work session, an art piece, a strategic decision. It serves five identities at once: ideal state articulation, test harness, build verification, done condition, system of record. This skill owns the canonical template, the workflows that generate and refine ISAs, and the example library.

## The Problem

Most work starts without a written, testable definition of what finished looks like, so "done" drifts — the goal in your head at the start isn't the goal you settle for at the end, and there's no record of which one was right. Criteria stay vague enough that anything passes, decisions and dead ends get forgotten and re-litigated, and when work spans multiple sessions or multiple agents there's no shared source of truth for what's been verified. The ISA fixes "done" as a hard-to-vary explanation with atomic, probe-able criteria, a stable-ID structure that survives edits, and an audit trail of what was conjectured, refuted, and learned.

## How It Works

The ISA is a single document with a locked sixteen-section body. A substance-scaled completeness gate decides which sections are required for a given piece of work, and six workflows generate, deepen, score, and reconcile the artifact across sessions and agents.

---

## The Sixteen-Section Body (locked; spec v2.18.0, Algorithm v8.12.0)

Every ISA may have up to sixteen body sections. The substance-scaled completeness gate decides which are required for a given piece of work; sections never appear empty. **Order is fixed**. **Vocabulary (v8):** the criteria section is headed `## Claims` on new ISAs (`## Criteria` / `## ISC Criteria` legacy, still parsed); claim IDs may be `ISC-N` or short-form (`C1`, `A3`); anti-claims may live inline (`Anti:` prefix) or in a dedicated `## Anti-claims` section; the provenance section may be headed `## Verification` or `## Log`.

| # | Section | Purpose | Written At |
|---|---------|---------|------------|
| 1 | `## Problem` | What is broken or missing right now that makes the ideal state worth pursuing | scoping |
| 2 | `## Vision` | What euphoric surprise looks like — experiential intent, 1–5 sentences | scoping |
| 3 | `## Out of Scope` | Anti-vision — what is *not* included in this ideal state, declared upfront in prose | scoping |
| 4 | `## Language` | **NEW v2.18.0** — the project's ubiquitous language. One block per term: meaning, an `_Avoid_:` line naming the names it displaces, and relationships. Glossary only — no implementation detail, no claims. **A term enters only after it has actually caused a confusion.** Project ISAs; task ISAs inherit by reference | scoping → any point |
| 5 | `## Principles` | Substrate-independent truths (Deutsch reach) the work must respect | scoping |
| 6 | `## Constraints` | Immovable architectural mandates that bound the solution space | scoping |
| 7 | `## Dependencies` | Cross-ISA needs, one machine-readable `requires: <slug> — <contract>` line each — only when the ISA participates in a hierarchy | scoping |
| 8 | `## Goal` | The hard-to-vary spine — 1–3 sentences naming verifiable done | scoping |
| 9 | `## Claims` | **Feature-less mode** — flat home for atomic claims/ISCs when the work has no distinct features. When it does, omit this and use `## Features` blocks (§12) | scoping → climbing |
| 10 | `## Not yet specified` | Fog — in-scope questions too dim to be claims yet, one `- fog:` line each; graduates to ISCs (or dies via Decisions) as pursuit sharpens it; empty at close — only when the work has fog | scoping → any point |
| 11 | `## Bridge Criteria` | Cross-ISA integration claims (`Bridge:` prefix) verified across the seam as a distinct verification pass — only when the ISA has siblings | scoping → climbing |
| 12 | `## Test Strategy` | Per-ISC verification approach — `isc | type | check | threshold | tool | anchors_to` | scoping |
| 13 | `## Features` | **Feature mode (v2.16.0)** — holds the claims as blocks: `### F<n> · <name>` + a one-line `Why:` (its ideal-state) + its ISCs nested underneath. `F0 · Cross-cutting` for spanning claims. Pointer table deleted; ISC IDs stay global/stable. Use this OR flat `## Claims`, never both | scoping → climbing |
| 14 | `## Decisions` | Timestamped decision log including dead ends; `refined:` prefix for Goal/ISC restructures | any phase |
| 15 | `## Learning` | Conjecture / refuted-by / learned / criterion-now entries — the Deutsch error-correction trail, written only when understanding changed (formerly `## Changelog`; **not** a changelog — see below) | learning |
| 16 | `## Verification` | One-line provenance stub that each ISC passed — a commit hash, test name, or probe ref; collapsed on close, never a retained evidence paragraph | climbing → close |

`## Dependencies`, `## Not yet specified`, and `## Bridge Criteria` are **conditional-required**: Dependencies/Bridge when the ISA has any `parent:`/`children:`/cross-ISA relationship, Not-yet-specified when the work genuinely has fog — omitted (like any empty section) otherwise. Multi-ISA trees are rare (<4% of archived ISAs) — full mechanics in `LIFEOS/DOCUMENTATION/ISA/ISAHierarchy.md`.

**Fog vs claim vs out-of-scope (the graduation test, v2.14.0):** can you state the question precisely now — not answer it, *state* it? Precisely statable with a nameable falsifier → an ISC, even if blocked. Statable but not yet probe-able → fog. Beyond the vision → Out of Scope. Corollary: **the Coverage Gate is assessed at close, not at scaffold** — never invent speculative claims at scaffold to cover surface that is still fog; at `phase: complete` the fog section must be empty (every entry graduated or killed via a Decisions row). Domain-general: an unresolved research question, an album's track order, an unchosen venue are all fog.

**The changelog is git; evidence collapses on close (Algorithm v8.7.1 claim 12):** the scaffold emits **no changelog section** — `git log -- <isa-path>` is the authoritative change record and commit messages are its entries. What persists is the living surface: `## Decisions` and the conjecture/refuted-by/learned/criterion-now trail (`## Learning` — the section formerly named `## Changelog`; position and four-piece C/R/L format unchanged, only the changelog identity dropped). And `## Verification` holds **one-line provenance stubs, not evidence paragraphs** — the moment a claim goes `[x]`, its entry shrinks to a commit hash / test name / probe ref pointing at the proof in git and CI.

---

## Three-Guardrail Taxonomy (Principles vs Constraints vs Anti-criteria)

Adjacent concepts. Distinguished by **who they bind**.

| Guardrail | Binds | Tone | Example | Lives In |
|-----------|-------|------|---------|----------|
| **Principles** | The *thinking* | Aspirational, generalizable | "User-facing systems prioritize responsiveness." | `## Principles` |
| **Constraints** | The *solution space* | Immovable, non-negotiable | "We do not roll our own cryptography — OAuth via industry-standard libraries only." | `## Constraints` |
| **Out of Scope** | The *vision* | Declared, explicit, prose | "Mobile native apps are not part of v1." | `## Out of Scope` |
| **Anti-criteria** | The *test surface* | Granular, testable, yes/no | "Anti: /admin returns 200 in v1 build." | `## Criteria` (with `Anti:` prefix) |

The first three are author-stated (declarative). Anti-criteria are derived — they are how Out of Scope, Constraints, and Principles become probe-able.

---

## Completeness Gate (substance-scaled — HARD)

Quality gates, not section counts — sections exist because content exists. Effort tiers were retired 2026-07-11; the gate scales with the substance of the work, discovered from the work itself (Algorithm §Spend):

| Substance | Required Sections |
|-----------|-------------------|
| **Trivial** (mechanical, single-probe, minutes) | Goal, Claims — a minimal direct-written ISA; shape check logged inline |
| **Substantial** (multi-claim build, real blast radius) | Problem, Vision, Out of Scope, Constraints, Goal, Claims, Test Strategy, Features |
| **Deepest** (frontier multi-component work) | All sixteen (Dependencies/Bridge Criteria only when cross-ISA links exist; Not-yet-specified only when the work has fog; Language only when a term has actually been confused) + Interview workflow run before building |

**Project ISA override:** any `<project>/ISA.md` requires full substantial-grade structure regardless of how small the current task is. The project file is the long-lived source of truth; one transient task must not downgrade it.

`CheckCompleteness` workflow enforces this gate. A miss blocks `phase: complete` until the missing sections are filled in.

---

## Workflow Routing

Match the verb in the request to a workflow. When ambiguous, default to Scaffold for new ISAs and CheckCompleteness for audits.

| Verb / Intent | Workflow | File |
|---------------|----------|------|
| "scaffold", "create", "generate", "new ISA from this prompt", "extract feature as ephemeral" | **Scaffold** | `Workflows/Scaffold.md` |
| "interview me", "fill in the ISA", "deepen", "ask me questions" | **Interview** | `Workflows/Interview.md` |
| "check", "audit", "score this ISA", "is it complete?" | **CheckCompleteness** | `Workflows/CheckCompleteness.md` |
| "reconcile", "merge feature file back", "ephemeral → master" | **Reconcile** | `Workflows/Reconcile.md` |
| "seed", "bootstrap from this repo", "draft an ISA from existing code" | **Seed** | `Workflows/Seed.md` |
| "append decision", "append learning" (C/R/L), "append verification", "record C/R/L entry" | **Append** | `Workflows/Append.md` |

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow in the **ISA** skill to ACTION...
```

---

## Gotchas

The highest-information-density part of this skill. Each entry captures a non-obvious failure mode that has bitten real ISA work.

- **ID-stability is the cornerstone of Reconcile — never re-number on edit.** When the Splitting Test produces a finer-grained version of `ISC-7`, preserve `ISC-7` as the parent and add `ISC-7.1`, `ISC-7.2`, etc. Even when an ISC is dropped, leave a tombstone (`- [ ] ISC-N: [DROPPED — see Decisions YYYY-MM-DD]`). Reconcile keys on stable IDs; renumbering breaks ephemeral feature-file merges silently and the failure mode looks like "the worker's checkmarks didn't land in master."
- **Ephemeral files are derived views, never sources of truth.** Scaffold's `--ephemeral` mode produces a slice of the master ISA at `MEMORY/WORK/{slug}/_ephemeral/<feature>.md`. Workers operate against that slice; Reconcile merges back. Hand-editing master content from an ephemeral file is policy-forbidden — the master is what persists; the ephemeral is what gets archived.
- **The changelog is git — the ISA has no in-document changelog section.** `git log -- <isa-path>` is the authoritative change record; the scaffold never emits a `## Changelog` section. What persists is the living surface: `## Decisions` and the C/R/L learning trail (`## Learning`, formerly named `## Changelog` — same position, same four-piece format, changelog identity dropped). (Algorithm v8.7.1 claim 12.)
- **The `## Learning` (C/R/L) format is non-negotiable.** Every entry needs all four pieces (`conjectured`, `refuted by`, `learned`, `criterion now`) in that order. Append refuses to write a partial C/R/L; if any of the four is missing, the entry is a Decision, not a Learning entry. The format is what makes the Deutsch error-correction trail auditable across sessions.
- **Evidence collapses on close — `## Verification` holds one-line stubs, not paragraphs.** The moment a claim goes `[x]`, its Verification entry is reduced to a single-line provenance stub (a commit hash, test name, or probe ref) pointing at the proof in git and CI — never a retained evidence paragraph. A Verification section that accumulates paragraphs is the failure this convention prevents. (Algorithm v8.7.1 claim 12.)
- **Project ISAs always require full substantial-grade structure.** A `<project>/ISA.md` is the long-lived system of record for a thing with persistent identity. One transient trivial task on the project must NOT downgrade the structural minimum. CheckCompleteness applies this override automatically.
- **Empty sections never appear.** The sixteen-section body is a *capacity*, not a *requirement* for every task. Sections required-but-empty for the work's substance are populated; sections not required and not yet written are simply absent from the file. CheckCompleteness distinguishes `present` / `missing` / `empty` and only `empty` is acceptable for `Verification`/`Log` before claims start closing — section length is never graded; a one-sentence section can be exactly right.
- **Anti-claims are derived from Out of Scope plus regression-prevention concerns.** They are how the prose-guardrails (Out of Scope, Constraints, Principles) become probe-able. At least one is required on every real build; a missing anti-claim is a hard CheckCompleteness failure.
- **Antecedents are required when the goal is experiential.** For art, design, content, and anything that has to "land," at least one ISC must use the `Antecedent:` prefix to name a precondition that reliably produces the target experience. Verifiable goals (build, deploy, schema) don't need antecedents; experiential goals always do.
- **Reconcile is deterministic — there are no conflicts to resolve.** Either an ISC ID exists in master (mechanical merge) or it doesn't (abort with ID-stability violation). If the ephemeral made structural changes (split ISC-7 into ISC-7.1/ISC-7.2), those structural changes belong in master via a separate Edit by the user *before* Reconcile runs.
- **The format spec wins on contradiction.** `ISAFormat.md` is the file-shape contract. If this skill's prose ever drifts from the format spec, the spec is canonical and the skill updates to match — not the reverse.
- **Feature blocks hold their claims (v2.16.0) — a feature contains its ISCs, it doesn't point at them.** When the work has distinct features, `## Features` is blocks: `### F<n> · <name>` + a one-line `Why:` (the feature's ideal-state — why it exists, what done means for it) + its ISCs nested underneath, with `F0 · Cross-cutting` for spanning claims. The old `satisfies: [ISC-N]` pointer table is gone. ISC IDs stay **global and stable** across the whole ISA (never per-feature) so Test Strategy and Reconcile keep working. Use feature blocks OR a flat `## Claims` section, never both — trivial work stays flat. The `Why:` must say what the name and claims don't; a restating `Why:` is noise. No new gate enforces this (BPE) — a capable model writes a real `Why:` unprompted.
- **Features are vertical slices, not horizontal layers.** Each feature block cuts end-to-end to a verifiable increment satisfying ≥1 ISC — not "the data layer" then "the API layer." A Feature you can't independently verify on its own is a horizontal slice; re-slice it vertically. This is a rule about the *shape of the decomposition* (the artifact), not about how to write code — it exists so every Feature produces a testable increment. (Pocock's tracer-bullet / vertical-slice principle, folded into Features where it belongs.) **The one exception is the wide sweep** — a single mechanical change whose blast radius fans across the whole artifact (renaming a concept across a corpus, retyping a shared symbol, migrating a convention), where no vertical slice can land verified alone. Sequence it **expand–contract**: expand (introduce the new form beside the old, nothing breaks) → migrate in blast-radius-sized batches, each independently verifiable → contract (remove the old form once nothing references it). (Pocock's to-tickets wide-refactor rule, generalized; adopted 2026-07-16.)
- **Fog is not a claim.** When the work has in-scope questions you cannot yet state precisely, they go in `## Not yet specified` — never as speculative ISCs written to satisfy coverage at scaffold. Graduation test: statable-with-falsifier → ISC; statable-not-probe-able → fog; beyond the vision → Out of Scope. The fog section must be empty at `phase: complete`. (Pocock's wayfinder fog-of-war doctrine, generalized; adopted 2026-07-16.)
- **Test Strategy tables must carry the canonical six columns — `isc | type | check | threshold | tool | anchors_to`.** Bunker's parser reads `anchors_to` positionally at cell index 5, so a five-column table that drops `threshold` silently shifts the anchor into the `tool` slot; `ISAGate.ts` then hard-fails `anchors-missing` on rows that visibly show an anchor, and the message points at the anchors rather than at the column count. Drop `threshold` only by writing an empty cell, never by removing the column. (Hit live 2026-07-27 on the AS3 ISA: 14 rows flagged, every one of them anchored.)
- **Probe placement follows the seam rule.** Test Strategy probes attach at the boundary where the thing meets its consumer, at the highest boundary that exercises the claim, agreed before building — never internals. Prefer existing boundaries; the fewer distinct probe boundaries, the more each proves. Full convention: `ISAFormat.md` § Probe placement.
- **A design question's cheapest probe is a throwaway prototype.** Sketch, outline, stub, or runnable code — disposable, kept out of the main line; only the decision folds back (into the ISC, a Decisions row, and at most one decision-rich fragment inlined). Full convention: `ISAFormat.md` § Prototype-as-probe.
- **Prefer test-first probes (red-before-build).** Where an ISC's probe is a *runnable* test (`bun-test`/`bun-property`/`bash`/`curl`/`SELECT`), write it so it FAILS before EXECUTE and passes after — the probe exists and is red before the build, green after. Probes that can only be a screenshot or manual check are exempt. This tightens the existing Inline-Verification Mandate from "name the probe" to "run the probe red first," and it is a rule about *when the probe is written/run* (the process), NOT a coding-craft instruction telling a capable model how to do TDD. (The structural kernel of Pocock's `tdd`, folded into the ISC layer; the red/green/refactor *mechanics* are deliberately NOT encoded — a competent coder does those unprompted.)

---

## Examples

The `Examples/` directory holds reference ISAs spanning scale (the `eN-` filename prefixes are the retired tier vocabulary, kept as filenames only) × domain (code / art / design / ops / marketplace / enterprise). (Authored pre-v6.25.0, so they omit Dependencies and Bridge Criteria and show retired frontmatter keys (`effort:`, `mode:`) and legacy headings; they are historical — the sixteen-section order and v2.15.0 frontmatter above win on shape.) Always start by reading the canonical showpiece before scaffolding a new ISA — copy its section headers, then populate. Pick the example closest to your domain + scale as a template.

**Showpiece**

| File | Purpose |
|------|---------|
| `Examples/canonical-isa.md` | **BeanLine** — peer-to-peer specialty-coffee marketplace. The showpiece reference, fully populated across every section with real-feeling Decisions and a four-piece C/R/L Changelog. Read this first. |

**Code**

| File | Tier | Purpose |
|------|------|---------|
| `Examples/e1-minimal.md` | E1 | Add a `--no-color` flag to a CLI tool. <90s task, Goal + 4 ISCs only. Demonstrates the fast-path floor. |
| `Examples/e2-backup-verify.md` | E2 | Add SHA-256 verification to a backup CLI's `--verify` mode. Single-domain, 18 ISCs. |
| `Examples/e3-project.md` | E3 | Build an arxiv metadata extractor CLI. Mid-size project, 12 ISCs, eight sections. |
| `Examples/e4-api-migration.md` | E4 | Migrate a public API from REST to GraphQL with 6-month backwards-compat. Cross-cutting, 73 ISCs, every section populated. |
| `Examples/e5-desktop-app.md` | E5 | **WattWatch** — open-source desktop app for personal home-energy monitoring. Single-user app pattern, 50 ISCs, populated Changelog. |

**Art (experiential — antecedents required)**

| File | Tier | Purpose |
|------|------|---------|
| `Examples/e3-essay.md` | E3 | Write a 1500-word essay on a specific thesis. Experiential goal, antecedent ISCs, post-publish reception probes. |
| `Examples/e5-album.md` | E5 | **Mariner Frequencies** — produce a 12-track instrumental album over 6 months. Long-form experiential, multi-act Changelog. |

**Design (experiential)**

| File | Tier | Purpose |
|------|------|---------|
| `Examples/e3-help-redesign.md` | E3 | Redesign a CLI tool's `--help` output for first-encounter clarity. Antecedents + usability tests. |
| `Examples/e4-brand-identity.md` | E4 | **Cardinal** — brand identity for a small fintech startup (logo + type + color + voice + first 5 marketing surfaces). 56 ISCs, 6 antecedents. |

**Ops**

| File | Tier | Purpose |
|------|------|---------|
| `Examples/e2-rotate-credential.md` | E2 | Rotate a production deploy credential in CI. Demonstrates the ISA primitive applied to ops/runbook work. 16 ISCs. |

**Enterprise**

| File | Tier | Purpose |
|------|------|---------|
| `Examples/e5-enterprise.md` | E5 | **Beacon Health Alliance** — multi-region HIPAA-compliant patient portal for a 50-hospital network. Compliance anti-criteria, multi-team parallelizable features, 68 ISCs, every section populated. The E5 reference Scaffold reads. |

---

## ID Stability Rule

**ISC IDs never re-number on edit.** When the Splitting Test produces a finer-grained version of `ISC-7`, the original number is preserved as the parent and children become `ISC-7.1`, `ISC-7.2`, etc. Do not collapse the numbering even if the ISC is dropped — leave a tombstone marker so historical references in Decisions, Learning, and Verification remain valid.

This rule exists because `Reconcile` is keyed on ISC IDs. If IDs renumber across edits, ephemeral feature-file reconciliation breaks silently. The renumbering ban is what makes feature-file workflows safe.

---

## Ephemeral Feature Files (Ralph Loop / Maestro pattern)

When a feature is to be worked in an isolated context (Ralph Loop, Maestro, parallel coding-agent instances), the Algorithm invokes:

```
Skill("ISA", "extract feature <name> as ephemeral file")
```

`Scaffold` (with `--ephemeral` mode) produces a derived view at `MEMORY/WORK/{slug}/_ephemeral/<feature>.md` containing only the slice relevant to that feature: the Vision and Goal as read-only context, the relevant Constraints, the ISCs in the feature's `satisfies:` list with stable IDs, the matching Test Strategy entries, and an empty Verification section.

A fresh-context agent operates against the ephemeral file alone. At completion, `Reconcile` deterministically merges ISC checkmarks, Verification provenance stubs, Decisions entries, and any new Learning (C/R/L) entries back to master, then archives the ephemeral file under `_ephemeral/.archive/`.

**Ephemeral files are derived views. They are never sources of truth. They are never hand-edited as policy. The master ISA is what persists.**

---

## Relationship to the Algorithm

The Algorithm invokes this skill at run start to scaffold or read an ISA. The skill does not run the Algorithm — it owns the artifact the Algorithm operates on.

- Scoping: `Skill("ISA", "scaffold from prompt")` → returns populated ISA at canonical location.
- Scoping / close: `Skill("ISA", "check completeness of <path>")` → pass/fail + gap report.
- Planning: `Skill("ISA", "extract feature <name> as ephemeral file")` → ephemeral excerpt.
- Learning: `Skill("ISA", "reconcile <ephemeral-path> → <master-path>")` → deterministic merge.

The Algorithm doctrine (`~/.claude/LIFEOS/ALGORITHM/LATEST` → `v{LATEST}.md`) governs invocation cadence. This skill is invocation-agnostic — it works the same whether called by the Algorithm or directly by the user.

---

## Format spec cross-reference

The full ISA format spec lives at `~/.claude/LIFEOS/DOCUMENTATION/ISA/ISAFormat.md`. This skill implements that spec; if there is ever a contradiction, the format spec wins and this skill is updated to match.

The system-architecture doc — five identities, three-guardrail taxonomy, fourteen-section body, six workflows, two homes, subsystem relationships — lives at `~/.claude/LIFEOS/DOCUMENTATION/ISA/ISASystem.md`. Read that for the conceptual frame; read this file (and `ISAFormat.md`) for the operational contract.
