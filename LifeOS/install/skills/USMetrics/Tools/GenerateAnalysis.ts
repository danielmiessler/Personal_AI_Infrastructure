#!/usr/bin/env bun
/**
 * GenerateAnalysis.ts
 *
 * Generates the US Economic State Analysis document
 * by fetching data and producing the structured markdown report.
 *
 * Usage:
 *   bun run GenerateAnalysis.ts [--output=path]
 *
 * Environment:
 *   FRED_API_KEY - Required for FRED data
 *   EIA_API_KEY - Required for energy data
 */

import { parseArgs } from "util";

// ============================================================================
// CONFIGURATION
// ============================================================================

const FRED_API_KEY = process.env.FRED_API_KEY;
const EIA_API_KEY = process.env.EIA_API_KEY;

// Priority series for the analysis (most impactful metrics)
const PRIORITY_SERIES = {
  economic: ["GDPC1", "A191RL1Q225SBEA", "INDPRO", "RSXFS"],
  inflation: ["CPIAUCSL", "CPILFESL", "PCEPI", "PCEPILFE"],
  employment: ["UNRATE", "PAYEMS", "ICSA", "CIVPART", "CES0500000003"],
  housing: ["MSPUS", "MORTGAGE30US", "HOUST", "CSUSHPINSA"],
  consumer: ["UMCSENT", "PSAVERT", "TOTALSL", "DRCCLACBS"],
  financial: ["FEDFUNDS", "DGS10", "DGS2", "VIXCLS"],
  trade: ["BOPGSTB", "DTWEXBGS"],
  fiscal: ["GFDEBTN", "FYFSD"],
};

const SERIES_NAMES: Record<string, string> = {
  "GDPC1": "Real GDP",
  "A191RL1Q225SBEA": "GDP Growth Rate",
  "INDPRO": "Industrial Production",
  "RSXFS": "Retail Sales",
  "CPIAUCSL": "CPI All Items",
  "CPILFESL": "Core CPI",
  "PCEPI": "PCE Price Index",
  "PCEPILFE": "Core PCE",
  "UNRATE": "Unemployment Rate",
  "PAYEMS": "Nonfarm Payrolls",
  "ICSA": "Initial Jobless Claims",
  "CIVPART": "Labor Force Participation",
  "CES0500000003": "Average Hourly Earnings",
  "MSPUS": "Median Home Price",
  "MORTGAGE30US": "30-Year Mortgage Rate",
  "HOUST": "Housing Starts",
  "CSUSHPINSA": "Case-Shiller Index",
  "UMCSENT": "Consumer Sentiment",
  "PSAVERT": "Personal Saving Rate",
  "TOTALSL": "Consumer Credit",
  "DRCCLACBS": "Credit Card Delinquency",
  "FEDFUNDS": "Fed Funds Rate",
  "DGS10": "10-Year Treasury",
  "DGS2": "2-Year Treasury",
  "VIXCLS": "VIX",
  "BOPGSTB": "Trade Balance",
  "DTWEXBGS": "USD Index",
  "GFDEBTN": "Federal Debt",
  "FYFSD": "Federal Deficit",
};

// Series whose values are already percentages (rates). They are displayed with a % sign and
// their changes are reported in percentage points (pp), not as a percent-of-a-percent
// (which produced lines like "Fed Funds Rate: +807% over 10 years").
export const RATE_SERIES = new Set<string>([
  "A191RL1Q225SBEA", "UNRATE", "CIVPART", "PSAVERT", "MORTGAGE30US",
  "FEDFUNDS", "DGS10", "DGS2", "DRCCLACBS",
]);

// Trend horizons reported in the analysis, in years.
export const HORIZONS = { "10y": 10, "5y": 5, "2y": 2, "1y": 1 } as const;
export type Horizon = keyof typeof HORIZONS;

export type ChangeUnit = "pp" | "%";

// Display scale per change unit: dead band for a "→" arrow, the 10-year move that counts as a
// "significant move", the minimum 1-year move for a momentum call, and display decimals.
const SCALE: Record<ChangeUnit, { flat: number; extreme: number; minMove: number; decimals: number }> = {
  "pp": { flat: 0.1, extreme: 2, minMove: 0.5, decimals: 2 },
  "%": { flat: 2, extreme: 50, minMove: 5, decimals: 1 },
};

