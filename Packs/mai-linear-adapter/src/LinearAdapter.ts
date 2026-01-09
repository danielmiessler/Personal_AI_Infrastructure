/**
 * LinearAdapter - Implements IssuesProvider using Linear's GraphQL API
 */

import type {
  IssuesProvider,
  Issue,
  Project,
  Label,
  CreateIssueInput,
  UpdateIssueInput,
  IssueQuery,
  SearchOptions,
  HealthStatus,
  IssueStatus,
  IssueType,
  IssuePriority,
} from 'mai-issues-core';
import {
  IssueNotFoundError,
  ProjectNotFoundError,
  LabelNotFoundError,
  withRetry,
} from 'mai-issues-core';
import { LinearClient, LinearError, type LinearIssue, type LinearProject, type LinearLabel } from './LinearClient.ts';

/**
 * Configuration for LinearAdapter
 */
export interface LinearConfig {
  /** Linear team ID (required) */
  teamId: string;
  /** Linear API URL (default: https://api.linear.app/graphql) */
  apiUrl?: string;
}

// Linear state type to IssueStatus mapping
const STATE_TYPE_MAP: Record<string, IssueStatus> = {
  'backlog': 'open',
  'unstarted': 'open',
  'triage': 'open',
  'started': 'in_progress',
  'completed': 'done',
  'canceled': 'cancelled',
};

// Linear priority to IssuePriority mapping (0 = no priority, 1 = urgent, 4 = low)
const PRIORITY_MAP: Record<number, IssuePriority> = {
  0: 'none',
  1: 'urgent',
  2: 'high',
  3: 'medium',
  4: 'low',
};

const PRIORITY_REVERSE_MAP: Record<IssuePriority, number> = {
  'none': 0,
  'urgent': 1,
  'high': 2,
  'medium': 3,
  'low': 4,
};

/**
 * LinearAdapter - Use Linear for project management
 */
export default class LinearAdapter implements IssuesProvider {
  readonly name = 'linear';
  readonly version = '1.0.0';

  private client: LinearClient;
  private statesCache: Array<{ id: string; name: string; type: string }> | null = null;

  constructor(config: LinearConfig) {
    if (!config.teamId) {
      throw new Error('LinearAdapter requires teamId configuration');
    }
    this.client = new LinearClient(config.teamId, config.apiUrl);
  }

  /**
   * Get workflow states (cached)
   */
  private async getStates(): Promise<Array<{ id: string; name: string; type: string }>> {
    if (!this.statesCache) {
      this.statesCache = await this.client.listStates();
    }
    return this.statesCache;
  }

  /**
   * Find state ID by type
   */
  private async findStateId(status: IssueStatus): Promise<string | undefined> {
    const states = await this.getStates();

    // Map our status to Linear state types
    let targetTypes: string[];
    switch (status) {
      case 'open':
        targetTypes = ['backlog', 'unstarted', 'triage'];
        break;
      case 'in_progress':
        targetTypes = ['started'];
        break;
      case 'done':
        targetTypes = ['completed'];
        break;
      case 'cancelled':
        targetTypes = ['canceled'];
        break;
    }

    const state = states.find(s => targetTypes.includes(s.type));
    return state?.id;
  }

  /**
   * Map Linear issue to our Issue type
   */
  private linearIssueToIssue(linear: LinearIssue): Issue {
    const status = STATE_TYPE_MAP[linear.state.type] || 'open';
    const priority = PRIORITY_MAP[linear.priority] || 'none';

    // Determine type from labels (default to 'task')
    let type: IssueType = 'task';
    const typeLabels = ['bug', 'feature', 'story', 'epic'];
    for (const label of linear.labels.nodes) {
      const lowerName = label.name.toLowerCase();
      if (typeLabels.includes(lowerName)) {
        type = lowerName as IssueType;
        break;
      }
    }

    // Filter out type labels from labels
    const labels: Label[] = linear.labels.nodes
      .filter(l => !typeLabels.includes(l.name.toLowerCase()))
      .map(l => ({
        id: l.id,
        name: l.name,
        color: l.color,
      }));

    return {
      id: linear.id,
      title: linear.title,
      description: linear.description,
      status,
      type,
      priority: priority === 'none' ? undefined : priority,
      labels,
      assignee: linear.assignee?.id,
      project: linear.project ? {
        id: linear.project.id,
        name: linear.project.name,
      } : undefined,
      createdAt: new Date(linear.createdAt),
      updatedAt: new Date(linear.updatedAt),
      completedAt: linear.completedAt ? new Date(linear.completedAt) : undefined,
      dueDate: linear.dueDate ? new Date(linear.dueDate) : undefined,
      metadata: {
        linear_state_id: linear.state.id,
        linear_state_name: linear.state.name,
        linear_state_type: linear.state.type,
        linear_priority: linear.priority,
      },
    };
  }

