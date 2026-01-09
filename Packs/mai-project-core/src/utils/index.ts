/**
 * Utility exports for mai-project-core
 *
 * Re-exports utility functions from type modules for convenience.
 * Primary utilities are defined in their respective type files.
 */

// Task utilities
export {
  calculateProgress,
  createTask,
  updateTaskStatus,
  isTaskBlocked,
  getReadyTasks,
  sortTasksByPriority,
} from '../types/task.ts';

// Gate utilities
export {
  createGatesForProject,
  approveGate,
  rejectGate,
  allGatesApproved,
  getNextPendingGate,
  getCurrentPhase,
} from '../types/gate.ts';

// Budget utilities
export {
  createBudgetItem,
  calculateSpent,
  calculateRemaining,
  isOverBudget,
  calculateEstimatedTotal,
  calculateMonthlySoftwareCost,
  calculateAnnualSoftwareCost,
  updateBudgetItemStatus,
  createPhysicalBudget,
  createSoftwareBudget,
} from '../types/budget.ts';

// Project utilities
export {
  createProjectState,
  updateProjectPhase,
  serializeProjectState,
} from '../types/project.ts';

// Template utilities
export {
  loadTemplate,
  renderTemplate,
  formatGatesTable,
  generateClaudeMd,
  generateLocalMd,
} from '../templates/index.ts';

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Generate a short ID
 */
export function generateShortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Safely parse JSON with a default
 */
export function safeParseJson<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}
