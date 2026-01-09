/**
 * Comprehensive Scorecard Generator
 *
 * Combines quality, valuation, growth, and momentum scores
 * into an overall assessment with letter grade.
 */

import type {
  ScorecardInput,
  ScorecardResult,
  ValuationScore,
  GrowthScore,
  MomentumScore,
  OverallGrade,
} from './types';
import { GRADE_THRESHOLDS } from './types';
import { calculateQualityScore } from './quality';

// =============================================================================
// Weights for Composite Score
// =============================================================================

const WEIGHTS = {
  quality: 0.35, // 35% - Most important for long-term
  valuation: 0.25, // 25% - Don't overpay
  growth: 0.25, // 25% - Future potential
  momentum: 0.15, // 15% - Timing consideration
} as const;

// =============================================================================
// Scorecard Generation
// =============================================================================

export async function generateScorecard(
  input: ScorecardInput
): Promise<ScorecardResult> {
  const { ticker, dataProvider } = input;

  // Fetch all required data in parallel
  const [quality, fundamentals, quote, range] = await Promise.all([
    calculateQualityScore({ ticker, dataProvider }),
    dataProvider.yahoo.getFundamentals(ticker),
    dataProvider.yahoo.getQuote(ticker),
    dataProvider.yahoo.get52WeekRange(ticker),
  ]);

  const quoteData = quote[0];

  // Calculate component scores
  const valuation = calculateValuationScore(fundamentals, quoteData);
  const growth = calculateGrowthScore(fundamentals);
  const momentum = calculateMomentumScore(range, quoteData);

  // Calculate weighted composite
  const compositeScore =
    quality.percentage * WEIGHTS.quality +
    valuation.score * WEIGHTS.valuation +
    growth.score * WEIGHTS.growth +
    momentum.score * WEIGHTS.momentum;

  // Determine overall grade
  const overallGrade = determineGrade(compositeScore);

  // Generate summary
  const summary = generateSummary(ticker, overallGrade, {
    quality,
    valuation,
    growth,
    momentum,
  });

  return {
    ticker,
    quality,
    valuation,
    growth,
    momentum,
    overallGrade,
    compositeScore,
    summary,
  };
}

// =============================================================================
// Valuation Score (0-100)
// =============================================================================

function calculateValuationScore(
  fundamentals: Awaited<ReturnType<typeof import('jai-finance-core').YahooClient.prototype.getFundamentals>>,
  quote: Awaited<ReturnType<typeof import('jai-finance-core').YahooClient.prototype.getQuote>>[0]
): ValuationScore {
  const scores: number[] = [];

  // PE Ratio (lower is better, within reason)
  const pe = quote.trailingPE ?? fundamentals.trailingPE;
  let peScore = 0;
  let peAssessment = 'N/A';
  if (pe && pe > 0) {
    if (pe < 15) {
      peScore = 100;
      peAssessment = 'Undervalued';
    } else if (pe < 20) {
      peScore = 75;
      peAssessment = 'Fair value';
    } else if (pe < 30) {
      peScore = 50;
      peAssessment = 'Moderately expensive';
    } else {
      peScore = 25;
      peAssessment = 'Expensive';
    }
    scores.push(peScore);
  }

  // PB Ratio (Price to Book)
  const pb = fundamentals.priceToBook;
  let pbScore = 0;
  let pbAssessment = 'N/A';
  if (pb && pb > 0) {
    if (pb < 1.5) {
      pbScore = 100;
      pbAssessment = 'Below book value';
    } else if (pb < 3) {
      pbScore = 75;
      pbAssessment = 'Fair value';
    } else if (pb < 5) {
      pbScore = 50;
      pbAssessment = 'Premium to book';
    } else {
      pbScore = 25;
      pbAssessment = 'High premium';
    }
    scores.push(pbScore);
  }

  // PS Ratio (Price to Sales)
  const ps = fundamentals.priceToSalesTrailing12Months;
  let psScore = 0;
  let psAssessment = 'N/A';
  if (ps && ps > 0) {
    if (ps < 2) {
      psScore = 100;
      psAssessment = 'Undervalued';
    } else if (ps < 5) {
      psScore = 75;
      psAssessment = 'Fair value';
    } else if (ps < 10) {
      psScore = 50;
      psAssessment = 'Premium';
    } else {
      psScore = 25;
      psAssessment = 'Expensive';
    }
    scores.push(psScore);
  }

  // PEG Ratio (PE adjusted for growth)
  const peg = fundamentals.pegRatio;
  let pegScore = 0;
  let pegAssessment = 'N/A';
  if (peg && peg > 0) {
    if (peg < 1) {
      pegScore = 100;
      pegAssessment = 'Undervalued relative to growth';
    } else if (peg < 1.5) {
      pegScore = 75;
      pegAssessment = 'Fair value';
    } else if (peg < 2) {
      pegScore = 50;
      pegAssessment = 'Fully valued';
    } else {
      pegScore = 25;
      pegAssessment = 'Expensive relative to growth';
    }
    scores.push(pegScore);
  }

  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 50;

  return {
    score: Math.round(avgScore),
    peRatio: { value: pe ?? null, assessment: peAssessment },
    pbRatio: { value: pb ?? null, assessment: pbAssessment },
    psRatio: { value: ps ?? null, assessment: psAssessment },
    pegRatio: { value: peg ?? null, assessment: pegAssessment },
  };
}

