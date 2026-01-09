/**
 * Value Stock Screener for jai-trading-analysis
 *
 * Screens stocks based on value criteria including P/E, P/B,
 * dividend yield, and free cash flow yield.
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
  ValueCriteria,
  MetricWeights,
} from './types';

import { DEFAULT_VALUE_CRITERIA } from './types';

/**
 * Internal structure for value metrics
 */
interface ValueMetrics {
  ticker: string;
  companyName?: string;
  sector?: string;
  pe: number;
  pb: number;
  dividendYield: number;
  fcfYield: number;
  peg: number;
  ps: number;
  currentRatio: number;
  ev_ebitda: number;
}

/**
 * Default weights for value score calculation
 */
const DEFAULT_VALUE_WEIGHTS: MetricWeights = {
  pe: 0.2,
  pb: 0.15,
  dividendYield: 0.2,
  fcfYield: 0.2,
  peg: 0.1,
  ps: 0.05,
  currentRatio: 0.05,
  ev_ebitda: 0.05,
};

/**
 * ValueScreener class for identifying undervalued stocks
 *
 * Screens for stocks with low valuations, high dividend yields,
 * and strong free cash flow generation.
 */
export class ValueScreener {
  private readonly dataProvider: DataProvider;
  private readonly criteria: ValueCriteria;
  private readonly weights: MetricWeights;
  private readonly isYahoo: boolean;

