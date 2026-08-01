---
name: Upgrade
version: 1.1.18
description: "Improve LifeOS from what the best practitioners are shipping around AI harnesses — Anthropic first (changelogs, docs, releases), then trusted creators, trending repos, and the system's own reflections — extracting concrete techniques and filtering them against verified current state so nothing already-done or rejected is re-recommended. USE WHEN upgrade, system upgrade, check Anthropic, new Claude features, algorithm upgrade, LifeOS upgrade, mine reflections."
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Upgrade/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification:**
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the Upgrade skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```
2. **Output text notification:**
   ```
   Running the **WorkflowName** workflow in the **Upgrade** skill to ACTION...
   ```

# Upgrade

**The ideal state:** the system knows what the best people on the internet are saying, doing, and implementing around AI harnesses — Anthropic most importantly — and its configuration improves from that input. A run is done when every worthwhile new technique from the monitored sources has been extracted (quoted, mapped to a specific LifeOS file or component), every candidate has been checked against what the system already has or already decided, and the result reaches the user as tiered, evidence-backed recommendations they can act on immediately.

Signal comes from two directions, and a good run uses both: **external** (what Anthropic and the best practitioners are shipping) and **internal** (what the system's own reflections and failure history say is weak). The most valuable recommendations are usually where the two agree.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Upgrade** | "check for upgrades", "check sources", "any updates", "check Anthropic", "check YouTube", "upgrade", "pai upgrade" | `Workflows/Upgrade.md` |
| **MineReflections** | "mine reflections", "check reflections", "what have we learned", "internal improvements", "reflection insights" | `Workflows/MineReflections.md` |
| **AlgorithmUpgrade** | "algorithm upgrade", "upgrade algorithm", "improve the algorithm", "algorithm improvements", "fix the algorithm" | `Workflows/AlgorithmUpgrade.md` |
| **ResearchUpgrade** | "research this upgrade", "deep dive on [feature]", "further research" | `Workflows/ResearchUpgrade.md` |
| **FindSources** | "find upgrade sources", "find new sources", "discover channels" | `Workflows/FindSources.md` |
| **TwitterBookmarks** | "check bookmarks", "scan bookmarks", "twitter bookmarks", "X bookmarks", "bookmarks for upgrades", "what have I bookmarked" | `Workflows/TwitterBookmarks.md` |

**Default workflow:** a bare "upgrade" or "check for upgrades" runs **Upgrade** (which includes reflection mining).

## The Contract (what every recommendation must satisfy)

1. **Grounded in current state.** No recommendation without a Prior Status tag (🆕/🔶/💬/🚫) backed by file:line evidence gathered *this run*. Already-implemented items go to Skipped Content with evidence — that's the proof the prior-state check ran. Rejected ideas (`MEMORY/KNOWLEDGE/REJECTED/`) only resurface with a named reason the context changed.
2. **A technique, not a pointer.** Quote or code-block the actual content; name the exact LifeOS file or component it improves; include What It Is and How It Helps LifeOS (≤2 concrete sentences each). The test: if "show me the technique" has no answer, it doesn't ship. Content with nothing extractable goes to Skipped with a reason — skip boldly rather than dilute.
3. **Won't break what exists.** Check backward compatibility against current skills, hooks, and workflows before recommending adoption.
4. **Formatted per the contract.** `References/OutputFormat.md` is the single source of truth for section order, Prior Status legend, table columns, and hard rules.

## Sources & Tools

| Surface | Contract |
|---------|----------|
| Anthropic (30+ sources: blog, changelogs, GitHub repos, docs) | `bun Tools/Anthropic.ts` — diffs against `State/last-check.json`, updates it itself |
| YouTube channels | Config: `youtube-channels.json` (base) + user copy in CUSTOMIZATIONS. List: `yt-dlp --flat-playlist --dump-json 'https://www.youtube.com/@HANDLE/videos'`. Transcript: `bun ~/.claude/LIFEOS/TOOLS/GetTranscript.ts '<url>'`. Seen-state: `State/youtube-videos.json` — update after processing |
| GitHub trending | Config: `github_trending` block in user `user-sources.json`. `gh api 'search/repositories?q=QUERY+created:>DATE+stars:>N&sort=...&per_page=3'`. Seen-state: `State/github-trending.json` — merge, never drop entries |
| Custom sources | `user-sources.json` in CUSTOMIZATIONS — fetch each; skip dead/redirected pages with a note |
| Claude Code internals | When discoveries touch hooks, settings, slash commands, MCP, agent types, or the SDK/API, spawn `Agent(subagent_type="claude-code-guide")` to verify against the live surface — never answer from memory |
| Internal reflections | `MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl` — method in `Workflows/MineReflections.md` |

**Source labels in output:** `GitHub: claude-code vX.Y.Z` · `YouTube: Creator @ MM:SS` · `Docs: Section` · `Blog: Title`.

## Gotchas

- **Hard deadline, fail-open — never block on a straggler.** Set a synthesis deadline (~4 min) at dispatch; report with whatever is back when it hits. A missing source is listed as `⏳ timed out` in Sources Processed; it degrades coverage, never delays the report. (2026-07-18: one hung GitHub-trending agent stalled a run ~1 hour.)
- **Right-size the fan-out (~8 agents).** Small-file reads collapse into one agent; network sources get short budgets and are first to drop. Over-fan-out is the failure the reflection corpus flags most.
- **Budget the `claude-code-guide` freshness spawn per-spawn — it dies on a broad ask.** Asking one spawn to cover the whole Claude Code surface (hook events, `settings.json`, slash commands, SKILL/subagent frontmatter, MCP, SDK, API) returns nothing: it fans out a batch of doc lookups on its first turn and the combined results blow its context window, surfacing as `Prompt is too long` ~10s after spawn. The prompt length is not the cause — a trivial prompt to the same agent type in a larger parent conversation completes fine; how much the ask makes it FETCH is the variable. Cap at ~3 areas per spawn, tell it to look things up rather than pull whole pages, and split the surface across parallel spawns so losing one costs a slice instead of the whole freshness check. Diagnostic tell: sibling agents in the same batch all succeed while this one dies — that points at the spawn's context budget, not the batch. Fallback that needs no agent at all: read `Claude Code CHANGELOG` from `sources.json` directly and diff the version range. *(public PR #1659, @elhoim.)*
- **Idle teammate ≠ delivered result.** Spawned agents sometimes go idle without sending output — a one-line SendMessage nudge recovers them. Nudge once; don't re-spawn.
- **GitHub search 422s on bare OR between qualifiers** with no free-text term. Give every query a free-text term; don't retry a 422 inside the budget.
- **Absence from `settings.json` ≠ a dead hook.** It's GENERATED by MergeSettings; hooks also fire via dispatchers (PreToolGuard) and Pulse HTTP. Flag "verify before concluding dark," never assert dead from absence.
- **Check sources in parallel, not sequentially** — the run is network-bound.

## Execution Log

After completing any workflow, append a single JSONL entry:

```bash
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","skill":"Upgrade","workflow":"WORKFLOW_USED","input":"8_WORD_SUMMARY","status":"ok|error","duration_s":SECONDS}' >> ~/.claude/LIFEOS/MEMORY/SKILLS/execution.jsonl
```

Replace `WORKFLOW_USED` with the workflow executed, `8_WORD_SUMMARY` with a brief input description, and `SECONDS` with approximate wall-clock time. Log `status: "error"` if the workflow failed.
