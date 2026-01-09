/**
 * Yellow Flag Analysis
 *
 * Weighted warning signals that indicate elevated risk.
 * Individual flags don't disqualify a stock, but accumulated weight does.
 */

import type {
  AnalysisDataProvider,
  YellowFlagsResult,
  YellowFlag,
  YellowFlagId,
  FinancialsData,
  NewsItem,
} from './types';
import type { Policy } from 'jai-finance-core';

// =============================================================================
// Yellow Flag Definitions with Weights
// =============================================================================

interface YellowFlagDefinition {
  id: YellowFlagId;
  name: string;
  weight: number;
  description: string;
}

/**
 * Yellow flag weights (sum to 115 to allow some buffer for scoring)
 * Lower final score = fewer warnings = better
 */
const YELLOW_FLAG_DEFINITIONS: YellowFlagDefinition[] = [
  { id: 'HIGH_PE', name: 'High P/E Ratio', weight: 15, description: 'P/E significantly above sector average' },
  { id: 'DECLINING_MARGINS', name: 'Declining Margins', weight: 20, description: 'Gross or operating margins declining YoY' },
  { id: 'REVENUE_DECELERATION', name: 'Revenue Deceleration', weight: 15, description: 'Revenue growth slowing significantly' },
  { id: 'INVENTORY_BUILDUP', name: 'Inventory Buildup', weight: 10, description: 'Inventory growing faster than sales' },
  { id: 'RECEIVABLES_GROWTH', name: 'Receivables Growth', weight: 10, description: 'Receivables growing faster than revenue' },
  { id: 'EXECUTIVE_DEPARTURES', name: 'Executive Departures', weight: 20, description: 'Recent C-suite departures' },
  { id: 'GUIDANCE_LOWERED', name: 'Guidance Lowered', weight: 15, description: 'Company lowered forward guidance' },
  { id: 'SHORT_INTEREST_HIGH', name: 'High Short Interest', weight: 10, description: 'Short interest above 10% of float' },
];

// =============================================================================
// Check Implementations
// =============================================================================

interface CheckContext {
  ticker: string;
  financials: FinancialsData;
  news: NewsItem[];
  policy: Policy;
}

/**
 * HIGH_PE: P/E ratio significantly above reasonable levels
 * Threshold: P/E > 35 (growth premium) or P/E > 60 (excessive)
 */
function checkHighPE(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'HIGH_PE')!;
  const pe = ctx.financials.peRatio;

  if (pe === undefined || pe === null || pe <= 0) {
    return {
      id: 'HIGH_PE',
      name: def.name,
      weight: def.weight,
      triggered: false,
      finding: 'P/E data unavailable or negative earnings',
    };
  }

  // Tiered thresholds
  const ELEVATED_THRESHOLD = 35;
  const EXCESSIVE_THRESHOLD = 60;

  const triggered = pe > ELEVATED_THRESHOLD;
  const excessive = pe > EXCESSIVE_THRESHOLD;

  return {
    id: 'HIGH_PE',
    name: def.name,
    weight: excessive ? def.weight : Math.floor(def.weight * 0.6), // Reduced weight for moderately high PE
    triggered,
    finding: triggered
      ? `P/E of ${pe.toFixed(1)} is ${excessive ? 'excessive' : 'elevated'} (threshold: ${ELEVATED_THRESHOLD})`
      : `P/E of ${pe.toFixed(1)} is reasonable`,
  };
}

/**
 * DECLINING_MARGINS: Gross or operating margins declining year-over-year
 */
function checkDecliningMargins(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'DECLINING_MARGINS')!;

  const grossMargin = ctx.financials.grossMargin;
  const grossMarginPrior = ctx.financials.grossMarginPriorYear;
  const opMargin = ctx.financials.operatingMargin;
  const opMarginPrior = ctx.financials.operatingMarginPriorYear;

  const findings: string[] = [];
  let triggered = false;

  // Check gross margin decline
  if (grossMargin !== undefined && grossMarginPrior !== undefined) {
    const grossDecline = grossMargin - grossMarginPrior;
    if (grossDecline < -0.02) { // More than 2pp decline
      triggered = true;
      findings.push(`Gross margin declined ${(grossDecline * 100).toFixed(1)}pp`);
    }
  }

  // Check operating margin decline
  if (opMargin !== undefined && opMarginPrior !== undefined) {
    const opDecline = opMargin - opMarginPrior;
    if (opDecline < -0.02) { // More than 2pp decline
      triggered = true;
      findings.push(`Operating margin declined ${(opDecline * 100).toFixed(1)}pp`);
    }
  }

  return {
    id: 'DECLINING_MARGINS',
    name: def.name,
    weight: def.weight,
    triggered,
    finding: triggered ? findings.join('; ') : 'Margins stable or improving',
  };
}