// The start observation of a trend window must sit within half the series' typical spacing of
// its target date, but never closer than this floor, which covers weekends and holidays in
// daily series.
const MIN_START_GAP_MS = 3 * 86_400_000;

// ============================================================================
// DATA FETCHING
// ============================================================================

export interface Observation {
  date: string;
  value: number;
}

interface SeriesResult {
  id: string;
  name: string;
  observations: Observation[];
  latest: Observation | null;
  trends: Record<Horizon, TrendStat | null>;
}

export interface TrendStat {
  start: number;
  end: number;
  startDate: string;
  endDate: string;
  change: number;
  pctChange: number;
  /** The change in the series' own reporting unit: percentage points for rates, percent otherwise. */
  delta: number;
  unit: ChangeUnit;
  direction: "↑" | "↓" | "→";
}

export async function fetchFredSeries(seriesId: string, years: number = 10): Promise<SeriesResult | null> {
  if (!FRED_API_KEY) {
    console.error("FRED_API_KEY not set");
    return null;
  }

  // Fetch one extra year so the longest window (latest observation minus `years`) always has a
  // real start candidate even when the latest observation lags today by a few months.
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years - 1);

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate.toISOString().split('T')[0]}&observation_end=${endDate.toISOString().split('T')[0]}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.observations?.length) return null;

    const observations: Observation[] = data.observations
      .filter((o: any) => o.value !== ".")
      .map((o: any) => ({ date: o.date, value: parseFloat(o.value) }))
      .sort((a: Observation, b: Observation) => a.date.localeCompare(b.date));

    const latest = observations[observations.length - 1] || null;

    const isRate = RATE_SERIES.has(seriesId);
    const trends = Object.fromEntries(
      Object.entries(HORIZONS).map(([k, y]) => [k, calculateTrend(observations, y, isRate)]),
    ) as SeriesResult["trends"];

    return {
      id: seriesId,
      name: SERIES_NAMES[seriesId] || seriesId,
      observations,
      latest,
      trends,
    };
  } catch (e) {
    console.error(`Error fetching ${seriesId}:`, e);
    return null;
  }
}

const dateMs = (o: Observation) => Date.parse(o.date); // ISO date-only strings parse as UTC

/**
 * How far the start observation may sit from its target date: half the series' typical
 * spacing (median gap between consecutive observations), floored at MIN_START_GAP_MS.
 * Monthly data gets ~15 days, quarterly ~45, annual ~183, daily and weekly the 3-day floor.
 */
function startTolerance(observations: Observation[]): number {
  const gaps = observations.slice(1).map((o, i) => dateMs(o) - dateMs(observations[i])).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? 0;
  return Math.max(MIN_START_GAP_MS, median / 2);
}

/**
 * Trend over `years`, anchored to the LATEST observation (not to today).
 *
 * The start point is the observation nearest to (latest.date - years). Anchoring to the
 * latest observation matters because monthly/quarterly series lag the calendar by 1-3
 * months: anchoring to today and taking the first observation after the cutoff produced
 * 9-month "1Y" windows for CPI and 6-month "1Y" windows for GDP. Missing observations
 * (FRED ".") cannot shift the start either, because the nearest point is chosen by date
 * distance rather than by list position, and a start that is not within tolerance of the
 * target yields null instead of a mislabelled window.
 *
 * `observations` must be sorted ascending by date.
 */
export function calculateTrend(observations: Observation[], years: number, isRate = false): TrendStat | null {
  if (observations.length < 2) return null;

  const latest = observations[observations.length - 1];
  const target = new Date(dateMs(latest));
  target.setUTCFullYear(target.getUTCFullYear() - years);
  const targetMs = target.getTime();

  let startObs = observations[0];
  let bestGap = Math.abs(dateMs(startObs) - targetMs);
  for (let i = 1; i < observations.length - 1; i++) {
    const gap = Math.abs(dateMs(observations[i]) - targetMs);
    if (gap < bestGap) {
      bestGap = gap;
      startObs = observations[i];
    }
  }
  if (bestGap > startTolerance(observations)) return null;

  const start = startObs.value;
  const end = latest.value;
  const change = end - start;
  const pctChange = start === 0 ? NaN : (change / Math.abs(start)) * 100;
  const unit: ChangeUnit = isRate ? "pp" : "%";
  const delta = isRate ? change : pctChange;
  const direction = !Number.isFinite(delta) || Math.abs(delta) < SCALE[unit].flat ? "→" : delta > 0 ? "↑" : "↓";

  return { start, end, startDate: startObs.date, endDate: latest.date, change, pctChange, delta, unit, direction };
}

