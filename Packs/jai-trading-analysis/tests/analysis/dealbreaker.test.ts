/**
 * Dealbreaker Analysis Tests
 *
 * Tests for checkDealbreakers function that identifies hard-fail conditions
 * that should automatically disqualify a stock.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { runDealbreakers } from '../../src/analysis/dealbreaker';
import type {
  AnalysisDataProvider,
  FinancialsData,
  SECFilingData,
  InsiderTransaction,
  NewsItem,
  QuoteData,
  ProfileData,
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
    operatingMargin: 0.18,
    peRatio: 20,
    pbRatio: 3.5,
    psRatio: 2.0,
    revenueGrowth: 0.10,
    earningsGrowth: 0.12,
    freeCashFlow: 500_000_000,
    freeCashFlowPriorYear: 450_000_000,
    freeCashFlow2YearsAgo: 400_000_000,
    operatingCashFlow: 600_000_000,
    netIncome: 400_000_000,
    currentRatio: 1.8,
    debtToEquity: 0.5,
    totalDebt: 1_000_000_000,
    totalCash: 800_000_000,
    sharesOutstanding: 100_000_000,
    sharesOutstandingPriorYear: 98_000_000,
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
      entry: [{ id: 'entry-1', name: 'Entry Rule', rule: 'F-Score >= 6' }],
      exit: [{ id: 'exit-1', name: 'Exit Rule', rule: 'Dealbreaker triggered' }],
      hold: [{ id: 'hold-1', name: 'Hold Rule', rule: 'Continue monitoring' }],
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
  filings: SECFilingData[] = [],
  insiderTxns: InsiderTransaction[] = [],
  news: NewsItem[] = []
): AnalysisDataProvider {
  return {
    getFinancials: async () => financials,
    getSECFilings: async () => filings,
    getInsiderTransactions: async () => insiderTxns,
    getNews: async () => news,
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
// Dealbreaker Tests
// =============================================================================

describe('runDealbreakers', () => {
  const policy = createMockPolicy();

  describe('all checks pass with clean data', () => {
    it('should return passed=true when no dealbreakers are triggered', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(true);
      expect(result.failed).toHaveLength(0);
      expect(result.checked).toHaveLength(11);
      expect(result.details.every((d) => d.passed)).toBe(true);
    });
  });

  describe('SEC_INVESTIGATION', () => {
    it('should fail when SEC investigation is mentioned in filings', async () => {
      const filings: SECFilingData[] = [
        {
          form: '8-K',
          filingDate: new Date(),
          description: 'Company received SEC subpoena regarding accounting practices',
          url: 'https://sec.gov/filing',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), filings);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('SEC_INVESTIGATION');

      const detail = result.details.find((d) => d.id === 'SEC_INVESTIGATION');
      expect(detail?.passed).toBe(false);
      expect(detail?.evidence).toBeDefined();
    });

    it('should fail when SEC investigation is mentioned in news', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company under SEC investigation for securities fraud',
          source: 'Reuters',
          publishedAt: new Date(),
          url: 'https://reuters.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], [], news);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('SEC_INVESTIGATION');
    });

    it('should pass when no SEC investigation indicators are present', async () => {
      const dataProvider = createMockDataProvider();
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'SEC_INVESTIGATION');
      expect(detail?.passed).toBe(true);
    });
  });

  describe('RECENT_RESTATEMENT', () => {
    it('should fail when financial restatement is filed', async () => {
      const filings: SECFilingData[] = [
        {
          form: '10-K/A',
          filingDate: new Date(),
          description: 'Amendment to include restatement of previously filed financial statements',
          url: 'https://sec.gov/filing',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), filings);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('RECENT_RESTATEMENT');
    });

    it('should fail when material weakness is disclosed', async () => {
      const filings: SECFilingData[] = [
        {
          form: '8-K',
          filingDate: new Date(),
          description: 'Disclosure of material weakness in internal control over financial reporting',
          url: 'https://sec.gov/filing',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), filings);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('RECENT_RESTATEMENT');
    });
  });

  describe('AUDITOR_CHANGE', () => {
    it('should fail when auditor change is filed (Item 4.01)', async () => {
      const filings: SECFilingData[] = [
        {
          form: '8-K',
          filingDate: new Date(),
          description: 'Changes in Registrants Certifying Accountant',
          url: 'https://sec.gov/filing',
          items: ['4.01'],
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), filings);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('AUDITOR_CHANGE');
    });
  });

  describe('SIGNIFICANT_DILUTION', () => {
    it('should fail when shares outstanding increased >20%', async () => {
      const financials = createMockFinancials({
        sharesOutstanding: 130_000_000,
        sharesOutstandingPriorYear: 100_000_000,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('SIGNIFICANT_DILUTION');

      const detail = result.details.find((d) => d.id === 'SIGNIFICANT_DILUTION');
      expect(detail?.passed).toBe(false);
      expect(detail?.finding).toContain('30.0%');
    });

    it('should pass when dilution is under 20%', async () => {
      const financials = createMockFinancials({
        sharesOutstanding: 115_000_000,
        sharesOutstandingPriorYear: 100_000_000,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'SIGNIFICANT_DILUTION');
      expect(detail?.passed).toBe(true);
    });

    it('should pass when shares are reduced (buybacks)', async () => {
      const financials = createMockFinancials({
        sharesOutstanding: 95_000_000,
        sharesOutstandingPriorYear: 100_000_000,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'SIGNIFICANT_DILUTION');
      expect(detail?.passed).toBe(true);
    });

    it('should pass when prior year data is missing', async () => {
      const financials = createMockFinancials({
        sharesOutstanding: 100_000_000,
        sharesOutstandingPriorYear: undefined,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'SIGNIFICANT_DILUTION');
      expect(detail?.passed).toBe(true);
    });
  });

  describe('GOING_CONCERN', () => {
    it('should fail when going concern is mentioned in news', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Auditors raise substantial doubt about going concern',
          source: 'WSJ',
          publishedAt: new Date(),
          url: 'https://wsj.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], [], news);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('GOING_CONCERN');
    });
  });

  describe('MAJOR_IMPAIRMENT', () => {
    it('should fail when impairment is filed (Item 2.06)', async () => {
      const filings: SECFilingData[] = [
        {
          form: '8-K',
          filingDate: new Date(),
          description: 'Material Impairments',
          url: 'https://sec.gov/filing',
          items: ['2.06'],
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), filings);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('MAJOR_IMPAIRMENT');
    });

    it('should fail when goodwill impairment is mentioned', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company announces $2B goodwill impairment charge',
          source: 'Bloomberg',
          publishedAt: new Date(),
          url: 'https://bloomberg.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], [], news);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('MAJOR_IMPAIRMENT');
    });
  });

  describe('DIVIDEND_CUT', () => {
    it('should fail when dividend cut is announced in news', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company announces dividend suspension effective immediately',
          source: 'CNBC',
          publishedAt: new Date(),
          url: 'https://cnbc.com/news',
          summary: 'The board voted for dividend suspension to preserve cash',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], [], news);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('DIVIDEND_CUT');
    });
  });

  describe('DEBT_COVENANT_VIOLATION', () => {
    it('should fail when covenant violation is mentioned', async () => {
      const news: NewsItem[] = [
        {
          headline: 'Company receives covenant waiver from lenders',
          source: 'Reuters',
          publishedAt: new Date(),
          url: 'https://reuters.com/news',
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], [], news);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('DEBT_COVENANT_VIOLATION');
    });
  });

  describe('INSIDER_DUMPING', () => {
    it('should fail when multiple insiders are selling heavily', async () => {
      const recentDate = new Date();
      const insiderTxns: InsiderTransaction[] = [
        {
          name: 'John CEO',
          title: 'CEO',
          transactionType: 'SELL',
          shares: 100_000,
          price: 50,
          value: 5_000_000,
          date: recentDate,
          sharesOwnedAfter: 50_000,
        },
        {
          name: 'Jane CFO',
          title: 'CFO',
          transactionType: 'SELL',
          shares: 80_000,
          price: 50,
          value: 4_000_000,
          date: recentDate,
          sharesOwnedAfter: 20_000,
        },
        {
          name: 'Bob COO',
          title: 'COO',
          transactionType: 'SELL',
          shares: 60_000,
          price: 50,
          value: 3_000_000,
          date: recentDate,
          sharesOwnedAfter: 30_000,
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], insiderTxns);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('INSIDER_DUMPING');
    });

    it('should fail when single insider dumps >25% of holdings', async () => {
      const recentDate = new Date();
      const insiderTxns: InsiderTransaction[] = [
        {
          name: 'John CEO',
          title: 'CEO',
          transactionType: 'SELL',
          shares: 400_000,
          price: 50,
          value: 20_000_000,
          date: recentDate,
          sharesOwnedAfter: 100_000, // Sold 80% of holdings
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], insiderTxns);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('INSIDER_DUMPING');
    });

    it('should pass when insider selling is modest', async () => {
      const recentDate = new Date();
      const insiderTxns: InsiderTransaction[] = [
        {
          name: 'John CEO',
          title: 'CEO',
          transactionType: 'SELL',
          shares: 10_000,
          price: 50,
          value: 500_000,
          date: recentDate,
          sharesOwnedAfter: 490_000, // Sold only 2% of holdings
        },
      ];

      const dataProvider = createMockDataProvider(createMockFinancials(), [], insiderTxns);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'INSIDER_DUMPING');
      expect(detail?.passed).toBe(true);
    });
  });

  describe('REVENUE_CLIFF', () => {
    it('should fail when revenue declined >30%', async () => {
      const financials = createMockFinancials({
        revenueGrowth: -0.35, // 35% decline
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('REVENUE_CLIFF');

      const detail = result.details.find((d) => d.id === 'REVENUE_CLIFF');
      expect(detail?.passed).toBe(false);
      expect(detail?.finding).toContain('-35.0%');
    });

    it('should pass when revenue decline is under 30%', async () => {
      const financials = createMockFinancials({
        revenueGrowth: -0.25, // 25% decline
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'REVENUE_CLIFF');
      expect(detail?.passed).toBe(true);
    });

    it('should pass when revenue is growing', async () => {
      const financials = createMockFinancials({
        revenueGrowth: 0.15,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'REVENUE_CLIFF');
      expect(detail?.passed).toBe(true);
    });
  });

  describe('NEGATIVE_FCF_TREND', () => {
    it('should fail when FCF is negative for 2+ consecutive periods', async () => {
      const financials = createMockFinancials({
        freeCashFlow: -100_000_000,
        freeCashFlowPriorYear: -80_000_000,
        freeCashFlow2YearsAgo: -60_000_000,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('NEGATIVE_FCF_TREND');
    });

    it('should pass when FCF is positive', async () => {
      const financials = createMockFinancials({
        freeCashFlow: 100_000_000,
        freeCashFlowPriorYear: 80_000_000,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'NEGATIVE_FCF_TREND');
      expect(detail?.passed).toBe(true);
    });

    it('should pass when FCF improved to positive', async () => {
      const financials = createMockFinancials({
        freeCashFlow: 50_000_000,
        freeCashFlowPriorYear: -20_000_000,
        freeCashFlow2YearsAgo: -50_000_000,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      const detail = result.details.find((d) => d.id === 'NEGATIVE_FCF_TREND');
      expect(detail?.passed).toBe(true);
    });
  });

  describe('multiple dealbreakers', () => {
    it('should report all failed dealbreakers', async () => {
      const financials = createMockFinancials({
        revenueGrowth: -0.40,
        sharesOutstanding: 150_000_000,
        sharesOutstandingPriorYear: 100_000_000,
      });

      const news: NewsItem[] = [
        {
          headline: 'Company suspends dividend',
          source: 'CNBC',
          publishedAt: new Date(),
          url: 'https://cnbc.com/news',
          summary: 'Dividend suspension announced',
        },
      ];

      const dataProvider = createMockDataProvider(financials, [], [], news);
      const result = await runDealbreakers('TEST', dataProvider, policy);

      expect(result.passed).toBe(false);
      expect(result.failed).toContain('REVENUE_CLIFF');
      expect(result.failed).toContain('SIGNIFICANT_DILUTION');
      expect(result.failed).toContain('DIVIDEND_CUT');
      expect(result.failed.length).toBeGreaterThanOrEqual(3);
    });
  });
});
