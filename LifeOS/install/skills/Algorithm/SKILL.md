---
name: Algorithm
description: "The Hermes-native execution engine — the seven-phase current→ideal loop (OBSERVE, THINK, PLAN, BUILD, EXECUTE, VERIFY, LEARN) with effort tiers, ISC quality gates, ID-stability, and the verification doctrine. Turns a substantial request into a hill-climb against a written, falsifiable ISA and closes only on tool evidence. USE WHEN: run the algorithm, execute with the algorithm, substantial or multi-phase work, build/ship a feature, anything where 'done' needs to be written down and verified, a task that spans multiple tools/agents/sessions. NOT FOR trivial one-line answers (answer inline) or owning the ISA artifact itself (use ISA)."
effort: high
---

# The Algorithm — Hermes Execution Engine

## What It Does

The Algorithm is the one loop LifeOS runs at every scale: move a thing from its **current state** to its **ideal state** by writing "done" as testable claims (the ISA) and refining until every claim survives every probe it can be subjected to. It is conjecture and refutation against the ISA — the spec *is* the test suite, and tool evidence is altitude. Without tool evidence there is no up or down.

This skill owns the **procedure**: phase transitions, effort-tier floors, ISC quality gates, and the verification doctrine. The `HERMES_CONSTITUTION.md` (loaded as the ephemeral system prompt) owns the **invariants**; this skill implements them. When the two disagree, the constitution wins and this skill is corrected to match. The **ISA** skill owns the artifact this loop operates on — this skill never duplicates ISA content, it invokes it.

## When To Run It

Dynamic range is the whole point: a one-line answer and a week-long build are the same loop at different depths. Do **not** impose ceremony on a trivial request, and do **not** skip verification on consequential work. Run the full loop when "done" needs articulation, construction, or verification — a feature, an app, a migration, infrastructure, anything spanning multiple tools, agents, or sessions. The trigger is what *done* requires, not a complexity label.

The phases are a reasoning-and-execution contract, **not** a requirement to emit phase banners on every turn.

---

## The Seven Phases

Each phase names its Hermes-native tooling. Phases may compress or overlap for smaller work; nothing here mandates a fixed number of tool calls.

| # | Phase | What happens | Hermes-native tooling |
|---|-------|--------------|-----------------------|
| 1 | **OBSERVE** | Establish current state, constraints, sources, missing context, external prerequisites. Scaffold the ISA. | `hindsight_recall` for prior durable context (identity, TELOS projection, project knowledge, past learnings/failures on this slug). `/skill ISA` → Scaffold at the correct home + CheckCompleteness. Read/Grep/Glob for the code's actual state. Probe external prerequisites (tokens, logins, deploy targets) *before* execution. |
| 2 | **THINK** | Identify the real problem, the relevant TELOS direction, risks, assumptions. Resolve material ambiguity. | Query the **cognitive graph** (`mind.db` — the Aron-model: values, heuristics, tensions, mental models) for decision architecture. Consult `WorldThreatModel` (world-model) / `BitterPillEngineering` (danger-model) when blast radius warrants. Use `FirstPrinciples`, `Council`, `RedTeam`, `IterativeDepth` for hard reasoning. Ask up to 3 targeted questions when the answer would change what gets built. |
| 3 | **PLAN** | Define ideal state as ISCs, dependencies, features, and the verification approach. | `/skill ISA` to write Goal + atomic Criteria + Test Strategy + Features. Extract an ephemeral feature slice when delegating (`/skill ISA` → Scaffold `--ephemeral`). Decide the spend: models, agents, audit depth. |
| 4 | **BUILD** | Make the **smallest coherent change** that moves one claim toward true. | Edit/Write. One vertical slice at a time — end-to-end increments, not horizontal layers. |
| 5 | **EXECUTE** | Run the relevant tools, integrations, workflows, agents. | Terminal/Bash, MCP tools, delegated subagents (`Delegation` skill at 3+ independent workstreams). `🤖 DISPATCH: <agent> — <model>` when delegating. |
| 6 | **VERIFY** | Test the actual result with evidence of the right modality. No "should work". | Tool probe per claim (see Verification Doctrine). A Hermes post-tool lifecycle mirrors ISA/workspace state; a Hermes turn-completion gate (the native equivalent of the LifeOS VerificationGate + WritingGate) checks the close. Optional cross-vendor / fresh-context skeptic pass for high-blast-radius work. |
| 7 | **LEARN** | Record durable lessons, corrections, dead ends, and unresolved questions. | `hindsight_retain` with rich content (durable facts/learnings/failures — NOT active task state). `/skill ISA` → Append (Decisions / Changelog C-R-L / Verification). Route doctrine/identity/rule changes to the principal, not silently into memory. |

