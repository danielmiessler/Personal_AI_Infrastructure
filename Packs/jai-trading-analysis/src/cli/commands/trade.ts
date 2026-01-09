/**
 * Trade Commands
 *
 * Buy and sell recommendations with optional execution via Alpaca.
 * Uses real analysis pipeline and portfolio data.
 */

import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
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
} from '../format';
import { RealDataProvider } from '../../analysis/data-provider';
import { AnalysisPipeline } from '../../analysis/pipeline';
import {
  AlpacaClient,
  PolicyLoader,
  DEFAULT_POLICY,
} from 'jai-finance-core';
import type { OrderRequest, Policy } from 'jai-finance-core';
import type { AnalysisVerdict } from '../../analysis/types';

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

interface BuyRecommendation {
  ticker: string;
  currentPrice: number;
  recommendedPrice: number;
  shares: number;
  totalCost: number;
  verdict: AnalysisVerdict;
  reasons: string[];
  risks: string[];
  stopLossPrice: number;
  targetPrice: number;
  analysisConfidence: number;
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
  selectedLots: TaxLot[];
}

// =============================================================================
// Configuration
// =============================================================================

const CONFIG_DIR = join(homedir(), '.config', 'jai');
const POSITIONS_FILE = join(CONFIG_DIR, 'positions.json');
const POLICY_FILE = join(CONFIG_DIR, 'policy.yaml');

// Policy-based thresholds (from Joey's investment policy)
const STOP_LOSS_PERCENT = 0.08; // 8% stop loss
const TARGET_GAIN_PERCENT = 0.20; // 20% target

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

  const loading = spinner('Running analysis pipeline...');

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
  // Initialize data provider
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY not set. Run: source ~/.config/jai/load-secrets.sh');
  }

  const dataProvider = new RealDataProvider({
    finnhubApiKey,
    enableCache: true,
  });

  // Load policy
  let policy: Policy;
  if (existsSync(POLICY_FILE)) {
    const loader = new PolicyLoader(POLICY_FILE);
    policy = loader.load();
  } else {
    policy = DEFAULT_POLICY;
  }

  // Run analysis pipeline
  const pipeline = new AnalysisPipeline(dataProvider, policy);
  const analysis = await pipeline.analyze(ticker);

  // Get current price
  const quote = await dataProvider.getQuote(ticker);
  const currentPrice = quote.price;
  const recommendedPrice = limitPrice ? parseFloat(limitPrice) : currentPrice;

  // Parse amount and calculate shares
  const isDollarAmount = amount.startsWith('$');
  const numericAmount = parseFloat(amount.replace('$', '').replace(',', ''));
  const shares = isDollarAmount
    ? Math.floor(numericAmount / recommendedPrice)
    : numericAmount;
  const totalCost = shares * recommendedPrice;

  // Extract reasons and risks from analysis
  const reasons: string[] = [];
  const risks: string[] = [];

  for (const rec of analysis.recommendations) {
    if (rec.type === 'action' || rec.type === 'info') {
      reasons.push(rec.summary);
    } else if (rec.type === 'warning') {
      risks.push(rec.summary);
    }
  }

  // Add F-Score context
  const fScoreStage = analysis.stages.find(s => s.name === 'fScore');
  if (fScoreStage) {
    const score = Math.round(fScoreStage.score * 9 / 100);
    reasons.push(`F-Score: ${score}/9`);
  }

  return {
    ticker,
    currentPrice,
    recommendedPrice,
    shares,
    totalCost,
    verdict: analysis.verdict,
    reasons,
    risks,
    stopLossPrice: recommendedPrice * (1 - STOP_LOSS_PERCENT),
    targetPrice: recommendedPrice * (1 + TARGET_GAIN_PERCENT),
    analysisConfidence: analysis.confidenceScore,
  };
}