/**
 * REVENUE_DECELERATION: Revenue growth slowing significantly from prior period
 */
function checkRevenueDeceleration(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'REVENUE_DECELERATION')!;

  const currentGrowth = ctx.financials.revenueGrowth;
  const priorGrowth = ctx.financials.revenueGrowthPriorYear;

  if (currentGrowth === undefined) {
    return {
      id: 'REVENUE_DECELERATION',
      name: def.name,
      weight: def.weight,
      triggered: false,
      finding: 'Revenue growth data unavailable',
    };
  }

  // Two ways to trigger:
  // 1. Significant deceleration from prior year (>10pp slowdown)
  // 2. Negative revenue growth
  let triggered = false;
  let finding = '';

  if (currentGrowth < 0) {
    triggered = true;
    finding = `Revenue declining ${(currentGrowth * 100).toFixed(1)}% YoY`;
  } else if (priorGrowth !== undefined && currentGrowth < priorGrowth - 0.10) {
    triggered = true;
    finding = `Revenue growth decelerated from ${(priorGrowth * 100).toFixed(1)}% to ${(currentGrowth * 100).toFixed(1)}%`;
  } else {
    finding = `Revenue growth: ${(currentGrowth * 100).toFixed(1)}%`;
  }

  return {
    id: 'REVENUE_DECELERATION',
    name: def.name,
    weight: def.weight,
    triggered,
    finding,
  };
}

/**
 * INVENTORY_BUILDUP: Inventory growing faster than sales
 * Note: This check requires additional data that may not be available
 */
function checkInventoryBuildup(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'INVENTORY_BUILDUP')!;

  // Without direct inventory data, we use revenue growth as a proxy
  // If revenue is declining but assets are growing, that's a concern
  const revenueGrowth = ctx.financials.revenueGrowth;

  // This is a simplified check - full implementation would need inventory data
  // For now, we flag if revenue is declining significantly
  const triggered = revenueGrowth !== undefined && revenueGrowth < -0.05;

  return {
    id: 'INVENTORY_BUILDUP',
    name: def.name,
    weight: def.weight,
    triggered,
    finding: triggered
      ? 'Potential inventory issues (revenue declining)'
      : 'No inventory buildup indicators',
  };
}

/**
 * RECEIVABLES_GROWTH: Receivables growing faster than revenue
 * Indicates potential collection issues or revenue recognition problems
 */
function checkReceivablesGrowth(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'RECEIVABLES_GROWTH')!;

  // Without direct receivables data, use proxy metrics
  // High days sales outstanding relative to industry is a concern
  // For now, flag if cash flow from operations is significantly below net income

  const ocf = ctx.financials.operatingCashFlow;
  const netIncome = ctx.financials.netIncome;

  if (ocf === undefined || netIncome === undefined || netIncome <= 0) {
    return {
      id: 'RECEIVABLES_GROWTH',
      name: def.name,
      weight: def.weight,
      triggered: false,
      finding: 'Insufficient data for receivables analysis',
    };
  }

  // If OCF is significantly below net income, could indicate receivables issues
  const ocfToNiRatio = ocf / netIncome;
  const triggered = ocfToNiRatio < 0.5;

  return {
    id: 'RECEIVABLES_GROWTH',
    name: def.name,
    weight: def.weight,
    triggered,
    finding: triggered
      ? `Operating cash flow only ${(ocfToNiRatio * 100).toFixed(0)}% of net income (potential collection issues)`
      : 'Cash flow conversion healthy',
  };
}

/**
 * EXECUTIVE_DEPARTURES: Recent C-suite departures
 */
function checkExecutiveDepartures(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'EXECUTIVE_DEPARTURES')!;

  const departureKeywords = [
    'ceo departure', 'cfo departure', 'ceo resigns', 'cfo resigns',
    'ceo leaves', 'cfo leaves', 'executive departure', 'c-suite change',
    'ceo steps down', 'cfo steps down', 'chief executive', 'chief financial',
  ];

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const departureNews = ctx.news.filter((n) => {
    if (new Date(n.publishedAt) < sixMonthsAgo) return false;
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    return departureKeywords.some((kw) => combined.includes(kw));
  });

  const triggered = departureNews.length > 0;

  return {
    id: 'EXECUTIVE_DEPARTURES',
    name: def.name,
    weight: def.weight,
    triggered,
    finding: triggered
      ? `${departureNews.length} executive departure(s) in past 6 months`
      : 'No recent executive departures',
  };
}