// =============================================================================
// Growth Score (0-100)
// =============================================================================

function calculateGrowthScore(
  fundamentals: Awaited<ReturnType<typeof import('jai-finance-core').YahooClient.prototype.getFundamentals>>
): GrowthScore {
  const scores: number[] = [];

  // Revenue Growth
  const revGrowth = fundamentals.revenueGrowth ? fundamentals.revenueGrowth * 100 : null;
  let revScore = 0;
  let revAssessment = 'N/A';
  if (revGrowth !== null) {
    if (revGrowth > 20) {
      revScore = 100;
      revAssessment = 'Strong growth';
    } else if (revGrowth > 10) {
      revScore = 75;
      revAssessment = 'Solid growth';
    } else if (revGrowth > 0) {
      revScore = 50;
      revAssessment = 'Modest growth';
    } else {
      revScore = 25;
      revAssessment = 'Declining';
    }
    scores.push(revScore);
  }

  // Earnings Growth
  const earnGrowth = fundamentals.earningsGrowth ? fundamentals.earningsGrowth * 100 : null;
  let earnScore = 0;
  let earnAssessment = 'N/A';
  if (earnGrowth !== null) {
    if (earnGrowth > 25) {
      earnScore = 100;
      earnAssessment = 'Exceptional';
    } else if (earnGrowth > 15) {
      earnScore = 75;
      earnAssessment = 'Strong';
    } else if (earnGrowth > 0) {
      earnScore = 50;
      earnAssessment = 'Positive';
    } else {
      earnScore = 25;
      earnAssessment = 'Declining';
    }
    scores.push(earnScore);
  }

  // Cash Flow Growth (using FCF margin as proxy)
  const fcf = fundamentals.freeCashflow;
  const revenue = fundamentals.totalRevenue;
  const fcfMargin = revenue > 0 ? (fcf / revenue) * 100 : null;
  let cfScore = 0;
  let cfAssessment = 'N/A';
  if (fcfMargin !== null) {
    if (fcfMargin > 15) {
      cfScore = 100;
      cfAssessment = 'Excellent cash generation';
    } else if (fcfMargin > 8) {
      cfScore = 75;
      cfAssessment = 'Good cash generation';
    } else if (fcfMargin > 0) {
      cfScore = 50;
      cfAssessment = 'Positive cash flow';
    } else {
      cfScore = 25;
      cfAssessment = 'Cash burn';
    }
    scores.push(cfScore);
  }

  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 50;

  return {
    score: Math.round(avgScore),
    revenueGrowth: { value: revGrowth, assessment: revAssessment },
    earningsGrowth: { value: earnGrowth, assessment: earnAssessment },
    cashFlowGrowth: { value: fcfMargin, assessment: cfAssessment },
  };
}

