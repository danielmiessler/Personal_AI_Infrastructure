/**
 * Momentum Analyzer
 *
 * Analyzes technical momentum indicators to determine entry timing.
 * Combines RSI, MACD, moving averages, and volume for a composite signal.
 */

import type {
  MomentumInput,
  MomentumResult,
  MomentumSignal,
  TechnicalIndicator,
} from './types';
import { INDICATOR_WEIGHTS, RSI_THRESHOLDS } from './types';

// =============================================================================
// Momentum Analysis
// =============================================================================

export async function analyzeMomentum(
  input: MomentumInput
): Promise<MomentumResult> {
  const { ticker, dataProvider } = input;

  // Fetch required data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 365); // 1 year of data for MAs

  const [quote, historical, range] = await Promise.all([
    dataProvider.yahoo.getQuote(ticker),
    dataProvider.yahoo.getHistorical(ticker, { startDate, endDate }),
    dataProvider.yahoo.get52WeekRange(ticker),
  ]);

  const quoteData = quote[0];
  const prices = historical.prices;

  if (prices.length < 50) {
    return createInsufficientDataResult(ticker);
  }

  const indicators: TechnicalIndicator[] = [];

  // ==========================================================================
  // RSI (weight: 20)
  // ==========================================================================

  const closePrices = prices.map((p) => p.close);
  const rsi = calculateRSI(closePrices, 14);

  let rsiSignal: MomentumSignal;
  let rsiReasoning: string;

  if (rsi < RSI_THRESHOLDS.oversold) {
    rsiSignal = 'BULLISH';
    rsiReasoning = `RSI ${rsi.toFixed(1)} is oversold (<${RSI_THRESHOLDS.oversold}), suggesting potential upside`;
  } else if (rsi > RSI_THRESHOLDS.overbought) {
    rsiSignal = 'BEARISH';
    rsiReasoning = `RSI ${rsi.toFixed(1)} is overbought (>${RSI_THRESHOLDS.overbought}), suggesting caution`;
  } else {
    rsiSignal = 'NEUTRAL';
    rsiReasoning = `RSI ${rsi.toFixed(1)} is in neutral territory`;
  }

  indicators.push({
    name: 'RSI (14)',
    value: rsi,
    signal: rsiSignal,
    weight: INDICATOR_WEIGHTS.rsi,
    reasoning: rsiReasoning,
  });

  // ==========================================================================
  // MACD (weight: 25)
  // ==========================================================================

  const macd = calculateMACD(closePrices);

  let macdSignal: MomentumSignal;
  let macdReasoning: string;

  if (macd.histogram > 0 && macd.macdLine > macd.signalLine) {
    macdSignal = 'BULLISH';
    macdReasoning = 'MACD above signal line with positive histogram';
  } else if (macd.histogram < 0 && macd.macdLine < macd.signalLine) {
    macdSignal = 'BEARISH';
    macdReasoning = 'MACD below signal line with negative histogram';
  } else {
    macdSignal = 'NEUTRAL';
    macdReasoning = 'MACD showing mixed signals';
  }

  indicators.push({
    name: 'MACD (12,26,9)',
    value: macd.histogram,
    signal: macdSignal,
    weight: INDICATOR_WEIGHTS.macd,
    reasoning: macdReasoning,
  });

  // ==========================================================================
  // Price vs 50-day MA (weight: 20)
  // ==========================================================================

  const currentPrice = quoteData.regularMarketPrice;
  const ma50 = quoteData.fiftyDayAverage;

  if (ma50 && ma50 > 0) {
    const ma50Distance = ((currentPrice - ma50) / ma50) * 100;

    let ma50Signal: MomentumSignal;
    let ma50Reasoning: string;

    if (currentPrice > ma50) {
      ma50Signal = 'BULLISH';
      ma50Reasoning = `Price ${ma50Distance.toFixed(1)}% above 50-day MA ($${ma50.toFixed(2)})`;
    } else if (currentPrice < ma50 * 0.95) {
      ma50Signal = 'BEARISH';
      ma50Reasoning = `Price ${Math.abs(ma50Distance).toFixed(1)}% below 50-day MA ($${ma50.toFixed(2)})`;
    } else {
      ma50Signal = 'NEUTRAL';
      ma50Reasoning = `Price near 50-day MA ($${ma50.toFixed(2)})`;
    }

    indicators.push({
      name: 'Price vs 50-day MA',
      value: ma50Distance,
      signal: ma50Signal,
      weight: INDICATOR_WEIGHTS.ma50,
      reasoning: ma50Reasoning,
    });
  }

  // ==========================================================================
  // Price vs 200-day MA (weight: 20)
  // ==========================================================================

  const ma200 = quoteData.twoHundredDayAverage;

  if (ma200 && ma200 > 0) {
    const ma200Distance = ((currentPrice - ma200) / ma200) * 100;

    let ma200Signal: MomentumSignal;
    let ma200Reasoning: string;

    if (currentPrice > ma200) {
      ma200Signal = 'BULLISH';
      ma200Reasoning = `Price ${ma200Distance.toFixed(1)}% above 200-day MA ($${ma200.toFixed(2)}) - long-term uptrend`;
    } else if (currentPrice < ma200 * 0.9) {
      ma200Signal = 'BEARISH';
      ma200Reasoning = `Price ${Math.abs(ma200Distance).toFixed(1)}% below 200-day MA ($${ma200.toFixed(2)}) - long-term downtrend`;
    } else {
      ma200Signal = 'NEUTRAL';
      ma200Reasoning = `Price near 200-day MA ($${ma200.toFixed(2)}) - testing support`;
    }

    indicators.push({
      name: 'Price vs 200-day MA',
      value: ma200Distance,
      signal: ma200Signal,
      weight: INDICATOR_WEIGHTS.ma200,
      reasoning: ma200Reasoning,
    });
  }

  // ==========================================================================
  // Volume Trend (weight: 15)
  // ==========================================================================

  const avgVolume = quoteData.averageDailyVolume3Month;
  const currentVolume = quoteData.regularMarketVolume;
  const priceChange = quoteData.regularMarketChange;

  if (avgVolume && avgVolume > 0 && currentVolume) {
    const volumeRatio = currentVolume / avgVolume;

    let volumeSignal: MomentumSignal;
    let volumeReasoning: string;

    if (volumeRatio > 1.5 && priceChange > 0) {
      volumeSignal = 'BULLISH';
      volumeReasoning = `High volume (${(volumeRatio * 100).toFixed(0)}% of avg) on up day - accumulation`;
    } else if (volumeRatio > 1.5 && priceChange < 0) {
      volumeSignal = 'BEARISH';
      volumeReasoning = `High volume (${(volumeRatio * 100).toFixed(0)}% of avg) on down day - distribution`;
    } else if (volumeRatio < 0.7) {
      volumeSignal = 'NEUTRAL';
      volumeReasoning = `Low volume (${(volumeRatio * 100).toFixed(0)}% of avg) - lack of conviction`;
    } else {
      volumeSignal = 'NEUTRAL';
      volumeReasoning = `Normal volume (${(volumeRatio * 100).toFixed(0)}% of avg)`;
    }

    indicators.push({
      name: 'Volume Trend',
      value: volumeRatio,
      signal: volumeSignal,
      weight: INDICATOR_WEIGHTS.volume,
      reasoning: volumeReasoning,
    });
  }

  // ==========================================================================
  // Calculate Composite Score
  // ==========================================================================

  const { score, signal } = calculateCompositeScore(indicators);
  const reasoning = generateReasoning(ticker, signal, score, indicators);

  return {
    signal,
    score,
    indicators,
    reasoning,
  };
}

