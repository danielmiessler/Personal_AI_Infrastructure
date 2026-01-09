/**
 * Screening Types for jai-trading-analysis
 *
 * Type definitions for stock screening, sector analysis, and filtering criteria.
 */

import type { YahooClient, FinnhubClient } from 'jai-finance-core';

// =============================================================================
// Data Provider Types
// =============================================================================

/**
 * Union type for supported data providers
 */
export type DataProvider = YahooClient | FinnhubClient;

/**
 * Input configuration for screening operations
 */
export interface ScreenInput {
  /** Data provider instance (Yahoo or Finnhub client) */
  dataProvider: DataProvider;
  /** Optional list of tickers to screen (defaults to provider's universe) */
  universe?: string[];
  /** Maximum number of results to return */
  limit?: number;
}

// =============================================================================
// Screen Result Types
// =============================================================================

/**
 * Result from a screening operation
 */
export interface ScreenResult {
  /** Stock ticker symbol */
  ticker: string;
  /** Individual metric scores (normalized 0-100) */
  scores: Record<string, number>;
  /** Overall rank in the screened universe (1 = best) */
  rank: number;
  /** Whether the stock meets all screening criteria */
  meetsCriteria: boolean;
  /** Composite score (weighted average of individual scores) */
  compositeScore: number;
  /** Company name if available */
  companyName?: string;
  /** Sector classification */
  sector?: string;
}

/**
 * Detailed metric breakdown for a screen result
 */
export interface MetricDetail {
  /** Metric name */
  name: string;
  /** Raw value */
  value: number;
  /** Normalized score (0-100) */
  score: number;
  /** Weight used in composite calculation */
  weight: number;
  /** Threshold for passing (if applicable) */
  threshold?: number;
  /** Whether this metric passes criteria */
  passes: boolean;
}

// =============================================================================
// Sector Analysis Types
// =============================================================================

/**
 * Breakdown of screening results by sector
 */
export interface SectorBreakdown {
  /** GICS sector name */
  sector: string;
  /** Number of stocks in this sector */
  count: number;
  /** Average composite score for the sector */
  avgScore: number;
  /** List of tickers in this sector */
  tickers: string[];
  /** Best performer in the sector */
  topPerformer?: {
    ticker: string;
    score: number;
  };
  /** Worst performer in the sector */
  bottomPerformer?: {
    ticker: string;
    score: number;
  };
}

/**
 * Comparison result for a stock vs its sector
 */
export interface SectorComparison {
  /** Stock ticker */
  ticker: string;
  /** Sector the stock belongs to */
  sector: string;
  /** Percentile rank within sector (0-100, higher is better) */
  percentile: number;
  /** Metrics where stock scores above sector average */
  aboveAverage: string[];
  /** Metrics where stock scores below sector average */
  belowAverage: string[];
  /** Stock's composite score */
  stockScore: number;
  /** Sector's average composite score */
  sectorAvgScore: number;
}

// =============================================================================
// Growth Screening Criteria
// =============================================================================

/**
 * Criteria for growth stock screening
 */
export interface GrowthCriteria {
  /** Minimum revenue growth rate (YoY, decimal e.g., 0.15 = 15%) */
  minRevenueGrowth: number;
  /** Minimum earnings growth rate (YoY, decimal) */
  minEarningsGrowth: number;
  /** Minimum return on equity (decimal) */
  minROE: number;
  /** Maximum P/E ratio (absolute value) */
  maxPE: number;
  /** Maximum debt-to-equity ratio (decimal) */
  maxDebtEquity: number;
  /** Minimum operating margin (decimal, optional) */
  minOperatingMargin?: number;
  /** Minimum free cash flow growth (decimal, optional) */
  minFCFGrowth?: number;
}

/**
 * Default growth screening criteria
 */
export const DEFAULT_GROWTH_CRITERIA: GrowthCriteria = {
  minRevenueGrowth: 0.15, // 15%
  minEarningsGrowth: 0.15, // 15%
  minROE: 0.15, // 15%
  maxPE: 50,
  maxDebtEquity: 1.5,
};

// =============================================================================
// Value Screening Criteria
// =============================================================================

/**
 * Criteria for value stock screening
 */
export interface ValueCriteria {
  /** Maximum P/E ratio */
  maxPE: number;
  /** Maximum price-to-book ratio */
  maxPB: number;
  /** Minimum dividend yield (decimal e.g., 0.02 = 2%) */
  minDividendYield: number;
  /** Minimum free cash flow yield (decimal) */
  minFCFYield: number;
  /** Maximum PEG ratio (optional) */
  maxPEG?: number;
  /** Maximum price-to-sales ratio (optional) */
  maxPS?: number;
  /** Minimum current ratio (optional) */
  minCurrentRatio?: number;
}

/**
 * Default value screening criteria
 */
export const DEFAULT_VALUE_CRITERIA: ValueCriteria = {
  maxPE: 15,
  maxPB: 2,
  minDividendYield: 0.02, // 2%
  minFCFYield: 0.05, // 5%
};

// =============================================================================
// GICS Sector Classification
// =============================================================================

