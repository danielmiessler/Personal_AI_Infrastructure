---
name: SuggestSkills
version: 1.0.0
description: "Discover WHICH new skills you should create, from your own work history plus your satisfaction/frustration signals. Read-only and proposal-only: it surfaces recurring pain that no existing skill, loop, or workflow covers, then hands you a ranked shortlist to build with CreateSkill. It never creates or edits a skill itself. Frustration is a first-class signal (a topic can look 'covered' while you keep hitting the same wall inside it), so it reads low ratings and recurrence markers, not just session topics. USE WHEN should I create a skill, what skills do I need, suggest skills, skill gap, based on my recent work, am I missing a skill, what should I build. NOT FOR creating/validating/testing/optimizing an individual skill (use CreateSkill) — this only decides WHAT to build, not how."
---

# SuggestSkills — what should I build next?

A read-only analytics pass over your own work. It answers one question: given what you have actually been doing and where you have been frustrated, is there a recurring problem that deserves its own skill and does not have one yet? It proposes; you decide; `CreateSkill` builds. It has no capability to create or edit a skill, by design.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/SuggestSkills/`

If this directory exists, load and apply any PREFERENCES.md found there (default window, store paths, review location). If not, proceed with defaults.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running WORKFLOWNAME in SuggestSkills"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running **WorkflowName** in **SuggestSkills**...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Scan** | "what skills should I build", "skill gap", "suggest skills", "am I missing a skill" | `Workflows/Scan.md` |

In short, Scan is:

1. **Gather deterministically.** Run `Tools/CollectSignals.ts` to emit a normalized corpus (recent sessions, low-rating frustrations with sentiment, and the skill/loop/workflow registry for dedup, plus warnings for any missing or malformed store). The LLM does not gather; it only judges what the tool returns, so two runs see the same evidence.
2. **Cluster by pain.** Group the corpus into recurring themes, carrying both how often each recurs AND how much frustration it drew.
3. **Dedup against real coverage.** For each candidate, read the bodies of the skills/loops/workflows that might cover it. Name-match is not coverage; the covering unit must actually address the failure class.
4. **Verify with two independent passes, report the UNION.** Do not require both passes to agree before surfacing a gap (strict intersection suppresses exactly the subtle discipline gaps this exists to find). Report every gap either pass flags, tagged with its agreement level (both = high confidence, one = needs review).
5. **Propose, never create.** Emit a ranked shortlist with evidence (session count, frustration count, the specific recurring failure). Route accepted proposals to `CreateSkill`. Redact secrets, client names, and personal paths from anything written out.

## Why it is separate from CreateSkill

Discovery is read-only; creation mutates. Keeping the two apart is the permission boundary that makes "never auto-create" real rather than a promise in prose: this skill cannot write a skill even if asked.

## The two blind spots it exists to defeat

1. **Frustration is invisible to topic-matching.** A topic can be nominally covered by a build/test skill while you keep hitting the same wall inside it. Low ratings and "regressed again" recurrence are the strongest signal a skill is missing. Weight them above raw topic frequency.
2. **Discipline gaps hide under covered topics.** "App development" maps to a build skill, but the recurring pain may be an unowned discipline (state modeling, error handling, migration safety) that the build skill never addresses. Coverage means the discipline is genuinely handled, not that the topic shares a keyword.

## Examples

**Example 1: routine gap scan**
```
User: "What skills should I build based on my recent work?"
→ Invokes Scan workflow
→ Runs Tools/CollectSignals.ts over the last 45 days
→ Clusters sessions + low ratings, dedups against existing skills/workflows
→ Returns a ranked shortlist with evidence per proposal; nothing is created
```

**Example 2: frustration-led scan**
```
User: "I keep hitting the same wall — am I missing a skill?"
→ Invokes Scan workflow with the frustration store as the lead signal
→ Surfaces discipline gaps hiding under topics that look covered
→ User accepts one proposal → handed to CreateSkill as a separate step
```

## Gotchas

- **A clean topic-coverage result with dirty frustration signals is a FALSE negative.** If the ratings show recurring frustration in an area you marked covered, re-open it — the discipline under that topic is the gap. (This is the exact failure this skill was built to fix.)
- **Recurrence is severity-weighted, not a bare count.** Three trivial sessions matter less than one long, painful, repeated migration. A high-severity pain that recurs across a few sessions qualifies even below an arbitrary threshold.
- **Behavior is not a skill.** "Too verbose", "misread scope", "repeated a reminder" are steering/feedback, not skill gaps. Separate them out and route them to memory/preferences, not to CreateSkill.
- **Gathering is deterministic on purpose.** If you find yourself grepping stores by hand in the workflow, use the tool instead — hand-gathering makes runs non-reproducible and the eval meaningless.
- **Paths are discovered, not assumed.** The tool resolves stores via flags/env/root, so it works across installs; do not hardcode a home directory.
- **A large work store makes the session list long, not the analysis better.** The default 45-day window is the lever — widen it deliberately, and expect the cluster step to carry the cost.
