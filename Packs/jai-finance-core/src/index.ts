/**
 * jai-finance-core
 *
 * Core services for the JAI Investment System.
 */

// =============================================================================
// Data Module
// =============================================================================

export { FinnhubClient, FinnhubError } from './data/finnhub';
export type { FinnhubClientConfig } from './data/finnhub';

export { YahooClient, YahooError } from './data/yahoo';
export type { YahooClientConfig } from './data/yahoo';

export { SECClient, SECError } from './data/sec';
export type { SECClientConfig, SECCompanyInfo } from './data/sec';

export { DataCache } from './data/cache';
export { TTL } from './data/cache';
export type { CacheStats } from './data/cache';

export { RateLimiter } from './data/rate-limiter';

export type {
  FinnhubQuote,
  FinnhubProfile,
  FinnhubFinancials,
  FinnhubNews,
  FinnhubPriceTarget,
  FinnhubRecommendation,
  FinnhubInsiderTransaction,
  YahooQuote,
  YahooHistorical,
  YahooHistoricalEntry,
  YahooFundamentals,
  Yahoo52WeekRange,
  SECFiling,
  SECInsiderTransaction,
  CacheEntry,
  CacheConfig,
  DataErrorContext,
} from './data/types';

// =============================================================================
// Portfolio Module
// =============================================================================

export { PositionManager, PositionError } from './portfolio/position';
export { TaxLotTracker } from './portfolio/taxlot';
export type { HoldingPeriod, GainLossResult, TaxLotWithTicker } from './portfolio/taxlot';

export { TransactionHistory, TransactionHistoryError } from './portfolio/history';

export { PortfolioStateManager } from './portfolio/state';
export type { PriceProvider, PortfolioStateOptions } from './portfolio/state';

export type {
  Position,
  TaxLot,
  TaxLotSelectionMethod,
  Transaction,
  TransactionType,
  PortfolioState,
  PortfolioSummary,
  SectorAllocation,
  PortfolioCompliance,
  PositionWithValue,
  PositionsFile,
  TransactionsFile,
  ComplianceThresholds,
} from './portfolio/types';

export { DEFAULT_COMPLIANCE_THRESHOLDS } from './portfolio/types';

// =============================================================================
// Execution Module
// =============================================================================

export { AlpacaClient } from './execution/alpaca';
export { AlpacaError } from './execution/types';

export { OrderManager, OrderValidationError } from './execution/order';

export { PaperTradingClient } from './execution/paper';
export type { PaperTradingConfig } from './execution/paper';

export type {
  AlpacaConfig,
  AlpacaAccount,
  AlpacaPosition,
  AlpacaOrder,
  OrderRequest,
  OrderResult,
  OrderStatus,
  OrderSide,
  OrderType,
  TimeInForce,
} from './execution/types';

// =============================================================================
// Notifications Module
// =============================================================================

export { DiscordNotifier } from './notifications/discord';
export { NotificationFormatter, EMBED_COLORS } from './notifications/formatter';
export type { FormattedPayload } from './notifications/formatter';

export {
  STOP_LOSS_TEMPLATE,
  BUY_SIGNAL_TEMPLATE,
  TARGET_HIT_TEMPLATE,
  BRIEF_TEMPLATE,
} from './notifications/templates';

export type {
  DiscordConfig,
  DiscordEmbed,
  DiscordEmbedField,
  NotificationPayload,
  NotificationAction,
  NotificationType,
  NotificationUrgency,
  NotificationActionStyle,
  // Notification-specific types (avoid conflicts with portfolio/config types)
  Recommendation,
  BuyAnalysis,
  Alert,
  Opportunity,
} from './notifications/types';

// =============================================================================
// Config Module
// =============================================================================

export { PolicyLoader, PolicyError } from './config/policy';
export { ConfigLoader, ConfigError } from './config/loader';

export {
  DEFAULT_POLICY,
  DEFAULT_CONFIG,
  DEFAULT_CONSTRAINTS,
} from './config/defaults';

export type {
  Policy,
  PolicyMeta,
  PolicyObjectives,
  PolicyConstraints,
  PolicyRule,
  PolicyRules,
  PolicySchedule,
  PolicyEscalation,
  PolicyNotifications,
  NotificationPreferences,
  JAIConfig,
  ApiKeys,
  ConstraintCheckResult,
  RuleEventType,
} from './config/types';
