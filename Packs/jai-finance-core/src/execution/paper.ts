/**
 * Paper Trading Client
 *
 * Simulates trading without making real API calls.
 * Useful for testing and development.
 */

import type {
  AlpacaAccount,
  AlpacaPosition,
  OrderRequest,
  OrderResult,
  OrderStatus,
} from './types';
import { AlpacaError } from './types';

/**
 * Stored order in paper trading
 */
interface PaperOrder {
  id: string;
  clientOrderId: string;
  ticker: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  filledQuantity: number;
  limitPrice?: number;
  stopPrice?: number;
  status: OrderStatus;
  avgFillPrice?: number;
  submittedAt: Date;
  filledAt?: Date;
}

/**
 * Stored position in paper trading
 */
interface PaperPosition {
  assetId: string;
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
}

/**
 * Configuration for paper trading client
 */
export interface PaperTradingConfig {
  /** Initial cash balance (default: 100000) */
  initialCash?: number;
  /** Simulated prices for tickers (default: 100 for all) */
  prices?: Record<string, number>;
}

/**
 * Generate a UUID-like ID
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Paper trading client that simulates Alpaca API
 */
export class PaperTradingClient {
  private cash: number;
  private orders: Map<string, PaperOrder> = new Map();
  private positions: Map<string, PaperPosition> = new Map();
  private prices: Record<string, number>;
  private readonly accountId: string;

  constructor(config: PaperTradingConfig = {}) {
    this.cash = config.initialCash ?? 100000;
    this.prices = config.prices ?? {};
    this.accountId = generateId();
  }

  /**
   * Set simulated price for a ticker
   */
  setPrice(ticker: string, price: number): void {
    this.prices[ticker.toUpperCase()] = price;
  }

