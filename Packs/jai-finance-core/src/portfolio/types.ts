/**
 * Portfolio Module Types
 *
 * Core types for position tracking, tax lot management, and portfolio state.
 */

// ============================================================================
// Tax Lot Types
// ============================================================================

/**
 * Individual tax lot representing shares purchased at a specific cost basis.
 */
export interface TaxLot {
  /** Unique identifier for the tax lot */
  id: string;
  /** Number of shares in this lot */
  shares: number;
  /** Cost basis per share */
  costBasis: number;
  /** Date shares were purchased */
  purchaseDate: string;
  /** Optional notes about this lot */
  notes?: string;
}

/**
 * Methods for selecting which tax lots to sell.
 */
export type TaxLotSelectionMethod = 'FIFO' | 'LIFO' | 'HIFO';

// ============================================================================
// Position Types
// ============================================================================

/**
 * A position in a single security with full tax lot tracking.
 */
export interface Position {
  /** Stock ticker symbol */
  ticker: string;
  /** Total number of shares held */
  shares: number;
  /** Average cost basis per share */
  avgCostBasis: number;
  /** Total cost of position */
  totalCost: number;
  /** Individual tax lots */
  taxLots: TaxLot[];
  /** When position was first opened */
  openedAt: string;
  /** Optional sector classification */
  sector?: string;
  /** Optional industry classification */
  industry?: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Type of transaction.
 */
export type TransactionType = 'buy' | 'sell';

/**
 * Record of a buy or sell transaction.
 */
export interface Transaction {
  /** Unique identifier for the transaction */
  id: string;
  /** Buy or sell */
  type: TransactionType;
  /** Stock ticker symbol */
  ticker: string;
  /** Number of shares */
  shares: number;
  /** Price per share at transaction time */
  price: number;
  /** Date of transaction */
  date: string;
  /** Tax lot ID (for sells, which lot was sold from) */
  taxLotId?: string;
  /** Realized gain/loss (for sells) */
  gainLoss?: number;
}

// ============================================================================
// Portfolio State Types
// ============================================================================

/**
 * Summary metrics for the entire portfolio.
 */
export interface PortfolioSummary {
  /** Current market value of all positions */
  totalValue: number;
  /** Total cost basis of all positions */
  totalCost: number;
  /** Unrealized profit/loss in dollars */
  unrealizedPnL: number;
  /** Unrealized profit/loss as percentage */
  unrealizedPnLPercent: number;
  /** Cash available for trading */
  cashAvailable: number;
  /** Today's change in dollars */
  dayChange: number;
  /** Today's change as percentage */
  dayChangePercent: number;
}

/**
 * Allocation breakdown by sector.
 */
export interface SectorAllocation {
  /** Sector name */
  sector: string;
  /** Current market value in this sector */
  value: number;
  /** Percentage of portfolio */
  percent: number;
}

/**
 * Compliance check results.
 */
export interface PortfolioCompliance {
  /** Position exceeds max position size limit */
  maxPositionViolation: boolean;
  /** Sector concentration exceeds limit */
  sectorConcentrationViolation: boolean;
  /** Cash reserve below minimum */
  cashReserveViolation: boolean;
}

/**
 * Complete portfolio state snapshot.
 */
export interface PortfolioState {
  /** When this state was calculated */
  lastUpdated: string;
  /** Summary metrics */
  summary: PortfolioSummary;
  /** All positions with current values */
  positions: PositionWithValue[];
  /** Breakdown by sector */
  sectorAllocation: SectorAllocation[];
  /** Compliance status */
  compliance: PortfolioCompliance;
}

/**
 * Position with current market value attached.
 */
export interface PositionWithValue extends Position {
  /** Current price per share */
  currentPrice: number;
  /** Current market value */
  marketValue: number;
  /** Unrealized gain/loss in dollars */
  unrealizedPnL: number;
  /** Unrealized gain/loss as percentage */
  unrealizedPnLPercent: number;
  /** Percentage of total portfolio */
  portfolioPercent: number;
}

// ============================================================================
// Persistence Types
// ============================================================================

/**
 * Structure of positions.json file.
 */
export interface PositionsFile {
  version: 1;
  lastUpdated: string;
  positions: Position[];
}

/**
 * Structure of transactions.json file.
 */
export interface TransactionsFile {
  version: 1;
  lastUpdated: string;
  transactions: Transaction[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Compliance thresholds for portfolio checks.
 */
export interface ComplianceThresholds {
  /** Maximum position size as percentage of portfolio (default: 0.25 = 25%) */
  maxPositionPercent: number;
  /** Maximum sector concentration as percentage (default: 0.40 = 40%) */
  maxSectorPercent: number;
  /** Minimum cash reserve as percentage (default: 0.05 = 5%) */
  minCashReservePercent: number;
}

/**
 * Default compliance thresholds.
 */
export const DEFAULT_COMPLIANCE_THRESHOLDS: ComplianceThresholds = {
  maxPositionPercent: 0.25,
  maxSectorPercent: 0.40,
  minCashReservePercent: 0.05,
};
