/**
 * Positive Factor Analysis
 *
 * Catalyst and moat scoring - identifies positive attributes that
 * support a bullish thesis.
 */

import type {
  AnalysisDataProvider,
  PositiveFactorsResult,
  PositiveFactor,
  PositiveFactorId,
  FinancialsData,
  InsiderTransaction,
  NewsItem,
} from './types';
import type { Policy } from 'jai-finance-core';

// =============================================================================
// Positive Factor Definitions with Weights
// =============================================================================

interface PositiveFactorDefinition {
  id: PositiveFactorId;
  name: string;
  weight: number;
  description: string;
}

/**
 * Positive factor weights (sum to ~100 for easy percentage scoring)
 * Higher final score = more positive attributes = better
 */
const POSITIVE_FACTOR_DEFINITIONS: PositiveFactorDefinition[] = [
  { id: 'STRONG_MOAT', name: 'Strong Moat', weight: 20, description: 'High ROE and margins indicating competitive advantage' },
  { id: 'RECURRING_REVENUE', name: 'Recurring Revenue', weight: 15, description: 'Subscription or recurring revenue model' },
  { id: 'PRICING_POWER', name: 'Pricing Power', weight: 15, description: 'Ability to raise prices without losing customers' },
  { id: 'MARGIN_EXPANSION', name: 'Margin Expansion', weight: 12, description: 'Improving profit margins over time' },
  { id: 'NEW_PRODUCT_CYCLE', name: 'New Product Cycle', weight: 10, description: 'Recent major product launches or innovation' },
  { id: 'INSIDER_BUYING', name: 'Insider Buying', weight: 10, description: 'Significant insider purchases' },
  { id: 'DIVIDEND_GROWTH', name: 'Dividend Growth', weight: 10, description: 'Consistent dividend increases' },
  { id: 'SHARE_BUYBACKS', name: 'Share Buybacks', weight: 8, description: 'Active share repurchase program' },
];

// =============================================================================
// Check Implementations
// =============================================================================

interface CheckContext {
  ticker: string;
  financials: FinancialsData;
  insiderTxns: InsiderTransaction[];
  news: NewsItem[];
  policy: Policy;
}

/**
 * STRONG_MOAT: High and stable ROE with good margins
 * Indicators: ROE > 15%, gross margin > 40%, consistent over time
 */
function checkStrongMoat(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'STRONG_MOAT')!;

  const roe = ctx.financials.roe;
  const grossMargin = ctx.financials.grossMargin;
  const netMargin = ctx.financials.netProfitMargin;

  const findings: string[] = [];
  let score = 0;

  // ROE component (0-8 points)
  if (roe !== undefined) {
    if (roe > 0.20) {
      score += 8;
      findings.push(`Excellent ROE: ${(roe * 100).toFixed(1)}%`);
    } else if (roe > 0.15) {
      score += 5;
      findings.push(`Good ROE: ${(roe * 100).toFixed(1)}%`);
    }
  }

  // Gross margin component (0-6 points)
  if (grossMargin !== undefined) {
    if (grossMargin > 0.50) {
      score += 6;
      findings.push(`Strong gross margin: ${(grossMargin * 100).toFixed(1)}%`);
    } else if (grossMargin > 0.40) {
      score += 4;
      findings.push(`Healthy gross margin: ${(grossMargin * 100).toFixed(1)}%`);
    }
  }

  // Net margin component (0-6 points)
  if (netMargin !== undefined) {
    if (netMargin > 0.15) {
      score += 6;
      findings.push(`Excellent net margin: ${(netMargin * 100).toFixed(1)}%`);
    } else if (netMargin > 0.10) {
      score += 3;
      findings.push(`Good net margin: ${(netMargin * 100).toFixed(1)}%`);
    }
  }

  // Need at least 12/20 points to indicate a moat
  const present = score >= 12;

  return {
    id: 'STRONG_MOAT',
    name: def.name,
    weight: def.weight,
    present,
    finding: present ? findings.join('; ') : 'No clear competitive moat indicators',
  };
}

/**
 * RECURRING_REVENUE: Check for subscription/recurring revenue indicators
 */
function checkRecurringRevenue(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'RECURRING_REVENUE')!;

  const recurringKeywords = [
    'subscription', 'recurring revenue', 'arr', 'annual recurring',
    'mrr', 'monthly recurring', 'saas', 'software as a service',
    'subscription growth', 'recurring', 'contract renewal',
  ];

  // Check news for recurring revenue mentions
  const recurringNews = ctx.news.filter((n) => {
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    return recurringKeywords.some((kw) => combined.includes(kw));
  });

  // Also use stable revenue growth as a proxy
  const revenueGrowth = ctx.financials.revenueGrowth;
  const stableGrowth = revenueGrowth !== undefined && revenueGrowth > 0.05 && revenueGrowth < 0.50;

  const present = recurringNews.length >= 2 || (stableGrowth && recurringNews.length >= 1);

  return {
    id: 'RECURRING_REVENUE',
    name: def.name,
    weight: def.weight,
    present,
    finding: present
      ? 'Subscription or recurring revenue model indicated'
      : 'No clear recurring revenue model detected',
  };
}

