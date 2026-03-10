# UpdateData Workflow

**Skill:** AUMetrics
**Purpose:** Fetch current data from ABS and RBA and update the Substrate AU-Common-Metrics dataset

## Overview

This workflow pulls live data from the ABS Data API (SDMX) and RBA Statistical Tables (CSV), then writes the current values to the Substrate dataset files. The GetCurrentState workflow then reads from these populated files.

## Data Flow

```
APIs (ABS SDMX, RBA CSV)
    ↓
UpdateData workflow (this)
    ↓
Substrate files:
  - AU-Common-Metrics.md (markdown with values)
  - au-metrics-current.csv (machine-readable)
  - au-metrics-historical.csv (time series)
    ↓
GetCurrentState workflow
    ↓
Analysis report
```

## Execution Steps

### Step 1: Initialize

Output the workflow status message:

```
Running **UpdateData** in **AUMetrics**...
```

### Step 2: Run Update Tool

Execute the update script:

```bash
bun ~/.claude/skills/AUMetrics/Tools/UpdateSubstrateMetrics.ts
```

This tool:
1. Fetches current values from ABS Data API and RBA CSV tables
2. Writes to `${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/AU-Common-Metrics.md`
3. Exports to `au-metrics-current.csv`
4. Appends to `au-metrics-historical.csv` (with timestamp)
5. Logs update status

### Step 3: Verify Update

Check the update was successful:
- Verify `AU-Common-Metrics.md` has current values (not placeholders)
- Verify `au-metrics-current.csv` exists and has data
- Check update log for any failed fetches

## API Sources

### ABS Data API (SDMX REST)

**Base URL:** `https://data.api.abs.gov.au/rest/data/`

**Query pattern:**
```
https://data.api.abs.gov.au/rest/data/ABS,{DATAFLOW},{VERSION}/all?startPeriod={period}&format=jsondata
```

**Key dataflows used:**

| Dataflow | Version | Metrics |
|----------|---------|---------|
| `CPI` | `1.1.0` | Consumer Price Index |
| `WPI` | latest | Wage Price Index |
| `ANA_AGG` | `1.1.0` | National Accounts (GDP) |
| `LF` | latest | Labour Force Survey |
| `RPPI` | latest | Residential Property Price Indexes |
| `ITS` | latest | International Trade in Services |
| `PPI` | latest | Producer Price Index |
| `RT` | latest | Retail Trade |
| `BAPS` | latest | Building Approvals |

**Authentication:** None required. All endpoints are publicly accessible.

**Response format:** SDMX-JSON (`format=jsondata` query param)

**Rate limiting:** Be considerate — add 100ms delays between requests. Consider requesting a free ABS API key at `api.data@abs.gov.au` for higher limits.

**Finding series keys:**
- Use ABS Data Explorer: https://www.abs.gov.au/about/data-services/data-explorer
- Generate API call in the UI, then adapt the URL
- All available dataflows: `https://data.api.abs.gov.au/rest/dataflow/all?detail=allstubs`

### RBA Statistical Tables (CSV)

**Base URL:** `https://www.rba.gov.au/statistics/tables/csv/`

**CSV naming convention:** `{table-code}-data.csv`

**Key tables:**

| Table | Code | Metric |
|-------|------|--------|
| Cash Rate (daily) | `f1` | RBA Cash Rate Target |
| Cash Rate (monthly) | `f1.1` | Cash Rate (monthly avg) |
| Exchange Rates (historical) | `f11` | AUD/USD, TWI |
| Exchange Rates (recent) | `f11.1` | AUD/USD (2023+) |
| Capital Market Yields | `f2` | 10Y Commonwealth bond yield |
| Housing Lending Rates | `f5` | Mortgage rate |
| Household Finances | `e2` | Household saving ratio |

**CSV structure:** Each file has a metadata header (~10 rows) followed by data rows. Dates are in column A, series titles in row 11.

**Parsing approach:**
1. Fetch CSV as text
2. Skip header rows (look for "Series ID" row to find data start)
3. Parse date column + target series column
4. Extract most recent value

## Environment Requirements

```bash
# Optional — increases rate limits for ABS API
export ABS_API_KEY="your_key_if_obtained"
```

No API keys required for basic operation.

## Output Files

### AU-Common-Metrics.md

The markdown file gets values populated in the metric tables:

```markdown
| Metric | Value | Period | Updated | Source |
|--------|-------|--------|---------|--------|
| Real GDP | $2,671B | Q3 2025 | 2026-03-01 | ABS National Accounts |
| CPI YoY | 2.4% | Dec 2025 | 2026-01-29 | ABS CPI |
| Cash Rate | 4.10% | Feb 2026 | 2026-02-18 | RBA |
```

### au-metrics-current.csv

```csv
metric_id,metric_name,value,unit,period,updated,source,api_id
ANA_GDP_CVS,Real GDP (Chain Volume),2671.3,Billions AUD (2021-22 prices),2025-09-01,2026-03-05,ABS/ANA_AGG,ABS,ANA_AGG
CPI_ALL,CPI All Groups,134.8,Index (2011-12=100),2025-12-01,2026-01-29,ABS/CPI,ABS,CPI
```

### au-metrics-historical.csv

Appends each update as a new row with timestamp:

```csv
fetch_timestamp,metric_id,value,period
2026-03-10T10:30:00Z,ANA_GDP_CVS,2671.3,2025-09-01
2026-03-10T10:30:00Z,CPI_ALL,134.8,2025-12-01
```

## Trigger Phrases

- "Update Australian metrics"
- "Refresh the AU metrics data"
- "Pull latest Australian economic data"
- "Update AU Substrate metrics"
- "Fetch current AU values"

## Error Handling

- **API failure**: Log which metrics failed, continue with others
- **ABS series not found**: Check dataflow version; try without version suffix
- **RBA CSV format changed**: Log warning, skip metric, flag for manual check
- **Partial update**: Mark which metrics are stale in output

## Update Schedule Recommendation

| Frequency | Metrics |
|-----------|---------|
| Daily | RBA cash rate, exchange rates, bond yields |
| Weekly | Petrol prices |
| Monthly | CPI, Labour Force, Retail Trade, Building Approvals |
| Quarterly | GDP, WPI, Terms of Trade, Housing Price Indexes |
| Annual | Population, Household income statistics |

## Notes

- ABS is the primary aggregator for most statistical data — equivalent to FRED in the US
- RBA is the central bank — equivalent to Federal Reserve published data
- ABS data is on SDMX standard which requires dimension-key understanding (more complex than FRED's simple `series_id`)
- Use ABS Data Explorer to generate the exact API URL for any series before coding it
- ABS series versions change (e.g., `CPI,1.0.0` → `CPI,1.1.0`) — always check the latest version
