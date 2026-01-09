/**
 * Analysis Module
 *
 * Stock analysis pipeline with dealbreaker checks, yellow flags,
 * positive factors, and Piotroski F-Score calculation.
 */

// Types
export type {
  // Core types
  AnalysisInput,
  AnalysisResult,
  AnalysisStage,
  AnalysisRecommendation,
  AnalysisVerdict,

  // Dealbreakers
  DealbreakersResult,
  DealbreakersDetail,
  DealbreakerId,

  // Yellow Flags
  YellowFlagsResult,
  YellowFlag,
  YellowFlagId,

  // Positive Factors
  PositiveFactorsResult,
  PositiveFactor,
  PositiveFactorId,

  // F-Score
  FScoreResult,
  FScoreComponent,
  FScoreComponentId,
  FScoreInterpretation,

  // Data Provider
  AnalysisDataProvider,
  QuoteData,
  ProfileData,
  FinancialsData,
  InsiderTransaction,
  SECFilingData,
  NewsItem,
  PriceHistoryData,
  PricePoint,
} from './types';

// Stage Functions
export { runDealbreakers } from './dealbreaker';
export { runYellowFlags } from './yellowflag';
export { runPositiveFactors } from './positivefactor';
export { calculateFScore } from './fscore';

// Technical Analysis
export {
  runTechnicalAnalysis,
  calculateIndicators,
  generateTimingSignal,
} from './technical';
export type {
  TechnicalIndicators,
  TimingSignal,
  TimingAction,
  TrendDirection,
  TechnicalAnalysisResult,
} from './technical';

// Enhanced Insider Analysis
export { analyzeInsiderTransactions } from './insider';
export type {
  InsiderSentiment,
  EnhancedInsiderTransaction,
  InsiderRole,
  TransactionSignificance,
} from './insider';

// Pipeline Class
export { AnalysisPipeline } from './pipeline';

// Data Provider
export { RealDataProvider } from './data-provider';
export type { DataProviderConfig } from './data-provider';
