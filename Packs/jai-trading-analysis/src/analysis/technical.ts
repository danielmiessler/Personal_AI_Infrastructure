/**
 * Technical Analysis Module
 *
 * Provides timing signals for buy/sell decisions using:
 * - Trend analysis (moving averages)
 * - Momentum indicators (RSI, MACD)
 * - Support/resistance levels
 * - Volume analysis
 *
 * Philosophy: Fundamentals tell you WHAT to buy, technicals tell you WHEN.
 */

import type { PriceHistoryData, PricePoint, AnalysisVerdict } from './types';

// =============================================================================
// Types
// =============================================================================

export type TrendDirection = 'STRONG_UP' | 'UP' | 'SIDEWAYS' | 'DOWN' | 'STRONG_DOWN';

export type TimingAction =
  | 'BUY_NOW'      // Strong buy signal - enter position
  | 'ACCUMULATE'   // Start building position on dips
  | 'WAIT_TO_BUY'  // Good stock but wait for better entry
  | 'HOLD'         // No action needed
  | 'REDUCE'       // Trim position
  | 'SELL_NOW';    // Exit position

export interface TechnicalIndicators {
  // Current price
  currentPrice: number;

  // Moving Averages
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;

  // Momentum
  rsi14: number;
  macd: {
    line: number;      // EMA12 - EMA26
    signal: number;    // 9-day EMA of MACD line
    histogram: number; // MACD line - signal line
  };

  // Trend Analysis
  trend: TrendDirection;
  trendStrength: number; // 0-100

  // Key Levels
  support: number;
  resistance: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;

  // Crossover Signals
  goldenCross: boolean;    // 50 SMA crossed above 200 SMA recently
  deathCross: boolean;     // 50 SMA crossed below 200 SMA recently
  priceAbove20SMA: boolean;
  priceAbove50SMA: boolean;
  priceAbove200SMA: boolean;

  // Volume
  avgVolume20: number;
  volumeTrend: 'INCREASING' | 'STABLE' | 'DECREASING';

  // Volatility
  atr14: number; // Average True Range
  volatility: 'LOW' | 'NORMAL' | 'HIGH';
}

export interface TimingSignal {
  action: TimingAction;
  confidence: number; // 0-100
  reasoning: string[];
  technicalFactors: {
    bullish: string[];
    bearish: string[];
    neutral: string[];
  };
  suggestedEntry?: number;
  suggestedStopLoss?: number;
  suggestedTarget?: number;
}

export interface TechnicalAnalysisResult {
  ticker: string;
  indicators: TechnicalIndicators;
  signal: TimingSignal;
  analyzedAt: Date;
}

// =============================================================================
// Indicator Calculations
// =============================================================================

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return calculateSMA(prices, prices.length);

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Relative Strength Index (RSI)
 * RSI = 100 - (100 / (1 + RS))
 * RS = Average Gain / Average Loss over period
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // Neutral if insufficient data

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Calculate initial averages
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }

  avgGain /= period;
  avgLoss /= period;

  // Smooth the averages
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(prices: number[]): { line: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;

  // Calculate signal line (9-day EMA of MACD)
  // For simplicity, we'll use a rough approximation
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const e12 = calculateEMA(prices.slice(0, i), 12);
    const e26 = calculateEMA(prices.slice(0, i), 26);
    macdValues.push(e12 - e26);
  }

  const signalLine = macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macdLine;

  return {
    line: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine,
  };
}

/**
 * Calculate Average True Range (ATR)
 */
function calculateATR(priceHistory: PricePoint[], period: number = 14): number {
  if (priceHistory.length < 2) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < priceHistory.length; i++) {
    const current = priceHistory[i];
    const previous = priceHistory[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges, Math.min(period, trueRanges.length));
}

/**
 * Find support and resistance levels
 */
function findSupportResistance(priceHistory: PricePoint[]): { support: number; resistance: number } {
  if (priceHistory.length < 20) {
    const closes = priceHistory.map(p => p.close);
    return {
      support: Math.min(...closes),
      resistance: Math.max(...closes),
    };
  }

  // Use recent 20-day low as support, 20-day high as resistance
  const recent = priceHistory.slice(-20);
  const lows = recent.map(p => p.low);
  const highs = recent.map(p => p.high);

  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs),
  };
}

