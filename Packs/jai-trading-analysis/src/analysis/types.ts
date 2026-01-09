/**
 * Analysis Module - Type Definitions
 *
 * Types for stock analysis pipeline, stages, and results.
 */

import type { Policy } from 'jai-finance-core';

// =============================================================================
// Verdict Types
// =============================================================================

/** Final analysis verdict for a stock */
export type AnalysisVerdict = 'BUY' | 'MODERATE_RISK' | 'HIGH_RISK' | 'AVOID';

// =============================================================================
// Analysis Input/Output
// =============================================================================

/**
 * Input for the analysis pipeline
 */
export interface AnalysisInput {
  /** Stock ticker symbol */
  ticker: string;
  /** Data provider interface for fetching market data */
  dataProvider: AnalysisDataProvider;
  /** Investment policy for rule references */
  policy: Policy;
}

/**
 * Result of the full analysis pipeline
 */
export interface AnalysisResult {
  /** Stock ticker symbol */
  ticker: string;
  /** Final verdict */
  verdict: AnalysisVerdict;
  /** Individual stage results */
  stages: AnalysisStage[];
  /** Recommendations based on analysis */
  recommendations: AnalysisRecommendation[];
  /** Timestamp of analysis */
  analyzedAt: Date;
  /** Overall confidence score (0-100) */
  confidenceScore: number;
}

/**
 * Individual stage result
 */
export interface AnalysisStage {
  /** Stage name (e.g., "dealbreakers", "yellowFlags", "positiveFactors", "fScore") */
  name: string;
  /** Whether the stage passed */
  passed: boolean;
  /** Score for the stage (interpretation varies by stage) */
  score: number;
  /** Detailed findings */
  details: string[];
  /** Reference to policy rule ID if applicable */
  policyRuleId?: string;
}

/**
 * Recommendation generated from analysis
 */
export interface AnalysisRecommendation {
  /** Type of recommendation */
  type: 'action' | 'warning' | 'info';
  /** Short summary */
  summary: string;
  /** Detailed explanation */
  detail: string;
  /** Reference to policy rule ID */
  policyRuleId?: string;
  /** Priority (1 = highest) */
  priority: number;
}

// =============================================================================
// Dealbreakers Result
// =============================================================================

/** Dealbreaker check identifiers */
export type DealbreakerId =
  | 'SEC_INVESTIGATION'
  | 'RECENT_RESTATEMENT'
  | 'AUDITOR_CHANGE'
  | 'SIGNIFICANT_DILUTION'
  | 'GOING_CONCERN'
  | 'MAJOR_IMPAIRMENT'
  | 'DIVIDEND_CUT'
  | 'DEBT_COVENANT_VIOLATION'
  | 'INSIDER_DUMPING'
  | 'REVENUE_CLIFF'
  | 'NEGATIVE_FCF_TREND';

/**
 * Result of dealbreaker checks
 */
export interface DealbreakersResult {
  /** Whether all dealbreaker checks passed (no dealbreakers found) */
  passed: boolean;
  /** List of failed dealbreaker check IDs */
  failed: DealbreakerId[];
  /** List of all checked dealbreaker IDs */
  checked: DealbreakerId[];
  /** Detailed findings for each check */
  details: DealbreakersDetail[];
}

/**
 * Detail for a single dealbreaker check
 */
export interface DealbreakersDetail {
  /** Dealbreaker identifier */
  id: DealbreakerId;
  /** Human-readable name */
  name: string;
  /** Whether this specific check passed */
  passed: boolean;
  /** Description of finding */
  finding: string;
  /** Supporting data points */
  evidence?: string[];
}

// =============================================================================
// Yellow Flags Result
// =============================================================================

/** Yellow flag check identifiers */
export type YellowFlagId =
  | 'HIGH_PE'
  | 'DECLINING_MARGINS'
  | 'REVENUE_DECELERATION'
  | 'INVENTORY_BUILDUP'
  | 'RECEIVABLES_GROWTH'
  | 'EXECUTIVE_DEPARTURES'
  | 'GUIDANCE_LOWERED'
  | 'SHORT_INTEREST_HIGH';

/**
 * Yellow flag definition with weight
 */
export interface YellowFlag {
  /** Flag identifier */
  id: YellowFlagId;
  /** Human-readable name */
  name: string;
  /** Weight in final score (0-100, all weights should sum to 100+) */
  weight: number;
  /** Whether this flag was triggered */
  triggered: boolean;
  /** Description of finding */
  finding?: string;
}

/**
 * Result of yellow flag analysis
 */
export interface YellowFlagsResult {
  /** Weighted score (0-100, lower is better - fewer warning signals) */
  score: number;
  /** Individual flag results */
  flags: YellowFlag[];
  /** Count of triggered flags */
  triggeredCount: number;
  /** Total possible weight of triggered flags */
  triggeredWeight: number;
}

// =============================================================================
// Positive Factors Result
// =============================================================================

/** Positive factor identifiers */
export type PositiveFactorId =
  | 'STRONG_MOAT'
  | 'RECURRING_REVENUE'
  | 'PRICING_POWER'
  | 'MARGIN_EXPANSION'
  | 'NEW_PRODUCT_CYCLE'
  | 'INSIDER_BUYING'
  | 'DIVIDEND_GROWTH'
  | 'SHARE_BUYBACKS';

/**
 * Positive factor definition with weight
 */
