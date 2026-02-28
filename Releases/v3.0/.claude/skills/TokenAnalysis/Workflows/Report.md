# TokenAnalysis — Report Workflow

Runs the RoutingStats tool and presents token consumption data with interpretation.

## Steps

### 1. Run RoutingStats

```bash
bun ~/.claude/skills/PAI/Tools/RoutingStats.ts
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

**If estimated savings > 0%:**
> Haiku and Sonnet routing is driving real cost reduction. The highest-volume tier
> is your biggest savings lever — if Haiku handles most simple prompts, you're
> paying ~$0.25/$1.25/M instead of $3/$15/M for Sonnet.

**If estimated savings ≤ 0% (or Opus usage is high):**
> Opus routing is expensive — $15/$75/M vs Sonnet's $3/$15/M. Even small Opus
> percentages can outweigh Haiku savings. Check whether Opus is routing correctly
> (only for genuinely complex, multi-hour tasks) or overrouting on simpler work.

**Always append:**
> Real organic data accumulates automatically from your next session onward.
> The ComplexityRouter classifies every incoming prompt — no manual tracking needed.
