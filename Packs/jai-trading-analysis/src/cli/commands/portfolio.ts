/**
 * Portfolio Command
 *
 * Show current portfolio positions and compliance status.
 */

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
  cyan,
  gray,
  bold,
  error,
  info,
  spinner,
  box,
} from '../format';

// =============================================================================
// Types
// =============================================================================

interface PortfolioOptions {
  detailed?: boolean;
  compliance?: boolean;
  json?: boolean;
}

interface Position {
  ticker: string;
  shares: number;
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  portfolioPercent: number;
  sector?: string;
  stopLossPrice?: number;
  targetPrice?: number;
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
  positions: Position[];
  compliance: ComplianceStatus;
  sectorAllocation: Array<{ sector: string; percent: number }>;
}

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
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // In production, this would load from jai-finance-core PortfolioStateManager
  return getMockPortfolio();
}

// =============================================================================
// Output Formatting
// =============================================================================

function printPortfolio(portfolio: PortfolioState, detailed?: boolean): void {
  const { summary, positions, compliance, sectorAllocation } = portfolio;

  // Summary box
  const pnlColor = summary.unrealizedPnL >= 0 ? green : red;
  const dayColor = summary.dayChange >= 0 ? green : red;

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
      console.log(`    Cost Basis:  ${formatCurrency(pos.avgCostBasis)}`);
      if (pos.stopLossPrice) {
        const stopDist = ((pos.currentPrice - pos.stopLossPrice) / pos.currentPrice) * 100;
        console.log(`    Stop Loss:   ${formatCurrency(pos.stopLossPrice)} (${stopDist.toFixed(1)}% away)`);
      }
      if (pos.targetPrice) {
        const targetDist = ((pos.targetPrice - pos.currentPrice) / pos.currentPrice) * 100;
        console.log(`    Target:      ${formatCurrency(pos.targetPrice)} (${targetDist.toFixed(1)}% to go)`);
      }
      if (pos.sector) {
        console.log(`    Sector:      ${pos.sector}`);
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
        ? `${compliance.maxPositionTicker} exceeds max position size`
        : 'All positions within limits',
    },
    {
      name: 'Sector Concentration',
      passed: !compliance.sectorConcentrationViolation,
      detail: compliance.concentratedSector
        ? `${compliance.concentratedSector} exceeds concentration limit`
        : 'Sector diversification OK',
    },
    {
      name: 'Cash Reserve',
      passed: !compliance.cashReserveViolation,
      detail: compliance.cashReserveViolation
        ? `Cash at ${compliance.cashPercent.toFixed(1)}%, below minimum`
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

// =============================================================================
// Mock Data (Replace with real portfolio in production)
// =============================================================================

function getMockPortfolio(): PortfolioState {
  const positions: Position[] = [
    {
      ticker: 'AAPL',
      shares: 50,
      avgCostBasis: 145.00,
      currentPrice: 195.20,
      marketValue: 9760.00,
      unrealizedPnL: 2510.00,
      unrealizedPnLPercent: 34.62,
      portfolioPercent: 19.5,
      sector: 'Technology',
      stopLossPrice: 175.50,
      targetPrice: 220.00,
    },
    {
      ticker: 'MSFT',
      shares: 25,
      avgCostBasis: 280.00,
      currentPrice: 425.30,
      marketValue: 10632.50,
      unrealizedPnL: 3632.50,
      unrealizedPnLPercent: 51.89,
      portfolioPercent: 21.3,
      sector: 'Technology',
      stopLossPrice: 391.00,
      targetPrice: 475.00,
    },
    {
      ticker: 'NVDA',
      shares: 10,
      avgCostBasis: 450.00,
      currentPrice: 875.50,
      marketValue: 8755.00,
      unrealizedPnL: 4255.00,
      unrealizedPnLPercent: 94.56,
      portfolioPercent: 17.5,
      sector: 'Technology',
      stopLossPrice: 805.00,
      targetPrice: 1000.00,
    },
    {
      ticker: 'JNJ',
      shares: 40,
      avgCostBasis: 165.00,
      currentPrice: 158.40,
      marketValue: 6336.00,
      unrealizedPnL: -264.00,
      unrealizedPnLPercent: -4.00,
      portfolioPercent: 12.7,
      sector: 'Healthcare',
      stopLossPrice: 151.80,
      targetPrice: 180.00,
    },
    {
      ticker: 'JPM',
      shares: 30,
      avgCostBasis: 155.00,
      currentPrice: 198.40,
      marketValue: 5952.00,
      unrealizedPnL: 1302.00,
      unrealizedPnLPercent: 28.00,
      portfolioPercent: 11.9,
      sector: 'Financials',
      stopLossPrice: 182.00,
      targetPrice: 220.00,
    },
  ];

  const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0) + 8564.50;
  const totalCost = positions.reduce((sum, p) => sum + (p.avgCostBasis * p.shares), 0);

  return {
    summary: {
      totalValue,
      totalCost,
      unrealizedPnL: totalValue - totalCost - 8564.50,
      unrealizedPnLPercent: ((totalValue - totalCost - 8564.50) / totalCost) * 100,
      cashAvailable: 8564.50,
      dayChange: 245.30,
      dayChangePercent: 0.49,
    },
    positions,
    compliance: {
      maxPositionViolation: false,
      sectorConcentrationViolation: true,
      concentratedSector: 'Technology (58.3%)',
      cashReserveViolation: false,
      cashPercent: 17.1,
    },
    sectorAllocation: [
      { sector: 'Technology', percent: 58.3 },
      { sector: 'Healthcare', percent: 12.7 },
      { sector: 'Financials', percent: 11.9 },
      { sector: 'Cash', percent: 17.1 },
    ],
  };
}
