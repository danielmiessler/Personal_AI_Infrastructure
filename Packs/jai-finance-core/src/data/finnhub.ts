/**
 * Finnhub API Client
 *
 * Client for fetching market data from Finnhub.io
 */

import { RateLimiter } from './rate-limiter';
import type {
  FinnhubQuote,
  FinnhubProfile,
  FinnhubFinancials,
  FinnhubNews,
  FinnhubPriceTarget,
  FinnhubRecommendation,
  FinnhubInsiderTransaction,
  DataErrorContext,
} from './types';

const DEFAULT_BASE_URL = 'https://finnhub.io/api/v1';
const DEFAULT_RATE_LIMIT = 60; // Free tier: 60 calls/minute

export class FinnhubError extends Error {
  readonly context: DataErrorContext;

  constructor(message: string, context: DataErrorContext) {
    super(message);
    this.name = 'FinnhubError';
    this.context = context;
  }
}

export interface FinnhubClientConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimitPerMinute?: number;
}

export class FinnhubClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly rateLimiter: RateLimiter;

  constructor(config: FinnhubClientConfig) {
    if (!config.apiKey) {
      throw new FinnhubError('API key is required', {
        operation: 'constructor',
      });
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.rateLimiter = new RateLimiter(
      config.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT
    );
  }

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<FinnhubQuote> {
    const data = await this.request<FinnhubQuote>('/quote', { symbol });

    // Finnhub returns empty object or zeros for invalid symbols
    if (!data || data.c === 0) {
      throw new FinnhubError(`No quote data found for symbol: ${symbol}`, {
        operation: 'getQuote',
        symbol,
      });
    }

    return data;
  }

  /**
   * Get company profile
   */
  async getProfile(symbol: string): Promise<FinnhubProfile> {
    const data = await this.request<FinnhubProfile>('/stock/profile2', {
      symbol,
    });

    if (!data || !data.name) {
      throw new FinnhubError(`No profile found for symbol: ${symbol}`, {
        operation: 'getProfile',
        symbol,
      });
    }

    return data;
  }

  /**
   * Get basic financials (metrics)
   */
  async getFinancials(symbol: string): Promise<FinnhubFinancials> {
    const data = await this.request<FinnhubFinancials>('/stock/metric', {
      symbol,
      metric: 'all',
    });

    if (!data || !data.metric) {
      throw new FinnhubError(`No financials found for symbol: ${symbol}`, {
        operation: 'getFinancials',
        symbol,
      });
    }

    return data;
  }

  /**
   * Get company news
   * @param symbol Stock symbol
   * @param from Start date (YYYY-MM-DD)
   * @param to End date (YYYY-MM-DD)
   */
  async getNews(symbol: string, from: string, to: string): Promise<FinnhubNews[]> {
    const data = await this.request<FinnhubNews[]>('/company-news', {
      symbol,
      from,
      to,
    });

    return data ?? [];
  }

  /**
   * Get analyst price targets
   */
  async getPriceTarget(symbol: string): Promise<FinnhubPriceTarget> {
    const data = await this.request<FinnhubPriceTarget>('/stock/price-target', {
      symbol,
    });

    if (!data || !data.targetMean) {
      throw new FinnhubError(`No price target found for symbol: ${symbol}`, {
        operation: 'getPriceTarget',
        symbol,
      });
    }

    return data;
  }

  /**
   * Get analyst recommendations
   */
  async getRecommendations(symbol: string): Promise<FinnhubRecommendation[]> {
    const data = await this.request<FinnhubRecommendation[]>(
      '/stock/recommendation',
      { symbol }
    );

    return data ?? [];
  }

  /**
   * Get insider transactions
   */
  async getInsiderTransactions(
    symbol: string
  ): Promise<FinnhubInsiderTransaction[]> {
    const response = await this.request<{ data: FinnhubInsiderTransaction[] }>(
      '/stock/insider-transactions',
      { symbol }
    );

    return response?.data ?? [];
  }

  /**
   * Make a rate-limited request to the Finnhub API
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<T> {
    await this.rateLimiter.acquire();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('token', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let response: Response;

    try {
      response = await fetch(url.toString());
    } catch (error) {
      throw new FinnhubError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          operation: endpoint,
          symbol: params.symbol,
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');

      if (response.status === 401) {
        throw new FinnhubError('Invalid API key', {
          operation: endpoint,
          symbol: params.symbol,
          statusCode: response.status,
        });
      }

      if (response.status === 429) {
        throw new FinnhubError('Rate limit exceeded', {
          operation: endpoint,
          symbol: params.symbol,
          statusCode: response.status,
          rateLimitRemaining: 0,
        });
      }

      throw new FinnhubError(`API error: ${errorText}`, {
        operation: endpoint,
        symbol: params.symbol,
        statusCode: response.status,
      });
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new FinnhubError('Failed to parse response', {
        operation: endpoint,
        symbol: params.symbol,
      });
    }
  }

  /**
   * Get available rate limit tokens
   */
  getRateLimitStatus(): { available: number; waitTime: number } {
    return {
      available: this.rateLimiter.getAvailableTokens(),
      waitTime: this.rateLimiter.getWaitTime(),
    };
  }
}
