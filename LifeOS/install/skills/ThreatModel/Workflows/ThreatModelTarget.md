# ThreatModelTarget Workflow

Threat model one target — an app, a service, a data flow, or the whole estate — end to end.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify -H "Content-Type: application/json" \
  -d '{"message": "Running ThreatModelTarget in ThreatModel"}' > /dev/null 2>&1 &
```

Running **ThreatModelTarget** in **ThreatModel**...

## Step 0 — Sufficiency Check

Need the target and its trust boundary. If the target is broad ("the whole estate"), that's valid — the model becomes a portfolio pass over the top data-bearing assets. Ambiguity that changes scope → one flag, then proceed.

## Ideal deliverable

A threat model for the target covering: **what it is and its trust boundaries → what data crosses those boundaries → who would attack it and why → the realistic threats (STRIDE is a fine checklist: spoofing, tampering, repudiation, info-disclosure, DoS, elevation) → existing controls → gaps → prioritized risks in the register.** Written to the data dir; risks landed with scores.

This workflow composes the other two: use **SensitiveDataMap** to establish what data the target holds, and **CompromiseScenario** for each high-value component. ThreatModelTarget is the wrapper that ties data + scenarios + controls into one prioritized picture.

## Method (WHAT, not rote steps)

- Draw the boundary: what's inside the target, what it trusts, what trusts it (asset graph edges).
- Enumerate threats against each boundary crossing and each data store. STRIDE per element keeps it honest; the `Fabric` skill's `create_threat_model` / STRIDE patterns are available if a structured pass helps.
- For each credible threat, decide: existing control adequate, needs mitigation, or accept. Adequate → note it. Otherwise → a register entry with likelihood×impact.
- Rank by score. Critical/High get a named owner and a `review_by`.

## Constraints

- Read-only analysis. No exploitation, no scanning, no destructive action.
- No secret values anywhere. Credential references by name only.
- All artifacts to the data dir (`THREATMODEL_DATA_DIR`).
- Don't invent inventory — if the asset graph is absent, state that coverage is user-enumerated.

## Close

Report the target's trust boundaries, the top threats by score, which are covered vs open, and the register IDs created. Point to the scenario docs for the deep dives.
