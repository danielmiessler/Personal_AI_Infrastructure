#!/usr/bin/env bun
/**
 * UpdateSubstrateMetrics.ts — AUMetrics
 *
 * Fetches current Australian economic data from ABS Data API (SDMX) and
 * RBA Statistical Tables (CSV), then updates the Substrate AU-Common-Metrics
 * dataset files.
 *
 * Usage:
 *   bun run UpdateSubstrateMetrics.ts [--dry-run]
 *
 * Environment:
 *   ABS_API_KEY  — Optional: increases rate limits (free, email api.data@abs.gov.au)
 *   PROJECTS_DIR — Optional: override projects directory (default: ~/Projects)
 *
 * Output files:
 *   - ${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/AU-Common-Metrics.md
 *   - ${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/au-metrics-current.csv
 *   - ${PROJECTS_DIR}/Substrate/Data/AU-Common-Metrics/au-metrics-historical.csv
 *
 * ABS API:   https://data.api.abs.gov.au/
 * RBA Data:  https://www.rba.gov.au/statistics/tables/
 *
 * KEY NOTES ON ABS SDMX KEYS:
 * Keys are dimension values joined by "." matching each dataflow's DSD.
 * Use the ABS Data Explorer to discover/verify keys for new series.
 * URL: https://www.abs.gov.au/about/data-services/data-explorer
 */

