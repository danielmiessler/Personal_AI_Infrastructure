/**
 * jai-trading-analysis
 *
 * Trading analysis, screening, timing, and automation for JAI.
 */

// Analysis Module
export { AnalysisPipeline } from './analysis/pipeline';
export { runDealbreakers, DealbreakersResult } from './analysis/dealbreaker';
export { runYellowFlags, YellowFlagsResult } from './analysis/yellowflag';
export { runPositiveFactors, PositiveFactorsResult } from './analysis/positivefactor';
export { calculateFScore, FScoreResult } from './analysis/fscore';
export * from './analysis/types';

// Screening Module
export { SectorScreener } from './screening/sector';
export { GrowthScreener } from './screening/growth';
export { ValueScreener } from './screening/value';
export * from './screening/types';

// Scoring Module
export { calculateQualityScore } from './scoring/quality';
export type { QualityScoreResult } from './scoring/quality';
export { generateScorecard } from './scoring/scorecard';
export type { ScorecardResult } from './scoring/scorecard';
export type {
  ScoringDataProvider,
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
} from './scoring/index';
export { QUALITY_THRESHOLDS, GRADE_THRESHOLDS } from './scoring/index';

// Timing Module
export { calculateBuyPrice } from './timing/buyprice';
export type { BuyPriceResult } from './timing/buyprice';
export { analyzeMomentum } from './timing/momentum';
export type { MomentumResult, MomentumSignal } from './timing/momentum';
export type {
  TimingDataProvider,
  BuyPriceInput,
  BuyPriceMethod,
  BuyPriceBreakdown,
  MomentumInput,
  TechnicalIndicator,
  RSIResult,
  MACDResult,
  MovingAverageResult,
  VolumeAnalysis,
} from './timing/index';
export { DEFAULT_MARGIN_OF_SAFETY, INDICATOR_WEIGHTS, RSI_THRESHOLDS } from './timing/index';

// Council Module
export { CouncilOrchestrator } from './council/orchestrator';
export { loadAgent, AgentProfile } from './council/agents';
export * from './council/types';

// Orchestration Module
export { ClaudeOrchestrator, ClaudeError } from './orchestration/claude';
export { ContextBuilder } from './orchestration/context';
export { EventQueue } from './orchestration/queue';
export * from './orchestration/types';

// Automation Module
export { MarketMonitor } from './automation/monitor';
export { JobScheduler } from './automation/scheduler';
export { generateMorningBrief, formatBriefForConsole } from './automation/brief';
export type {
  MonitorConfig,
  MonitorAlert,
  MonitorAlertType,
  MonitorAlertData,
  ScheduledJob,
  SchedulePattern,
  MorningBriefConfig,
  MorningBrief,
  BriefPosition,
  BriefAlert,
  BriefOpportunity,
  MarketOverview,
  AlertNotifier,
  AutomationDataProvider,
} from './automation/types';

// CLI Module (formatting utilities)
export {
  colors,
  colorize,
  colorVerdict,
  formatCurrency,
  formatPercent,
  colorPercent,
  colorPnL,
  table,
  box,
} from './cli/format';
