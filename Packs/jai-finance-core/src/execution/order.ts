/**
 * Order Manager
 *
 * High-level order management utilities built on top of AlpacaClient.
 */

import type { AlpacaClient } from './alpaca';
import type { OrderRequest, OrderResult, TimeInForce } from './types';
import { AlpacaError } from './types';

/**
 * Order validation error
 */
export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

/**
 * High-level order management
 */
export class OrderManager {
  constructor(private readonly client: AlpacaClient) {}

  /**
   * Create and submit a market order
   */
  async createMarketOrder(
    ticker: string,
    side: 'buy' | 'sell',
    quantity: number,
    timeInForce: TimeInForce = 'day'
  ): Promise<OrderResult> {
    const request: OrderRequest = {
      ticker,
      side,
      type: 'market',
      quantity,
      timeInForce,
    };

    this.validateOrder(request);
    return this.client.submitOrder(request);
  }

  /**
   * Create and submit a limit order
   */
  async createLimitOrder(
    ticker: string,
    side: 'buy' | 'sell',
    quantity: number,
    limitPrice: number,
    timeInForce: TimeInForce = 'day'
  ): Promise<OrderResult> {
    const request: OrderRequest = {
      ticker,
      side,
      type: 'limit',
      quantity,
      limitPrice,
      timeInForce,
    };

    this.validateOrder(request);
    return this.client.submitOrder(request);
  }

  /**
   * Create and submit a stop-limit order
   */
  async createStopLimitOrder(
    ticker: string,
    side: 'buy' | 'sell',
    quantity: number,
    stopPrice: number,
    limitPrice: number,
    timeInForce: TimeInForce = 'day'
  ): Promise<OrderResult> {
    const request: OrderRequest = {
      ticker,
      side,
      type: 'stop_limit',
      quantity,
      stopPrice,
      limitPrice,
      timeInForce,
    };

    this.validateOrder(request);
    return this.client.submitOrder(request);
  }

  /**
   * Validate an order request before submission
   */
  validateOrder(request: OrderRequest): void {
    // Validate ticker
    if (!request.ticker || request.ticker.trim().length === 0) {
      throw new OrderValidationError('Ticker symbol is required');
    }

    // Ticker format: 1-5 uppercase letters (basic validation)
    const tickerRegex = /^[A-Za-z]{1,5}$/;
    if (!tickerRegex.test(request.ticker.trim())) {
      throw new OrderValidationError(
        `Invalid ticker format: ${request.ticker}. Expected 1-5 letters.`
      );
    }

    // Validate quantity
    if (request.quantity <= 0) {
      throw new OrderValidationError('Quantity must be greater than 0');
    }

    if (!Number.isFinite(request.quantity)) {
      throw new OrderValidationError('Quantity must be a finite number');
    }

    // Alpaca supports fractional shares, but quantity should be reasonable
    if (request.quantity > 1_000_000_000) {
      throw new OrderValidationError('Quantity exceeds maximum allowed');
    }

    // Validate side
    if (request.side !== 'buy' && request.side !== 'sell') {
      throw new OrderValidationError(`Invalid order side: ${request.side}`);
    }

    // Validate order type
    const validTypes = ['market', 'limit', 'stop', 'stop_limit'];
    if (!validTypes.includes(request.type)) {
      throw new OrderValidationError(`Invalid order type: ${request.type}`);
    }

    // Validate limit price for limit orders
    if (request.type === 'limit' || request.type === 'stop_limit') {
      if (request.limitPrice === undefined || request.limitPrice <= 0) {
        throw new OrderValidationError(
          `Limit price is required for ${request.type} orders and must be positive`
        );
      }
    }

    // Validate stop price for stop orders
    if (request.type === 'stop' || request.type === 'stop_limit') {
      if (request.stopPrice === undefined || request.stopPrice <= 0) {
        throw new OrderValidationError(
          `Stop price is required for ${request.type} orders and must be positive`
        );
      }
    }

    // Validate time in force
    if (request.timeInForce) {
      const validTif = ['day', 'gtc', 'ioc', 'fok'];
      if (!validTif.includes(request.timeInForce)) {
        throw new OrderValidationError(`Invalid time in force: ${request.timeInForce}`);
      }
    }
  }

  /**
   * Calculate position size given portfolio constraints
   *
   * @param portfolioValue - Total portfolio value
   * @param maxPercent - Maximum percent of portfolio for this position (0-100)
   * @param price - Current price per share
   * @param roundDown - Whether to round down to whole shares (default: true)
   * @returns Number of shares to buy
   */
  calculatePositionSize(
    portfolioValue: number,
    maxPercent: number,
    price: number,
    roundDown: boolean = true
  ): number {
    if (portfolioValue <= 0) {
      throw new AlpacaError('Portfolio value must be positive');
    }

    if (maxPercent <= 0 || maxPercent > 100) {
      throw new AlpacaError('Max percent must be between 0 and 100');
    }

    if (price <= 0) {
      throw new AlpacaError('Price must be positive');
    }

    const maxDollars = portfolioValue * (maxPercent / 100);
    const shares = maxDollars / price;

    return roundDown ? Math.floor(shares) : shares;
  }
}