import { parseArgs } from "util";
import { writeFileSync, existsSync, appendFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ============================================================================
// CONFIGURATION
// ============================================================================

// Use os.homedir() to reliably get home directory regardless of env var quirks
const _home = homedir();
const _projectsDir = process.env.PROJECTS_DIR && !process.env.PROJECTS_DIR.startsWith("$")
  ? process.env.PROJECTS_DIR
  : join(_home, "Projects");
const SUBSTRATE_PATH = join(_projectsDir, "Substrate/Data/AU-Common-Metrics");

const ABS_API_KEY = process.env.ABS_API_KEY;
const ABS_BASE = "https://data.api.abs.gov.au/rest/data";
const RBA_BASE = "https://www.rba.gov.au/statistics/tables/csv";

// ============================================================================
// TYPES
// ============================================================================

type MetricSource = "abs" | "rba-csv";
type MetricFormat = "number" | "percent" | "currency" | "billions" | "millions" | "trillions" | "index" | "thousands";

interface AbsConfig {
  dataflow: string;     // e.g., "ANA_AGG" — tool prepends "ABS,"
  key: string;          // SDMX dimension key e.g., "M3.GPM.20.AUS.Q"
  noStartPeriod?: true; // Set for dataflows that don't support startPeriod filter (e.g. RPPI)
}

interface RbaConfig {
  table: string;        // Table code e.g., "f1" → fetches f1-data.csv
  seriesId: string;     // Series ID in CSV "Series ID" row e.g., "FIRMMCRTD"
}

interface MetricConfig {
  id: string;
  name: string;
  category: string;
  source: MetricSource;
  sourceLabel: string;
  format: MetricFormat;
  decimals?: number;
  unit?: string;
  abs?: AbsConfig;
  rba?: RbaConfig;
}

// ============================================================================
// METRIC CATALOGUE — 36 verified Australian economic indicators
//
// All SDMX keys verified against live ABS API as of 2026-03-10.
// Dimension ordering: matches each dataflow's DSD (use Data Explorer to verify).
// ============================================================================

const METRICS: MetricConfig[] = [

  // ==========================================================================
  // 1. ECONOMIC OUTPUT & GROWTH — ABS National Accounts (ANA_AGG)
  // Dimensions: MEASURE.DATA_ITEM.TSEST.REGION.FREQ
  //   MEASURE: M2=% change QoQ, M3=Current prices, M5=Index
  //   DATA_ITEM: GPM=GDP, HSR=Household saving ratio, TTR=Terms of trade, DFD=Domestic final demand
  //   TSEST: 10=Original, 20=Seasonally Adjusted, 30=Trend
  //   REGION: AUS=Australia
  //   FREQ: Q=Quarterly
  // ==========================================================================
  {
    id: "GDP_NOM",
    name: "Nominal GDP (Current Prices)",
    category: "Economic Output",
    source: "abs",
    sourceLabel: "ABS National Accounts",
    format: "millions",
    decimals: 0,
    unit: "$M AUD (current prices)",
    abs: { dataflow: "ANA_AGG", key: "M3.GPM.20.AUS.Q" },
  },
  {
    id: "GDP_GROWTH_QOQ",
    name: "GDP Growth Rate (QoQ %)",
    category: "Economic Output",
    source: "abs",
    sourceLabel: "ABS National Accounts",
    format: "percent",
    decimals: 1,
    unit: "% change from prev quarter",
    abs: { dataflow: "ANA_AGG", key: "M2.GPM.20.AUS.Q" },
  },
  {
    id: "GDP_PER_CAPITA",
    name: "Real GDP per Capita",
    category: "Economic Output",
    source: "abs",
    sourceLabel: "ABS National Accounts",
    format: "number",
    decimals: 0,
    unit: "AUD (chain volume, 2021-22 prices)",
    // M1=Chain volume measures, GPM_PCA=GDP per capita
    abs: { dataflow: "ANA_AGG", key: "M1.GPM_PCA.20.AUS.Q" },
  },
  {
    id: "GNI_NOM",
    name: "Gross National Income (Nominal)",
    category: "Economic Output",
    source: "abs",
    sourceLabel: "ABS National Accounts",
    format: "millions",
    decimals: 0,
    unit: "$M AUD (current prices)",
    abs: { dataflow: "ANA_AGG", key: "M3.GNI.20.AUS.Q" },
  },
  {
    id: "RETAIL_TRADE",
    name: "Retail Trade Turnover",
    category: "Economic Output",
    source: "abs",
    sourceLabel: "ABS Retail Trade",
    format: "millions",
    decimals: 0,
    unit: "$M AUD",
    // RT dimensions: MEASURE.INDUSTRY.TSEST.REGION.FREQ
    // M1=Current prices, 20=All industries, 20=Seasonally adjusted, AUS, M=Monthly
    abs: { dataflow: "RT", key: "M1.20.20.AUS.M" },
  },

  // ==========================================================================
  // 2. INFLATION & PRICES — ABS CPI
  // Dimensions: MEASURE.INDEX.TSEST.REGION.FREQ
  //   MEASURE: 1=Index Numbers, 2=% change prev period, 3=% change same period prev year
  //   INDEX: 10001=All groups, 10002=Trimmed mean, 10003=Electricity, 10004=Automotive fuel
  //   TSEST: 10=Original, 50=Weighted average 8 cities
  //   REGION: 50=Weighted avg 8 capital cities
  //   FREQ: Q=Quarterly
  // ==========================================================================
  // CPI 1.1.0: MEASURE.INDEX.TSEST.REGION.FREQ
  // MEASURE: 1=Index Numbers, 2=% QoQ, 3=% YoY
  // INDEX: 10001=All groups, 40081=Automotive fuel, 40055=Electricity, 999902=Trimmed Mean
  // TSEST: 10=Original
  // REGION: 50=Weighted average 8 capital cities
  // FREQ: Q=Quarterly
  {
    id: "CPI_ALL",
    name: "CPI All Groups",
    category: "Inflation",
    source: "abs",
    sourceLabel: "ABS CPI",
    format: "index",
    decimals: 1,
    unit: "Index 2011-12=100",
    abs: { dataflow: "CPI,1.1.0", key: "1.10001.10.50.Q" },
  },
  {
    id: "CPI_ALL_YOY",
    name: "CPI All Groups (YoY %)",
    category: "Inflation",
    source: "abs",
    sourceLabel: "ABS CPI",
    format: "percent",
    decimals: 1,
    unit: "% change from same quarter prev year",
    abs: { dataflow: "CPI,1.1.0", key: "3.10001.10.50.Q" },
  },
  {
    id: "CPI_TRIMMED_MEAN",
    name: "Trimmed Mean CPI (YoY %)",
    category: "Inflation",
    source: "abs",
    sourceLabel: "ABS CPI",
    format: "percent",
    decimals: 1,
    unit: "% change from same quarter prev year",
    // Trimmed mean requires TSEST=20 (Seasonally Adjusted) — original (10) returns NoRecordsFound
    abs: { dataflow: "CPI,1.1.0", key: "3.999902.20.50.Q" },
  },
  {
    id: "CPI_PETROL",
    name: "Automotive Fuel CPI",
    category: "Inflation",
    source: "abs",
    sourceLabel: "ABS CPI",
    format: "index",
    decimals: 1,
    unit: "Index 2011-12=100",
    abs: { dataflow: "CPI,1.1.0", key: "1.40081.10.50.Q" },
  },
  {
    id: "CPI_ELECTRICITY",
    name: "Electricity CPI",
    category: "Inflation",
    source: "abs",
    sourceLabel: "ABS CPI",
    format: "index",
    decimals: 1,
    unit: "Index 2011-12=100",
    abs: { dataflow: "CPI,1.1.0", key: "1.40055.10.50.Q" },
  },
  {
    id: "WPI_TOTAL",
    name: "Wage Price Index (Total)",
    category: "Inflation",
    source: "abs",
    sourceLabel: "ABS Wage Price Index",
    format: "index",
    decimals: 1,
    unit: "Index 2016-17=100",
    // WPI dimensions: MEASURE.INDEX.SECTOR.INDUSTRY.TSEST.REGION.FREQ
    // 1=Quarterly index, THRPEB=Total hourly rates excl bonuses, 7=Private & Public, TOT=All industries, 10=Original, AUS, Q
    abs: { dataflow: "WPI", key: "1.THRPEB.7.TOT.10.AUS.Q" },
  },
  {
    id: "WPI_YOY",
    name: "Wage Price Index (YoY %)",
    category: "Inflation",
    source: "abs",
    sourceLabel: "ABS Wage Price Index",
    format: "percent",
    decimals: 1,
    unit: "% change from same quarter prev year",
    // 3=% change from corresponding quarter prev year
    abs: { dataflow: "WPI", key: "3.THRPEB.7.TOT.10.AUS.Q" },
  },

  // ==========================================================================
  // 3. EMPLOYMENT & LABOUR — ABS Labour Force Survey (LF)
  // Dimensions: MEASURE.SEX.AGE.TSEST.REGION.FREQ
  //   MEASURE: M1=Employed FT, M2=Employed PT, M3=Employed total, M6=Unemployed persons
  //            M12=Participation rate, M13=Unemployment rate, M16=Emp-to-pop ratio
  //   SEX: 1=Male, 2=Female, 3=Persons
  //   AGE: 1599=Total (all ages)
  //   TSEST: 10=Original, 20=Seasonally Adjusted, 30=Trend
  //   REGION: AUS=Australia
  //   FREQ: M=Monthly
  // ==========================================================================
  {
    id: "LF_UNEMP_RATE",
    name: "Unemployment Rate",
    category: "Employment",
    source: "abs",
    sourceLabel: "ABS Labour Force",
    format: "percent",
    decimals: 1,
    unit: "%",
    abs: { dataflow: "LF", key: "M13.3.1599.20.AUS.M" },
  },
  {
    id: "LF_PARTICIPATION",
    name: "Participation Rate",
    category: "Employment",
    source: "abs",
    sourceLabel: "ABS Labour Force",
    format: "percent",
    decimals: 1,
    unit: "%",
    abs: { dataflow: "LF", key: "M12.3.1599.20.AUS.M" },
  },
  {
    id: "LF_EMPLOYED",
    name: "Total Employed Persons",
    category: "Employment",
    source: "abs",
    sourceLabel: "ABS Labour Force",
    format: "thousands",
    decimals: 1,
    unit: "Thousands persons",
    abs: { dataflow: "LF", key: "M3.3.1599.20.AUS.M" },
  },
  {
    id: "LF_EMPLOYED_FT",
    name: "Full-Time Employment",
    category: "Employment",
    source: "abs",
    sourceLabel: "ABS Labour Force",
    format: "thousands",
    decimals: 1,
    unit: "Thousands persons",
    abs: { dataflow: "LF", key: "M1.3.1599.20.AUS.M" },
  },
  {
    id: "LF_EMPLOYED_PT",
    name: "Part-Time Employment",
    category: "Employment",
    source: "abs",
    sourceLabel: "ABS Labour Force",
    format: "thousands",
    decimals: 1,
    unit: "Thousands persons",
    abs: { dataflow: "LF", key: "M2.3.1599.20.AUS.M" },
  },
  {
    id: "LF_EMP_POP_RATIO",
    name: "Employment-Population Ratio",
    category: "Employment",
    source: "abs",
    sourceLabel: "ABS Labour Force",
    format: "percent",
    decimals: 1,
    unit: "%",
    abs: { dataflow: "LF", key: "M16.3.1599.20.AUS.M" },
  },

  // ==========================================================================
  // 4. HOUSING — ABS Residential Property Price Indexes (RPPI)
  // Dimensions: MEASURE.PROPERTY_TYPE.REGION.FREQ
  //   MEASURE: 1=Index Numbers, 2=% change QoQ, 3=% change YoY
  //   PROPERTY_TYPE: 1=Attached, 2=Established houses, 3=Residential property (all)
  //   REGION: 100=Weighted avg 8 cities, 1GSYD=Sydney, 2GMEL=Melbourne, etc.
  //   FREQ: Q=Quarterly
  // NOTE: RPPI does not support startPeriod filter — tool fetches all, takes most recent
  // ==========================================================================
  {
    id: "RPPI_ALL_8CITIES",
    name: "Residential Property Price Index (8 cities)",
    category: "Housing",
    source: "abs",
    sourceLabel: "ABS RPPI",
    format: "index",
    decimals: 1,
    unit: "Index 2011-12=100",
    abs: { dataflow: "RPPI", key: "1.3.100.Q", noStartPeriod: true },
  },
  {
    id: "RPPI_HOUSES_8CITIES",
    name: "Established House Price Index (8 cities)",
    category: "Housing",
    source: "abs",
    sourceLabel: "ABS RPPI",
    format: "index",
    decimals: 1,
    unit: "Index 2011-12=100",
    abs: { dataflow: "RPPI", key: "1.2.100.Q", noStartPeriod: true },
  },
  {
    id: "RPPI_YOY",
    name: "Residential Property Price Change (YoY %)",
    category: "Housing",
    source: "abs",
    sourceLabel: "ABS RPPI",
    format: "percent",
    decimals: 1,
    unit: "% change from same quarter prev year",
    abs: { dataflow: "RPPI", key: "3.3.100.Q", noStartPeriod: true },
  },
  {
    id: "MORTGAGE_RATE_SVR",
    name: "Standard Variable Mortgage Rate",
    category: "Housing",
    source: "rba-csv",
    sourceLabel: "RBA",
    format: "percent",
    decimals: 2,
    unit: "%",
    rba: { table: "f5", seriesId: "FILRHLBVS" },
  },
  {
    id: "HOUSING_CREDIT_GROWTH",
    name: "Housing Credit Growth (12M %)",
    category: "Housing",
    source: "rba-csv",
    sourceLabel: "RBA Credit Aggregates",
    format: "percent",
    decimals: 1,
    unit: "% 12-month ended growth",
    rba: { table: "d1", seriesId: "DGFACH12" },
  },
  {
    id: "INVESTOR_HOUSING_CREDIT_GROWTH",
    name: "Investor Housing Credit Growth (12M %)",
    category: "Housing",
    source: "rba-csv",
    sourceLabel: "RBA Credit Aggregates",
    format: "percent",
    decimals: 1,
    unit: "% 12-month ended growth",
    rba: { table: "d1", seriesId: "DGFACIH12" },
  },

  // ==========================================================================
  // 5. CONSUMER & FINANCE — ABS National Accounts (ANA_AGG)
  // ==========================================================================
  {
    id: "HOUSEHOLD_DEBT_INCOME",
    name: "Household Debt to Income Ratio",
    category: "Consumer",
    source: "rba",
    sourceLabel: "RBA Household Finances",
    format: "number",
    decimals: 1,
    unit: "% of annual disposable income",
    rba: { table: "e2", seriesId: "BHFDDIT" },
  },

  // ==========================================================================
  // 6. FINANCIAL MARKETS — RBA Statistical Tables
  // ==========================================================================
  {
    id: "RBA_CASH_RATE",
    name: "RBA Cash Rate Target",
    category: "Financial Markets",
    source: "rba-csv",
    sourceLabel: "RBA",
    format: "percent",
    decimals: 2,
    unit: "%",
    rba: { table: "f1", seriesId: "FIRMMCRTD" },
  },
  {
    id: "BOND_10Y",
    name: "10Y Commonwealth Bond Yield",
    category: "Financial Markets",
    source: "rba-csv",
    sourceLabel: "RBA",
    format: "percent",
    decimals: 2,
    unit: "%",
    rba: { table: "f2", seriesId: "FCMYGBAG10D" },
  },
  {
    id: "BOND_3Y",
    name: "3Y Commonwealth Bond Yield",
    category: "Financial Markets",
    source: "rba-csv",
    sourceLabel: "RBA",
    format: "percent",
    decimals: 2,
    unit: "%",
    rba: { table: "f2", seriesId: "FCMYGBAG3D" },
  },
  {
    id: "AUD_USD",
    name: "AUD/USD Exchange Rate",
    category: "Financial Markets",
    source: "rba-csv",
    sourceLabel: "RBA",
    format: "number",
    decimals: 4,
    unit: "USD per AUD",
    rba: { table: "f11", seriesId: "FXRUSD" },
  },
  {
    id: "TWI",
    name: "Trade Weighted Index (AUD)",
    category: "Financial Markets",
    source: "rba-csv",
    sourceLabel: "RBA",
    format: "index",
    decimals: 1,
    unit: "Index May 1970=100",
    rba: { table: "f11", seriesId: "FXRTWI" },
  },
  {
    id: "M3_MONEY_GROWTH",
    name: "M3 Money Supply Growth (12M %)",
    category: "Financial Markets",
    source: "rba-csv",
    sourceLabel: "RBA Financial Aggregates",
    format: "percent",
    decimals: 1,
    unit: "% 12-month ended growth",
    // d1 uses DD/MM/YYYY date format; DGFAM312 = M3 12-month growth
    rba: { table: "d1", seriesId: "DGFAM312" },
  },
  {
    id: "BUSINESS_CREDIT_GROWTH",
    name: "Business Credit Growth (12M %)",
    category: "Financial Markets",
    source: "rba-csv",
    sourceLabel: "RBA Credit Aggregates",
    format: "percent",
    decimals: 1,
    unit: "% 12-month ended growth",
    // DGFACBNF12 = Non-financial business credit 12M growth
    rba: { table: "d1", seriesId: "DGFACBNF12" },
  },

  // ==========================================================================
  // 7. TRADE & INTERNATIONAL — ABS / ANA_AGG
  // Terms of Trade in ANA_AGG: M5=Index, TTR=Terms of trade
  // ==========================================================================
  {
    id: "TERMS_OF_TRADE",
    name: "Terms of Trade Index",
    category: "Trade",
    source: "abs",
    sourceLabel: "ABS National Accounts",
    format: "index",
    decimals: 1,
    unit: "Index 2021-22=100",
    abs: { dataflow: "ANA_AGG", key: "M5.TTR.20.AUS.Q" },
  },
  {
    id: "MERCH_EXPORTS",
    name: "Merchandise Exports (Total)",
    category: "Trade",
    source: "abs",
    sourceLabel: "ABS International Trade",
    format: "thousands",
    decimals: 0,
    unit: "$K AUD",
    // MERCH_EXP dimensions: COMMODITY_SITC.COUNTRY_DEST.STATE_ORIGIN.FREQ
    // TOT=Total for all three, M=Monthly
    abs: { dataflow: "MERCH_EXP", key: "TOT.TOT.TOT.M" },
  },
  {
    id: "MERCH_IMPORTS",
    name: "Merchandise Imports (Total)",
    category: "Trade",
    source: "abs",
    sourceLabel: "ABS International Trade",
    format: "thousands",
    decimals: 0,
    unit: "$K AUD",
    abs: { dataflow: "MERCH_IMP", key: "TOT.TOT.TOT.M" },
  },

  // ==========================================================================
  // 8. GOVERNMENT & FISCAL
  // ==========================================================================
  {
    id: "NET_NATIONAL_SAVING",
    name: "Net National Saving",
    category: "Government",
    source: "abs",
    sourceLabel: "ABS National Accounts",
    format: "millions",
    decimals: 0,
    unit: "$M AUD",
    abs: { dataflow: "ANA_AGG", key: "M3.SAV.20.AUS.Q" },
  },
  {
    id: "REAL_GNI_NOM",
    name: "Real Net National Disposable Income",
    category: "Government",
    source: "abs",
    sourceLabel: "ABS National Accounts",
    format: "millions",
    decimals: 0,
    unit: "$M AUD (chain volume measures)",
    // M1=Chain volume, NNDI=Real net national disposable income
    abs: { dataflow: "ANA_AGG", key: "M1.NNDI.20.AUS.Q" },
  },
  {
    id: "AFI_LENDING_GOVT",
    name: "AFI Lending to Government Sector",
    category: "Government",
    source: "rba-csv",
    sourceLabel: "RBA Credit Aggregates",
    format: "number",
    decimals: 1,
    unit: "$B AUD",
    // d2 uses DD/MM/YYYY date format; DLCALGAFI=Lending to govt sector by AFIs
    rba: { table: "d2", seriesId: "DLCALGAFI" },
  },

  // ==========================================================================
  // 9. DEMOGRAPHICS & SOCIAL — ABS Population components (ERP_COMP_Q)
  // ERP_COMP_Q: MEASURE.REGION.FREQ
  //   MEASURE: 1=Births, 2=Deaths, 3=Natural Increase, 6=Net Internal Migration, 9=Net Overseas Migration
  //   REGION: AUS=Australia
  //   FREQ: Q=Quarterly
  // ==========================================================================
  {
    id: "NET_MIGRATION_Q",
    name: "Net Overseas Migration (Quarterly)",
    category: "Demographics",
    source: "abs",
    sourceLabel: "ABS Demographic Statistics",
    format: "number",
    decimals: 0,
    unit: "Persons",
    abs: { dataflow: "ERP_COMP_Q", key: "9.AUS.Q" },
  },

  // ==========================================================================
  // 10. ENERGY & RESOURCES — CPI sub-series + RBA commodity index
  // ==========================================================================
  {
    id: "COMMODITY_PRICES_SDR",
    name: "RBA Commodity Price Index (SDR)",
    category: "Energy",
    source: "rba-csv",
    sourceLabel: "RBA",
    format: "index",
    decimals: 1,
    unit: "Index (SDR)",
    rba: { table: "i2", seriesId: "GRCPAISDR" },
  },
];

// ============================================================================
// ABS SDMX FETCHER
// ============================================================================

interface FetchResult {
  id: string;
  value: number | null;
  period: string | null;
  error?: string;
}

async function fetchAbsMetric(metric: MetricConfig): Promise<FetchResult> {
  const cfg = metric.abs!;
  const startPeriodParam = cfg.noStartPeriod ? "" : "&startPeriod=2020";
  const url = `${ABS_BASE}/ABS,${cfg.dataflow}/${cfg.key}?format=jsondata&dimensionAtObservation=AllDimensions${startPeriodParam}`;

  const headers: Record<string, string> = {};
  if (ABS_API_KEY) headers["x-api-key"] = ABS_API_KEY;

  try {
    const res = await fetch(url, { headers });
    const text = await res.text();

    if (!res.ok) {
      return { id: metric.id, value: null, period: null, error: `HTTP ${res.status}: ${text.slice(0, 80)}` };
    }

    const json = JSON.parse(text) as any;
    const dataSets = json?.data?.dataSets;
    if (!dataSets?.length) {
      return { id: metric.id, value: null, period: null, error: "No dataSets in response" };
    }

    const observations = dataSets[0].observations;
    if (!observations || Object.keys(observations).length === 0) {
      return { id: metric.id, value: null, period: null, error: "Empty observations" };
    }

    // Get TIME_PERIOD dimension to map index → period string
    const struct = json?.data?.structures?.[0];
    const timeDim = struct?.dimensions?.observation?.find((d: any) => d.id === "TIME_PERIOD");
    const timeValues: string[] = timeDim?.values?.map((v: any) => v.id) ?? [];

    // Find the most recent observation by comparing actual period strings
    let bestKey: string | null = null;
    let bestPeriod: string | null = null;
    let bestValue: number | null = null;

    for (const [obsKey, obsData] of Object.entries(observations) as [string, any][]) {
      const timeIdx = parseInt(obsKey.split(":").pop() || "0");
      const period = timeValues[timeIdx] ?? null;
      const value = obsData?.[0];

      if (value === null || value === undefined) continue;

      if (bestPeriod === null || (period && period > bestPeriod)) {
        bestKey = obsKey;
        bestPeriod = period;
        bestValue = parseFloat(value);
      }
    }

    if (bestValue === null) {
      return { id: metric.id, value: null, period: null, error: "All observations null" };
    }

    return { id: metric.id, value: bestValue, period: bestPeriod };
  } catch (err: any) {
    return { id: metric.id, value: null, period: null, error: err.message };
  }
}

// ============================================================================
// RBA CSV FETCHER
// RBA CSV format:
//   Row 1: Table title
//   Row 2: Title (column names)
//   Row 3: Description
//   Row 4: Frequency
//   Row 5: Type
//   Row 6: Units
//   Row 7: blank
//   Row 8: Source
//   Row 9: Publication date
//   Row 10: Series ID  ← we look for this
//   Row 11+: blank or more metadata
//   Data rows: DD-Mon-YYYY, value1, value2, ...
// ============================================================================

function parseRbaDate(dateStr: string): string {
  // Format 1: "04-Jan-2011" → "2011-01-04"
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const dashMatch = dateStr.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (dashMatch) {
    const [, day, mon, year] = dashMatch;
    const mm = months[mon] ?? "01";
    return `${year}-${mm}-${day}`;
  }
  // Format 2: "31/01/1959" (DD/MM/YYYY) → "1959-01-31"
  const slashMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, mm, year] = slashMatch;
    return `${year}-${mm}-${day}`;
  }
  return dateStr;
}

