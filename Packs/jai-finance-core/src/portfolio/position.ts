/**
 * Position Manager
 *
 * Manages portfolio positions with tax lot tracking.
 * Persists to positions.json in the configured data directory.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  Position,
  PositionsFile,
  TaxLot,
  TaxLotSelectionMethod,
} from './types';

/**
 * Error thrown by PositionManager operations.
 */
export class PositionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly ticker?: string
  ) {
    super(message);
    this.name = 'PositionError';
  }
}

/**
 * Generate a unique tax lot ID.
 */
function generateLotId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `lot_${timestamp}_${random}`;
}

/**
 * Manages portfolio positions with tax lot tracking.
 */
export class PositionManager {
  private readonly filePath: string;
  private positions: Map<string, Position>;

  constructor(dataDir: string) {
    // Ensure data directory exists
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.filePath = join(dataDir, 'positions.json');
    this.positions = new Map();
    this.load();
  }

  /**
   * Load positions from disk.
   */
  private load(): void {
    if (!existsSync(this.filePath)) {
      this.positions = new Map();
      return;
    }

    try {
      const content = readFileSync(this.filePath, 'utf-8');
      const data: PositionsFile = JSON.parse(content);

      this.positions = new Map();
      for (const position of data.positions) {
        this.positions.set(position.ticker, position);
      }
    } catch (error) {
      throw new PositionError(
        `Failed to load positions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOAD_FAILED'
      );
    }
  }

  /**
   * Save positions to disk.
   */
  private save(): void {
    try {
      const data: PositionsFile = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        positions: Array.from(this.positions.values()),
      };

      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new PositionError(
        `Failed to save positions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_FAILED'
      );
    }
  }

  /**
   * Get a position by ticker.
   */
  getPosition(ticker: string): Position | undefined {
    return this.positions.get(ticker.toUpperCase());
  }

  /**
   * Get all positions.
   */
  getAllPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Add shares to a position, creating a new tax lot.
   * Creates the position if it doesn't exist.
   */
  addPosition(
    ticker: string,
    shares: number,
    costBasisPerShare: number,
    options?: {
      purchaseDate?: string;
      notes?: string;
      sector?: string;
      industry?: string;
    }
  ): { position: Position; taxLot: TaxLot } {
    const normalizedTicker = ticker.toUpperCase();

    if (shares <= 0) {
      throw new PositionError(
        'Shares must be greater than 0',
        'INVALID_SHARES',
        normalizedTicker
      );
    }

    if (costBasisPerShare <= 0) {
      throw new PositionError(
        'Cost basis must be greater than 0',
        'INVALID_COST_BASIS',
        normalizedTicker
      );
    }

    const now = new Date().toISOString();
    const purchaseDate = options?.purchaseDate ?? now;

    // Create new tax lot
    const taxLot: TaxLot = {
      id: generateLotId(),
      shares,
      costBasis: costBasisPerShare,
      purchaseDate,
      notes: options?.notes,
    };

    // Get or create position
    let position = this.positions.get(normalizedTicker);

    if (position) {
      // Add to existing position
      const totalShares = position.shares + shares;
      const totalCost = position.totalCost + shares * costBasisPerShare;
      const avgCostBasis = totalCost / totalShares;

      position = {
        ...position,
        shares: totalShares,
        avgCostBasis,
        totalCost,
        taxLots: [...position.taxLots, taxLot],
        // Update sector/industry if provided
        sector: options?.sector ?? position.sector,
        industry: options?.industry ?? position.industry,
      };
    } else {
      // Create new position
      position = {
        ticker: normalizedTicker,
        shares,
        avgCostBasis: costBasisPerShare,
        totalCost: shares * costBasisPerShare,
        taxLots: [taxLot],
        openedAt: purchaseDate,
        sector: options?.sector,
        industry: options?.industry,
      };
    }

    this.positions.set(normalizedTicker, position);
    this.save();

    return { position, taxLot };
  }

