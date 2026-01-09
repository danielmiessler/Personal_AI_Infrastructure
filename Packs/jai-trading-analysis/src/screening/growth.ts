/**
 * Growth Stock Screener for jai-trading-analysis
 *
 * Screens stocks based on growth criteria including revenue growth,
 * earnings growth, ROE, and sustainable growth characteristics.
 */

import type {
  YahooClient,
  FinnhubClient,
  YahooFundamentals,
  FinnhubFinancials,
} from 'jai-finance-core';

import type {
  DataProvider,
  ScreenResult,
  GrowthCriteria,
  MetricWeights,
} from './types';

import { DEFAULT_GROWTH_CRITERIA } from './types';

/**
 * Internal structure for growth metrics
 */
interface GrowthMetrics {
  ticker: string;
  companyName?: string;
  sector?: string;
  revenueGrowth: number;
  earningsGrowth: number;
  roe: number;
  pe: number;
  debtToEquity: number;
  operatingMargin: number;
  fcfGrowth: number;
}

/**
 * Default weights for growth score calculation
 */
const DEFAULT_GROWTH_WEIGHTS: MetricWeights = {
  revenueGrowth: 0.25,
  earningsGrowth: 0.25,
  roe: 0.2,
  pe: 0.1,
  debtToEquity: 0.1,
  operatingMargin: 0.05,
  fcfGrowth: 0.05,
};

/**
 * GrowthScreener class for identifying high-growth stocks
 *
 * Screens for stocks with strong revenue and earnings growth,
 * high return on equity, and manageable valuations.
 */
export class GrowthScreener {
  private readonly dataProvider: DataProvider;
  private readonly criteria: GrowthCriteria;
  private readonly weights: MetricWeights;
  private readonly isYahoo: boolean;

  /**
   * Create a new GrowthScreener
   *
   * @param dataProvider - Yahoo or Finnhub client for data fetching
   * @param criteria - Optional custom screening criteria
   * @param weights - Optional custom metric weights
   */
  constructor(
    dataProvider: DataProvider,
    criteria?: Partial<GrowthCriteria>,
    weights?: Partial<MetricWeights>
  ) {
    this.dataProvider = dataProvider;
    this.criteria = { ...DEFAULT_GROWTH_CRITERIA, ...criteria };
    // Merge weights, filtering out undefined values from partial
    const mergedWeights = { ...DEFAULT_GROWTH_WEIGHTS };
    if (weights) {
      for (const [key, value] of Object.entries(weights)) {
        if (value !== undefined) {
          mergedWeights[key] = value;
        }
      }
    }
    this.weights = mergedWeights;
    this.isYahoo = 'getFundamentals' in dataProvider;
  }

  /**
   * Screen a universe of stocks for growth characteristics
   *
   * @param universe - Array of ticker symbols to screen
   * @returns Array of screen results sorted by composite score (descending)
   */
  async screen(universe?: string[]): Promise<ScreenResult[]> {
    if (!universe || universe.length === 0) {
      throw new Error(
        'GrowthScreener.screen() requires a universe of tickers to screen'
      );
    }

    // Fetch metrics for all tickers in parallel
    const metricsResults = await Promise.allSettled(
      universe.map((ticker) => this.fetchGrowthMetrics(ticker))
    );

    // Process results and calculate scores
    const results: ScreenResult[] = [];

    for (const result of metricsResults) {
      if (result.status === 'fulfilled' && result.value) {
        const metrics = result.value;
        const scores = this.calculateScores(metrics);
        const compositeScore = this.calculateCompositeScore(scores);
        const meetsCriteria = this.checkCriteria(metrics);

        results.push({
          ticker: metrics.ticker,
          scores,
          rank: 0, // Set after sorting
          meetsCriteria,
          compositeScore,
          companyName: metrics.companyName,
          sector: metrics.sector,
        });
      }
    }

    // Sort by composite score descending
    results.sort((a, b) => b.compositeScore - a.compositeScore);

    // Assign ranks
    for (let i = 0; i < results.length; i++) {
      results[i].rank = i + 1;
    }

    return results;
  }

  /**
   * Get top growth stocks from a universe
   *
   * @param universe - Array of ticker symbols to screen
   * @param limit - Maximum results to return (default: 10)
   * @returns Top growth stocks sorted by score
   */
  async topGrowth(universe: string[], limit: number = 10): Promise<ScreenResult[]> {
    const results = await this.screen(universe);
    return results.slice(0, limit);
  }

  /**
   * Screen and filter to only stocks meeting all criteria
   *
   * @param universe - Array of ticker symbols to screen
   * @returns Stocks that meet all growth criteria
   */
  async screenQualified(universe: string[]): Promise<ScreenResult[]> {
    const results = await this.screen(universe);
    return results.filter((r) => r.meetsCriteria);
  }

  /**
   * Get the current screening criteria
   */
  getCriteria(): GrowthCriteria {
    return { ...this.criteria };
  }

  /**
   * Fetch growth metrics for a single ticker
   */
  private async fetchGrowthMetrics(ticker: string): Promise<GrowthMetrics | null> {
    try {
      if (this.isYahoo) {
        return await this.fetchYahooMetrics(ticker);
      } else {
        return await this.fetchFinnhubMetrics(ticker);
      }
    } catch {
      return null;
    }
  }