// =============================================================================
// Technical Indicator Calculations
// =============================================================================

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Default to neutral
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Calculate initial averages
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Apply smoothing for remaining periods
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
}

interface MACDValues {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDValues {
  if (prices.length < slowPeriod + signalPeriod) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }

  // Calculate EMAs
  const ema12 = calculateEMA(prices, fastPeriod);
  const ema26 = calculateEMA(prices, slowPeriod);

  // MACD line is the difference between 12 and 26 period EMAs
  const macdValues: number[] = [];
  const minLength = Math.min(ema12.length, ema26.length);

  for (let i = 0; i < minLength; i++) {
    const offset12 = ema12.length - minLength;
    const offset26 = ema26.length - minLength;
    macdValues.push(ema12[i + offset12] - ema26[i + offset26]);
  }

  // Signal line is 9-period EMA of MACD line
  const signalValues = calculateEMA(macdValues, signalPeriod);

  const macdLine = macdValues[macdValues.length - 1] ?? 0;
  const signalLine = signalValues[signalValues.length - 1] ?? 0;
  const histogram = macdLine - signalLine;

  return { macdLine, signalLine, histogram };
}

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return [];
  }

  const multiplier = 2 / (period + 1);
  const ema: number[] = [];

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);

  // Calculate remaining EMAs
  for (let i = period; i < prices.length; i++) {
    const currentEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(currentEMA);
  }

  return ema;
}

// =============================================================================
// Composite Score Calculation
// =============================================================================

function calculateCompositeScore(
  indicators: TechnicalIndicator[]
): { score: number; signal: MomentumSignal } {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const indicator of indicators) {
    let signalValue: number;

    switch (indicator.signal) {
      case 'BULLISH':
        signalValue = 100;
        break;
      case 'BEARISH':
        signalValue = -100;
        break;
      default:
        signalValue = 0;
    }

    weightedSum += signalValue * indicator.weight;
    totalWeight += indicator.weight;
  }

  const score = totalWeight > 0 ? weightedSum / totalWeight : 0;

  let signal: MomentumSignal;
  if (score > 30) {
    signal = 'BULLISH';
  } else if (score < -30) {
    signal = 'BEARISH';
  } else {
    signal = 'NEUTRAL';
  }

  return { score: Math.round(score), signal };
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateReasoning(
  ticker: string,
  signal: MomentumSignal,
  score: number,
  indicators: TechnicalIndicator[]
): string {
  const parts: string[] = [];

  parts.push(`${ticker} momentum is ${signal.toLowerCase()} (score: ${score}).`);

  // Count signals
  const bullish = indicators.filter((i) => i.signal === 'BULLISH').length;
  const bearish = indicators.filter((i) => i.signal === 'BEARISH').length;
  const neutral = indicators.filter((i) => i.signal === 'NEUTRAL').length;

  parts.push(`Indicators: ${bullish} bullish, ${bearish} bearish, ${neutral} neutral.`);

  // Key signals
  const keySignals = indicators
    .filter((i) => i.signal !== 'NEUTRAL')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((i) => i.reasoning);

  if (keySignals.length > 0) {
    parts.push(`Key factors: ${keySignals.join('; ')}.`);
  }

  // Entry recommendation
  if (signal === 'BULLISH') {
    parts.push('Technical setup favors entry.');
  } else if (signal === 'BEARISH') {
    parts.push('Consider waiting for better technical setup.');
  } else {
    parts.push('Timing is neutral - other factors should drive decision.');
  }

  return parts.join(' ');
}

function createInsufficientDataResult(ticker: string): MomentumResult {
  return {
    signal: 'NEUTRAL',
    score: 0,
    indicators: [],
    reasoning: `Insufficient historical data for ${ticker} to calculate momentum indicators.`,
  };
}

export { MomentumResult, MomentumSignal };