> **Hook-replacement note.** LifeOS drove these transitions with Claude Code hooks (`ISASync`, `CheckpointPerISC`, `StopGates`, `AlgorithmNudge`, `MemoryReviewFire`). Under Hermes those are runtime-native: the post-tool lifecycle syncs workspace/ISA state, git checkpoints land on ISC closure, the turn-completion middleware enforces the verification and writing gates, skill routing + the constitution replace the nudge layer, and `hindsight_retain` replaces the memory-review fire. See `PORT_SCHEMAS/hook_mapping.md`. Do not expect `settings.json` hooks or `launchd`.

---

## Effort Tiers (E1–E5)

Effort tiers set **floors**, not ceilings — the minimum ISA structure and the minimum thinking depth a run of that weight must clear. Spend scales *up* from the floor as the work reveals difficulty and blast radius; it never drops below it. The principal's plain-language steering ("go heavy", "quick pass", a stated budget) outranks the tier and outranks my judgment. A literal `/e1`–`/e5` reads as "go at least this heavy."

| Tier | Shape | ISC floor (required ISA sections) | HARD thinking floor |
|------|-------|-----------------------------------|---------------------|
| **E1** | Trivial / fast-path (<~90s) | Goal, Criteria | None mandated — answer inline; a minimal Goal+Criteria ISA may be direct-written and the shape check logged inline. |
| **E2** | Single-domain change | Problem, Goal, Criteria, Test Strategy | Brief explicit reasoning before building. |
| **E3** | Mid-size project | Problem, Vision, Out of Scope, Constraints, Goal, Criteria, Features, Test Strategy | Extended thinking; surface risks and at least one alternative. |
| **E4** | Cross-cutting / high blast radius | All fourteen ISA sections (Dependencies / Bridge Criteria only when cross-ISA links exist) | Deep thinking; delegation and/or a reasoning skill (Council / RedTeam / FirstPrinciples); consider a cross-vendor or fresh-context audit. |
| **E5** | Maximum / mission-critical | All fourteen + an ISA **Interview** run before BUILD | Maximum thinking; multi-pass; an independent second look is the default, and eliding it requires a logged reason. |

The ISC-floor column is enforced by the **ISA** skill's Tier Completeness Gate — this skill does not re-implement it. A **project** `<project>/ISA.md` is always at least E3 structure regardless of the active task's tier; one transient E1 task must never downgrade the long-lived source of truth.

> These tiers are the port's explicit floor ladder. The live LifeOS Algorithm (v8+) retired tier *declaration* in favor of judgment discovered from the work; the floors are retained here as a Hermes-native quality contract so a run can never under-articulate or under-verify below its weight. Both truths hold: spend follows the work, and the floor is the minimum that work of a given weight must clear.

---

## ISC Quality Gates

Every Ideal State Criterion (ISC) that closes a claim must pass three gates. The ISA skill owns their mechanics; the Algorithm enforces they were applied before a run completes.

1. **Granularity.** One ISC = one atomic, binary, independently verifiable claim, each naming the tool probe that would falsify it. If a claim needs "and" to describe its done condition, split it (Splitting Test).
2. **Tier floor.** The required sections for the active tier are present and populated (empty sections never appear). A miss blocks `phase: complete`.
3. **Doctrinal minimums (HARD, every tier):**
   - **≥1 anti-criterion** on the build itself (`Anti:` prefix) — what must *not* happen. Absence at OBSERVE is a hard completeness failure.
   - **≥1 antecedent** (`Antecedent:` prefix) when the goal is **experiential** (art, design, content, anything that has to "land") — a precondition that reliably produces the target feeling. Verifiable goals (build/deploy/schema) don't need one; experiential goals always do.

---

## ID-Stability Rule

**ISC IDs never re-number on edit.** This is the cornerstone that makes ephemeral-feature-file reconciliation and cross-session references safe.

- **Splits** become children: when the Splitting Test refines `ISC-7`, keep `ISC-7` as the parent and add `ISC-7.1`, `ISC-7.2`, … Never collapse the numbering.
- **Drops** become tombstones: `- [ ] ISC-N: [DROPPED — see Decisions YYYY-MM-DD]`. Never delete the line — historical references in Decisions, Changelog, and Verification must keep resolving.
- Reconcile keys on stable IDs; renumbering breaks feature-file merges *silently* (the failure looks like "the worker's checkmarks didn't land in master").

---

