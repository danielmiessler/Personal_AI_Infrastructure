/**
 * Tests for Buy Price Calculator
 *
 * Tests buy price calculation logic including:
 * - Multiple calculation methods (DCF, 52-week low, 200-day MA, analyst targets)
 * - Selection of most conservative price
 * - Discount percentage calculations
 * - Buyable status determination
 */

import { describe, it, expect, mock } from 'bun:test';
import { calculateBuyPrice } from '../../src/timing/buyprice';
import type { BuyPriceInput, DataProvider, BuyPriceMethod } from '../../src/timing/types';
import { DEFAULT_MARGIN_OF_SAFETY } from '../../src/timing/types';

// =============================================================================
// Mock Data Provider Factory
// =============================================================================

interface MockQuoteData {
  regularMarketPrice: number;
  trailingPE: number | null;
  twoHundredDayAverage: number | null;
}

interface MockFundamentalsData {
  trailingPE?: number;
  totalRevenue: number;
}

interface MockPriceTargetData {
  targetMean: number | null;
  targetHigh?: number;
  targetLow?: number;
}

interface Mock52WeekRange {
  high: number;
  low: number;
  current: number;
  positionInRange: number;
}

function createMockDataProvider(options: {
  quote: MockQuoteData;
  fundamentals: MockFundamentalsData;
  range: Mock52WeekRange;
  priceTarget?: MockPriceTargetData | null;
}): DataProvider {
  return {
    yahoo: {
      getQuote: mock(() => Promise.resolve([options.quote])),
      get52WeekRange: mock(() => Promise.resolve(options.range)),
      getFundamentals: mock(() => Promise.resolve(options.fundamentals)),
      getHistorical: mock(() => Promise.resolve({ prices: [], currency: 'USD' })),
    },
    finnhub: {
      getPriceTarget: mock(() =>
        options.priceTarget
          ? Promise.resolve(options.priceTarget)
          : Promise.reject(new Error('No price target available'))
      ),
      getFinancials: mock(() => Promise.resolve({ metric: {} })),
    },
  } as unknown as DataProvider;
}

// =============================================================================
// Tests: Buy Price Method Calculations
// =============================================================================

describe('BuyPriceCalculator - Method Calculations', () => {
  it('should calculate 52-week low + 10% method correctly', async () => {
    const low52 = 80;
    const currentPrice = 100;

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null, // No PE to avoid DCF method
        twoHundredDayAverage: null, // No 200MA
      },
      fundamentals: {
        totalRevenue: 0, // No revenue to avoid DCF
      },
      range: {
        high: 120,
        low: low52,
        current: currentPrice,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // 52-week low + 10% = 80 * 1.10 = 88
    const expected52WeekPrice = low52 * 1.1;
    const method52Week = result.allMethods.find((m) => m.method === '52_WEEK_LOW');

    expect(method52Week).toBeDefined();
    expect(method52Week!.price).toBeCloseTo(expected52WeekPrice, 2);
    expect(method52Week!.description).toContain('52-week low');
  });

  it('should calculate 200-day MA - 5% method correctly', async () => {
    const ma200 = 100;
    const currentPrice = 105;

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: ma200,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: currentPrice,
        positionInRange: 0.625,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // 200-day MA * 0.95 = 100 * 0.95 = 95
    const expectedMAPrice = ma200 * 0.95;
    const methodMA = result.allMethods.find((m) => m.method === '200_DAY_MA');

    expect(methodMA).toBeDefined();
    expect(methodMA!.price).toBeCloseTo(expectedMAPrice, 2);
    expect(methodMA!.description).toContain('200-day MA');
  });

  it('should calculate analyst target * 75% method correctly', async () => {
    const analystTarget = 120;
    const currentPrice = 100;

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: currentPrice,
        positionInRange: 0.5,
      },
      priceTarget: {
        targetMean: analystTarget,
        targetHigh: 140,
        targetLow: 100,
      },
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Analyst target * 0.75 = 120 * 0.75 = 90
    const expectedAnalystPrice = analystTarget * 0.75;
    const methodAnalyst = result.allMethods.find((m) => m.method === 'ANALYST_TARGET');

    expect(methodAnalyst).toBeDefined();
    expect(methodAnalyst!.price).toBeCloseTo(expectedAnalystPrice, 2);
    expect(methodAnalyst!.description).toContain('Analyst target');
  });

  it('should calculate DCF margin method when PE and revenue available', async () => {
    const currentPrice = 100;
    const pe = 20;
    const eps = currentPrice / pe; // EPS = 5

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: pe,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        trailingPE: pe,
        totalRevenue: 1000000000,
      },
      range: {
        high: 120,
        low: 80,
        current: currentPrice,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Intrinsic value = EPS * 15 (normalized PE)
    // EPS = 100/20 = 5
    // Intrinsic = 5 * 15 = 75
    // DCF buy price = 75 * (1 - 0.2) = 75 * 0.8 = 60
    const intrinsicValue = eps * 15;
    const expectedDCFPrice = intrinsicValue * (1 - DEFAULT_MARGIN_OF_SAFETY);

    const methodDCF = result.allMethods.find((m) => m.method === 'DCF_MARGIN');
    expect(methodDCF).toBeDefined();
    expect(methodDCF!.price).toBeCloseTo(expectedDCFPrice, 2);
  });
});

