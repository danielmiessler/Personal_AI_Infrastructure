/**
 * Quality Score Calculator
 *
 * Calculates a 22-point quality score based on fundamental metrics.
 * Each component scores 0-3 points based on thresholds.
 */

import type {
  QualityScoreInput,
  QualityScoreResult,
  QualityComponent,
  QualityCategory,
  QualityInterpretation,
} from './types';
import { QUALITY_THRESHOLDS } from './types';

// =============================================================================
// Score Calculation
// =============================================================================

export async function calculateQualityScore(
  input: QualityScoreInput
): Promise<QualityScoreResult> {
  const { ticker, dataProvider } = input;

  // Fetch required data
  const [financials, fundamentals] = await Promise.all([
    dataProvider.finnhub.getFinancials(ticker),
    dataProvider.yahoo.getFundamentals(ticker),
  ]);

  const metric = financials.metric;
  const breakdown: QualityComponent[] = [];

  // ==========================================================================
  // Profitability (3 components, max 9 points)
  // ==========================================================================

  // ROE - Return on Equity
  const roe = metric.roeTTM ?? metric.roeAnnual ?? fundamentals.returnOnEquity * 100;
  breakdown.push(scoreComponent('ROE', 'Profitability', roe, {
    thresholds: [20, 15, 10],
    higherIsBetter: true,
    suffix: '%',
  }));

  // Operating Margin
  const opMargin = (fundamentals.operatingMargins ?? 0) * 100;
  breakdown.push(scoreComponent('Operating Margin', 'Profitability', opMargin, {
    thresholds: [25, 15, 8],
    higherIsBetter: true,
    suffix: '%',
  }));

  // Net Margin
  const netMargin = metric.netProfitMarginTTM ?? metric.netProfitMarginAnnual ?? (fundamentals.profitMargins ?? 0) * 100;
  breakdown.push(scoreComponent('Net Margin', 'Profitability', netMargin, {
    thresholds: [20, 12, 5],
    higherIsBetter: true,
    suffix: '%',
  }));

  // ==========================================================================
  // Growth (3 components, max 9 points)
  // ==========================================================================

  // Revenue Growth
  const revenueGrowth = (fundamentals.revenueGrowth ?? 0) * 100;
  breakdown.push(scoreComponent('Revenue Growth', 'Growth', revenueGrowth, {
    thresholds: [20, 10, 5],
    higherIsBetter: true,
    suffix: '%',
  }));

  // Earnings Growth
  const earningsGrowth = (fundamentals.earningsGrowth ?? 0) * 100;
  breakdown.push(scoreComponent('Earnings Growth', 'Growth', earningsGrowth, {
    thresholds: [25, 15, 5],
    higherIsBetter: true,
    suffix: '%',
  }));

  // Cash Flow Growth (approximate via FCF/Revenue trend)
  const fcfMargin = fundamentals.totalRevenue > 0
    ? (fundamentals.freeCashflow / fundamentals.totalRevenue) * 100
    : 0;
  breakdown.push(scoreComponent('Cash Flow Margin', 'Growth', fcfMargin, {
    thresholds: [15, 8, 3],
    higherIsBetter: true,
    suffix: '%',
  }));

  // ==========================================================================
  // Balance Sheet (3 components, max 9 points)
  // ==========================================================================

  // Debt/Equity
  const debtEquity = fundamentals.debtToEquity ?? metric.totalDebt_totalEquityAnnual ?? 0;
  breakdown.push(scoreComponent('Debt/Equity', 'Balance Sheet', debtEquity, {
    thresholds: [0.3, 0.6, 1.0],
    higherIsBetter: false,
    suffix: 'x',
  }));

  // Current Ratio
  const currentRatio = fundamentals.currentRatio ?? metric.currentRatioQuarterly ?? metric.currentRatioAnnual ?? 0;
  breakdown.push(scoreComponent('Current Ratio', 'Balance Sheet', currentRatio, {
    thresholds: [2.0, 1.5, 1.0],
    higherIsBetter: true,
    suffix: 'x',
  }));

  // Interest Coverage (approximate from operating income / interest)
  // Using debt levels as proxy since direct interest coverage may not be available
  const debtLevel = fundamentals.totalDebt ?? 0;
  const cashLevel = fundamentals.totalCash ?? 0;
  const netDebtRatio = debtLevel > 0 ? cashLevel / debtLevel : 10; // Higher is better
  breakdown.push(scoreComponent('Cash/Debt Coverage', 'Balance Sheet', netDebtRatio, {
    thresholds: [1.0, 0.5, 0.2],
    higherIsBetter: true,
    suffix: 'x',
  }));

  // ==========================================================================
  // Efficiency (2 components, max 6 points)
  // ==========================================================================

  // Asset Turnover (Revenue / Assets, approximated)
  const roa = metric.roaTTM ?? metric.roaAnnual ?? fundamentals.returnOnAssets * 100;
  breakdown.push(scoreComponent('Asset Efficiency (ROA)', 'Efficiency', roa, {
    thresholds: [10, 6, 3],
    higherIsBetter: true,
    suffix: '%',
  }));

  // Return on Capital Employed (using ROE as proxy with debt consideration)
  const roceProxy = roe * (1 / (1 + (debtEquity / 100)));
  breakdown.push(scoreComponent('Capital Efficiency', 'Efficiency', roceProxy, {
    thresholds: [15, 10, 5],
    higherIsBetter: true,
    suffix: '%',
  }));

  // ==========================================================================
  // Quality (3 components, max 9 points)
  // ==========================================================================

  // Earnings Quality (Operating Cash Flow / Net Income)
  // Higher ratio indicates higher quality earnings
  const earningsQuality = fundamentals.operatingCashflow > 0 && fundamentals.profitMargins > 0
    ? fundamentals.operatingCashflow / (fundamentals.totalRevenue * fundamentals.profitMargins)
    : 0;
  breakdown.push(scoreComponent('Earnings Quality', 'Quality', earningsQuality, {
    thresholds: [1.2, 1.0, 0.8],
    higherIsBetter: true,
    suffix: 'x',
  }));

  // Revenue Consistency (using beta as volatility proxy - lower is more consistent)
  const beta = fundamentals.beta ?? 1.0;
  breakdown.push(scoreComponent('Stability (Beta)', 'Quality', beta, {
    thresholds: [0.8, 1.0, 1.3],
    higherIsBetter: false,
    suffix: '',
  }));

  // Margin Stability (gross margin level as quality indicator)
  const grossMargin = (fundamentals.grossMargins ?? 0) * 100;
  breakdown.push(scoreComponent('Gross Margin', 'Quality', grossMargin, {
    thresholds: [50, 35, 20],
    higherIsBetter: true,
    suffix: '%',
  }));

  // ==========================================================================
  // Shareholder (2 components, max 6 points)
  // ==========================================================================

  // Buyback Activity (using shares outstanding trend - not directly available)
  // Using institutional ownership as quality proxy
  const institutionalOwnership = (fundamentals.heldPercentInstitutions ?? 0) * 100;
  breakdown.push(scoreComponent('Institutional Ownership', 'Shareholder', institutionalOwnership, {
    thresholds: [80, 60, 40],
    higherIsBetter: true,
    suffix: '%',
  }));

  // Dividend Track Record
  const dividendYield = (fundamentals.dividendYield ?? 0) * 100;
  const payoutRatio = (fundamentals.payoutRatio ?? 0) * 100;
  // Prefer moderate dividend with sustainable payout
  const dividendScore = dividendYield > 0 && payoutRatio < 75 ? dividendYield : 0;
  breakdown.push(scoreComponent('Dividend Sustainability', 'Shareholder', dividendScore, {
    thresholds: [3, 2, 1],
    higherIsBetter: true,
    suffix: '%',
  }));

  // ==========================================================================
  // Calculate Total
  // ==========================================================================

  const totalScore = breakdown.reduce((sum, c) => sum + c.points, 0);
  const maxScore = breakdown.reduce((sum, c) => sum + c.maxPoints, 0);
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  return {
    score: totalScore,
    maxScore,
    percentage,
    breakdown,
    interpretation: interpretScore(totalScore),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

interface ScoringOptions {
  thresholds: [number, number, number]; // 3pt, 2pt, 1pt thresholds
  higherIsBetter: boolean;
  suffix: string;
}

function scoreComponent(
  name: string,
  category: QualityCategory,
  value: number | null | undefined,
  options: ScoringOptions
): QualityComponent {
  const { thresholds, higherIsBetter, suffix } = options;
  const [t3, t2, t1] = thresholds;

  if (value === null || value === undefined || isNaN(value)) {
    return {
      name,
      category,
      points: 0,
      maxPoints: 3,
      reasoning: 'Data not available',
    };
  }

  let points: number;
  let assessment: string;

  if (higherIsBetter) {
    if (value >= t3) {
      points = 3;
      assessment = 'Excellent';
    } else if (value >= t2) {
      points = 2;
      assessment = 'Good';
    } else if (value >= t1) {
      points = 1;
      assessment = 'Fair';
    } else {
      points = 0;
      assessment = 'Poor';
    }
  } else {
    // Lower is better
    if (value <= t3) {
      points = 3;
      assessment = 'Excellent';
    } else if (value <= t2) {
      points = 2;
      assessment = 'Good';
    } else if (value <= t1) {
      points = 1;
      assessment = 'Fair';
    } else {
      points = 0;
      assessment = 'Poor';
    }
  }

  const formattedValue = typeof value === 'number'
    ? `${value.toFixed(2)}${suffix}`
    : String(value);

  return {
    name,
    category,
    points,
    maxPoints: 3,
    reasoning: `${formattedValue} - ${assessment}`,
  };
}

function interpretScore(score: number): QualityInterpretation {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'Excellent';
  if (score >= QUALITY_THRESHOLDS.good) return 'Good';
  if (score >= QUALITY_THRESHOLDS.fair) return 'Fair';
  if (score >= QUALITY_THRESHOLDS.poor) return 'Poor';
  return 'Very Poor';
}

export { QualityScoreResult };
