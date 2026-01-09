/**
 * Screen Command
 *
 * Screen stocks by strategy (growth, value, sectors, dividend).
 * Uses real data from Finnhub with a predefined stock universe.
 */

import {
  header,
  subheader,
  table,
  colorVerdict,
  colorPercent,
  formatCurrency,
  formatPercent,
  green,
  red,
  yellow,
  cyan,
  gray,
  bold,
  error,
  info,
  warn,
  spinner,
} from '../format';
import { RealDataProvider } from '../../analysis/data-provider';
import type { FinancialsData, QuoteData } from '../../analysis/types';

// =============================================================================
// Types
// =============================================================================

interface ScreenOptions {
  limit?: string;
  sector?: string;
  json?: boolean;
}

type ScreenType = 'growth' | 'value' | 'sectors' | 'dividend';

interface ScreenResult {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  score: number;
  metrics: Record<string, number | string>;
  verdict: string;
}

// =============================================================================
// Stock Universe
// =============================================================================

// Curated universe of liquid, well-known stocks across sectors
const STOCK_UNIVERSE: Record<string, string[]> = {
  Technology: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AVGO', 'ORCL', 'CRM', 'AMD', 'INTC'],
  Healthcare: ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'DHR', 'BMY'],
  Financials: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'C', 'AXP', 'SCHW', 'USB'],
  'Consumer Staples': ['PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'MO', 'CL', 'GIS', 'KHC'],
  'Consumer Discretionary': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'LOW', 'TGT', 'BKNG'],
  Energy: ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'VLO', 'OXY', 'PXD'],
  Industrials: ['CAT', 'UNP', 'HON', 'UPS', 'BA', 'RTX', 'GE', 'DE', 'LMT', 'MMM'],
  Utilities: ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'XEL', 'PEG', 'ED'],
  Materials: ['LIN', 'APD', 'SHW', 'FCX', 'NEM', 'ECL', 'DD', 'DOW', 'NUE', 'VMC'],
  'Real Estate': ['PLD', 'AMT', 'EQIX', 'CCI', 'PSA', 'O', 'WELL', 'SPG', 'DLR', 'AVB'],
};

// =============================================================================
// Screen Configurations
// =============================================================================