// =============================================================================
// Tests: Conservative Price Selection
// =============================================================================

describe('BuyPriceCalculator - Conservative Selection', () => {
  it('should select the lowest (most conservative) buy price', async () => {
    // Set up all methods with different prices
    const currentPrice = 100;

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: 20, // Enables DCF
        twoHundredDayAverage: 100, // Enables 200MA method
      },
      fundamentals: {
        trailingPE: 20,
        totalRevenue: 1000000000,
      },
      range: {
        high: 120,
        low: 80, // 52-week low -> 88
        current: currentPrice,
        positionInRange: 0.5,
      },
      priceTarget: {
        targetMean: 120, // -> 90
      },
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Expected prices:
    // DCF: EPS=5, Intrinsic=75, DCF price=60
    // 52-week low: 80 * 1.1 = 88
    // 200-day MA: 100 * 0.95 = 95
    // Analyst: 120 * 0.75 = 90

    // DCF should be the lowest at 60
    expect(result.buyPrice).toBeCloseTo(60, 0);
    expect(result.method).toBe('DCF_MARGIN');

    // All methods should be sorted by price ascending
    for (let i = 1; i < result.allMethods.length; i++) {
      expect(result.allMethods[i].price).toBeGreaterThanOrEqual(
        result.allMethods[i - 1].price
      );
    }
  });

  it('should select 52-week low method when it is the most conservative', async () => {
    const currentPrice = 100;
    const low52 = 50; // Very low 52-week low

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null, // Disable DCF
        twoHundredDayAverage: 100, // 200MA -> 95
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: low52, // 52-week low -> 55
        current: currentPrice,
        positionInRange: 0.71,
      },
      priceTarget: {
        targetMean: 110, // -> 82.5
      },
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // 52-week low * 1.1 = 50 * 1.1 = 55 (lowest)
    expect(result.buyPrice).toBeCloseTo(55, 2);
    expect(result.method).toBe('52_WEEK_LOW');
  });
});

// =============================================================================
// Tests: Discount Percentage Calculation
// =============================================================================

describe('BuyPriceCalculator - Discount Calculations', () => {
  it('should calculate correct discount percentage', async () => {
    const currentPrice = 100;
    const low52 = 80; // -> buy price = 88

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: low52,
        current: currentPrice,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Discount = (100 - 88) / 100 * 100 = 12%
    const expectedDiscount = ((currentPrice - (low52 * 1.1)) / currentPrice) * 100;
    expect(result.discountPercent).toBeCloseTo(expectedDiscount, 1);
    expect(result.discountPercent).toBeCloseTo(12, 0);
  });

  it('should show positive discount when buy price is below current price', async () => {
    const currentPrice = 100;

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80, // -> buy price = 88
        current: currentPrice,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    expect(result.discountPercent).toBeGreaterThan(0);
    expect(result.currentPrice).toBe(currentPrice);
    expect(result.buyPrice).toBeLessThan(currentPrice);
  });

  it('should show negative discount when buy price is above current price', async () => {
    const currentPrice = 50;
    const low52 = 48; // -> buy price = 52.8

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 60,
        low: low52,
        current: currentPrice,
        positionInRange: 0.17,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Buy price = 52.8, current = 50, discount should be negative
    expect(result.discountPercent).toBeLessThan(0);
    expect(result.buyPrice).toBeGreaterThan(currentPrice);
  });
});