/**
 * GUIDANCE_LOWERED: Company lowered forward guidance
 */
function checkGuidanceLowered(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'GUIDANCE_LOWERED')!;

  const guidanceKeywords = [
    'lowers guidance', 'lowered guidance', 'cuts guidance', 'reduces guidance',
    'below expectations', 'misses estimates', 'warns', 'warning',
    'disappointing outlook', 'revised lower', 'downward revision',
  ];

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const guidanceNews = ctx.news.filter((n) => {
    if (new Date(n.publishedAt) < threeMonthsAgo) return false;
    const combined = `${n.headline} ${n.summary || ''}`.toLowerCase();
    return guidanceKeywords.some((kw) => combined.includes(kw));
  });

  const triggered = guidanceNews.length > 0;

  return {
    id: 'GUIDANCE_LOWERED',
    name: def.name,
    weight: def.weight,
    triggered,
    finding: triggered
      ? 'Company lowered guidance or warned on results'
      : 'No recent guidance reductions',
  };
}

/**
 * SHORT_INTEREST_HIGH: Short interest above 10% of float
 */
function checkShortInterestHigh(ctx: CheckContext): YellowFlag {
  const def = YELLOW_FLAG_DEFINITIONS.find((d) => d.id === 'SHORT_INTEREST_HIGH')!;

  const shortPercentFloat = ctx.financials.shortPercentOfFloat;

  if (shortPercentFloat === undefined) {
    return {
      id: 'SHORT_INTEREST_HIGH',
      name: def.name,
      weight: def.weight,
      triggered: false,
      finding: 'Short interest data unavailable',
    };
  }

  const ELEVATED_THRESHOLD = 0.10; // 10%
  const HIGH_THRESHOLD = 0.20; // 20%

  const triggered = shortPercentFloat > ELEVATED_THRESHOLD;
  const veryHigh = shortPercentFloat > HIGH_THRESHOLD;

  return {
    id: 'SHORT_INTEREST_HIGH',
    name: def.name,
    weight: veryHigh ? def.weight : Math.floor(def.weight * 0.6),
    triggered,
    finding: triggered
      ? `Short interest at ${(shortPercentFloat * 100).toFixed(1)}% of float ${veryHigh ? '(very high)' : '(elevated)'}`
      : `Short interest at ${(shortPercentFloat * 100).toFixed(1)}% of float`,
  };
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Run all yellow flag checks for a stock
 *
 * @param ticker - Stock ticker symbol
 * @param dataProvider - Data provider for market data
 * @param policy - Investment policy for rule references
 * @returns YellowFlagsResult with weighted score and flag details
 */
export async function runYellowFlags(
  ticker: string,
  dataProvider: AnalysisDataProvider,
  policy: Policy
): Promise<YellowFlagsResult> {
  // Fetch required data
  const [financials, news] = await Promise.all([
    dataProvider.getFinancials(ticker),
    dataProvider.getNews(ticker),
  ]);

  const context: CheckContext = {
    ticker,
    financials,
    news,
    policy,
  };

  // Run all checks
  const flags: YellowFlag[] = [
    checkHighPE(context),
    checkDecliningMargins(context),
    checkRevenueDeceleration(context),
    checkInventoryBuildup(context),
    checkReceivablesGrowth(context),
    checkExecutiveDepartures(context),
    checkGuidanceLowered(context),
    checkShortInterestHigh(context),
  ];

  // Calculate weighted score (0-100, lower is better)
  const triggeredFlags = flags.filter((f) => f.triggered);
  const triggeredWeight = triggeredFlags.reduce((sum, f) => sum + f.weight, 0);
  const totalPossibleWeight = YELLOW_FLAG_DEFINITIONS.reduce((sum, d) => sum + d.weight, 0);

  // Normalize to 0-100 scale
  const score = Math.min(100, Math.round((triggeredWeight / totalPossibleWeight) * 100));

  return {
    score,
    flags,
    triggeredCount: triggeredFlags.length,
    triggeredWeight,
  };
}

export { YellowFlagsResult };