  /**
   * Fetch metrics from Yahoo Finance
   */
  private async fetchYahooMetrics(ticker: string): Promise<GrowthMetrics> {
    const client = this.dataProvider as YahooClient;
    const fundamentals: YahooFundamentals = await client.getFundamentals(ticker);

    return {
      ticker,
      companyName: undefined, // Yahoo getFundamentals doesn't include name
      revenueGrowth: fundamentals.revenueGrowth ?? 0,
      earningsGrowth: fundamentals.earningsGrowth ?? 0,
      roe: fundamentals.returnOnEquity ?? 0,
      pe: fundamentals.trailingPE ?? 0,
      debtToEquity: (fundamentals.debtToEquity ?? 0) / 100,
      operatingMargin: fundamentals.operatingMargins ?? 0,
      fcfGrowth: 0, // Not directly available from Yahoo
    };
  }

  /**
   * Fetch metrics from Finnhub
   */
  private async fetchFinnhubMetrics(ticker: string): Promise<GrowthMetrics> {
    const client = this.dataProvider as FinnhubClient;
    const financials: FinnhubFinancials = await client.getFinancials(ticker);
    const m = financials.metric;

    // Try to get profile for company name
    let companyName: string | undefined;
    try {
      const profile = await client.getProfile(ticker);
      companyName = profile.name;
    } catch {
      // Profile fetch failed, continue without name
    }

    return {
      ticker,
      companyName,
      // Finnhub basic metrics don't include growth rates directly
      // Would need to calculate from historical data or use premium endpoint
      revenueGrowth: 0,
      earningsGrowth: 0,
      roe: (m.roeTTM ?? m.roeAnnual ?? 0) / 100,
      pe: m.peTTM ?? m.peAnnual ?? 0,
      debtToEquity:
        (m.totalDebt_totalEquityQuarterly ?? m.totalDebt_totalEquityAnnual ?? 0) /
        100,
      operatingMargin: 0, // Not in basic metrics
      fcfGrowth: 0,
    };
  }

  /**
   * Calculate individual metric scores (0-100 scale)
   */
  private calculateScores(metrics: GrowthMetrics): Record<string, number> {
    const scores: Record<string, number> = {};

    // Revenue Growth Score (higher is better)
    // 0% = 0, 30%+ = 100
    scores.revenueGrowth = this.normalizeScore(
      metrics.revenueGrowth,
      0,
      0.3,
      true
    );

    // Earnings Growth Score (higher is better)
    // 0% = 0, 30%+ = 100
    scores.earningsGrowth = this.normalizeScore(
      metrics.earningsGrowth,
      0,
      0.3,
      true
    );

    // ROE Score (higher is better)
    // 0% = 0, 25%+ = 100
    scores.roe = this.normalizeScore(metrics.roe, 0, 0.25, true);

    // P/E Score (lower is better for growth at reasonable price)
    // 50+ = 0, 10 or below = 100
    scores.pe =
      metrics.pe > 0
        ? this.normalizeScore(metrics.pe, 50, 10, false)
        : 50; // Neutral for negative earnings

    // Debt/Equity Score (lower is better)
    // 2+ = 0, 0 = 100
    scores.debtToEquity =
      metrics.debtToEquity >= 0
        ? this.normalizeScore(metrics.debtToEquity, 2, 0, false)
        : 50; // Neutral for negative equity

    // Operating Margin Score (higher is better)
    // 0% = 0, 25%+ = 100
    scores.operatingMargin = this.normalizeScore(
      metrics.operatingMargin,
      0,
      0.25,
      true
    );

    // FCF Growth Score (higher is better)
    // -10% = 0, 30%+ = 100
    scores.fcfGrowth = this.normalizeScore(metrics.fcfGrowth, -0.1, 0.3, true);

    return scores;
  }

  /**
   * Normalize a metric value to 0-100 scale
   */
  private normalizeScore(
    value: number,
    min: number,
    max: number,
    higherIsBetter: boolean
  ): number {
    if (higherIsBetter) {
      if (value <= min) return 0;
      if (value >= max) return 100;
      return ((value - min) / (max - min)) * 100;
    } else {
      if (value >= min) return 0;
      if (value <= max) return 100;
      return ((min - value) / (min - max)) * 100;
    }
  }

  /**
   * Calculate weighted composite score
   */
  private calculateCompositeScore(scores: Record<string, number>): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const [metric, weight] of Object.entries(this.weights)) {
      if (scores[metric] !== undefined) {
        weightedSum += scores[metric] * weight;
        totalWeight += weight;
      }
    }

    const composite = totalWeight > 0 ? weightedSum / totalWeight : 0;
    return Math.round(composite * 100) / 100;
  }

  /**
   * Check if metrics meet all growth criteria
   */
  private checkCriteria(metrics: GrowthMetrics): boolean {
    // Revenue growth check
    if (metrics.revenueGrowth < this.criteria.minRevenueGrowth) {
      return false;
    }

    // Earnings growth check
    if (metrics.earningsGrowth < this.criteria.minEarningsGrowth) {
      return false;
    }

    // ROE check
    if (metrics.roe < this.criteria.minROE) {
      return false;
    }

    // P/E check (skip if no earnings / negative P/E)
    if (metrics.pe > 0 && metrics.pe > this.criteria.maxPE) {
      return false;
    }

    // Debt/Equity check (skip if negative equity)
    if (metrics.debtToEquity >= 0 && metrics.debtToEquity > this.criteria.maxDebtEquity) {
      return false;
    }

    // Optional: Operating margin check
    if (
      this.criteria.minOperatingMargin !== undefined &&
      metrics.operatingMargin < this.criteria.minOperatingMargin
    ) {
      return false;
    }

    // Optional: FCF growth check
    if (
      this.criteria.minFCFGrowth !== undefined &&
      metrics.fcfGrowth < this.criteria.minFCFGrowth
    ) {
      return false;
    }

    return true;
  }
}
