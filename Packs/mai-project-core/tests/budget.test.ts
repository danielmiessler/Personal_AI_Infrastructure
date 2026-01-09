import { describe, test, expect } from 'bun:test';
import {
  createBudgetItem,
  createPhysicalBudget,
  createSoftwareBudget,
  calculateSpent,
  calculateRemaining,
  isOverBudget,
  calculateEstimatedTotal,
  calculateMonthlySoftwareCost,
  calculateAnnualSoftwareCost,
  updateBudgetItemStatus,
  type PhysicalBudget,
  type SoftwareBudget,
} from '../src/types/budget.ts';

describe('Budget', () => {
  describe('createBudgetItem', () => {
    test('creates item with required fields', () => {
      const item = createBudgetItem({
        name: 'Lumber',
        estimated: 150.00,
      });

      expect(item.name).toBe('Lumber');
      expect(item.estimated).toBe(150.00);
      expect(item.status).toBe('pending');
      expect(item.id).toMatch(/^item-\d+-[a-z0-9]+$/);
    });

    test('allows setting status', () => {
      const item = createBudgetItem({
        name: 'Screws',
        estimated: 25.00,
        status: 'purchased',
      });

      expect(item.status).toBe('purchased');
    });
  });

  describe('createPhysicalBudget', () => {
    test('creates empty physical budget', () => {
      const budget = createPhysicalBudget(1000);

      expect(budget.type).toBe('physical');
      expect(budget.allocated).toBe(1000);
      expect(budget.spent).toBe(0);
      expect(budget.items).toEqual([]);
    });
  });

  describe('createSoftwareBudget', () => {
    test('creates empty software budget', () => {
      const budget = createSoftwareBudget();

      expect(budget.type).toBe('software');
      expect(budget.infrastructure).toEqual([]);
      expect(budget.licensing).toEqual([]);
    });
  });

  describe('calculateSpent', () => {
    test('sums actual costs', () => {
      const budget: PhysicalBudget = {
        type: 'physical',
        allocated: 1000,
        spent: 0,
        items: [
          { id: '1', name: 'A', estimated: 100, actual: 95, status: 'received' },
          { id: '2', name: 'B', estimated: 200, actual: 210, status: 'received' },
          { id: '3', name: 'C', estimated: 150, status: 'pending' },
        ],
      };

      expect(calculateSpent(budget)).toBe(305);
    });

    test('returns 0 when no actuals', () => {
      const budget = createPhysicalBudget(1000);

      expect(calculateSpent(budget)).toBe(0);
    });
  });

  describe('calculateRemaining', () => {
    test('calculates remaining budget', () => {
      const budget: PhysicalBudget = {
        type: 'physical',
        allocated: 1000,
        spent: 300,
        items: [
          { id: '1', name: 'A', estimated: 100, actual: 300, status: 'received' },
        ],
      };

      expect(calculateRemaining(budget)).toBe(700);
    });
  });

  describe('isOverBudget', () => {
    test('returns true when over budget', () => {
      const budget: PhysicalBudget = {
        type: 'physical',
        allocated: 100,
        spent: 150,
        items: [
          { id: '1', name: 'A', estimated: 100, actual: 150, status: 'received' },
        ],
      };

      expect(isOverBudget(budget)).toBe(true);
    });

    test('returns false when under budget', () => {
      const budget: PhysicalBudget = {
        type: 'physical',
        allocated: 200,
        spent: 100,
        items: [
          { id: '1', name: 'A', estimated: 100, actual: 100, status: 'received' },
        ],
      };

      expect(isOverBudget(budget)).toBe(false);
    });
  });

  describe('calculateEstimatedTotal', () => {
    test('sums estimated costs', () => {
      const budget: PhysicalBudget = {
        type: 'physical',
        allocated: 1000,
        spent: 0,
        items: [
          { id: '1', name: 'A', estimated: 100, status: 'pending' },
          { id: '2', name: 'B', estimated: 200, status: 'pending' },
          { id: '3', name: 'C', estimated: 150, status: 'pending' },
        ],
      };

      expect(calculateEstimatedTotal(budget)).toBe(450);
    });
  });

  describe('calculateMonthlySoftwareCost', () => {
    test('calculates monthly costs', () => {
      const budget: SoftwareBudget = {
        type: 'software',
        infrastructure: [
          { name: 'AWS', monthly: 50 },
          { name: 'Hosting', annual: 120 },
        ],
        licensing: [
          { name: 'IDE', monthly: 20 },
        ],
      };

      expect(calculateMonthlySoftwareCost(budget)).toBe(80);
    });
  });

  describe('calculateAnnualSoftwareCost', () => {
    test('calculates annual costs', () => {
      const budget: SoftwareBudget = {
        type: 'software',
        infrastructure: [
          { name: 'AWS', monthly: 100 },
        ],
        licensing: [],
      };

      expect(calculateAnnualSoftwareCost(budget)).toBe(1200);
    });
  });

  describe('updateBudgetItemStatus', () => {
    test('updates item status and recalculates spent', () => {
      const budget: PhysicalBudget = {
        type: 'physical',
        allocated: 1000,
        spent: 0,
        items: [
          { id: 'item-1', name: 'A', estimated: 100, status: 'pending' },
        ],
      };

      const updated = updateBudgetItemStatus(budget, 'item-1', 'received', 95);

      expect(updated.items[0].status).toBe('received');
      expect(updated.items[0].actual).toBe(95);
      expect(updated.spent).toBe(95);
    });
  });
});
