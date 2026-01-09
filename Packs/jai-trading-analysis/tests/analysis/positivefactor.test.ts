/**
 * Positive Factor Analysis Tests
 *
 * Tests for runPositiveFactors function that identifies positive attributes
 * that support a bullish thesis.
 */

import { describe, it, expect } from 'bun:test';
import { runPositiveFactors } from '../../src/analysis/positivefactor';
import type {
  AnalysisDataProvider,
  FinancialsData,
  InsiderTransaction,
  NewsItem,
  QuoteData,
  ProfileData,
  SECFilingData,
  PriceHistoryData,
} from '../../src/analysis/types';
import type { Policy } from 'jai-finance-core';

// =============================================================================
// Mock Data Factory
// =============================================================================

function createMockFinancials(overrides: Partial<FinancialsData> = {}): FinancialsData {
  return {
    ticker: 'TEST',
    roa: 0.08,
    roe: 0.15,
    netProfitMargin: 0.12,
    grossMargin: 0.45,
    grossMarginPriorYear: 0.43,
    operatingMargin: 0.18,
    operatingMarginPriorYear: 0.16,
    peRatio: 20,
    pbRatio: 3.5,
    psRatio: 2.0,
    revenueGrowth: 0.10,
    earningsGrowth: 0.12,
    freeCashFlow: 500_000_000,
    operatingCashFlow: 600_000_000,
    netIncome: 400_000_000,
    currentRatio: 1.8,
    debtToEquity: 0.5,
    totalDebt: 1_000_000_000,
    totalCash: 800_000_000,
    sharesOutstanding: 100_000_000,
    sharesOutstandingPriorYear: 102_000_000,
    beta: 1.1,
    dividendYield: 0.025,
    dividendGrowth5Y: 0.08,
    payoutRatio: 0.35,
    ...overrides,
  };
}

function createMockPolicy(): Policy {
  return {
    meta: {
      name: 'Test Policy',
      version: '1.0.0',
      last_review: '2025-01-01',
      next_review: '2025-07-01',
    },
    objectives: {
      primary: 'Capital appreciation',
      secondary: [],
      tactical: [],
    },
    constraints: {
      max_single_position: 10,
      penny_stock_max: 5,
      max_sector_concentration: 30,
      cash_reserve: 5,
    },
    rules: {
      entry: [],
      exit: [],
      hold: [],
    },
    schedule: {
      daily: [],
      weekly: [],
      monthly: [],
      quarterly: [],
    },
    escalation: {
      auto_approve: [],
      notify_and_wait: [],
      requires_discussion: [],
    },
    notifications: {
      channels: [],
      preferences: { enabled: [] },
    },
  };
}

function createMockDataProvider(
  financials: FinancialsData = createMockFinancials(),
  insiderTxns: InsiderTransaction[] = [],
  news: NewsItem[] = []
): AnalysisDataProvider {
  return {
    getFinancials: async () => financials,
    getInsiderTransactions: async () => insiderTxns,
    getNews: async () => news,
    getSECFilings: async (): Promise<SECFilingData[]> => [],
    getQuote: async (): Promise<QuoteData> => ({
      ticker: 'TEST',
      price: 100,
      change: 1,
      changePercent: 0.01,
      volume: 1000000,
      marketCap: 10_000_000_000,
      timestamp: new Date(),
    }),
    getProfile: async (): Promise<ProfileData> => ({
      ticker: 'TEST',
      name: 'Test Company',
      sector: 'Technology',
      industry: 'Software',
      country: 'US',
      marketCap: 10_000_000_000,
    }),
    getPriceHistory: async (): Promise<PriceHistoryData> => ({
      ticker: 'TEST',
      prices: [],
      period: '1y',
    }),
  };
}

// =============================================================================
// Positive Factor Tests
// =============================================================================