/**
 * Determine trend direction based on moving averages
 */
function determineTrend(
  currentPrice: number,
  sma20: number,
  sma50: number,
  sma200: number
): { trend: TrendDirection; strength: number } {
  // Count bullish signals
  let bullishCount = 0;
  let bearishCount = 0;

  if (currentPrice > sma20) bullishCount++; else bearishCount++;
  if (currentPrice > sma50) bullishCount++; else bearishCount++;
  if (currentPrice > sma200) bullishCount++; else bearishCount++;
  if (sma20 > sma50) bullishCount++; else bearishCount++;
  if (sma50 > sma200) bullishCount++; else bearishCount++;

  // Calculate price distance from 200 SMA as percentage
  const distanceFrom200 = ((currentPrice - sma200) / sma200) * 100;

  let trend: TrendDirection;
  let strength: number;

  if (bullishCount >= 4 && distanceFrom200 > 10) {
    trend = 'STRONG_UP';
    strength = Math.min(90, 60 + bullishCount * 6);
  } else if (bullishCount >= 3) {
    trend = 'UP';
    strength = Math.min(75, 45 + bullishCount * 6);
  } else if (bearishCount >= 4 && distanceFrom200 < -10) {
    trend = 'STRONG_DOWN';
    strength = Math.min(90, 60 + bearishCount * 6);
  } else if (bearishCount >= 3) {
    trend = 'DOWN';
    strength = Math.min(75, 45 + bearishCount * 6);
  } else {
    trend = 'SIDEWAYS';
    strength = 50;
  }

  return { trend, strength };
}

/**
 * Detect moving average crossovers
 */
function detectCrossovers(
  priceHistory: PricePoint[],
  lookbackDays: number = 10
): { goldenCross: boolean; deathCross: boolean } {
  if (priceHistory.length < 200 + lookbackDays) {
    return { goldenCross: false, deathCross: false };
  }

  // Check if 50 SMA crossed 200 SMA in the last N days
  for (let i = 0; i < lookbackDays; i++) {
    const endIndex = priceHistory.length - i;
    const prevIndex = endIndex - 1;

    if (prevIndex < 200) continue;

    const currentPrices = priceHistory.slice(0, endIndex).map(p => p.close);
    const prevPrices = priceHistory.slice(0, prevIndex).map(p => p.close);

    const currentSMA50 = calculateSMA(currentPrices, 50);
    const currentSMA200 = calculateSMA(currentPrices, 200);
    const prevSMA50 = calculateSMA(prevPrices, 50);
    const prevSMA200 = calculateSMA(prevPrices, 200);

    // Golden Cross: 50 crosses above 200
    if (prevSMA50 < prevSMA200 && currentSMA50 > currentSMA200) {
      return { goldenCross: true, deathCross: false };
    }

    // Death Cross: 50 crosses below 200
    if (prevSMA50 > prevSMA200 && currentSMA50 < currentSMA200) {
      return { goldenCross: false, deathCross: true };
    }
  }

  return { goldenCross: false, deathCross: false };
}

/**
 * Analyze volume trends
 */
function analyzeVolume(priceHistory: PricePoint[]): {
  avgVolume20: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
} {
  if (priceHistory.length < 20) {
    return { avgVolume20: 0, trend: 'STABLE' };
  }

  const volumes = priceHistory.slice(-20).map(p => p.volume);
  const avgVolume20 = volumes.reduce((sum, v) => sum + v, 0) / 20;

  // Compare first half to second half
  const firstHalf = volumes.slice(0, 10).reduce((sum, v) => sum + v, 0) / 10;
  const secondHalf = volumes.slice(10).reduce((sum, v) => sum + v, 0) / 10;

  const changePercent = ((secondHalf - firstHalf) / firstHalf) * 100;

  let trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  if (changePercent > 20) trend = 'INCREASING';
  else if (changePercent < -20) trend = 'DECREASING';
  else trend = 'STABLE';

  return { avgVolume20, trend };
}

// =============================================================================
// Main Analysis Functions
// =============================================================================

/**
 * Calculate all technical indicators for a stock
 */
