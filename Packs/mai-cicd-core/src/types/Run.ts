/**
 * RunStatus - Current state of a pipeline run
 */
export type RunStatus = 'pending' | 'queued' | 'running' | 'completed';

/**
 * RunConclusion - Final result of a completed run
 */
export type RunConclusion = 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out';

/**
 * Run - Represents a single execution of a pipeline
 */
export interface Run {
  /** Unique identifier */
  id: string;
  /** Pipeline/workflow this run belongs to */
  pipelineId: string;
  /** Pipeline/workflow name */
  pipelineName: string;
  /** Repository */
  repo: string;
  /** Current status */
  status: RunStatus;
  /** Final conclusion (when completed) */
  conclusion?: RunConclusion;
  /** Branch this run was triggered for */
  branch: string;
  /** Commit SHA */
  commit: string;
  /** Commit message */
  commitMessage?: string;
  /** Who triggered the run */
  triggeredBy: string;
  /** Event that triggered the run (push, pull_request, schedule, manual) */
  triggerEvent: string;
  /** When the run started */
  startedAt?: Date;
  /** When the run completed */
  completedAt?: Date;
  /** Duration in seconds */
  duration?: number;
  /** URL to view the run */
  url: string;
  /** Additional provider-specific data */
  metadata?: Record<string, unknown>;
}

/**
 * RunQuery - Options for querying runs
 */
export interface RunQuery {
  /** Filter by pipeline ID */
  pipelineId?: string;
  /** Filter by branch */
  branch?: string;
  /** Filter by status */
  status?: RunStatus | RunStatus[];
  /** Maximum number of results */
  limit?: number;
  /** Skip this many results */
  offset?: number;
}

/**
 * TriggerOptions - Options for triggering a new run
 */
export interface TriggerOptions {
  /** Branch to run on */
  branch?: string;
  /** Workflow input parameters */
  inputs?: Record<string, string>;
  /** Specific commit SHA */
  commitSha?: string;
}