async function fetchRbaMetric(metric: MetricConfig): Promise<FetchResult> {
  const cfg = metric.rba!;
  const url = `${RBA_BASE}/${cfg.table}-data.csv`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { id: metric.id, value: null, period: null, error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    const lines = text.split("\n").map(l => l.trim().replace(/^\uFEFF/, "")); // strip BOM

    let targetColIdx = -1;
    let dataStartIdx = -1;

    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      if (lines[i].startsWith("Series ID")) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        targetColIdx = cols.findIndex(c => c === cfg.seriesId);
        if (targetColIdx === -1) {
          return { id: metric.id, value: null, period: null, error: `Series ID "${cfg.seriesId}" not found in ${cfg.table}` };
        }
      }
    }

    if (targetColIdx === -1) {
      return { id: metric.id, value: null, period: null, error: `"Series ID" row not found in ${cfg.table}` };
    }

    // Find data start: first line matching DD-Mon-YYYY or DD/MM/YYYY date pattern
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^\d{2}-[A-Za-z]{3}-\d{4}/) || lines[i].match(/^\d{2}\/\d{2}\/\d{4}/)) {
        dataStartIdx = i;
        break;
      }
    }

    if (dataStartIdx === -1) {
      return { id: metric.id, value: null, period: null, error: "Could not find data rows" };
    }

    let lastValue: number | null = null;
    let lastPeriod: string | null = null;

    for (let i = dataStartIdx; i < lines.length; i++) {
      if (!lines[i]) continue;
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const rawDate = cols[0];
      const rawValue = cols[targetColIdx];

      if (!rawDate?.match(/^\d{2}-[A-Za-z]{3}-\d{4}$/) && !rawDate?.match(/^\d{2}\/\d{2}\/\d{4}$/)) continue;
      if (!rawValue) continue;

      const parsed = parseFloat(rawValue);
      if (!isNaN(parsed)) {
        const isoDate = parseRbaDate(rawDate);
        if (lastPeriod === null || isoDate > lastPeriod) {
          lastValue = parsed;
          lastPeriod = isoDate;
        }
      }
    }

    return { id: metric.id, value: lastValue, period: lastPeriod };
  } catch (err: any) {
    return { id: metric.id, value: null, period: null, error: err.message };
  }
}

