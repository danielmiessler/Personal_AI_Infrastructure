# Upgrade Workflow

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Upgrade workflow in the Upgrade skill to check for upgrades"}' \
  > /dev/null 2>&1 &
```

Running the **Upgrade** workflow in the **Upgrade** skill to check for upgrades...

**Trigger:** "check for upgrades", "upgrade", "any updates", "check Anthropic", "check YouTube", "pai upgrade"

---

## Ideal State of a Completed Run

The user is reading a report (shaped exactly by `../References/OutputFormat.md`) in which:

- **Every worthwhile new technique** from the monitored sources — Anthropic first, then creators, trending repos, and custom sources — is extracted with a quote or code block and mapped to the specific LifeOS file or component it would improve. What the best practitioners are actually doing, not links to where they said it.
- **Every recommendation is grounded**: it carries a Prior Status tag with file:line evidence gathered this run, so nothing already implemented, already deferred by decision, or already rejected is re-recommended. Already-done items appear in Skipped Content with evidence — the visible proof the prior-state check happened.
- **Internal signal is present**: the reflection corpus has been mined (method: `MineReflections.md`), and where internal pain and external technique point at the same gap, the report says so — those are the strongest recommendations.
- **Recommendations are tiered by judgment**, not formula: 🔴 CRITICAL (a gap or breakage-risk the system should not be running with), 🟠 HIGH (clear capability or efficiency win), 🟡 MEDIUM (worthwhile when convenient), 🟢 LOW (awareness). Only non-empty tiers print.
- **Coverage is honest**: Sources Processed lists what was checked, what was skipped and why, and any source that timed out.
- **State is current**: seen-lists updated (`State/youtube-videos.json`, `State/github-trending.json`; `Anthropic.ts` owns `State/last-check.json`), and the execution log has the run's entry.

To ground Prior Status tags, the run needs verified current state before synthesis — what the Algorithm, hooks, skills, and tools already do; what recent ISAs decided; what `MEMORY/KNOWLEDGE/REJECTED/` forbids; what `MEMORY/LEARNING/` corrections require. Where that state lives: `LIFEOS/ALGORITHM/LATEST` → the versioned spec, `hooks/`, `skills/*/SKILL.md`, `LIFEOS/TOOLS/`, `settings.json` (generated — see gotchas), recent `MEMORY/WORK/` ISAs. The user's goals and stack (`USER/TELOS/`, `USER/PROJECTS.md`, recent work) rank findings: on-stack beats off-stack, and a recommendation that serves a stated goal or challenge beats one that's merely clever.

## Constraints

- **Deadline is a ceiling:** ~4 minutes from dispatch to synthesis, fail-open. Whatever isn't back gets `⏳ timed out` in Sources Processed. Never re-fire a slow agent; nudge an idle one once.
- **Fan-out ~8 agents.** Delegates get explicit models per the operative model-selection rules. GitHub trending is inspiration-only — shortest budget, first to drop.
- **Claude Code internals get verified, not recalled:** anything touching hooks, settings, slash commands, MCP, agent types, or the SDK/API goes through `Agent(subagent_type="claude-code-guide")` against the live surface.
- **Recommendations must not break existing skills, hooks, or workflows** — check compatibility before recommending adoption.

## Tool Contracts

See `SKILL.md` § Sources & Tools for the full table (Anthropic.ts, yt-dlp, GetTranscript.ts, gh api syntax, state files, customization configs). All gotchas in `SKILL.md` § Gotchas apply — the fail-open deadline and the GitHub 422 rule exist because runs have died without them.

## Persist to the Upgrades Store (mandatory)

Recommendations are no longer ephemeral. Before delivering the report, write every 🔴/🟠/🟡 recommendation as one record in the Upgrades store:

```bash
bun ~/.claude/LIFEOS/TOOLS/Upgrades.ts add --source upgrade-skill \
  --claim "<one-sentence recommendation>" \
  --current "<what the system does today>" \
  --recommendation "<the proposed encoding>" \
  --target "<hook|doctrine|rule|skill|settings>" \
  --confidence <0-1> --evidence "<source URL or report ref>"
```

The store dedups by claim hash — re-running a scan never double-writes. Prior-Status grounding gains a source: check `bun ~/.claude/LIFEOS/TOOLS/Upgrades.ts list --json` for already-rejected (🚫) or already-applied (💬) claims alongside the existing `MEMORY/KNOWLEDGE/REJECTED/` check. Records surface in Pulse `/upgrades`; the applied half lands in the Ledger via `CreateUpdate.ts --upgrade-id`.

## Registry Feedback

If a CRITICAL/HIGH discovery is a stable, distinct, invokable capability the Algorithm should know exists, propose the integration (Algorithm capabilities row, SKILL.md description update, or a new skill via CreateSkill) in a short `## 🔄 Registry Update Proposals` section; otherwise state "No registry updates needed this cycle."

## Quick Mode

"Check Anthropic only" (or similar single-source asks): run just that source's collection against current-state grounding, abbreviated report, same contract — every recommendation still carries Prior Status with evidence.

---

**Reference example of the canonical output shape:** `../References/ExampleReport.md`.
