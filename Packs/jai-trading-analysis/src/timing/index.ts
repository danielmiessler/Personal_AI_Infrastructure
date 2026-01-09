/**
 * Timing Module
 *
 * Buy price calculation and momentum analysis for entry timing.
 */

export { calculateBuyPrice } from './buyprice';
export type { BuyPriceResult } from './buyprice';

export { analyzeMomentum } from './momentum';
export type { MomentumResult, MomentumSignal } from './momentum';

export type {
  DataProvider as TimingDataProvider,
  BuyPriceInput,
  BuyPriceMethod,
  BuyPriceBreakdown,
  MomentumInput,
  TechnicalIndicator,
  RSIResult,
  MACDResult,
  MovingAverageResult,
  VolumeAnalysis,
} from './types';

export {
  DEFAULT_MARGIN_OF_SAFETY,
  INDICATOR_WEIGHTS,
  RSI_THRESHOLDS,
} from './types';
