/**
 * Analysis Data Provider
 *
 * Implements AnalysisDataProvider interface using Finnhub and Yahoo clients
 * from jai-finance-core.
 */

import {
  FinnhubClient,
  YahooClient,
  DataCache,
  TTL,
} from 'jai-finance-core';

import type {
  AnalysisDataProvider,
  QuoteData,
  ProfileData,
  FinancialsData,
  InsiderTransaction,
  SECFilingData,
  NewsItem,
  PriceHistoryData,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

export interface DataProviderConfig {
  finnhubApiKey: string;
  cacheDir?: string;
  enableCache?: boolean;
}

// =============================================================================
// Implementation
// =============================================================================

export class RealDataProvider implements AnalysisDataProvider {
  private finnhub: FinnhubClient;
  private yahoo: YahooClient;
  private cache?: DataCache;

  constructor(config: DataProviderConfig) {
    this.finnhub = new FinnhubClient({
      apiKey: config.finnhubApiKey,
    });

    this.yahoo = new YahooClient();

    if (config.enableCache !== false) {
      this.cache = new DataCache({
        cacheDir: config.cacheDir || '/tmp/jai-cache',
        defaultTTL: TTL.QUOTE,
        persistToDisk: !!config.cacheDir,
      });
    }
  }

  async getQuote(ticker: string): Promise<QuoteData> {
    const cacheKey = `quote:${ticker}`;

    if (this.cache) {
      const cached = this.cache.get<QuoteData>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Try Finnhub first
      const fhQuote = await this.finnhub.getQuote(ticker);

      const quote: QuoteData = {
        ticker,
        price: fhQuote.c,
        change: fhQuote.d,
        changePercent: fhQuote.dp,
        volume: 0, // Finnhub quote doesn't include volume
        marketCap: 0, // Will be filled from profile
        timestamp: new Date(fhQuote.t * 1000),
      };

      if (this.cache) {
        this.cache.set(cacheKey, quote, TTL.QUOTE);
      }

      return quote;
    } catch (err) {
      // Fall back to Yahoo
      try {
        const yhQuotes = await this.yahoo.getQuote(ticker);
        const yhQuote = yhQuotes[0];

        if (!yhQuote) {
          throw new Error('No quote returned');
        }

        const quote: QuoteData = {
          ticker,
          price: yhQuote.regularMarketPrice,
          change: yhQuote.regularMarketChange,
          changePercent: yhQuote.regularMarketChangePercent,
          volume: yhQuote.regularMarketVolume,
          marketCap: yhQuote.marketCap || 0,
          timestamp: new Date(),
        };

        if (this.cache) {
          this.cache.set(cacheKey, quote, TTL.QUOTE);
        }

        return quote;
      } catch (yahooErr) {
        throw new Error(
          `Failed to get quote for ${ticker}: Finnhub: ${err}, Yahoo: ${yahooErr}`
        );
      }
    }
  }

  async getProfile(ticker: string): Promise<ProfileData> {
    const cacheKey = `profile:${ticker}`;

    if (this.cache) {
      const cached = this.cache.get<ProfileData>(cacheKey);
      if (cached) return cached;
    }

    try {
      const fhProfile = await this.finnhub.getProfile(ticker);

      const profile: ProfileData = {
        ticker,
        name: fhProfile.name || ticker,
        sector: fhProfile.finnhubIndustry || 'Unknown',
        industry: fhProfile.finnhubIndustry || 'Unknown',
        country: fhProfile.country || 'Unknown',
        marketCap: (fhProfile.marketCapitalization || 0) * 1_000_000,
        employees: undefined,
        description: undefined,
      };

      if (this.cache) {
        this.cache.set(cacheKey, profile, TTL.FUNDAMENTALS);
      }

      return profile;
    } catch (err) {
      // Try Yahoo as fallback
      try {
        const yhQuotes = await this.yahoo.getQuote(ticker);
        const yhQuote = yhQuotes[0];

        if (!yhQuote) {
          throw new Error('No quote returned');
        }

        const profile: ProfileData = {
          ticker,
          name: yhQuote.longName || yhQuote.shortName || ticker,
          sector: 'Unknown',
          industry: 'Unknown',
          country: 'Unknown',
          marketCap: yhQuote.marketCap || 0,
        };

        if (this.cache) {
          this.cache.set(cacheKey, profile, TTL.FUNDAMENTALS);
        }

        return profile;
      } catch (yahooErr) {
        throw new Error(
          `Failed to get profile for ${ticker}: ${err}`
        );
      }
    }
  }

  async getFinancials(ticker: string): Promise<FinancialsData> {
    const cacheKey = `financials:${ticker}`;

    if (this.cache) {
      const cached = this.cache.get<FinancialsData>(cacheKey);
      if (cached) return cached;
    }

    try {
      const fhMetrics = await this.finnhub.getFinancials(ticker);
      const m = fhMetrics.metric || {};

      // Helper to safely get number
      const num = (val: unknown): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val) || 0;
        return 0;
      };

      // Helper for percentage values: Finnhub returns -15.61 meaning -15.61%
      // We convert to decimal form: -0.1561
      const pct = (val: unknown): number => num(val) / 100;

      const financials: FinancialsData = {
        ticker,
        // Profitability (percentages - convert from e.g. 15.5 to 0.155)
        roa: pct(m['roaTTM']),
        roe: pct(m['roeTTM']),
        roaTTM: pct(m['roaTTM']),
        netProfitMargin: pct(m['netProfitMarginTTM']),
        grossMargin: pct(m['grossMarginTTM']),
        operatingMargin: pct(m['operatingMarginTTM']),
        // Valuation (ratios - keep as-is)
        peRatio: num(m['peNormalizedAnnual']) || num(m['peBasicExclExtraTTM']),
        pbRatio: num(m['pbAnnual']),
        psRatio: num(m['psAnnual']),
        // Growth (percentages - convert)
        revenueGrowth: pct(m['revenueGrowthTTMYoy']),
        earningsGrowth: pct(m['epsGrowthTTMYoy']),
        // Cash Flow
        freeCashFlow: num(m['freeCashFlowTTM']),
        operatingCashFlow: num(m['cashFlowPerShareTTM']),
        netIncome: num(m['netIncomePerShareTTM']),
        // Balance Sheet
        currentRatio: num(m['currentRatioAnnual']),
        debtToEquity: num(m['totalDebtToEquityAnnual']),
        totalDebt: num(m['totalDebtAnnual']),
        totalCash: num(m['cashPerShareAnnual']),
        // Shares
        sharesOutstanding: num(m['sharesOutstanding']),
        // Dividends (percentages - convert)
        dividendYield: pct(m['dividendYieldIndicatedAnnual']),
        payoutRatio: pct(m['payoutRatioTTM']),
        // Other
        beta: num(m['beta']),
        shortRatio: num(m['shortRatio']),
      };

      if (this.cache) {
        this.cache.set(cacheKey, financials, TTL.FUNDAMENTALS);
      }

      return financials;
    } catch (err) {
      // Return default financials on error
      console.error(`Failed to get financials for ${ticker}:`, err);

      return {
        ticker,
        roa: 0,
        roe: 0,
        netProfitMargin: 0,
        grossMargin: 0,
        operatingMargin: 0,
        peRatio: 0,
        pbRatio: 0,
        psRatio: 0,
        revenueGrowth: 0,
        earningsGrowth: 0,
        freeCashFlow: 0,
        operatingCashFlow: 0,
        netIncome: 0,
        currentRatio: 0,
        debtToEquity: 0,
        totalDebt: 0,
        totalCash: 0,
        sharesOutstanding: 0,
        beta: 0,
      };
    }
  }

  async getInsiderTransactions(ticker: string): Promise<InsiderTransaction[]> {
    const cacheKey = `insider:${ticker}`;

    if (this.cache) {
      const cached = this.cache.get<InsiderTransaction[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const fhInsider = await this.finnhub.getInsiderTransactions(ticker);

      // Finnhub API returns transactionCode, not transactionType:
      // P = Purchase (buy), S = Sale (sell), A = Award (stock grant)
      // M = Exercise, G = Gift, F = Tax payment, D = Disposition to issuer
      // We only care about P and S for sentiment analysis
      const transactions: InsiderTransaction[] = fhInsider
        .filter((t) => {
          const code = (t as unknown as { transactionCode: string }).transactionCode;
          return code === 'P' || code === 'S';
        })
        .map((t) => {
          const code = (t as unknown as { transactionCode: string }).transactionCode;
          return {
            name: t.name,
            title: 'Insider',
            transactionType: code === 'P' ? 'BUY' as const : 'SELL' as const,
            shares: Math.abs(t.share),
            price: t.transactionPrice,
            value: Math.abs(t.share * t.transactionPrice),
            date: new Date(t.transactionDate),
            sharesOwnedAfter: t.sharesOwned,
          };
        });

      if (this.cache) {
        this.cache.set(cacheKey, transactions, TTL.FUNDAMENTALS);
      }

      return transactions;
    } catch (err) {
      console.error(`Failed to get insider transactions for ${ticker}:`, err);
      return [];
    }
  }

  async getSECFilings(_ticker: string): Promise<SECFilingData[]> {
    // SEC API requires CIK (Central Index Key) not ticker
    // For now, return empty array - can implement CIK lookup later
    return [];
  }

  async getNews(ticker: string): Promise<NewsItem[]> {
    const cacheKey = `news:${ticker}`;

    if (this.cache) {
      const cached = this.cache.get<NewsItem[]>(cacheKey);
      if (cached) return cached;
    }

    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const fhNews = await this.finnhub.getNews(
        ticker,
        weekAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      );

      const news: NewsItem[] = (fhNews || []).slice(0, 20).map((n) => ({
        headline: n.headline,
        source: n.source,
        publishedAt: new Date(n.datetime * 1000),
        url: n.url,
        summary: n.summary,
        sentiment: undefined,
      }));

      if (this.cache) {
        this.cache.set(cacheKey, news, TTL.NEWS);
      }

      return news;
    } catch (err) {
      console.error(`Failed to get news for ${ticker}:`, err);
      return [];
    }
  }

  async getPriceHistory(
    ticker: string,
    period: '1y' | '2y' | '5y'
  ): Promise<PriceHistoryData> {
    const cacheKey = `history:${ticker}:${period}`;

    if (this.cache) {
      const cached = this.cache.get<PriceHistoryData>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Calculate start date based on period
      const now = new Date();
      const years = period === '1y' ? 1 : period === '2y' ? 2 : 5;
      const startDate = new Date(now.getTime() - years * 365 * 24 * 60 * 60 * 1000);

      const yhHistory = await this.yahoo.getHistorical(ticker, {
        startDate,
        endDate: now,
        interval: '1d',
      });

      const history: PriceHistoryData = {
        ticker,
        period,
        prices: yhHistory.prices.map((p) => ({
          date: new Date(p.date),
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume,
          adjClose: p.adjClose,
        })),
      };

      if (this.cache) {
        this.cache.set(cacheKey, history, TTL.FUNDAMENTALS);
      }

      return history;
    } catch (err) {
      throw new Error(`Failed to get price history for ${ticker}: ${err}`);
    }
  }
}