export interface PositiveFactor {
  /** Factor identifier */
  id: PositiveFactorId;
  /** Human-readable name */
  name: string;
  /** Weight in final score */
  weight: number;
  /** Whether this factor is present */
  present: boolean;
  /** Description of finding */
  finding?: string;
}

/**
 * Result of positive factor analysis
 */
export interface PositiveFactorsResult {
  /** Weighted score (0-100, higher is better) */
  score: number;
  /** Individual factor results */
  factors: PositiveFactor[];
  /** Count of present factors */
  presentCount: number;
  /** Total weight of present factors */
  presentWeight: number;
}

// =============================================================================
// F-Score Result
// =============================================================================

/** Piotroski F-Score component identifiers */
export type FScoreComponentId =
  | 'ROA_POSITIVE'
  | 'OPERATING_CASH_FLOW_POSITIVE'
  | 'ROA_IMPROVING'
  | 'CASH_FLOW_GT_NET_INCOME'
  | 'LONG_TERM_DEBT_DECREASING'
  | 'CURRENT_RATIO_IMPROVING'
  | 'NO_SHARE_DILUTION'
  | 'GROSS_MARGIN_IMPROVING'
  | 'ASSET_TURNOVER_IMPROVING';

/**
 * F-Score component result
 */
export interface FScoreComponent {
  /** Component identifier */
  id: FScoreComponentId;
  /** Human-readable name */
  name: string;
  /** Whether this component passed (adds 1 to score) */
  passed: boolean;
  /** Current period value */
  currentValue?: number;
  /** Prior period value for comparison */
  priorValue?: number;
}

/**
 * Result of Piotroski F-Score calculation
 */
export interface FScoreResult {
  /** F-Score (0-9) */
  score: number;
  /** Individual component results */
  components: FScoreComponent[];
  /** Interpretation of the score */
  interpretation: FScoreInterpretation;
}

/** F-Score interpretation */
export type FScoreInterpretation =
  | 'STRONG'    // 8-9
  | 'MODERATE'  // 5-7
  | 'WEAK'      // 3-4
  | 'AVOID';    // 0-2

// =============================================================================
// Data Provider Interface
// =============================================================================

/**
 * Abstract interface for analysis data providers.
 * Implementations can wrap Finnhub, Yahoo, SEC clients.
 * Named AnalysisDataProvider to avoid conflict with screening DataProvider.
 */
export interface AnalysisDataProvider {
  /** Get current quote data */
  getQuote(ticker: string): Promise<QuoteData>;

  /** Get company profile */
  getProfile(ticker: string): Promise<ProfileData>;

  /** Get financial metrics */
  getFinancials(ticker: string): Promise<FinancialsData>;

  /** Get insider transactions */
  getInsiderTransactions(ticker: string): Promise<InsiderTransaction[]>;

  /** Get SEC filings */
  getSECFilings(ticker: string): Promise<SECFilingData[]>;

  /** Get company news */
  getNews(ticker: string): Promise<NewsItem[]>;

  /** Get price history */
  getPriceHistory(
    ticker: string,
    period: '1y' | '2y' | '5y'
  ): Promise<PriceHistoryData>;
}

// =============================================================================
// Normalized Data Types (Provider-agnostic)
// =============================================================================

export interface QuoteData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  timestamp: Date;
}

export interface ProfileData {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  country: string;
  marketCap: number;
  employees?: number;
  description?: string;
}

export interface FinancialsData {
  ticker: string;
  // Profitability
  roa: number;
  roe: number;
  roaTTM?: number;
  roePriorYear?: number;
  netProfitMargin: number;
  grossMargin: number;
  grossMarginPriorYear?: number;
  operatingMargin: number;
  operatingMarginPriorYear?: number;
  // Valuation
  peRatio: number;
  pbRatio: number;
  psRatio: number;
  evToEbitda?: number;
  // Growth
  revenueGrowth: number;
  revenueGrowthPriorYear?: number;
  earningsGrowth: number;
  // Cash Flow
  freeCashFlow: number;
  freeCashFlowPriorYear?: number;
  freeCashFlow2YearsAgo?: number;
  operatingCashFlow: number;
  netIncome: number;
  // Balance Sheet
  currentRatio: number;
  currentRatioPriorYear?: number;
  debtToEquity: number;
  totalDebt: number;
  totalDebtPriorYear?: number;
  totalCash: number;
  // Shares
  sharesOutstanding: number;
  sharesOutstandingPriorYear?: number;
  // Dividends
  dividendYield?: number;
  dividendGrowth5Y?: number;
  payoutRatio?: number;
  // Other
  beta: number;
  shortRatio?: number;
  shortPercentOfFloat?: number;
  // Asset metrics
  totalAssets?: number;
  totalAssetsPriorYear?: number;
  revenue?: number;
  revenuePriorYear?: number;
}

export interface InsiderTransaction {
  name: string;
  title: string;
  transactionType: 'BUY' | 'SELL' | 'OPTION_EXERCISE' | 'OTHER';
  shares: number;
  price: number;
  value: number;
  date: Date;
  sharesOwnedAfter?: number;
}

export interface SECFilingData {
  form: string;
  filingDate: Date;
  description: string;
  url: string;
  items?: string[];
}

export interface NewsItem {
  headline: string;
  source: string;
  publishedAt: Date;
  url: string;
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface PriceHistoryData {
  ticker: string;
  prices: PricePoint[];
  period: string;
}

export interface PricePoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
