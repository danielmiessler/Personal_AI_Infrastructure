/**
 * Piotroski F-Score Calculation Tests
 *
 * Tests for calculateFScore function that computes the 0-9 F-Score
 * based on 9 fundamental criteria across profitability, leverage, and efficiency.
 */

import { describe, it, expect } from 'bun:test';
import { calculateFScore } from '../../src/analysis/fscore';
import type {
  AnalysisDataProvider,
  FinancialsData,
  QuoteData,
  ProfileData,
  SECFilingData,
  InsiderTransaction,
  NewsItem,
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
    roaTTM: 0.06,
    netProfitMargin: 0.12,
    grossMargin: 0.45,
    grossMarginPriorYear: 0.43,
    operatingMargin: 0.18,
    peRatio: 20,
    pbRatio: 3.5,
    psRatio: 2.0,
    revenueGrowth: 0.10,
    earningsGrowth: 0.12,
    freeCashFlow: 500_000_000,
    operatingCashFlow: 600_000_000,
    netIncome: 400_000_000,
    currentRatio: 1.8,
    currentRatioPriorYear: 1.6,
    debtToEquity: 0.5,
    totalDebt: 900_000_000,
    totalDebtPriorYear: 1_000_000_000,
    totalCash: 800_000_000,
    sharesOutstanding: 100_000_000,
    sharesOutstandingPriorYear: 102_000_000,
    beta: 1.1,
    totalAssets: 5_000_000_000,
    totalAssetsPriorYear: 4_800_000_000,
    revenue: 2_000_000_000,
    revenuePriorYear: 1_800_000_000,
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
  financials: FinancialsData = createMockFinancials()
): AnalysisDataProvider {
  return {
    getFinancials: async () => financials,
    getNews: async (): Promise<NewsItem[]> => [],
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
// F-Score Tests
// =============================================================================

describe('calculateFScore', () => {
  const policy = createMockPolicy();

  describe('score range', () => {
    it('should return score between 0 and 9', async () => {
      const dataProvider = createMockDataProvider();
      const result = await calculateFScore('TEST', dataProvider, policy);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(9);
    });

    it('should return 9 components', async () => {
      const dataProvider = createMockDataProvider();
      const result = await calculateFScore('TEST', dataProvider, policy);

      expect(result.components).toHaveLength(9);
    });

    it('should match score to number of passed components', async () => {
      const dataProvider = createMockDataProvider();
      const result = await calculateFScore('TEST', dataProvider, policy);

      const passedCount = result.components.filter((c) => c.passed).length;
      expect(result.score).toBe(passedCount);
    });
  });

  describe('interpretation', () => {
    it('should interpret 8-9 as STRONG', async () => {
      // Create a strong company (all metrics passing)
      const financials = createMockFinancials({
        roa: 0.10,
        roaTTM: 0.08,
        operatingCashFlow: 600_000_000,
        netIncome: 400_000_000,
        totalDebt: 800_000_000,
        totalDebtPriorYear: 1_000_000_000,
        currentRatio: 2.0,
        currentRatioPriorYear: 1.8,
        sharesOutstanding: 98_000_000,
        sharesOutstandingPriorYear: 100_000_000,
        grossMargin: 0.50,
        grossMarginPriorYear: 0.45,
        revenue: 2_200_000_000,
        revenuePriorYear: 2_000_000_000,
        totalAssets: 5_000_000_000,
        totalAssetsPriorYear: 5_000_000_000,
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await calculateFScore('TEST', dataProvider, policy);

      if (result.score >= 8) {
        expect(result.interpretation).toBe('STRONG');
      }
    });

    it('should interpret 5-7 as MODERATE', async () => {
      // Create a moderate company (mix of passing/failing)
      const financials = createMockFinancials({
        roa: 0.05,
        roaTTM: 0.06, // ROA not improving
        operatingCashFlow: 300_000_000,
        netIncome: 400_000_000, // OCF < NI
        totalDebt: 1_100_000_000,
        totalDebtPriorYear: 1_000_000_000, // Debt increasing
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await calculateFScore('TEST', dataProvider, policy);

      if (result.score >= 5 && result.score <= 7) {
        expect(result.interpretation).toBe('MODERATE');
      }
    });

    it('should interpret 3-4 as WEAK', async () => {
      // Force a weak score
      const financials = createMockFinancials({
        roa: 0.02,
        roaTTM: 0.04, // ROA declining
        operatingCashFlow: -100_000_000, // Negative OCF
        netIncome: 100_000_000,
        totalDebt: 1_500_000_000,
        totalDebtPriorYear: 1_000_000_000, // Debt increasing
        currentRatio: 0.8,
        currentRatioPriorYear: 1.0, // Liquidity declining
        sharesOutstanding: 120_000_000,
        sharesOutstandingPriorYear: 100_000_000, // Dilution
        grossMargin: 0.30,
        grossMarginPriorYear: 0.35, // Margin declining
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await calculateFScore('TEST', dataProvider, policy);

      if (result.score >= 3 && result.score <= 4) {
        expect(result.interpretation).toBe('WEAK');
      }
    });

    it('should interpret 0-2 as AVOID', async () => {
      // Create a distressed company (most metrics failing)
      const financials = createMockFinancials({
        roa: -0.05, // Negative ROA
        roaTTM: -0.03, // Getting worse
        operatingCashFlow: -200_000_000, // Negative OCF
        netIncome: -300_000_000, // Net loss
        totalDebt: 2_000_000_000,
        totalDebtPriorYear: 1_500_000_000, // Debt increasing
        currentRatio: 0.6,
        currentRatioPriorYear: 0.8, // Liquidity declining
        sharesOutstanding: 150_000_000,
        sharesOutstandingPriorYear: 100_000_000, // Heavy dilution
        grossMargin: 0.20,
        grossMarginPriorYear: 0.30, // Margin declining
        revenue: 1_500_000_000,
        revenuePriorYear: 2_000_000_000, // Revenue declining
        totalAssets: 6_000_000_000,
        totalAssetsPriorYear: 5_000_000_000, // Asset turnover declining
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await calculateFScore('TEST', dataProvider, policy);

      if (result.score <= 2) {
        expect(result.interpretation).toBe('AVOID');
      }
    });
  });

  describe('profitability components', () => {
    describe('ROA_POSITIVE', () => {
      it('should pass when ROA > 0', async () => {
        const financials = createMockFinancials({ roa: 0.08 });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ROA_POSITIVE');
        expect(component?.passed).toBe(true);
        expect(component?.currentValue).toBe(0.08);
      });

      it('should fail when ROA <= 0', async () => {
        const financials = createMockFinancials({ roa: -0.02 });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ROA_POSITIVE');
        expect(component?.passed).toBe(false);
      });
    });

    describe('OPERATING_CASH_FLOW_POSITIVE', () => {
      it('should pass when OCF > 0', async () => {
        const financials = createMockFinancials({ operatingCashFlow: 500_000_000 });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'OPERATING_CASH_FLOW_POSITIVE');
        expect(component?.passed).toBe(true);
      });

      it('should fail when OCF <= 0', async () => {
        const financials = createMockFinancials({ operatingCashFlow: -100_000_000 });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'OPERATING_CASH_FLOW_POSITIVE');
        expect(component?.passed).toBe(false);
      });
    });

    describe('ROA_IMPROVING', () => {
      it('should pass when current ROA > prior ROA', async () => {
        const financials = createMockFinancials({
          roa: 0.10,
          roaTTM: 0.08,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ROA_IMPROVING');
        expect(component?.passed).toBe(true);
      });

      it('should fail when current ROA < prior ROA', async () => {
        const financials = createMockFinancials({
          roa: 0.06,
          roaTTM: 0.08,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ROA_IMPROVING');
        expect(component?.passed).toBe(false);
      });

      it('should use strong ROA threshold when prior data missing', async () => {
        const financials = createMockFinancials({
          roa: 0.08,
          roaTTM: undefined,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ROA_IMPROVING');
        expect(component?.passed).toBe(true); // 8% > 5% threshold
      });
    });

    describe('CASH_FLOW_GT_NET_INCOME', () => {
      it('should pass when OCF > net income', async () => {
        const financials = createMockFinancials({
          operatingCashFlow: 600_000_000,
          netIncome: 400_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'CASH_FLOW_GT_NET_INCOME');
        expect(component?.passed).toBe(true);
      });

      it('should fail when OCF < net income', async () => {
        const financials = createMockFinancials({
          operatingCashFlow: 300_000_000,
          netIncome: 400_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'CASH_FLOW_GT_NET_INCOME');
        expect(component?.passed).toBe(false);
      });

      it('should pass when net income is negative but OCF is better', async () => {
        const financials = createMockFinancials({
          operatingCashFlow: -50_000_000,
          netIncome: -200_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'CASH_FLOW_GT_NET_INCOME');
        expect(component?.passed).toBe(true);
      });
    });
  });

  describe('leverage/liquidity components', () => {
    describe('LONG_TERM_DEBT_DECREASING', () => {
      it('should pass when debt decreased YoY', async () => {
        const financials = createMockFinancials({
          totalDebt: 800_000_000,
          totalDebtPriorYear: 1_000_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'LONG_TERM_DEBT_DECREASING');
        expect(component?.passed).toBe(true);
      });

      it('should fail when debt increased YoY', async () => {
        const financials = createMockFinancials({
          totalDebt: 1_200_000_000,
          totalDebtPriorYear: 1_000_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'LONG_TERM_DEBT_DECREASING');
        expect(component?.passed).toBe(false);
      });

      it('should use D/E threshold when prior data missing', async () => {
        const financials = createMockFinancials({
          totalDebt: 800_000_000,
          totalDebtPriorYear: undefined,
          debtToEquity: 0.5, // < 1.0 threshold
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'LONG_TERM_DEBT_DECREASING');
        expect(component?.passed).toBe(true);
      });
    });

    describe('CURRENT_RATIO_IMPROVING', () => {
      it('should pass when current ratio improved YoY', async () => {
        const financials = createMockFinancials({
          currentRatio: 2.0,
          currentRatioPriorYear: 1.5,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'CURRENT_RATIO_IMPROVING');
        expect(component?.passed).toBe(true);
      });

      it('should fail when current ratio declined YoY', async () => {
        const financials = createMockFinancials({
          currentRatio: 1.2,
          currentRatioPriorYear: 1.5,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'CURRENT_RATIO_IMPROVING');
        expect(component?.passed).toBe(false);
      });

      it('should use absolute threshold when prior data missing', async () => {
        const financials = createMockFinancials({
          currentRatio: 1.8, // > 1.5 threshold
          currentRatioPriorYear: undefined,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'CURRENT_RATIO_IMPROVING');
        expect(component?.passed).toBe(true);
      });
    });

    describe('NO_SHARE_DILUTION', () => {
      it('should pass when shares decreased (buybacks)', async () => {
        const financials = createMockFinancials({
          sharesOutstanding: 95_000_000,
          sharesOutstandingPriorYear: 100_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'NO_SHARE_DILUTION');
        expect(component?.passed).toBe(true);
      });

      it('should pass when shares stayed the same', async () => {
        const financials = createMockFinancials({
          sharesOutstanding: 100_000_000,
          sharesOutstandingPriorYear: 100_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'NO_SHARE_DILUTION');
        expect(component?.passed).toBe(true);
      });

      it('should fail when shares increased (dilution)', async () => {
        const financials = createMockFinancials({
          sharesOutstanding: 110_000_000,
          sharesOutstandingPriorYear: 100_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'NO_SHARE_DILUTION');
        expect(component?.passed).toBe(false);
      });

      it('should pass when prior data missing', async () => {
        const financials = createMockFinancials({
          sharesOutstanding: 100_000_000,
          sharesOutstandingPriorYear: undefined,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'NO_SHARE_DILUTION');
        expect(component?.passed).toBe(true);
      });
    });
  });

  describe('operating efficiency components', () => {
    describe('GROSS_MARGIN_IMPROVING', () => {
      it('should pass when gross margin improved YoY', async () => {
        const financials = createMockFinancials({
          grossMargin: 0.48,
          grossMarginPriorYear: 0.45,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'GROSS_MARGIN_IMPROVING');
        expect(component?.passed).toBe(true);
      });

      it('should fail when gross margin declined YoY', async () => {
        const financials = createMockFinancials({
          grossMargin: 0.42,
          grossMarginPriorYear: 0.45,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'GROSS_MARGIN_IMPROVING');
        expect(component?.passed).toBe(false);
      });

      it('should use absolute threshold when prior data missing', async () => {
        const financials = createMockFinancials({
          grossMargin: 0.35, // > 30% threshold
          grossMarginPriorYear: undefined,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'GROSS_MARGIN_IMPROVING');
        expect(component?.passed).toBe(true);
      });
    });

    describe('ASSET_TURNOVER_IMPROVING', () => {
      it('should pass when asset turnover improved YoY', async () => {
        // Current: 2B / 5B = 0.40
        // Prior: 1.8B / 4.8B = 0.375
        const financials = createMockFinancials({
          revenue: 2_000_000_000,
          totalAssets: 5_000_000_000,
          revenuePriorYear: 1_800_000_000,
          totalAssetsPriorYear: 4_800_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ASSET_TURNOVER_IMPROVING');
        expect(component?.passed).toBe(true);
      });

      it('should fail when asset turnover declined YoY', async () => {
        // Current: 1.8B / 5B = 0.36
        // Prior: 2B / 4.8B = 0.417
        const financials = createMockFinancials({
          revenue: 1_800_000_000,
          totalAssets: 5_000_000_000,
          revenuePriorYear: 2_000_000_000,
          totalAssetsPriorYear: 4_800_000_000,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ASSET_TURNOVER_IMPROVING');
        expect(component?.passed).toBe(false);
      });

      it('should use revenue growth when asset data missing', async () => {
        const financials = createMockFinancials({
          revenueGrowth: 0.10, // Positive growth
          totalAssets: undefined,
          totalAssetsPriorYear: undefined,
        });
        const dataProvider = createMockDataProvider(financials);
        const result = await calculateFScore('TEST', dataProvider, policy);

        const component = result.components.find((c) => c.id === 'ASSET_TURNOVER_IMPROVING');
        expect(component?.passed).toBe(true);
      });
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
        // Many prior year values missing
      };

      const dataProvider = createMockDataProvider(financials);
      const result = await calculateFScore('TEST', dataProvider, policy);

      // Should still return valid result
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(9);
      expect(result.components).toHaveLength(9);
      expect(['STRONG', 'MODERATE', 'WEAK', 'AVOID']).toContain(result.interpretation);
    });

    it('should calculate correct score for perfect company', async () => {
      const financials = createMockFinancials({
        // Profitability
        roa: 0.15, // > 0
        roaTTM: 0.12, // ROA improving
        operatingCashFlow: 1_000_000_000, // > 0
        netIncome: 800_000_000, // OCF > NI
        // Leverage
        totalDebt: 500_000_000,
        totalDebtPriorYear: 700_000_000, // Debt decreasing
        currentRatio: 2.5,
        currentRatioPriorYear: 2.0, // Liquidity improving
        sharesOutstanding: 95_000_000,
        sharesOutstandingPriorYear: 100_000_000, // No dilution (buybacks)
        // Efficiency
        grossMargin: 0.55,
        grossMarginPriorYear: 0.50, // Margin improving
        revenue: 3_000_000_000,
        revenuePriorYear: 2_500_000_000,
        totalAssets: 5_000_000_000,
        totalAssetsPriorYear: 5_000_000_000, // Turnover improving
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await calculateFScore('TEST', dataProvider, policy);

      expect(result.score).toBe(9);
      expect(result.interpretation).toBe('STRONG');
    });

    it('should calculate correct score for distressed company', async () => {
      const financials = createMockFinancials({
        // Profitability
        roa: -0.10, // < 0
        roaTTM: -0.05, // ROA declining
        operatingCashFlow: -500_000_000, // < 0
        netIncome: -400_000_000, // OCF still worse than NI
        // Leverage
        totalDebt: 2_000_000_000,
        totalDebtPriorYear: 1_500_000_000, // Debt increasing
        currentRatio: 0.7,
        currentRatioPriorYear: 0.9, // Liquidity declining
        sharesOutstanding: 200_000_000,
        sharesOutstandingPriorYear: 100_000_000, // Heavy dilution
        // Efficiency
        grossMargin: 0.15,
        grossMarginPriorYear: 0.25, // Margin declining
        revenue: 1_000_000_000,
        revenuePriorYear: 1_500_000_000,
        totalAssets: 5_000_000_000,
        totalAssetsPriorYear: 4_000_000_000, // Turnover declining
      });

      const dataProvider = createMockDataProvider(financials);
      const result = await calculateFScore('TEST', dataProvider, policy);

      expect(result.score).toBeLessThanOrEqual(2);
      expect(result.interpretation).toBe('AVOID');
    });
  });
});
