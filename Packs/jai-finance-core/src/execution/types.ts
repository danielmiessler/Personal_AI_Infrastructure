/**
 * Execution Module Types
 *
 * Types for order execution via Alpaca and paper trading.
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Alpaca API configuration
 */
export interface AlpacaConfig {
  /** Alpaca API key ID */
  apiKey: string;
  /** Alpaca API secret key */
  secretKey: string;
  /** Use paper trading API (default: true) */
  paperMode?: boolean;
}

// ============================================================================
// Account & Positions
// ============================================================================

/**
 * Alpaca account information
 */
export interface AlpacaAccount {
  /** Account UUID */
  id: string;
  /** Human-readable account number */
  accountNumber: string;
  /** Account status (ACTIVE, ONBOARDING, etc.) */
  status: string;
  /** Available cash balance */
  cash: number;
  /** Total portfolio value (cash + positions) */
  portfolioValue: number;
  /** Available buying power */
  buyingPower: number;
}

/**
 * Position held in the account
 */
export interface AlpacaPosition {
  /** Asset UUID */
  assetId: string;
  /** Ticker symbol */
  symbol: string;
  /** Number of shares */
  qty: number;
  /** Average entry price per share */
  avgEntryPrice: number;
  /** Current market value */
  marketValue: number;
  /** Unrealized profit/loss */
  unrealizedPl: number;
}

// ============================================================================
// Orders
// ============================================================================

/**
 * Order status values
 */
export type OrderStatus =
  | 'pending'
  | 'new'
  | 'accepted'
  | 'partial'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'expired';

/**
 * Order side
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order type
 */
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

/**
 * Time in force
 */
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

/**
 * Raw Alpaca order response from API
 */
export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  notional: string | null;
  qty: string;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: AlpacaOrder[] | null;
  trail_percent: string | null;
  trail_price: string | null;
  hwm: string | null;
}

/**
 * Request to submit an order
 */
export interface OrderRequest {
  /** Ticker symbol */
  ticker: string;
  /** Buy or sell */
  side: OrderSide;
  /** Order type */
  type: OrderType;
  /** Number of shares */
  quantity: number;
  /** Limit price (required for limit and stop_limit orders) */
  limitPrice?: number;
  /** Stop price (required for stop and stop_limit orders) */
  stopPrice?: number;
  /** Time in force (default: day) */
  timeInForce?: TimeInForce;
}

/**
 * Result of an order submission
 */
export interface OrderResult {
  /** Alpaca order ID */
  orderId: string;
  /** Client-generated order ID */
  clientOrderId: string;
  /** Current order status */
  status: OrderStatus;
  /** Ticker symbol */
  ticker: string;
  /** Buy or sell */
  side: OrderSide;
  /** Requested quantity */
  quantity: number;
  /** Quantity filled so far */
  filledQuantity: number;
  /** Average fill price (if any fills) */
  avgFillPrice?: number;
  /** When order was submitted */
  submittedAt: Date;
  /** When order was completely filled (if applicable) */
  filledAt?: Date;
}

// ============================================================================
// Errors
// ============================================================================

/**
 * Error from Alpaca API
 */
export class AlpacaError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly alpacaCode?: string
  ) {
    super(message);
    this.name = 'AlpacaError';
  }
}
