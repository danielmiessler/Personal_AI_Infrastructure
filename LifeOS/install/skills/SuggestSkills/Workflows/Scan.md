# Scan — discover skill gaps from work history + frustration

Read-only. Proposes only. Never creates a skill (that is CreateSkill, after you approve).

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running Scan in SuggestSkills"}' \
  > /dev/null 2>&1 &
```

Running **Scan** in **SuggestSkills**...

## Step 0 — Sufficiency check

The corpus is the context. If the tool reports the ratings store missing, the frustration signal is unavailable for this run — say so in the report rather than presenting a topic-only result as complete. If the caller asked about a specific domain ("am I missing anything around deploys?"), scope the clustering to it and say you did.

## Step 1 — gather deterministically (tool, not prose)

```bash
bun ~/.claude/skills/SuggestSkills/Tools/CollectSignals.ts --days 45 > /tmp/skill-scan-corpus.json
```

### Intent-to-flag mapping

| User says | Flag | Effect |
|-----------|------|--------|
| (default), "recently", "lately" | `--days 45` | 45-day window |
| "this quarter", "last few months" | `--days 90` | wider window; expect a much longer session list |
| "all time", "everything" | `--days 3650` | full history (clamped at 3650) |
| "only the really bad ones" | `--max-rating 2` | tighten the frustration cut (default 4) |
| "scan another install / another tree" | `--root <dir>` | re-resolve every store under a different root |
| a store lives somewhere non-standard | `--ratings <file>` `--work <dir>` `--skills <dir>` `--loops <dir>` | override one store; a bad explicit path is reported, never silently defaulted |

Each store resolves via flag > env (`SKILLSCAN_MEMORY_ROOT`, `SKILLSCAN_RATINGS_FILE`, `SKILLSCAN_WORK_DIR`, `SKILLSCAN_SKILLS_DIR`, `SKILLSCAN_LOOPS_DIR`) > the first conventional default that exists under `--root` (`LIFEOS/MEMORY/...`, then a bare `MEMORY/...`). Loops are opt-in: there is no default, so pass `--loops` (or the env var) if this install keeps a loop catalog.

The corpus is `{ window, sessions[], frustrations[], registries[], warnings[], missing[], sources }`. Read `warnings`/`missing` first. Do not re-gather by hand; the tool is the single source of evidence so two runs judge the same corpus.

## Step 2 — cluster by pain

Group `sessions` + `frustrations` into recurring themes. For each theme carry two numbers: recurrence (how many sessions) and friction (how many low ratings / recurrence markers like "regressed again"). Frustration outweighs raw topic frequency.

## Step 3 — classify each cluster

- **BEHAVIOR-FEEDBACK** — verbosity, scope misreads, reminder cadence. Not a skill; route to memory/preferences. Exclude.
- **COVERED** — an existing skill/loop/workflow genuinely handles the *discipline*. Confirm by reading the covering unit's body, not its name; map the specific failure class to explicit guidance in it. If the body does not address the failure, it is not covered.
- **GAP** — recurs (severity-weighted; a high-severity repeated pain qualifies even below ~3) AND uncovered, INCLUDING a discipline gap under a topic a build/test skill nominally covers.

## Step 4 — verify with two independent passes, report the UNION

Spawn two agents that classify the clusters from the same corpus. Report every cluster either flags as GAP, tagged by agreement: `both` (high confidence) or `one` (needs review). Do NOT drop single-pass gaps — strict intersection hides the subtle discipline gaps this skill exists to surface.

## Step 5 — propose, never create

Emit a ranked shortlist. Each proposal: name, one-line description, and evidence (recurrence, friction, the specific recurring failure it would prevent). Redact secrets, client/project names, and personal paths from anything written to a review location. Accepted proposals go to `CreateSkill` as a separate, human-approved step. This workflow writes no skill.

## Output

```
## Skill-gap scan (last N days, M sessions; frustration store: present/absent)
### Gaps worth building
- <Name> [confidence: both|one] — <desc>. Evidence: N sessions, K frustration signals, recurring failure = "<...>". → CreateSkill?
### Covered (verified against bodies, no action)
- <theme> → <skill/loop/workflow>
### Behavior-feedback (route to memory, not a skill)
- <theme>
### Recommendation
<1-2 sentences; "nothing new" is valid ONLY when the frustration signals are also clean>
```
