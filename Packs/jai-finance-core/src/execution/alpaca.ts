/**
 * Alpaca API Client
 *
 * Client for interacting with Alpaca Trading API.
 * Supports both paper and live trading modes.
 */

import type {
  AlpacaConfig,
  AlpacaAccount,
  AlpacaPosition,
  AlpacaOrder,
  OrderRequest,
  OrderResult,
  OrderStatus,
} from './types';
import { AlpacaError } from './types';

/** Paper trading API base URL */
const PAPER_BASE_URL = 'https://paper-api.alpaca.markets';

/** Live trading API base URL */
const LIVE_BASE_URL = 'https://api.alpaca.markets';

/**
 * Raw account response from Alpaca API
 */
interface AlpacaAccountResponse {
  id: string;
  account_number: string;
  status: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  [key: string]: unknown;
}

/**
 * Raw position response from Alpaca API
 */
interface AlpacaPositionResponse {
  asset_id: string;
  symbol: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  unrealized_pl: string;
  [key: string]: unknown;
}

/**
 * Alpaca API error response
 */
interface AlpacaErrorResponse {
  code?: number;
  message?: string;
}

/**
 * Client for Alpaca Trading API
 */
export class AlpacaClient {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: AlpacaConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.paperMode !== false ? PAPER_BASE_URL : LIVE_BASE_URL;
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<AlpacaAccount> {
    const response = await this.request<AlpacaAccountResponse>('GET', '/v2/account');
    return {
      id: response.id,
      accountNumber: response.account_number,
      status: response.status,
      cash: parseFloat(response.cash),
      portfolioValue: parseFloat(response.portfolio_value),
      buyingPower: parseFloat(response.buying_power),
    };
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    const response = await this.request<AlpacaPositionResponse[]>('GET', '/v2/positions');
    return response.map((p) => ({
      assetId: p.asset_id,
      symbol: p.symbol,
      qty: parseFloat(p.qty),
      avgEntryPrice: parseFloat(p.avg_entry_price),
      marketValue: parseFloat(p.market_value),
      unrealizedPl: parseFloat(p.unrealized_pl),
    }));
  }

  /**
   * Get a specific position by ticker
   */
  async getPosition(ticker: string): Promise<AlpacaPosition | null> {
    try {
      const response = await this.request<AlpacaPositionResponse>(
        'GET',
        `/v2/positions/${encodeURIComponent(ticker.toUpperCase())}`
      );
      return {
        assetId: response.asset_id,
        symbol: response.symbol,
        qty: parseFloat(response.qty),
        avgEntryPrice: parseFloat(response.avg_entry_price),
        marketValue: parseFloat(response.market_value),
        unrealizedPl: parseFloat(response.unrealized_pl),
      };
    } catch (error) {
      if (error instanceof AlpacaError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Submit a new order
   */
  async submitOrder(request: OrderRequest): Promise<OrderResult> {
    const body: Record<string, unknown> = {
      symbol: request.ticker.toUpperCase(),
      qty: request.quantity.toString(),
      side: request.side,
      type: request.type,
      time_in_force: request.timeInForce ?? 'day',
    };

    if (request.limitPrice !== undefined) {
      body.limit_price = request.limitPrice.toString();
    }

    if (request.stopPrice !== undefined) {
      body.stop_price = request.stopPrice.toString();
    }

    const response = await this.request<AlpacaOrder>('POST', '/v2/orders', body);
    return this.mapOrderToResult(response);
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<void> {
    await this.request('DELETE', `/v2/orders/${encodeURIComponent(orderId)}`);
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<OrderResult> {
    const response = await this.request<AlpacaOrder>(
      'GET',
      `/v2/orders/${encodeURIComponent(orderId)}`
    );
    return this.mapOrderToResult(response);
  }

  /**
   * Get orders, optionally filtered by status
   */
  async getOrders(status?: 'open' | 'closed' | 'all'): Promise<OrderResult[]> {
    const query = status ? `?status=${status}` : '';
    const response = await this.request<AlpacaOrder[]>('GET', `/v2/orders${query}`);
    return response.map((o) => this.mapOrderToResult(o));
  }

  /**
   * Map Alpaca order response to OrderResult
   */
  private mapOrderToResult(order: AlpacaOrder): OrderResult {
    return {
      orderId: order.id,
      clientOrderId: order.client_order_id,
      status: this.mapOrderStatus(order.status),
      ticker: order.symbol,
      side: order.side as 'buy' | 'sell',
      quantity: parseFloat(order.qty),
      filledQuantity: parseFloat(order.filled_qty),
      avgFillPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : undefined,
      submittedAt: new Date(order.submitted_at),
      filledAt: order.filled_at ? new Date(order.filled_at) : undefined,
    };
  }

  /**
   * Map Alpaca status string to normalized OrderStatus
   */
  private mapOrderStatus(alpacaStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      new: 'new',
      accepted: 'accepted',
      pending_new: 'pending',
      accepted_for_bidding: 'accepted',
      partially_filled: 'partial',
      filled: 'filled',
      done_for_day: 'filled',
      canceled: 'cancelled',
      cancelled: 'cancelled',
      expired: 'expired',
      replaced: 'cancelled',
      pending_cancel: 'pending',
      pending_replace: 'pending',
      stopped: 'cancelled',
      rejected: 'rejected',
      suspended: 'pending',
      calculated: 'pending',
    };

    return statusMap[alpacaStatus.toLowerCase()] ?? 'pending';
  }

  /**
   * Make an authenticated request to Alpaca API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `Alpaca API error: ${response.status} ${response.statusText}`;
      let alpacaCode: string | undefined;

      try {
        const errorBody = (await response.json()) as AlpacaErrorResponse;
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
        if (errorBody.code) {
          alpacaCode = String(errorBody.code);
        }
      } catch {
        // Use default error message
      }

      throw new AlpacaError(errorMessage, response.status, alpacaCode);
    }

    // Handle 204 No Content (e.g., from DELETE)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export { AlpacaError };
