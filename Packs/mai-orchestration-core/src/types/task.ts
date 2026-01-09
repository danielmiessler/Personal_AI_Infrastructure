/**
 * Task Farming Types
 *
 * Types for defining and managing farm tasks.
 */

export type TaskType = 'implementation' | 'test' | 'review' | 'research';
export type TaskPriority = 'high' | 'normal' | 'low';
export type ResultStatus = 'success' | 'failure' | 'blocked';

export interface FarmTask {
  taskId: string;
  type: TaskType;
  description: string;
  context: string[];
  constraints: string[];
  successCriteria: string;
  priority?: TaskPriority;
  timeout?: number;
}

export interface FarmResult {
  taskId: string;
  agentId: string;
  status: ResultStatus;
  output: string;
  artifacts?: string[];
  issues?: string[];
  duration?: number;
}

/**
 * Create a new farm task
 */
export function createFarmTask(
  type: TaskType,
  description: string,
  successCriteria: string,
  options?: {
    context?: string[];
    constraints?: string[];
    priority?: TaskPriority;
    timeout?: number;
  }
): FarmTask {
  return {
    taskId: generateTaskId(),
    type,
    description,
    successCriteria,
    context: options?.context || [],
    constraints: options?.constraints || [],
    priority: options?.priority,
    timeout: options?.timeout,
  };
}

/**
 * Create a farm result
 */
export function createFarmResult(
  taskId: string,
  agentId: string,
  status: ResultStatus,
  output: string,
  options?: {
    artifacts?: string[];
    issues?: string[];
    duration?: number;
  }
): FarmResult {
  return {
    taskId,
    agentId,
    status,
    output,
    artifacts: options?.artifacts,
    issues: options?.issues,
    duration: options?.duration,
  };
}

/**
 * Generate a unique task ID
 */
function generateTaskId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task-${timestamp}-${random}`;
}

/**
 * Check if a result indicates success
 */
export function isSuccessResult(result: FarmResult): boolean {
  return result.status === 'success';
}

/**
 * Get priority order value (for sorting)
 */
export function getPriorityOrder(priority?: TaskPriority): number {
  switch (priority) {
    case 'high':
      return 0;
    case 'normal':
      return 1;
    case 'low':
      return 2;
    default:
      return 1; // Default to normal
  }
}

/**
 * Sort tasks by priority
 */
export function sortByPriority(tasks: FarmTask[]): FarmTask[] {
  return [...tasks].sort(
    (a, b) => getPriorityOrder(a.priority) - getPriorityOrder(b.priority)
  );
}
