---
name: ThreatModel
version: 1.0.1
description: Defensive threat modeling and risk management for your own estate — map where sensitive data lives across your asset graph, run compromise scenarios (what a hacked asset exposes, its blast radius, how you'd respond), and maintain a persistent risk register with likelihood×impact scoring, owners, mitigations, and review cadence via a deterministic CLI. All real data stays in your private USER tree; this skill is code only. USE WHEN threat model, threat modeling, risk register, risk assessment, what if X got hacked, compromise scenario, blast radius, sensitive data map, where is our sensitive data, data classification, risk review, add a risk, accept a risk, security risk posture. NOT FOR active pentesting or exploitation (use an offensive-security skill), world-scale futures stress-testing of ideas (use WorldThreatModel), or executing incident response (use your incident-response runbooks — this skill plans them).
---

# ThreatModel

Threat modeling for the estate you actually run. Three moves: classify where sensitive data lives, simulate compromise of the assets that hold it, and keep the resulting risks in a register that gets reviewed instead of forgotten.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/ThreatModel/`

If this directory exists, load and apply `PREFERENCES.md` (data locations, sensitive-data class priorities, response runbook cross-references). If not, proceed with defaults.

## Data/Code Separation (safety gate)

**This skill directory is public code. It must never contain data.**

- Every artifact a workflow produces — scenario docs, data classifications, register entries — is written to the private data directory, never into this skill tree.
- Default data dir: `~/.claude/LIFEOS/USER/SECURITY/THREATMODEL/` (release-excluded USER tree). Override with `THREATMODEL_DATA_DIR`.
- `Tools/RiskRegister.ts` structurally refuses any data dir that resolves inside a `skills/` path.
- Register entries reference credentials by env-var NAME only — never values. No tokens, keys, or cookies anywhere in threat-model output.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running WORKFLOWNAME in ThreatModel"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running **WorkflowName** in **ThreatModel**...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **SensitiveDataMap** | "where is our sensitive data", "data classification", "which assets hold sensitive data" | `Workflows/SensitiveDataMap.md` |
| **CompromiseScenario** | "what if X got hacked", "compromise scenario", "blast radius of X" | `Workflows/CompromiseScenario.md` |
| **ThreatModelTarget** | "threat model X", "threat model the estate", "risk assessment of X" | `Workflows/ThreatModelTarget.md` |
| **RiskRegister** | "risk register", "add a risk", "risk review", "accept risk", "close risk" | `Workflows/RiskRegister.md` |

## Asset Graph Integration

If the install has Atlas (`~/.claude/LIFEOS/ATLAS/Atlas.ts`), workflows use it as the current-state source of truth:

```bash
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts blast <key>     # what relies on this asset
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts owns <key>      # what deleting/losing it orphans
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts exposed <key>   # which credentials it would leak, priority-ordered
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts sql "SELECT ..."  # read-only census queries
```

`exposed` makes the "one hop of trust" step deterministic instead of a judgment call: it returns the credentials an asset holds, transitively through what it owns, compromise-tier first. Pair it with a DEPENDS_ON query for the data stores an asset can reach:

```bash
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts sql "SELECT a.kind, a.canonical_key FROM edge e JOIN asset a ON a.id=e.dst WHERE e.kind='DEPENDS_ON' AND e.status='active' AND e.src=(SELECT id FROM asset WHERE canonical_key='<key>')"
```

Without Atlas, workflows fall back to what the user enumerates plus repo/config inspection — and say so in the output. Never invent an inventory.

## Risk Scoring

`score = likelihood (1-5) × impact (1-5)` → **Low** 1-4 · **Medium** 5-9 · **High** 10-14 · **Critical** 15-25.

Impact is anchored to data classes and blast radius, not vibes: an asset whose compromise exposes credentials or customer data starts at impact 4+. Likelihood is anchored to exposure (public URL, auth boundary, patch state, credential hygiene).

## Gotchas

- **The register markdown is a generated view.** The JSON store is the system of record; edit via the CLI, never by hand-editing the exported `RiskRegister.md` — the next export overwrites it.
- **Unclassified ≠ safe.** An asset with no sensitive-data tag is *unclassified*, never *clean*. Absence of classification is not evidence of absence of data (the absence-metric rule). SensitiveDataMap output must list unclassified assets explicitly.
- **Graph blast radius is derived evidence.** Asset-graph queries show what the graph knows; before treating a blast radius as complete for a high-stakes decision, confirm against the provider's authority API (the graph can lag or under-model edges).
- **Scenario impact includes what the asset can REACH, not just what it stores.** A box with no data but with credentials/bindings to data-bearing systems inherits their impact. Walk the trust hop with `atlas exposed` (credentials) plus a DEPENDS_ON query (data stores) before scoring impact; don't eyeball it.
- **Credential concentration is its own finding, not a sum of parts.** An asset holding two credential classes that each reach a different domain is worse than the two risks added together, because it collapses a boundary that was supposed to exist. Scenario writing should name concentration explicitly when `exposed` shows more than one compromise-tier class on one asset.
- **Don't let the register rot.** Every risk gets a `review_by` date at creation; the `review` command lists overdue ones. A register nobody reviews is worse than none — it manufactures false assurance.

## Examples

**Example 1: Sensitive data sweep**
```
User: "Which of our assets have sensitive data?"
→ SensitiveDataMap: census the asset graph, classify each data-bearing asset
→ Writes EstateDataMap.md to the private data dir
→ Returns the classified map + explicit unclassified list
```

**Example 2: Compromise scenario**
```
User: "What happens if our analytics worker gets popped?"
→ CompromiseScenario: blast radius via asset graph, data exposed, attacker next-steps,
  detection signals, response plan
→ Scenario doc to private data dir; risks added to register with scores
```

**Example 3: Risk review**
```
User: "Run a risk review"
→ RiskRegister: lists overdue + open risks by score, walks disposition
  (mitigate / accept / close), updates review dates
```
