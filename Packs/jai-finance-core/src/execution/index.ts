/**
 * Execution Module
 *
 * Order execution via Alpaca API and paper trading simulation.
 */

// Types
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
} from './types';
export { AlpacaError } from './types';

// Clients
export { AlpacaClient } from './alpaca';
export { PaperTradingClient } from './paper';
export type { PaperTradingConfig } from './paper';

// Order Management
export { OrderManager, OrderValidationError } from './order';