/**
 * PRICING_POWER: Ability to raise prices (indicated by margin expansion + revenue growth)
 */
function checkPricingPower(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'PRICING_POWER')!;

  const grossMargin = ctx.financials.grossMargin;
  const grossMarginPrior = ctx.financials.grossMarginPriorYear;
  const revenueGrowth = ctx.financials.revenueGrowth;

  // Pricing power: revenue growing AND margins expanding (or at least stable)
  const hasData = grossMargin !== undefined && grossMarginPrior !== undefined && revenueGrowth !== undefined;

  if (!hasData) {
    return {
      id: 'PRICING_POWER',
      name: def.name,
      weight: def.weight,
      present: false,
      finding: 'Insufficient data to assess pricing power',
    };
  }

  const marginExpanding = grossMargin >= grossMarginPrior;
  const revenueGrowing = revenueGrowth > 0;
  const strongGrowth = revenueGrowth > 0.10;

  const present = marginExpanding && revenueGrowing && strongGrowth;

  return {
    id: 'PRICING_POWER',
    name: def.name,
    weight: def.weight,
    present,
    finding: present
      ? `Pricing power evident: ${(revenueGrowth! * 100).toFixed(1)}% revenue growth with stable/expanding margins`
      : 'Limited pricing power indicators',
  };
}

/**
 * MARGIN_EXPANSION: Operating or gross margins improving
 */
function checkMarginExpansion(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'MARGIN_EXPANSION')!;

  const grossMargin = ctx.financials.grossMargin;
  const grossMarginPrior = ctx.financials.grossMarginPriorYear;
  const opMargin = ctx.financials.operatingMargin;
  const opMarginPrior = ctx.financials.operatingMarginPriorYear;

  const findings: string[] = [];
  let present = false;

  // Check gross margin expansion
  if (grossMargin !== undefined && grossMarginPrior !== undefined) {
    const grossChange = grossMargin - grossMarginPrior;
    if (grossChange > 0.01) { // More than 1pp improvement
      present = true;
      findings.push(`Gross margin expanded ${(grossChange * 100).toFixed(1)}pp`);
    }
  }

  // Check operating margin expansion
  if (opMargin !== undefined && opMarginPrior !== undefined) {
    const opChange = opMargin - opMarginPrior;
    if (opChange > 0.01) { // More than 1pp improvement
      present = true;
      findings.push(`Operating margin expanded ${(opChange * 100).toFixed(1)}pp`);
    }
  }

  return {
    id: 'MARGIN_EXPANSION',
    name: def.name,
    weight: def.weight,
    present,
    finding: present ? findings.join('; ') : 'No margin expansion detected',
  };
}

/**
 * NEW_PRODUCT_CYCLE: Recent product launches or innovation
 */
function checkNewProductCycle(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'NEW_PRODUCT_CYCLE')!;

  const productKeywords = [
    'new product', 'product launch', 'launches', 'unveils', 'introduces',
    'innovation', 'next generation', 'breakthrough', 'new platform',
    'expansion', 'new market', 'new service',
  ];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const productNews = ctx.news.filter((n) => {
    if (new Date(n.publishedAt) < sixMonthsAgo) return false;
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    // Must be positive sentiment or neutral, not negative
    if (n.sentiment === 'negative') return false;
    return productKeywords.some((kw) => combined.includes(kw));
  });

  const present = productNews.length >= 2;

  return {
    id: 'NEW_PRODUCT_CYCLE',
    name: def.name,
    weight: def.weight,
    present,
    finding: present
      ? `${productNews.length} new product/innovation announcements in past 6 months`
      : 'No significant product launches detected',
  };
}

/**
 * INSIDER_BUYING: Significant insider purchases
 */
function checkInsiderBuying(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'INSIDER_BUYING')!;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentTxns = ctx.insiderTxns.filter((t) => new Date(t.date) >= threeMonthsAgo);
  const buys = recentTxns.filter((t) => t.transactionType === 'BUY');
  const sells = recentTxns.filter((t) => t.transactionType === 'SELL');

  const totalBuyValue = buys.reduce((sum, t) => sum + t.value, 0);
  const totalSellValue = sells.reduce((sum, t) => sum + t.value, 0);

  const uniqueBuyers = new Set(buys.map((t) => t.name)).size;

  // Criteria: Multiple buyers OR significant buy value exceeding sells
  const present = uniqueBuyers >= 2 || (totalBuyValue > 100_000 && totalBuyValue > totalSellValue);

  let finding = 'No significant insider buying detected';
  if (present) {
    const findings: string[] = [];
    if (uniqueBuyers >= 2) {
      findings.push(`${uniqueBuyers} insiders bought`);
    }
    if (totalBuyValue > 0) {
      findings.push(`$${(totalBuyValue / 1000).toFixed(0)}K in purchases`);
    }
    finding = findings.join(', ');
  }

  return {
    id: 'INSIDER_BUYING',
    name: def.name,
    weight: def.weight,
    present,
    finding,
  };
}

