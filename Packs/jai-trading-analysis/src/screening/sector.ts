/**
 * Sector Screener for jai-trading-analysis
 *
 * Analyzes stocks by GICS sector classification and provides
 * sector-relative comparisons.
 */

import type {
  YahooClient,
  FinnhubClient,
  YahooFundamentals,
  FinnhubFinancials,
  FinnhubProfile,
} from 'jai-finance-core';

import type {
  DataProvider,
  ScreenResult,
  SectorBreakdown,
  SectorComparison,
  GICSSector,
} from './types';

import { GICS_SECTORS, FINNHUB_TO_GICS } from './types';

/**
 * Metric data extracted from different provider responses
 */
interface NormalizedMetrics {
  ticker: string;
  companyName: string;
  sector: GICSSector;
  pe: number;
  pb: number;
  roe: number;
  revenueGrowth: number;
  earningsGrowth: number;
  debtToEquity: number;
  dividendYield: number;
  profitMargin: number;
}

/**
 * Sector-level statistics for comparison
 */
interface SectorStats {
  avgPE: number;
  avgPB: number;
  avgROE: number;
  avgRevenueGrowth: number;
  avgEarningsGrowth: number;
  avgDebtToEquity: number;
  avgDividendYield: number;
  avgProfitMargin: number;
}

/**
 * SectorScreener class for sector-based stock analysis
 *
 * Uses GICS sector classification to group and compare stocks.
 */
export class SectorScreener {
  private readonly dataProvider: DataProvider;
  private readonly isYahoo: boolean;

  constructor(dataProvider: DataProvider) {
    this.dataProvider = dataProvider;
    this.isYahoo = 'getFundamentals' in dataProvider;
  }

  /**
   * Analyze stocks and group by sector
   *
   * @param tickers - Array of stock symbols to analyze
   * @returns Array of sector breakdowns sorted by average score
   */
  async analyzeSectors(tickers: string[]): Promise<SectorBreakdown[]> {
    // Fetch metrics for all tickers
    const metricsResults = await Promise.allSettled(
      tickers.map((ticker) => this.fetchMetrics(ticker))
    );

    // Filter successful results
    const metrics: NormalizedMetrics[] = [];
    for (const result of metricsResults) {
      if (result.status === 'fulfilled' && result.value) {
        metrics.push(result.value);
      }
    }

    // Group by sector
    const sectorGroups = new Map<GICSSector, NormalizedMetrics[]>();

    for (const metric of metrics) {
      const existing = sectorGroups.get(metric.sector) ?? [];
      existing.push(metric);
      sectorGroups.set(metric.sector, existing);
    }

    // Calculate breakdowns
    const breakdowns: SectorBreakdown[] = [];

    for (const [sector, sectorMetrics] of Array.from(sectorGroups.entries())) {
      const scores = sectorMetrics.map((m) => this.calculateCompositeScore(m));
      const avgScore =
        scores.length > 0
          ? scores.reduce((sum, s) => sum + s, 0) / scores.length
          : 0;

      // Find top and bottom performers
      let topPerformer: { ticker: string; score: number } | undefined;
      let bottomPerformer: { ticker: string; score: number } | undefined;

      if (sectorMetrics.length > 0) {
        const withScores = sectorMetrics.map((m, i) => ({
          ticker: m.ticker,
          score: scores[i],
        }));
        withScores.sort((a, b) => b.score - a.score);

        topPerformer = withScores[0];
        bottomPerformer = withScores[withScores.length - 1];
      }

      breakdowns.push({
        sector,
        count: sectorMetrics.length,
        avgScore: Math.round(avgScore * 100) / 100,
        tickers: sectorMetrics.map((m) => m.ticker),
        topPerformer,
        bottomPerformer,
      });
    }

    // Sort by average score descending
    return breakdowns.sort((a, b) => b.avgScore - a.avgScore);
  }

  /**
   * Get top stocks within a specific sector
   *
   * @param sector - GICS sector name
   * @param limit - Maximum results to return (default: 10)
   * @returns Array of screen results for the sector
   */
  async getTopBySector(
    sector: string,
    limit: number = 10
  ): Promise<ScreenResult[]> {
    // This method requires a universe of tickers to work with
    // In practice, you'd typically have a pre-defined list of tickers per sector
    // For now, we return empty if no universe is provided

    throw new Error(
      `getTopBySector requires a pre-defined universe of tickers for sector "${sector}". ` +
        'Use analyzeSectors() with a ticker list, then filter by sector.'
    );
  }

