# AUMetrics — Australian Economic Indicators for Claude Code

A [PAI](https://github.com/danielmiessler/PAI) skill that fetches 40 live Australian economic indicators from the ABS and RBA, stores them in a local Substrate dataset, and generates structured economic analysis reports.

## What It Does

**UpdateData** — Fetches live data from:
- [ABS Data API](https://data.api.abs.gov.au/) (SDMX REST, no auth required) — GDP, CPI, employment, wages, housing prices, trade
- [RBA Statistical Tables](https://www.rba.gov.au/statistics/tables/) (CSV downloads) — cash rate, bond yields, exchange rates, credit aggregates

**GetCurrentState** — Generates a comprehensive markdown analysis covering:
- Multi-timeframe trend analysis across 10 categories
- Cross-metric correlation (inflation ↔ labour ↔ housing ↔ monetary policy)
- Pattern detection, cyclical positioning, and research recommendations

## Metrics Covered (40 indicators)

| Category | Metrics |
|----------|---------|
| Economic Output | Nominal GDP, GDP Growth QoQ, Real GDP per Capita, GNI, Retail Trade |
| Inflation | CPI All Groups, CPI YoY, Trimmed Mean CPI, Fuel CPI, Electricity CPI, WPI, WPI YoY |
| Employment | Unemployment, Participation, Total Employed, Full-Time, Part-Time, Emp/Pop Ratio |
| Housing | RPPI (8 cities), House Price Index, YoY Change, Mortgage Rate, Housing Credit Growth, Investor Credit Growth |
| Consumer | Household Debt to Income Ratio |
| Financial Markets | Cash Rate, 10Y Bond, 3Y Bond, AUD/USD, TWI, M3 Money Growth, Business Credit Growth |
| Trade | Terms of Trade, Merchandise Exports, Merchandise Imports |
| Government | Net National Saving, Real NNDI, AFI Lending to Government |
| Demographics | Net Overseas Migration (Quarterly) |
| Energy & Resources | RBA Commodity Price Index (SDR) |

## Installation

### Prerequisites

- [Claude Code](https://claude.ai/code) installed
- [PAI](https://github.com/danielmiessler/PAI) skill system configured at `~/.claude/`
- [Bun](https://bun.sh/) runtime (for running the data fetcher)

### Install

```bash
# Clone into your PAI skills directory
git clone https://github.com/pkumaschow/pai-skill-aumetrics ~/.claude/skills/AUMetrics

# Verify bun is available
bun --version

# Test the data fetcher (dry run — no files written)
bun ~/.claude/skills/AUMetrics/Tools/UpdateSubstrateMetrics.ts --dry-run
```

### First Run

```bash
# Fetch live data and write Substrate files
bun ~/.claude/skills/AUMetrics/Tools/UpdateSubstrateMetrics.ts
```

Output is written to `~/Projects/Substrate/Data/AU-Common-Metrics/` (override with `PROJECTS_DIR` env var).

## Usage

Once installed, use natural language in Claude Code:

```
"Update Australian metrics"              → runs UpdateData workflow
"How is the Australian economy?"         → runs GetCurrentState workflow
"Give me an AU economic overview"        → runs GetCurrentState workflow
"Refresh the AU economic data"           → runs UpdateData workflow
"Australian economic analysis"           → runs GetCurrentState workflow
```

## API Keys

**None required.** All data sources are publicly accessible:
- ABS Data API: public, no authentication
- RBA Statistical Tables: public CSV downloads

**Optional:** ABS API key for higher rate limits (free, request at `api.data@abs.gov.au`)

## Data Sources

| Source | Method | URL |
|--------|--------|-----|
| ABS Data API | SDMX REST (JSON) | `https://data.api.abs.gov.au/rest/data/` |
| RBA Statistical Tables | CSV download | `https://www.rba.gov.au/statistics/tables/csv/` |

## Output Files

Written to `${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/`:

| File | Description |
|------|-------------|
| `AU-Common-Metrics.md` | Human-readable markdown with formatted tables |
| `au-metrics-current.csv` | Machine-readable snapshot (latest values) |
| `au-metrics-historical.csv` | Timestamped time series (appended each run) |

## Customization

Add personal preferences at `~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/AUMetrics/PREFERENCES.md` — loaded automatically before each execution.

## Security

This skill has a low attack surface — no credentials, no network listeners, no shell execution, no npm dependencies. However, users should be aware of the following:

**Data integrity**
- Fetched data is not cryptographically signed. A MITM attack or compromised CA could cause the skill to write tampered values to your Substrate dataset silently. All fetches use HTTPS but there is no certificate pinning.
- ABS and RBA provide no checksums or signatures on their responses. If values look anomalous, verify directly at [abs.gov.au](https://www.abs.gov.au) or [rba.gov.au](https://www.rba.gov.au).

**File system**
- The tool writes to `~/Projects/Substrate/Data/AU-Common-Metrics/` (or `$PROJECTS_DIR`). A misconfigured `PROJECTS_DIR` could redirect writes to unintended paths.
- `au-metrics-historical.csv` grows unboundedly — no size cap or rotation. Monitor disk usage on long-running installs.

**Supply chain**
- The TypeScript tool runs under Bun with full user permissions. Review diffs carefully before pulling updates, especially from forks.
- The skill uses only Bun built-ins and the Node `os` module — there are no third-party npm packages to audit.

**Not a concern**
- No API keys, tokens, or secrets are stored anywhere in this skill.
- For consequential financial decisions, always cross-reference values against the primary ABS and RBA sources.

## Known Limitations

- **RPPI data**: ABS RPPI SDMX dataflow appears stale at 2021-Q4. Private sector property indices (CoreLogic, Domain) are more current but require API access.
- **Historical depth**: The `au-metrics-historical.csv` only accumulates from first run — no pre-populated history.
- **ABS SDMX**: Series dimension keys are complex. See [ABS Data Explorer](https://www.abs.gov.au/about/data-services/data-explorer) to discover/verify keys for additional series.

## License

MIT
