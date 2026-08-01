# CheckCompleteness Workflow

Score an existing ISA against the substance-scaled completeness gate and return a structured pass/fail + gap report. (Effort tiers were retired 2026-07-11 — the bar is judged from the work's substance, not a declared label.)

## When to invoke

- Algorithm after scaffold: confirm the scaffolded ISA meets the gate for the work's substance.
- Algorithm before close: confirm the ISA is still complete after any structural changes.
- User directly: `Skill("ISA", "check completeness of <isa-path>")`
- Internal call from Scaffold or Interview workflows.

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| isa_path | yes | Path to the ISA to score |
| substance | no | The bar to score against (`trivial` / `substantial` / `deepest`); default judged from the ISA's Goal/Vision scope and blast radius |
| strict | no | Default true. If false, downgrade hard fails to soft warnings. |

## Output

```yaml
status: pass | fail
substance: substantial
required_sections:
  Problem: present
  Vision: present
  Out of Scope: missing
  Principles: present
  Constraints: present
  Dependencies: absent     # conditional — required only when cross-ISA links exist
  Goal: present
  Claims: present            # `## Claims` (v8) or legacy `## Criteria` — either satisfies
  Bridge Criteria: absent  # conditional — required only when cross-ISA links exist
  Test Strategy: present
  Features: present
  Decisions: present
  Learning: missing        # the C/R/L trail (formerly named Changelog)
  Verification: empty    # `## Verification` or `## Log`; acceptable until claims start closing
gaps:
  - section: Out of Scope
    severity: hard
    reason: required for substantial work, missing entirely
  - section: Learning
    severity: hard
    reason: required for deepest-grade work, missing entirely
isc_quality:
  total: 24
  coverage_gaps: 0             # Vision/Goal subsystems with no container criterion
  granularity_violations: 0
  anti_criteria_count: 2
  antecedent_present: true
  test_strategy_orphans: 0     # leaf ISCs with no Test Strategy row naming a probe
  id_stability_violations: 0
```

## Procedure

### Step 1 — Voice notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the CheckCompleteness workflow in the ISA skill"}' \
  > /dev/null 2>&1 &
```

### Step 2 — Read the ISA

Load `isa_path`. Parse frontmatter and section headers.

### Step 3 — Look up the gate for the work's substance

| Substance | Required Sections |
|-----------|-------------------|
| Trivial | Goal, Claims |
| Substantial | Problem, Vision, Out of Scope, Constraints, Goal, Claims, Test Strategy, Features |
| Deepest | All sixteen sections (empty sections never appear — Dependencies/Bridge Criteria only when cross-ISA links exist; Not yet specified only when the work has fog; Language only when a term has actually been confused) + Interview workflow ran before building |

Project ISA (`<project>/ISA.md`) — always score at substantial or above, regardless of how small the current task is.

### Step 4 — Classify each required section

For each required section:

| Classification | Test |
|----------------|------|
| `present` | Section header exists and body has content — length is not graded; a one-sentence section can be exactly right |
| `missing` | Section header doesn't exist |
| `empty` | Section header exists, body is whitespace only — only acceptable for `Verification`/`Log` before claims start closing |

### Step 5 — Audit ISC quality

Walk every claim in `## Claims` (or legacy `## Criteria`; short IDs `C1`/`A3` and `ISC-N` both count, and a dedicated `## Anti-claims` section counts toward the anti-claim check):

- **Granularity** — every ISC names a single binary tool probe (or has one inferable from its phrasing). Compound "and/with" criteria fail.
- **Coverage (v7.0.0 — replaces the deleted numeric count floors; fog-aware since v2.14.0)** — every subsystem named in Vision/Goal has a container criterion decomposed until each leaf is one binary tool probe; never split to hit a number. A subsystem with no container criterion is a coverage gap UNLESS it is held as fog in `## Not yet specified` and the ISA is not yet at `phase: complete`. Coverage is assessed at close: **at `phase: complete`, a non-empty `## Not yet specified` section is a HARD fail** — every fog entry must have graduated to an ISC or been killed via a Decisions row. Speculative ISCs written at scaffold to cover fog-shaped surface are themselves a quality failure (they have no honest probe).
- **Anti-claims (HARD fail on substantial+)** — at least one anti-claim exists (`Anti:` prefix inline, an `A`-prefixed short ID, or a `## Anti-claims` section entry). Empirically ignored in ~80% of pre-v7 ISAs because nothing enforced it; this check is the teeth.
- **Test Strategy coverage (HARD fail on substantial+)** — every leaf claim has a `## Test Strategy` row naming its probe. Orphan leaves fail (trivial minimal ISAs have no Test Strategy section, so exempt).
- **Antecedent** — when the goal is experiential, at least one ISC has the `Antecedent:` prefix.
- **ID stability** — every ISC has a unique sequential ID. No collisions, no gaps from renumbering. Tombstones (e.g., `ISC-7: [DROPPED — see Decisions 2026-04-15]`) are valid.
- **No changelog section (Algorithm v8.7.1 claim 12)** — the ISA must contain no *iter-by-iter narrative changelog*; `git log -- <isa-path>` is the change record. The C/R/L learning trail lives in `## Learning`. **Legacy alias (back-compat):** a section literally named `## Changelog` that holds the C/R/L trail is accepted as an alias for `## Learning` and satisfies the `## Learning` presence check — it is a SOFT warn only ("rename `## Changelog` → `## Learning` on next touch"), so pre-rename ISAs keep validating and migrate as they're edited. It is a HARD fail only if the section holds iter-by-iter narrative entries (a real changelog) rather than the C/R/L trail.
- **Evidence collapsed on close (Algorithm v8.7.1 claim 12)** — every `## Verification` entry for a closed (`[x]`) ISC is a one-line provenance stub (commit hash, test name, or probe ref), not a retained multi-line evidence paragraph. A Verification entry that carries a quoted paragraph instead of a stub is a soft fail (collapse it).
- **Anchoring (NEW v6.4.0)** — when frontmatter `principal_stated_goal:` is set, every ISC must have an `anchors_to` value in Test Strategy (either `literal` or `derived: <sub-claim>`). Orphan ISCs (no traceable anchor) are a hard failure.

### Step 5a — Goal-Signal Mismatch Check (NEW v6.4.0)

**Backwards-compat guard:** this check fires ONLY when the ISA frontmatter explicitly contains a `principal_stated_goal` key (any value, including empty string or `null`). ISAs scaffolded under Algorithm v6.3.0 and earlier — which never carry this key — are not subject to the check. The presence of the key is the v6.4.0+ marker.

If invoked post-scaffold or pre-close AND the ISA is v6.4.0+ scaffolded:

- If `principal_stated_goal_signal:` in the ISA frontmatter is set (the four-signal detector fired at scaffold) AND `principal_stated_goal:` is empty/null → hard failure: "literal capture missed — the detector fired but Scaffold did not preserve the literal." (Formerly checked the retired classifier's `GOAL_SIGNAL` line; now an ISA-internal consistency check between the recorded signal and the recorded literal. Ported from public PR #1525, @jbmml.)
- If `principal_stated_goal:` is set to a non-null string but the string is < 6 tokens or fails the minimum-content rule → hard failure: "literal violates minimum-content rule — should have been `null`."

### Step 5b — Artifact-Presence Check (NEW v6.4.0 — Cato 2026-05-11 lesson)

**Backwards-compat guard:** this check fires ONLY when the ISA frontmatter explicitly contains a `principal_stated_goal` key (any value). v6.3.0-era ISAs without the key are not subject to the check, preserving their existing close path.

On deepest-grade work AND v6.4.0+ scaffolded, for every claim marked `[x]` that claims a named design surface (e.g., "the proposal includes X", "the design names Y", "a table appears"), scan the ISA body for that surface textually:

- If the surface is asserted complete by an `[x]` but no textual evidence appears in the ISA body → hard failure: "ISC claims surface that does not exist in artifact (system-of-record violation)."
- The ISA artifact must contain its own design surface, not reference ephemeral chat context. The system-of-record identity (one of the five) requires this.

### Legacy frontmatter (v6.x ceremony keys) — inert, never graded

The v6.5.0–v6.7.0 density/divergence/acknowledgment frontmatter keys were deleted in Algorithm v7.0.0 — they checked whether ceremony was recorded, not ISA quality. Hundreds of archived ISAs still carry them: their presence is **never** a failure, their values are **never** validated. Do not invert the deleted checks. The only ambiguity-check keys graded on v7.0.0+ ISAs are `context_sufficient` and `interview_invoked`. The same inert rule applies to the retired `effort:` / `effort_source:` / `mode:` keys (tiers/modes retirement, 2026-07-11): presence is never a failure, values are never validated, and they are never written on new ISAs.

### Step 6 — Compose the report

Emit the structured YAML output above. Set `status: pass` only when zero hard severity gaps. `strict: false` downgrades hard severity to warnings (used during interview when the user is mid-stream).

### Step 7 — Block phase: complete on hard gaps

When invoked pre-close, hard gaps block the `phase: complete` transition. The Algorithm must fill the gaps before declaring done.

## Severity table

| Gap | Trivial | Substantial | Deepest |
|-----|---------|-------------|---------|
| Goal missing | hard | hard | hard |
| Claims missing | hard | hard | hard |
| Problem missing | — | hard | hard |
| Test Strategy missing | — | hard | hard |
| Vision missing | — | hard | hard |
| Out of Scope missing | — | hard | hard |
| Constraints missing | — | hard | hard |
| Features missing | — | hard | hard |
| Principles missing | — | — | hard |
| Decisions missing | — | — | hard |
| Learning missing (the C/R/L trail, formerly named Changelog) | — | — | hard |
| `## Changelog` section present (git is the changelog — convert to `## Learning`) | hard | hard | hard |
| Verification entry retains an evidence paragraph instead of a one-line stub | soft | soft | soft |
| Interview not run before building | — | — | hard |
| Anti-claim count = 0 (≥1 required) | soft | hard | hard |
| Leaf claim without a Test Strategy row naming its probe | — | hard | hard |
| Antecedent missing (experiential) | hard | hard | hard |
| ID-stability violation | hard | hard | hard |
| Coverage gap (Vision/Goal subsystem with no container claim) | — | hard | hard |
| Non-empty `## Not yet specified` at `phase: complete` | hard | hard | hard |
| Granularity violation | hard | hard | hard |
| Anchoring violation (orphan claim, v6.4.0+ ISAs only) | hard | hard | hard |
| Goal-signal mismatch (recorded signal vs recorded literal, v6.4.0+ ISAs only) | hard | hard | hard |
| Artifact-presence violation (v6.4.0+ ISAs only) | — | — | hard |
| `context_sufficient` missing (v7.0.0+ scaffolds only; ISAs carrying legacy v6.x ceremony keys predate v7 and are exempt; trivial inline ISAs exempt) | — | hard | hard |

## Failure modes

- **Frontmatter missing or malformed:** abort with explicit error. `phase:` and `progress:` are non-negotiable; `slug`/`task` may be derived (directory name / H1).
- **Project ISA scored at trivial:** override to substantial. Report the override in the output.
- **Claim-body parsing fails:** treat as zero claims and surface the parse error.