// =============================================================================
// Momentum Score (0-100)
// =============================================================================

function calculateMomentumScore(
  range: Awaited<ReturnType<typeof import('jai-finance-core').YahooClient.prototype.get52WeekRange>>,
  quote: Awaited<ReturnType<typeof import('jai-finance-core').YahooClient.prototype.getQuote>>[0]
): MomentumScore {
  const scores: number[] = [];

  // Position in 52-week range (mid-range often better for entry)
  const position = range.positionInRange * 100;
  let posScore = 0;
  let posAssessment = 'N/A';

  // Prefer stocks in lower half of range for entry
  if (position < 25) {
    posScore = 90; // Near lows - good entry if quality is there
    posAssessment = 'Near 52-week lows';
  } else if (position < 50) {
    posScore = 80; // Lower half - attractive entry
    posAssessment = 'Lower half of range';
  } else if (position < 75) {
    posScore = 60; // Upper half - still ok
    posAssessment = 'Upper half of range';
  } else {
    posScore = 40; // Near highs - may want to wait
    posAssessment = 'Near 52-week highs';
  }
  scores.push(posScore);

  // Recent performance (change from previous close)
  const changePercent = quote.regularMarketChangePercent ?? 0;
  let perfScore = 0;
  let perfAssessment = 'N/A';

  // Slight positive momentum is good
  if (changePercent > 3) {
    perfScore = 60; // Big up day - maybe wait for pullback
    perfAssessment = 'Strong up day';
  } else if (changePercent > 0) {
    perfScore = 80; // Positive momentum
    perfAssessment = 'Positive momentum';
  } else if (changePercent > -2) {
    perfScore = 70; // Slight pullback - good entry
    perfAssessment = 'Minor pullback';
  } else {
    perfScore = 50; // Significant down - could be opportunity or falling knife
    perfAssessment = 'Down significantly';
  }
  scores.push(perfScore);

  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 50;

  return {
    score: Math.round(avgScore),
    pricePosition: { value: position, assessment: posAssessment },
    recentPerformance: { value: changePercent, assessment: perfAssessment },
  };
}

// =============================================================================
// Grade Determination
// =============================================================================

function determineGrade(compositeScore: number): OverallGrade {
  if (compositeScore >= GRADE_THRESHOLDS.A) return 'A';
  if (compositeScore >= GRADE_THRESHOLDS.B) return 'B';
  if (compositeScore >= GRADE_THRESHOLDS.C) return 'C';
  if (compositeScore >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

// =============================================================================
// Summary Generation
// =============================================================================

interface ScoreSummary {
  quality: { percentage: number; interpretation: string };
  valuation: ValuationScore;
  growth: GrowthScore;
  momentum: MomentumScore;
}

function generateSummary(
  ticker: string,
  grade: OverallGrade,
  scores: ScoreSummary
): string {
  const parts: string[] = [];

  parts.push(`${ticker} receives an overall grade of ${grade}.`);

  // Quality assessment
  parts.push(
    `Quality: ${scores.quality.interpretation} (${scores.quality.percentage.toFixed(0)}%).`
  );

  // Valuation assessment
  if (scores.valuation.score >= 75) {
    parts.push('Valuation appears attractive.');
  } else if (scores.valuation.score >= 50) {
    parts.push('Valuation is fair.');
  } else {
    parts.push('Valuation is stretched.');
  }

  // Growth assessment
  if (scores.growth.score >= 75) {
    parts.push('Growth metrics are strong.');
  } else if (scores.growth.score >= 50) {
    parts.push('Growth is moderate.');
  } else {
    parts.push('Growth is a concern.');
  }

  // Momentum/timing
  if (scores.momentum.score >= 70) {
    parts.push('Entry timing looks favorable.');
  } else if (scores.momentum.score >= 50) {
    parts.push('Timing is neutral.');
  } else {
    parts.push('Consider waiting for better entry.');
  }

  return parts.join(' ');
}

export { ScorecardResult };