  /**
   * Compare a stock to its sector averages
   *
   * @param ticker - Stock symbol to compare
   * @returns Comparison result with percentile and metric breakdowns
   */
  async compareToSector(ticker: string): Promise<SectorComparison> {
    const metrics = await this.fetchMetrics(ticker);

    if (!metrics) {
      throw new Error(`Unable to fetch metrics for ${ticker}`);
    }

    // Get sector averages (would typically come from a pre-computed index)
    // For now, we use reasonable market averages as baseline
    const sectorStats = this.getDefaultSectorStats(metrics.sector);

    const aboveAverage: string[] = [];
    const belowAverage: string[] = [];

    // Compare each metric
    if (metrics.pe > 0 && metrics.pe < sectorStats.avgPE) {
      aboveAverage.push('P/E Ratio');
    } else if (metrics.pe > sectorStats.avgPE) {
      belowAverage.push('P/E Ratio');
    }

    if (metrics.pb > 0 && metrics.pb < sectorStats.avgPB) {
      aboveAverage.push('P/B Ratio');
    } else if (metrics.pb > sectorStats.avgPB) {
      belowAverage.push('P/B Ratio');
    }

    if (metrics.roe > sectorStats.avgROE) {
      aboveAverage.push('ROE');
    } else if (metrics.roe < sectorStats.avgROE) {
      belowAverage.push('ROE');
    }

    if (metrics.revenueGrowth > sectorStats.avgRevenueGrowth) {
      aboveAverage.push('Revenue Growth');
    } else if (metrics.revenueGrowth < sectorStats.avgRevenueGrowth) {
      belowAverage.push('Revenue Growth');
    }

    if (metrics.earningsGrowth > sectorStats.avgEarningsGrowth) {
      aboveAverage.push('Earnings Growth');
    } else if (metrics.earningsGrowth < sectorStats.avgEarningsGrowth) {
      belowAverage.push('Earnings Growth');
    }

    if (
      metrics.debtToEquity >= 0 &&
      metrics.debtToEquity < sectorStats.avgDebtToEquity
    ) {
      aboveAverage.push('Debt/Equity');
    } else if (metrics.debtToEquity > sectorStats.avgDebtToEquity) {
      belowAverage.push('Debt/Equity');
    }

    if (metrics.dividendYield > sectorStats.avgDividendYield) {
      aboveAverage.push('Dividend Yield');
    } else if (metrics.dividendYield < sectorStats.avgDividendYield) {
      belowAverage.push('Dividend Yield');
    }

    if (metrics.profitMargin > sectorStats.avgProfitMargin) {
      aboveAverage.push('Profit Margin');
    } else if (metrics.profitMargin < sectorStats.avgProfitMargin) {
      belowAverage.push('Profit Margin');
    }

    // Calculate percentile (simplified: based on metrics above/below average)
    const totalMetrics = aboveAverage.length + belowAverage.length;
    const percentile =
      totalMetrics > 0
        ? Math.round((aboveAverage.length / totalMetrics) * 100)
        : 50;

    const stockScore = this.calculateCompositeScore(metrics);
    const sectorAvgScore = this.calculateSectorAvgScore(sectorStats);

    return {
      ticker,
      sector: metrics.sector,
      percentile,
      aboveAverage,
      belowAverage,
      stockScore: Math.round(stockScore * 100) / 100,
      sectorAvgScore: Math.round(sectorAvgScore * 100) / 100,
    };
  }

  /**
   * Fetch and normalize metrics from the data provider
   */
  private async fetchMetrics(ticker: string): Promise<NormalizedMetrics | null> {
    try {
      if (this.isYahoo) {
        return await this.fetchYahooMetrics(ticker);
      } else {
        return await this.fetchFinnhubMetrics(ticker);
      }
    } catch {
      // Return null for failed fetches (handled by Promise.allSettled)
      return null;
    }
  }

