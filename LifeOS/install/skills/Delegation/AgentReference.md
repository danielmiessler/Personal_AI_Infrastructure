# Agent Reference — Hermes Delegation

Concise reference for the **Delegation** skill: config keys, model tiers, roles, and copy-paste `## Scope` blocks. Uses Hermes `delegate_task` invocations, not LifeOS `Agent()` syntax.

## Delegation config (`config.yaml`)

Delegation defaults live under `delegation.*` in `$HERMES_HOME/config.yaml` (Config skill, Layer 2). A `delegate_task` call inherits these unless overridden per dispatch.

| Key | Purpose |
|-----|---------|
| `delegation.model` | Default model for subagents |
| `delegation.provider` | Provider backing that model |
| `delegation.max_iterations` | Iteration ceiling per subagent (analogous to LifeOS `max_turns`) |
| `delegation.reasoning_effort` | Default reasoning effort for subagents |
| `delegation.max_concurrent_children` | Fan-out width cap for `delegate_task(tasks=[...])` |

Override per dispatch: `delegate_task(goal=..., model=<strong|mid|cheap>, reasoning_effort=..., role=...)`.

## Model selection

Describe by capability tier — Hermes routing resolves the actual model.

| Task shape | Tier |
|-----------|------|
| Deep reasoning, complex architecture, adversarial verification | Strongest available |
| Standard implementation, most coding, focused analysis | Mid-tier |
| Simple lookups, file reads, classification, parallel grunt work | Cheapest capable |

Rule of thumb: default subtasks to the mid tier; promote to strongest only for genuinely hard reasoning; drop to cheapest for mechanical, high-volume work.

## Agent roles

- **`leaf`** — worker; cannot re-delegate. The default. Use for every unit that does its own work and returns.
- **`orchestrator`** — can spawn its own workers. Use only when a subtree must genuinely fan out again. Each level multiplies agent count against the shared budget — count it in the Right-Sizing gate.

## Background delegation

`delegate_task(goal=..., background=true)` returns immediately; gather the result later. Use for research, long builds, and parallel investigations whose output isn't needed inline. Long-running shell work uses `terminal(background=true)`, not a subagent.

## Fan-out example (4 independent units)

```
delegate_task(tasks=[
  {goal: "Audit auth module for bypasses", context: "<files, threat model>", role: "leaf", model: <strong>},
  {goal: "Summarize the 3 RFC drafts",     context: "<urls/paths>",          role: "leaf", model: <cheap>},
  {goal: "Port config loader to new schema",context: "<schema, file>",        role: "leaf", model: <mid>},
  {goal: "Regenerate test fixtures",        context: "<fixture dir>",          role: "leaf", model: <cheap>},
])
```

All four run concurrently (up to `max_concurrent_children`). Gather, then spotcheck each.

## Spotcheck pattern (mandatory)

Never trust a subagent's claim — verify the effect before proceeding:

- **Writing delegate** → confirm the file exists AND the diff is non-empty: `git diff` / `Read` / `Grep` the claimed change. A "completed" report is a claim, not evidence.
- **Analysis delegate** → sanity-check the conclusion against a source it cited, or against a second delegate with a *different* lens (not a clone that shares its bias).
- **Above ~8 concurrent** → reserve budget for this spotcheck before dispatching, and name a non-agent fallback branch.

## `## Scope` templates (copy-paste)

**fast**
```
## Scope
- Timing: fast
- Expected output: 1 short answer or ≤5-line result
- Constraints: read-only; no file writes; single model call preferred
```

**standard**
```
## Scope
- Timing: standard
- Expected output: <e.g. edits to 1–2 named files, or a 1-page analysis>
- Constraints: may edit only <named files>; report diffs; token ceiling <N>
```

**deep**
```
## Scope
- Timing: deep
- Expected output: <e.g. a working multi-file change + evidence of verification>
- Constraints: may edit <paths>; must self-verify (tests/diff); if unusable, stop and report — do not improvise
- Fallback if wave returns unusable: <e.g. revert and do sequentially inline>
```

## Cross-References

- Full doctrine: `SKILL.md` (Delegation)
- Config layer that holds `delegation.*`: **Config** skill
- Effort-tier selection: **Algorithm** skill
