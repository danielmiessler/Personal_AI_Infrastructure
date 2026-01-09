/**
 * Tax Lot Tracker
 *
 * Provides tax lot analysis and gain/loss calculations.
 * Works with PositionManager for underlying data.
 */

import type { PositionManager } from './position';
import type { TaxLot } from './types';

/**
 * Holding period classification for tax purposes.
 */
export type HoldingPeriod = 'short-term' | 'long-term';

/**
 * Result of a gain/loss calculation.
 */
export interface GainLossResult {
  /** Cost basis of the lot */
  costBasis: number;
  /** Current value at the given price */
  currentValue: number;
  /** Unrealized gain or loss */
  unrealizedGainLoss: number;
  /** Unrealized gain/loss as percentage */
  unrealizedGainLossPercent: number;
  /** Whether this would be short-term or long-term if sold */
  holdingPeriod: HoldingPeriod;
}

/**
 * Tax lot with ticker information.
 */
export interface TaxLotWithTicker extends TaxLot {
  ticker: string;
}

/**
 * Tracks and analyzes tax lots across positions.
 */
export class TaxLotTracker {
  constructor(private readonly positionManager: PositionManager) {}

  /**
   * Get all tax lots across all positions.
   */
  getLots(): TaxLotWithTicker[] {
    const lots: TaxLotWithTicker[] = [];

    for (const position of this.positionManager.getAllPositions()) {
      for (const lot of position.taxLots) {
        lots.push({
          ...lot,
          ticker: position.ticker,
        });
      }
    }

    return lots;
  }

  /**
   * Get all tax lots for a specific ticker.
   */
  getLotsForTicker(ticker: string): TaxLot[] {
    const position = this.positionManager.getPosition(ticker);
    return position?.taxLots ?? [];
  }

  /**
   * Get a specific tax lot by ID.
   */
  getLotById(lotId: string): TaxLotWithTicker | undefined {
    for (const position of this.positionManager.getAllPositions()) {
      const lot = position.taxLots.find((l) => l.id === lotId);
      if (lot) {
        return { ...lot, ticker: position.ticker };
      }
    }
    return undefined;
  }

  /**
   * Calculate gain/loss for a specific tax lot at a given price.
   */
  calculateGainLoss(lot: TaxLot, currentPrice: number): GainLossResult {
    const costBasis = lot.shares * lot.costBasis;
    const currentValue = lot.shares * currentPrice;
    const unrealizedGainLoss = currentValue - costBasis;
    const unrealizedGainLossPercent =
      costBasis > 0 ? (unrealizedGainLoss / costBasis) * 100 : 0;
    const holdingPeriod = this.getHoldingPeriod(lot);

    return {
      costBasis,
      currentValue,
      unrealizedGainLoss,
      unrealizedGainLossPercent,
      holdingPeriod,
    };
  }

  /**
   * Determine if a tax lot qualifies for long-term capital gains.
   * Long-term: held for more than 1 year.
   */
  getHoldingPeriod(lot: TaxLot): HoldingPeriod {
    const purchaseDate = new Date(lot.purchaseDate);
    const now = new Date();

    // Add one year to purchase date
    const oneYearLater = new Date(purchaseDate);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    return now > oneYearLater ? 'long-term' : 'short-term';
  }

  /**
   * Get all lots that would qualify for long-term capital gains if sold today.
   */
  getLongTermLots(): TaxLotWithTicker[] {
    return this.getLots().filter(
      (lot) => this.getHoldingPeriod(lot) === 'long-term'
    );
  }

  /**
   * Get all lots that would be short-term capital gains if sold today.
   */
  getShortTermLots(): TaxLotWithTicker[] {
    return this.getLots().filter(
      (lot) => this.getHoldingPeriod(lot) === 'short-term'
    );
  }