  /**
   * Get simulated price for a ticker
   */
  getPrice(ticker: string): number {
    return this.prices[ticker.toUpperCase()] ?? 100;
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<AlpacaAccount> {
    const portfolioValue = this.calculatePortfolioValue();
    return {
      id: this.accountId,
      accountNumber: 'PAPER001',
      status: 'ACTIVE',
      cash: this.cash,
      portfolioValue,
      buyingPower: this.cash,
    };
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    return Array.from(this.positions.values()).map((p) => ({
      assetId: p.assetId,
      symbol: p.symbol,
      qty: p.qty,
      avgEntryPrice: p.avgEntryPrice,
      marketValue: p.qty * p.currentPrice,
      unrealizedPl: p.qty * (p.currentPrice - p.avgEntryPrice),
    }));
  }

  /**
   * Get a specific position by ticker
   */
  async getPosition(ticker: string): Promise<AlpacaPosition | null> {
    const position = this.positions.get(ticker.toUpperCase());
    if (!position) {
      return null;
    }
    return {
      assetId: position.assetId,
      symbol: position.symbol,
      qty: position.qty,
      avgEntryPrice: position.avgEntryPrice,
      marketValue: position.qty * position.currentPrice,
      unrealizedPl: position.qty * (position.currentPrice - position.avgEntryPrice),
    };
  }

  /**
   * Submit a new order
   */
  async submitOrder(request: OrderRequest): Promise<OrderResult> {
    const ticker = request.ticker.toUpperCase();
    const price = this.getPrice(ticker);
    const orderId = generateId();
    const clientOrderId = generateId();
    const now = new Date();

    // Create the order
    const order: PaperOrder = {
      id: orderId,
      clientOrderId,
      ticker,
      side: request.side,
      type: request.type,
      quantity: request.quantity,
      filledQuantity: 0,
      limitPrice: request.limitPrice,
      stopPrice: request.stopPrice,
      status: 'new',
      submittedAt: now,
    };

    // For market orders, fill immediately
    if (request.type === 'market') {
      this.fillOrder(order, price);
    } else if (request.type === 'limit') {
      // For limit orders, check if price is favorable
      if (request.side === 'buy' && price <= (request.limitPrice ?? 0)) {
        this.fillOrder(order, request.limitPrice ?? price);
      } else if (request.side === 'sell' && price >= (request.limitPrice ?? Infinity)) {
        this.fillOrder(order, request.limitPrice ?? price);
      }
      // Otherwise, order remains pending
    }
    // stop and stop_limit orders remain pending until triggered

    this.orders.set(orderId, order);

    return this.orderToResult(order);
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new AlpacaError(`Order not found: ${orderId}`, 404);
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      throw new AlpacaError(`Cannot cancel order with status: ${order.status}`, 400);
    }

    order.status = 'cancelled';
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<OrderResult> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new AlpacaError(`Order not found: ${orderId}`, 404);
    }
    return this.orderToResult(order);
  }

  /**
   * Get orders, optionally filtered by status
   */
  async getOrders(status?: 'open' | 'closed' | 'all'): Promise<OrderResult[]> {
    let orders = Array.from(this.orders.values());

    if (status === 'open') {
      orders = orders.filter((o) =>
        ['new', 'pending', 'accepted', 'partial'].includes(o.status)
      );
    } else if (status === 'closed') {
      orders = orders.filter((o) =>
        ['filled', 'cancelled', 'rejected', 'expired'].includes(o.status)
      );
    }

    return orders.map((o) => this.orderToResult(o));
  }

  /**
   * Fill an order (internal)
   */
  private fillOrder(order: PaperOrder, fillPrice: number): void {
    const cost = order.quantity * fillPrice;

    if (order.side === 'buy') {
      if (cost > this.cash) {
        order.status = 'rejected';
        return;
      }
      this.cash -= cost;
      this.updatePosition(order.ticker, order.quantity, fillPrice);
    } else {
      // Sell
      const position = this.positions.get(order.ticker);
      if (!position || position.qty < order.quantity) {
        order.status = 'rejected';
        return;
      }
      this.cash += cost;
      this.updatePosition(order.ticker, -order.quantity, fillPrice);
    }

    order.status = 'filled';
    order.filledQuantity = order.quantity;
    order.avgFillPrice = fillPrice;
    order.filledAt = new Date();
  }

  /**
   * Update position after a fill
   */
  private updatePosition(ticker: string, quantityDelta: number, price: number): void {
    const existing = this.positions.get(ticker);

    if (!existing) {
      if (quantityDelta > 0) {
        this.positions.set(ticker, {
          assetId: generateId(),
          symbol: ticker,
          qty: quantityDelta,
          avgEntryPrice: price,
          currentPrice: price,
        });
      }
      return;
    }

    const newQty = existing.qty + quantityDelta;

    if (newQty <= 0) {
      this.positions.delete(ticker);
      return;
    }

    if (quantityDelta > 0) {
      // Buying more - recalculate average
      const totalCost = existing.qty * existing.avgEntryPrice + quantityDelta * price;
      existing.avgEntryPrice = totalCost / newQty;
    }

    existing.qty = newQty;
    existing.currentPrice = price;
  }

  /**
   * Calculate total portfolio value
   */
  private calculatePortfolioValue(): number {
    let positionValue = 0;
    const positions = Array.from(this.positions.values());
    for (const position of positions) {
      positionValue += position.qty * position.currentPrice;
    }
    return this.cash + positionValue;
  }

  /**
   * Convert internal order to OrderResult
   */
  private orderToResult(order: PaperOrder): OrderResult {
    return {
      orderId: order.id,
      clientOrderId: order.clientOrderId,
      status: order.status,
      ticker: order.ticker,
      side: order.side,
      quantity: order.quantity,
      filledQuantity: order.filledQuantity,
      avgFillPrice: order.avgFillPrice,
      submittedAt: order.submittedAt,
      filledAt: order.filledAt,
    };
  }

  /**
   * Reset the paper trading state
   */
  reset(config: PaperTradingConfig = {}): void {
    this.cash = config.initialCash ?? 100000;
    this.prices = config.prices ?? {};
    this.orders.clear();
    this.positions.clear();
  }
}
