---
name: AUMetrics
description: Australian economic indicators from ABS, RBA, and Treasury APIs with trend analysis and cross-metric correlation. Updates Substrate dataset, produces economic overviews. USE WHEN Australian GDP, Australian inflation, Australian unemployment, Australian economic metrics, Australian economy, AUD exchange rate, RBA cash rate, update AU data, Australian economic overview, ABS data, AU metrics, Australian trends.
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/AUMetrics/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.


## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the AUMetrics skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **AUMetrics** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

# AU Metrics — Australian Economic & Social Indicator Analysis

**Purpose:** Analyze Australian economic and social metrics using the Substrate AU-Common-Metrics dataset. Provides trend analysis, cross-metric correlation, pattern detection, and research recommendations.

## Data Sources

All metrics sourced from:
- **Location:** `${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/`
- **Master Document:** `AU-Common-Metrics.md` (45+ metrics across 10 categories)
- **Source Documentation:** `source.md` (full methodology)
- **Underlying APIs:** ABS Data API (SDMX), RBA Statistical Tables (CSV), Treasury

### Primary Sources

| Source | Access Method | Auth | Base URL |
|--------|--------------|------|----------|
| **ABS Data API** | SDMX REST (JSON) | None required | `https://data.api.abs.gov.au/rest/data/` |
| **RBA Statistical Tables** | CSV download | None required | `https://www.rba.gov.au/statistics/tables/csv/` |
| **Treasury / Finance** | Web/CSV | None required | `https://www.budget.gov.au/` |


## Workflow Routing

**When executing a workflow, output this notification directly:**

```
Running the **WorkflowName** workflow in the **AUMetrics** skill to ACTION...
```

### Available Workflows

| Workflow | Description | Use When |
|----------|-------------|----------|
| **UpdateData** | Fetch live data from ABS/RBA APIs and update Substrate dataset | "Update AU metrics", "refresh Australian data", "pull latest", "update AU Substrate" |
| **GetCurrentState** | Comprehensive economic overview with multi-timeframe trend analysis | "How is the Australian economy?", "AU economic overview", "get current state", "AU metrics analysis" |

## Workflows

### UpdateData

**Full documentation:** `Workflows/UpdateData.md`

**Purpose:** Fetch live data from ABS Data API and RBA CSV tables and populate the Substrate AU-Common-Metrics dataset files. This must run before GetCurrentState to ensure data is current.

**Execution:**
```bash
bun ~/.claude/skills/AUMetrics/Tools/UpdateSubstrateMetrics.ts
```

**Outputs:**
- `AU-Common-Metrics.md` — Updated with current values
- `au-metrics-current.csv` — Machine-readable snapshot
- `au-metrics-historical.csv` — Appended time series

**Trigger phrases:**
- "Update the Australian metrics"
- "Refresh the AU economic data"
- "Pull latest AU metrics"
- "Update AU Substrate dataset"

---

### GetCurrentState

**Full documentation:** `Workflows/GetCurrentState.md`

**Produces:** A comprehensive overview document analyzing:
- 10-year, 5-year, 2-year, and 1-year trends for all major metrics
- Cross-category interplay analysis
- Pattern detection and anomalies
- Research recommendations

**Trigger phrases:**
- "How is the Australian economy doing?"
- "Give me an AU economic overview"
- "What's the current state of Australian metrics?"
- "Analyse Australian economic trends"
- "AU metrics report"

## Metric Categories Covered

1. **Economic Output & Growth** — GDP (chain volume), nominal GDP, GDP growth, retail trade, industrial activity
2. **Inflation & Prices** — CPI all groups, trimmed mean CPI, WPI, PPI, petrol prices
3. **Employment & Labour** — Unemployment rate, underemployment rate, participation rate, employment change, full-time/part-time split
4. **Housing** — Residential Property Price Indexes (8 capital cities), building approvals, dwelling values
5. **Consumer & Finance** — Retail trade turnover, household saving ratio, consumer confidence
6. **Financial Markets** — RBA cash rate, 10Y bond yield, AUD/USD, Trade Weighted Index (TWI)
7. **Trade & International** — Trade balance, exports, imports, terms of trade
8. **Government & Fiscal** — Federal budget balance, Commonwealth debt, government spending
9. **Demographics & Social** — Population, income distribution, median household income
10. **Energy & Resources** — Petrol prices, electricity prices, commodity exports

## API Keys Required

For live data fetching:
- **None required** for ABS Data API (public access)
- **None required** for RBA CSV downloads (public access)
- Optional: `ABS_API_KEY` — Only needed for ABS Indicator API (higher rate limits); obtain free from `api.data@abs.gov.au`

## Tools

| Tool | Purpose |
|------|---------|
| `Tools/UpdateSubstrateMetrics.ts` | **Primary** — Fetch all metrics, update Substrate files |
| `Tools/FetchAbsSeries.ts` | Fetch historical data from ABS SDMX API |
| `Tools/GenerateAnalysis.ts` | Generate analysis report from Substrate data |

## Example Usage

```
User: "How is the Australian economy doing? Give me a full analysis."

→ Invoke GetCurrentState workflow
→ Fetch current + historical data for all metrics
→ Calculate 10y/5y/2y/1y trends
→ Analyse cross-metric correlations
→ Identify patterns and anomalies
→ Generate research recommendations
→ Output comprehensive markdown report
```

## Output Format

The GetCurrentState workflow produces a structured markdown document:

```markdown
# Australian Economic State Analysis
**Generated:** [timestamp]
**Data Sources:** ABS, RBA, Treasury

## Executive Summary
[Key findings in 3-5 bullets]

## Trend Analysis by Category
### Economic Output
[10y/5y/2y/1y trends with analysis]
...

## Cross-Metric Analysis
[Correlations, leading indicators, divergences]

## Pattern Detection
[Anomalies, regime changes, emerging trends]

## Research Recommendations
[Suggested areas for deeper investigation]
```
