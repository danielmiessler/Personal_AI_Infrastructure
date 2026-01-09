/**
 * Task - Universal work unit for any project type
 */

export type TaskType =
  | 'implementation'  // Code, build, install
  | 'test'           // Write or run tests
  | 'documentation'  // Write docs
  | 'review'         // Security, code, design review
  | 'design'         // Schema, architecture, layout
  | 'procurement'    // Purchase materials
  | 'approval'       // Gate approval
  | 'research';      // Investigation

export type TaskStatus =
  | 'backlog'
  | 'ready'
  | 'in_progress'
  | 'blocked'
  | 'done';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  successCriteria: string;
  parent?: string;           // For subtasks
  blockedBy?: string[];      // Task dependencies
  assignee?: 'human' | 'agent';
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
  completedAt?: string;      // ISO timestamp
}

export interface TaskList {
  projectId: string;
  tasks: Task[];
  progress: number;          // 0-100, calculated
}

/**
 * Calculate progress percentage from tasks
 */
export function calculateProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter(t => t.status === 'done').length;
  return Math.round((completed / tasks.length) * 100);
}

/**
 * Generate a unique task ID
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new task with defaults
 */
export function createTask(
  partial: Partial<Task> & Pick<Task, 'title' | 'type' | 'successCriteria'>
): Task {
  const now = new Date().toISOString();
  return {
    id: generateTaskId(),
    status: 'backlog',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/**
 * Update a task's status
 */
export function updateTaskStatus(task: Task, status: TaskStatus): Task {
  const now = new Date().toISOString();
  return {
    ...task,
    status,
    updatedAt: now,
    completedAt: status === 'done' ? now : task.completedAt,
  };
}

/**
 * Check if a task is blocked by incomplete dependencies
 */
export function isTaskBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.blockedBy || task.blockedBy.length === 0) {
    return false;
  }

  return task.blockedBy.some(depId => {
    const dep = allTasks.find(t => t.id === depId);
    return dep && dep.status !== 'done';
  });
}

/**
 * Get tasks that are ready to work on (not blocked, not done)
 */
export function getReadyTasks(tasks: Task[]): Task[] {
  return tasks.filter(task =>
    task.status !== 'done' &&
    task.status !== 'blocked' &&
    !isTaskBlocked(task, tasks)
  );
}

/**
 * Sort tasks by priority (in_progress first, then ready, then backlog)
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder: Record<TaskStatus, number> = {
    in_progress: 0,
    ready: 1,
    backlog: 2,
    blocked: 3,
    done: 4,
  };

  return [...tasks].sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status]);
}