function printBuyRecommendation(rec: BuyRecommendation): void {
  const verdictColor = colorVerdict(rec.verdict);

  console.log(`  Ticker:       ${bold(rec.ticker)}`);
  console.log(`  Verdict:      ${verdictColor}`);
  console.log(`  Confidence:   ${rec.analysisConfidence}%`);
  console.log('');
  console.log(`  Current:      ${formatCurrency(rec.currentPrice)}`);
  console.log(`  Buy At:       ${formatCurrency(rec.recommendedPrice)}`);
  console.log(`  Shares:       ${rec.shares}`);
  console.log(`  Total Cost:   ${formatCurrency(rec.totalCost)}`);
  console.log('');
  console.log(`  Stop Loss:    ${formatCurrency(rec.stopLossPrice)} ${gray(`(-${STOP_LOSS_PERCENT * 100}%)`)}`);
  console.log(`  Target:       ${formatCurrency(rec.targetPrice)} ${gray(`(+${TARGET_GAIN_PERCENT * 100}%)`)}`);

  if (rec.reasons.length > 0) {
    console.log(subheader('Analysis Summary'));
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

  // Verdict-based advice
  console.log(subheader('Recommendation'));
  switch (rec.verdict) {
    case 'BUY':
      console.log(`  ${green('✓')} Analysis supports buying ${rec.ticker}`);
      console.log(`    Consider a limit order at or below ${formatCurrency(rec.currentPrice)}`);
      break;
    case 'MODERATE_RISK':
      console.log(`  ${yellow('!')} ${rec.ticker} has moderate risk factors`);
      console.log(`    Consider smaller position size or better entry price`);
      break;
    case 'HIGH_RISK':
      console.log(`  ${red('!')} ${rec.ticker} has significant risk - exercise caution`);
      console.log(`    Review risks carefully before proceeding`);
      break;
    case 'AVOID':
      console.log(`  ${red('✗')} Analysis does not support buying ${rec.ticker}`);
      console.log(`    Dealbreaker(s) triggered - strongly consider avoiding`);
      break;
  }
}

async function executeBuy(rec: BuyRecommendation): Promise<void> {
  // Check for Alpaca credentials
  const alpacaKey = process.env.ALPACA_API_KEY;
  const alpacaSecret = process.env.ALPACA_SECRET_KEY;

  if (!alpacaKey || !alpacaSecret) {
    warn('Alpaca credentials not set - simulating order');
    console.log('');
    console.log(`Set ALPACA_API_KEY and ALPACA_SECRET_KEY for real paper trading`);
    simulateOrder('BUY', rec.ticker, rec.shares, rec.recommendedPrice);
    return;
  }

  // Create Alpaca client (paper trading mode)
  const alpaca = new AlpacaClient({
    apiKey: alpacaKey,
    secretKey: alpacaSecret,
    paperMode: true,
  });

  // Verify account access
  const loading = spinner('Connecting to Alpaca...');
  try {
    const account = await alpaca.getAccount();
    loading.stop();

    info(`Account: ${account.accountNumber}`);
    console.log(`  Buying Power: ${formatCurrency(account.buyingPower)}`);
    console.log('');

    // Check buying power
    if (account.buyingPower < rec.totalCost) {
      error(`Insufficient buying power. Need ${formatCurrency(rec.totalCost)}, have ${formatCurrency(account.buyingPower)}`);
      return;
    }

    // Submit order
    const orderLoading = spinner('Submitting order...');
    const orderRequest: OrderRequest = {
      ticker: rec.ticker,
      side: 'buy',
      type: 'limit',
      quantity: rec.shares,
      limitPrice: rec.recommendedPrice,
      timeInForce: 'day',
    };

    const result = await alpaca.submitOrder(orderRequest);
    orderLoading.stop();

    console.log(green('Order submitted successfully'));
    console.log(`  Order ID:     ${result.orderId}`);
    console.log(`  Action:       BUY`);
    console.log(`  Ticker:       ${rec.ticker}`);
    console.log(`  Shares:       ${rec.shares}`);
    console.log(`  Limit Price:  ${formatCurrency(rec.recommendedPrice)}`);
    console.log(`  Status:       ${yellow(result.status.toUpperCase())}`);

  } catch (err) {
    loading.stop();
    error(`Alpaca error: ${err instanceof Error ? err.message : String(err)}`);
  }
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

  const loading = spinner('Analyzing position...');

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
  // Initialize data provider
  const finnhubApiKey = process.env.FINNHUB_API_KEY;
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY not set. Run: source ~/.config/jai/load-secrets.sh');
  }

  const dataProvider = new RealDataProvider({
    finnhubApiKey,
    enableCache: true,
  });

  // Load position from positions file
  if (!existsSync(POSITIONS_FILE)) {
    throw new Error(`Positions file not found: ${POSITIONS_FILE}`);
  }

  const content = await Bun.file(POSITIONS_FILE).text();
  const positionsFile: PositionsFile = JSON.parse(content);

  const position = positionsFile.positions.find(p => p.ticker === ticker);
  if (!position) {
    throw new Error(`No position found for ${ticker}`);
  }

  // Get current price
  const quote = await dataProvider.getQuote(ticker);
  const currentPrice = limitPrice ? parseFloat(limitPrice) : quote.price;

  // Calculate shares to sell
  const shares = shareCount ?? position.shares;
  if (shares > position.shares) {
    throw new Error(`Cannot sell ${shares} shares. Position has only ${position.shares} shares.`);
  }

  // Select tax lots based on method
  const selectedLots = selectTaxLots(position.taxLots, shares, method);

  // Calculate cost basis from selected lots
  let totalCostBasis = 0;
  let totalSelectedShares = 0;
  for (const lot of selectedLots) {
    totalCostBasis += lot.shares * lot.costBasis;
    totalSelectedShares += lot.shares;
  }

  // Calculate gains
  const proceeds = shares * currentPrice;
  const costBasis = totalCostBasis;
  const gainLoss = proceeds - costBasis;
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

  // Determine holding period from earliest selected lot
  const earliestLot = selectedLots.reduce((earliest, lot) =>
    new Date(lot.purchaseDate) < new Date(earliest.purchaseDate) ? lot : earliest
  );
  const purchaseDate = new Date(earliestLot.purchaseDate);
  const now = new Date();
  const daysHeld = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const isLongTerm = daysHeld > 365;

  // Generate verdict and reasons
  const reasons: string[] = [];
  let verdict = 'HOLD';

  if (gainLossPercent >= TARGET_GAIN_PERCENT * 100) {
    verdict = 'SELL';
    reasons.push('Target gain reached - consider taking profits');
  } else if (gainLossPercent <= -STOP_LOSS_PERCENT * 100) {
    verdict = 'SELL';
    reasons.push('Stop loss triggered - cut losses per policy');
  } else if (gainLossPercent > 0) {
    reasons.push(`Position has ${gainLossPercent.toFixed(1)}% gain - below target`);
  } else {
    reasons.push(`Position has ${gainLossPercent.toFixed(1)}% loss - above stop loss`);
  }

  // Tax considerations
  if (isLongTerm) {
    reasons.push('Long-term holding qualifies for favorable tax rate');
  } else {
    reasons.push(`Short-term holding (${daysHeld} days) - taxed as ordinary income`);
  }

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
    verdict,
    reasons,
    selectedLots,
  };
}

