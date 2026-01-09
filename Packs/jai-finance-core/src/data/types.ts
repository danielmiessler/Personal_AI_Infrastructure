/**
 * Data Types for jai-finance-core
 *
 * Type definitions for all external data sources and caching.
 */

// =============================================================================
// Finnhub Types
// =============================================================================

export interface FinnhubQuote {
  /** Current price */
  c: number;
  /** Change */
  d: number;
  /** Percent change */
  dp: number;
  /** High price of the day */
  h: number;
  /** Low price of the day */
  l: number;
  /** Open price of the day */
  o: number;
  /** Previous close price */
  pc: number;
  /** Timestamp */
  t: number;
}

export interface FinnhubProfile {
  /** Country of company's headquarters */
  country: string;
  /** Currency used in company filings */
  currency: string;
  /** Listed exchange */
  exchange: string;
  /** Company name */
  name: string;
  /** Company ticker */
  ticker: string;
  /** Company IPO date */
  ipo: string;
  /** Market capitalization */
  marketCapitalization: number;
  /** Number of outstanding shares */
  shareOutstanding: number;
  /** Company logo URL */
  logo: string;
  /** Company phone number */
  phone: string;
  /** Company website URL */
  weburl: string;
  /** Finnhub industry classification */
  finnhubIndustry: string;
}

export interface FinnhubFinancials {
  /** Metric data */
  metric: {
    /** 10 day average trading volume */
    '10DayAverageTradingVolume': number;
    /** 13 week price return daily */
    '13WeekPriceReturnDaily': number;
    /** 26 week price return daily */
    '26WeekPriceReturnDaily': number;
    /** 3 month average trading volume */
    '3MonthAverageTradingVolume': number;
    /** 52 week high */
    '52WeekHigh': number;
    /** 52 week high date */
    '52WeekHighDate': string;
    /** 52 week low */
    '52WeekLow': number;
    /** 52 week low date */
    '52WeekLowDate': string;
    /** 52 week price return daily */
    '52WeekPriceReturnDaily': number;
    /** 5 day price return daily */
    '5DayPriceReturnDaily': number;
    /** Beta */
    beta: number;
    /** Book value per share annual */
    bookValuePerShareAnnual: number;
    /** Book value per share quarterly */
    bookValuePerShareQuarterly: number;
    /** Current dividend yield TTM */
    currentDividendYieldTTM: number;
    /** Current EV/Free Cash Flow annual */
    currentEv_freeCashFlowAnnual: number;
    /** Current EV/Free Cash Flow TTM */
    currentEv_freeCashFlowTTM: number;
    /** Current ratio annual */
    currentRatioAnnual: number;
    /** Current ratio quarterly */
    currentRatioQuarterly: number;
    /** Dividend per share annual */
    dividendPerShareAnnual: number;
    /** Dividend yield 5 year */
    dividendYield5Y: number;
    /** Dividend yield indicated annual */
    dividendYieldIndicatedAnnual: number;
    /** EPS annual */
    epsAnnual: number;
    /** EPS TTM */
    epsTTM: number;
    /** Market capitalization */
    marketCapitalization: number;
    /** Net debt annual */
    netDebtAnnual: number;
    /** Net profit margin annual */
    netProfitMarginAnnual: number;
    /** Net profit margin TTM */
    netProfitMarginTTM: number;
    /** P/E annual */
    peAnnual: number;
    /** P/E TTM */
    peTTM: number;
    /** Price to book annual */
    pbAnnual: number;
    /** Price to book quarterly */
    pbQuarterly: number;
    /** Price to sales annual */
    psAnnual: number;
    /** Price to sales TTM */
    psTTM: number;
    /** ROA annual */
    roaAnnual: number;
    /** ROA TTM */
    roaTTM: number;
    /** ROE annual */
    roeAnnual: number;
    /** ROE TTM */
    roeTTM: number;
    /** Revenue per share annual */
    revenuePerShareAnnual: number;
    /** Revenue per share TTM */
    revenuePerShareTTM: number;
    /** Total debt/total equity annual */
    totalDebt_totalEquityAnnual: number;
    /** Total debt/total equity quarterly */
    totalDebt_totalEquityQuarterly: number;
    /** Additional metrics (Finnhub returns many more) */
    [key: string]: number | string | undefined;
  };
  /** Metric type */
  metricType: string;
  /** Symbol */
  symbol: string;
}

