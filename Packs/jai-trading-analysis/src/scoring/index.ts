/**
 * Scoring Module
 *
 * Quality scoring and comprehensive scorecards for stock analysis.
 */

export { calculateQualityScore } from './quality';
export type { QualityScoreResult } from './quality';

export { generateScorecard } from './scorecard';
export type { ScorecardResult } from './scorecard';

export type {
  DataProvider as ScoringDataProvider,
  QualityScoreInput,
  QualityCategory,
  QualityComponent,
  QualityInterpretation,
  ScorecardInput,
  ValuationScore,
  GrowthScore,
  MomentumScore,
  OverallGrade,
  ScoreThresholds,
} from './types';

export { QUALITY_THRESHOLDS, GRADE_THRESHOLDS } from './types';