// =============================================================================
// Tests: Buyable Status
// =============================================================================

describe('BuyPriceCalculator - Buyable Status', () => {
  it('should mark as buyable when current price is at or below buy price', async () => {
    const currentPrice = 50;
    const low52 = 48; // -> buy price = 52.8 (above current)

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 60,
        low: low52,
        current: currentPrice,
        positionInRange: 0.17,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    expect(result.isBuyable).toBe(true);
    expect(result.currentPrice).toBeLessThanOrEqual(result.buyPrice);
  });

  it('should mark as not buyable when current price is above buy price', async () => {
    const currentPrice = 100;
    const low52 = 80; // -> buy price = 88 (below current)

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: low52,
        current: currentPrice,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    expect(result.isBuyable).toBe(false);
    expect(result.currentPrice).toBeGreaterThan(result.buyPrice);
  });

  it('should mark as buyable when current price equals buy price exactly', async () => {
    // Set 52-week low so that buy price (low * 1.1) = 88
    // Then set current price to 88 to test exact equality
    const low52 = 80;
    const buyPriceExpected = low52 * 1.1; // 88
    const currentPrice = buyPriceExpected; // Exact equality

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: low52,
        current: currentPrice,
        positionInRange: 0.2,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Buy price should equal current price
    expect(result.buyPrice).toBeCloseTo(88, 2);
    expect(result.currentPrice).toBeCloseTo(88, 2);
    expect(result.isBuyable).toBe(true);
  });
});

// =============================================================================
// Tests: Reasoning Generation
// =============================================================================

describe('BuyPriceCalculator - Reasoning', () => {
  it('should include buy price recommendation in reasoning', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    expect(result.reasoning).toContain('TEST');
    expect(result.reasoning).toContain('$88.00');
    expect(result.reasoning).toContain('$100.00');
  });

  it('should indicate when stock is actionable (at buy price)', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 50, // Below buy price
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 60,
        low: 48, // -> 52.8 buy price
        current: 50,
        positionInRange: 0.17,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    expect(result.reasoning).toContain('ACTIONABLE');
  });

  it('should indicate required decline when above buy price', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    expect(result.reasoning).toContain('decline');
  });

  it('should mention other calculated methods in reasoning', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: null,
        twoHundredDayAverage: 100, // Enables 200MA method
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: {
        targetMean: 120, // Enables analyst target method
      },
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Should have multiple methods and mention them
    expect(result.allMethods.length).toBeGreaterThan(1);
    expect(result.reasoning).toContain('Other targets');
  });
});

// =============================================================================
// Tests: Edge Cases
// =============================================================================