export interface FinnhubNews {
  /** News category */
  category: string;
  /** Published time (Unix timestamp) */
  datetime: number;
  /** News headline */
  headline: string;
  /** News ID */
  id: number;
  /** Thumbnail image URL */
  image: string;
  /** Related tickers */
  related: string;
  /** News source */
  source: string;
  /** News summary */
  summary: string;
  /** News URL */
  url: string;
}

export interface FinnhubPriceTarget {
  /** Last updated */
  lastUpdated: string;
  /** Symbol */
  symbol: string;
  /** Target high */
  targetHigh: number;
  /** Target low */
  targetLow: number;
  /** Target mean */
  targetMean: number;
  /** Target median */
  targetMedian: number;
}

export interface FinnhubRecommendation {
  /** Period */
  period: string;
  /** Strong buy count */
  strongBuy: number;
  /** Buy count */
  buy: number;
  /** Hold count */
  hold: number;
  /** Sell count */
  sell: number;
  /** Strong sell count */
  strongSell: number;
  /** Symbol */
  symbol: string;
}

export interface FinnhubInsiderTransaction {
  /** Symbol */
  symbol: string;
  /** Person's name */
  name: string;
  /** Number of shares */
  share: number;
  /** Transaction type */
  transactionType: string;
  /** Filing date */
  filingDate: string;
  /** Transaction date */
  transactionDate: string;
  /** Transaction price */
  transactionPrice: number;
  /** Shares owned after transaction */
  sharesOwned: number;
}

// =============================================================================
// Yahoo Finance Types
// =============================================================================

export interface YahooQuote {
  /** Symbol */
  symbol: string;
  /** Short name */
  shortName: string;
  /** Long name */
  longName: string;
  /** Regular market price */
  regularMarketPrice: number;
  /** Regular market change */
  regularMarketChange: number;
  /** Regular market change percent */
  regularMarketChangePercent: number;
  /** Regular market time */
  regularMarketTime: number;
  /** Regular market day high */
  regularMarketDayHigh: number;
  /** Regular market day low */
  regularMarketDayLow: number;
  /** Regular market volume */
  regularMarketVolume: number;
  /** Regular market previous close */
  regularMarketPreviousClose: number;
  /** Regular market open */
  regularMarketOpen: number;
  /** Bid price */
  bid: number;
  /** Ask price */
  ask: number;
  /** Bid size */
  bidSize: number;
  /** Ask size */
  askSize: number;
  /** Market cap */
  marketCap: number;
  /** Fifty two week low */
  fiftyTwoWeekLow: number;
  /** Fifty two week high */
  fiftyTwoWeekHigh: number;
  /** Fifty day average */
  fiftyDayAverage: number;
  /** Two hundred day average */
  twoHundredDayAverage: number;
  /** Average daily volume 10 day */
  averageDailyVolume10Day: number;
  /** Average daily volume 3 month */
  averageDailyVolume3Month: number;
  /** Trailing PE */
  trailingPE?: number;
  /** Forward PE */
  forwardPE?: number;
  /** Dividend rate */
  dividendRate?: number;
  /** Dividend yield */
  dividendYield?: number;
  /** Exchange */
  exchange: string;
  /** Quote type */
  quoteType: string;
  /** Currency */
  currency: string;
}

export interface YahooHistoricalEntry {
  /** Date (Unix timestamp) */
  date: number;
  /** Open price */
  open: number;
  /** High price */
  high: number;
  /** Low price */
  low: number;
  /** Close price */
  close: number;
  /** Adjusted close price */
  adjClose: number;
  /** Volume */
  volume: number;
}

export interface YahooHistorical {
  /** Symbol */
  symbol: string;
  /** Price entries */
  prices: YahooHistoricalEntry[];
  /** Start date */
  startDate: Date;
  /** End date */
  endDate: Date;
  /** Interval (1d, 1wk, 1mo) */
  interval: string;
}

