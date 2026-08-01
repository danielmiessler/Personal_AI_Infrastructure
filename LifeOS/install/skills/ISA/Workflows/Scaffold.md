# Scaffold Workflow

Generate a fresh ISA from a prompt. The output is a populated ISA file at the canonical location with the sections the work's substance requires (effort tiers were retired 2026-07-11 — substance is judged from the work, never declared as a label).

## When to invoke

- The Algorithm at run start: `Skill("ISA", "scaffold from prompt: <user message>")`
- User directly: `Skill("ISA", "scaffold from prompt: <prompt>")`
- Ephemeral feature mode: `Skill("ISA", "extract feature <name> as ephemeral file from <master-isa-path>")`

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| prompt | yes | The user's request — verbatim or distilled |
| substance | no | Optional depth steer from the caller ("trivial" / "substantial" / "deepest", or plain language like "go heavy"); default is judged from the prompt |
| project | no | If task targets a known project from PROJECTS.md, the project ISA path is used; otherwise a task ISA at `MEMORY/WORK/{slug}/ISA.md` |
| ephemeral_feature | no | If set, scaffold a feature-file excerpt instead of a full ISA |

## Output

A markdown file at one of:
- `<project-root>/ISA.md` — when `project` is supplied (existing project ISA is read-extended, not overwritten)
- `~/.claude/LIFEOS/MEMORY/WORK/{slug}/ISA.md` — when no project (slug = `YYYYMMDD-HHMMSS_kebab-task-description`)
- `~/.claude/LIFEOS/MEMORY/WORK/{slug}/_ephemeral/<feature>.md` — when `ephemeral_feature` is set

## Procedure

### Step 1 — Voice notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Scaffold workflow in the ISA skill"}' \
  > /dev/null 2>&1 &
```

### Step 2 — Pick the canonical template

Always start by reading `~/.claude/skills/ISA/Examples/canonical-isa.md` for section headers and tone. For a minimal-task reference, read `e1-minimal.md`; for the deepest-scale reference, read `e5-enterprise.md`. (The `eN-` filename prefixes are retired tier vocabulary kept as filenames; examples may show legacy frontmatter — the SKILL.md shape wins.)

### Step 3 — Preserve principal-stated goal, then derive (Algorithm v7.0.0 R1)

**The canonical rule:** Step 3 must populate `principal_stated_goal` (frontmatter) AND the first quoted sentence of `## Goal` verbatim — both from the same byte-for-byte literal — BEFORE producing any derived section. Derivation (Out of Scope, Constraints, Principles, distilled Goal continuation, ISCs) follows the preservation, anchored to it. If detection does not fire, the preservation step is a no-op and derivation proceeds as today.

#### Step 3a — Detect and preserve the literal goal

Run the four-signal detector on the prompt:

| # | Signal | Pattern | Examples |
|---|--------|---------|----------|
| 1 | **Named metric + threshold** | quantitative target | "get p95 latency under 200ms" · "grow LinkedIn to 70k" · "open rate above 35%" |
| 2 | **Explicit outcome assertion** | "I want X" / "achieve X" / "do this" | "I want Pulse showing all four time horizons" |
| 3 | **Completion condition** | "until X" / "such that X" | "refactor until tests pass" · "ship such that Cato returns no critical findings" |
| 4 | **Structural/design directive** | explicit verb-object on the system | "design how ISA absorbs Codex /goal semantics" · "unify three skills into one" |

**Fail-closed minimum-content rule:** if a candidate literal is under 6 tokens OR contains no propositional content ("make it good", "do better", "refactor this"), set `principal_stated_goal: null` and log the candidate to a Decisions row. Better silent than anchoring against useless text.

**Multi-literal:** if multiple candidates ("do X and Y by Z"), **first wins as `principal_stated_goal:`**; others demote to derived Constraints with `derived_from: principal_stated_goal compound` annotation.