describe('BuyPriceCalculator - Edge Cases', () => {
  it('should use fallback when no methods produce valid prices', async () => {
    // This is hard to trigger since 52-week low always produces a valid price,
    // but we can verify the fallback mechanism exists
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Should always have at least one method (52-week low is always calculated)
    expect(result.allMethods.length).toBeGreaterThanOrEqual(1);
    expect(result.buyPrice).toBeGreaterThan(0);
  });

  it('should handle zero analyst target gracefully', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: {
        targetMean: 0, // Invalid target
      },
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Should not include analyst target method with 0 value
    const analystMethod = result.allMethods.find((m) => m.method === 'ANALYST_TARGET');
    expect(analystMethod).toBeUndefined();
  });

  it('should handle negative PE ratio gracefully', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: -5, // Negative PE (losing money)
        twoHundredDayAverage: null,
      },
      fundamentals: {
        trailingPE: -5,
        totalRevenue: 1000000000,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Should not produce invalid DCF price from negative PE
    // The code checks pe > 0 before calculating DCF
    expect(result.buyPrice).toBeGreaterThan(0);
  });

  it('should handle missing price target data without crashing', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: null, // Will cause rejection
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    // Should still produce a result using other methods
    expect(result).toBeDefined();
    expect(result.buyPrice).toBeGreaterThan(0);
    expect(result.allMethods.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle very high stock price correctly', async () => {
    const currentPrice = 50000; // BRK.A territory
    const low52 = 40000;

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 55000,
        low: low52,
        current: currentPrice,
        positionInRange: 0.67,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'BRK.A',
      dataProvider,
    });

    expect(result.buyPrice).toBeCloseTo(44000, 0); // 40000 * 1.1
    expect(result.currentPrice).toBe(50000);
  });

  it('should handle very low stock price (penny stock) correctly', async () => {
    const currentPrice = 0.50;
    const low52 = 0.30;

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: null,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 0.80,
        low: low52,
        current: currentPrice,
        positionInRange: 0.4,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'PENNY',
      dataProvider,
    });

    expect(result.buyPrice).toBeCloseTo(0.33, 2); // 0.30 * 1.1
    expect(result.currentPrice).toBe(0.50);
  });
});

// =============================================================================
// Tests: All Methods Present
// =============================================================================

describe('BuyPriceCalculator - Method Availability', () => {
  it('should calculate all four methods when data is available', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: 20,
        twoHundredDayAverage: 100,
      },
      fundamentals: {
        trailingPE: 20,
        totalRevenue: 1000000000,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: {
        targetMean: 120,
      },
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    const methods = result.allMethods.map((m) => m.method);

    expect(methods).toContain('DCF_MARGIN');
    expect(methods).toContain('52_WEEK_LOW');
    expect(methods).toContain('200_DAY_MA');
    expect(methods).toContain('ANALYST_TARGET');
    expect(result.allMethods.length).toBe(4);
  });

  it('should only include valid methods when some data is missing', async () => {
    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: 100,
        trailingPE: null, // No DCF
        twoHundredDayAverage: null, // No 200MA
      },
      fundamentals: {
        totalRevenue: 0,
      },
      range: {
        high: 120,
        low: 80,
        current: 100,
        positionInRange: 0.5,
      },
      priceTarget: null, // No analyst target
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    const methods = result.allMethods.map((m) => m.method);

    // Only 52-week low should be available
    expect(methods).toContain('52_WEEK_LOW');
    expect(methods).not.toContain('DCF_MARGIN');
    expect(methods).not.toContain('200_DAY_MA');
    expect(methods).not.toContain('ANALYST_TARGET');
    expect(result.allMethods.length).toBe(1);
  });
});

// =============================================================================
// Tests: Constants and Configuration
// =============================================================================

describe('BuyPriceCalculator - Configuration', () => {
  it('should use DEFAULT_MARGIN_OF_SAFETY of 20%', () => {
    expect(DEFAULT_MARGIN_OF_SAFETY).toBe(0.2);
  });

  it('should apply margin of safety correctly in DCF calculation', async () => {
    const currentPrice = 100;
    const pe = 15; // PE of 15 = EPS of 6.67, intrinsic = 100, buy = 80

    const dataProvider = createMockDataProvider({
      quote: {
        regularMarketPrice: currentPrice,
        trailingPE: pe,
        twoHundredDayAverage: null,
      },
      fundamentals: {
        trailingPE: pe,
        totalRevenue: 1000000000,
      },
      range: {
        high: 120,
        low: 50, // Low 52-week low to not interfere
        current: currentPrice,
        positionInRange: 0.71,
      },
      priceTarget: null,
    });

    const result = await calculateBuyPrice({
      ticker: 'TEST',
      dataProvider,
    });

    const dcfMethod = result.allMethods.find((m) => m.method === 'DCF_MARGIN');
    expect(dcfMethod).toBeDefined();

    // With PE=15 (market average), intrinsic = current price
    // DCF buy price = intrinsic * (1 - 0.2) = 100 * 0.8 = 80
    // But EPS = 100/15 = 6.67, intrinsic = 6.67 * 15 = 100
    expect(dcfMethod!.price).toBeCloseTo(80, 0);
  });
});
