/**
 * Portfolio Module
 *
 * Position tracking, tax lot management, transaction history,
 * and portfolio state calculation.
 */

// Types
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
} from './types';

export { DEFAULT_COMPLIANCE_THRESHOLDS } from './types';

// Position Management
export { PositionManager, PositionError } from './position';

// Tax Lot Tracking
export {
  TaxLotTracker,
  type HoldingPeriod,
  type GainLossResult,
  type TaxLotWithTicker,
} from './taxlot';

// Transaction History
export { TransactionHistory, TransactionHistoryError } from './history';

// Portfolio State
export {
  PortfolioStateManager,
  type PriceProvider,
  type PortfolioStateOptions,
} from './state';
