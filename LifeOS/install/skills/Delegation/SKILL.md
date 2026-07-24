---
name: Delegation
description: "Parallelizes independent work across Hermes subagents via delegate_task, matching model strength to task complexity and reserving budget to verify what delegates claim. Fan out independent work; keep dependent or shared-state work sequential. USE WHEN: delegate, parallel, agents, fan out, subagent, team, spawn agents, divide and conquer, multi-agent, run these in parallel. NOT FOR single-file edits, dependent pipelines, or work reachable by Glob+Grep+Read in under 30s."
effort: medium
---

# Delegation — Parallelization on Hermes

## What It Does

Splits independent work across Hermes subagents through the `delegate_task` primitive, matches the model to the task (deep reasoning gets the strongest model; grunt work gets the cheapest capable one), runs the pieces in parallel, and verifies the results before trusting them. LifeOS ran this on Claude Code's `Agent()`/`TeamCreate`; Hermes replaces that transport with `delegate_task` and its own model routing. The doctrine — parallelize the independent, right-size the fan-out, prove the disk effect — is unchanged.

## The Problem

Doing independent work serially wastes wall-clock; throwing a heavyweight model at every subtask wastes tokens; over-delegating wastes both. The most expensive recurring failure in the reflection log is over-delegation — teams spawned for single-file rewrites, a writing agent that reported "completed" with zero disk writes, waves so large no budget was left to verify them. This skill routes each job to the right weight and the right model, and forces a verification reserve so a "done" claim is checked, not trusted.

## Core Principle

**Parallelize independent work; match the model to the task complexity; verify every claim.** A subagent is not free — its setup, context load, and result handling cost more than a direct `Read`. Delegate when the work is genuinely parallel and non-trivial, not by reflex.

## Model Selection Matrix

