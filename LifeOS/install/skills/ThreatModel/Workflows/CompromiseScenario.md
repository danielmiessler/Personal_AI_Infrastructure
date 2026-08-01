# CompromiseScenario Workflow

Answer "what happens if asset X gets hacked" with real blast-radius data, and land the resulting risks in the register.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify -H "Content-Type: application/json" \
  -d '{"message": "Running CompromiseScenario in ThreatModel"}' > /dev/null 2>&1 &
```

Running **CompromiseScenario** in **ThreatModel**...

## Step 0 — Sufficiency Check

Need one concrete asset (an Atlas key, an app, a domain, a worker). If none is given and it can't be inferred, ask which asset. Otherwise proceed.

## Ideal deliverable

A scenario doc `Scenarios/<asset-slug>.md` in the data dir that a responder could act on, containing:

1. **Asset & trust** — what it is, what data it holds (from SensitiveDataMap / classification), what it can REACH (credentials, service bindings, deploy keys — one hop of trust minimum).
2. **Blast radius** — what depends on it and what it owns, from the asset graph, treated as derived evidence.
3. **Compromise walk** — plausible entry, what the attacker reads/writes/pivots to, worst realistic outcome.
4. **Exposure** — concrete data classes exposed and roughly how many records/systems.
5. **Detection** — what signal would catch this (logs, scanner, anomaly), and whether that signal exists today.
6. **Response** — containment steps, credential rotation refs (point at the incident-response runbook, don't duplicate it), and recovery.
7. **Residual risk** — what stays exposed even after the planned response.

## Blast radius (asset graph)

```bash
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts blast   <key>  # inbound: what relies on X
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts owns    <key>  # outbound: what X owns / would orphan
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts exposed <key>  # credentials X would leak, compromise-tier first
```

Plus the data stores X can reach, which is the other half of trust inheritance:

```bash
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts sql "SELECT a.kind, a.canonical_key FROM edge e JOIN asset a ON a.id=e.dst WHERE e.kind='DEPENDS_ON' AND e.status='active' AND e.src=(SELECT id FROM asset WHERE canonical_key='<key>')"
```

`exposed` + the DEPENDS_ON query together make step 1's "one hop of trust" deterministic. Run both before scoring impact — a worker with no data of its own routinely inherits a 5 through its bindings.

**When `exposed` returns more than one compromise-tier class on a single asset, that concentration is its own finding.** Two credential classes reaching two different trust domains from one asset collapses a boundary; write it up as a distinct risk rather than folding it into the asset's main scenario score, because the mitigation is different (split the credentials, not rotate them).

**Graph output is derived evidence, not the authority.** For a high-stakes scenario, confirm the critical edges against the provider's authority API before treating the blast radius as complete. If Atlas is absent, build the radius from config/bindings inspection and say so. Name what the graph cannot see — vendor-only OAuth grants, SSH keys, browser sessions, password managers — as part of the scenario, not as an omission.

## Impact scoring (feeds the register)

Impact (1-5) is anchored to what the compromise EXPOSES plus what it REACHES, not to the asset's size:

- 5: credentials to many systems, customer data at scale, or financial/health PII
- 4: credentials to one data-bearing system, or a private data store
- 3: internal-only data, or write access to a public surface
- 2: limited internal exposure
- 1: public-only data, no pivot

Likelihood (1-5) from exposure: public URL, auth boundary strength, patch/credential hygiene, existing detection.

## Land the risks

For each real risk the scenario surfaces:

```bash
bun ~/.claude/skills/ThreatModel/Tools/RiskRegister.ts add \
  --title "<short risk>" --threat "<threat>" \
  --assets "<atlas-key>" --data-classes "<classes>" \
  --likelihood <1-5> --impact <1-5> \
  --response "Scenarios/<asset-slug>.md" --review-by <YYYY-MM-DD> \
  --mitigation "<control>"
```

## Constraints

- **Read-only.** Model the compromise; never execute an exploit, scan, or destructive action from a threat-model run. Offensive testing is a separate offensive-security skill.
- No secret values in the doc or register.
- Scenario docs and register entries write to the data dir only.

## Close

Summarize worst realistic outcome, the top exposed data classes, whether detection exists today, and the risks landed (IDs + scores). Flag any critical risk for immediate attention.