function selectTaxLots(lots: TaxLot[], sharesToSell: number, method: 'FIFO' | 'LIFO' | 'HIFO'): TaxLot[] {
  if (lots.length === 0) {
    // Create synthetic lot from position data
    return [{
      id: 'synthetic',
      shares: sharesToSell,
      costBasis: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
    }];
  }

  // Sort lots based on method
  const sortedLots = [...lots];
  switch (method) {
    case 'FIFO':
      sortedLots.sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
      break;
    case 'LIFO':
      sortedLots.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
      break;
    case 'HIFO':
      sortedLots.sort((a, b) => b.costBasis - a.costBasis);
      break;
  }

  // Select lots until we have enough shares
  const selectedLots: TaxLot[] = [];
  let remainingShares = sharesToSell;

  for (const lot of sortedLots) {
    if (remainingShares <= 0) break;

    const sharesToTake = Math.min(lot.shares, remainingShares);
    selectedLots.push({
      ...lot,
      shares: sharesToTake,
    });
    remainingShares -= sharesToTake;
  }

  return selectedLots;
}

function printSellRecommendation(rec: SellRecommendation): void {
  const verdictColor = rec.verdict === 'SELL' ? red(rec.verdict) :
                       rec.verdict === 'HOLD' ? yellow(rec.verdict) :
                       gray(rec.verdict);

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
    const lotDate = lot.purchaseDate.split('T')[0];
    console.log(`  ${lot.shares} shares @ ${formatCurrency(lot.costBasis)} (${lotDate})`);
  }

  if (rec.reasons.length > 0) {
    console.log(subheader('Considerations'));
    for (const reason of rec.reasons) {
      const icon = reason.toLowerCase().includes('stop') || reason.toLowerCase().includes('loss')
        ? yellow('!')
        : reason.toLowerCase().includes('target') || reason.toLowerCase().includes('long-term')
        ? green('+')
        : cyan('i');
      console.log(`  ${icon} ${reason}`);
    }
  }
}