/**
 * GICS (Global Industry Classification Standard) Sectors
 */
export const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
] as const;

export type GICSSector = (typeof GICS_SECTORS)[number];

/**
 * Mapping of Finnhub industries to GICS sectors
 */
export const FINNHUB_TO_GICS: Record<string, GICSSector> = {
  // Energy
  'Oil & Gas': 'Energy',
  'Oil & Gas E&P': 'Energy',
  'Oil & Gas Refining & Marketing': 'Energy',
  'Oil & Gas Equipment & Services': 'Energy',

  // Materials
  Chemicals: 'Materials',
  'Construction Materials': 'Materials',
  'Metals & Mining': 'Materials',
  Paper: 'Materials',
  Steel: 'Materials',

  // Industrials
  Aerospace: 'Industrials',
  Airlines: 'Industrials',
  'Building Products': 'Industrials',
  'Commercial Services': 'Industrials',
  'Electrical Equipment': 'Industrials',
  'Engineering & Construction': 'Industrials',
  Machinery: 'Industrials',
  'Marine Shipping': 'Industrials',
  Railroads: 'Industrials',
  Transportation: 'Industrials',
  Trucking: 'Industrials',

  // Consumer Discretionary
  Apparel: 'Consumer Discretionary',
  'Auto Manufacturers': 'Consumer Discretionary',
  'Auto Parts': 'Consumer Discretionary',
  'Consumer Electronics': 'Consumer Discretionary',
  'Home Improvement': 'Consumer Discretionary',
  Homebuilders: 'Consumer Discretionary',
  Leisure: 'Consumer Discretionary',
  Lodging: 'Consumer Discretionary',
  Restaurants: 'Consumer Discretionary',
  Retail: 'Consumer Discretionary',
  'Retail - Apparel': 'Consumer Discretionary',
  'Retail - Cyclical': 'Consumer Discretionary',

  // Consumer Staples
  Beverages: 'Consumer Staples',
  'Consumer Products': 'Consumer Staples',
  Food: 'Consumer Staples',
  'Food & Beverages': 'Consumer Staples',
  'Food & Drug Retailers': 'Consumer Staples',
  'Household Products': 'Consumer Staples',
  Tobacco: 'Consumer Staples',

  // Health Care
  Biotechnology: 'Health Care',
  'Drug Manufacturers': 'Health Care',
  'Health Care': 'Health Care',
  'Health Care Equipment': 'Health Care',
  'Health Care Facilities': 'Health Care',
  'Health Care Plans': 'Health Care',
  'Medical Devices': 'Health Care',
  'Medical Instruments': 'Health Care',
  Pharmaceuticals: 'Health Care',

  // Financials
  Banks: 'Financials',
  'Banks - Regional': 'Financials',
  'Capital Markets': 'Financials',
  'Financial Services': 'Financials',
  Insurance: 'Financials',
  'Insurance - Diversified': 'Financials',
  'Insurance - Life': 'Financials',
  'Insurance - Property & Casualty': 'Financials',

  // Information Technology
  'Application Software': 'Information Technology',
  'Communication Equipment': 'Information Technology',
  'Computer Hardware': 'Information Technology',
  'Consumer Digital Services': 'Information Technology',
  'Electronic Components': 'Information Technology',
  'Information Technology': 'Information Technology',
  'Internet Software': 'Information Technology',
  'IT Services': 'Information Technology',
  Semiconductors: 'Information Technology',
  Software: 'Information Technology',
  'Software - Application': 'Information Technology',
  'Software - Infrastructure': 'Information Technology',
  Technology: 'Information Technology',
  'Tech Hardware': 'Information Technology',

  // Communication Services
  Advertising: 'Communication Services',
  Broadcasting: 'Communication Services',
  'Communication Services': 'Communication Services',
  Entertainment: 'Communication Services',
  'Interactive Media': 'Communication Services',
  Media: 'Communication Services',
  Publishing: 'Communication Services',
  Telecom: 'Communication Services',
  Telecommunications: 'Communication Services',

  // Utilities
  Utilities: 'Utilities',
  'Utilities - Diversified': 'Utilities',
  'Utilities - Electric': 'Utilities',
  'Utilities - Gas': 'Utilities',
  'Utilities - Water': 'Utilities',

  // Real Estate
  'Real Estate': 'Real Estate',
  'Real Estate Services': 'Real Estate',
  REITs: 'Real Estate',
  'REITs - Diversified': 'Real Estate',
  'REITs - Healthcare': 'Real Estate',
  'REITs - Office': 'Real Estate',
  'REITs - Residential': 'Real Estate',
  'REITs - Retail': 'Real Estate',
};

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Configuration for score normalization
 */
export interface NormalizationConfig {
  /** Minimum raw value (maps to 0 or 100 depending on higherIsBetter) */
  min: number;
  /** Maximum raw value (maps to 100 or 0 depending on higherIsBetter) */
  max: number;
  /** Whether higher raw values should map to higher scores */
  higherIsBetter: boolean;
}

/**
 * Metric weight configuration for composite scoring
 */
export interface MetricWeights {
  [metricName: string]: number;
}
