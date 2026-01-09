/**
 * Type exports for mai-project-core
 */

// Task types
export type {
  TaskType,
  TaskStatus,
  Task,
  TaskList,
} from './task.ts';

export {
  calculateProgress,
  createTask,
  updateTaskStatus,
  isTaskBlocked,
  getReadyTasks,
  sortTasksByPriority,
} from './task.ts';

// Gate types
export type {
  GateStatus,
  Gate,
  SoftwareGate,
  PhysicalGate,
  DocumentationGate,
  InfrastructureGate,
} from './gate.ts';

export {
  GATE_CONFIGS,
  createGatesForProject,
  approveGate,
  rejectGate,
  allGatesApproved,
  getNextPendingGate,
  getCurrentPhase,
} from './gate.ts';

// Budget types
export type {
  BudgetItemStatus,
  BudgetItem,
  PhysicalBudget,
  SoftwareBudget,
  Budget,
} from './budget.ts';

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
} from './budget.ts';

// Project types
export type {
  ProjectType,
  ProjectPhase,
  ProjectIdentity,
  ProjectState,
  SoftwareProjectState,
  PhysicalProjectState,
  DocumentationProjectState,
  InfrastructureProjectState,
} from './project.ts';

export {
  createProjectState,
  updateProjectPhase,
  PROJECT_STATE_FILE,
  serializeProjectState,
} from './project.ts';
