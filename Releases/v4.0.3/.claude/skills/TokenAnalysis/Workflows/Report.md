# TokenAnalysis — Report Workflow

Runs the RoutingStats tool and presents token consumption data with interpretation.

## Steps

### 1. Run RoutingStats

```bash
bun ~/.claude/PAI/Tools/RoutingStats.ts
```

### 2. Handle "No Data Yet"

If the output contains "No data yet" or the metrics file is empty/missing:

> **No token metrics recorded yet.**
>
> Metrics accumulate automatically after each prompt — the ComplexityRouter logs
> every routing decision to `~/.claude/MEMORY/STATE/routing-metrics.jsonl`.
>
> Run a few prompts and return here to see your consumption dashboard.

### 3. Display Output

Show the RoutingStats output verbatim, then append a **SoushAI Insight** block:

---

**SoushAI Insight:**

**If adherence < 60%:**
> The router is classifying prompts correctly but hints aren't being followed —
> the algorithm needs to actually spawn `Task(model="haiku")` for Haiku-tier
> prompts. The savings are potential; adherence turns them into reality.

**If adherence ≥ 60% and estimated savings > 0%:**
> Routing is working: Haiku and Sonnet tiers are holding, driving real cost
> reduction. The highest-volume tier is your biggest savings lever. Cache reads
> are now included in the cost calculation — prior "savings" figures were
> understated.

**If Opus avg input tokens are low (< 1000):**
> Opus top-level tokens being low doesn't mean Opus routing is cheap. When the
> Algorithm spawns agents at Opus tier, those tokens live in sub-agent transcripts
> and are invisible to the parent session. Sub-agent overhead is the real Opus
> cost story.

**If estimated savings ≤ 0% (or Opus usage is high):**
> Opus routing is expensive — $15/$75/M vs Sonnet's $3/$15/M. Even small Opus
> percentages can outweigh Haiku savings. Check whether Opus is routing correctly
> (only for genuinely complex, multi-hour tasks) or overrouting on simpler work.

**Always append:**
> Real organic data accumulates automatically from your next session onward.
> The ComplexityRouter classifies every incoming prompt — no manual tracking needed.
