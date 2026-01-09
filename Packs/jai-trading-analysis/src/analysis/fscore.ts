/**
 * Piotroski F-Score Calculation
 *
 * The Piotroski F-Score is a 0-9 score used to assess the financial strength
 * of a company based on 9 fundamental criteria across profitability,
 * leverage/liquidity, and operating efficiency.
 *
 * Score Interpretation:
 * - 8-9: Strong (STRONG)
 * - 5-7: Moderate (MODERATE)
 * - 3-4: Weak (WEAK)
 * - 0-2: Avoid (AVOID)
 */

import type {
  AnalysisDataProvider,
  FScoreResult,
  FScoreComponent,
  FScoreComponentId,
  FScoreInterpretation,
  FinancialsData,
} from './types';
import type { Policy } from 'jai-finance-core';

// =============================================================================
// F-Score Component Definitions
// =============================================================================

interface FScoreComponentDef {
  id: FScoreComponentId;
  name: string;
  category: 'profitability' | 'leverage' | 'efficiency';
  description: string;
}

const FSCORE_COMPONENTS: FScoreComponentDef[] = [
  // Profitability (4 points)
  { id: 'ROA_POSITIVE', name: 'Positive ROA', category: 'profitability', description: 'Return on assets is positive' },
  { id: 'OPERATING_CASH_FLOW_POSITIVE', name: 'Positive Operating Cash Flow', category: 'profitability', description: 'Operating cash flow is positive' },
  { id: 'ROA_IMPROVING', name: 'Improving ROA', category: 'profitability', description: 'ROA higher than prior year' },
  { id: 'CASH_FLOW_GT_NET_INCOME', name: 'Cash Flow > Net Income', category: 'profitability', description: 'Operating cash flow exceeds net income (quality of earnings)' },

  // Leverage/Liquidity (3 points)
  { id: 'LONG_TERM_DEBT_DECREASING', name: 'Decreasing Long-term Debt', category: 'leverage', description: 'Long-term debt ratio decreased YoY' },
  { id: 'CURRENT_RATIO_IMPROVING', name: 'Improving Current Ratio', category: 'leverage', description: 'Current ratio higher than prior year' },
  { id: 'NO_SHARE_DILUTION', name: 'No Share Dilution', category: 'leverage', description: 'No new shares issued' },

  // Operating Efficiency (2 points)
  { id: 'GROSS_MARGIN_IMPROVING', name: 'Improving Gross Margin', category: 'efficiency', description: 'Gross margin higher than prior year' },
  { id: 'ASSET_TURNOVER_IMPROVING', name: 'Improving Asset Turnover', category: 'efficiency', description: 'Asset turnover ratio improved' },
];

// =============================================================================
// Component Check Implementations
// =============================================================================

/**
 * ROA_POSITIVE: Return on Assets > 0
 */
function checkROAPositive(financials: FinancialsData): FScoreComponent {
  const roa = financials.roa;

  return {
    id: 'ROA_POSITIVE',
    name: 'Positive ROA',
    passed: roa !== undefined && roa > 0,
    currentValue: roa,
  };
}

/**
 * OPERATING_CASH_FLOW_POSITIVE: Operating Cash Flow > 0
 */
function checkOperatingCashFlowPositive(financials: FinancialsData): FScoreComponent {
  const ocf = financials.operatingCashFlow;

  return {
    id: 'OPERATING_CASH_FLOW_POSITIVE',
    name: 'Positive Operating Cash Flow',
    passed: ocf !== undefined && ocf > 0,
    currentValue: ocf,
  };
}

/**
 * ROA_IMPROVING: Current ROA > Prior Year ROA
 */