async function fetchEIAGasPrice(): Promise<{ value: number; date: string } | null> {
  if (!EIA_API_KEY) return null;

  const url = `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${EIA_API_KEY}&frequency=weekly&data[0]=value&facets[product][]=EPMR&facets[duoarea][]=NUS&sort[0][column]=period&sort[0][direction]=desc&length=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const item = data.response?.data?.[0];
    if (!item) return null;

    return { value: parseFloat(item.value), date: item.period };
  } catch (e) {
    return null;
  }
}

// ============================================================================
// ANALYSIS GENERATION
// ============================================================================

export function formatValue(value: number, seriesId: string): string {
  // Format based on series type
  if (RATE_SERIES.has(seriesId)) {
    return `${value.toFixed(1)}%`;
  }
  if (seriesId === "GDPC1") {
    // GDPC1 is reported in billions of dollars (not millions)
    return `$${(value / 1000).toFixed(2)}T`;
  }
  if (["GFDEBTN", "BOPGSTB", "TOTALSL", "FYFSD"].includes(seriesId)) {
    // these series are reported in millions of dollars; use abs() so negatives (deficit/trade) pick the right scale
    return Math.abs(value) >= 1000000 ? `$${(value / 1000000).toFixed(2)}T` : `$${(value / 1000).toFixed(1)}B`;
  }
  if (["MSPUS"].includes(seriesId)) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  if (["PAYEMS", "ICSA"].includes(seriesId)) {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}M` : `${value.toFixed(0)}K`;
  }
  return value.toFixed(2);
}

