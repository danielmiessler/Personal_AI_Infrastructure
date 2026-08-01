# RiskRegister Workflow

Operate the persistent risk register — add, list, update, review, close — via the deterministic CLI.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify -H "Content-Type: application/json" \
  -d '{"message": "Running RiskRegister in ThreatModel"}' > /dev/null 2>&1 &
```

Running **RiskRegister** in **ThreatModel**...

## The tool

The register is a deterministic CLI (no model judgment in the data path). Data dir defaults to `~/.claude/LIFEOS/USER/SECURITY/THREATMODEL/`, override `THREATMODEL_DATA_DIR`.

```bash
T="bun ~/.claude/skills/ThreatModel/Tools/RiskRegister.ts"
$T init                    # scaffold data dir + empty register
$T stats                   # posture snapshot
$T list                    # open risks, highest score first
$T review                  # risks overdue or missing a review date
$T show R-001
$T export                  # regenerate the RiskRegister.md view
```

## Intent-to-command mapping

| User says | Command |
|---|---|
| "add a risk", "log this risk" | `add --title … --threat … --likelihood N --impact N [--assets a,b --data-classes x,y --owner O --mitigation M --response REF --review-by DATE]` |
| "what are our risks", "show the register" | `list` (add `--all` to include closed, `--level Critical` to filter) |
| "run a risk review", "what's overdue" | `review` |
| "update / rescore R-001" | `update R-001 [--likelihood N --impact N --status S --add-mitigation M --owner O --review-by DATE]` |
| "accept R-001" | `update R-001 --status accepted --notes "accepted by <owner>: <rationale>"` |
| "close / retire R-001" | `close R-001 --reason "…"` |
| "posture snapshot", "how many criticals" | `stats` |

## Scoring reference

`score = likelihood(1-5) × impact(1-5)` → Low 1-4 · Medium 5-9 · High 10-14 · Critical 15-25. See CompromiseScenario for the impact/likelihood anchors.

## Constraints (safety gates)

- **The JSON store is the system of record.** `RiskRegister.md` is a generated view — never hand-edit it; the next write overwrites it. Change data only through the CLI.
- **No secret values.** Credential references by env-var name only.
- **Every risk gets a `review_by`.** A register nobody reviews manufactures false assurance; run `review` on a cadence and re-date what you touch.
- Accepting a risk is a decision, not a delete — `--status accepted` with a rationale in `--notes`, keep it visible.

## Review cadence

When running a review: pull `review`, walk each due risk (still valid? mitigated? accept?), update status and push `review_by` forward. Surface any Critical/High with no owner or no mitigation.

## Close

Report what changed (added/updated/closed IDs), the current Critical/High count from `stats`, and anything overdue that still needs a decision.
