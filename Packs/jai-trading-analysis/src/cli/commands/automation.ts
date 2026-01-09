/**
 * Automation Commands
 *
 * Morning brief and watchlist management.
 * Uses real portfolio data and market prices.
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
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
import { RealDataProvider } from '../../analysis/data-provider';

// =============================================================================
// Configuration
// =============================================================================

const CONFIG_DIR = join(homedir(), '.config', 'jai');
const POSITIONS_FILE = join(CONFIG_DIR, 'positions.json');
const WATCHLIST_FILE = join(CONFIG_DIR, 'watchlist.json');

// Market index tickers
const MARKET_TICKERS = {
  SP500: 'SPY',    // S&P 500 ETF proxy
  NASDAQ: 'QQQ',   // NASDAQ ETF proxy
  VIX: '^VIX',     // VIX (may not be available on Finnhub)
};

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

interface WatchlistFile {
  version: number;
  lastUpdated: string;
  tickers: string[];
}

interface PositionsFile {
  version: number;
  lastUpdated: string;
  cashBalance: number;
  positions: Array<{
    ticker: string;
    shares: number;
    avgCostBasis: number;
    totalCost: number;
    sector?: string;
  }>;
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
  // Initialize data provider
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY not set. Run: source ~/.config/jai/load-secrets.sh');
  }

  const dataProvider = new RealDataProvider({
    finnhubApiKey,
    enableCache: true,
  });

  // Load portfolio
  let portfolioSummary = {
    totalValue: 0,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    cashAvailable: 0,
  };

  const positions: MorningBrief['positions'] = [];
  const alerts: MorningBrief['alerts'] = [];
  let sectorConcentration = new Map<string, number>();

  if (existsSync(POSITIONS_FILE)) {
    const content = await Bun.file(POSITIONS_FILE).text();
    const positionsFile: PositionsFile = JSON.parse(content);

    let totalMarketValue = 0;
    let totalCost = 0;
    let totalDayChange = 0;

    for (const pos of positionsFile.positions) {
      try {
        const quote = await dataProvider.getQuote(pos.ticker);
        const marketValue = pos.shares * quote.price;
        const unrealizedPnL = marketValue - pos.totalCost;
        const unrealizedPnLPercent = pos.totalCost > 0 ? (unrealizedPnL / pos.totalCost) * 100 : 0;
        const dayChange = pos.shares * quote.change;

        totalMarketValue += marketValue;
        totalCost += pos.totalCost;
        totalDayChange += dayChange;

        // Track sector allocation
        const sector = pos.sector || 'Unknown';
        sectorConcentration.set(sector, (sectorConcentration.get(sector) || 0) + marketValue);

        // Generate position alerts
        const posAlerts: string[] = [];

        // Near target (>50% gain)
        if (unrealizedPnLPercent > 50) {
          posAlerts.push('Near target');
          alerts.push({
            type: 'INFO',
            ticker: pos.ticker,
            message: `Approaching target price (+${unrealizedPnLPercent.toFixed(1)}%)`,
            severity: 'info',
          });
        }

        // Stop loss triggered
        if (unrealizedPnLPercent < -8) {
          posAlerts.push('Stop loss');
          alerts.push({
            type: 'WARNING',
            ticker: pos.ticker,
            message: `Near stop loss (${unrealizedPnLPercent.toFixed(1)}%)`,
            severity: 'warning',
          });
        }

        positions.push({
          ticker: pos.ticker,
          currentPrice: quote.price,
          marketValue,
          unrealizedPnLPercent,
          alerts: posAlerts,
        });
      } catch (err) {
        // Skip position if quote fails
        console.error(gray(`Warning: Could not fetch quote for ${pos.ticker}`));
      }
    }

    const cashBalance = positionsFile.cashBalance || 0;
    const totalPortfolioValue = totalMarketValue + cashBalance;

    portfolioSummary = {
      totalValue: totalPortfolioValue,
      unrealizedPnL: totalMarketValue - totalCost,
      unrealizedPnLPercent: totalCost > 0 ? ((totalMarketValue - totalCost) / totalCost) * 100 : 0,
      dayChange: totalDayChange,
      dayChangePercent: (totalMarketValue - totalDayChange) > 0
        ? (totalDayChange / (totalMarketValue - totalDayChange)) * 100
        : 0,
      cashAvailable: cashBalance,
    };

    // Check sector concentration
    for (const [sector, value] of sectorConcentration) {
      const percent = (value / totalPortfolioValue) * 100;
      if (percent > 40) {
        alerts.push({
          type: 'WARNING',
          ticker: 'PORTFOLIO',
          message: `${sector} sector concentration at ${percent.toFixed(0)}%`,
          severity: 'warning',
        });
      }
    }
  }

  // Fetch market indices
  let marketOverview = {
    sp500: { price: 0, changePercent: 0 },
    nasdaq: { price: 0, changePercent: 0 },
    vix: { value: 0 },
    sentiment: 'neutral',
  };

  try {
    const spyQuote = await dataProvider.getQuote(MARKET_TICKERS.SP500);
    marketOverview.sp500 = { price: spyQuote.price, changePercent: spyQuote.changePercent };
  } catch {
    // SPY quote failed
  }

  try {
    const qqqQuote = await dataProvider.getQuote(MARKET_TICKERS.NASDAQ);
    marketOverview.nasdaq = { price: qqqQuote.price, changePercent: qqqQuote.changePercent };
  } catch {
    // QQQ quote failed
  }

  // Determine sentiment
  const avgChange = (marketOverview.sp500.changePercent + marketOverview.nasdaq.changePercent) / 2;
  if (avgChange > 1) {
    marketOverview.sentiment = 'bullish';
  } else if (avgChange < -1) {
    marketOverview.sentiment = 'bearish';
  } else {
    marketOverview.sentiment = 'neutral';
  }

  // Generate opportunities from watchlist
  const opportunities: MorningBrief['opportunities'] = [];

  if (existsSync(WATCHLIST_FILE)) {
    try {
      const watchlistContent = await Bun.file(WATCHLIST_FILE).text();
      const watchlist: WatchlistFile = JSON.parse(watchlistContent);

      for (const ticker of watchlist.tickers.slice(0, 3)) { // Limit to 3
        try {
          const quote = await dataProvider.getQuote(ticker);
          // Simple opportunity: positive change
          if (quote.changePercent < -2) {
            opportunities.push({
              ticker,
              currentPrice: quote.price,
              reason: `Down ${quote.changePercent.toFixed(1)}% today - potential dip buy`,
              confidence: 'medium',
            });
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Watchlist doesn't exist
    }
  }

  // Generate summary
  const pnlDirection = portfolioSummary.unrealizedPnL >= 0 ? 'up' : 'down';
  const alertCount = alerts.filter(a => a.severity === 'warning' || a.severity === 'critical').length;
  const summary = `Portfolio is ${pnlDirection} ${formatCurrency(Math.abs(portfolioSummary.unrealizedPnL))} (${portfolioSummary.unrealizedPnLPercent >= 0 ? '+' : ''}${portfolioSummary.unrealizedPnLPercent.toFixed(1)}%). ` +
    `Markets are ${marketOverview.sentiment}. ` +
    `${alertCount > 0 ? `${alertCount} alert(s) need attention.` : 'No critical alerts.'}`;

  return {
    date: new Date().toISOString().split('T')[0],
    summary,
    portfolioSummary,
    positions,
    alerts,
    opportunities,
    marketOverview,
  };
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
  console.log(`  S&P 500 (SPY): ${formatCurrency(mo.sp500.price)} ${colorPercent(mo.sp500.changePercent)}`);
  console.log(`  NASDAQ (QQQ):  ${formatCurrency(mo.nasdaq.price)} ${colorPercent(mo.nasdaq.changePercent)}`);
  console.log(`  Sentiment:     ${mo.sentiment.toUpperCase()}`);
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
  if (brief.positions.length > 0) {
    console.log(subheader('Positions'));
    for (const pos of brief.positions) {
      const pnlColor = pos.unrealizedPnLPercent >= 0 ? green : red;
      const alerts = pos.alerts.length > 0 ? ` ${yellow('[')}${pos.alerts.join(', ')}${yellow(']')}` : '';
      console.log(`  ${bold(pos.ticker.padEnd(6))} ${formatCurrency(pos.marketValue).padStart(10)} ${pnlColor(colorPercent(pos.unrealizedPnLPercent).padStart(8))}${alerts}`);
    }
    console.log('');
  }

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

async function sendBriefToDiscord(brief: MorningBrief): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL not set');
  }

  const embed = {
    title: `📊 Morning Brief - ${brief.date}`,
    description: brief.summary,
    color: brief.portfolioSummary.unrealizedPnL >= 0 ? 0x00ff00 : 0xff0000,
    fields: [
      {
        name: '💰 Portfolio',
        value: `Value: ${formatCurrency(brief.portfolioSummary.totalValue)}\nP&L: ${formatCurrency(brief.portfolioSummary.unrealizedPnL)} (${brief.portfolioSummary.unrealizedPnLPercent.toFixed(1)}%)`,
        inline: true,
      },
      {
        name: '📈 Market',
        value: `S&P 500: ${brief.marketOverview.sp500.changePercent.toFixed(2)}%\nNASDAQ: ${brief.marketOverview.nasdaq.changePercent.toFixed(2)}%`,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
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
        console.log(gray('Usage: jsa watchlist add <ticker>'));
        process.exit(1);
      }
      await addToWatchlist(ticker.toUpperCase());
      break;
    case 'remove':
      if (!ticker) {
        error('Ticker required for remove action');
        console.log(gray('Usage: jsa watchlist remove <ticker>'));
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
      console.log(gray('Add tickers with: jsa watchlist add <ticker>'));
      return;
    }

    // Initialize data provider
    const finnhubApiKey = process.env.FINNHUB_API_KEY;
    if (!finnhubApiKey) {
      throw new Error('FINNHUB_API_KEY not set');
    }

    const dataProvider = new RealDataProvider({
      finnhubApiKey,
      enableCache: true,
    });

    console.log(`  ${bold('Ticker'.padEnd(8))}  ${bold('Price'.padStart(10))}  ${bold('Change'.padStart(10))}`);
    console.log(`  ${'-'.repeat(8)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}`);

    for (const t of watchlist.tickers) {
      try {
        const quote = await dataProvider.getQuote(t);
        console.log(`  ${cyan(t.padEnd(8))}  ${formatCurrency(quote.price).padStart(10)}  ${colorPercent(quote.changePercent).padStart(10)}`);
      } catch {
        console.log(`  ${cyan(t.padEnd(8))}  ${gray('N/A').padStart(10)}  ${gray('N/A').padStart(10)}`);
      }
    }

    console.log('');
    console.log(gray(`${watchlist.tickers.length} ticker(s) | Last updated: ${new Date(watchlist.lastUpdated).toLocaleDateString()}`));
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

async function loadWatchlist(): Promise<WatchlistFile> {
  if (!existsSync(WATCHLIST_FILE)) {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      tickers: [],
    };
  }

  const content = await Bun.file(WATCHLIST_FILE).text();
  return JSON.parse(content);
}

async function saveWatchlist(watchlist: WatchlistFile): Promise<void> {
  await Bun.write(WATCHLIST_FILE, JSON.stringify(watchlist, null, 2));
}