export function calculateIndicators(priceHistory: PriceHistoryData): TechnicalIndicators {
  const prices = priceHistory.prices;
  if (prices.length === 0) {
    throw new Error('No price history available');
  }

  const closes = prices.map(p => p.close);
  const currentPrice = closes[closes.length - 1];

  // Moving Averages
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  // Momentum
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);

  // Trend
  const { trend, strength: trendStrength } = determineTrend(currentPrice, sma20, sma50, sma200);

  // Support/Resistance
  const { support, resistance } = findSupportResistance(prices);

  // 52-week high/low
  const yearPrices = prices.slice(-252); // ~252 trading days in a year
  const fiftyTwoWeekHigh = Math.max(...yearPrices.map(p => p.high));
  const fiftyTwoWeekLow = Math.min(...yearPrices.map(p => p.low));

  // Crossovers
  const { goldenCross, deathCross } = detectCrossovers(prices);

  // Volume
  const { avgVolume20, trend: volumeTrend } = analyzeVolume(prices);

  // Volatility
  const atr14 = calculateATR(prices, 14);
  const atrPercent = (atr14 / currentPrice) * 100;
  let volatility: 'LOW' | 'NORMAL' | 'HIGH';
  if (atrPercent < 1.5) volatility = 'LOW';
  else if (atrPercent > 4) volatility = 'HIGH';
  else volatility = 'NORMAL';

  return {
    currentPrice,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    rsi14,
    macd,
    trend,
    trendStrength,
    support,
    resistance,
    fiftyTwoWeekHigh,
    fiftyTwoWeekLow,
    goldenCross,
    deathCross,
    priceAbove20SMA: currentPrice > sma20,
    priceAbove50SMA: currentPrice > sma50,
    priceAbove200SMA: currentPrice > sma200,
    avgVolume20,
    volumeTrend,
    atr14,
    volatility,
  };
}

/**
 * Generate timing signal based on indicators and fundamental verdict
 */
