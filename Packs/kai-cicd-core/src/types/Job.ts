import type { RunConclusion } from './Run.ts';

/**
 * JobStatus - Current state of a job
 */
export type JobStatus = 'pending' | 'queued' | 'running' | 'completed';

/**
 * Step - A single step within a job
 */
export interface Step {
  /** Step name */
  name: string;
  /** Current status */
  status: JobStatus;
  /** Final conclusion (when completed) */
  conclusion?: RunConclusion;
  /** Step number in sequence */
  number: number;
  /** When the step started */
  startedAt?: Date;
  /** When the step completed */
  completedAt?: Date;
}

/**
 * Job - Represents a job within a pipeline run
 */
export interface Job {
  /** Unique identifier */
  id: string;
  /** Run this job belongs to */
  runId: string;
  /** Job name */
  name: string;
  /** Current status */
  status: JobStatus;
  /** Final conclusion (when completed) */
  conclusion?: RunConclusion;
  /** When the job started */
  startedAt?: Date;
  /** When the job completed */
  completedAt?: Date;
  /** Duration in seconds */
  duration?: number;
  /** Runner that executed the job */
  runner?: string;
  /** Individual steps within the job */
  steps?: Step[];
  /** Additional provider-specific data */
  metadata?: Record<string, unknown>;
}
