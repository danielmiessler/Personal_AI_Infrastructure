/**
 * SEC EDGAR Client
 *
 * Client for fetching data from SEC EDGAR system.
 * Implements required rate limiting and user-agent policies.
 */

import type { SECFiling, SECInsiderTransaction, DataErrorContext } from './types';

const BASE_URL = 'https://data.sec.gov';
const SUBMISSIONS_URL = `${BASE_URL}/submissions`;
const REQUIRED_USER_AGENT = 'PersonalFinanceBot/1.0 (contact@example.com)';

// SEC requires max 10 requests per second
const REQUEST_DELAY_MS = 100;

export class SECError extends Error {
  readonly context: DataErrorContext;

  constructor(message: string, context: DataErrorContext) {
    super(message);
    this.name = 'SECError';
    this.context = context;
  }
}

export interface SECClientConfig {
  /** User agent string (SEC requires identification) */
  userAgent?: string;
  /** Email for SEC identification */
  email?: string;
}

export class SECClient {
  private readonly userAgent: string;
  private lastRequestTime = 0;

  constructor(config: SECClientConfig = {}) {
    // SEC requires a user agent with contact info
    if (config.email) {
      this.userAgent = `PersonalFinanceBot/1.0 (${config.email})`;
    } else if (config.userAgent) {
      this.userAgent = config.userAgent;
    } else {
      this.userAgent = REQUIRED_USER_AGENT;
    }
  }

  /**
   * Get recent SEC filings for a company
   * @param cik Central Index Key (SEC company identifier)
   * @param formTypes Optional filter by form types (e.g., ['10-K', '10-Q'])
   * @param limit Maximum number of filings to return
   */
  async getFilings(
    cik: string,
    options: {
      formTypes?: string[];
      limit?: number;
    } = {}
  ): Promise<SECFiling[]> {
    const { formTypes, limit = 50 } = options;
    const normalizedCik = this.normalizeCik(cik);

    const url = `${SUBMISSIONS_URL}/CIK${normalizedCik}.json`;
    const response = await this.request<SECSubmissionsResponse>(url);

    if (!response.filings?.recent) {
      throw new SECError(`No filings found for CIK: ${cik}`, {
        operation: 'getFilings',
        symbol: cik,
      });
    }

    const filings = this.parseFilings(response.filings.recent);

    // Filter by form type if specified
    let filtered = filings;
    if (formTypes && formTypes.length > 0) {
      const formSet = new Set(formTypes.map((f) => f.toUpperCase()));
      filtered = filings.filter((f) => formSet.has(f.form.toUpperCase()));
    }

    return filtered.slice(0, limit);
  }

  /**
   * Get insider transactions (Form 3, 4, 5 filings)
   * @param cik Central Index Key
   * @param limit Maximum number of transactions to return
   */
  async getInsiderTransactions(
    cik: string,
    limit = 50
  ): Promise<SECInsiderTransaction[]> {
    // Get Form 4 filings (most common insider transaction form)
    const filings = await this.getFilings(cik, {
      formTypes: ['3', '4', '5'],
      limit,
    });

    // Parse the filings into transaction format
    // Note: Full parsing would require fetching each XML filing
    // This returns filing-level info; detailed transaction parsing
    // would require additional requests
    const transactions: SECInsiderTransaction[] = filings.map((filing) => ({
      filerName: 'See Filing', // Would need to parse XML for actual name
      filerRelation: this.inferRelationFromForm(filing.form),
      transactionDate: filing.reportDate,
      transactionType: this.inferTransactionType(filing.form),
      securityType: 'Common Stock', // Default, actual in XML
      shares: 0, // Would need to parse XML
      pricePerShare: 0, // Would need to parse XML
      totalValue: 0, // Would need to parse XML
      sharesOwnedAfter: 0, // Would need to parse XML
      directOwnership: true,
      formType: `Form ${filing.form}`,
      filingDate: filing.filingDate,
      filingUrl: this.buildFilingUrl(cik, filing.accessionNumber, filing.primaryDocument),
    }));

    return transactions;
  }

  /**
   * Look up CIK by ticker symbol
   * @param ticker Stock ticker symbol
   */
  async lookupCik(ticker: string): Promise<string> {
    const url = `${BASE_URL}/files/company_tickers.json`;
    const response = await this.request<Record<string, CompanyTickerEntry>>(url);

    const upperTicker = ticker.toUpperCase();

    for (const entry of Object.values(response)) {
      if (entry.ticker === upperTicker) {
        return this.normalizeCik(String(entry.cik_str));
      }
    }

    throw new SECError(`No CIK found for ticker: ${ticker}`, {
      operation: 'lookupCik',
      symbol: ticker,
    });
  }

