/**
 * Timing Module Types
 *
 * Type definitions for buy price calculation and momentum analysis.
 */

import type { FinnhubClient, YahooClient, Policy } from 'jai-finance-core';

// =============================================================================
// Data Provider Interface
// =============================================================================

export interface DataProvider {
  finnhub: FinnhubClient;
  yahoo: YahooClient;
}

// =============================================================================
// Buy Price Types
// =============================================================================

export interface BuyPriceInput {
  /** Stock ticker symbol */
  ticker: string;
  /** Data provider clients */
  dataProvider: DataProvider;
  /** Optional policy for margin of safety settings */
  policy?: Policy;
}

export type BuyPriceMethod =
  | 'DCF_MARGIN'
  | '52_WEEK_LOW'
  | '200_DAY_MA'
  | 'ANALYST_TARGET';

export interface BuyPriceResult {
  /** Recommended buy price */
  buyPrice: number;
  /** Current market price */
  currentPrice: number;
  /** Discount from current price (%) */
  discountPercent: number;
  /** Method used to determine buy price */
  method: BuyPriceMethod;
  /** Reasoning for the buy price */
  reasoning: string;
  /** Whether currently at or below buy price */
  isBuyable: boolean;
  /** All calculated buy prices for reference */
  allMethods: BuyPriceBreakdown[];
}

export interface BuyPriceBreakdown {
  /** Method name */
  method: BuyPriceMethod;
  /** Calculated price */
  price: number;
  /** Description of the method */
  description: string;
}

// =============================================================================
// Momentum Types
// =============================================================================

export interface MomentumInput {
  /** Stock ticker symbol */
  ticker: string;
  /** Data provider clients */
  dataProvider: DataProvider;
}

export type MomentumSignal = 'BULLISH' | 'NEUTRAL' | 'BEARISH';

export interface TechnicalIndicator {
  /** Indicator name */
  name: string;
  /** Current value */
  value: number;
  /** Signal interpretation */
  signal: MomentumSignal;
  /** Weight in composite score (0-100, should sum to 100) */
  weight: number;
  /** Explanation of the signal */
  reasoning: string;
}

export interface MomentumResult {
  /** Overall momentum signal */
  signal: MomentumSignal;
  /** Composite score (-100 to 100) */
  score: number;
  /** Individual indicator results */
  indicators: TechnicalIndicator[];
  /** Summary reasoning */
  reasoning: string;
}

// =============================================================================
// RSI Calculation Types
// =============================================================================

export interface RSIResult {
  /** RSI value (0-100) */
  value: number;
  /** Signal interpretation */
  signal: MomentumSignal;
  /** Description */
  description: string;
}

// =============================================================================
// MACD Calculation Types
// =============================================================================

export interface MACDResult {
  /** MACD line value */
  macdLine: number;
  /** Signal line value */
  signalLine: number;
  /** Histogram value */
  histogram: number;
  /** Signal interpretation */
  signal: MomentumSignal;
  /** Description */
  description: string;
}

// =============================================================================
// Moving Average Types
// =============================================================================

export interface MovingAverageResult {
  /** MA value */
  value: number;
  /** Current price */
  currentPrice: number;
  /** Position relative to MA (above/below) */
  position: 'above' | 'below';
  /** Distance from MA (%) */
  distancePercent: number;
  /** Signal interpretation */
  signal: MomentumSignal;
}

// =============================================================================
// Volume Analysis Types
// =============================================================================

export interface VolumeAnalysis {
  /** Current volume */
  currentVolume: number;
  /** Average volume */
  averageVolume: number;
  /** Volume ratio (current / average) */
  volumeRatio: number;
  /** Is volume elevated? */
  isElevated: boolean;
  /** Signal (bullish if elevated on up day, bearish if elevated on down day) */
  signal: MomentumSignal;
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_MARGIN_OF_SAFETY = 0.2; // 20%

export const INDICATOR_WEIGHTS = {
  rsi: 20,
  macd: 25,
  ma50: 20,
  ma200: 20,
  volume: 15,
} as const;

export const RSI_THRESHOLDS = {
  oversold: 30,
  overbought: 70,
} as const;
