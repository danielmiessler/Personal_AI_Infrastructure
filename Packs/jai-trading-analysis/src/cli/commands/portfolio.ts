/**
 * Portfolio Command
 *
 * Show current portfolio positions and compliance status.
 * Reads from ~/.config/jai/positions.json and fetches live prices.
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import {
  header,
  subheader,
  table,
  colorPercent,
  colorPnL,
  formatCurrency,
  green,
  red,
  yellow,
  gray,
  bold,
  error,
  spinner,
} from '../format';
import { RealDataProvider } from '../../analysis/data-provider';

// =============================================================================
// Types
// =============================================================================

interface PortfolioOptions {
  detailed?: boolean;
  compliance?: boolean;
  json?: boolean;
}

interface TaxLot {
  id: string;
  shares: number;
  costBasis: number;
  purchaseDate: string;
}

interface StoredPosition {
  ticker: string;
  shares: number;
  avgCostBasis: number;
  totalCost: number;
  openedAt: string;
  sector?: string;
  taxLots: TaxLot[];
}

interface PositionsFile {
  version: number;
  lastUpdated: string;
  cashBalance: number;
  positions: StoredPosition[];
}

interface PositionWithValue extends StoredPosition {
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  portfolioPercent: number;
  dayChange?: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  cashAvailable: number;
  dayChange: number;
  dayChangePercent: number;
}

interface SectorAllocation {
  sector: string;
  value: number;
  percent: number;
}

interface ComplianceStatus {
  maxPositionViolation: boolean;
  maxPositionTicker?: string;
  sectorConcentrationViolation: boolean;
  concentratedSector?: string;
  cashReserveViolation: boolean;
  cashPercent: number;
}

interface PortfolioState {
  summary: PortfolioSummary;
  positions: PositionWithValue[];
  compliance: ComplianceStatus;
  sectorAllocation: SectorAllocation[];
}

// =============================================================================
// Configuration
// =============================================================================

const CONFIG_DIR = join(homedir(), '.config', 'jai');
const POSITIONS_FILE = join(CONFIG_DIR, 'positions.json');

// Compliance thresholds
const MAX_POSITION_PERCENT = 0.25; // 25%
const MAX_SECTOR_PERCENT = 0.40;   // 40%
const MIN_CASH_RESERVE = 0.05;     // 5%

// =============================================================================
// Command Implementation
// =============================================================================

export async function portfolioCommand(options: PortfolioOptions): Promise<void> {
  const loading = spinner('Loading portfolio...');

  try {
    const portfolio = await loadPortfolio();
    loading.stop();

    if (options.json) {
      console.log(JSON.stringify(portfolio, null, 2));
      return;
    }

    if (options.compliance) {
      printComplianceOnly(portfolio.compliance);
      return;
    }

    printPortfolio(portfolio, options.detailed);
  } catch (err) {
    loading.stop();
    error(`Failed to load portfolio: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// =============================================================================
// Portfolio Loading
// =============================================================================

async function loadPortfolio(): Promise<PortfolioState> {
  // Check for positions file
  if (!existsSync(POSITIONS_FILE)) {
    throw new Error(
      `Positions file not found: ${POSITIONS_FILE}\n` +
      `Create it with your positions or run: jsa portfolio --init`
    );
  }

  // Read positions file
  const content = await Bun.file(POSITIONS_FILE).text();
  const positionsFile: PositionsFile = JSON.parse(content);

  if (positionsFile.positions.length === 0) {
    throw new Error('No positions in portfolio');
  }

  // Initialize data provider
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY not set. Run: source ~/.config/jai/load-secrets.sh');
  }

  const dataProvider = new RealDataProvider({
    finnhubApiKey,
    enableCache: true,
  });

  // Fetch current prices for all positions
  const tickers = positionsFile.positions.map(p => p.ticker);
  const prices = new Map<string, { price: number; change: number }>();

  for (const ticker of tickers) {
    try {
      const quote = await dataProvider.getQuote(ticker);
      prices.set(ticker, { price: quote.price, change: quote.change });
    } catch (err) {
      console.error(gray(`Warning: Could not fetch price for ${ticker}`));
      prices.set(ticker, { price: 0, change: 0 });
    }
  }

  // Calculate position values
  let totalMarketValue = 0;
  let totalCost = 0;
  let totalDayChange = 0;

  const positionsWithValue: PositionWithValue[] = [];

  for (const position of positionsFile.positions) {
    const priceData = prices.get(position.ticker) || { price: 0, change: 0 };
    const currentPrice = priceData.price;
    const marketValue = position.shares * currentPrice;
    const unrealizedPnL = marketValue - position.totalCost;
    const unrealizedPnLPercent = position.totalCost > 0
      ? (unrealizedPnL / position.totalCost) * 100
      : 0;
    const dayChange = position.shares * priceData.change;

    totalMarketValue += marketValue;
    totalCost += position.totalCost;
    totalDayChange += dayChange;

    positionsWithValue.push({
      ...position,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      portfolioPercent: 0, // Will calculate after totals
      dayChange,
    });
  }

  // Calculate portfolio percentages
  const cashBalance = positionsFile.cashBalance || 0;
  const totalPortfolioValue = totalMarketValue + cashBalance;

  for (const position of positionsWithValue) {
    position.portfolioPercent = totalPortfolioValue > 0
      ? (position.marketValue / totalPortfolioValue) * 100
      : 0;
  }

  // Calculate sector allocation
  const sectorAllocation = calculateSectorAllocation(positionsWithValue, totalPortfolioValue, cashBalance);

  // Calculate summary
  const unrealizedPnL = totalMarketValue - totalCost;
  const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;
  const dayChangePercent = (totalMarketValue - totalDayChange) > 0
    ? (totalDayChange / (totalMarketValue - totalDayChange)) * 100
    : 0;

  const summary: PortfolioSummary = {
    totalValue: totalPortfolioValue,
    totalCost,
    unrealizedPnL,
    unrealizedPnLPercent,
    cashAvailable: cashBalance,
    dayChange: totalDayChange,
    dayChangePercent,
  };

  // Check compliance
  const compliance = checkCompliance(positionsWithValue, sectorAllocation, cashBalance, totalPortfolioValue);

  return {
    summary,
    positions: positionsWithValue,
    compliance,
    sectorAllocation,
  };
}

function calculateSectorAllocation(
  positions: PositionWithValue[],
  totalValue: number,
  cashBalance: number
): SectorAllocation[] {
  const sectorMap = new Map<string, number>();

  for (const position of positions) {
    const sector = position.sector || 'Unknown';
    const current = sectorMap.get(sector) || 0;
    sectorMap.set(sector, current + position.marketValue);
  }

  const allocations: SectorAllocation[] = [];

  for (const [sector, value] of sectorMap) {
    allocations.push({
      sector,
      value,
      percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    });
  }

  // Add cash as a "sector"
  if (cashBalance > 0) {
    allocations.push({
      sector: 'Cash',
      value: cashBalance,
      percent: totalValue > 0 ? (cashBalance / totalValue) * 100 : 0,
    });
  }

  return allocations.sort((a, b) => b.value - a.value);
}

function checkCompliance(
  positions: PositionWithValue[],
  sectorAllocation: SectorAllocation[],
  cashBalance: number,
  totalValue: number
): ComplianceStatus {
  // Check max position size
  let maxPositionViolation = false;
  let maxPositionTicker: string | undefined;

  for (const position of positions) {
    if (position.portfolioPercent / 100 > MAX_POSITION_PERCENT) {
      maxPositionViolation = true;
      maxPositionTicker = position.ticker;
      break;
    }
  }

  // Check sector concentration (excluding cash)
  let sectorConcentrationViolation = false;
  let concentratedSector: string | undefined;

  for (const allocation of sectorAllocation) {
    if (allocation.sector !== 'Cash' && allocation.percent / 100 > MAX_SECTOR_PERCENT) {
      sectorConcentrationViolation = true;
      concentratedSector = `${allocation.sector} (${allocation.percent.toFixed(1)}%)`;
      break;
    }
  }

  // Check cash reserve
  const cashPercent = totalValue > 0 ? (cashBalance / totalValue) * 100 : 100;
  const cashReserveViolation = cashPercent / 100 < MIN_CASH_RESERVE;

  return {
    maxPositionViolation,
    maxPositionTicker,
    sectorConcentrationViolation,
    concentratedSector,
    cashReserveViolation,
    cashPercent,
  };
}

// =============================================================================
// Output Formatting
// =============================================================================

function printPortfolio(portfolio: PortfolioState, detailed?: boolean): void {
  const { summary, positions, compliance, sectorAllocation } = portfolio;

  // Summary box
  console.log(header('Portfolio Summary'));
  console.log('');
  console.log(`  Total Value:     ${bold(formatCurrency(summary.totalValue))}`);
  console.log(`  Total Cost:      ${formatCurrency(summary.totalCost)}`);
  console.log(`  Unrealized P&L:  ${colorPnL(summary.unrealizedPnL)} (${colorPercent(summary.unrealizedPnLPercent)})`);
  console.log(`  Day Change:      ${colorPnL(summary.dayChange)} (${colorPercent(summary.dayChangePercent)})`);
  console.log(`  Cash Available:  ${formatCurrency(summary.cashAvailable)}`);
  console.log('');

  // Positions table
  console.log(subheader('Positions'));

  const rows = positions.map(pos => [
    bold(pos.ticker),
    pos.shares.toString(),
    formatCurrency(pos.currentPrice),
    formatCurrency(pos.marketValue),
    colorPnL(pos.unrealizedPnL),
    colorPercent(pos.unrealizedPnLPercent),
    `${pos.portfolioPercent.toFixed(1)}%`,
  ]);

  console.log(table(
    [
      { header: 'Ticker', width: 8 },
      { header: 'Shares', width: 8, align: 'right' },
      { header: 'Price', width: 10, align: 'right' },
      { header: 'Value', width: 12, align: 'right' },
      { header: 'P&L', width: 12, align: 'right' },
      { header: 'P&L %', width: 10, align: 'right' },
      { header: 'Weight', width: 8, align: 'right' },
    ],
    rows
  ));

  if (detailed) {
    // Sector allocation
    console.log(subheader('Sector Allocation'));

    for (const sector of sectorAllocation) {
      const bar = '='.repeat(Math.round(sector.percent / 2));
      const color = sector.percent > 30 ? yellow : gray;
      console.log(`  ${sector.sector.padEnd(20)} ${color(bar)} ${sector.percent.toFixed(1)}%`);
    }

    // Position details
    console.log(subheader('Position Details'));

    for (const pos of positions) {
      console.log(`  ${bold(pos.ticker)}`);
      console.log(`    Cost Basis:  ${formatCurrency(pos.avgCostBasis)} per share`);
      console.log(`    Total Cost:  ${formatCurrency(pos.totalCost)}`);
      console.log(`    Opened:      ${pos.openedAt}`);
      if (pos.sector) {
        console.log(`    Sector:      ${pos.sector}`);
      }
      if (pos.taxLots && pos.taxLots.length > 1) {
        console.log(`    Tax Lots:    ${pos.taxLots.length} lots`);
      }
      console.log('');
    }
  }

  // Compliance status
  printComplianceStatus(compliance);
}

function printComplianceStatus(compliance: ComplianceStatus): void {
  console.log(subheader('Compliance'));

  const checks = [
    {
      name: 'Position Size',
      passed: !compliance.maxPositionViolation,
      detail: compliance.maxPositionTicker
        ? `${compliance.maxPositionTicker} exceeds ${MAX_POSITION_PERCENT * 100}% limit`
        : 'All positions within limits',
    },
    {
      name: 'Sector Concentration',
      passed: !compliance.sectorConcentrationViolation,
      detail: compliance.concentratedSector
        ? `${compliance.concentratedSector} exceeds ${MAX_SECTOR_PERCENT * 100}% limit`
        : 'Sector diversification OK',
    },
    {
      name: 'Cash Reserve',
      passed: !compliance.cashReserveViolation,
      detail: compliance.cashReserveViolation
        ? `Cash at ${compliance.cashPercent.toFixed(1)}%, below ${MIN_CASH_RESERVE * 100}% minimum`
        : `Cash at ${compliance.cashPercent.toFixed(1)}%`,
    },
  ];

  for (const check of checks) {
    const icon = check.passed ? green('[OK]') : red('[!!]');
    const nameColor = check.passed ? gray : yellow;
    console.log(`  ${icon} ${nameColor(check.name.padEnd(20))} ${check.detail}`);
  }

  const allPassed = !compliance.maxPositionViolation &&
    !compliance.sectorConcentrationViolation &&
    !compliance.cashReserveViolation;

  console.log('');
  if (allPassed) {
    console.log(green('  All compliance checks passed'));
  } else {
    console.log(yellow('  Some compliance issues need attention'));
  }
}

function printComplianceOnly(compliance: ComplianceStatus): void {
  console.log(header('Compliance Status'));
  printComplianceStatus(compliance);
}