function checkROAImproving(financials: FinancialsData): FScoreComponent {
  const currentROA = financials.roa;
  const priorROA = financials.roaTTM; // Using TTM as proxy for prior

  // If we don't have prior data, check if current is significantly positive
  if (priorROA === undefined) {
    return {
      id: 'ROA_IMPROVING',
      name: 'Improving ROA',
      passed: currentROA !== undefined && currentROA > 0.05, // > 5% is good
      currentValue: currentROA,
    };
  }

  return {
    id: 'ROA_IMPROVING',
    name: 'Improving ROA',
    passed: currentROA !== undefined && currentROA > priorROA,
    currentValue: currentROA,
    priorValue: priorROA,
  };
}

/**
 * CASH_FLOW_GT_NET_INCOME: Operating Cash Flow > Net Income
 * This indicates quality of earnings (cash backing the reported profits)
 */
function checkCashFlowGTNetIncome(financials: FinancialsData): FScoreComponent {
  const ocf = financials.operatingCashFlow;
  const netIncome = financials.netIncome;

  // If net income is negative, OCF just needs to be positive
  if (netIncome !== undefined && netIncome < 0) {
    return {
      id: 'CASH_FLOW_GT_NET_INCOME',
      name: 'Cash Flow > Net Income',
      passed: ocf !== undefined && ocf > netIncome,
      currentValue: ocf,
      priorValue: netIncome,
    };
  }

  return {
    id: 'CASH_FLOW_GT_NET_INCOME',
    name: 'Cash Flow > Net Income',
    passed: ocf !== undefined && netIncome !== undefined && ocf > netIncome,
    currentValue: ocf,
    priorValue: netIncome,
  };
}

/**
 * LONG_TERM_DEBT_DECREASING: Long-term debt ratio decreased
 */
function checkLongTermDebtDecreasing(financials: FinancialsData): FScoreComponent {
  const currentDebt = financials.totalDebt;
  const priorDebt = financials.totalDebtPriorYear;

  // If no prior data, check if debt to equity is reasonable
  if (priorDebt === undefined) {
    const debtToEquity = financials.debtToEquity;
    return {
      id: 'LONG_TERM_DEBT_DECREASING',
      name: 'Decreasing Long-term Debt',
      passed: debtToEquity !== undefined && debtToEquity < 1.0, // D/E < 1 is reasonable
      currentValue: debtToEquity,
    };
  }

  return {
    id: 'LONG_TERM_DEBT_DECREASING',
    name: 'Decreasing Long-term Debt',
    passed: currentDebt !== undefined && currentDebt < priorDebt,
    currentValue: currentDebt,
    priorValue: priorDebt,
  };
}

/**
 * CURRENT_RATIO_IMPROVING: Current Ratio increased YoY
 */
function checkCurrentRatioImproving(financials: FinancialsData): FScoreComponent {
  const currentRatio = financials.currentRatio;
  const priorRatio = financials.currentRatioPriorYear;

  // If no prior data, check if current ratio is healthy
  if (priorRatio === undefined) {
    return {
      id: 'CURRENT_RATIO_IMPROVING',
      name: 'Improving Current Ratio',
      passed: currentRatio !== undefined && currentRatio > 1.5, // > 1.5 is healthy
      currentValue: currentRatio,
    };
  }

  return {
    id: 'CURRENT_RATIO_IMPROVING',
    name: 'Improving Current Ratio',
    passed: currentRatio !== undefined && currentRatio > priorRatio,
    currentValue: currentRatio,
    priorValue: priorRatio,
  };
}

/**
 * NO_SHARE_DILUTION: Shares outstanding did not increase
 */
function checkNoShareDilution(financials: FinancialsData): FScoreComponent {
  const currentShares = financials.sharesOutstanding;
  const priorShares = financials.sharesOutstandingPriorYear;

  // If no prior data, assume no dilution
  if (priorShares === undefined) {
    return {
      id: 'NO_SHARE_DILUTION',
      name: 'No Share Dilution',
      passed: true,
      currentValue: currentShares,
    };
  }

  return {
    id: 'NO_SHARE_DILUTION',
    name: 'No Share Dilution',
    passed: currentShares !== undefined && currentShares <= priorShares,
    currentValue: currentShares,
    priorValue: priorShares,
  };
}

