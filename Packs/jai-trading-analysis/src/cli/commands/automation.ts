/**
 * Automation Commands
 *
 * Morning brief and watchlist management.
 */

import {
  header,
  subheader,
  colorPercent,
  colorPnL,
  formatCurrency,
  green,
  red,
  yellow,
  cyan,
  gray,
  bold,
  error,
  info,
  success,
  spinner,
} from '../format';

// =============================================================================
// Types
// =============================================================================

interface BriefOptions {
  send?: boolean;
  json?: boolean;
}

interface MorningBrief {
  date: string;
  summary: string;
  portfolioSummary: {
    totalValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
    dayChange: number;
    dayChangePercent: number;
    cashAvailable: number;
  };
  positions: Array<{
    ticker: string;
    currentPrice: number;
    marketValue: number;
    unrealizedPnLPercent: number;
    alerts: string[];
  }>;
  alerts: Array<{
    type: string;
    ticker: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
  opportunities: Array<{
    ticker: string;
    currentPrice: number;
    reason: string;
    confidence: string;
  }>;
  marketOverview: {
    sp500: { price: number; changePercent: number };
    nasdaq: { price: number; changePercent: number };
    vix: { value: number };
    sentiment: string;
  };
}

interface Watchlist {
  tickers: string[];
  lastUpdated: string;
}

// =============================================================================
// Brief Command
// =============================================================================

export async function briefCommand(options: BriefOptions): Promise<void> {
  console.log(header('Morning Brief'));
  console.log('');

  const loading = spinner('Generating brief...');

  try {
    const brief = await generateBrief();
    loading.stop();

    if (options.json) {
      console.log(JSON.stringify(brief, null, 2));
      return;
    }

    printBrief(brief);

    if (options.send) {
      console.log('');
      const sendLoading = spinner('Sending to Discord...');
      await sendBriefToDiscord(brief);
      sendLoading.stop();
      success('Brief sent to Discord');
    }
  } catch (err) {
    loading.stop();
    error(`Brief generation failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function generateBrief(): Promise<MorningBrief> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // In production, this calls generateMorningBrief from automation module
  return getMockBrief();
}

function printBrief(brief: MorningBrief): void {
  const date = new Date(brief.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  console.log(gray(date));
  console.log('');

  // Summary
  console.log(bold('Summary'));
  console.log(brief.summary);
  console.log('');

  // Market Overview
  console.log(subheader('Market Overview'));
  const mo = brief.marketOverview;
  console.log(`  S&P 500:   ${formatCurrency(mo.sp500.price)} ${colorPercent(mo.sp500.changePercent)}`);
  console.log(`  NASDAQ:    ${formatCurrency(mo.nasdaq.price)} ${colorPercent(mo.nasdaq.changePercent)}`);
  console.log(`  VIX:       ${mo.vix.value.toFixed(2)}`);
  console.log(`  Sentiment: ${mo.sentiment.toUpperCase()}`);
  console.log('');

  // Portfolio Summary
  console.log(subheader('Portfolio'));
  const ps = brief.portfolioSummary;
  console.log(`  Value:     ${formatCurrency(ps.totalValue)}`);
  console.log(`  P&L:       ${colorPnL(ps.unrealizedPnL)} (${colorPercent(ps.unrealizedPnLPercent)})`);
  console.log(`  Today:     ${colorPnL(ps.dayChange)} (${colorPercent(ps.dayChangePercent)})`);
  console.log(`  Cash:      ${formatCurrency(ps.cashAvailable)}`);
  console.log('');

  // Alerts
  if (brief.alerts.length > 0) {
    console.log(subheader('Alerts'));
    for (const alert of brief.alerts) {
      const icon = alert.severity === 'critical' ? red('[!!]') :
                   alert.severity === 'warning' ? yellow('[!]') : cyan('[i]');
      console.log(`  ${icon} ${bold(alert.ticker)}: ${alert.message}`);
    }
    console.log('');
  }

  // Position Summary
  console.log(subheader('Positions'));
  for (const pos of brief.positions) {
    const pnlColor = pos.unrealizedPnLPercent >= 0 ? green : red;
    const alerts = pos.alerts.length > 0 ? ` ${yellow('[')}${pos.alerts.join(', ')}${yellow(']')}` : '';
    console.log(`  ${bold(pos.ticker.padEnd(6))} ${formatCurrency(pos.marketValue).padStart(10)} ${pnlColor(colorPercent(pos.unrealizedPnLPercent).padStart(8))}${alerts}`);
  }
  console.log('');

  // Opportunities
  if (brief.opportunities.length > 0) {
    console.log(subheader('Opportunities'));
    for (const opp of brief.opportunities) {
      console.log(`  ${bold(opp.ticker)}: ${formatCurrency(opp.currentPrice)} - ${opp.reason}`);
      console.log(`    Confidence: ${opp.confidence}`);
    }
    console.log('');
  }

  console.log(gray(`Generated: ${new Date().toLocaleTimeString()}`));
}

async function sendBriefToDiscord(_brief: MorningBrief): Promise<void> {
  // Simulate send delay
  await new Promise(resolve => setTimeout(resolve, 500));
  // In production, this calls DiscordNotifier
}

// =============================================================================
// Watchlist Command
// =============================================================================

export async function watchlistCommand(
  action?: string,
  ticker?: string
): Promise<void> {
  const normalizedAction = (action || 'show').toLowerCase();

  switch (normalizedAction) {
    case 'show':
      await showWatchlist();
      break;
    case 'add':
      if (!ticker) {
        error('Ticker required for add action');
        console.log(gray('Usage: jai watchlist add <ticker>'));
        process.exit(1);
      }
      await addToWatchlist(ticker.toUpperCase());
      break;
    case 'remove':
      if (!ticker) {
        error('Ticker required for remove action');
        console.log(gray('Usage: jai watchlist remove <ticker>'));
        process.exit(1);
      }
      await removeFromWatchlist(ticker.toUpperCase());
      break;
    default:
      error(`Unknown action: ${action}`);
      console.log(gray('Available actions: show, add, remove'));
      process.exit(1);
  }
}

async function showWatchlist(): Promise<void> {
  console.log(header('Watchlist'));
  console.log('');

  const loading = spinner('Loading watchlist...');

  try {
    const watchlist = await loadWatchlist();
    loading.stop();

    if (watchlist.tickers.length === 0) {
      info('Watchlist is empty');
      console.log(gray('Add tickers with: jai watchlist add <ticker>'));
      return;
    }

    // Get current prices
    const quotes = await getMockQuotes(watchlist.tickers);

    console.log(`  ${bold('Ticker'.padEnd(8))}  ${bold('Price'.padStart(10))}  ${bold('Change'.padStart(10))}`);
    console.log(`  ${'-'.repeat(8)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}`);

    for (const ticker of watchlist.tickers) {
      const quote = quotes[ticker];
      if (quote) {
        console.log(`  ${cyan(ticker.padEnd(8))}  ${formatCurrency(quote.price).padStart(10)}  ${colorPercent(quote.changePercent).padStart(10)}`);
      } else {
        console.log(`  ${cyan(ticker.padEnd(8))}  ${gray('N/A').padStart(10)}  ${gray('N/A').padStart(10)}`);
      }
    }

    console.log('');
    console.log(gray(`${watchlist.tickers.length} ticker(s) | Last updated: ${watchlist.lastUpdated}`));
  } catch (err) {
    loading.stop();
    error(`Failed to load watchlist: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function addToWatchlist(ticker: string): Promise<void> {
  const loading = spinner(`Adding ${ticker} to watchlist...`);

  try {
    const watchlist = await loadWatchlist();

    if (watchlist.tickers.includes(ticker)) {
      loading.stop();
      info(`${ticker} is already in watchlist`);
      return;
    }

    watchlist.tickers.push(ticker);
    watchlist.lastUpdated = new Date().toISOString();

    await saveWatchlist(watchlist);
    loading.stop();

    success(`Added ${ticker} to watchlist`);
  } catch (err) {
    loading.stop();
    error(`Failed to add to watchlist: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function removeFromWatchlist(ticker: string): Promise<void> {
  const loading = spinner(`Removing ${ticker} from watchlist...`);

  try {
    const watchlist = await loadWatchlist();

    const index = watchlist.tickers.indexOf(ticker);
    if (index === -1) {
      loading.stop();
      info(`${ticker} is not in watchlist`);
      return;
    }

    watchlist.tickers.splice(index, 1);
    watchlist.lastUpdated = new Date().toISOString();

    await saveWatchlist(watchlist);
    loading.stop();

    success(`Removed ${ticker} from watchlist`);
  } catch (err) {
    loading.stop();
    error(`Failed to remove from watchlist: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function loadWatchlist(): Promise<Watchlist> {
  // In production, this loads from file
  // For now, return mock data
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    tickers: ['GOOGL', 'AMZN', 'META', 'AMD', 'CRM'],
    lastUpdated: new Date().toISOString(),
  };
}

async function saveWatchlist(_watchlist: Watchlist): Promise<void> {
  // In production, this saves to file
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function getMockQuotes(tickers: string[]): Promise<Record<string, { price: number; changePercent: number }>> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const quotes: Record<string, { price: number; changePercent: number }> = {};
  for (const ticker of tickers) {
    quotes[ticker] = {
      price: 100 + (ticker.charCodeAt(0) * 2),
      changePercent: ((ticker.charCodeAt(0) % 10) - 5) / 2,
    };
  }
  return quotes;
}

// =============================================================================
// Mock Data
// =============================================================================

function getMockBrief(): MorningBrief {
  return {
    date: new Date().toISOString().split('T')[0],
    summary: 'Portfolio is up $11,435.50 (+28.3%). Markets are mixed today with tech leading. 1 position near target price. No critical alerts.',
    portfolioSummary: {
      totalValue: 50000.00,
      unrealizedPnL: 11435.50,
      unrealizedPnLPercent: 28.3,
      dayChange: 245.30,
      dayChangePercent: 0.49,
      cashAvailable: 8564.50,
    },
    positions: [
      { ticker: 'AAPL', currentPrice: 195.20, marketValue: 9760.00, unrealizedPnLPercent: 34.6, alerts: [] },
      { ticker: 'MSFT', currentPrice: 425.30, marketValue: 10632.50, unrealizedPnLPercent: 51.9, alerts: ['Near target'] },
      { ticker: 'NVDA', currentPrice: 875.50, marketValue: 8755.00, unrealizedPnLPercent: 94.6, alerts: [] },
      { ticker: 'JNJ', currentPrice: 158.40, marketValue: 6336.00, unrealizedPnLPercent: -4.0, alerts: [] },
      { ticker: 'JPM', currentPrice: 198.40, marketValue: 5952.00, unrealizedPnLPercent: 28.0, alerts: [] },
    ],
    alerts: [
      { type: 'INFO', ticker: 'MSFT', message: 'Approaching target price (+51.9%)', severity: 'info' },
      { type: 'WARNING', ticker: 'PORTFOLIO', message: 'Tech sector concentration at 58%', severity: 'warning' },
    ],
    opportunities: [
      { ticker: 'GOOGL', currentPrice: 142.50, reason: 'Trading below 50-day MA', confidence: 'medium' },
    ],
    marketOverview: {
      sp500: { price: 5024.12, changePercent: 0.32 },
      nasdaq: { price: 15892.45, changePercent: 0.58 },
      vix: { value: 14.25 },
      sentiment: 'bullish',
    },
  };
}