  /**
   * Create a new ValueScreener
   *
   * @param dataProvider - Yahoo or Finnhub client for data fetching
   * @param criteria - Optional custom screening criteria
   * @param weights - Optional custom metric weights
   */
  constructor(
    dataProvider: DataProvider,
    criteria?: Partial<ValueCriteria>,
    weights?: Partial<MetricWeights>
  ) {
    this.dataProvider = dataProvider;
    this.criteria = { ...DEFAULT_VALUE_CRITERIA, ...criteria };
    // Merge weights, filtering out undefined values from partial
    const mergedWeights = { ...DEFAULT_VALUE_WEIGHTS };
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
   * Screen a universe of stocks for value characteristics
   *
   * @param universe - Array of ticker symbols to screen
   * @returns Array of screen results sorted by composite score (descending)
   */
  async screen(universe?: string[]): Promise<ScreenResult[]> {
    if (!universe || universe.length === 0) {
      throw new Error(
        'ValueScreener.screen() requires a universe of tickers to screen'
      );
    }

    // Fetch metrics for all tickers in parallel
    const metricsResults = await Promise.allSettled(
      universe.map((ticker) => this.fetchValueMetrics(ticker))
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
   * Get top value stocks from a universe
   *
   * @param universe - Array of ticker symbols to screen
   * @param limit - Maximum results to return (default: 10)
   * @returns Top value stocks sorted by score
   */
  async topValue(universe: string[], limit: number = 10): Promise<ScreenResult[]> {
    const results = await this.screen(universe);
    return results.slice(0, limit);
  }

  /**
   * Screen and filter to only stocks meeting all criteria
   *
   * @param universe - Array of ticker symbols to screen
   * @returns Stocks that meet all value criteria
   */
  async screenQualified(universe: string[]): Promise<ScreenResult[]> {
    const results = await this.screen(universe);
    return results.filter((r) => r.meetsCriteria);
  }

  /**
   * Get the current screening criteria
   */
  getCriteria(): ValueCriteria {
    return { ...this.criteria };
  }

  /**
   * Fetch value metrics for a single ticker
   */
  private async fetchValueMetrics(ticker: string): Promise<ValueMetrics | null> {
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
  private async fetchYahooMetrics(ticker: string): Promise<ValueMetrics> {
    const client = this.dataProvider as YahooClient;
    const fundamentals: YahooFundamentals = await client.getFundamentals(ticker);

    // Calculate FCF yield: FCF / Market Cap
    const fcfYield =
      fundamentals.marketCap > 0 && fundamentals.freeCashflow
        ? fundamentals.freeCashflow / fundamentals.marketCap
        : 0;

    return {
      ticker,
      companyName: undefined,
      pe: fundamentals.trailingPE ?? 0,
      pb: fundamentals.priceToBook ?? 0,
      dividendYield: fundamentals.dividendYield ?? 0,
      fcfYield,
      peg: fundamentals.pegRatio ?? 0,
      ps: fundamentals.priceToSalesTrailing12Months ?? 0,
      currentRatio: fundamentals.currentRatio ?? 0,
      ev_ebitda: fundamentals.enterpriseToEbitda ?? 0,
    };
  }

  /**
   * Fetch metrics from Finnhub
   */
  private async fetchFinnhubMetrics(ticker: string): Promise<ValueMetrics> {
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

    // Calculate FCF yield from EV/FCF (inverse)
    const evFcf = m.currentEv_freeCashFlowTTM ?? m.currentEv_freeCashFlowAnnual ?? 0;
    const fcfYield = evFcf > 0 ? 1 / evFcf : 0;

    return {
      ticker,
      companyName,
      pe: m.peTTM ?? m.peAnnual ?? 0,
      pb: m.pbQuarterly ?? m.pbAnnual ?? 0,
      dividendYield: (m.currentDividendYieldTTM ?? 0) / 100,
      fcfYield,
      peg: 0, // Not available in basic Finnhub metrics
      ps: m.psTTM ?? m.psAnnual ?? 0,
      currentRatio: m.currentRatioQuarterly ?? m.currentRatioAnnual ?? 0,
      ev_ebitda: 0, // Not directly available in basic metrics
    };
  }

  /**
   * Calculate individual metric scores (0-100 scale)
   */
  private calculateScores(metrics: ValueMetrics): Record<string, number> {
    const scores: Record<string, number> = {};

    // P/E Score (lower is better)
    // 30+ = 0, 5 or below = 100
    scores.pe =
      metrics.pe > 0
        ? this.normalizeScore(metrics.pe, 30, 5, false)
        : 50; // Neutral for negative earnings

    // P/B Score (lower is better)
    // 5+ = 0, 0.5 or below = 100
    scores.pb =
      metrics.pb > 0
        ? this.normalizeScore(metrics.pb, 5, 0.5, false)
        : 50; // Neutral for negative book value

    // Dividend Yield Score (higher is better)
    // 0% = 0, 6%+ = 100
    scores.dividendYield = this.normalizeScore(
      metrics.dividendYield,
      0,
      0.06,
      true
    );

    // FCF Yield Score (higher is better)
    // 0% = 0, 10%+ = 100
    scores.fcfYield = this.normalizeScore(metrics.fcfYield, 0, 0.1, true);

    // PEG Score (lower is better)
    // 3+ = 0, 0.5 or below = 100
    scores.peg =
      metrics.peg > 0
        ? this.normalizeScore(metrics.peg, 3, 0.5, false)
        : 50; // Neutral if not available

    // P/S Score (lower is better)
    // 10+ = 0, 1 or below = 100
    scores.ps =
      metrics.ps > 0
        ? this.normalizeScore(metrics.ps, 10, 1, false)
        : 50;

    // Current Ratio Score (higher is better, but not too high)
    // Optimal range: 1.5-3.0
    // Below 1.0 = 0, 1.5-3.0 = 100, above 3.0 declines
    if (metrics.currentRatio < 1) {
      scores.currentRatio = metrics.currentRatio * 50;
    } else if (metrics.currentRatio <= 3) {
      scores.currentRatio = Math.min(100, 50 + (metrics.currentRatio - 1) * 25);
    } else {
      scores.currentRatio = Math.max(50, 100 - (metrics.currentRatio - 3) * 10);
    }

    // EV/EBITDA Score (lower is better)
    // 20+ = 0, 6 or below = 100
    scores.ev_ebitda =
      metrics.ev_ebitda > 0
        ? this.normalizeScore(metrics.ev_ebitda, 20, 6, false)
        : 50;

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
   * Check if metrics meet all value criteria
   */
  private checkCriteria(metrics: ValueMetrics): boolean {
    // P/E check (skip if no earnings / negative P/E)
    if (metrics.pe > 0 && metrics.pe > this.criteria.maxPE) {
      return false;
    }

    // P/B check (skip if negative book value)
    if (metrics.pb > 0 && metrics.pb > this.criteria.maxPB) {
      return false;
    }

    // Dividend yield check
    if (metrics.dividendYield < this.criteria.minDividendYield) {
      return false;
    }

    // FCF yield check
    if (metrics.fcfYield < this.criteria.minFCFYield) {
      return false;
    }

    // Optional: PEG check
    if (
      this.criteria.maxPEG !== undefined &&
      metrics.peg > 0 &&
      metrics.peg > this.criteria.maxPEG
    ) {
      return false;
    }

    // Optional: P/S check
    if (
      this.criteria.maxPS !== undefined &&
      metrics.ps > 0 &&
      metrics.ps > this.criteria.maxPS
    ) {
      return false;
    }

    // Optional: Current ratio check
    if (
      this.criteria.minCurrentRatio !== undefined &&
      metrics.currentRatio < this.criteria.minCurrentRatio
    ) {
      return false;
    }

    return true;
  }
}