  /**
   * Fetch metrics from Yahoo Finance
   */
  private async fetchYahooMetrics(ticker: string): Promise<NormalizedMetrics> {
    const client = this.dataProvider as YahooClient;
    const fundamentals: YahooFundamentals = await client.getFundamentals(ticker);

    // Yahoo doesn't provide direct sector, so we'll use a default
    // In practice, you'd want to maintain a ticker-to-sector mapping
    const sector: GICSSector = 'Information Technology';

    return {
      ticker,
      companyName: ticker, // Yahoo getFundamentals doesn't include name
      sector,
      pe: fundamentals.trailingPE ?? 0,
      pb: fundamentals.priceToBook ?? 0,
      roe: fundamentals.returnOnEquity ?? 0,
      revenueGrowth: fundamentals.revenueGrowth ?? 0,
      earningsGrowth: fundamentals.earningsGrowth ?? 0,
      debtToEquity: (fundamentals.debtToEquity ?? 0) / 100, // Yahoo returns as percentage
      dividendYield: fundamentals.dividendYield ?? 0,
      profitMargin: fundamentals.profitMargins ?? 0,
    };
  }

  /**
   * Fetch metrics from Finnhub
   */
  private async fetchFinnhubMetrics(ticker: string): Promise<NormalizedMetrics> {
    const client = this.dataProvider as FinnhubClient;

    const [financials, profile]: [FinnhubFinancials, FinnhubProfile] =
      await Promise.all([client.getFinancials(ticker), client.getProfile(ticker)]);

    const m = financials.metric;

    // Map Finnhub industry to GICS sector
    const sector: GICSSector =
      FINNHUB_TO_GICS[profile.finnhubIndustry] ?? 'Information Technology';

    return {
      ticker,
      companyName: profile.name,
      sector,
      pe: m.peTTM ?? m.peAnnual ?? 0,
      pb: m.pbQuarterly ?? m.pbAnnual ?? 0,
      roe: (m.roeTTM ?? m.roeAnnual ?? 0) / 100,
      revenueGrowth: 0, // Finnhub basic metrics don't include growth rates
      earningsGrowth: 0,
      debtToEquity:
        (m.totalDebt_totalEquityQuarterly ?? m.totalDebt_totalEquityAnnual ?? 0) /
        100,
      dividendYield: (m.currentDividendYieldTTM ?? 0) / 100,
      profitMargin: (m.netProfitMarginTTM ?? m.netProfitMarginAnnual ?? 0) / 100,
    };
  }