/**
 * DIVIDEND_GROWTH: Consistent dividend increases
 */
function checkDividendGrowth(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'DIVIDEND_GROWTH')!;

  const dividendYield = ctx.financials.dividendYield;
  const dividendGrowth5Y = ctx.financials.dividendGrowth5Y;
  const payoutRatio = ctx.financials.payoutRatio;

  // No dividend = not applicable (but not negative)
  if (!dividendYield || dividendYield === 0) {
    return {
      id: 'DIVIDEND_GROWTH',
      name: def.name,
      weight: 0, // Don't penalize non-dividend stocks
      present: false,
      finding: 'No dividend paid',
    };
  }

  const findings: string[] = [];
  let score = 0;

  // Has meaningful yield
  if (dividendYield > 0.02) {
    score += 3;
    findings.push(`Yield: ${(dividendYield * 100).toFixed(2)}%`);
  }

  // Dividend is growing
  if (dividendGrowth5Y !== undefined && dividendGrowth5Y > 0.03) {
    score += 4;
    findings.push(`5Y growth: ${(dividendGrowth5Y * 100).toFixed(1)}%`);
  }

  // Sustainable payout ratio
  if (payoutRatio !== undefined && payoutRatio > 0 && payoutRatio < 0.70) {
    score += 3;
    findings.push(`Sustainable payout: ${(payoutRatio * 100).toFixed(0)}%`);
  }

  const present = score >= 6;

  return {
    id: 'DIVIDEND_GROWTH',
    name: def.name,
    weight: def.weight,
    present,
    finding: present ? findings.join('; ') : 'Dividend present but limited growth',
  };
}

/**
 * SHARE_BUYBACKS: Active share repurchase program
 */
function checkShareBuybacks(ctx: CheckContext): PositiveFactor {
  const def = POSITIVE_FACTOR_DEFINITIONS.find((d) => d.id === 'SHARE_BUYBACKS')!;

  const currentShares = ctx.financials.sharesOutstanding;
  const priorShares = ctx.financials.sharesOutstandingPriorYear;

  // Also check news for buyback announcements
  const buybackKeywords = ['buyback', 'repurchase', 'share repurchase', 'stock buyback'];

  const buybackNews = ctx.news.filter((n) => {
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    return buybackKeywords.some((kw) => combined.includes(kw));
  });

  let present = false;
  let finding = 'No share buyback program detected';

  // Check if shares outstanding decreased
  if (currentShares !== undefined && priorShares !== undefined && priorShares > 0) {
    const shareChange = (currentShares - priorShares) / priorShares;
    if (shareChange < -0.01) { // More than 1% reduction
      present = true;
      finding = `Shares reduced ${(-shareChange * 100).toFixed(1)}% YoY via buybacks`;
    }
  }

  // Also count buyback announcements
  if (buybackNews.length >= 2) {
    present = true;
    finding = present && finding !== 'No share buyback program detected'
      ? finding + ` (${buybackNews.length} announcements)`
      : `Active buyback program (${buybackNews.length} announcements)`;
  }

  return {
    id: 'SHARE_BUYBACKS',
    name: def.name,
    weight: def.weight,
    present,
    finding,
  };
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Run all positive factor checks for a stock
 *
 * @param ticker - Stock ticker symbol
 * @param dataProvider - Data provider for market data
 * @param policy - Investment policy for rule references
 * @returns PositiveFactorsResult with weighted score and factor details
 */
export async function runPositiveFactors(
  ticker: string,
  dataProvider: AnalysisDataProvider,
  policy: Policy
): Promise<PositiveFactorsResult> {
  // Fetch required data
  const [financials, insiderTxns, news] = await Promise.all([
    dataProvider.getFinancials(ticker),
    dataProvider.getInsiderTransactions(ticker),
    dataProvider.getNews(ticker),
  ]);

  const context: CheckContext = {
    ticker,
    financials,
    insiderTxns,
    news,
    policy,
  };

  // Run all checks
  const factors: PositiveFactor[] = [
    checkStrongMoat(context),
    checkRecurringRevenue(context),
    checkPricingPower(context),
    checkMarginExpansion(context),
    checkNewProductCycle(context),
    checkInsiderBuying(context),
    checkDividendGrowth(context),
    checkShareBuybacks(context),
  ];

  // Calculate weighted score (0-100, higher is better)
  const presentFactors = factors.filter((f) => f.present);
  const presentWeight = presentFactors.reduce((sum, f) => sum + f.weight, 0);
  const totalPossibleWeight = POSITIVE_FACTOR_DEFINITIONS.reduce((sum, d) => sum + d.weight, 0);

  // Normalize to 0-100 scale
  const score = Math.round((presentWeight / totalPossibleWeight) * 100);

  return {
    score,
    factors,
    presentCount: presentFactors.length,
    presentWeight,
  };
}

export { PositiveFactorsResult };
