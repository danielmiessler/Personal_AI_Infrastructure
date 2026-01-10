---
name: DeepResearch
description: Parallel research with breadth and depth lenses. USE WHEN deep research OR research from multiple angles OR comprehensive investigation OR thorough analysis OR parallel research.
---

# DeepResearch

Spawns parallel research agents with different analytical lenses, then synthesizes findings into a unified report.

## How It Works

1. **Breadth Agent** surveys the landscape - finds all relevant approaches, lists options
2. **Depth Agent** deep dives on promising areas - analyzes tradeoffs, extracts details
3. **Synthesizer** merges findings into unified report with recommendations

All research outputs are captured to `history/research/YYYY-MM/` via existing hooks.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **ParallelResearch** | "deep research on..." OR "research from multiple angles" | `Workflows/ParallelResearch.md` |

## CLI Tools

```bash
# Manually aggregate research from last hour
bun run $PAI_DIR/skills/DeepResearch/Tools/Aggregate.ts --since "1h"

# Aggregate to file
bun run $PAI_DIR/skills/DeepResearch/Tools/Aggregate.ts --since "30m" --output report.md
```

## Examples

**Example 1: Deep research request**
```
User: "Do deep research on how CLI tools handle plugin systems"
-> Spawns breadth + depth agents in parallel
-> Breadth surveys: npm plugins, Go plugins, Lua scripts, etc.
-> Depth analyzes: top 2-3 approaches in detail
-> Synthesizer merges into unified report
```

**Example 2: Comprehensive investigation**
```
User: "I need a thorough analysis of state management options for React"
-> Breadth: Redux, Zustand, Jotai, Context, MobX, Recoil, etc.
-> Depth: Tradeoffs of top contenders, migration paths, bundle sizes
-> Synthesizer: Recommendation matrix + decision guide
```

**Example 3: Re-aggregate previous research**
```
User: "Aggregate the research from the last 2 hours"
-> bun run Aggregate.ts --since "2h"
-> Outputs merged markdown report
```

## Related Skills

- **Brainstorming** - May call DeepResearch during design exploration phase
- **SystematicDebugging** - May use DeepResearch for investigating root causes
- **DispatchingParallelAgents** - DeepResearch uses parallel agents internally
