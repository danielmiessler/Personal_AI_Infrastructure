/**
 * PositionManager Tests
 *
 * Tests for position management including adding/removing positions,
 * tax lot tracking, and value calculations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PositionManager, PositionError } from '../../src/portfolio/position';

const TEST_DATA_DIR = join(import.meta.dir, '.test-data-position');

describe('PositionManager', () => {
  beforeEach(() => {
    // Clean up any existing test data
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe('initialization', () => {
    it('should create data directory if it does not exist', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      expect(existsSync(TEST_DATA_DIR)).toBe(true);
    });

    it('should start with empty positions', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      expect(manager.getAllPositions()).toEqual([]);
      expect(manager.getPositionCount()).toBe(0);
    });

    it('should load existing positions on initialization', () => {
      // Create a position
      const manager1 = new PositionManager(TEST_DATA_DIR);
      manager1.addPosition('AAPL', 100, 150.0);

      // Create new manager that should load the position
      const manager2 = new PositionManager(TEST_DATA_DIR);
      expect(manager2.getPositionCount()).toBe(1);
      expect(manager2.hasPosition('AAPL')).toBe(true);
    });
  });

  describe('addPosition', () => {
    it('should create a new position with correct properties', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      const purchaseDate = '2024-01-15T10:00:00Z';

      const { position, taxLot } = manager.addPosition('AAPL', 100, 150.0, {
        purchaseDate,
        sector: 'Technology',
        industry: 'Consumer Electronics',
      });

      expect(position.ticker).toBe('AAPL');
      expect(position.shares).toBe(100);
      expect(position.avgCostBasis).toBe(150.0);
      expect(position.totalCost).toBe(15000.0);
      expect(position.taxLots).toHaveLength(1);
      expect(position.openedAt).toBe(purchaseDate);
      expect(position.sector).toBe('Technology');
      expect(position.industry).toBe('Consumer Electronics');
    });

    it('should normalize ticker to uppercase', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('aapl', 100, 150.0);

      expect(manager.hasPosition('AAPL')).toBe(true);
      expect(manager.hasPosition('aapl')).toBe(true);
      expect(manager.getPosition('aapl')?.ticker).toBe('AAPL');
    });

    it('should create a tax lot with correct properties', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      const purchaseDate = '2024-01-15T10:00:00Z';
      const notes = 'Initial purchase';

      const { taxLot } = manager.addPosition('AAPL', 100, 150.0, {
        purchaseDate,
        notes,
      });

      expect(taxLot.id).toMatch(/^lot_/);
      expect(taxLot.shares).toBe(100);
      expect(taxLot.costBasis).toBe(150.0);
      expect(taxLot.purchaseDate).toBe(purchaseDate);
      expect(taxLot.notes).toBe(notes);
    });

    it('should add shares to existing position with new tax lot', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      // First purchase
      manager.addPosition('AAPL', 100, 150.0, {
        purchaseDate: '2024-01-01T10:00:00Z',
      });

      // Second purchase at different price
      const { position } = manager.addPosition('AAPL', 50, 160.0, {
        purchaseDate: '2024-02-01T10:00:00Z',
      });

      expect(position.shares).toBe(150);
      expect(position.totalCost).toBe(23000.0); // 100*150 + 50*160
      expect(position.avgCostBasis).toBeCloseTo(153.33, 2); // 23000/150
      expect(position.taxLots).toHaveLength(2);
    });

    it('should calculate correct average cost basis with multiple lots', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      manager.addPosition('AAPL', 100, 100.0);
      manager.addPosition('AAPL', 100, 200.0);
      manager.addPosition('AAPL', 100, 300.0);

      const position = manager.getPosition('AAPL')!;
      expect(position.shares).toBe(300);
      expect(position.totalCost).toBe(60000.0);
      expect(position.avgCostBasis).toBe(200.0);
    });

    it('should throw error for zero shares', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      expect(() => manager.addPosition('AAPL', 0, 150.0)).toThrow(PositionError);
      expect(() => manager.addPosition('AAPL', 0, 150.0)).toThrow(
        'Shares must be greater than 0'
      );
    });

    it('should throw error for negative shares', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      expect(() => manager.addPosition('AAPL', -10, 150.0)).toThrow(PositionError);
    });

    it('should throw error for zero cost basis', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      expect(() => manager.addPosition('AAPL', 100, 0)).toThrow(PositionError);
      expect(() => manager.addPosition('AAPL', 100, 0)).toThrow(
        'Cost basis must be greater than 0'
      );
    });

    it('should throw error for negative cost basis', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      expect(() => manager.addPosition('AAPL', 100, -50)).toThrow(PositionError);
    });

    it('should update sector/industry on subsequent purchases', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      manager.addPosition('AAPL', 100, 150.0, {
        sector: 'Tech',
      });

      manager.addPosition('AAPL', 50, 160.0, {
        sector: 'Technology',
        industry: 'Consumer Electronics',
      });

      const position = manager.getPosition('AAPL')!;
      expect(position.sector).toBe('Technology');
      expect(position.industry).toBe('Consumer Electronics');
    });
  });

  describe('reducePosition', () => {
    it('should reduce position using FIFO method', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      // Add three lots at different prices
      manager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 150.0, { purchaseDate: '2024-02-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-03-01T10:00:00Z' });

      // Sell 150 shares at $180 using FIFO
      const { soldLots, position } = manager.reducePosition('AAPL', 150, 180.0, 'FIFO');

      expect(soldLots).toHaveLength(2);
      // First lot (oldest) should be fully sold
      expect(soldLots[0].sharesSold).toBe(100);
      expect(soldLots[0].lot.costBasis).toBe(100.0);
      expect(soldLots[0].gainLoss).toBe(8000); // (180-100)*100
      // Second lot should be partially sold
      expect(soldLots[1].sharesSold).toBe(50);
      expect(soldLots[1].lot.costBasis).toBe(150.0);
      expect(soldLots[1].gainLoss).toBe(1500); // (180-150)*50

      expect(position).not.toBeNull();
      expect(position!.shares).toBe(150);
      expect(position!.taxLots).toHaveLength(2);
    });

    it('should reduce position using LIFO method', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      manager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 150.0, { purchaseDate: '2024-02-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-03-01T10:00:00Z' });

      // Sell 150 shares at $180 using LIFO
      const { soldLots, position } = manager.reducePosition('AAPL', 150, 180.0, 'LIFO');

      expect(soldLots).toHaveLength(2);
      // Newest lot should be sold first
      expect(soldLots[0].sharesSold).toBe(100);
      expect(soldLots[0].lot.costBasis).toBe(200.0);
      expect(soldLots[0].gainLoss).toBe(-2000); // (180-200)*100 = loss
      // Second newest partially sold
      expect(soldLots[1].sharesSold).toBe(50);
      expect(soldLots[1].lot.costBasis).toBe(150.0);

      expect(position!.shares).toBe(150);
    });

    it('should reduce position using HIFO method', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      manager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-02-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 150.0, { purchaseDate: '2024-03-01T10:00:00Z' });

      // Sell 150 shares at $180 using HIFO (highest cost first for tax efficiency)
      const { soldLots, position } = manager.reducePosition('AAPL', 150, 180.0, 'HIFO');

      expect(soldLots).toHaveLength(2);
      // Highest cost lot should be sold first
      expect(soldLots[0].sharesSold).toBe(100);
      expect(soldLots[0].lot.costBasis).toBe(200.0);
      // Second highest cost partially sold
      expect(soldLots[1].sharesSold).toBe(50);
      expect(soldLots[1].lot.costBasis).toBe(150.0);

      expect(position!.shares).toBe(150);
    });

    it('should delete position when all shares are sold', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      manager.addPosition('AAPL', 100, 150.0);

      const { position } = manager.reducePosition('AAPL', 100, 180.0, 'FIFO');

      expect(position).toBeNull();
      expect(manager.hasPosition('AAPL')).toBe(false);
      expect(manager.getPositionCount()).toBe(0);
    });

    it('should update average cost basis after partial sale', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      manager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-02-01T10:00:00Z' });

      // Sell 100 shares (all of the $100 lot) using FIFO
      manager.reducePosition('AAPL', 100, 180.0, 'FIFO');

      const position = manager.getPosition('AAPL')!;
      expect(position.shares).toBe(100);
      expect(position.avgCostBasis).toBe(200.0);
      expect(position.totalCost).toBe(20000.0);
    });

    it('should throw error when position does not exist', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      expect(() => manager.reducePosition('AAPL', 100, 180.0, 'FIFO')).toThrow(
        PositionError
      );
      expect(() => manager.reducePosition('AAPL', 100, 180.0, 'FIFO')).toThrow(
        'No position found for AAPL'
      );
    });

    it('should throw error for zero shares', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      expect(() => manager.reducePosition('AAPL', 0, 180.0, 'FIFO')).toThrow(
        PositionError
      );
    });

    it('should throw error when selling more shares than available', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      expect(() => manager.reducePosition('AAPL', 150, 180.0, 'FIFO')).toThrow(
        PositionError
      );
      expect(() => manager.reducePosition('AAPL', 150, 180.0, 'FIFO')).toThrow(
        'Cannot sell 150 shares, only 100 available'
      );
    });

    it('should calculate correct gain/loss for profitable sale', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 100.0);

      const { soldLots } = manager.reducePosition('AAPL', 100, 150.0, 'FIFO');

      expect(soldLots[0].gainLoss).toBe(5000); // (150-100)*100
    });

    it('should calculate correct gain/loss for losing sale', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const { soldLots } = manager.reducePosition('AAPL', 100, 100.0, 'FIFO');

      expect(soldLots[0].gainLoss).toBe(-5000); // (100-150)*100
    });

    it('should default to FIFO when no method specified', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      manager.addPosition('AAPL', 100, 100.0, { purchaseDate: '2024-01-01T10:00:00Z' });
      manager.addPosition('AAPL', 100, 200.0, { purchaseDate: '2024-02-01T10:00:00Z' });

      const { soldLots } = manager.reducePosition('AAPL', 50, 150.0);

      // Should sell from oldest lot first (FIFO default)
      expect(soldLots[0].lot.costBasis).toBe(100.0);
    });
  });

  describe('getPositionValue', () => {
    it('should calculate correct market value', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const value = manager.getPositionValue('AAPL', 180.0);

      expect(value).not.toBeNull();
      expect(value!.marketValue).toBe(18000.0);
    });

    it('should calculate correct unrealized gain', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const value = manager.getPositionValue('AAPL', 180.0);

      expect(value!.unrealizedPnL).toBe(3000.0); // 18000 - 15000
      expect(value!.unrealizedPnLPercent).toBe(20.0); // 3000/15000 * 100
    });

    it('should calculate correct unrealized loss', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const value = manager.getPositionValue('AAPL', 120.0);

      expect(value!.unrealizedPnL).toBe(-3000.0); // 12000 - 15000
      expect(value!.unrealizedPnLPercent).toBe(-20.0);
    });

    it('should return null for non-existent position', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      const value = manager.getPositionValue('AAPL', 180.0);

      expect(value).toBeNull();
    });

    it('should handle case insensitive ticker lookup', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const value = manager.getPositionValue('aapl', 180.0);

      expect(value).not.toBeNull();
      expect(value!.marketValue).toBe(18000.0);
    });
  });

  describe('updatePositionMetadata', () => {
    it('should update sector', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const updated = manager.updatePositionMetadata('AAPL', {
        sector: 'Technology',
      });

      expect(updated.sector).toBe('Technology');
    });

    it('should update industry', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const updated = manager.updatePositionMetadata('AAPL', {
        industry: 'Consumer Electronics',
      });

      expect(updated.industry).toBe('Consumer Electronics');
    });

    it('should update both sector and industry', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      const updated = manager.updatePositionMetadata('AAPL', {
        sector: 'Technology',
        industry: 'Consumer Electronics',
      });

      expect(updated.sector).toBe('Technology');
      expect(updated.industry).toBe('Consumer Electronics');
    });

    it('should preserve existing values when not updating', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0, {
        sector: 'Technology',
        industry: 'Consumer Electronics',
      });

      const updated = manager.updatePositionMetadata('AAPL', {
        sector: 'Tech',
      });

      expect(updated.sector).toBe('Tech');
      expect(updated.industry).toBe('Consumer Electronics');
    });

    it('should throw error for non-existent position', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      expect(() =>
        manager.updatePositionMetadata('AAPL', { sector: 'Technology' })
      ).toThrow(PositionError);
    });

    it('should persist metadata changes', () => {
      const manager1 = new PositionManager(TEST_DATA_DIR);
      manager1.addPosition('AAPL', 100, 150.0);
      manager1.updatePositionMetadata('AAPL', { sector: 'Technology' });

      const manager2 = new PositionManager(TEST_DATA_DIR);
      const position = manager2.getPosition('AAPL');

      expect(position!.sector).toBe('Technology');
    });
  });

  describe('getAllPositions', () => {
    it('should return empty array when no positions', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      expect(manager.getAllPositions()).toEqual([]);
    });

    it('should return all positions', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);
      manager.addPosition('MSFT', 50, 300.0);
      manager.addPosition('GOOGL', 25, 2500.0);

      const positions = manager.getAllPositions();

      expect(positions).toHaveLength(3);
      const tickers = positions.map((p) => p.ticker).sort();
      expect(tickers).toEqual(['AAPL', 'GOOGL', 'MSFT']);
    });
  });

  describe('hasPosition', () => {
    it('should return true for existing position', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      expect(manager.hasPosition('AAPL')).toBe(true);
    });

    it('should return false for non-existent position', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      expect(manager.hasPosition('AAPL')).toBe(false);
    });

    it('should be case insensitive', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);

      expect(manager.hasPosition('aapl')).toBe(true);
      expect(manager.hasPosition('Aapl')).toBe(true);
    });
  });

  describe('getPositionCount', () => {
    it('should return 0 when no positions', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      expect(manager.getPositionCount()).toBe(0);
    });

    it('should return correct count', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);
      manager.addPosition('MSFT', 50, 300.0);

      expect(manager.getPositionCount()).toBe(2);
    });

    it('should update count after removing position', () => {
      const manager = new PositionManager(TEST_DATA_DIR);
      manager.addPosition('AAPL', 100, 150.0);
      manager.addPosition('MSFT', 50, 300.0);
      manager.reducePosition('AAPL', 100, 180.0, 'FIFO');

      expect(manager.getPositionCount()).toBe(1);
    });
  });

  describe('PositionError', () => {
    it('should have correct error properties', () => {
      const manager = new PositionManager(TEST_DATA_DIR);

      try {
        manager.reducePosition('AAPL', 100, 180.0, 'FIFO');
      } catch (error) {
        expect(error).toBeInstanceOf(PositionError);
        expect((error as PositionError).code).toBe('POSITION_NOT_FOUND');
        expect((error as PositionError).ticker).toBe('AAPL');
        expect((error as PositionError).name).toBe('PositionError');
      }
    });
  });
});