export interface YahooFundamentals {
  /** Symbol */
  symbol: string;
  /** Market cap */
  marketCap: number;
  /** Enterprise value */
  enterpriseValue: number;
  /** Trailing PE */
  trailingPE: number;
  /** Forward PE */
  forwardPE: number;
  /** PEG ratio */
  pegRatio: number;
  /** Price to sales */
  priceToSalesTrailing12Months: number;
  /** Price to book */
  priceToBook: number;
  /** Enterprise to revenue */
  enterpriseToRevenue: number;
  /** Enterprise to EBITDA */
  enterpriseToEbitda: number;
  /** Profit margins */
  profitMargins: number;
  /** Gross margins */
  grossMargins: number;
  /** Operating margins */
  operatingMargins: number;
  /** Return on assets */
  returnOnAssets: number;
  /** Return on equity */
  returnOnEquity: number;
  /** Revenue */
  totalRevenue: number;
  /** Revenue per share */
  revenuePerShare: number;
  /** Revenue growth */
  revenueGrowth: number;
  /** Gross profits */
  grossProfits: number;
  /** Free cash flow */
  freeCashflow: number;
  /** Operating cash flow */
  operatingCashflow: number;
  /** Earnings growth */
  earningsGrowth: number;
  /** Current ratio */
  currentRatio: number;
  /** Debt to equity */
  debtToEquity: number;
  /** Total debt */
  totalDebt: number;
  /** Total cash */
  totalCash: number;
  /** Total cash per share */
  totalCashPerShare: number;
  /** Book value */
  bookValue: number;
  /** Beta */
  beta: number;
  /** Held percent insiders */
  heldPercentInsiders: number;
  /** Held percent institutions */
  heldPercentInstitutions: number;
  /** Short ratio */
  shortRatio: number;
  /** Short percent of float */
  shortPercentOfFloat: number;
  /** 52 week change */
  fiftyTwoWeekChange: number;
  /** Dividend rate */
  dividendRate?: number;
  /** Dividend yield */
  dividendYield?: number;
  /** Payout ratio */
  payoutRatio?: number;
  /** Five year avg dividend yield */
  fiveYearAvgDividendYield?: number;
  /** Ex-dividend date */
  exDividendDate?: number;
  /** Last dividend value */
  lastDividendValue?: number;
  /** Last dividend date */
  lastDividendDate?: number;
}

export interface Yahoo52WeekRange {
  /** Symbol */
  symbol: string;
  /** 52 week low */
  low: number;
  /** 52 week high */
  high: number;
  /** Current price */
  current: number;
  /** Position in range (0-1) */
  positionInRange: number;
  /** Distance from low (percent) */
  distanceFromLow: number;
  /** Distance from high (percent) */
  distanceFromHigh: number;
}

// =============================================================================
// SEC Types
// =============================================================================

export interface SECFiling {
  /** Accession number */
  accessionNumber: string;
  /** Filing date */
  filingDate: string;
  /** Report date */
  reportDate: string;
  /** Acceptance datetime */
  acceptanceDateTime: string;
  /** Act */
  act: string;
  /** Form type */
  form: string;
  /** File number */
  fileNumber: string;
  /** Film number */
  filmNumber: string;
  /** Items */
  items: string;
  /** Size */
  size: number;
  /** Is XBRL */
  isXBRL: boolean;
  /** Is inline XBRL */
  isInlineXBRL: boolean;
  /** Primary document */
  primaryDocument: string;
  /** Primary document description */
  primaryDocDescription: string;
}

export interface SECInsiderTransaction {
  /** Filer name */
  filerName: string;
  /** Filer relationship (e.g., Officer, Director) */
  filerRelation: string;
  /** Transaction date */
  transactionDate: string;
  /** Transaction type (Buy, Sell, Option Exercise) */
  transactionType: string;
  /** Security type */
  securityType: string;
  /** Number of shares */
  shares: number;
  /** Price per share */
  pricePerShare: number;
  /** Total value */
  totalValue: number;
  /** Shares owned after transaction */
  sharesOwnedAfter: number;
  /** Is direct ownership */
  directOwnership: boolean;
  /** Form type (Form 3, Form 4, Form 5) */
  formType: string;
  /** Filing date */
  filingDate: string;
  /** SEC filing URL */
  filingUrl: string;
}

// =============================================================================
// Cache Types
// =============================================================================

export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  cachedAt: number;
  /** Time to live in milliseconds */
  ttl: number;
  /** Optional tags for invalidation */
  tags?: string[];
}

export interface CacheConfig {
  /** Directory for disk persistence */
  cacheDir: string;
  /** Default TTL in milliseconds */
  defaultTTL: number;
  /** Whether to persist to disk */
  persistToDisk: boolean;
  /** Maximum memory entries before eviction */
  maxMemoryEntries?: number;
}

// =============================================================================
// Error Types
// =============================================================================

export interface DataErrorContext {
  /** The operation that failed */
  operation: string;
  /** Symbol if applicable */
  symbol?: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Rate limit info if applicable */
  rateLimitRemaining?: number;
  /** Additional context */
  [key: string]: unknown;
}
