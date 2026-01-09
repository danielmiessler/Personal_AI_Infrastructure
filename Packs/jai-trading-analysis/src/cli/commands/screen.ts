/**
 * Screen Command
 *
 * Screen stocks by strategy (growth, value, sectors, dividend).
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
  spinner,
} from '../format';

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
      { header: '1M Ret', key: 'return1m', width: 10, align: 'right' },
      { header: 'RS Rank', key: 'rsRank', width: 8, align: 'right' },
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
      { header: 'Yrs Grw', key: 'divGrowthYears', width: 8, align: 'right' },
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

  const loading = spinner('Running screen...');

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
    console.log(gray(`Showing ${results.length} of ${results.length} results`));
    console.log(gray('Run "jai analyze <ticker>" for detailed analysis'));
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
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // In production, this would call the actual screener modules
  // For now, return mock data
  let results = getMockResults(type);

  if (sector) {
    results = results.filter(r => r.sector.toLowerCase().includes(sector.toLowerCase()));
  }

  return results.slice(0, limit);
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
          return result.sector;
        case 'price':
          return formatCurrency(result.price);
        case 'score':
          return colorScore(result.score);
        default:
          const value = result.metrics[col.key];
          if (typeof value === 'number') {
            if (col.key.includes('Growth') || col.key.includes('return') || col.key.includes('Yield')) {
              return colorPercent(value);
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

// =============================================================================
// Mock Data (Replace with real screener in production)
// =============================================================================

function getMockResults(type: ScreenType): ScreenResult[] {
  const mockStocks: ScreenResult[] = [
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      sector: 'Technology',
      price: 875.50,
      score: 92,
      metrics: {
        revenueGrowth: 122.4,
        epsGrowth: 486.3,
        pe: 65.2,
        pb: 42.1,
        divYield: 0.02,
        return1m: 15.3,
        rsRank: 99,
        payoutRatio: 1.2,
        divGrowthYears: 1,
      },
      verdict: 'BUY',
    },
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Technology',
      price: 195.20,
      score: 85,
      metrics: {
        revenueGrowth: -2.8,
        epsGrowth: 10.6,
        pe: 29.8,
        pb: 45.2,
        divYield: 0.51,
        return1m: 3.2,
        rsRank: 85,
        payoutRatio: 15.4,
        divGrowthYears: 12,
      },
      verdict: 'HOLD',
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Technology',
      price: 425.30,
      score: 88,
      metrics: {
        revenueGrowth: 17.6,
        epsGrowth: 21.8,
        pe: 36.5,
        pb: 12.8,
        divYield: 0.72,
        return1m: 5.6,
        rsRank: 90,
        payoutRatio: 26.4,
        divGrowthYears: 20,
      },
      verdict: 'BUY',
    },
    {
      ticker: 'JNJ',
      name: 'Johnson & Johnson',
      sector: 'Healthcare',
      price: 158.40,
      score: 75,
      metrics: {
        revenueGrowth: 4.3,
        epsGrowth: 12.1,
        pe: 15.2,
        pb: 5.8,
        divYield: 2.95,
        return1m: -1.2,
        rsRank: 45,
        payoutRatio: 44.8,
        divGrowthYears: 62,
      },
      verdict: 'HOLD',
    },
    {
      ticker: 'XOM',
      name: 'Exxon Mobil Corp',
      sector: 'Energy',
      price: 115.80,
      score: 72,
      metrics: {
        revenueGrowth: -12.4,
        epsGrowth: -25.3,
        pe: 12.8,
        pb: 2.1,
        divYield: 3.22,
        return1m: -3.5,
        rsRank: 35,
        payoutRatio: 41.2,
        divGrowthYears: 41,
      },
      verdict: 'HOLD',
    },
    {
      ticker: 'COST',
      name: 'Costco Wholesale',
      sector: 'Consumer Staples',
      price: 725.60,
      score: 82,
      metrics: {
        revenueGrowth: 6.2,
        epsGrowth: 9.8,
        pe: 48.2,
        pb: 14.5,
        divYield: 0.58,
        return1m: 7.8,
        rsRank: 88,
        payoutRatio: 27.8,
        divGrowthYears: 19,
      },
      verdict: 'BUY',
    },
    {
      ticker: 'JPM',
      name: 'JPMorgan Chase',
      sector: 'Financials',
      price: 198.40,
      score: 79,
      metrics: {
        revenueGrowth: 12.5,
        epsGrowth: 35.2,
        pe: 11.5,
        pb: 1.8,
        divYield: 2.32,
        return1m: 4.2,
        rsRank: 78,
        payoutRatio: 26.5,
        divGrowthYears: 14,
      },
      verdict: 'BUY',
    },
    {
      ticker: 'PG',
      name: 'Procter & Gamble',
      sector: 'Consumer Staples',
      price: 162.30,
      score: 74,
      metrics: {
        revenueGrowth: 2.8,
        epsGrowth: 6.4,
        pe: 26.8,
        pb: 7.5,
        divYield: 2.42,
        return1m: 0.8,
        rsRank: 52,
        payoutRatio: 64.2,
        divGrowthYears: 68,
      },
      verdict: 'HOLD',
    },
  ];

  // Sort by score for all screen types
  return mockStocks.sort((a, b) => b.score - a.score);
}
