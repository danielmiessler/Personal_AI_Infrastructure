import type {
  Issue,
  CreateIssueInput,
  UpdateIssueInput,
  IssueQuery,
  SearchOptions,
  Project,
  Label,
  HealthStatus,
} from '../types/index.ts';

/**
 * Provider interface for issue tracking systems.
 * Implemented by adapters for Joplin, Linear, Jira, etc.
 */
export interface IssuesProvider {
  /** Provider identifier (e.g., 'joplin', 'linear', 'jira') */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Issue CRUD operations

  /** Create a new issue */
  createIssue(issue: CreateIssueInput): Promise<Issue>;

  /** Get an issue by ID */
  getIssue(id: string): Promise<Issue>;

  /** Update an existing issue */
  updateIssue(id: string, updates: UpdateIssueInput): Promise<Issue>;

  /** Delete an issue */
  deleteIssue(id: string): Promise<void>;

  // Issue queries

  /** List issues matching query criteria */
  listIssues(query?: IssueQuery): Promise<Issue[]>;

  /** Full-text search across issues */
  searchIssues(text: string, options?: SearchOptions): Promise<Issue[]>;

  // Project/board operations (optional - not all backends support)

  /** List all projects/boards */
  listProjects?(): Promise<Project[]>;

  /** Get a project by ID */
  getProject?(id: string): Promise<Project>;

  // Label operations

  /** List all available labels */
  listLabels(): Promise<Label[]>;

  /** Add a label to an issue */
  addLabel(issueId: string, labelId: string): Promise<void>;

  /** Remove a label from an issue */
  removeLabel(issueId: string, labelId: string): Promise<void>;

  // Health check

  /** Check if provider is available and authenticated */
  healthCheck(): Promise<HealthStatus>;
}