async function executeSell(rec: SellRecommendation): Promise<void> {
  // Check for Alpaca credentials
  const alpacaKey = process.env.ALPACA_API_KEY;
  const alpacaSecret = process.env.ALPACA_SECRET_KEY;

  if (!alpacaKey || !alpacaSecret) {
    warn('Alpaca credentials not set - simulating order');
    console.log('');
    console.log(`Set ALPACA_API_KEY and ALPACA_SECRET_KEY for real paper trading`);
    simulateOrder('SELL', rec.ticker, rec.shares, rec.currentPrice);
    return;
  }

  // Create Alpaca client (paper trading mode)
  const alpaca = new AlpacaClient({
    apiKey: alpacaKey,
    secretKey: alpacaSecret,
    paperMode: true,
  });

  // Verify account and position
  const loading = spinner('Connecting to Alpaca...');
  try {
    const account = await alpaca.getAccount();
    loading.stop();

    info(`Account: ${account.accountNumber}`);

    // Check if position exists in Alpaca
    const alpacaPosition = await alpaca.getPosition(rec.ticker);
    if (alpacaPosition) {
      console.log(`  Alpaca Position: ${alpacaPosition.qty} shares @ ${formatCurrency(alpacaPosition.avgEntryPrice)}`);
    } else {
      warn(`No position for ${rec.ticker} in Alpaca - order may be rejected`);
    }
    console.log('');

    // Submit order
    const orderLoading = spinner('Submitting order...');
    const orderRequest: OrderRequest = {
      ticker: rec.ticker,
      side: 'sell',
      type: 'limit',
      quantity: rec.shares,
      limitPrice: rec.currentPrice,
      timeInForce: 'day',
    };

    const result = await alpaca.submitOrder(orderRequest);
    orderLoading.stop();

    console.log(green('Order submitted successfully'));
    console.log(`  Order ID:     ${result.orderId}`);
    console.log(`  Action:       SELL`);
    console.log(`  Ticker:       ${rec.ticker}`);
    console.log(`  Shares:       ${rec.shares}`);
    console.log(`  Limit Price:  ${formatCurrency(rec.currentPrice)}`);
    console.log(`  Status:       ${yellow(result.status.toUpperCase())}`);

    // Reminder about local tracking
    console.log('');
    info(`Remember to update ${POSITIONS_FILE} after fill`);

  } catch (err) {
    loading.stop();
    error(`Alpaca error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function simulateOrder(side: 'BUY' | 'SELL', ticker: string, shares: number, price: number): void {
  console.log(yellow('SIMULATION MODE - No real order placed'));
  console.log('');
  console.log(`  Order ID:     SIM-${Date.now()}`);
  console.log(`  Action:       ${side}`);
  console.log(`  Ticker:       ${ticker}`);
  console.log(`  Shares:       ${shares}`);
  console.log(`  Limit Price:  ${formatCurrency(price)}`);
  console.log(`  Status:       ${gray('SIMULATED')}`);
}