export function generateTimingSignal(
  indicators: TechnicalIndicators,
  fundamentalVerdict: AnalysisVerdict,
  ownsPosition: boolean = false
): TimingSignal {
  const bullish: string[] = [];
  const bearish: string[] = [];
  const neutral: string[] = [];

  // Collect technical factors

  // Trend factors
  if (indicators.trend === 'STRONG_UP') {
    bullish.push('Strong uptrend (price above all major MAs)');
  } else if (indicators.trend === 'UP') {
    bullish.push('Uptrend in progress');
  } else if (indicators.trend === 'STRONG_DOWN') {
    bearish.push('Strong downtrend (price below all major MAs)');
  } else if (indicators.trend === 'DOWN') {
    bearish.push('Downtrend in progress');
  } else {
    neutral.push('Sideways/consolidating');
  }

  // RSI factors
  if (indicators.rsi14 < 30) {
    bullish.push(`RSI oversold at ${indicators.rsi14.toFixed(0)} (potential bounce)`);
  } else if (indicators.rsi14 > 70) {
    bearish.push(`RSI overbought at ${indicators.rsi14.toFixed(0)} (potential pullback)`);
  } else if (indicators.rsi14 > 50) {
    bullish.push(`RSI bullish at ${indicators.rsi14.toFixed(0)}`);
  } else {
    bearish.push(`RSI bearish at ${indicators.rsi14.toFixed(0)}`);
  }

  // MACD factors
  if (indicators.macd.histogram > 0 && indicators.macd.line > indicators.macd.signal) {
    bullish.push('MACD bullish crossover');
  } else if (indicators.macd.histogram < 0 && indicators.macd.line < indicators.macd.signal) {
    bearish.push('MACD bearish crossover');
  }

  // Crossover events
  if (indicators.goldenCross) {
    bullish.push('Recent Golden Cross (50 SMA above 200 SMA)');
  }
  if (indicators.deathCross) {
    bearish.push('Recent Death Cross (50 SMA below 200 SMA)');
  }

  // Price position
  if (indicators.priceAbove200SMA) {
    bullish.push('Price above 200-day MA (long-term bullish)');
  } else {
    bearish.push('Price below 200-day MA (long-term bearish)');
  }

  // Volume confirmation
  if (indicators.volumeTrend === 'INCREASING' && indicators.trend.includes('UP')) {
    bullish.push('Volume increasing on uptrend (confirmation)');
  } else if (indicators.volumeTrend === 'INCREASING' && indicators.trend.includes('DOWN')) {
    bearish.push('Volume increasing on downtrend (selling pressure)');
  }

  // Near support/resistance
  const distanceToSupport = ((indicators.currentPrice - indicators.support) / indicators.support) * 100;
  const distanceToResistance = ((indicators.resistance - indicators.currentPrice) / indicators.currentPrice) * 100;

  if (distanceToSupport < 3) {
    bullish.push(`Near support level ($${indicators.support.toFixed(2)})`);
  }
  if (distanceToResistance < 3) {
    bearish.push(`Near resistance level ($${indicators.resistance.toFixed(2)})`);
  }

  // 52-week position
  const fromLow = ((indicators.currentPrice - indicators.fiftyTwoWeekLow) / indicators.fiftyTwoWeekLow) * 100;
  const fromHigh = ((indicators.fiftyTwoWeekHigh - indicators.currentPrice) / indicators.fiftyTwoWeekHigh) * 100;

  if (fromLow < 10) {
    bullish.push(`Near 52-week low (${fromLow.toFixed(0)}% above)`);
  }
  if (fromHigh < 10) {
    bearish.push(`Near 52-week high (${fromHigh.toFixed(0)}% below)`);
  }

  // Calculate signal based on fundamental + technical combination
  const action = determineAction(
    fundamentalVerdict,
    indicators,
    bullish.length,
    bearish.length,
    ownsPosition
  );

  // Calculate confidence
  const confidence = calculateConfidence(bullish.length, bearish.length, action);

  // Generate reasoning
  const reasoning = generateReasoning(action, fundamentalVerdict, indicators, ownsPosition);

  // Calculate suggested levels
  const suggestedEntry = action === 'BUY_NOW' || action === 'ACCUMULATE'
    ? Math.min(indicators.currentPrice, indicators.sma20)
    : undefined;

  const suggestedStopLoss = action === 'BUY_NOW' || action === 'ACCUMULATE'
    ? indicators.support * 0.97 // 3% below support
    : undefined;

  const suggestedTarget = action === 'BUY_NOW' || action === 'ACCUMULATE'
    ? indicators.resistance * 1.05 // 5% above resistance
    : undefined;

  return {
    action,
    confidence,
    reasoning,
    technicalFactors: { bullish, bearish, neutral },
    suggestedEntry,
    suggestedStopLoss,
    suggestedTarget,
  };
}

/**
 * Determine action based on fundamental verdict and technical signals
 */
function determineAction(
  fundamentalVerdict: AnalysisVerdict,
  indicators: TechnicalIndicators,
  bullishCount: number,
  bearishCount: number,
  ownsPosition: boolean
): TimingAction {
  const { trend, rsi14 } = indicators;
  const isOversold = rsi14 < 30;
  const isOverbought = rsi14 > 70;
  const isUptrend = trend === 'UP' || trend === 'STRONG_UP';
  const isDowntrend = trend === 'DOWN' || trend === 'STRONG_DOWN';

  // AVOID fundamentals = exit regardless of technicals
  if (fundamentalVerdict === 'AVOID') {
    if (ownsPosition) {
      return 'SELL_NOW';
    }
    return 'WAIT_TO_BUY'; // Never buy AVOID stocks
  }

  // HIGH_RISK fundamentals
  if (fundamentalVerdict === 'HIGH_RISK') {
    if (ownsPosition) {
      if (isDowntrend && !isOversold) return 'REDUCE';
      return 'HOLD';
    }
    return 'WAIT_TO_BUY';
  }

  // MODERATE_RISK fundamentals
  if (fundamentalVerdict === 'MODERATE_RISK') {
    if (ownsPosition) {
      if (isDowntrend && isOverbought) return 'REDUCE';
      return 'HOLD';
    }
    if (isUptrend && isOversold) return 'ACCUMULATE';
    return 'WAIT_TO_BUY';
  }

  // BUY fundamentals - best case
  if (fundamentalVerdict === 'BUY') {
    if (ownsPosition) {
      // Already own it
      if (isUptrend && isOversold) return 'BUY_NOW'; // Add on dip
      if (isOverbought) return 'HOLD'; // Don't chase
      return 'HOLD';
    }

    // Don't own it yet
    if (isUptrend && !isOverbought) {
      if (isOversold || rsi14 < 45) return 'BUY_NOW';
      if (rsi14 < 60) return 'ACCUMULATE';
      return 'WAIT_TO_BUY'; // Overbought-ish
    }

    if (isDowntrend) {
      if (isOversold) return 'ACCUMULATE'; // Catch falling knife carefully
      return 'WAIT_TO_BUY'; // Wait for reversal
    }

    // Sideways
    if (bullishCount > bearishCount) return 'ACCUMULATE';
    return 'WAIT_TO_BUY';
  }

  return 'HOLD';
}

