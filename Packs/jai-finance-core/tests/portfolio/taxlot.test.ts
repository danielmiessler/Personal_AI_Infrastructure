/**
 * TaxLotTracker Tests
 *
 * Tests for tax lot tracking, gain/loss calculations,
 * holding period classification, and lot selection methods.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PositionManager } from '../../src/portfolio/position';
import { TaxLotTracker } from '../../src/portfolio/taxlot';
import type { TaxLot } from '../../src/portfolio/types';

const TEST_DATA_DIR = join(import.meta.dir, '.test-data-taxlot');

describe('TaxLotTracker', () => {
  let positionManager: PositionManager;
  let tracker: TaxLotTracker;

  beforeEach(() => {
    // Clean up any existing test data
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }

    positionManager = new PositionManager(TEST_DATA_DIR);
    tracker = new TaxLotTracker(positionManager);
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe('getLots', () => {
    it('should return empty array when no positions exist', () => {
      const lots = tracker.getLots();
      expect(lots).toEqual([]);
    });

    it('should return all lots across all positions', () => {
      positionManager.addPosition('AAPL', 100, 150.0);
      positionManager.addPosition('AAPL', 50, 160.0);
      positionManager.addPosition('MSFT', 75, 300.0);

      const lots = tracker.getLots();

      expect(lots).toHaveLength(3);
      const aaplLots = lots.filter((l) => l.ticker === 'AAPL');
      const msftLots = lots.filter((l) => l.ticker === 'MSFT');
      expect(aaplLots).toHaveLength(2);
      expect(msftLots).toHaveLength(1);
    });

    it('should include ticker in each lot', () => {
      positionManager.addPosition('AAPL', 100, 150.0);

      const lots = tracker.getLots();

      expect(lots[0].ticker).toBe('AAPL');
      expect(lots[0].shares).toBe(100);
      expect(lots[0].costBasis).toBe(150.0);
    });
  });

  describe('getLotsForTicker', () => {
    it('should return empty array for non-existent ticker', () => {
      const lots = tracker.getLotsForTicker('AAPL');
      expect(lots).toEqual([]);
    });

    it('should return all lots for a specific ticker', () => {
      positionManager.addPosition('AAPL', 100, 150.0);
      positionManager.addPosition('AAPL', 50, 160.0);
      positionManager.addPosition('MSFT', 75, 300.0);

      const lots = tracker.getLotsForTicker('AAPL');

      expect(lots).toHaveLength(2);
      expect(lots[0].shares).toBe(100);
      expect(lots[1].shares).toBe(50);
    });

    it('should be case insensitive', () => {
      positionManager.addPosition('AAPL', 100, 150.0);

      const lots = tracker.getLotsForTicker('aapl');

      expect(lots).toHaveLength(1);
    });
  });

  describe('getLotById', () => {
    it('should return undefined for non-existent lot ID', () => {
      const lot = tracker.getLotById('lot_nonexistent');
      expect(lot).toBeUndefined();
    });

    it('should find lot by ID across all positions', () => {
      const { taxLot: aaplLot } = positionManager.addPosition('AAPL', 100, 150.0);
      positionManager.addPosition('MSFT', 75, 300.0);

      const foundLot = tracker.getLotById(aaplLot.id);

      expect(foundLot).not.toBeUndefined();
      expect(foundLot!.id).toBe(aaplLot.id);
      expect(foundLot!.ticker).toBe('AAPL');
      expect(foundLot!.shares).toBe(100);
    });
  });

  describe('calculateGainLoss', () => {
    it('should calculate unrealized gain correctly', () => {
      const lot: TaxLot = {
        id: 'test_lot',
        shares: 100,
        costBasis: 100.0,
        purchaseDate: '2024-01-01T10:00:00Z',
      };

      const result = tracker.calculateGainLoss(lot, 150.0);

      expect(result.costBasis).toBe(10000.0); // 100 * 100
      expect(result.currentValue).toBe(15000.0); // 100 * 150
      expect(result.unrealizedGainLoss).toBe(5000.0);
      expect(result.unrealizedGainLossPercent).toBe(50.0);
    });

    it('should calculate unrealized loss correctly', () => {
      const lot: TaxLot = {
        id: 'test_lot',
        shares: 100,
        costBasis: 150.0,
        purchaseDate: '2024-01-01T10:00:00Z',
      };

      const result = tracker.calculateGainLoss(lot, 100.0);

      expect(result.costBasis).toBe(15000.0);
      expect(result.currentValue).toBe(10000.0);
      expect(result.unrealizedGainLoss).toBe(-5000.0);
      expect(result.unrealizedGainLossPercent).toBeCloseTo(-33.33, 2);
    });

    it('should handle zero cost basis', () => {
      const lot: TaxLot = {
        id: 'test_lot',
        shares: 100,
        costBasis: 0,
        purchaseDate: '2024-01-01T10:00:00Z',
      };

      const result = tracker.calculateGainLoss(lot, 100.0);

      expect(result.unrealizedGainLossPercent).toBe(0);
    });

    it('should classify holding period correctly', () => {
      const shortTermLot: TaxLot = {
        id: 'short_term',
        shares: 100,
        costBasis: 100.0,
        purchaseDate: new Date().toISOString(), // Today
      };

      const result = tracker.calculateGainLoss(shortTermLot, 150.0);
      expect(result.holdingPeriod).toBe('short-term');
    });
  });

  describe('getHoldingPeriod', () => {
    it('should return short-term for lot held less than 1 year', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const lot: TaxLot = {
        id: 'test_lot',
        shares: 100,
        costBasis: 100.0,
        purchaseDate: sixMonthsAgo.toISOString(),
      };

      expect(tracker.getHoldingPeriod(lot)).toBe('short-term');
    });

    it('should return short-term for lot held exactly 1 year', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const lot: TaxLot = {
        id: 'test_lot',
        shares: 100,
        costBasis: 100.0,
        purchaseDate: oneYearAgo.toISOString(),
      };

      // Exactly 1 year is still short-term (needs to be MORE than 1 year)
      expect(tracker.getHoldingPeriod(lot)).toBe('short-term');
    });

    it('should return long-term for lot held more than 1 year', () => {
      const overOneYearAgo = new Date();
      overOneYearAgo.setFullYear(overOneYearAgo.getFullYear() - 1);
      overOneYearAgo.setDate(overOneYearAgo.getDate() - 1);

      const lot: TaxLot = {
        id: 'test_lot',
        shares: 100,
        costBasis: 100.0,
        purchaseDate: overOneYearAgo.toISOString(),
      };

      expect(tracker.getHoldingPeriod(lot)).toBe('long-term');
    });

    it('should return long-term for lot held 2 years', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const lot: TaxLot = {
        id: 'test_lot',
        shares: 100,
        costBasis: 100.0,
        purchaseDate: twoYearsAgo.toISOString(),
      };

      expect(tracker.getHoldingPeriod(lot)).toBe('long-term');
    });
  });

  describe('getLongTermLots', () => {
    it('should return empty array when no long-term lots', () => {
      positionManager.addPosition('AAPL', 100, 150.0);

      const longTermLots = tracker.getLongTermLots();

      expect(longTermLots).toEqual([]);
    });

    it('should return only long-term lots', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      positionManager.addPosition('AAPL', 100, 150.0, {
        purchaseDate: twoYearsAgo.toISOString(),
      });
      positionManager.addPosition('AAPL', 50, 160.0); // Recent purchase

      const longTermLots = tracker.getLongTermLots();

      expect(longTermLots).toHaveLength(1);
      expect(longTermLots[0].shares).toBe(100);
    });
  });

  describe('getShortTermLots', () => {
    it('should return all recent purchases', () => {
      positionManager.addPosition('AAPL', 100, 150.0);
      positionManager.addPosition('MSFT', 50, 300.0);

      const shortTermLots = tracker.getShortTermLots();

      expect(shortTermLots).toHaveLength(2);
    });

    it('should exclude long-term lots', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      positionManager.addPosition('AAPL', 100, 150.0, {
        purchaseDate: twoYearsAgo.toISOString(),
      });
      positionManager.addPosition('AAPL', 50, 160.0);

      const shortTermLots = tracker.getShortTermLots();

      expect(shortTermLots).toHaveLength(1);
      expect(shortTermLots[0].shares).toBe(50);
    });
  });

  describe('getLotsByGainLoss', () => {
    it('should return empty array for non-existent ticker', () => {
      const result = tracker.getLotsByGainLoss('AAPL', 150.0);
      expect(result).toEqual([]);
    });

    it('should sort lots by gain/loss ascending (default)', () => {
      positionManager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01' });
      positionManager.addPosition('AAPL', 100, 150.0, { purchaseDate: '2024-02-01' });
      positionManager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-03-01' });

      // Current price $175
      const result = tracker.getLotsByGainLoss('AAPL', 175.0, 'asc');

      // $200 lot has -$2500 loss, $150 lot has +$2500 gain, $100 lot has +$7500 gain
      expect(result).toHaveLength(3);
      expect(result[0].gainLoss.unrealizedGainLoss).toBe(-2500); // 200 -> 175
      expect(result[1].gainLoss.unrealizedGainLoss).toBe(2500); // 150 -> 175
      expect(result[2].gainLoss.unrealizedGainLoss).toBe(7500); // 100 -> 175
    });

    it('should sort lots by gain/loss descending', () => {
      positionManager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01' });
      positionManager.addPosition('AAPL', 100, 150.0, { purchaseDate: '2024-02-01' });
      positionManager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-03-01' });

      const result = tracker.getLotsByGainLoss('AAPL', 175.0, 'desc');

      expect(result[0].gainLoss.unrealizedGainLoss).toBe(7500);
      expect(result[1].gainLoss.unrealizedGainLoss).toBe(2500);
      expect(result[2].gainLoss.unrealizedGainLoss).toBe(-2500);
    });
  });

  describe('getLotsWithLosses', () => {
    it('should return empty array when no losses', () => {
      positionManager.addPosition('AAPL', 100, 100.0);

      const prices = new Map([['AAPL', 150.0]]);
      const result = tracker.getLotsWithLosses(prices);

      expect(result).toEqual([]);
    });

    it('should return lots with unrealized losses', () => {
      positionManager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-01-01' });
      positionManager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-02-01' });
      positionManager.addPosition('MSFT', 50, 400.0, { purchaseDate: '2024-03-01' });

      const prices = new Map([
        ['AAPL', 150.0], // AAPL at $200 has loss, AAPL at $100 has gain
        ['MSFT', 350.0], // MSFT has loss
      ]);

      const result = tracker.getLotsWithLosses(prices);

      expect(result).toHaveLength(2);
      // Should include AAPL $200 lot (loss) and MSFT lot (loss)
      const tickers = result.map((r) => r.lot.ticker);
      expect(tickers).toContain('AAPL');
      expect(tickers).toContain('MSFT');
    });

    it('should sort by largest loss first', () => {
      positionManager.addPosition('AAPL', 100, 200.0);
      positionManager.addPosition('MSFT', 100, 400.0);

      const prices = new Map([
        ['AAPL', 150.0], // -$5000 loss
        ['MSFT', 300.0], // -$10000 loss
      ]);

      const result = tracker.getLotsWithLosses(prices);

      expect(result).toHaveLength(2);
      expect(result[0].lot.ticker).toBe('MSFT'); // Larger loss first
      expect(result[0].gainLoss.unrealizedGainLoss).toBe(-10000);
      expect(result[1].lot.ticker).toBe('AAPL');
      expect(result[1].gainLoss.unrealizedGainLoss).toBe(-5000);
    });

    it('should skip tickers without prices', () => {
      positionManager.addPosition('AAPL', 100, 200.0);
      positionManager.addPosition('MSFT', 100, 400.0);

      const prices = new Map([['AAPL', 150.0]]); // No MSFT price

      const result = tracker.getLotsWithLosses(prices);

      expect(result).toHaveLength(1);
      expect(result[0].lot.ticker).toBe('AAPL');
    });
  });

  describe('getTotalGainLossForTicker', () => {
    it('should return null for non-existent ticker', () => {
      const result = tracker.getTotalGainLossForTicker('AAPL', 150.0);
      expect(result).toBeNull();
    });

    it('should calculate total gain/loss correctly', () => {
      positionManager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01' });
      positionManager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-02-01' });

      const result = tracker.getTotalGainLossForTicker('AAPL', 150.0);

      expect(result).not.toBeNull();
      expect(result!.totalCostBasis).toBe(30000); // 100*100 + 100*200
      expect(result!.totalCurrentValue).toBe(30000); // 200*150
      expect(result!.totalUnrealizedGainLoss).toBe(0);
      expect(result!.totalUnrealizedGainLossPercent).toBe(0);
    });

    it('should separate short-term and long-term gains', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      positionManager.addPosition('AAPL', 100, 100.0, {
        purchaseDate: twoYearsAgo.toISOString(), // Long-term
      });
      positionManager.addPosition('AAPL', 100, 100.0); // Short-term

      const result = tracker.getTotalGainLossForTicker('AAPL', 150.0);

      expect(result!.longTermGainLoss).toBe(5000); // 100 * (150-100)
      expect(result!.shortTermGainLoss).toBe(5000); // 100 * (150-100)
    });

    it('should handle positions with mixed gains and losses', () => {
      positionManager.addPosition('AAPL', 100, 100.0);
      positionManager.addPosition('AAPL', 100, 200.0);

      const result = tracker.getTotalGainLossForTicker('AAPL', 150.0);

      // First lot: +$5000, Second lot: -$5000
      expect(result!.shortTermGainLoss).toBe(0);
    });
  });

  describe('getOldestLot', () => {
    it('should return undefined for non-existent ticker', () => {
      const lot = tracker.getOldestLot('AAPL');
      expect(lot).toBeUndefined();
    });

    it('should return the oldest lot', () => {
      positionManager.addPosition('AAPL', 100, 100.0, {
        purchaseDate: '2024-03-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 50, 150.0, {
        purchaseDate: '2024-01-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 75, 200.0, {
        purchaseDate: '2024-02-01T10:00:00Z',
      });

      const oldest = tracker.getOldestLot('AAPL');

      expect(oldest).not.toBeUndefined();
      expect(oldest!.shares).toBe(50);
      expect(oldest!.costBasis).toBe(150.0);
      expect(oldest!.purchaseDate).toBe('2024-01-01T10:00:00Z');
    });

    it('should handle single lot', () => {
      positionManager.addPosition('AAPL', 100, 150.0, {
        purchaseDate: '2024-01-01T10:00:00Z',
      });

      const oldest = tracker.getOldestLot('AAPL');

      expect(oldest!.shares).toBe(100);
    });
  });

  describe('getNewestLot', () => {
    it('should return undefined for non-existent ticker', () => {
      const lot = tracker.getNewestLot('AAPL');
      expect(lot).toBeUndefined();
    });

    it('should return the newest lot', () => {
      positionManager.addPosition('AAPL', 100, 100.0, {
        purchaseDate: '2024-01-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 50, 150.0, {
        purchaseDate: '2024-03-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 75, 200.0, {
        purchaseDate: '2024-02-01T10:00:00Z',
      });

      const newest = tracker.getNewestLot('AAPL');

      expect(newest).not.toBeUndefined();
      expect(newest!.shares).toBe(50);
      expect(newest!.costBasis).toBe(150.0);
      expect(newest!.purchaseDate).toBe('2024-03-01T10:00:00Z');
    });
  });

  describe('getHighestCostLot', () => {
    it('should return undefined for non-existent ticker', () => {
      const lot = tracker.getHighestCostLot('AAPL');
      expect(lot).toBeUndefined();
    });

    it('should return the lot with highest cost basis', () => {
      positionManager.addPosition('AAPL', 100, 100.0, {
        purchaseDate: '2024-01-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 50, 200.0, {
        purchaseDate: '2024-02-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 75, 150.0, {
        purchaseDate: '2024-03-01T10:00:00Z',
      });

      const highest = tracker.getHighestCostLot('AAPL');

      expect(highest).not.toBeUndefined();
      expect(highest!.shares).toBe(50);
      expect(highest!.costBasis).toBe(200.0);
    });

    it('should handle lots with equal cost basis', () => {
      positionManager.addPosition('AAPL', 100, 150.0, {
        purchaseDate: '2024-01-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 50, 150.0, {
        purchaseDate: '2024-02-01T10:00:00Z',
      });

      const highest = tracker.getHighestCostLot('AAPL');

      // Either lot is valid since they have the same cost basis
      expect(highest!.costBasis).toBe(150.0);
    });
  });

  describe('integration scenarios', () => {
    it('should correctly track tax lots for tax loss harvesting analysis', () => {
      // Build up a position over time with various cost bases
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      // Short-term lot (6 months ago)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      positionManager.addPosition('VTI', 100, 200.0, {
        purchaseDate: twoYearsAgo.toISOString(),
      });
      positionManager.addPosition('VTI', 50, 220.0, {
        purchaseDate: sixMonthsAgo.toISOString(),
      });
      positionManager.addPosition('VTI', 75, 180.0);

      // Current price dropped to $190
      const prices = new Map([['VTI', 190.0]]);

      // Find lots with losses for tax loss harvesting
      const lotsWithLosses = tracker.getLotsWithLosses(prices);

      // The $220 lot has a loss, and the $200 lot has a loss
      expect(lotsWithLosses.length).toBeGreaterThanOrEqual(1);

      const losers220 = lotsWithLosses.filter((l) => l.lot.costBasis === 220.0);
      expect(losers220).toHaveLength(1);
      expect(losers220[0].gainLoss.unrealizedGainLoss).toBe(-1500); // 50 * (190-220)

      // Get total breakdown
      const totals = tracker.getTotalGainLossForTicker('VTI', 190.0);
      expect(totals).not.toBeNull();

      // Long-term lot ($200) has -$1000 loss: 100 * (190 - 200)
      expect(totals!.longTermGainLoss).toBe(-1000);
      // Short-term: $220 lot has -$1500 loss, $180 lot has +$750 gain = -$750 net
      expect(totals!.shortTermGainLoss).toBe(-750);
    });

    it('should support FIFO/LIFO/HIFO lot selection previews', () => {
      positionManager.addPosition('AAPL', 100, 100.0, {
        purchaseDate: '2024-01-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 100, 200.0, {
        purchaseDate: '2024-02-01T10:00:00Z',
      });
      positionManager.addPosition('AAPL', 100, 150.0, {
        purchaseDate: '2024-03-01T10:00:00Z',
      });

      // FIFO preview
      const oldest = tracker.getOldestLot('AAPL');
      expect(oldest!.costBasis).toBe(100.0);

      // LIFO preview
      const newest = tracker.getNewestLot('AAPL');
      expect(newest!.costBasis).toBe(150.0);

      // HIFO preview
      const highest = tracker.getHighestCostLot('AAPL');
      expect(highest!.costBasis).toBe(200.0);
    });
  });
});