  /**
   * Reduce shares from a position using the specified lot selection method.
   * Returns the lots that were sold from with their gain/loss.
   */
  reducePosition(
    ticker: string,
    shares: number,
    currentPrice: number,
    method: TaxLotSelectionMethod = 'FIFO'
  ): { soldLots: Array<{ lot: TaxLot; sharesSold: number; gainLoss: number }>; position: Position | null } {
    const normalizedTicker = ticker.toUpperCase();
    const position = this.positions.get(normalizedTicker);

    if (!position) {
      throw new PositionError(
        `No position found for ${normalizedTicker}`,
        'POSITION_NOT_FOUND',
        normalizedTicker
      );
    }

    if (shares <= 0) {
      throw new PositionError(
        'Shares must be greater than 0',
        'INVALID_SHARES',
        normalizedTicker
      );
    }

    if (shares > position.shares) {
      throw new PositionError(
        `Cannot sell ${shares} shares, only ${position.shares} available`,
        'INSUFFICIENT_SHARES',
        normalizedTicker
      );
    }

    // Sort lots based on selection method
    const sortedLots = [...position.taxLots].sort((a, b) => {
      switch (method) {
        case 'FIFO':
          // First in, first out - oldest first
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        case 'LIFO':
          // Last in, first out - newest first
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        case 'HIFO':
          // Highest in, first out - highest cost basis first (minimize taxes on gains)
          return b.costBasis - a.costBasis;
        default:
          return 0;
      }
    });

    // Sell from lots
    let remainingToSell = shares;
    const soldLots: Array<{ lot: TaxLot; sharesSold: number; gainLoss: number }> = [];
    const updatedLots: TaxLot[] = [];

    for (const lot of sortedLots) {
      if (remainingToSell <= 0) {
        updatedLots.push(lot);
        continue;
      }

      if (lot.shares <= remainingToSell) {
        // Sell entire lot
        const gainLoss = (currentPrice - lot.costBasis) * lot.shares;
        soldLots.push({ lot, sharesSold: lot.shares, gainLoss });
        remainingToSell -= lot.shares;
        // Don't add to updatedLots - lot is fully sold
      } else {
        // Partial sale from this lot
        const sharesSold = remainingToSell;
        const gainLoss = (currentPrice - lot.costBasis) * sharesSold;
        soldLots.push({ lot, sharesSold, gainLoss });

        // Add remaining portion of lot
        updatedLots.push({
          ...lot,
          shares: lot.shares - sharesSold,
        });
        remainingToSell = 0;
      }
    }

    // Update or remove position
    const remainingShares = position.shares - shares;

    if (remainingShares === 0) {
      // Position fully closed
      this.positions.delete(normalizedTicker);
      this.save();
      return { soldLots, position: null };
    }

    // Calculate new totals
    const newTotalCost = updatedLots.reduce(
      (sum, lot) => sum + lot.shares * lot.costBasis,
      0
    );

    const updatedPosition: Position = {
      ...position,
      shares: remainingShares,
      avgCostBasis: newTotalCost / remainingShares,
      totalCost: newTotalCost,
      taxLots: updatedLots,
    };

    this.positions.set(normalizedTicker, updatedPosition);
    this.save();

    return { soldLots, position: updatedPosition };
  }

  /**
   * Get the current value of a position given the current price.
   */
  getPositionValue(ticker: string, currentPrice: number): {
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  } | null {
    const position = this.getPosition(ticker);

    if (!position) {
      return null;
    }

    const marketValue = position.shares * currentPrice;
    const unrealizedPnL = marketValue - position.totalCost;
    const unrealizedPnLPercent =
      position.totalCost > 0 ? (unrealizedPnL / position.totalCost) * 100 : 0;

    return {
      marketValue,
      unrealizedPnL,
      unrealizedPnLPercent,
    };
  }

  /**
   * Update sector and industry for a position.
   */
  updatePositionMetadata(
    ticker: string,
    metadata: { sector?: string; industry?: string }
  ): Position {
    const normalizedTicker = ticker.toUpperCase();
    const position = this.positions.get(normalizedTicker);

    if (!position) {
      throw new PositionError(
        `No position found for ${normalizedTicker}`,
        'POSITION_NOT_FOUND',
        normalizedTicker
      );
    }

    const updatedPosition: Position = {
      ...position,
      sector: metadata.sector ?? position.sector,
      industry: metadata.industry ?? position.industry,
    };

    this.positions.set(normalizedTicker, updatedPosition);
    this.save();

    return updatedPosition;
  }

  /**
   * Check if a position exists.
   */
  hasPosition(ticker: string): boolean {
    return this.positions.has(ticker.toUpperCase());
  }

  /**
   * Get total number of positions.
   */
  getPositionCount(): number {
    return this.positions.size;
  }
}
