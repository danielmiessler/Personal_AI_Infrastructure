/**
 * Scoring Module Types
 *
 * Type definitions for quality scoring and comprehensive scorecards.
 */

import type { FinnhubClient, YahooClient } from 'jai-finance-core';

// =============================================================================
// Data Provider Interface
// =============================================================================

export interface DataProvider {
  finnhub: FinnhubClient;
  yahoo: YahooClient;
}

// =============================================================================
// Quality Score Types
// =============================================================================

export interface QualityScoreInput {
  /** Stock ticker symbol */
  ticker: string;
  /** Data provider clients */
  dataProvider: DataProvider;
}

export type QualityCategory =
  | 'Profitability'
  | 'Growth'
  | 'Balance Sheet'
  | 'Efficiency'
  | 'Quality'
  | 'Shareholder';

export interface QualityComponent {
  /** Component name (e.g., "ROE", "Debt/Equity") */
  name: string;
  /** Category this component belongs to */
  category: QualityCategory;
  /** Points awarded (0-3) */
  points: number;
  /** Maximum possible points */
  maxPoints: number;
  /** Reasoning for the score */
  reasoning: string;
}

export interface QualityScoreResult {
  /** Total quality score (0-22) */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Score as percentage (0-100) */
  percentage: number;
  /** Breakdown by component */
  breakdown: QualityComponent[];
  /** Score interpretation */
  interpretation: QualityInterpretation;
}

export type QualityInterpretation =
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Poor'
  | 'Very Poor';

// =============================================================================
// Scorecard Types
// =============================================================================

export interface ScorecardInput {
  /** Stock ticker symbol */
  ticker: string;
  /** Data provider clients */
  dataProvider: DataProvider;
}

export type OverallGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ValuationScore {
  /** Valuation score (0-100) */
  score: number;
  /** PE ratio assessment */
  peRatio: {
    value: number | null;
    assessment: string;
  };
  /** PB ratio assessment */
  pbRatio: {
    value: number | null;
    assessment: string;
  };
  /** PS ratio assessment */
  psRatio: {
    value: number | null;
    assessment: string;
  };
  /** PEG ratio assessment */
  pegRatio: {
    value: number | null;
    assessment: string;
  };
}

export interface GrowthScore {
  /** Growth score (0-100) */
  score: number;
  /** Revenue growth */
  revenueGrowth: {
    value: number | null;
    assessment: string;
  };
  /** Earnings growth */
  earningsGrowth: {
    value: number | null;
    assessment: string;
  };
  /** Cash flow growth indicator */
  cashFlowGrowth: {
    value: number | null;
    assessment: string;
  };
}

export interface MomentumScore {
  /** Momentum score (0-100) */
  score: number;
  /** Price vs 52-week range */
  pricePosition: {
    value: number | null;
    assessment: string;
  };
  /** Recent price performance */
  recentPerformance: {
    value: number | null;
    assessment: string;
  };
}

export interface ScorecardResult {
  /** Stock ticker */
  ticker: string;
  /** Quality score details */
  quality: QualityScoreResult;
  /** Valuation assessment */
  valuation: ValuationScore;
  /** Growth assessment */
  growth: GrowthScore;
  /** Momentum assessment */
  momentum: MomentumScore;
  /** Overall letter grade (A-F) */
  overallGrade: OverallGrade;
  /** Weighted composite score (0-100) */
  compositeScore: number;
  /** Summary recommendation */
  summary: string;
}

// =============================================================================
// Score Thresholds
// =============================================================================

export interface ScoreThresholds {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

export const QUALITY_THRESHOLDS: ScoreThresholds = {
  excellent: 18, // 82%+
  good: 14, // 64%+
  fair: 10, // 45%+
  poor: 6, // 27%+
};

export const GRADE_THRESHOLDS = {
  A: 80,
  B: 65,
  C: 50,
  D: 35,
  F: 0,
} as const;