describe('runPositiveFactors', () => {
  const policy = createMockPolicy();

  describe('score calculation', () => {
    it('should return score between 0 and 100', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return 8 factors in result', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      expect(result.factors).toHaveLength(8);
    });

    it('should calculate presentWeight correctly', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const presentFactors = result.factors.filter((f) => f.present);
      const expectedWeight = presentFactors.reduce((sum, f) => sum + f.weight, 0);

      expect(result.presentWeight).toBe(expectedWeight);
      expect(result.presentCount).toBe(presentFactors.length);
    });

    it('should return higher score when multiple factors present', async () => {
      // Company with strong moat indicators
      const financials = createMockFinancials({
        roe: 0.25,
        grossMargin: 0.55,
        netProfitMargin: 0.18,
        revenueGrowth: 0.15,
        grossMarginPriorYear: 0.52, // Margins expanding
        operatingMargin: 0.22,
        operatingMarginPriorYear: 0.18,
        dividendYield: 0.03,
        dividendGrowth5Y: 0.10,
        payoutRatio: 0.40,
        sharesOutstanding: 95_000_000,
        sharesOutstandingPriorYear: 100_000_000, // Buybacks
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      expect(result.score).toBeGreaterThan(30);
      expect(result.presentCount).toBeGreaterThan(2);
    });
  });

  describe('STRONG_MOAT', () => {
    it('should be present when ROE > 20% and margins are strong', async () => {
      const financials = createMockFinancials({
        roe: 0.25,
        grossMargin: 0.55,
        netProfitMargin: 0.18,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'STRONG_MOAT');
      expect(factor?.present).toBe(true);
      expect(factor?.finding).toContain('ROE');
    });

    it('should be present when ROE > 15% with very strong margins', async () => {
      const financials = createMockFinancials({
        roe: 0.18,
        grossMargin: 0.60,
        netProfitMargin: 0.20,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'STRONG_MOAT');
      expect(factor?.present).toBe(true);
    });

    it('should not be present when metrics are weak', async () => {
      const financials = createMockFinancials({
        roe: 0.08,
        grossMargin: 0.25,
        netProfitMargin: 0.05,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'STRONG_MOAT');
      expect(factor?.present).toBe(false);
    });
  });

  describe('RECURRING_REVENUE', () => {
    it('should be present when subscription news is frequent', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company reports strong subscription growth of 25%',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
        },
        {
          headline: 'Annual recurring revenue hits $1B milestone',
          source: 'TechCrunch',
          publishedAt: new Date(),
          url: 'https://techcrunch.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], news);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'RECURRING_REVENUE');
      expect(factor?.present).toBe(true);
    });

    it('should not be present without recurring revenue indicators', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'RECURRING_REVENUE');
      expect(factor?.present).toBe(false);
    });
  });

  describe('PRICING_POWER', () => {
    it('should be present when revenue growing with stable/expanding margins', async () => {
      const financials = createMockFinancials({
        revenueGrowth: 0.15, // > 10%
        grossMargin: 0.48,
        grossMarginPriorYear: 0.45, // Margin expanding
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'PRICING_POWER');
      expect(factor?.present).toBe(true);
      expect(factor?.finding).toContain('Pricing power evident');
    });

    it('should not be present when margins are compressing', async () => {
      const financials = createMockFinancials({
        revenueGrowth: 0.15,
        grossMargin: 0.42,
        grossMarginPriorYear: 0.48, // Margin compression
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'PRICING_POWER');
      expect(factor?.present).toBe(false);
    });

    it('should not be present when growth is weak', async () => {
      const financials = createMockFinancials({
        revenueGrowth: 0.05, // < 10%
        grossMargin: 0.50,
        grossMarginPriorYear: 0.48,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'PRICING_POWER');
      expect(factor?.present).toBe(false);
    });
  });

  describe('MARGIN_EXPANSION', () => {
    it('should be present when gross margin expanded >1pp', async () => {
      const financials = createMockFinancials({
        grossMargin: 0.48,
        grossMarginPriorYear: 0.45, // 3pp expansion
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'MARGIN_EXPANSION');
      expect(factor?.present).toBe(true);
      expect(factor?.finding).toContain('Gross margin expanded');
    });

    it('should be present when operating margin expanded >1pp', async () => {
      const financials = createMockFinancials({
        grossMargin: 0.45,
        grossMarginPriorYear: 0.45, // Flat
        operatingMargin: 0.20,
        operatingMarginPriorYear: 0.17, // 3pp expansion
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'MARGIN_EXPANSION');
      expect(factor?.present).toBe(true);
      expect(factor?.finding).toContain('Operating margin expanded');
    });

    it('should not be present when margins are flat or declining', async () => {
      const financials = createMockFinancials({
        grossMargin: 0.45,
        grossMarginPriorYear: 0.45,
        operatingMargin: 0.17,
        operatingMarginPriorYear: 0.18,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'MARGIN_EXPANSION');
      expect(factor?.present).toBe(false);
    });
  });

  describe('NEW_PRODUCT_CYCLE', () => {
    it('should be present when multiple product launch news exists', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company launches next generation platform',
          source: 'TechCrunch',
          publishedAt: new Date(),
          url: 'https://techcrunch.com/news',
          sentiment: 'positive',
        },
        {
          headline: 'New product innovation drives Q3 results',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
          sentiment: 'positive',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], news);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'NEW_PRODUCT_CYCLE');
      expect(factor?.present).toBe(true);
    });

    it('should not be present for old product news', async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 12);

      const news: NewsItem[] = [
        {
          headline: 'Company launches new product',
          source: 'TechCrunch',
          publishedAt: oldDate,
          url: 'https://techcrunch.com/news',
        },
        {
          headline: 'Another product launch',
          source: 'Bloomberg',
          publishedAt: oldDate,
          url: 'https://bloomberg.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], news);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'NEW_PRODUCT_CYCLE');
      expect(factor?.present).toBe(false);
    });

    it('should ignore negative sentiment product news', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Product launch fails to meet expectations',
          source: 'TechCrunch',
          publishedAt: new Date(),
          url: 'https://techcrunch.com/news',
          sentiment: 'negative',
        },
        {
          headline: 'New product plagued by quality issues',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
          sentiment: 'negative',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], news);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'NEW_PRODUCT_CYCLE');
      expect(factor?.present).toBe(false);
    });
  });

  describe('INSIDER_BUYING', () => {
    it('should be present when multiple insiders are buying', async () => {
      const recentDate = new Date();
      const insiderTxns: InsiderTransaction[] = [
        {
          name: 'John CEO',
          title: 'CEO',
          transactionType: 'BUY',
          shares: 10_000,
          price: 50,
          value: 500_000,
          date: recentDate,
        },
        {
          name: 'Jane CFO',
          title: 'CFO',
          transactionType: 'BUY',
          shares: 5_000,
          price: 50,
          value: 250_000,
          date: recentDate,
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), insiderTxns);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'INSIDER_BUYING');
      expect(factor?.present).toBe(true);
      expect(factor?.finding).toContain('2 insiders bought');
    });

    it('should be present when single large purchase exceeds sells', async () => {
      const recentDate = new Date();
      const insiderTxns: InsiderTransaction[] = [
        {
          name: 'John CEO',
          title: 'CEO',
          transactionType: 'BUY',
          shares: 50_000,
          price: 50,
          value: 2_500_000, // Large purchase
          date: recentDate,
        },
        {
          name: 'Jane CFO',
          title: 'CFO',
          transactionType: 'SELL',
          shares: 5_000,
          price: 50,
          value: 250_000,
          date: recentDate,
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), insiderTxns);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'INSIDER_BUYING');
      expect(factor?.present).toBe(true);
    });

    it('should not be present when no recent buying', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'INSIDER_BUYING');
      expect(factor?.present).toBe(false);
    });

    it('should not be present for old transactions', async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 6);

      const insiderTxns: InsiderTransaction[] = [
        {
          name: 'John CEO',
          title: 'CEO',
          transactionType: 'BUY',
          shares: 10_000,
          price: 50,
          value: 500_000,
          date: oldDate,
        },
        {
          name: 'Jane CFO',
          title: 'CFO',
          transactionType: 'BUY',
          shares: 5_000,
          price: 50,
          value: 250_000,
          date: oldDate,
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), insiderTxns);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'INSIDER_BUYING');
      expect(factor?.present).toBe(false);
    });
  });

  describe('DIVIDEND_GROWTH', () => {
    it('should be present when dividend is growing with sustainable payout', async () => {
      const financials = createMockFinancials({
        dividendYield: 0.03, // 3%
        dividendGrowth5Y: 0.08, // 8% annual growth
        payoutRatio: 0.40, // 40% payout
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'DIVIDEND_GROWTH');
      expect(factor?.present).toBe(true);
      expect(factor?.finding).toContain('Yield');
      expect(factor?.finding).toContain('growth');
    });

    it('should not be present for non-dividend stocks', async () => {
      const financials = createMockFinancials({
        dividendYield: 0,
        dividendGrowth5Y: undefined,
        payoutRatio: undefined,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'DIVIDEND_GROWTH');
      expect(factor?.present).toBe(false);
      expect(factor?.weight).toBe(0); // Don't penalize
    });

    it('should not be present for stagnant dividends', async () => {
      const financials = createMockFinancials({
        dividendYield: 0.01, // Low yield
        dividendGrowth5Y: 0.01, // Minimal growth
        payoutRatio: 0.80, // High payout
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'DIVIDEND_GROWTH');
      expect(factor?.present).toBe(false);
    });
  });

  describe('SHARE_BUYBACKS', () => {
    it('should be present when shares decreased YoY', async () => {
      const financials = createMockFinancials({
        sharesOutstanding: 95_000_000,
        sharesOutstandingPriorYear: 100_000_000, // 5% reduction
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'SHARE_BUYBACKS');
      expect(factor?.present).toBe(true);
      expect(factor?.finding).toContain('reduced');
    });

    it('should be present when buyback news is frequent', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company announces $500M share repurchase program',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
        },
        {
          headline: 'Board authorizes additional stock buyback',
          source: 'Reuters',
          publishedAt: new Date(),
          url: 'https://reuters.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], news);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'SHARE_BUYBACKS');
      expect(factor?.present).toBe(true);
    });

    it('should not be present when shares are increasing', async () => {
      const financials = createMockFinancials({
        sharesOutstanding: 105_000_000,
        sharesOutstandingPriorYear: 100_000_000, // 5% dilution
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factor = result.factors.find((f) => f.id === 'SHARE_BUYBACKS');
      expect(factor?.present).toBe(false);
    });
  });

  describe('factor IDs', () => {
    it('should return all 8 expected factor IDs', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      const factorIds = result.factors.map((f) => f.id);
      expect(factorIds).toContain('STRONG_MOAT');
      expect(factorIds).toContain('RECURRING_REVENUE');
      expect(factorIds).toContain('PRICING_POWER');
      expect(factorIds).toContain('MARGIN_EXPANSION');
      expect(factorIds).toContain('NEW_PRODUCT_CYCLE');
      expect(factorIds).toContain('INSIDER_BUYING');
      expect(factorIds).toContain('DIVIDEND_GROWTH');
      expect(factorIds).toContain('SHARE_BUYBACKS');
    });
  });

  describe('edge cases', () => {
    it('should handle missing data gracefully', async () => {
      const financials: FinancialsData = {
        ticker: 'TEST',
        roa: 0.05,
        roe: 0.10,
        netProfitMargin: 0.08,
        grossMargin: 0.40,
        operatingMargin: 0.15,
        peRatio: 25,
        pbRatio: 3.0,
        psRatio: 2.5,
        revenueGrowth: 0.05,
        earningsGrowth: 0.05,
        freeCashFlow: 100_000_000,
        operatingCashFlow: 200_000_000,
        netIncome: 150_000_000,
        currentRatio: 1.5,
        debtToEquity: 0.8,
        totalDebt: 500_000_000,
        totalCash: 300_000_000,
        sharesOutstanding: 50_000_000,
        beta: 1.0,
        // Many optional values missing
      };

      const dataProvider = createMockDataProvider(financials);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      // Should still return valid result
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors).toHaveLength(8);
    });

    it('should return high score for exceptional company', async () => {
      const financials = createMockFinancials({
        // Strong moat
        roe: 0.30,
        grossMargin: 0.70,
        netProfitMargin: 0.25,
        // Pricing power + margin expansion
        revenueGrowth: 0.25,
        grossMarginPriorYear: 0.65,
        operatingMargin: 0.30,
        operatingMarginPriorYear: 0.25,
        // Dividend growth
        dividendYield: 0.025,
        dividendGrowth5Y: 0.12,
        payoutRatio: 0.30,
        // Buybacks
        sharesOutstanding: 90_000_000,
        sharesOutstandingPriorYear: 100_000_000,
      });

      // Recurring revenue news
      const news: NewsItem[] = [
        {
          headline: 'Subscription revenue growth accelerates',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
        },
        {
          headline: 'ARR hits new record high',
          source: 'TechCrunch',
          publishedAt: new Date(),
          url: 'https://techcrunch.com/news',
        },
        {
          headline: 'Company launches breakthrough new platform',
          source: 'WSJ',
          publishedAt: new Date(),
          url: 'https://wsj.com/news',
          sentiment: 'positive',
        },
        {
          headline: 'Next generation product unveiled',
          source: 'CNBC',
          publishedAt: new Date(),
          url: 'https://cnbc.com/news',
          sentiment: 'positive',
        },
      ];

      // Insider buying
      const insiderTxns: InsiderTransaction[] = [
        {
          name: 'CEO',
          title: 'CEO',
          transactionType: 'BUY',
          shares: 50_000,
          price: 100,
          value: 5_000_000,
          date: new Date(),
        },
        {
          name: 'CFO',
          title: 'CFO',
          transactionType: 'BUY',
          shares: 20_000,
          price: 100,
          value: 2_000_000,
          date: new Date(),
        },
      ];

      const dataProvider = createMockDataProvider(financials, insiderTxns, news);
      const result = await runPositiveFactors('TEST', dataProvider, policy);

      expect(result.score).toBeGreaterThan(60);
      expect(result.presentCount).toBeGreaterThanOrEqual(6);
    });
  });
});