/**
 * GROSS_MARGIN_IMPROVING: Gross Margin increased YoY
 */
function checkGrossMarginImproving(financials: FinancialsData): FScoreComponent {
  const currentMargin = financials.grossMargin;
  const priorMargin = financials.grossMarginPriorYear;

  // If no prior data, check if margin is strong
  if (priorMargin === undefined) {
    return {
      id: 'GROSS_MARGIN_IMPROVING',
      name: 'Improving Gross Margin',
      passed: currentMargin !== undefined && currentMargin > 0.30, // > 30% is decent
      currentValue: currentMargin,
    };
  }

  return {
    id: 'GROSS_MARGIN_IMPROVING',
    name: 'Improving Gross Margin',
    passed: currentMargin !== undefined && currentMargin > priorMargin,
    currentValue: currentMargin,
    priorValue: priorMargin,
  };
}

/**
 * ASSET_TURNOVER_IMPROVING: Asset Turnover increased YoY
 * Asset Turnover = Revenue / Total Assets
 */
function checkAssetTurnoverImproving(financials: FinancialsData): FScoreComponent {
  // Calculate asset turnover
  const revenue = financials.revenue;
  const totalAssets = financials.totalAssets;
  const revenuePrior = financials.revenuePriorYear;
  const totalAssetsPrior = financials.totalAssetsPriorYear;

  // If we don't have the data, use revenue growth as proxy
  if (totalAssets === undefined || totalAssetsPrior === undefined) {
    const revenueGrowth = financials.revenueGrowth;
    return {
      id: 'ASSET_TURNOVER_IMPROVING',
      name: 'Improving Asset Turnover',
      passed: revenueGrowth !== undefined && revenueGrowth > 0,
      currentValue: revenueGrowth,
    };
  }

  const currentTurnover = revenue !== undefined ? revenue / totalAssets : undefined;
  const priorTurnover = revenuePrior !== undefined ? revenuePrior / totalAssetsPrior : undefined;

  return {
    id: 'ASSET_TURNOVER_IMPROVING',
    name: 'Improving Asset Turnover',
    passed: currentTurnover !== undefined && priorTurnover !== undefined && currentTurnover > priorTurnover,
    currentValue: currentTurnover,
    priorValue: priorTurnover,
  };
}

// =============================================================================
// Score Interpretation
// =============================================================================

function interpretScore(score: number): FScoreInterpretation {
  if (score >= 8) return 'STRONG';
  if (score >= 5) return 'MODERATE';
  if (score >= 3) return 'WEAK';
  return 'AVOID';
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Calculate Piotroski F-Score for a stock
 *
 * @param ticker - Stock ticker symbol
 * @param dataProvider - Data provider for market data
 * @param policy - Investment policy for rule references
 * @returns FScoreResult with 0-9 score and component details
 */
export async function calculateFScore(
  ticker: string,
  dataProvider: AnalysisDataProvider,
  policy: Policy
): Promise<FScoreResult> {
  // Fetch financial data
  const financials = await dataProvider.getFinancials(ticker);

  // Run all component checks
  const components: FScoreComponent[] = [
    // Profitability
    checkROAPositive(financials),
    checkOperatingCashFlowPositive(financials),
    checkROAImproving(financials),
    checkCashFlowGTNetIncome(financials),
    // Leverage/Liquidity
    checkLongTermDebtDecreasing(financials),
    checkCurrentRatioImproving(financials),
    checkNoShareDilution(financials),
    // Operating Efficiency
    checkGrossMarginImproving(financials),
    checkAssetTurnoverImproving(financials),
  ];

  // Calculate total score (0-9)
  const score = components.filter((c) => c.passed).length;

  return {
    score,
    components,
    interpretation: interpretScore(score),
  };
}

export { FScoreResult };
