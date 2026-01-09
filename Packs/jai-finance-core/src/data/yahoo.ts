/**
 * Yahoo Finance Client
 *
 * Client for fetching market data from Yahoo Finance.
 * Uses the public API endpoints (no authentication required).
 */

import type {
  YahooQuote,
  YahooHistorical,
  YahooHistoricalEntry,
  YahooFundamentals,
  Yahoo52WeekRange,
  DataErrorContext,
} from './types';

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance';
const QUOTE_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';
const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export class YahooError extends Error {
  readonly context: DataErrorContext;

  constructor(message: string, context: DataErrorContext) {
    super(message);
    this.name = 'YahooError';
    this.context = context;
  }
}

export interface YahooClientConfig {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** User agent string */
  userAgent?: string;
}

export class YahooClient {
  private readonly timeout: number;
  private readonly userAgent: string;

  constructor(config: YahooClientConfig = {}) {
    this.timeout = config.timeout ?? 10000;
    this.userAgent =
      config.userAgent ??
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  }

  /**
   * Get real-time quote for one or more symbols
   */
  async getQuote(symbols: string | string[]): Promise<YahooQuote[]> {
    const symbolList = Array.isArray(symbols) ? symbols : [symbols];
    const symbolParam = symbolList.join(',');

    const url = `${QUOTE_URL}?symbols=${encodeURIComponent(symbolParam)}`;
    const response = await this.request<YahooQuoteResponse>(url);

    if (!response.quoteResponse?.result?.length) {
      throw new YahooError(`No quote data found for: ${symbolParam}`, {
        operation: 'getQuote',
        symbol: symbolParam,
      });
    }

    return response.quoteResponse.result.map(this.parseQuote);
  }