// ============================================================================
// FORMATTING
// ============================================================================

function formatValue(value: number, metric: MetricConfig): string {
  const decimals = metric.decimals ?? 2;
  const v = value.toFixed(decimals);

  switch (metric.format) {
    case "percent":    return `${v}%`;
    case "currency":   return `$${v}`;
    case "billions":   return `$${v}B`;
    case "trillions":  return `$${v}T`;
    case "millions":   return `$${(value / 1).toFixed(decimals)}M`;  // already in $M from ABS
    case "thousands":  return `${v}K`;
    default:           return v;
  }
}

// ============================================================================
// OUTPUT WRITERS
// ============================================================================

interface MetricResult {
  config: MetricConfig;
  value: number | null;
  period: string | null;
  error?: string;
  fetchedAt: string;
}

function writeMarkdown(results: MetricResult[], outputPath: string): void {
  const now = new Date().toISOString().slice(0, 10);

  const byCategory: Record<string, MetricResult[]> = {};
  for (const r of results) {
    if (!byCategory[r.config.category]) byCategory[r.config.category] = [];
    byCategory[r.config.category].push(r);
  }

  const categoryOrder = [
    "Economic Output", "Inflation", "Employment", "Housing",
    "Consumer", "Financial Markets", "Trade", "Government",
    "Demographics", "Energy",
  ];

  let md = `# AU Common Metrics\n\n`;
  md += `**Updated:** ${now}\n`;
  md += `**Sources:** ABS Data API (SDMX), RBA Statistical Tables\n`;
  md += `**Metrics:** ${results.length} indicators across ${Object.keys(byCategory).length} categories\n\n`;
  md += `---\n\n`;

  for (const cat of categoryOrder) {
    const metrics = byCategory[cat];
    if (!metrics?.length) continue;

    md += `## ${cat}\n\n`;
    md += `| Metric | Value | Unit | Period | Updated | Source |\n`;
    md += `|--------|-------|------|--------|---------|--------|\n`;

    for (const r of metrics) {
      const val = r.value !== null ? formatValue(r.value, r.config) : "—";
      const period = r.period || "—";
      const updated = r.fetchedAt.slice(0, 10);
      const unit = r.config.unit || "—";
      const warn = r.error ? " ⚠️" : "";
      md += `| ${r.config.name}${warn} | ${val} | ${unit} | ${period} | ${updated} | ${r.config.sourceLabel} |\n`;
    }
    md += "\n";
  }

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    md += `## Fetch Errors (${errors.length})\n\n`;
    for (const r of errors) {
      md += `- **${r.config.name}** (\`${r.config.id}\`): ${r.error}\n`;
    }
  }

  writeFileSync(outputPath, md);
}

