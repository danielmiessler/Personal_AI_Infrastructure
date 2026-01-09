/**
 * Budget - Cost tracking for projects
 */

export type BudgetItemStatus = 'pending' | 'approved' | 'purchased' | 'received';

export interface BudgetItem {
  id: string;
  name: string;
  estimated: number;
  actual?: number;
  status: BudgetItemStatus;
  notes?: string;
  link?: string;            // Purchase link
  vendor?: string;
}

export interface PhysicalBudget {
  type: 'physical';
  allocated: number;
  spent: number;              // Calculated from items
  items: BudgetItem[];
}

export interface SoftwareBudget {
  type: 'software';
  infrastructure: Array<{
    name: string;
    monthly?: number;
    annual?: number;
    notes?: string;
  }>;
  licensing: Array<{
    name: string;
    monthly?: number;
    annual?: number;
    notes?: string;
  }>;
}

export type Budget = PhysicalBudget | SoftwareBudget;

/**
 * Generate a unique budget item ID
 */
function generateBudgetItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new budget item
 */
export function createBudgetItem(
  partial: Partial<BudgetItem> & Pick<BudgetItem, 'name' | 'estimated'>
): BudgetItem {
  return {
    id: generateBudgetItemId(),
    status: 'pending',
    ...partial,
  };
}

/**
 * Calculate total spent from physical budget items
 */
export function calculateSpent(budget: PhysicalBudget): number {
  return budget.items
    .filter(item => item.actual !== undefined)
    .reduce((sum, item) => sum + (item.actual || 0), 0);
}

/**
 * Calculate remaining budget
 */
export function calculateRemaining(budget: PhysicalBudget): number {
  return budget.allocated - calculateSpent(budget);
}

/**
 * Check if over budget
 */
export function isOverBudget(budget: PhysicalBudget): boolean {
  return calculateSpent(budget) > budget.allocated;
}

/**
 * Calculate total estimated cost
 */
export function calculateEstimatedTotal(budget: PhysicalBudget): number {
  return budget.items.reduce((sum, item) => sum + item.estimated, 0);
}

/**
 * Calculate monthly software costs
 */
export function calculateMonthlySoftwareCost(budget: SoftwareBudget): number {
  const infraMonthly = budget.infrastructure.reduce((sum, item) => {
    if (item.monthly) return sum + item.monthly;
    if (item.annual) return sum + (item.annual / 12);
    return sum;
  }, 0);

  const licenseMonthly = budget.licensing.reduce((sum, item) => {
    if (item.monthly) return sum + item.monthly;
    if (item.annual) return sum + (item.annual / 12);
    return sum;
  }, 0);

  return infraMonthly + licenseMonthly;
}

/**
 * Calculate annual software costs
 */
export function calculateAnnualSoftwareCost(budget: SoftwareBudget): number {
  return calculateMonthlySoftwareCost(budget) * 12;
}

/**
 * Update budget item status
 */
export function updateBudgetItemStatus(
  budget: PhysicalBudget,
  itemId: string,
  status: BudgetItemStatus,
  actual?: number
): PhysicalBudget {
  const items = budget.items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        status,
        actual: actual ?? item.actual,
      };
    }
    return item;
  });

  return {
    ...budget,
    items,
    spent: calculateSpent({ ...budget, items }),
  };
}

/**
 * Create an empty physical budget
 */
export function createPhysicalBudget(allocated: number): PhysicalBudget {
  return {
    type: 'physical',
    allocated,
    spent: 0,
    items: [],
  };
}

/**
 * Create an empty software budget
 */
export function createSoftwareBudget(): SoftwareBudget {
  return {
    type: 'software',
    infrastructure: [],
    licensing: [],
  };
}
