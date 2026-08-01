# SensitiveDataMap Workflow

Produce a classified map of which assets in the estate hold sensitive data, written to the private data dir.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify -H "Content-Type: application/json" \
  -d '{"message": "Running SensitiveDataMap in ThreatModel"}' > /dev/null 2>&1 &
```

Running **SensitiveDataMap** in **ThreatModel**...

## Step 0 — Sufficiency Check

If the estate scope is unclear (whole estate vs one app vs one provider) and the choice changes the output, emit one ambiguity flag and proceed with "whole estate via the asset graph." `proceed` accepts.

## Ideal deliverable

An `EstateDataMap.md` in the data dir where **every data-bearing asset is tagged with the data classes it holds and why**, and **every unclassified asset is listed explicitly as unclassified — never omitted, never assumed clean.** (Named `EstateDataMap`, not `DataClassification`: `DOCUMENTATION/Security/DataClassification.md` is a different document that two enforcement hooks load, and the collision made both undiscoverable.) The map is the input to scoring impact in scenarios and the register.

Data classes (extend per `PREFERENCES.md`): `credentials` · `pii` · `financial` · `health` · `customer-data` · `source-private` · `internal-only` · `public`.

## Inputs (current-state authority)

Prefer the asset graph if present:

```bash
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts sql "SELECT kind, key, attrs FROM asset WHERE kind IN ('worker','domain','d1','r2','kv','repo','project')"
bun ~/.claude/LIFEOS/ATLAS/Atlas.ts sql "SELECT key FROM asset WHERE kind IN ('d1','r2','kv')"   # data stores first
```

Without a graph: enumerate from what the user names plus repo/config inspection, and state in the output that coverage is user-enumerated, not graph-complete.

## Constraints

- **No secret values** in the output — reference credential stores by name/key only.
- **Unclassified is a category, not a gap.** An asset you can't classify from evidence is `unclassified`, surfaced for follow-up.
- Data stores (databases, buckets, KV) and anything holding credentials are classified FIRST — they anchor impact scoring.
- Write only to the data dir (`THREATMODEL_DATA_DIR`, default `~/.claude/LIFEOS/USER/SECURITY/THREATMODEL/`). Never into the skill tree.

## Close

Report the count by data class, the highest-sensitivity assets, and the unclassified list. Offer to open CompromiseScenario on the top data-bearing assets, and to land standing risks in the register.