## Verification Doctrine

**"Should work" is forbidden.** No claim closes without tool evidence of the right modality, in the same or the next tool block. Never report "done" from intent, a plan, or an untested code path. Match the evidence to the claim:

| Claim kind | Required evidence |
|------------|-------------------|
| File change | Read-back + diff |
| Code | Grep / run the test / type-check / direct execution (prefer red-before-build) |
| Command | Checked exit + output |
| HTTP | `curl -i` (or equivalent) with the response |
| Deploy / remote | Live probe of the deployed URL/ID + read-back |
| Web / UI | The actual user path; visual verification when appearance matters |
| Appearance | Viewed non-degenerate pixels |
| Motion | Frame scrub |
| Schema | `SELECT` |
| Config | Read-back |
| Memory change | A successful provider result + a recall/read-back check |

If verification is genuinely unavailable, say **"deployed/changed but unverified"** — never substitute weaker evidence. `[DEFERRED-VERIFY]` is a holding state, not a pass: name the follow-up task; it blocks `complete` unless waived in the Log.

**Class sweep.** A defect recognized as an instance of a class does not close until one grep/glob enumerates every sibling, each fixed-and-verified or tombstoned: `🧹 CLASS-SWEEP: <class> — N siblings via <probe>; M fixed, K tombstoned`.

---

## Capability Enumeration (closed list — no phantom capabilities)

The capabilities available to a run are exactly the **installed Hermes skill body** plus the enumerated Hermes runtime tools (Hindsight recall/retain/reflect, the cognitive graph, terminal/file/memory toolsets, delegation, MCP tools that are actually connected). This list is closed:

- **Invoke a skill when its trigger matches — do not handroll what a skill already does.** The skill descriptions are THE capability inventory; a second copy would rot.
- **Never invent a capability that isn't installed.** If a run needs a tool, integration, or service that is not present, that is a MISSING prerequisite to surface at OBSERVE — not a step to narrate as if it ran. Phantom capabilities (claiming a probe, integration, or agent that doesn't exist) are a verification-doctrine violation.
- **A subagent's self-report is not evidence** — the transcript / tool output is. Every writing agent's claim is probed on disk before it is trusted.

---

## Workflow Routing

The Algorithm is a loop, not a menu — but it routes to other skills at known seams. Match the situation to the skill.

| Situation | Route to |
|-----------|----------|
| Need to scaffold / score / reconcile the ISA artifact | **ISA** (`/skill ISA`) — see the ISA integration section below |
| Constitutional invariant in question (identity, memory boundaries, security, verification) | `HERMES_CONSTITUTION.md` (ephemeral system prompt) — invariants live there |
| 3+ independent workstreams | **Delegation** — fan out; `🤖 DISPATCH` per agent |
| Hard reasoning / competing approaches | **FirstPrinciples**, **Council**, **RedTeam**, **IterativeDepth**, **Science** |
| Long-horizon / high-blast-radius stress test | **WorldThreatModel** (world-model), **BitterPillEngineering** (danger-model) |
| Idea worth preserving surfaced mid-run | **Amber** — capture it so it isn't lost |
| Prior work / session context needed | `hindsight_recall` first; **ContextSearch** for session/ISA history |
| Output-quality refinement against a metric | **Optimize**, **Evals**, **Hardening** |

---

## ISA Integration (cross-reference — the ISA skill owns the artifact)

The Algorithm operates the loop; the **ISA** skill owns the Ideal State Artifact. This skill invokes ISA workflows at the phase seams below and **does not duplicate ISA content** — the fourteen-section body, the Splitting/Variation tests, the C-R-L Changelog format, and the completeness gate all live in `/skill ISA` and `LIFEOS/DOCUMENTATION/Isa/IsaFormat.md`.

| Phase seam | ISA invocation | Purpose |
|------------|----------------|---------|
| **OBSERVE** | `/skill ISA` → **Scaffold** at tier T | Write "done" before building — an ISA at the correct home (`<project>/ISA.md` for persistent things, `MEMORY/WORK/{slug}/ISA.md` for tasks). |
| **OBSERVE → THINK boundary** | `/skill ISA` → **CheckCompleteness** at tier T | Confirm the tier floor + doctrinal minimums are met before committing to a plan; a miss blocks. |
| **PLAN** | `/skill ISA` → **Scaffold `--ephemeral`** (extract feature) | Produce an isolated feature slice for a delegated / fresh-context agent, keyed on stable ISC IDs. |
| **LEARN** | `/skill ISA` → **Append** | Record Decisions (incl. dead ends), the four-piece C-R-L Changelog, and quoted per-ISC Verification evidence. |
| **Session resume** | `/skill ISA` → **Reconcile** | Deterministically merge an ephemeral feature file's checkmarks/evidence back into the master ISA. Never re-run passed gates; keep going. |

