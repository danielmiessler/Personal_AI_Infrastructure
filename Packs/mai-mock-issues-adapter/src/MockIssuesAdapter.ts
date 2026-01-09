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
} from 'mai-issues-core';
import {
  IssueNotFoundError,
  ProjectNotFoundError,
  LabelNotFoundError,
  ProviderError,
} from 'mai-issues-core';

/**
 * Method call record for test verification
 */
export interface MethodCall {
  method: string;
  args: unknown[];
  timestamp: Date;
}

/**
 * Configuration for MockIssuesAdapter
 */
export interface MockIssuesConfig {
  /** Pre-populated issues */
  issues?: Issue[];
  /** Pre-populated projects */
  projects?: Project[];
  /** Pre-populated labels */
  labels?: Label[];
  /** Simulated latency in milliseconds */
  latencyMs?: number;
  /** Probability of failure (0-1) */
  failureRate?: number;
  /** Error message to throw on simulated failure */
  failureError?: string;
}

/**
 * MockIssuesAdapter - In-memory issues adapter for testing
 *
 * Provides an in-memory issue store with configurable latency
 * and failure rates for testing retry logic and error handling.
 */
export default class MockIssuesAdapter implements IssuesProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private issues: Map<string, Issue>;
  private projects: Map<string, Project>;
  private labels: Map<string, Label>;
  private callLog: MethodCall[] = [];
  private nextId = 1;

  private latencyMs: number;
  private failureRate: number;
  private failureError: string;

  constructor(config: MockIssuesConfig = {}) {
    this.issues = new Map();
    this.projects = new Map();
    this.labels = new Map();
    this.latencyMs = config.latencyMs || 0;
    this.failureRate = config.failureRate || 0;
    this.failureError = config.failureError || 'MOCK_ERROR';

    // Initialize with provided data
    if (config.issues) {
      for (const issue of config.issues) {
        this.issues.set(issue.id, issue);
      }
    }
    if (config.projects) {
      for (const project of config.projects) {
        this.projects.set(project.id, project);
      }
    }
    if (config.labels) {
      for (const label of config.labels) {
        this.labels.set(label.id, label);
      }
    }
  }

  // ============ Test Helpers ============

  /**
   * Set pre-populated issues
   */
  setIssues(issues: Issue[]): void {
    this.issues.clear();
    for (const issue of issues) {
      this.issues.set(issue.id, issue);
    }
  }

  /**
   * Add a single issue
   */
  addIssue(issue: Issue): void {
    this.issues.set(issue.id, issue);
  }

  /**
   * Clear all issues
   */
  clearIssues(): void {
    this.issues.clear();
  }

  /**
   * Set pre-populated projects
   */
  setProjects(projects: Project[]): void {
    this.projects.clear();
    for (const project of projects) {
      this.projects.set(project.id, project);
    }
  }

  /**
   * Set pre-populated labels
   */
  setLabels(labels: Label[]): void {
    this.labels.clear();
    for (const label of labels) {
      this.labels.set(label.id, label);
    }
  }

  /**
   * Set failure rate
   */
  setFailureRate(rate: number): void {
    this.failureRate = rate;
  }

  /**
   * Set latency
   */
  setLatency(ms: number): void {
    this.latencyMs = ms;
  }

  /**
   * Get method call log
   */
  getCallLog(): MethodCall[] {
    return [...this.callLog];
  }

  /**
   * Clear method call log
   */
  clearCallLog(): void {
    this.callLog = [];
  }

  /**
   * Get issue count
   */
  get issueCount(): number {
    return this.issues.size;
  }

  // ============ Private Helpers ============

  private logCall(method: string, ...args: unknown[]): void {
    this.callLog.push({
      method,
      args,
      timestamp: new Date(),
    });
  }

  private async maybeDelay(): Promise<void> {
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }
  }

  private maybeFail(): void {
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      throw new ProviderError(this.failureError, this.name);
    }
  }

  private generateId(): string {
    return `issue-${this.nextId++}`;
  }

  // ============ IssuesProvider Implementation ============

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    this.logCall('createIssue', input);
    await this.maybeDelay();
    this.maybeFail();

    const now = new Date();
    const id = this.generateId();

    const issue: Issue = {
      id,
      title: input.title,
      description: input.description,
      status: 'open',
      type: input.type || 'task',
      priority: input.priority,
      labels: input.labels
        ? input.labels.map(labelId => {
            const label = this.labels.get(labelId);
            return label || { id: labelId, name: labelId };
          })
        : [],
      assignee: input.assignee,
      project: input.projectId ? this.projects.get(input.projectId) : undefined,
      createdAt: now,
      updatedAt: now,
      dueDate: input.dueDate,
      metadata: input.metadata,
    };

    this.issues.set(id, issue);
    return issue;
  }

  async getIssue(id: string): Promise<Issue> {
    this.logCall('getIssue', id);
    await this.maybeDelay();
    this.maybeFail();

    const issue = this.issues.get(id);
    if (!issue) {
      throw new IssueNotFoundError(id, this.name);
    }
    return issue;
  }

  async updateIssue(id: string, updates: UpdateIssueInput): Promise<Issue> {
    this.logCall('updateIssue', id, updates);
    await this.maybeDelay();
    this.maybeFail();

    const issue = this.issues.get(id);
    if (!issue) {
      throw new IssueNotFoundError(id, this.name);
    }

    const now = new Date();
    const updatedIssue: Issue = {
      ...issue,
      ...updates,
      updatedAt: now,
      completedAt: updates.status === 'done' ? now : issue.completedAt,
    };

    this.issues.set(id, updatedIssue);
    return updatedIssue;
  }

  async deleteIssue(id: string): Promise<void> {
    this.logCall('deleteIssue', id);
    await this.maybeDelay();
    this.maybeFail();

    if (!this.issues.has(id)) {
      throw new IssueNotFoundError(id, this.name);
    }
    this.issues.delete(id);
  }

  async listIssues(query?: IssueQuery): Promise<Issue[]> {
    this.logCall('listIssues', query);
    await this.maybeDelay();
    this.maybeFail();

    let results = Array.from(this.issues.values());

    if (query) {
      // Filter by status
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status];
        results = results.filter(issue => statuses.includes(issue.status));
      }

      // Filter by type
      if (query.type) {
        const types = Array.isArray(query.type) ? query.type : [query.type];
        results = results.filter(issue => types.includes(issue.type));
      }

      // Filter by priority
      if (query.priority) {
        const priorities = Array.isArray(query.priority) ? query.priority : [query.priority];
        results = results.filter(issue => issue.priority && priorities.includes(issue.priority));
      }

      // Filter by assignee
      if (query.assignee) {
        results = results.filter(issue => issue.assignee === query.assignee);
      }

      // Filter by project
      if (query.projectId) {
        results = results.filter(issue => issue.project?.id === query.projectId);
      }

      // Filter by labels
      if (query.labels && query.labels.length > 0) {
        results = results.filter(issue =>
          query.labels!.every(labelId =>
            issue.labels.some(l => l.id === labelId || l.name === labelId)
          )
        );
      }

      // Filter by date ranges
      if (query.createdAfter) {
        results = results.filter(issue => issue.createdAt >= query.createdAfter!);
      }
      if (query.createdBefore) {
        results = results.filter(issue => issue.createdAt <= query.createdBefore!);
      }
      if (query.updatedAfter) {
        results = results.filter(issue => issue.updatedAt >= query.updatedAfter!);
      }

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || results.length;
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  async searchIssues(text: string, options?: SearchOptions): Promise<Issue[]> {
    this.logCall('searchIssues', text, options);
    await this.maybeDelay();
    this.maybeFail();

    const searchLower = text.toLowerCase();
    let results = Array.from(this.issues.values()).filter(issue =>
      issue.title.toLowerCase().includes(searchLower) ||
      issue.description?.toLowerCase().includes(searchLower)
    );

    if (options) {
      if (options.projectId) {
        results = results.filter(issue => issue.project?.id === options.projectId);
      }
      if (options.status && options.status.length > 0) {
        results = results.filter(issue => options.status!.includes(issue.status));
      }
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
    }

    return results;
  }

  async listProjects(): Promise<Project[]> {
    this.logCall('listProjects');
    await this.maybeDelay();
    this.maybeFail();

    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<Project> {
    this.logCall('getProject', id);
    await this.maybeDelay();
    this.maybeFail();

    const project = this.projects.get(id);
    if (!project) {
      throw new ProjectNotFoundError(id, this.name);
    }
    return project;
  }

  async listLabels(): Promise<Label[]> {
    this.logCall('listLabels');
    await this.maybeDelay();
    this.maybeFail();

    return Array.from(this.labels.values());
  }

  async addLabel(issueId: string, labelId: string): Promise<void> {
    this.logCall('addLabel', issueId, labelId);
    await this.maybeDelay();
    this.maybeFail();

    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new IssueNotFoundError(issueId, this.name);
    }

    const label = this.labels.get(labelId);
    if (!label) {
      throw new LabelNotFoundError(labelId, this.name);
    }

    if (!issue.labels.some(l => l.id === labelId)) {
      issue.labels.push(label);
      issue.updatedAt = new Date();
    }
  }

  async removeLabel(issueId: string, labelId: string): Promise<void> {
    this.logCall('removeLabel', issueId, labelId);
    await this.maybeDelay();
    this.maybeFail();

    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new IssueNotFoundError(issueId, this.name);
    }

    issue.labels = issue.labels.filter(l => l.id !== labelId);
    issue.updatedAt = new Date();
  }

  async healthCheck(): Promise<HealthStatus> {
    this.logCall('healthCheck');
    await this.maybeDelay();
    // Don't fail health check even with failure rate

    return {
      healthy: true,
      message: 'Mock issues adapter is healthy',
      latencyMs: this.latencyMs,
      details: {
        issueCount: this.issues.size,
        projectCount: this.projects.size,
        labelCount: this.labels.size,
        latencyMs: this.latencyMs,
        failureRate: this.failureRate,
      },
    };
  }
}