**Goal-signal detection:** no classifier hook emits `GOAL_SIGNAL` anymore (`TheRouter.hook.ts` was retired 2026-07-11 with the modes/tiers system) — the four-signal detector above is the only mechanism. (Ported from public PR #1525, @jbmml.)

When detection fires + min-content passes, write the four frontmatter fields:

```yaml
principal_stated_goal: "the verbatim user quote, byte-for-byte"
principal_stated_goal_source: prompt   # prompt | conversation | explicit-revision
principal_stated_goal_signal: <1-4>
principal_stated_goal_locked: <ISO-8601>
```

Copy the verbatim quote into `## Goal` as the first sentence, in quotes, before any derived prose.

#### Step 3b — Derive the residue

Distill what remains:
- Explicit wants beyond the literal (these become Vision + derived Goal prose)
- Explicit not-wants (these become Out of Scope)
- Implied not-wants (industry/context inference — these become Out of Scope)
- Constraints implied by the domain (these become Constraints)
- Principles implied by the user's TELOS (responsiveness, information density, operator-first, etc. — these become Principles)

**The key inversion:** today's distillation runs first and loses the literal. The new rule preserves first, derives second — and derived content is anchored to the preserved literal via the `anchors_to` column in Test Strategy.

### Step 3.5 — Ambiguity check (Algorithm v7.0.0 R3)

One rule, replacing the deleted v6.x density-formula machinery: **could I be wrong about what done means?**

If materially ambiguous — the goal supports ≥2 interpretations leading to materially different builds, or required content can't be scaffolded without speculation — ask up to 3 targeted questions (substantial work) or prepend the ambiguity flag (trivial fast-path work): `⚠️ Picking X over Y because R; redirect if wrong.` Literal whole-response `proceed` accepts reasoned defaults.

**Skip conditions (do not run the check):**
- Trivial fast-path work skips the question flow (the flag form is enough). (`TheRouter.hook.ts`, which used to emit `INTERVIEW_ELIGIBLE` hints, was retired 2026-07-11 with the modes/tiers system — substance judgment is now the sole determinant. Ported from public PR #1525, @jbmml.)
- The scaffold call has `ephemeral_feature` set (ephemeral mode operates on an already-scaffolded master).

**Record the outcome in frontmatter** — `context_sufficient: true|false` and `interview_invoked: true|false` (the only two keys v7 ISAs carry for this check; the v6.x density/divergence/acknowledgment ceremony keys are deleted).

**Re-check later:** when late-surfacing information — a premortem result, a mid-build discovery — would have changed the Goal, Vision, or Out of Scope had it been known at scaffold time, re-run the one rule and log a Decisions row naming the shift. Never blocks a phase transition.

#### Interview mechanics (when questions fire)

Emit ONE message to the user before scaffolding any sections beyond Goal:

```
I have N questions before I scaffold this. The goal is clear on X but underdetermined on Y. Say `proceed` to scaffold on reasoned defaults; otherwise answer one at a time:

1. <Q1 — chosen from the bounded shape library>
2. <Q2>
3. <Q3>
```

**Q-shape library (use 1-3 in priority order based on which sections are thinnest):**

| Thinnest section | Bounded question shape |
|---|---|
| Vision / Goal | "When this is done, what does the user feel? What would make them rate it 9-10?" |
| Out of Scope | "What would be tempting to add but distract from the core?" |
| Constraints | "What architectural mandates or things-that-must-not-change bound this work?" |
| Test Strategy | "How will you verify it worked? What probe or check would prove the goal landed?" |
| Goal (sparse) | "In one sentence, what's the smallest version of this that still counts as done?" |
| Features | "What are the major work units? What can run in parallel vs sequential?" |
| Principles | "What truths must this work respect regardless of how it's built?" |

Maximum 3 questions per fire. Each is one-question-per-turn; write answers back into the ISA before asking the next — the document fills as the principal answers. Stop early when the signal stops (two contentless answers in a row) or the principal says done.

#### `proceed` semantics

The literal override is `proceed` — **whole-response match only**, trim + lowercase: `response.trim().toLowerCase() === 'proceed'`. Substring matches ("I want to proceed with X") are NOT the override and route to question-1's answer.

#### Logging the outcome (in ISA frontmatter)

```yaml
context_sufficient: true    # false when ambiguity was flagged or `proceed` accepted reasoned defaults
interview_invoked: false    # true when targeted questions were actually asked
```

| Path | `context_sufficient` | `interview_invoked` |
|---|---|---|
| No material ambiguity found | true | false |
| Questions asked, principal answered them | true | true |
| Questions asked, principal said `proceed` | false | true |
| Trivial-path ambiguity flag prepended | false | false |

When the principal invokes `proceed` after seeing the questions:
1. Append a Decisions row: `YYYY-MM-DD HH:MM: ambiguity check fired, principal invoked proceed — reasoned defaults: <named defaults>`
2. Set frontmatter `context_sufficient: false`.
3. Verification surfaces the accepted defaults in `## Verification`/`## Log` as a known risk rather than a surprise.

### Step 4 — Write frontmatter

```yaml
---
task: "8 word task description"
slug: YYYYMMDD-HHMMSS_kebab-description
project: <name>            # only when targeting a known project
phase: scoping
progress: 0/<claim-count>
started: <ISO-8601>
updated: <ISO-8601>
# R1 — only when goal-signal detection fired + min-content rule passed
principal_stated_goal: "verbatim quote"
principal_stated_goal_source: prompt
principal_stated_goal_signal: 2
principal_stated_goal_locked: <ISO-8601>
# R3 — outcome of the ambiguity check (Step 3.5); the only two keys v7 ISAs carry for it
context_sufficient: true
interview_invoked: false
---
```

### Step 5 — Write the sections the work's substance requires

| Substance | Required Sections |
|-----------|-------------------|
| Trivial (mechanical, single-probe, minutes) | Goal, Claims (flat) |
| Substantial (multi-claim build, real blast radius) | Problem, Vision, Out of Scope, Constraints, Goal, Features (or flat Claims), Test Strategy |
| Deepest (frontier multi-component work) | All sixteen (empty sections never appear — Dependencies/Bridge Criteria only when cross-ISA links exist; Not-yet-specified only when the work has fog; Language only when a term has actually been confused) + run Interview workflow before building |

**Claims layout — pick ONE (v2.16.0):**
- **Flat `## Claims`** when the work has no distinct features (trivial/small; most task ISAs). Claim IDs `ISC-N` (or short `C1`); anti-claims carry the `Anti:` prefix inline or live in `## Anti-claims`.
- **`## Features` blocks** when the work has distinct features (most project ISAs). Each feature is `### F<n> · <name>` + a one-line `Why:` (its ideal-state — why it exists) + its ISCs nested underneath. `F0 · Cross-cutting` holds spanning claims (security, deploy, data-integrity). Emit ISCs with **global, stable IDs** (`ISC-N` across the whole ISA, never per-feature) so Test Strategy resolves. Do NOT emit the retired `name | satisfies` pointer table. Write a real `Why:` — one that says what the feature name and its claims don't.

Example feature block:
```markdown
### F1 · Billing
Why: a visitor becomes a paying subscriber and can self-serve cancel, without support.

- [ ] ISC-12: Checkout creates a Stripe session with server-side pricing.
- [ ] ISC-13: Anti: the webhook is idempotent on event.id.
```

**Project ISA override:** if `<project>/ISA.md` is the target, require full substantial-grade sections regardless of how small the current task is.

**Project ISA override:** if `<project>/ISA.md` is the target, require full substantial-grade sections regardless of how small the current task is.

**No changelog section (Algorithm v8.7.1 claim 12).** The scaffold NEVER emits a `## Changelog` section — `git log -- <isa-path>` is the authoritative change record and commit messages are its entries. The conjecture/refuted-by/learned/criterion-now trail lives in `## Learning` (the section formerly named `## Changelog`; same position 14, same four-piece C/R/L format), written at close only when understanding changed. When a claim later closes, its `## Verification` entry is a **one-line provenance stub** (commit hash, test name, or probe ref) — never a retained evidence paragraph; the proof lives in git and CI and the ISA only points at it.

### Step 5.5 — Hold fog as fog (v2.14.0)

Surface named in Vision/Goal whose shape is genuinely unknown at scaffold time does NOT get speculative ISCs. Write each such question into `## Not yet specified` as precisely as it can currently be stated (`- fog: <question> — <what must resolve before it sharpens>`). The graduation test: statable with a nameable falsifier → an ISC (even if blocked); statable but not yet probe-able → fog; beyond the vision → Out of Scope. The Coverage Gate is assessed at close, not here — CheckCompleteness at `phase: complete` requires the fog section empty (every entry graduated to an ISC or killed via a Decisions row). Omit the section entirely when the work has no fog (most tasks).

### Step 6 — Apply the Splitting Test to every claim

Each claim must satisfy the granularity rule: one binary tool probe per claim.

| Test | Split when... |
|------|--------------|
| "And"/"With" | Joins two verifiable things |
| Independent failure | Part A can pass while B fails |
| Scope words | "all", "every", "complete" → enumerate |
| Domain boundary | Crosses UI/API/data/logic → one per boundary |
| **No nameable probe** | You can't say which tool would verify it |

### Step 7 — Anti-claims reminder

Before finishing, ask: **what must NOT happen?** At least one anti-claim is required. Anti-claims typically derive from the Out of Scope section + regression-prevention concerns.

### Step 8 — Antecedent (when goal is experiential)

If the goal is experiential — art, design, content, anything that has to "land" — at least one `Antecedent:` claim is required. The antecedent names a precondition that reliably produces the target experience.

### Step 9 — Run CheckCompleteness

Before returning, invoke `Workflows/CheckCompleteness.md` against the new ISA (substantial+ work; a trivial minimal ISA logs its shape check inline instead). If any required section is missing, fill it before declaring the scaffold complete.

### Step 10 — Return the path

Output the absolute path of the created ISA file. The Algorithm consumes this path at run start.

## Ephemeral feature mode

When `ephemeral_feature` is set:

1. Read the master ISA at `master_isa_path`.
2. Locate the feature in `## Features` matching `name == ephemeral_feature`.
3. Extract:
   - `## Vision` and `## Goal` from master (read-only context)
   - `## Constraints` filtered to those relevant to this feature
   - `## Claims` (or legacy `## Criteria`) claims whose IDs appear in the feature's `satisfies:` list, with stable IDs preserved
   - `## Test Strategy` entries matching those ISCs
   - `## Decisions` filtered to entries mentioning this feature's ISC IDs (optional)
   - Empty `## Verification` section ready to populate
4. Write to `MEMORY/WORK/{slug}/_ephemeral/<feature>.md`.
5. Add a header comment: `<!-- EPHEMERAL FEATURE FILE — derived from <master-isa-path>. Reconcile via Skill("ISA", "reconcile <this-path> → <master-path>"). Do not hand-edit master from this file. -->`

## Failure modes

- **Substance mismatch:** caller steers "trivial" but the request is clearly deep multi-component work (or the reverse). Surface the mismatch; the principal's explicit call outranks judgment, but the break is never silent (Algorithm claim 15).
- **Missing required section:** CheckCompleteness blocks the return until filled.
- **Coverage gap (v7.0.0 — replaces the deleted numeric count floors; fog-aware since v2.14.0):** every subsystem named in Vision/Goal has a container criterion decomposed until each leaf is one binary tool probe; never split to hit a number. A subsystem with no container criterion is the failure — either decompose it, hold it as fog in `## Not yet specified` (when its shape is genuinely unknown yet), or document the deliberate omission in `## Decisions`. Coverage is assessed at close: fog must be empty at `phase: complete`.
- **ID collision in ephemeral mode:** if the feature's claim IDs don't exist in master, abort and surface the inconsistency — this is a master-ISA error, not a Scaffold error.