  /**
   * Get historical price data
   */
  async getHistorical(
    symbol: string,
    options: {
      startDate: Date;
      endDate?: Date;
      interval?: '1d' | '1wk' | '1mo';
    }
  ): Promise<YahooHistorical> {
    const endDate = options.endDate ?? new Date();
    const interval = options.interval ?? '1d';

    const period1 = Math.floor(options.startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const url = `${CHART_URL}/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=${interval}`;
    const response = await this.request<YahooChartResponse>(url);

    const chart = response.chart?.result?.[0];
    if (!chart) {
      throw new YahooError(`No historical data found for: ${symbol}`, {
        operation: 'getHistorical',
        symbol,
      });
    }

    const prices = this.parseHistoricalData(chart);

    return {
      symbol,
      prices,
      startDate: options.startDate,
      endDate,
      interval,
    };
  }

  /**
   * Get fundamental data (key statistics + financial data)
   */
  async getFundamentals(symbol: string): Promise<YahooFundamentals> {
    // Use quoteSummary endpoint for detailed fundamentals
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,financialData,summaryDetail`;
    const response = await this.request<YahooQuoteSummaryResponse>(url);

    const result = response.quoteSummary?.result?.[0];
    if (!result) {
      throw new YahooError(`No fundamentals found for: ${symbol}`, {
        operation: 'getFundamentals',
        symbol,
      });
    }

    return this.parseFundamentals(symbol, result);
  }

  /**
   * Get 52-week range with position analysis
   */
  async get52WeekRange(symbol: string): Promise<Yahoo52WeekRange> {
    const quotes = await this.getQuote(symbol);
    const quote = quotes[0];

    if (!quote) {
      throw new YahooError(`No quote data for 52-week range: ${symbol}`, {
        operation: 'get52WeekRange',
        symbol,
      });
    }

    const low = quote.fiftyTwoWeekLow;
    const high = quote.fiftyTwoWeekHigh;
    const current = quote.regularMarketPrice;

    if (!low || !high || !current) {
      throw new YahooError(`Incomplete 52-week data for: ${symbol}`, {
        operation: 'get52WeekRange',
        symbol,
      });
    }

    const range = high - low;
    const positionInRange = range > 0 ? (current - low) / range : 0;
    const distanceFromLow = low > 0 ? ((current - low) / low) * 100 : 0;
    const distanceFromHigh = high > 0 ? ((high - current) / high) * 100 : 0;

    return {
      symbol,
      low,
      high,
      current,
      positionInRange,
      distanceFromLow,
      distanceFromHigh,
    };
  }

  /**
   * Make a request to Yahoo Finance
   */
  private async request<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new YahooError('Symbol not found', {
            operation: url,
            statusCode: 404,
          });
        }

        throw new YahooError(`HTTP ${response.status}: ${response.statusText}`, {
          operation: url,
          statusCode: response.status,
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof YahooError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new YahooError('Request timeout', {
          operation: url,
        });
      }

      throw new YahooError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
        {
          operation: url,
        }
      );
    }
  }

  /**
   * Parse raw quote response to typed object
   */
  private parseQuote(raw: RawYahooQuote): YahooQuote {
    return {
      symbol: raw.symbol,
      shortName: raw.shortName ?? '',
      longName: raw.longName ?? raw.shortName ?? '',
      regularMarketPrice: raw.regularMarketPrice ?? 0,
      regularMarketChange: raw.regularMarketChange ?? 0,
      regularMarketChangePercent: raw.regularMarketChangePercent ?? 0,
      regularMarketTime: raw.regularMarketTime ?? 0,
      regularMarketDayHigh: raw.regularMarketDayHigh ?? 0,
      regularMarketDayLow: raw.regularMarketDayLow ?? 0,
      regularMarketVolume: raw.regularMarketVolume ?? 0,
      regularMarketPreviousClose: raw.regularMarketPreviousClose ?? 0,
      regularMarketOpen: raw.regularMarketOpen ?? 0,
      bid: raw.bid ?? 0,
      ask: raw.ask ?? 0,
      bidSize: raw.bidSize ?? 0,
      askSize: raw.askSize ?? 0,
      marketCap: raw.marketCap ?? 0,
      fiftyTwoWeekLow: raw.fiftyTwoWeekLow ?? 0,
      fiftyTwoWeekHigh: raw.fiftyTwoWeekHigh ?? 0,
      fiftyDayAverage: raw.fiftyDayAverage ?? 0,
      twoHundredDayAverage: raw.twoHundredDayAverage ?? 0,
      averageDailyVolume10Day: raw.averageDailyVolume10Day ?? 0,
      averageDailyVolume3Month: raw.averageDailyVolume3Month ?? 0,
      trailingPE: raw.trailingPE,
      forwardPE: raw.forwardPE,
      dividendRate: raw.dividendRate,
      dividendYield: raw.dividendYield,
      exchange: raw.exchange ?? '',
      quoteType: raw.quoteType ?? '',
      currency: raw.currency ?? 'USD',
    };
  }

  /**
   * Parse historical chart data
   */
  private parseHistoricalData(chart: YahooChartResult): YahooHistoricalEntry[] {
    const timestamps = chart.timestamp ?? [];
    const quotes = chart.indicators?.quote?.[0] ?? {};
    const adjClose = chart.indicators?.adjclose?.[0]?.adjclose ?? [];

    const entries: YahooHistoricalEntry[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      // Skip entries with null values (market holidays, etc.)
      if (
        quotes.open?.[i] == null ||
        quotes.high?.[i] == null ||
        quotes.low?.[i] == null ||
        quotes.close?.[i] == null
      ) {
        continue;
      }

      entries.push({
        date: timestamps[i] * 1000, // Convert to milliseconds
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        adjClose: adjClose[i] ?? quotes.close[i],
        volume: quotes.volume?.[i] ?? 0,
      });
    }

    return entries;
  }

  /**
   * Parse fundamentals from quoteSummary response
   */
  private parseFundamentals(
    symbol: string,
    result: YahooQuoteSummaryResult
  ): YahooFundamentals {
    const stats = result.defaultKeyStatistics ?? {};
    const financial = result.financialData ?? {};
    const summary = result.summaryDetail ?? {};

    const getValue = (obj: { raw?: number } | undefined): number =>
      obj?.raw ?? 0;

    return {
      symbol,
      marketCap: getValue(summary.marketCap),
      enterpriseValue: getValue(stats.enterpriseValue),
      trailingPE: getValue(summary.trailingPE),
      forwardPE: getValue(stats.forwardPE),
      pegRatio: getValue(stats.pegRatio),
      priceToSalesTrailing12Months: getValue(summary.priceToSalesTrailing12Months),
      priceToBook: getValue(stats.priceToBook),
      enterpriseToRevenue: getValue(stats.enterpriseToRevenue),
      enterpriseToEbitda: getValue(stats.enterpriseToEbitda),
      profitMargins: getValue(stats.profitMargins),
      grossMargins: getValue(financial.grossMargins),
      operatingMargins: getValue(financial.operatingMargins),
      returnOnAssets: getValue(financial.returnOnAssets),
      returnOnEquity: getValue(financial.returnOnEquity),
      totalRevenue: getValue(financial.totalRevenue),
      revenuePerShare: getValue(financial.revenuePerShare),
      revenueGrowth: getValue(financial.revenueGrowth),
      grossProfits: getValue(financial.grossProfits),
      freeCashflow: getValue(financial.freeCashflow),
      operatingCashflow: getValue(financial.operatingCashflow),
      earningsGrowth: getValue(financial.earningsGrowth),
      currentRatio: getValue(financial.currentRatio),
      debtToEquity: getValue(financial.debtToEquity),
      totalDebt: getValue(financial.totalDebt),
      totalCash: getValue(financial.totalCash),
      totalCashPerShare: getValue(financial.totalCashPerShare),
      bookValue: getValue(stats.bookValue),
      beta: getValue(stats.beta),
      heldPercentInsiders: getValue(stats.heldPercentInsiders),
      heldPercentInstitutions: getValue(stats.heldPercentInstitutions),
      shortRatio: getValue(stats.shortRatio),
      shortPercentOfFloat: getValue(stats.shortPercentOfFloat),
      fiftyTwoWeekChange: getValue(stats['52WeekChange']),
      dividendRate: summary.dividendRate?.raw,
      dividendYield: summary.dividendYield?.raw,
      payoutRatio: summary.payoutRatio?.raw,
      fiveYearAvgDividendYield: summary.fiveYearAvgDividendYield?.raw,
      exDividendDate: summary.exDividendDate?.raw,
      lastDividendValue: stats.lastDividendValue?.raw,
      lastDividendDate: stats.lastDividendDate?.raw,
    };
  }
}

// =============================================================================
// Internal Response Types
// =============================================================================

interface RawYahooQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  regularMarketPreviousClose?: number;
  regularMarketOpen?: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  marketCap?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  averageDailyVolume10Day?: number;
  averageDailyVolume3Month?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendRate?: number;
  dividendYield?: number;
  exchange?: string;
  quoteType?: string;
  currency?: string;
}

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: RawYahooQuote[];
    error?: unknown;
  };
}

interface YahooChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: number[];
      high?: number[];
      low?: number[];
      close?: number[];
      volume?: number[];
    }>;
    adjclose?: Array<{
      adjclose?: number[];
    }>;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[];
    error?: unknown;
  };
}

interface YahooValueField {
  raw?: number;
  fmt?: string;
}

interface YahooQuoteSummaryResult {
  defaultKeyStatistics?: Record<string, YahooValueField>;
  financialData?: Record<string, YahooValueField>;
  summaryDetail?: Record<string, YahooValueField>;
}

interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: YahooQuoteSummaryResult[];
    error?: unknown;
  };
}