/**
 * Calculate confidence level based on signal alignment
 */
function calculateConfidence(
  bullishCount: number,
  bearishCount: number,
  action: TimingAction
): number {
  const total = bullishCount + bearishCount;
  if (total === 0) return 50;

  // Base confidence on signal alignment
  let alignment: number;
  if (action === 'BUY_NOW' || action === 'ACCUMULATE') {
    alignment = bullishCount / total;
  } else if (action === 'SELL_NOW' || action === 'REDUCE') {
    alignment = bearishCount / total;
  } else {
    alignment = 0.5;
  }

  // Convert to confidence score
  const confidence = Math.round(50 + (alignment - 0.5) * 80);
  return Math.min(95, Math.max(30, confidence));
}

/**
 * Generate human-readable reasoning
 */
function generateReasoning(
  action: TimingAction,
  fundamentalVerdict: AnalysisVerdict,
  indicators: TechnicalIndicators,
  ownsPosition: boolean
): string[] {
  const reasons: string[] = [];
  const { trend, rsi14, currentPrice, sma50, sma200 } = indicators;

  // Explain fundamental context
  reasons.push(`Fundamental verdict: ${fundamentalVerdict}`);

  // Explain technical context
  reasons.push(`Current trend: ${trend} (${indicators.trendStrength}% strength)`);

  // Explain the decision
  switch (action) {
    case 'BUY_NOW':
      reasons.push(`Strong entry point: RSI at ${rsi14.toFixed(0)}, price in ${trend.toLowerCase()}`);
      if (currentPrice < sma50) {
        reasons.push(`Price ($${currentPrice.toFixed(2)}) below 50-day MA ($${sma50.toFixed(2)}) - potential value`);
      }
      break;

    case 'ACCUMULATE':
      reasons.push(`Good fundamentals with developing technical setup`);
      reasons.push(`Consider building position gradually`);
      break;

    case 'WAIT_TO_BUY':
      if (trend.includes('DOWN')) {
        reasons.push(`Wait for trend reversal - still in ${trend.toLowerCase()}`);
      }
      if (rsi14 > 70) {
        reasons.push(`RSI overbought (${rsi14.toFixed(0)}) - wait for pullback`);
      }
      reasons.push(`Set price alert at $${indicators.support.toFixed(2)} (support)`);
      break;

    case 'HOLD':
      if (ownsPosition) {
        reasons.push(`No action needed - maintain current position`);
        if (trend.includes('UP')) {
          reasons.push(`Trend is favorable - let it run`);
        }
      }
      break;

    case 'REDUCE':
      reasons.push(`Technical deterioration - consider reducing exposure`);
      if (trend.includes('DOWN')) {
        reasons.push(`Downtrend in progress - protect gains`);
      }
      break;

    case 'SELL_NOW':
      reasons.push(`Exit recommended based on ${fundamentalVerdict} fundamentals`);
      if (indicators.deathCross) {
        reasons.push(`Death Cross confirmed - major bearish signal`);
      }
      break;
  }

  return reasons;
}

/**
 * Run full technical analysis
 */
export async function runTechnicalAnalysis(
  ticker: string,
  priceHistory: PriceHistoryData,
  fundamentalVerdict: AnalysisVerdict,
  ownsPosition: boolean = false
): Promise<TechnicalAnalysisResult> {
  const indicators = calculateIndicators(priceHistory);
  const signal = generateTimingSignal(indicators, fundamentalVerdict, ownsPosition);

  return {
    ticker,
    indicators,
    signal,
    analyzedAt: new Date(),
  };
}