  /**
   * Get company info from SEC
   */
  async getCompanyInfo(cik: string): Promise<SECCompanyInfo> {
    const normalizedCik = this.normalizeCik(cik);
    const url = `${SUBMISSIONS_URL}/CIK${normalizedCik}.json`;
    const response = await this.request<SECSubmissionsResponse>(url);

    return {
      cik: response.cik,
      name: response.name,
      sic: response.sic,
      sicDescription: response.sicDescription,
      tickers: response.tickers ?? [],
      exchanges: response.exchanges ?? [],
      fiscalYearEnd: response.fiscalYearEnd,
      stateOfIncorporation: response.stateOfIncorporation,
    };
  }

  /**
   * Make a rate-limited request to SEC EDGAR
   */
  private async request<T>(url: string): Promise<T> {
    // Enforce rate limiting (10 req/sec max)
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < REQUEST_DELAY_MS) {
      await this.sleep(REQUEST_DELAY_MS - elapsed);
    }
    this.lastRequestTime = Date.now();

    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });
    } catch (error) {
      throw new SECError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
        {
          operation: url,
        }
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new SECError('CIK or filing not found', {
          operation: url,
          statusCode: 404,
        });
      }

      if (response.status === 403) {
        throw new SECError('Access forbidden - check user agent', {
          operation: url,
          statusCode: 403,
        });
      }

      throw new SECError(`HTTP ${response.status}: ${response.statusText}`, {
        operation: url,
        statusCode: response.status,
      });
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new SECError('Failed to parse SEC response', {
        operation: url,
      });
    }
  }

  /**
   * Normalize CIK to 10-digit padded format
   */
  private normalizeCik(cik: string): string {
    // Remove any leading zeros and non-numeric characters
    const numeric = cik.replace(/\D/g, '');
    // Pad to 10 digits
    return numeric.padStart(10, '0');
  }

  /**
   * Parse filing data from SEC response
   */
  private parseFilings(recent: SECRecentFilings): SECFiling[] {
    const count = recent.accessionNumber?.length ?? 0;
    const filings: SECFiling[] = [];

    for (let i = 0; i < count; i++) {
      filings.push({
        accessionNumber: recent.accessionNumber[i] ?? '',
        filingDate: recent.filingDate[i] ?? '',
        reportDate: recent.reportDate[i] ?? '',
        acceptanceDateTime: recent.acceptanceDateTime[i] ?? '',
        act: recent.act[i] ?? '',
        form: recent.form[i] ?? '',
        fileNumber: recent.fileNumber[i] ?? '',
        filmNumber: recent.filmNumber[i] ?? '',
        items: recent.items[i] ?? '',
        size: recent.size[i] ?? 0,
        isXBRL: recent.isXBRL[i] === 1,
        isInlineXBRL: recent.isInlineXBRL[i] === 1,
        primaryDocument: recent.primaryDocument[i] ?? '',
        primaryDocDescription: recent.primaryDocDescription[i] ?? '',
      });
    }

    return filings;
  }

  /**
   * Build URL for a specific filing document
   */
  private buildFilingUrl(
    cik: string,
    accessionNumber: string,
    document: string
  ): string {
    const normalizedCik = this.normalizeCik(cik);
    const cleanAccession = accessionNumber.replace(/-/g, '');
    return `https://www.sec.gov/Archives/edgar/data/${normalizedCik}/${cleanAccession}/${document}`;
  }

  /**
   * Infer filer relation from form type
   */
  private inferRelationFromForm(form: string): string {
    switch (form) {
      case '3':
        return 'Initial Statement (New Insider)';
      case '4':
        return 'Officer/Director/10% Owner';
      case '5':
        return 'Annual Statement';
      default:
        return 'Insider';
    }
  }

  /**
   * Infer transaction type from form
   */
  private inferTransactionType(form: string): string {
    switch (form) {
      case '3':
        return 'Initial Holdings';
      case '4':
        return 'Transaction';
      case '5':
        return 'Annual Amendment';
      default:
        return 'Unknown';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// SEC Response Types
// =============================================================================

interface SECRecentFilings {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime: string[];
  act: string[];
  form: string[];
  fileNumber: string[];
  filmNumber: string[];
  items: string[];
  size: number[];
  isXBRL: number[];
  isInlineXBRL: number[];
  primaryDocument: string[];
  primaryDocDescription: string[];
}

interface SECSubmissionsResponse {
  cik: string;
  name: string;
  sic?: string;
  sicDescription?: string;
  tickers?: string[];
  exchanges?: string[];
  fiscalYearEnd?: string;
  stateOfIncorporation?: string;
  filings?: {
    recent: SECRecentFilings;
  };
}

interface CompanyTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface SECCompanyInfo {
  cik: string;
  name: string;
  sic?: string;
  sicDescription?: string;
  tickers: string[];
  exchanges: string[];
  fiscalYearEnd?: string;
  stateOfIncorporation?: string;
}