  /**
   * Get lots sorted by gain/loss (for tax loss harvesting analysis).
   */
  getLotsByGainLoss(
    ticker: string,
    currentPrice: number,
    order: 'asc' | 'desc' = 'asc'
  ): Array<{ lot: TaxLot; gainLoss: GainLossResult }> {
    const lots = this.getLotsForTicker(ticker);

    const lotsWithGainLoss = lots.map((lot) => ({
      lot,
      gainLoss: this.calculateGainLoss(lot, currentPrice),
    }));

    return lotsWithGainLoss.sort((a, b) => {
      const diff =
        a.gainLoss.unrealizedGainLoss - b.gainLoss.unrealizedGainLoss;
      return order === 'asc' ? diff : -diff;
    });
  }

  /**
   * Find lots with unrealized losses (for tax loss harvesting).
   */
  getLotsWithLosses(currentPrices: Map<string, number>): Array<{
    lot: TaxLotWithTicker;
    gainLoss: GainLossResult;
  }> {
    const results: Array<{ lot: TaxLotWithTicker; gainLoss: GainLossResult }> = [];

    for (const position of this.positionManager.getAllPositions()) {
      const currentPrice = currentPrices.get(position.ticker);
      if (currentPrice === undefined) continue;

      for (const lot of position.taxLots) {
        const gainLoss = this.calculateGainLoss(lot, currentPrice);
        if (gainLoss.unrealizedGainLoss < 0) {
          results.push({
            lot: { ...lot, ticker: position.ticker },
            gainLoss,
          });
        }
      }
    }

    // Sort by largest loss first
    return results.sort(
      (a, b) => a.gainLoss.unrealizedGainLoss - b.gainLoss.unrealizedGainLoss
    );
  }

  /**
   * Calculate total unrealized gain/loss for a ticker at a given price.
   */
  getTotalGainLossForTicker(
    ticker: string,
    currentPrice: number
  ): {
    totalCostBasis: number;
    totalCurrentValue: number;
    totalUnrealizedGainLoss: number;
    totalUnrealizedGainLossPercent: number;
    shortTermGainLoss: number;
    longTermGainLoss: number;
  } | null {
    const position = this.positionManager.getPosition(ticker);
    if (!position) return null;

    let shortTermGainLoss = 0;
    let longTermGainLoss = 0;

    for (const lot of position.taxLots) {
      const gainLoss = this.calculateGainLoss(lot, currentPrice);
      if (gainLoss.holdingPeriod === 'short-term') {
        shortTermGainLoss += gainLoss.unrealizedGainLoss;
      } else {
        longTermGainLoss += gainLoss.unrealizedGainLoss;
      }
    }

    const totalCurrentValue = position.shares * currentPrice;
    const totalUnrealizedGainLoss = totalCurrentValue - position.totalCost;
    const totalUnrealizedGainLossPercent =
      position.totalCost > 0
        ? (totalUnrealizedGainLoss / position.totalCost) * 100
        : 0;

    return {
      totalCostBasis: position.totalCost,
      totalCurrentValue,
      totalUnrealizedGainLoss,
      totalUnrealizedGainLossPercent,
      shortTermGainLoss,
      longTermGainLoss,
    };
  }

  /**
   * Get the oldest lot for a ticker (useful for FIFO preview).
   */
  getOldestLot(ticker: string): TaxLot | undefined {
    const lots = this.getLotsForTicker(ticker);
    if (lots.length === 0) return undefined;

    return lots.reduce((oldest, lot) =>
      new Date(lot.purchaseDate) < new Date(oldest.purchaseDate) ? lot : oldest
    );
  }

  /**
   * Get the newest lot for a ticker (useful for LIFO preview).
   */
  getNewestLot(ticker: string): TaxLot | undefined {
    const lots = this.getLotsForTicker(ticker);
    if (lots.length === 0) return undefined;

    return lots.reduce((newest, lot) =>
      new Date(lot.purchaseDate) > new Date(newest.purchaseDate) ? lot : newest
    );
  }

  /**
   * Get the highest cost basis lot for a ticker (useful for HIFO preview).
   */
  getHighestCostLot(ticker: string): TaxLot | undefined {
    const lots = this.getLotsForTicker(ticker);
    if (lots.length === 0) return undefined;

    return lots.reduce((highest, lot) =>
      lot.costBasis > highest.costBasis ? lot : highest
    );
  }
}