  // ============ IssuesProvider Implementation ============

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    return withRetry(async () => {
      const linear = await this.client.createIssue({
        title: input.title,
        description: input.description,
        priority: input.priority ? PRIORITY_REVERSE_MAP[input.priority] : undefined,
        labelIds: input.labels,
        projectId: input.projectId,
        dueDate: input.dueDate?.toISOString().split('T')[0],
      });

      return this.linearIssueToIssue(linear);
    });
  }

  async getIssue(id: string): Promise<Issue> {
    return withRetry(async () => {
      try {
        const linear = await this.client.getIssue(id);
        return this.linearIssueToIssue(linear);
      } catch (error) {
        if (error instanceof LinearError) {
          throw new IssueNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async updateIssue(id: string, updates: UpdateIssueInput): Promise<Issue> {
    return withRetry(async () => {
      const updateData: Record<string, unknown> = {};

      if (updates.title !== undefined) {
        updateData.title = updates.title;
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }
      if (updates.status !== undefined) {
        const stateId = await this.findStateId(updates.status);
        if (stateId) {
          updateData.stateId = stateId;
        }
      }
      if (updates.priority !== undefined) {
        updateData.priority = PRIORITY_REVERSE_MAP[updates.priority];
      }
      if (updates.dueDate !== undefined) {
        updateData.dueDate = updates.dueDate.toISOString().split('T')[0];
      }

      try {
        const linear = await this.client.updateIssue(id, updateData);
        return this.linearIssueToIssue(linear);
      } catch (error) {
        if (error instanceof LinearError) {
          throw new IssueNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async deleteIssue(id: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.deleteIssue(id);
      } catch (error) {
        if (error instanceof LinearError) {
          throw new IssueNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async listIssues(query?: IssueQuery): Promise<Issue[]> {
    return withRetry(async () => {
      // Map our status to Linear state types
      let stateType: string[] | undefined;
      if (query?.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status];
        stateType = [];
        for (const s of statuses) {
          switch (s) {
            case 'open':
              stateType.push('backlog', 'unstarted', 'triage');
              break;
            case 'in_progress':
              stateType.push('started');
              break;
            case 'done':
              stateType.push('completed');
              break;
            case 'cancelled':
              stateType.push('canceled');
              break;
          }
        }
      }

      // Map our priority to Linear priority
      let priority: number[] | undefined;
      if (query?.priority) {
        const priorities = Array.isArray(query.priority) ? query.priority : [query.priority];
        priority = priorities.map(p => PRIORITY_REVERSE_MAP[p]);
      }

      const result = await this.client.listIssues({
        stateType,
        priority,
        projectId: query?.projectId,
        first: query?.limit || 50,
      });

      let issues = result.issues.map(i => this.linearIssueToIssue(i));

      // Apply type filter (Linear doesn't have native type filtering)
      if (query?.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        issues = issues.filter(i => types.includes(i.type));
      }

      // Apply label filter
      if (query?.labels && query.labels.length > 0) {
        issues = issues.filter(i =>
          query.labels!.every(labelId =>
            i.labels.some(l => l.id === labelId || l.name === labelId)
          )
        );
      }

      // Apply offset
      if (query?.offset) {
        issues = issues.slice(query.offset);
      }

      return issues;
    });
  }

  async searchIssues(text: string, options?: SearchOptions): Promise<Issue[]> {
    return withRetry(async () => {
      const linear = await this.client.searchIssues(text, options?.limit);
      let issues = linear.map(i => this.linearIssueToIssue(i));

      if (options?.projectId) {
        issues = issues.filter(i => i.project?.id === options.projectId);
      }
      if (options?.status && options.status.length > 0) {
        issues = issues.filter(i => options.status!.includes(i.status));
      }

      return issues;
    });
  }

  async listProjects(): Promise<Project[]> {
    return withRetry(async () => {
      const linear = await this.client.listProjects();
      return linear.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
      }));
    });
  }

  async getProject(id: string): Promise<Project> {
    return withRetry(async () => {
      try {
        const linear = await this.client.getProject(id);
        return {
          id: linear.id,
          name: linear.name,
          description: linear.description,
        };
      } catch (error) {
        if (error instanceof LinearError) {
          throw new ProjectNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async listLabels(): Promise<Label[]> {
    return withRetry(async () => {
      const linear = await this.client.listLabels();
      return linear.map(l => ({
        id: l.id,
        name: l.name,
        color: l.color,
      }));
    });
  }

  async addLabel(issueId: string, labelId: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.addLabelToIssue(issueId, labelId);
      } catch (error) {
        if (error instanceof LinearError) {
          // Could be issue or label not found
          throw new IssueNotFoundError(issueId, this.name);
        }
        throw error;
      }
    });
  }

  async removeLabel(issueId: string, labelId: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.removeLabelFromIssue(issueId, labelId);
      } catch (error) {
        if (error instanceof LinearError) {
          throw new IssueNotFoundError(issueId, this.name);
        }
        throw error;
      }
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.client.ping();
      const latencyMs = Date.now() - startTime;

      if (!isHealthy) {
        return {
          healthy: false,
          message: 'Linear API not responding',
          latencyMs,
        };
      }

      return {
        healthy: true,
        message: 'Linear is healthy',
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error) {
        if (error.message.includes('keychain')) {
          return {
            healthy: false,
            message: 'Linear API key not found in keychain',
            latencyMs,
          };
        }
      }

      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      };
    }
  }
}