function writeCsv(results: MetricResult[], outputPath: string): void {
  const header = "metric_id,metric_name,value,unit,period,updated,source,dataflow\n";
  const rows = results.map(r => {
    const val = r.value !== null ? r.value.toString() : "";
    const dataflow = r.config.abs?.dataflow || r.config.rba?.table || "";
    const updated = r.fetchedAt.slice(0, 10);
    return `${r.config.id},"${r.config.name}",${val},"${r.config.unit || ""}","${r.period || ""}",${updated},${r.config.sourceLabel},${dataflow}`;
  });
  writeFileSync(outputPath, header + rows.join("\n") + "\n");
}

function appendHistorical(results: MetricResult[], histPath: string): void {
  const hasData = existsSync(histPath);
  if (!hasData) {
    appendFileSync(histPath, "fetch_timestamp,metric_id,value,period\n");
  }
  const timestamp = new Date().toISOString();
  const rows = results
    .filter(r => r.value !== null)
    .map(r => `${timestamp},${r.config.id},${r.value},${r.period || ""}`);
  if (rows.length > 0) appendFileSync(histPath, rows.join("\n") + "\n");
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: { "dry-run": { type: "boolean", default: false } },
  });
  const dryRun = values["dry-run"] as boolean;

  console.log("🇦🇺  AUMetrics — UpdateSubstrateMetrics");
  console.log(`📁  Output: ${SUBSTRATE_PATH}`);
  console.log(`📊  Metrics to fetch: ${METRICS.length}`);
  if (dryRun) console.log("🔍  DRY RUN — no files will be written");
  console.log("");

  if (!dryRun && !existsSync(SUBSTRATE_PATH)) {
    mkdirSync(SUBSTRATE_PATH, { recursive: true });
    console.log(`📁  Created directory: ${SUBSTRATE_PATH}`);
  }

  const results: MetricResult[] = [];
  const fetchedAt = new Date().toISOString();

  for (const metric of METRICS) {
    process.stdout.write(`  ${metric.name}... `);

    let result: FetchResult;
    if (metric.source === "abs") {
      result = await fetchAbsMetric(metric);
    } else {
      result = await fetchRbaMetric(metric);
    }

    const status = result.error
      ? `❌ ${result.error.slice(0, 70)}`
      : `✅ ${result.value} (${result.period})`;
    console.log(status);

    results.push({ config: metric, value: result.value, period: result.period, error: result.error, fetchedAt });
    await new Promise(r => setTimeout(r, 150));
  }

  const success = results.filter(r => r.value !== null).length;
  const failed = results.filter(r => r.error).length;
  console.log(`\n📊  Results: ${success} succeeded, ${failed} failed`);

  if (!dryRun) {
    writeMarkdown(results, join(SUBSTRATE_PATH, "AU-Common-Metrics.md"));
    writeCsv(results, join(SUBSTRATE_PATH, "au-metrics-current.csv"));
    appendHistorical(results, join(SUBSTRATE_PATH, "au-metrics-historical.csv"));
    console.log(`✅  Written to ${SUBSTRATE_PATH}`);
  } else {
    console.log("🔍  Dry run complete — no files written");
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
