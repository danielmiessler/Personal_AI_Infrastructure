/**
 * Issue types for the Issues domain
 */

export type IssueStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type IssueType = 'task' | 'bug' | 'feature' | 'story' | 'epic';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface Label {
  id: string;
  name: string;
  color?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: IssueStatus;
  type: IssueType;
  priority?: IssuePriority;
  labels: Label[];
  assignee?: string;
  project?: Project;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  /** Backend-specific data */
  metadata?: Record<string, unknown>;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  labels?: string[];
  assignee?: string;
  projectId?: string;
  dueDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignee?: string;
  dueDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface IssueQuery {
  status?: IssueStatus | IssueStatus[];
  type?: IssueType | IssueType[];
  priority?: IssuePriority | IssuePriority[];
  assignee?: string;
  projectId?: string;
  labels?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  projectId?: string;
  status?: IssueStatus[];
  limit?: number;
}

export interface HealthStatus {
  healthy: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}