/** Signed change with the unit's decimals: "+3.4%" or "-0.20pp"; "—" for a non-finite value. */
export function formatDelta(value: number, unit: ChangeUnit): string {
  if (!Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(SCALE[unit].decimals)}${unit}`;
}

export function formatChange(t: TrendStat | null): string {
  return t ? formatDelta(t.delta, t.unit) : "—";
}

export function generateMarkdown(results: Map<string, SeriesResult>, gasPrice: { value: number; date: string } | null): string {
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];

  let md = `# US Economic State Analysis

**Generated:** ${now}
**Data Period:** 10 years through present
**Sources:** Federal Reserve Economic Data (FRED), Energy Information Administration (EIA)

---

## Executive Summary

`;

  // Build summary based on key metrics
  const unrate = results.get("UNRATE");
  const cpi = results.get("CPIAUCSL");
  const gdp = results.get("GDPC1");
  const fedfunds = results.get("FEDFUNDS");

  if (unrate?.latest) {
    md += `- **Unemployment** at ${formatValue(unrate.latest.value, "UNRATE")} (${formatChange(unrate.trends["1y"])} YoY ${unrate.trends["1y"]?.direction || "→"})\n`;
  }
  if (cpi?.trends["1y"]) {
    md += `- **Inflation (CPI)** running ${cpi.trends["1y"].pctChange.toFixed(1)}% YoY\n`;
  }
  if (gdp?.trends["1y"]) {
    md += `- **Real GDP** ${gdp.trends["1y"].direction} ${Math.abs(gdp.trends["1y"].pctChange).toFixed(1)}% over past year\n`;
  }
  if (fedfunds?.latest) {
    md += `- **Fed Funds Rate** at ${formatValue(fedfunds.latest.value, "FEDFUNDS")}\n`;
  }
  if (gasPrice) {
    md += `- **Gas Prices** at $${gasPrice.value.toFixed(2)}/gallon (as of ${gasPrice.date})\n`;
  }

  md += `
---

## Current Snapshot

| Category | Metric | Current | 1Y Change | Trend |
|----------|--------|---------|-----------|-------|
`;

  // Snapshot table
  const categories = [
    { name: "Economy", ids: ["GDPC1", "A191RL1Q225SBEA"] },
    { name: "Inflation", ids: ["CPIAUCSL", "PCEPILFE"] },
    { name: "Employment", ids: ["UNRATE", "PAYEMS"] },
    { name: "Housing", ids: ["MSPUS", "MORTGAGE30US"] },
    { name: "Consumer", ids: ["UMCSENT", "PSAVERT"] },
    { name: "Markets", ids: ["FEDFUNDS", "DGS10"] },
  ];

  for (const cat of categories) {
    for (const id of cat.ids) {
      const r = results.get(id);
      if (r?.latest && r.trends["1y"]) {
        md += `| ${cat.name} | ${r.name} | ${formatValue(r.latest.value, id)} | ${formatChange(r.trends["1y"])} | ${r.trends["1y"].direction} |\n`;
      }
    }
  }

  md += `
---

## Detailed Trend Analysis

`;

  // Detailed analysis by category
  const categoryDetails = [
    { title: "Economic Output & Growth", ids: PRIORITY_SERIES.economic },
    { title: "Inflation & Prices", ids: PRIORITY_SERIES.inflation },
    { title: "Employment & Labor", ids: PRIORITY_SERIES.employment },
    { title: "Housing", ids: PRIORITY_SERIES.housing },
    { title: "Consumer & Personal Finance", ids: PRIORITY_SERIES.consumer },
    { title: "Financial Markets", ids: PRIORITY_SERIES.financial },
    { title: "Trade & International", ids: PRIORITY_SERIES.trade },
    { title: "Government & Fiscal", ids: PRIORITY_SERIES.fiscal },
  ];

  for (const cat of categoryDetails) {
    md += `### ${cat.title}\n\n`;
    md += `| Metric | Current | 10Y | 5Y | 2Y | 1Y |\n`;
    md += `|--------|---------|-----|----|----|----|\n`;

    for (const id of cat.ids) {
      const r = results.get(id);
      if (r?.latest) {
        const cells = (Object.keys(HORIZONS) as Horizon[]).map(k => formatChange(r.trends[k])).join(" | ");
        md += `| ${r.name} | ${formatValue(r.latest.value, id)} | ${cells} |\n`;
      }
    }
    md += `\n`;
  }

  md += `---

## Cross-Metric Analysis

### Inflation-Employment Dynamics

`;

  if (unrate?.latest && cpi?.trends["1y"]) {
    md += `Current unemployment (${formatValue(unrate.latest.value, "UNRATE")}) with CPI change of ${cpi.trends["1y"].pctChange.toFixed(1)}% YoY suggests `;
    if (unrate.latest.value < 4.5 && cpi.trends["1y"].pctChange > 3) {
      md += `a tight labor market with persistent inflationary pressure.\n`;
    } else if (unrate.latest.value < 4.5 && cpi.trends["1y"].pctChange < 3) {
      md += `the economy is approaching a "soft landing" scenario.\n`;
    } else {
      md += `moderate labor market conditions.\n`;
    }
  }

  md += `
### Yield Curve Status

`;

  const dgs10 = results.get("DGS10");
  const dgs2 = results.get("DGS2");
  if (dgs10?.latest && dgs2?.latest) {
    const spread = dgs10.latest.value - dgs2.latest.value;
    md += `- 10Y Treasury: ${formatValue(dgs10.latest.value, "DGS10")}\n`;
    md += `- 2Y Treasury: ${formatValue(dgs2.latest.value, "DGS2")}\n`;
    md += `- Spread: ${spread.toFixed(2)}pp (${spread < 0 ? "INVERTED - recessionary signal" : "Normal"})\n`;
  }

  md += `
### Housing Affordability

`;

  const homePrice = results.get("MSPUS");
  const mortgage = results.get("MORTGAGE30US");
  if (homePrice?.latest && mortgage?.latest) {
    md += `With median home price at ${formatValue(homePrice.latest.value, "MSPUS")} and mortgage rates at ${formatValue(mortgage.latest.value, "MORTGAGE30US")}, `;
    if (homePrice.latest.value > 400000 && mortgage.latest.value > 6) {
      md += `housing affordability remains severely stressed.\n`;
    } else {
      md += `housing affordability is challenging but stabilizing.\n`;
    }
  }

  md += `
---

## Pattern Detection

### Historical Extremes

`;

  // Check for extremes
  const extremes: string[] = [];
  for (const [id, r] of results) {
    const t10 = r.trends["10y"];
    if (t10 && Math.abs(t10.delta) > SCALE[t10.unit].extreme) {
      extremes.push(`- **${r.name}**: ${formatChange(t10)} over 10 years (significant move)`);
    }
  }

  if (extremes.length > 0) {
    md += extremes.join("\n") + "\n";
  } else {
    md += "No extreme outliers detected in current data.\n";
  }

  md += `
### Recent Momentum Shifts

`;

  // Look for acceleration/deceleration
  const shifts: string[] = [];
  for (const [id, r] of results) {
    const t5 = r.trends["5y"];
    const t1 = r.trends["1y"];
    if (t5 && t1) {
      // Last year against the 5-year average annual move, in the series' own unit.
      const fiveYrAnnual = t5.delta / 5;
      const oneYr = t1.delta;
      const minMove = SCALE[t1.unit].minMove;
      const vs = `(1Y: ${formatDelta(oneYr, t1.unit)} vs 5Y avg: ${formatDelta(fiveYrAnnual, t1.unit)}/yr)`;
      if (Math.abs(oneYr) > Math.abs(fiveYrAnnual) * 2 && Math.abs(oneYr) > minMove) {
        shifts.push(`- **${r.name}**: Accelerating ${vs}`);
      } else if (Math.abs(oneYr) < Math.abs(fiveYrAnnual) / 2 && Math.abs(fiveYrAnnual) > minMove) {
        shifts.push(`- **${r.name}**: Decelerating ${vs}`);
      }
    }
  }

  if (shifts.length > 0) {
    md += shifts.join("\n") + "\n";
  } else {
    md += "No significant momentum shifts detected.\n";
  }

  md += `
---

## Research Recommendations

### High Priority Investigations

1. **Labor Market Dynamics**: Examine the relationship between job openings, quit rate, and wage growth
2. **Inflation Persistence**: Analyze components of CPI to identify sticky inflation drivers
3. **Housing Market**: Investigate regional variations in home prices vs. mortgage rate sensitivity

### Risks to Monitor

1. **Credit Conditions**: Watch credit card delinquency and consumer credit growth rates
2. **Yield Curve**: Monitor 10Y-2Y spread for recession signals
3. **Consumer Sentiment**: Track sentiment vs. actual spending divergence

### Data Gaps

1. Add regional breakdowns for key metrics
2. Include leading economic indicators (LEI)
3. Add wage growth by sector data

---

## Sources

- **FRED (Federal Reserve Economic Data)**: Primary source for most indicators
- **EIA (Energy Information Administration)**: Gas and oil prices
- **Treasury FiscalData**: Federal debt and deficit data
- **BLS (Bureau of Labor Statistics)**: Employment statistics
- **Census Bureau**: Housing data

---

*Analysis generated by US-Metrics skill using Substrate US-Common-Metrics dataset*
`;

  return md;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      output: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
GenerateAnalysis.ts - Generate US Economic State Analysis

Usage:
  bun run GenerateAnalysis.ts [--output=path]

Options:
  --output=PATH  Save to file instead of stdout
  -h, --help     Show this help

Environment:
  FRED_API_KEY   Required for FRED data
  EIA_API_KEY    Optional for gas prices
`);
    process.exit(0);
  }

  console.error("Fetching data from FRED API...");

  const results = new Map<string, SeriesResult>();

  // Fetch all priority series
  const allSeries = Object.values(PRIORITY_SERIES).flat();
  for (const id of allSeries) {
    console.error(`  Fetching ${id}...`);
    const result = await fetchFredSeries(id, 10);
    if (result) {
      results.set(id, result);
    }
    // Small delay to be nice to the API
    await new Promise(r => setTimeout(r, 100));
  }

  console.error("Fetching gas prices from EIA...");
  const gasPrice = await fetchEIAGasPrice();

  console.error("Generating analysis...");
  const markdown = generateMarkdown(results, gasPrice);

  if (values.output) {
    await Bun.write(values.output, markdown);
    console.error(`Analysis saved to ${values.output}`);
  } else {
    console.log(markdown);
  }
}

if (import.meta.main) {
  main();
}
