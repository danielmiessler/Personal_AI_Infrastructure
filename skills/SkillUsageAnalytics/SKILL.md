---
name: SkillUsageAnalytics
description: Analyze skill usage patterns and generate recommendations. USE WHEN reviewing methodology effectiveness or wanting suggestions for underutilized skills.
tier: deferred
---

# SkillUsageAnalytics

## Overview

Track and analyze which skills are being used, identify patterns, and suggest underutilized skills.

## Tools

| Tool | Purpose |
|------|---------|
| `GenerateSummary.ts` | Generate usage summary report |

## CLI Usage

```bash
# Weekly summary (default)
bun run $PAI_DIR/skills/SkillUsageAnalytics/Tools/GenerateSummary.ts --period weekly

# Monthly summary
bun run $PAI_DIR/skills/SkillUsageAnalytics/Tools/GenerateSummary.ts --period monthly

# Since specific date
bun run $PAI_DIR/skills/SkillUsageAnalytics/Tools/GenerateSummary.ts --since 2026-01-01
```

## Data Source

Reads from `$PAI_DIR/history/skills-used.jsonl`, which is populated by the `log-skill-usage.ts` PostToolUse hook.

## Report Contents

- Most used skills (top 10)
- Underutilized skills (skills in index but rarely used)
- Summary statistics (total invocations, unique skills, available skills)
