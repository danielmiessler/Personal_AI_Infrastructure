import type {
  Pipeline,
  Run,
  RunQuery,
  TriggerOptions,
  Job,
  Artifact,
  HealthStatus,
} from '../types/index.ts';

/**
 * Provider interface for CI/CD systems.
 * Implemented by adapters for GitHub Actions, GitLab CI, etc.
 */
export interface CICDProvider {
  /** Provider identifier (e.g., 'github', 'gitlab', 'jenkins') */
  readonly name: string;

  /** Provider version */
  readonly version: string;

  // Pipeline operations

  /** List all pipelines/workflows for a repository */
  listPipelines(repo: string): Promise<Pipeline[]>;

  /** Get a specific pipeline by ID */
  getPipeline(repo: string, pipelineId: string): Promise<Pipeline>;

  // Run operations

  /** List pipeline runs with optional filtering */
  listRuns(repo: string, options?: RunQuery): Promise<Run[]>;

  /** Get a specific run by ID */
  getRun(repo: string, runId: string): Promise<Run>;

  /** Trigger a new pipeline run */
  triggerRun(repo: string, pipelineId: string, options?: TriggerOptions): Promise<Run>;

  /** Cancel a running pipeline */
  cancelRun(repo: string, runId: string): Promise<void>;

  /** Retry a failed run */
  retryRun(repo: string, runId: string): Promise<Run>;

  // Job operations

  /** List jobs within a run */
  listJobs(repo: string, runId: string): Promise<Job[]>;

  /** Get logs for a specific job */
  getJobLogs(repo: string, jobId: string): Promise<string>;

  /** Retry a specific job within a run (optional - not all providers support) */
  retryJob?(repo: string, runId: string, jobId: string): Promise<void>;

  // Artifact operations

  /** List artifacts for a run */
  listArtifacts(repo: string, runId: string): Promise<Artifact[]>;

  /** Download an artifact */
  downloadArtifact(repo: string, artifactId: string): Promise<Buffer>;

  // Health check

  /** Check if provider is available and authenticated */
  healthCheck(): Promise<HealthStatus>;
}