Invoke ISA workflows by name via `/skill ISA "<intent>"` (the Hermes-native replacement for the LifeOS `Skill("ISA", "…")` call). The ISA skill is invocation-agnostic — it behaves identically whether the Algorithm calls it or the principal does.

---

## Gotchas

- **Inline-reachable answers spend nothing (the writing-agent trap).** If the answer is in front of you, use zero agents. A fan-out past ~8 agents reserves verification budget and names a non-agent fallback. Every writing agent's on-disk claim is probed before it is trusted.
- **The ISA at close is not the ISA at open.** Any run that surfaced new information — corrections, failed probes, discovered constraints, implied wants — folds it in *as it arrives*: claims added, split, tightened, or killed. Discoveries in-transcript with zero ISA deltas after scaffold is the falsifier for a run that stopped thinking.
- **Do not put active task state into Hindsight.** ISA checklists, phase state, and work registries belong in workspace/session artifacts. Hindsight holds durable facts, learnings, and reflected wisdom — not the live state of this run.
- **Every explicit ask is honored, skipped-with-reason, or surfaced.** A depth/steering directive ("think deeply", "quick pass") is itself an explicit ask under this rule — an explicit depth directive that produced neither visible capability use nor a stated reason for answering inline is a break to surface, never swallow.
- **A gate that never fires is theater.** Doctrine without a probe decays. If a quality gate here can't be evidenced by a tool result, it is self-attested and must be watched for decay — prefer a mechanical check.

---

## Examples

### Example 1 — E2 single-domain feature (add a verify mode to a backup CLI)

1. **OBSERVE** — `hindsight_recall` on the repo/slug; Read the CLI's arg parser; `/skill ISA` → Scaffold at E2 (`MEMORY/WORK/{slug}/ISA.md`) → Problem, Goal, Criteria, Test Strategy. Probe: does the backup format expose a checksummable field? (Read.)
2. **THINK** — real problem is *silent* corruption, so an anti-criterion writes itself: `Anti: --verify exits 0 on a truncated archive`.
3. **PLAN** — ISCs: `ISC-1 --verify recomputes SHA-256 and compares`, `ISC-2 mismatch → non-zero exit`. Test Strategy: `bun-test`, red-before-build.
4. **BUILD → EXECUTE** — smallest change; run the test (red → green).
5. **VERIFY** — Grep the diff, run the suite, `curl`-free (local) so exit-code + output is the evidence. VerificationGate-equivalent passes.
6. **LEARN** — `/skill ISA` → Append the Verification evidence; `hindsight_retain` the gotcha if the checksum field was non-obvious.

### Example 2 — E4 cross-cutting migration (REST → GraphQL with backwards-compat)

- OBSERVE recalls prior migration learnings and scaffolds an E4 ISA (all fourteen sections, Dependencies present because two services share a seam). THINK runs `RedTeam` on the compat plan and queries the cognitive graph for the principal's stance on breaking changes. PLAN extracts one ephemeral feature slice per endpoint and **Delegation** fans them to worktree-isolated agents (`🤖 DISPATCH` each). VERIFY probes each live endpoint (`curl -i`) *and* runs a cross-vendor audit because blast radius is high; a class-sweep enumerates every un-migrated endpoint. LEARN reconciles each ephemeral file back to master and retains the migration postmortem.

### Example 3 — E1 fast-path (add a `--no-color` flag)

- No ceremony: direct-write a minimal Goal + 4 Criteria ISA, make the change, Grep the flag is wired and run `tool --no-color | cat` to confirm no escape codes, log the shape check inline. Done in one pass — the loop still ran, just at its floor.

---

## Cross-References

- Constitutional invariants: `LifeOS/install/LIFEOS/HERMES_CONSTITUTION.md` (ephemeral system prompt)
- The artifact: **ISA** skill (`skills/ISA/SKILL.md`) + format spec `LIFEOS/DOCUMENTATION/Isa/IsaFormat.md`
- Source doctrine adapted: `LIFEOS/ALGORITHM/LATEST` (currently v8.4.0) + `LIFEOS/DOCUMENTATION/Algorithm/AlgorithmSystem.md`
- Hook → Hermes-native mapping: `PORT_SCHEMAS/hook_mapping.md`
- Memory boundaries + tags: `PORT_SCHEMAS/hindsight_memory_schema.md`