  /**
   * Calculate composite score for a set of metrics
   */
  private calculateCompositeScore(metrics: NormalizedMetrics): number {
    let score = 50; // Start at neutral

    // P/E: Lower is better (0-30 range typical)
    if (metrics.pe > 0 && metrics.pe < 50) {
      score += (30 - Math.min(metrics.pe, 30)) / 30 * 10;
    }

    // P/B: Lower is better (0-5 range typical)
    if (metrics.pb > 0 && metrics.pb < 10) {
      score += (5 - Math.min(metrics.pb, 5)) / 5 * 10;
    }

    // ROE: Higher is better (0-30% range typical)
    score += Math.min(metrics.roe, 0.3) / 0.3 * 15;

    // Revenue Growth: Higher is better
    score += Math.min(Math.max(metrics.revenueGrowth, 0), 0.5) / 0.5 * 10;

    // Earnings Growth: Higher is better
    score += Math.min(Math.max(metrics.earningsGrowth, 0), 0.5) / 0.5 * 10;

    // Debt/Equity: Lower is better (0-2 range)
    if (metrics.debtToEquity >= 0) {
      score += (2 - Math.min(metrics.debtToEquity, 2)) / 2 * 10;
    }

    // Dividend Yield: Higher is better (0-5% range)
    score += Math.min(metrics.dividendYield, 0.05) / 0.05 * 5;

    // Profit Margin: Higher is better (0-30% range)
    score += Math.min(Math.max(metrics.profitMargin, 0), 0.3) / 0.3 * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate average score for sector stats
   */
  private calculateSectorAvgScore(stats: SectorStats): number {
    const mockMetrics: NormalizedMetrics = {
      ticker: 'SECTOR_AVG',
      companyName: 'Sector Average',
      sector: 'Information Technology',
      pe: stats.avgPE,
      pb: stats.avgPB,
      roe: stats.avgROE,
      revenueGrowth: stats.avgRevenueGrowth,
      earningsGrowth: stats.avgEarningsGrowth,
      debtToEquity: stats.avgDebtToEquity,
      dividendYield: stats.avgDividendYield,
      profitMargin: stats.avgProfitMargin,
    };
    return this.calculateCompositeScore(mockMetrics);
  }

  /**
   * Get default sector statistics (market averages by sector)
   *
   * These are approximate historical averages and should be updated
   * with real-time data in production.
   */
  private getDefaultSectorStats(sector: GICSSector): SectorStats {
    // Sector-specific baseline stats (approximate historical averages)
    const sectorDefaults: Record<GICSSector, SectorStats> = {
      Energy: {
        avgPE: 12,
        avgPB: 1.2,
        avgROE: 0.1,
        avgRevenueGrowth: 0.05,
        avgEarningsGrowth: 0.05,
        avgDebtToEquity: 0.5,
        avgDividendYield: 0.04,
        avgProfitMargin: 0.08,
      },
      Materials: {
        avgPE: 15,
        avgPB: 1.8,
        avgROE: 0.12,
        avgRevenueGrowth: 0.06,
        avgEarningsGrowth: 0.06,
        avgDebtToEquity: 0.4,
        avgDividendYield: 0.025,
        avgProfitMargin: 0.1,
      },
      Industrials: {
        avgPE: 18,
        avgPB: 2.5,
        avgROE: 0.15,
        avgRevenueGrowth: 0.07,
        avgEarningsGrowth: 0.08,
        avgDebtToEquity: 0.6,
        avgDividendYield: 0.02,
        avgProfitMargin: 0.1,
      },
      'Consumer Discretionary': {
        avgPE: 20,
        avgPB: 3.0,
        avgROE: 0.18,
        avgRevenueGrowth: 0.08,
        avgEarningsGrowth: 0.1,
        avgDebtToEquity: 0.7,
        avgDividendYield: 0.015,
        avgProfitMargin: 0.08,
      },
      'Consumer Staples': {
        avgPE: 22,
        avgPB: 4.0,
        avgROE: 0.2,
        avgRevenueGrowth: 0.04,
        avgEarningsGrowth: 0.05,
        avgDebtToEquity: 0.5,
        avgDividendYield: 0.025,
        avgProfitMargin: 0.1,
      },
      'Health Care': {
        avgPE: 20,
        avgPB: 3.5,
        avgROE: 0.15,
        avgRevenueGrowth: 0.08,
        avgEarningsGrowth: 0.1,
        avgDebtToEquity: 0.4,
        avgDividendYield: 0.015,
        avgProfitMargin: 0.12,
      },
      Financials: {
        avgPE: 12,
        avgPB: 1.2,
        avgROE: 0.1,
        avgRevenueGrowth: 0.05,
        avgEarningsGrowth: 0.06,
        avgDebtToEquity: 1.5, // Higher leverage typical for financials
        avgDividendYield: 0.03,
        avgProfitMargin: 0.2,
      },
      'Information Technology': {
        avgPE: 25,
        avgPB: 5.0,
        avgROE: 0.2,
        avgRevenueGrowth: 0.12,
        avgEarningsGrowth: 0.15,
        avgDebtToEquity: 0.3,
        avgDividendYield: 0.01,
        avgProfitMargin: 0.2,
      },
      'Communication Services': {
        avgPE: 18,
        avgPB: 2.5,
        avgROE: 0.12,
        avgRevenueGrowth: 0.08,
        avgEarningsGrowth: 0.1,
        avgDebtToEquity: 0.6,
        avgDividendYield: 0.015,
        avgProfitMargin: 0.15,
      },
      Utilities: {
        avgPE: 16,
        avgPB: 1.5,
        avgROE: 0.09,
        avgRevenueGrowth: 0.03,
        avgEarningsGrowth: 0.04,
        avgDebtToEquity: 1.2,
        avgDividendYield: 0.035,
        avgProfitMargin: 0.12,
      },
      'Real Estate': {
        avgPE: 35, // REITs typically have higher P/E
        avgPB: 2.0,
        avgROE: 0.06,
        avgRevenueGrowth: 0.04,
        avgEarningsGrowth: 0.05,
        avgDebtToEquity: 0.8,
        avgDividendYield: 0.04,
        avgProfitMargin: 0.25,
      },
    };

    return sectorDefaults[sector];
  }
}
