# GetCurrentState Workflow

**Skill:** AUMetrics
**Purpose:** Produce a comprehensive analysis of current Australian economic conditions

## Overview

This workflow reads from the Substrate AU-Common-Metrics dataset (populated by UpdateData) and generates a structured analysis document covering all 10 metric categories with multi-timeframe trend analysis, cross-metric correlations, and research recommendations.

## Prerequisites

Run UpdateData first to ensure current data:
```bash
bun ~/.claude/skills/AUMetrics/Tools/UpdateSubstrateMetrics.ts
```

## Execution Steps

### Step 1: Initialize

Output the workflow status message:
```
Running **GetCurrentState** in **AUMetrics**...
```

### Step 2: Load Substrate Data

Read these files:
- `${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/AU-Common-Metrics.md` — primary analysis source
- `${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/au-metrics-historical.csv` — for trend calculations

### Step 3: Calculate Trends

For each metric in the dataset, calculate:
- **1-year trend**: Current vs 12 months ago (direction + magnitude)
- **2-year trend**: Current vs 24 months ago
- **5-year trend**: Current vs 60 months ago
- **10-year trend**: Current vs 120 months ago (if data available)

Express as: `↑ +2.3% (1Y)`, `↓ -0.8% (2Y)`, `→ flat (5Y)`

### Step 4: Cross-Metric Analysis

Analyse relationships between categories:
- **Inflation ↔ Labour**: Is tight labour market driving wage growth driving CPI?
- **Housing ↔ RBA Rate**: How has the cash rate cycle impacted residential property prices?
- **Trade ↔ AUD**: What is the relationship between trade balance and currency?
- **GDP ↔ Employment**: Is growth translating to employment gains?
- **Energy ↔ Inflation**: Are energy prices contributing to broader CPI?

### Step 5: Pattern Detection

Look for:
- **Regime changes**: Metrics breaking historical ranges
- **Divergences**: Categories moving in unexpected opposing directions
- **Leading/lagging relationships**: Which metrics are predictive of others?
- **Cyclical position**: Where is Australia in the economic cycle?
- **RBA policy impact**: How is monetary policy transmitting through the economy?

### Step 6: Generate Report

Produce the structured output (see Output Format below).

## Output Format

```markdown
# Australian Economic State Analysis
**Generated:** {ISO timestamp}
**Data Sources:** ABS, RBA, Treasury
**Coverage:** {N} metrics across 10 categories

---

## Executive Summary

- [Key finding 1 — most significant economic development]
- [Key finding 2 — inflation/employment headline]
- [Key finding 3 — housing/financial conditions]
- [Key finding 4 — external sector / trade]
- [Key finding 5 — forward-looking or policy note]

---

## Trend Analysis by Category

### 1. Economic Output & Growth

| Metric | Current | 1Y | 2Y | 5Y | Source |
|--------|---------|----|----|----|----|
| Real GDP | $2,671B | ↑ +1.2% | ↑ +4.1% | ↑ +12.3% | ABS |
| GDP Growth Rate (QoQ) | 0.3% | ... | ... | ... | ABS |
| ... | | | | | |

**Analysis:** [2-4 sentence narrative on output trends]

### 2. Inflation & Prices
[Same table format + analysis]

### 3. Employment & Labour
[Same table format + analysis]

### 4. Housing
[Same table format + analysis]

### 5. Consumer & Finance
[Same table format + analysis]

### 6. Financial Markets & Monetary Policy
[Same table format + analysis — include RBA policy context]

### 7. Trade & International
[Same table format + analysis]

### 8. Government & Fiscal
[Same table format + analysis]

### 9. Demographics & Social
[Same table format + analysis]

### 10. Energy & Resources
[Same table format + analysis]

---

## Cross-Metric Analysis

### Inflation-Labour Market Nexus
[Analysis of relationship between wages, employment conditions, and CPI]

### Monetary Policy Transmission
[How RBA cash rate changes are flowing through to mortgage rates, housing, spending]

### External Sector Dynamics
[Trade balance, terms of trade, AUD exchange rate interplay]

### Housing Market & Financial Conditions
[Property prices, building approvals, mortgage rates, household debt]

---

## Pattern Detection

### Anomalies & Divergences
- [Metric/category behaving outside historical norms]
- [...]

### Regime Changes
- [Any structural shifts in trends]
- [...]

### Leading Indicators
- [What current readings suggest about near-term trajectory]
- [...]

---

## Cyclical Position

**Current Phase:** [Expansion / Contraction / Recovery / Peak / Trough]
**Confidence:** [High / Medium / Low]
**Key Drivers:** [2-3 bullet points]

---

## Research Recommendations

1. [Specific area warranting deeper investigation — include suggested ABS publication or RBA paper]
2. [...]
3. [...]
4. [...]

---

## Data Quality Notes

- **Stale metrics (>30 days):** [List any that haven't updated recently]
- **Missing data:** [Any metrics that failed to fetch in last UpdateData run]
- **Methodology notes:** [Relevant definitional changes in ABS/RBA data]
```

## Trigger Phrases

- "How is the Australian economy doing?"
- "Give me an AU economic overview"
- "Analyse Australian economic trends"
- "What's the current state of Australian metrics?"
- "AU metrics report"
- "Australian economic analysis"
- "How is Australia's economy?"
