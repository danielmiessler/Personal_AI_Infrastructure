/**
 * Yellow Flag Analysis Tests
 *
 * Tests for runYellowFlags function that identifies weighted warning signals.
 * Individual flags don't disqualify a stock, but accumulated weight does.
 */

import { describe, it, expect } from 'bun:test';
import { runYellowFlags } from '../../src/analysis/yellowflag';
import type {
  AnalysisDataProvider,
  FinancialsData,
  NewsItem,
  QuoteData,
  ProfileData,
  SECFilingData,
  InsiderTransaction,
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
    operatingMarginPriorYear: 0.17,
    peRatio: 20,
    pbRatio: 3.5,
    psRatio: 2.0,
    revenueGrowth: 0.10,
    revenueGrowthPriorYear: 0.12,
    earningsGrowth: 0.12,
    freeCashFlow: 500_000_000,
    operatingCashFlow: 600_000_000,
    netIncome: 400_000_000,
    currentRatio: 1.8,
    debtToEquity: 0.5,
    totalDebt: 1_000_000_000,
    totalCash: 800_000_000,
    sharesOutstanding: 100_000_000,
    beta: 1.1,
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
  news: NewsItem[] = []
): AnalysisDataProvider {
  return {
    getFinancials: async () => financials,
    getNews: async () => news,
    getSECFilings: async (): Promise<SECFilingData[]> => [],
    getInsiderTransactions: async (): Promise<InsiderTransaction[]> => [],
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
// Yellow Flag Tests
// =============================================================================

describe('runYellowFlags', () => {
  const policy = createMockPolicy();

  describe('score calculation', () => {
    it('should return low score when no flags are triggered', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runYellowFlags('TEST', dataProvider, policy);

      expect(result.score).toBeLessThan(25);
      expect(result.triggeredCount).toBe(0);
      expect(result.triggeredWeight).toBe(0);
      expect(result.flags).toHaveLength(8);
    });

    it('should return higher score when multiple flags are triggered', async () => {
      const financials = createMockFinancials({
        peRatio: 80, // Very high P/E
        grossMargin: 0.35,
        grossMarginPriorYear: 0.45, // 10pp decline
        revenueGrowth: -0.15, // Negative growth
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      expect(result.score).toBeGreaterThan(30);
      expect(result.triggeredCount).toBeGreaterThan(2);
    });

    it('should normalize score to 0-100 range', async () => {
      const financials = createMockFinancials({
        peRatio: 100,
        grossMargin: 0.20,
        grossMarginPriorYear: 0.45,
        operatingMargin: 0.05,
        operatingMarginPriorYear: 0.20,
        revenueGrowth: -0.20,
        operatingCashFlow: 100_000_000,
        netIncome: 500_000_000, // OCF << NI
        shortPercentOfFloat: 0.30,
      });

      const news: NewsItem[] = [
        {
          headline: 'CEO resigns amid turmoil',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
        },
        {
          headline: 'Company lowers guidance for Q4',
          source: 'CNBC',
          publishedAt: new Date(),
          url: 'https://cnbc.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(financials, news);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('HIGH_PE', () => {
    it('should trigger when P/E > 35', async () => {
      const financials = createMockFinancials({ peRatio: 40 });
      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'HIGH_PE');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('40.0');
    });

    it('should not trigger when P/E is reasonable', async () => {
      const financials = createMockFinancials({ peRatio: 25 });
      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'HIGH_PE');
      expect(flag?.triggered).toBe(false);
    });

    it('should not trigger when P/E is negative (losses)', async () => {
      const financials = createMockFinancials({ peRatio: -10 });
      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'HIGH_PE');
      expect(flag?.triggered).toBe(false);
    });

    it('should apply higher weight for excessive P/E (>60)', async () => {
      const moderatelyHighPE = createMockFinancials({ peRatio: 45 });
      const excessivePE = createMockFinancials({ peRatio: 70 });

      const resultModerate = await runYellowFlags(
        'TEST',
        createMockDataProvider(moderatelyHighPE),
        policy
      );
      const resultExcessive = await runYellowFlags(
        'TEST',
        createMockDataProvider(excessivePE),
        policy
      );

      const flagModerate = resultModerate.flags.find((f) => f.id === 'HIGH_PE');
      const flagExcessive = resultExcessive.flags.find((f) => f.id === 'HIGH_PE');

      expect(flagExcessive!.weight).toBeGreaterThan(flagModerate!.weight);
    });
  });

  describe('DECLINING_MARGINS', () => {
    it('should trigger when gross margin declines >2pp', async () => {
      const financials = createMockFinancials({
        grossMargin: 0.40,
        grossMarginPriorYear: 0.45, // 5pp decline
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'DECLINING_MARGINS');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('Gross margin declined');
    });

    it('should trigger when operating margin declines >2pp', async () => {
      const financials = createMockFinancials({
        operatingMargin: 0.12,
        operatingMarginPriorYear: 0.18, // 6pp decline
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'DECLINING_MARGINS');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('Operating margin declined');
    });

    it('should not trigger when margins are stable', async () => {
      const financials = createMockFinancials({
        grossMargin: 0.44,
        grossMarginPriorYear: 0.45, // Only 1pp decline
        operatingMargin: 0.17,
        operatingMarginPriorYear: 0.18, // Only 1pp decline
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'DECLINING_MARGINS');
      expect(flag?.triggered).toBe(false);
    });

    it('should not trigger when margins are expanding', async () => {
      const financials = createMockFinancials({
        grossMargin: 0.50,
        grossMarginPriorYear: 0.45,
        operatingMargin: 0.22,
        operatingMarginPriorYear: 0.18,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'DECLINING_MARGINS');
      expect(flag?.triggered).toBe(false);
    });
  });

  describe('REVENUE_DECELERATION', () => {
    it('should trigger when revenue is declining', async () => {
      const financials = createMockFinancials({
        revenueGrowth: -0.05,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'REVENUE_DECELERATION');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('declining');
    });

    it('should trigger when growth slows significantly', async () => {
      const financials = createMockFinancials({
        revenueGrowth: 0.08,
        revenueGrowthPriorYear: 0.25, // 17pp deceleration
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'REVENUE_DECELERATION');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('decelerated');
    });

    it('should not trigger when growth is consistent', async () => {
      const financials = createMockFinancials({
        revenueGrowth: 0.15,
        revenueGrowthPriorYear: 0.18, // Only 3pp slowdown
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'REVENUE_DECELERATION');
      expect(flag?.triggered).toBe(false);
    });
  });

  describe('INVENTORY_BUILDUP', () => {
    it('should trigger when revenue is declining significantly', async () => {
      const financials = createMockFinancials({
        revenueGrowth: -0.10,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'INVENTORY_BUILDUP');
      expect(flag?.triggered).toBe(true);
    });

    it('should not trigger when revenue is stable or growing', async () => {
      const financials = createMockFinancials({
        revenueGrowth: 0.05,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'INVENTORY_BUILDUP');
      expect(flag?.triggered).toBe(false);
    });
  });

  describe('RECEIVABLES_GROWTH', () => {
    it('should trigger when OCF is less than 50% of net income', async () => {
      const financials = createMockFinancials({
        operatingCashFlow: 100_000_000,
        netIncome: 400_000_000, // OCF is only 25% of NI
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'RECEIVABLES_GROWTH');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('25%');
    });

    it('should not trigger when cash conversion is healthy', async () => {
      const financials = createMockFinancials({
        operatingCashFlow: 500_000_000,
        netIncome: 400_000_000, // OCF > NI
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'RECEIVABLES_GROWTH');
      expect(flag?.triggered).toBe(false);
    });
  });

  describe('EXECUTIVE_DEPARTURES', () => {
    it('should trigger when recent C-suite departure news exists', async () => {
      const news: NewsItem[] = [
        {
          headline: 'CEO resigns after strategic disagreements with board',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), news);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'EXECUTIVE_DEPARTURES');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('departure');
    });

    it('should trigger for CFO departure', async () => {
      const news: NewsItem[] = [
        {
          headline: 'CFO steps down to pursue other opportunities',
          source: 'WSJ',
          publishedAt: new Date(),
          url: 'https://wsj.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), news);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'EXECUTIVE_DEPARTURES');
      expect(flag?.triggered).toBe(true);
    });

    it('should not trigger for old departure news', async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 12); // 1 year ago

      const news: NewsItem[] = [
        {
          headline: 'CEO resigns',
          source: 'Bloomberg',
          publishedAt: oldDate,
          url: 'https://bloomberg.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), news);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'EXECUTIVE_DEPARTURES');
      expect(flag?.triggered).toBe(false);
    });
  });

  describe('GUIDANCE_LOWERED', () => {
    it('should trigger when guidance is lowered', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company lowers guidance for fiscal year amid market uncertainty',
          source: 'CNBC',
          publishedAt: new Date(),
          url: 'https://cnbc.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), news);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'GUIDANCE_LOWERED');
      expect(flag?.triggered).toBe(true);
    });

    it('should trigger for earnings warnings', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company warns earnings will miss estimates',
          source: 'Reuters',
          publishedAt: new Date(),
          url: 'https://reuters.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), news);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'GUIDANCE_LOWERED');
      expect(flag?.triggered).toBe(true);
    });

    it('should not trigger for old guidance news', async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 6);

      const news: NewsItem[] = [
        {
          headline: 'Company lowers guidance',
          source: 'CNBC',
          publishedAt: oldDate,
          url: 'https://cnbc.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), news);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'GUIDANCE_LOWERED');
      expect(flag?.triggered).toBe(false);
    });
  });

  describe('SHORT_INTEREST_HIGH', () => {
    it('should trigger when short interest >10% of float', async () => {
      const financials = createMockFinancials({
        shortPercentOfFloat: 0.15, // 15%
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'SHORT_INTEREST_HIGH');
      expect(flag?.triggered).toBe(true);
      expect(flag?.finding).toContain('15.0%');
    });

    it('should apply higher weight for very high short interest (>20%)', async () => {
      const elevatedShort = createMockFinancials({ shortPercentOfFloat: 0.15 });
      const veryHighShort = createMockFinancials({ shortPercentOfFloat: 0.25 });

      const resultElevated = await runYellowFlags(
        'TEST',
        createMockDataProvider(elevatedShort),
        policy
      );
      const resultVeryHigh = await runYellowFlags(
        'TEST',
        createMockDataProvider(veryHighShort),
        policy
      );

      const flagElevated = resultElevated.flags.find((f) => f.id === 'SHORT_INTEREST_HIGH');
      const flagVeryHigh = resultVeryHigh.flags.find((f) => f.id === 'SHORT_INTEREST_HIGH');

      expect(flagVeryHigh!.weight).toBeGreaterThan(flagElevated!.weight);
    });

    it('should not trigger when short interest is low', async () => {
      const financials = createMockFinancials({
        shortPercentOfFloat: 0.05, // 5%
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'SHORT_INTEREST_HIGH');
      expect(flag?.triggered).toBe(false);
    });

    it('should not trigger when data is unavailable', async () => {
      const financials = createMockFinancials({
        shortPercentOfFloat: undefined,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const flag = result.flags.find((f) => f.id === 'SHORT_INTEREST_HIGH');
      expect(flag?.triggered).toBe(false);
    });
  });

  describe('overall scoring', () => {
    it('should return all 8 flags in result', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runYellowFlags('TEST', dataProvider, policy);

      expect(result.flags).toHaveLength(8);

      const flagIds = result.flags.map((f) => f.id);
      expect(flagIds).toContain('HIGH_PE');
      expect(flagIds).toContain('DECLINING_MARGINS');
      expect(flagIds).toContain('REVENUE_DECELERATION');
      expect(flagIds).toContain('INVENTORY_BUILDUP');
      expect(flagIds).toContain('RECEIVABLES_GROWTH');
      expect(flagIds).toContain('EXECUTIVE_DEPARTURES');
      expect(flagIds).toContain('GUIDANCE_LOWERED');
      expect(flagIds).toContain('SHORT_INTEREST_HIGH');
    });

    it('should calculate triggeredWeight correctly', async () => {
      const financials = createMockFinancials({
        peRatio: 70, // Triggers HIGH_PE with higher weight
        revenueGrowth: -0.10, // Triggers REVENUE_DECELERATION and INVENTORY_BUILDUP
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runYellowFlags('TEST', dataProvider, policy);

      const triggeredFlags = result.flags.filter((f) => f.triggered);
      const expectedWeight = triggeredFlags.reduce((sum, f) => sum + f.weight, 0);

      expect(result.triggeredWeight).toBe(expectedWeight);
      expect(result.triggeredCount).toBe(triggeredFlags.length);
    });
  });
});