Hermes uses its own model routing (config'd in `delegation.*`); describe the tier by capability, not a hardcoded name.

| Task Type | Capability Tier | Model |
|---|---:|---:|---|
| Deep reasoning, complex architecture, adversarial verification | **Strongest available** | `gpt-5.6-luna` / `gpt-5.6-terra` / `gpt-5.6-sol` |
| Standard implementation, most coding, focused analysis | **Mid-tier** | `gpt-5.4` |
| Simple lookups, file reads, classification, parallel grunt work | **Cheapest capable** | `gpt-4-mini` |

Set the model per dispatch via `delegate_task(..., model=...)`. Unspecified inherits the session/`config.yaml` default. See `AgentReference.md` for the `delegation.*` config keys.

## Hermes-Native Delegation Primitives

| Primitive | Meaning |
|-----------|---------|
| `delegate_task(goal, context)` | Single subagent, isolated context. Give it full context — it starts fresh. |
| `delegate_task(tasks=[...])` | Parallel subagents, up to `delegation.max_concurrent_children`. |
| `delegate_task(..., role="leaf")` | Worker — cannot re-delegate. The default for grunt work. |
| `delegate_task(..., role="orchestrator")` | Can spawn its own workers. Use only when the subtree genuinely needs to fan out again. |
| `delegate_task(..., background=true)` | Returns immediately; gather the result later. For research/long builds whose output isn't needed inline. |

Long-running shell work runs under `terminal(background=true)`, not a subagent. (LifeOS `Bash(run_in_background)` → Hermes `terminal(background=true)`.)

## The Fan-Out Pattern

The load-bearing shape for parallel work:

1. **Split** the work into independent units — no shared state, no ordering between them.
2. **Dispatch** them all in one `delegate_task(tasks=[...])` call so they run concurrently.
3. **Gather** the results when all return.
4. **Spotcheck** — verify each claimed effect before trusting it (see Right-Sizing below).

```
delegate_task(tasks=[
  {goal: "Refactor module A to the new API", context: "...", role: "leaf", model: <mid>},
  {goal: "Refactor module B to the new API", context: "...", role: "leaf", model: <mid>},
  {goal: "Update the call sites in C",        context: "...", role: "leaf", model: <mid>},
  {goal: "Regenerate the fixtures in D",       context: "...", role: "leaf", model: <cheap>},
])
```

## Timing Tiers → Algorithm Effort

Delegation weight scales with the Algorithm's effort tier. Load the **Algorithm** skill to pick the tier; this skill executes the fan-out.

| Timing | Algorithm tier | Delegation strategy |
|--------|----------------|---------------------|
| **fast** | E1–E2 | No delegation, or 1 lightweight worker. Direct tools preferred. |
| **standard** | E3 | 1–2 foreground subagents for discrete subtasks. |
| **deep** | E4–E5 | 3–8 parallel subagents; `background=true` for research; `orchestrator` role only when a subtree must re-fan. |

## Right-Sizing Pre-Gate (run before any fan-out)

The tiers set a *minimum*; this gate sets the *ceiling* and the proof you owe. It exists because over-delegation is the top recurring waste.

- **(a) Zero-agent check.** Answer already in working memory, or reachable by `Glob`+`Grep`+`Read` in under 30s, or isolated to one file? → **0 agents, do it inline.**
- **(b) Disk-effect probe on every writing delegate.** A delegate that says it wrote/edited files is not trusted until confirmed: the file exists AND the diff is non-empty (`Read` / `git diff` / `Grep` the claimed change). A "completed" report is a claim, not evidence. The constitution's verification rule binds delegates exactly as it binds the primary.
- **(c) Budget reservation above ~8 concurrent.** A wave past ~8 must reserve explicit verification budget and name a non-agent fallback in `## Scope` for when the wave comes back unusable. Nesting via `orchestrator` multiplies the count — the ceiling is on the whole tree.

## The `## Scope` Requirement

**Every delegation brief must carry a `## Scope` block** so the delegate knows the shape of "done" and the primary can size verification:

```
## Scope
- Timing: fast | standard | deep
- Expected output: <size/shape — e.g. "a 5-row table", "edits to 3 files", "a 200-word summary">
- Constraints: <read-only? which files may change? token ceiling? fallback branch if unusable>
```

Briefs state the **ideal state** — WHAT a done result looks like as testable outcomes, the CONSTRAINTS, and the TOOLS — then trust the delegate to find HOW. Do not choreograph the delegate's reasoning; that caps a capable model and rots as models improve. Prefer the coverage outcome ("trust a match only when 3+ independent sources align") over a hardcoded fan-out count.

## When NOT to Fan Out

- **Dependent tasks** — B needs A's output. Run sequentially.
- **Shared mutable state** — parallel writers to the same file/state collide. Serialize, or isolate each in its own path.
- **Strictly sequential pipelines** — a fixed order is the point; parallelism breaks it.
- **Trivial work** — a single-file edit or a sub-2-second `Grep` is faster done inline than delegated.

## Gotchas

- **Delegates start fresh.** They inherit no conversation. Put full context in the brief or they guess.
- **A "completed" report is a claim.** Always disk-probe writing delegates (gate b). The zero-disk-write failure — 110k tokens for nothing — came from trusting a report.
- **Isolate parallel writers.** Concurrent delegates editing the same file corrupt each other; give each its own file/worktree path or serialize.
- **`orchestrator` multiplies cost.** Every re-fan is another wave against the same budget. Use `leaf` by default; reach for `orchestrator` only when a subtree must genuinely fan out again, and count it in gate (c).
- **Don't over-verify by cloning bias.** For a convergence check, don't spawn N identical delegates that all defend the same framing — vary the lens so disagreement is real.

## Examples

### Example 1 — parallel research (independent, no coordination)
"Research these 4 topics." → `delegate_task(tasks=[...])`, one `leaf` per topic at a mid/cheap model, each with a `## Scope` capping output size. Gather, then synthesize inline.

### Example 2 — right-sized inline (0 agents)
"What does `config.yaml` set for delegation?" → Zero-agent check passes (one `Read`). Do it inline; no delegation.

### Example 3 — deep fan-out with a verification reserve
E5 refactor across 12 files. → Split into ≤8 `leaf` dispatches at a mid model, reserve budget to `git diff` every claimed edit (gate b), and name a "revert + do sequentially" fallback in `## Scope` (gate c).

## Cross-References

- Delegation config + model tiers + copy-paste `## Scope` templates: `AgentReference.md`
- Effort-tier selection: **Algorithm** skill
- Ephemeral feature-file extraction during parallel work: **ISA** skill
- Delegation lifecycle mapping (retired `AgentInvocation.hook.ts` → `delegation.*` config): `PORT_SCHEMAS/hook_mapping.md`
- Verification doctrine binding delegates: `HERMES_CONSTITUTION.md` §9
