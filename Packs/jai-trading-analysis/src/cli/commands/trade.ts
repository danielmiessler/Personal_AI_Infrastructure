/**
 * Trade Commands
 *
 * Buy and sell recommendations with optional execution.
 */

import {
  header,
  subheader,
  colorVerdict,
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
  warn,
  spinner,
  box,
} from '../format';

// =============================================================================
// Types
// =============================================================================

interface BuyOptions {
  price?: string;
  execute?: boolean;
}

interface SellOptions {
  price?: string;
  execute?: boolean;
  method?: 'FIFO' | 'LIFO' | 'HIFO';
}

interface BuyRecommendation {
  ticker: string;
  currentPrice: number;
  recommendedPrice: number;
  shares: number;
  totalCost: number;
  verdict: string;
  reasons: string[];
  risks: string[];
  stopLossPrice: number;
  targetPrice: number;
}

interface SellRecommendation {
  ticker: string;
  currentPrice: number;
  shares: number;
  proceeds: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  holdingPeriod: string;
  taxImplication: string;
  verdict: string;
  reasons: string[];
  selectedLots: Array<{
    shares: number;
    costBasis: number;
    purchaseDate: string;
  }>;
}

// =============================================================================
// Buy Command
// =============================================================================

export async function buyCommand(
  ticker: string,
  amount: string,
  options: BuyOptions
): Promise<void> {
  const normalizedTicker = ticker.toUpperCase();

  console.log(header(`Buy Analysis: ${normalizedTicker}`));
  console.log('');

  const loading = spinner('Analyzing buy opportunity...');

  try {
    const recommendation = await analyzeBuy(normalizedTicker, amount, options.price);
    loading.stop();

    printBuyRecommendation(recommendation);

    if (options.execute) {
      console.log('');
      await executeBuy(recommendation);
    } else {
      console.log('');
      console.log(gray('Add --execute to place the order (paper trading)'));
    }
  } catch (err) {
    loading.stop();
    error(`Buy analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function analyzeBuy(
  ticker: string,
  amount: string,
  limitPrice?: string
): Promise<BuyRecommendation> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Parse amount
  const isDollarAmount = amount.startsWith('$');
  const numericAmount = parseFloat(amount.replace('$', '').replace(',', ''));

  // Mock current price
  const currentPrice = getMockPrice(ticker);
  const recommendedPrice = limitPrice ? parseFloat(limitPrice) : currentPrice;

  // Calculate shares
  const shares = isDollarAmount
    ? Math.floor(numericAmount / recommendedPrice)
    : numericAmount;
  const totalCost = shares * recommendedPrice;

  // Mock analysis
  return {
    ticker,
    currentPrice,
    recommendedPrice,
    shares,
    totalCost,
    verdict: getMockBuyVerdict(ticker),
    reasons: getMockBuyReasons(ticker),
    risks: getMockRisks(ticker),
    stopLossPrice: recommendedPrice * 0.92, // 8% stop loss
    targetPrice: recommendedPrice * 1.20, // 20% target
  };
}

function printBuyRecommendation(rec: BuyRecommendation): void {
  const verdictColor = colorVerdict(rec.verdict);

  console.log(`  Ticker:       ${bold(rec.ticker)}`);
  console.log(`  Verdict:      ${verdictColor}`);
  console.log('');
  console.log(`  Current:      ${formatCurrency(rec.currentPrice)}`);
  console.log(`  Buy At:       ${formatCurrency(rec.recommendedPrice)}`);
  console.log(`  Shares:       ${rec.shares}`);
  console.log(`  Total Cost:   ${formatCurrency(rec.totalCost)}`);
  console.log('');
  console.log(`  Stop Loss:    ${formatCurrency(rec.stopLossPrice)} ${gray('(-8%)')}`);
  console.log(`  Target:       ${formatCurrency(rec.targetPrice)} ${gray('(+20%)')}`);

  if (rec.reasons.length > 0) {
    console.log(subheader('Reasons to Buy'));
    for (const reason of rec.reasons) {
      console.log(`  ${green('+')} ${reason}`);
    }
  }

  if (rec.risks.length > 0) {
    console.log(subheader('Risk Factors'));
    for (const risk of rec.risks) {
      console.log(`  ${yellow('!')} ${risk}`);
    }
  }
}

async function executeBuy(rec: BuyRecommendation): Promise<void> {
  warn('PAPER TRADING MODE - No real order will be placed');
  console.log('');

  const loading = spinner('Placing order...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  loading.stop();

  console.log(green('Order placed successfully (paper)'));
  console.log(`  Order ID:     PAPER-${Date.now()}`);
  console.log(`  Action:       BUY`);
  console.log(`  Ticker:       ${rec.ticker}`);
  console.log(`  Shares:       ${rec.shares}`);
  console.log(`  Limit Price:  ${formatCurrency(rec.recommendedPrice)}`);
  console.log(`  Status:       ${yellow('PENDING')}`);
}

// =============================================================================
// Sell Command
// =============================================================================

export async function sellCommand(
  ticker: string,
  shares: string,
  options: SellOptions
): Promise<void> {
  const normalizedTicker = ticker.toUpperCase();
  const isAllShares = shares.toLowerCase() === 'all';
  const shareCount = isAllShares ? undefined : parseInt(shares, 10);

  console.log(header(`Sell Analysis: ${normalizedTicker}`));
  console.log('');

  const loading = spinner('Analyzing sell opportunity...');

  try {
    const recommendation = await analyzeSell(
      normalizedTicker,
      shareCount,
      options.method || 'FIFO',
      options.price
    );
    loading.stop();

    printSellRecommendation(recommendation);

    if (options.execute) {
      console.log('');
      await executeSell(recommendation);
    } else {
      console.log('');
      console.log(gray('Add --execute to place the order (paper trading)'));
    }
  } catch (err) {
    loading.stop();
    error(`Sell analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function analyzeSell(
  ticker: string,
  shareCount: number | undefined,
  method: 'FIFO' | 'LIFO' | 'HIFO',
  limitPrice?: string
): Promise<SellRecommendation> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock position data
  const position = getMockPosition(ticker);
  const shares = shareCount ?? position.shares;
  const currentPrice = limitPrice ? parseFloat(limitPrice) : position.currentPrice;

  // Calculate gains
  const proceeds = shares * currentPrice;
  const costBasis = shares * position.avgCostBasis;
  const gainLoss = proceeds - costBasis;
  const gainLossPercent = (gainLoss / costBasis) * 100;

  // Determine holding period
  const purchaseDate = new Date(position.purchaseDate);
  const now = new Date();
  const daysHeld = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const isLongTerm = daysHeld > 365;

  return {
    ticker,
    currentPrice,
    shares,
    proceeds,
    costBasis,
    gainLoss,
    gainLossPercent,
    holdingPeriod: isLongTerm ? 'Long-term (>1 year)' : `Short-term (${daysHeld} days)`,
    taxImplication: isLongTerm
      ? 'Long-term capital gains rate (0-20%)'
      : 'Short-term capital gains (ordinary income)',
    verdict: getMockSellVerdict(ticker, gainLossPercent),
    reasons: getMockSellReasons(ticker, gainLossPercent),
    selectedLots: [
      {
        shares,
        costBasis: position.avgCostBasis,
        purchaseDate: position.purchaseDate,
      },
    ],
  };
}

function printSellRecommendation(rec: SellRecommendation): void {
  const verdictColor = colorVerdict(rec.verdict);

  console.log(`  Ticker:       ${bold(rec.ticker)}`);
  console.log(`  Verdict:      ${verdictColor}`);
  console.log('');
  console.log(`  Current:      ${formatCurrency(rec.currentPrice)}`);
  console.log(`  Shares:       ${rec.shares}`);
  console.log(`  Proceeds:     ${formatCurrency(rec.proceeds)}`);
  console.log('');
  console.log(`  Cost Basis:   ${formatCurrency(rec.costBasis)}`);
  console.log(`  Gain/Loss:    ${colorPnL(rec.gainLoss)} (${colorPercent(rec.gainLossPercent)})`);
  console.log('');
  console.log(`  Holding:      ${rec.holdingPeriod}`);
  console.log(`  Tax:          ${rec.taxImplication}`);

  console.log(subheader('Tax Lots to Sell'));
  for (const lot of rec.selectedLots) {
    console.log(`  ${lot.shares} shares @ ${formatCurrency(lot.costBasis)} (${lot.purchaseDate})`);
  }

  if (rec.reasons.length > 0) {
    console.log(subheader('Considerations'));
    for (const reason of rec.reasons) {
      const icon = reason.includes('risk') || reason.includes('loss') ? yellow('!') : cyan('i');
      console.log(`  ${icon} ${reason}`);
    }
  }
}

async function executeSell(rec: SellRecommendation): Promise<void> {
  warn('PAPER TRADING MODE - No real order will be placed');
  console.log('');

  const loading = spinner('Placing order...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  loading.stop();

  console.log(green('Order placed successfully (paper)'));
  console.log(`  Order ID:     PAPER-${Date.now()}`);
  console.log(`  Action:       SELL`);
  console.log(`  Ticker:       ${rec.ticker}`);
  console.log(`  Shares:       ${rec.shares}`);
  console.log(`  Limit Price:  ${formatCurrency(rec.currentPrice)}`);
  console.log(`  Status:       ${yellow('PENDING')}`);
}

// =============================================================================
// Mock Data Functions
// =============================================================================

function getMockPrice(ticker: string): number {
  const prices: Record<string, number> = {
    AAPL: 195.20,
    MSFT: 425.30,
    NVDA: 875.50,
    GOOGL: 142.50,
    AMZN: 185.30,
    META: 505.20,
    TSLA: 248.50,
  };
  return prices[ticker] || 100 + (ticker.charCodeAt(0) % 100);
}

function getMockBuyVerdict(ticker: string): string {
  const hash = ticker.charCodeAt(0) % 3;
  return ['BUY', 'MODERATE_RISK', 'AVOID'][hash];
}

function getMockBuyReasons(ticker: string): string[] {
  const reasons = [];
  if (ticker.charCodeAt(0) % 2 === 0) {
    reasons.push('Strong revenue growth trajectory');
  }
  if (ticker.charCodeAt(0) % 3 === 0) {
    reasons.push('Trading below intrinsic value');
  }
  if (ticker.charCodeAt(0) % 4 === 0) {
    reasons.push('Positive analyst momentum');
  }
  reasons.push('Sector showing relative strength');
  return reasons;
}

function getMockRisks(ticker: string): string[] {
  const risks = [];
  if (ticker.charCodeAt(0) % 2 === 1) {
    risks.push('Elevated P/E relative to sector');
  }
  if (ticker.charCodeAt(0) % 3 === 1) {
    risks.push('Some insider selling activity');
  }
  risks.push('General market volatility');
  return risks;
}

function getMockPosition(ticker: string): {
  shares: number;
  avgCostBasis: number;
  currentPrice: number;
  purchaseDate: string;
} {
  const positions: Record<string, { shares: number; avgCostBasis: number; currentPrice: number; purchaseDate: string }> = {
    AAPL: { shares: 50, avgCostBasis: 145.00, currentPrice: 195.20, purchaseDate: '2023-06-15' },
    MSFT: { shares: 25, avgCostBasis: 280.00, currentPrice: 425.30, purchaseDate: '2023-03-20' },
    NVDA: { shares: 10, avgCostBasis: 450.00, currentPrice: 875.50, purchaseDate: '2024-01-10' },
  };

  return positions[ticker] || {
    shares: 100,
    avgCostBasis: getMockPrice(ticker) * 0.85,
    currentPrice: getMockPrice(ticker),
    purchaseDate: '2023-09-01',
  };
}

function getMockSellVerdict(ticker: string, gainPercent: number): string {
  if (gainPercent > 20) return 'SELL';
  if (gainPercent < -8) return 'SELL';
  return 'HOLD';
}

function getMockSellReasons(ticker: string, gainPercent: number): string[] {
  const reasons = [];
  if (gainPercent > 20) {
    reasons.push('Target gain reached - consider taking profits');
  }
  if (gainPercent < -8) {
    reasons.push('Stop loss triggered - cut losses per policy');
  }
  if (gainPercent > 0 && gainPercent < 20) {
    reasons.push('Position still has upside to target');
  }
  reasons.push('Consider tax-loss harvesting opportunities');
  return reasons;
}