const SCREEN_CONFIGS: Record<ScreenType, {
  name: string;
  description: string;
  columns: Array<{ header: string; key: string; width?: number; align?: 'left' | 'right' }>;
}> = {
  growth: {
    name: 'Growth Screen',
    description: 'High-growth companies with strong revenue and earnings momentum',
    columns: [
      { header: 'Ticker', key: 'ticker', width: 8 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Price', key: 'price', width: 10, align: 'right' },
      { header: 'Rev Grth', key: 'revenueGrowth', width: 10, align: 'right' },
      { header: 'EPS Grth', key: 'epsGrowth', width: 10, align: 'right' },
      { header: 'Score', key: 'score', width: 8, align: 'right' },
    ],
  },
  value: {
    name: 'Value Screen',
    description: 'Undervalued companies with strong fundamentals',
    columns: [
      { header: 'Ticker', key: 'ticker', width: 8 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Price', key: 'price', width: 10, align: 'right' },
      { header: 'P/E', key: 'pe', width: 8, align: 'right' },
      { header: 'P/B', key: 'pb', width: 8, align: 'right' },
      { header: 'Div Yld', key: 'divYield', width: 8, align: 'right' },
      { header: 'Score', key: 'score', width: 8, align: 'right' },
    ],
  },
  sectors: {
    name: 'Sector Leaders',
    description: 'Top stocks by sector with relative strength',
    columns: [
      { header: 'Ticker', key: 'ticker', width: 8 },
      { header: 'Sector', key: 'sector', width: 15 },
      { header: 'Price', key: 'price', width: 10, align: 'right' },
      { header: '52W Chg', key: 'return52w', width: 10, align: 'right' },
      { header: 'Beta', key: 'beta', width: 8, align: 'right' },
      { header: 'Score', key: 'score', width: 8, align: 'right' },
    ],
  },
  dividend: {
    name: 'Dividend Screen',
    description: 'Quality dividend payers with sustainable payouts',
    columns: [
      { header: 'Ticker', key: 'ticker', width: 8 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Price', key: 'price', width: 10, align: 'right' },
      { header: 'Yield', key: 'divYield', width: 8, align: 'right' },
      { header: 'Payout', key: 'payoutRatio', width: 8, align: 'right' },
      { header: 'Score', key: 'score', width: 8, align: 'right' },
    ],
  },
};

// =============================================================================
// Command Implementation
// =============================================================================

export async function screenCommand(
  type: string,
  options: ScreenOptions
): Promise<void> {
  const screenType = type.toLowerCase() as ScreenType;

  if (!SCREEN_CONFIGS[screenType]) {
    error(`Unknown screen type: ${type}`);
    console.log(gray('Available types: growth, value, sectors, dividend'));
    process.exit(1);
  }

  const config = SCREEN_CONFIGS[screenType];
  const limit = parseInt(options.limit || '10', 10);

  console.log(header(config.name));
  console.log(gray(config.description));
  console.log('');

  const loading = spinner('Fetching stock data...');

  try {
    const results = await runScreen(screenType, limit, options.sector);
    loading.stop();

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      info('No stocks matched the screen criteria.');
      return;
    }

    printScreenResults(results, config);

    console.log('');
    console.log(gray(`Showing top ${results.length} results`));
    console.log(gray('Run "jsa analyze <ticker>" for detailed analysis'));
  } catch (err) {
    loading.stop();
    error(`Screen failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// =============================================================================
// Screen Execution
// =============================================================================

async function runScreen(
  type: ScreenType,
  limit: number,
  sector?: string
): Promise<ScreenResult[]> {
  // Initialize data provider
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY not set. Run: source ~/.config/jai/load-secrets.sh');
  }

  const dataProvider = new RealDataProvider({
    finnhubApiKey,
    enableCache: true,
  });

  // Get tickers to screen
  let tickersToScreen: { ticker: string; sector: string }[] = [];

  if (sector) {
    // Filter to specific sector
    const sectorKey = Object.keys(STOCK_UNIVERSE).find(
      s => s.toLowerCase().includes(sector.toLowerCase())
    );
    if (sectorKey) {
      tickersToScreen = STOCK_UNIVERSE[sectorKey].map(t => ({ ticker: t, sector: sectorKey }));
    } else {
      throw new Error(`Unknown sector: ${sector}. Available: ${Object.keys(STOCK_UNIVERSE).join(', ')}`);
    }
  } else {
    // Use all sectors but limit stocks per sector to respect rate limits
    // Finnhub free tier: 60 calls/min, we make 3 calls per stock
    // So max ~20 stocks/minute, use 2 per sector for 10 sectors = 20 stocks
    const stocksPerSector = type === 'sectors' ? 2 : 2;
    for (const [sectorName, tickers] of Object.entries(STOCK_UNIVERSE)) {
      for (const ticker of tickers.slice(0, stocksPerSector)) {
        tickersToScreen.push({ ticker, sector: sectorName });
      }
    }
  }

  // Fetch data and score
  const results: ScreenResult[] = [];
  let processed = 0;

  for (const { ticker, sector: stockSector } of tickersToScreen) {
    processed++;

    try {
      const [quote, profile, financials] = await Promise.all([
        dataProvider.getQuote(ticker),
        dataProvider.getProfile(ticker),
        dataProvider.getFinancials(ticker),
      ]);

      const metrics = extractMetrics(type, financials, quote);
      const score = calculateScore(type, metrics);
      const verdict = score >= 75 ? 'BUY' : score >= 50 ? 'HOLD' : 'AVOID';

      results.push({
        ticker,
        name: profile.name || ticker,
        sector: stockSector,
        price: quote.price,
        score,
        metrics,
        verdict,
      });

      // Delay to respect rate limits (60 calls/min = 1 call/sec, 3 calls per stock)
      await new Promise(resolve => setTimeout(resolve, 3100));
    } catch (err) {
      // Skip stocks with data issues (suppress stack traces)
      const msg = err instanceof Error ? err.message : 'data unavailable';
      if (!msg.includes('Rate limit')) {
        console.error(gray(`  Skipping ${ticker}: ${msg}`));
      }
      // Wait longer after rate limit hits
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Sort by score and limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// =============================================================================
// Metrics Extraction
// =============================================================================

function extractMetrics(
  type: ScreenType,
  financials: FinancialsData,
  quote: QuoteData
): Record<string, number | string> {
  // Note: FinancialsData has percentages in decimal form (0.025 = 2.5%)
  // Multiply by 100 when displaying as percentages

  switch (type) {
    case 'growth':
      return {
        // Revenue/earnings growth in percentage form for display
        revenueGrowth: (financials.revenueGrowth ?? 0) * 100,
        epsGrowth: (financials.earningsGrowth ?? 0) * 100,
        pe: financials.peRatio ?? 0,
        roe: (financials.roe ?? 0) * 100,
      };

    case 'value':
      return {
        pe: financials.peRatio ?? 0,
        pb: financials.pbRatio ?? 0,
        // Dividend yield as percentage for display
        divYield: (financials.dividendYield ?? 0) * 100,
        roe: (financials.roe ?? 0) * 100,
        currentRatio: financials.currentRatio ?? 0,
      };

    case 'sectors':
      return {
        // No 52-week return in FinancialsData, use 0 for now
        // Could calculate from price history if needed
        return52w: 0,
        beta: financials.beta ?? 1,
        pe: financials.peRatio ?? 0,
        netMargin: (financials.netProfitMargin ?? 0) * 100,
      };

    case 'dividend':
      return {
        // Dividend yield as percentage for display
        divYield: (financials.dividendYield ?? 0) * 100,
        // Payout ratio as percentage for display
        payoutRatio: (financials.payoutRatio ?? 0) * 100,
        pe: financials.peRatio ?? 0,
        roe: (financials.roe ?? 0) * 100,
      };

    default:
      return {};
  }
}

// =============================================================================
// Scoring
// =============================================================================

function calculateScore(type: ScreenType, metrics: Record<string, number | string>): number {
  let score = 50; // Base score

  switch (type) {
    case 'growth':
      // High revenue growth is good
      const revGrowth = Number(metrics.revenueGrowth) || 0;
      if (revGrowth > 30) score += 20;
      else if (revGrowth > 15) score += 15;
      else if (revGrowth > 5) score += 10;
      else if (revGrowth < 0) score -= 10;

      // High EPS growth is good
      const epsGrowth = Number(metrics.epsGrowth) || 0;
      if (epsGrowth > 30) score += 20;
      else if (epsGrowth > 15) score += 15;
      else if (epsGrowth > 5) score += 10;
      else if (epsGrowth < 0) score -= 10;

      // High ROE is good
      const roe = Number(metrics.roe) || 0;
      if (roe > 20) score += 10;
      else if (roe > 10) score += 5;
      break;

    case 'value':
      // Low P/E is good (but not too low)
      const pe = Number(metrics.pe) || 0;
      if (pe > 0 && pe < 15) score += 20;
      else if (pe >= 15 && pe < 25) score += 10;
      else if (pe >= 40) score -= 10;

      // Low P/B is good
      const pb = Number(metrics.pb) || 0;
      if (pb > 0 && pb < 2) score += 15;
      else if (pb >= 2 && pb < 4) score += 10;
      else if (pb >= 10) score -= 5;

      // Higher dividend yield is good
      const divYield = Number(metrics.divYield) || 0;
      if (divYield > 3) score += 15;
      else if (divYield > 1.5) score += 10;
      else if (divYield > 0.5) score += 5;
      break;

    case 'sectors':
      // Positive 52-week return is good
      const return52w = Number(metrics.return52w) || 0;
      if (return52w > 50) score += 25;
      else if (return52w > 20) score += 20;
      else if (return52w > 0) score += 10;
      else score -= 10;

      // Beta around 1 is neutral, lower is defensive
      const beta = Number(metrics.beta) || 1;
      if (beta < 0.8) score += 5; // Defensive
      else if (beta > 1.5) score -= 5; // High volatility
      break;

    case 'dividend':
      // Higher yield is better (up to a point)
      const yield_ = Number(metrics.divYield) || 0;
      if (yield_ > 5) score += 15; // But may be risky
      else if (yield_ > 3) score += 20;
      else if (yield_ > 2) score += 15;
      else if (yield_ > 1) score += 10;

      // Lower payout ratio is more sustainable
      const payout = Number(metrics.payoutRatio) || 0;
      if (payout > 0 && payout < 50) score += 15;
      else if (payout >= 50 && payout < 75) score += 10;
      else if (payout >= 100) score -= 10; // Unsustainable

      // Reasonable P/E is good
      const divPe = Number(metrics.pe) || 0;
      if (divPe > 0 && divPe < 20) score += 10;
      else if (divPe >= 20 && divPe < 30) score += 5;
      break;
  }

  return Math.max(0, Math.min(100, score));
}

// =============================================================================
// Output Formatting
// =============================================================================

function printScreenResults(
  results: ScreenResult[],
  config: typeof SCREEN_CONFIGS[ScreenType]
): void {
  const rows = results.map(result => {
    return config.columns.map(col => {
      switch (col.key) {
        case 'ticker':
          return bold(result.ticker);
        case 'name':
          return result.name.slice(0, 20);
        case 'sector':
          return result.sector.slice(0, 15);
        case 'price':
          return formatCurrency(result.price);
        case 'score':
          return colorScore(result.score);
        default:
          const value = result.metrics[col.key];
          if (typeof value === 'number') {
            if (col.key.includes('Growth') || col.key.includes('return') || col.key.includes('Yield') || col.key.includes('divYield')) {
              return colorPercent(value);
            }
            if (col.key === 'payoutRatio') {
              return `${value.toFixed(0)}%`;
            }
            return value.toFixed(2);
          }
          return String(value || '-');
      }
    });
  });

  console.log(table(
    config.columns.map(c => ({ header: c.header, width: c.width, align: c.align })),
    rows
  ));
}

function colorScore(score: number): string {
  if (score >= 80) return green(score.toString());
  if (score >= 60) return yellow(score.toString());
  return red(score.toString());
}
