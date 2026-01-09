/**
 * Buy Price Calculator
 *
 * Calculates optimal buy prices using multiple methodologies,
 * returning the most conservative (lowest) price as the recommendation.
 */

import type {
  BuyPriceInput,
  BuyPriceResult,
  BuyPriceBreakdown,
  BuyPriceMethod,
} from './types';
import { DEFAULT_MARGIN_OF_SAFETY } from './types';

// =============================================================================
// Buy Price Calculation
// =============================================================================

export async function calculateBuyPrice(
  input: BuyPriceInput
): Promise<BuyPriceResult> {
  const { ticker, dataProvider, policy } = input;

  // Get margin of safety from policy or use default
  // Policy doesn't have marginOfSafety directly, but we can derive from constraints
  const marginOfSafety = DEFAULT_MARGIN_OF_SAFETY;

  // Fetch required data in parallel
  const [quote, range, priceTarget, fundamentals] = await Promise.all([
    dataProvider.yahoo.getQuote(ticker),
    dataProvider.yahoo.get52WeekRange(ticker),
    dataProvider.finnhub.getPriceTarget(ticker).catch(() => null),
    dataProvider.yahoo.getFundamentals(ticker),
  ]);

  const currentPrice = quote[0].regularMarketPrice;
  const allMethods: BuyPriceBreakdown[] = [];

  // ==========================================================================
  // Method 1: DCF Intrinsic Value * (1 - margin of safety)
  // Using a simple earnings-based intrinsic value estimate
  // ==========================================================================

  const pe = quote[0].trailingPE ?? fundamentals.trailingPE;
  const eps = fundamentals.totalRevenue > 0 && pe > 0
    ? currentPrice / pe
    : null;

  if (eps && pe) {
    // Estimate intrinsic value using normalized PE of 15 (market average)
    const normalizedPE = 15;
    const intrinsicValue = eps * normalizedPE;
    const dcfBuyPrice = intrinsicValue * (1 - marginOfSafety);

    if (dcfBuyPrice > 0) {
      allMethods.push({
        method: 'DCF_MARGIN',
        price: dcfBuyPrice,
        description: `Intrinsic value ($${intrinsicValue.toFixed(2)}) * ${((1 - marginOfSafety) * 100).toFixed(0)}% margin`,
      });
    }
  }

  // ==========================================================================
  // Method 2: 52-week low + 10%
  // ==========================================================================

  const low52 = range.low;
  const low52BuyPrice = low52 * 1.10;

  allMethods.push({
    method: '52_WEEK_LOW',
    price: low52BuyPrice,
    description: `52-week low ($${low52.toFixed(2)}) + 10% buffer`,
  });

  // ==========================================================================
  // Method 3: 200-day MA - 5%
  // ==========================================================================

  const ma200 = quote[0].twoHundredDayAverage;
  if (ma200 && ma200 > 0) {
    const ma200BuyPrice = ma200 * 0.95;

    allMethods.push({
      method: '200_DAY_MA',
      price: ma200BuyPrice,
      description: `200-day MA ($${ma200.toFixed(2)}) - 5%`,
    });
  }

  // ==========================================================================
  // Method 4: Analyst price target * 0.75
  // ==========================================================================

  if (priceTarget?.targetMean && priceTarget.targetMean > 0) {
    const targetBuyPrice = priceTarget.targetMean * 0.75;

    allMethods.push({
      method: 'ANALYST_TARGET',
      price: targetBuyPrice,
      description: `Analyst target ($${priceTarget.targetMean.toFixed(2)}) * 75%`,
    });
  }

  // ==========================================================================
  // Select the most conservative (lowest) buy price
  // ==========================================================================

  if (allMethods.length === 0) {
    // Fallback: current price * (1 - margin of safety)
    const fallbackPrice = currentPrice * (1 - marginOfSafety);
    allMethods.push({
      method: 'DCF_MARGIN',
      price: fallbackPrice,
      description: `Current price * ${((1 - marginOfSafety) * 100).toFixed(0)}% margin (fallback)`,
    });
  }

  // Sort by price ascending (most conservative first)
  allMethods.sort((a, b) => a.price - b.price);

  const selectedMethod = allMethods[0];
  const buyPrice = selectedMethod.price;
  const discountPercent = ((currentPrice - buyPrice) / currentPrice) * 100;
  const isBuyable = currentPrice <= buyPrice;

  // Generate reasoning
  const reasoning = generateReasoning(
    ticker,
    currentPrice,
    buyPrice,
    selectedMethod,
    allMethods
  );

  return {
    buyPrice,
    currentPrice,
    discountPercent,
    method: selectedMethod.method,
    reasoning,
    isBuyable,
    allMethods,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateReasoning(
  ticker: string,
  currentPrice: number,
  buyPrice: number,
  selectedMethod: BuyPriceBreakdown,
  allMethods: BuyPriceBreakdown[]
): string {
  const parts: string[] = [];

  parts.push(
    `Recommended buy price for ${ticker}: $${buyPrice.toFixed(2)} (current: $${currentPrice.toFixed(2)}).`
  );

  parts.push(`Selected method: ${formatMethodName(selectedMethod.method)}.`);
  parts.push(selectedMethod.description);

  if (currentPrice <= buyPrice) {
    parts.push('ACTIONABLE: Current price is at or below buy target.');
  } else {
    const waitPercent = ((currentPrice - buyPrice) / currentPrice) * 100;
    parts.push(
      `Need ${waitPercent.toFixed(1)}% decline to reach buy target.`
    );
  }

  // Mention other methods for context
  if (allMethods.length > 1) {
    const otherPrices = allMethods
      .slice(1)
      .map((m) => `${formatMethodName(m.method)}: $${m.price.toFixed(2)}`)
      .join(', ');
    parts.push(`Other targets: ${otherPrices}`);
  }

  return parts.join(' ');
}

function formatMethodName(method: BuyPriceMethod): string {
  switch (method) {
    case 'DCF_MARGIN':
      return 'DCF with margin of safety';
    case '52_WEEK_LOW':
      return '52-week low + buffer';
    case '200_DAY_MA':
      return '200-day MA discount';
    case 'ANALYST_TARGET':
      return 'Analyst target discount';
    default:
      return method;
  }
}

export { BuyPriceResult };
