import type {
  CICDProvider,
  Pipeline,
  Run,
  RunStatus,
  RunConclusion,
  RunQuery,
  TriggerOptions,
  Job,
  JobStatus,
  Artifact,
  HealthStatus,
} from 'kai-cicd-core';
import {
  withRetry,
  PipelineNotFoundError,
  RunNotFoundError,
  JobNotFoundError,
  ArtifactNotFoundError,
  AuthenticationError,
  RateLimitError,
  ProviderError,
  TriggerError,
  ConfigurationError,
} from 'kai-cicd-core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Configuration for GitLabCICDAdapter
 */
export interface GitLabCICDConfig {
  host: string;
  apiVersion?: string;
  token?: string;
}

/**
 * GitLab API response types
 */
interface GitLabPipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  web_url: string;
  user: { username: string };
}

interface GitLabJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  runner: { description: string } | null;
  pipeline: { id: number };
}

interface GitLabArtifact {
  file_type: string;
  size: number;
  filename: string;
  file_format: string | null;
}

interface GitLabJobWithArtifacts extends GitLabJob {
  artifacts: GitLabArtifact[];
  artifacts_file?: { filename: string; size: number };
}

/**
 * GitLabCICDAdapter - GitLab CI/CD implementation of CICDProvider
 */
export default class GitLabCICDAdapter implements CICDProvider {
  readonly name = 'gitlab';
  readonly version = '1.0.0';

  private host: string;
  private apiVersion: string;
  private token: string | null = null;

  constructor(config: GitLabCICDConfig) {
    if (!config.host) {
      throw new ConfigurationError('GitLab host is required', 'gitlab');
    }
    this.host = config.host.replace(/\/$/, '');
    this.apiVersion = config.apiVersion ?? 'v4';
    if (config.token) {
      this.token = config.token;
    }
  }

  /**
   * Get authentication token
   */
  private async getToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    // Try environment variable first
    if (process.env.GITLAB_TOKEN) {
      this.token = process.env.GITLAB_TOKEN;
      return this.token;
    }

    // Try macOS Keychain
    try {
      const { stdout } = await execAsync(
        'security find-generic-password -s "gitlab-token" -a "claude-code" -w 2>/dev/null'
      );
      this.token = stdout.trim();
      return this.token;
    } catch {
      // Keychain not available or token not found
    }

    throw new AuthenticationError(
      'No GitLab token found. Set GITLAB_TOKEN env var or store in keychain.',
      'gitlab'
    );
  }

  /**
   * Get API base URL
   */
  private get apiUrl(): string {
    return `https://${this.host}/api/${this.apiVersion}`;
  }

  /**
   * Make authenticated API request
   */
  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    return withRetry(async () => {
      const token = await this.getToken();

      const response = await fetch(`${this.apiUrl}${path}`, {
        ...options,
        headers: {
          'PRIVATE-TOKEN': token,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(retryAfter ? parseInt(retryAfter) : undefined, 'gitlab');
      }

      // Handle authentication errors
      if (response.status === 401) {
        this.token = null;
        throw new AuthenticationError('Invalid or expired token', 'gitlab');
      }

      if (!response.ok) {
        const text = await response.text();
        throw new ProviderError(`GitLab API error: ${response.status} - ${text}`, 'gitlab');
      }

      // Handle empty responses (e.g., 204 No Content)
      const text = await response.text();
      if (!text) return {} as T;

      return JSON.parse(text) as T;
    }, {
      retryableErrors: ['401', '429', '500', '502', '503', '504', 'ECONNRESET', 'ETIMEDOUT']
    });
  }

  /**
   * Encode project path for API
   */
  private encodeProject(repo: string): string {
    // Handle full URLs
    const urlMatch = repo.match(/gitlab[^/]*\/(.+?)(?:\.git)?$/);
    if (urlMatch) {
      return encodeURIComponent(urlMatch[1]);
    }

    // Handle namespace/project format
    return encodeURIComponent(repo);
  }

  /**
   * Map GitLab pipeline status to RunStatus
   */
  private mapRunStatus(status: string): RunStatus {
    switch (status) {
      case 'created':
      case 'waiting_for_resource':
      case 'preparing':
        return 'pending';
      case 'pending':
        return 'queued';
      case 'running':
        return 'running';
      case 'success':
      case 'failed':
      case 'canceled':
      case 'skipped':
      case 'manual':
        return 'completed';
      default:
        return 'pending';
    }
  }

  /**
   * Map GitLab status to RunConclusion
   */
  private mapConclusion(status: string): RunConclusion | undefined {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'failure';
      case 'canceled':
        return 'cancelled';
      case 'skipped':
        return 'skipped';
      default:
        return undefined;
    }
  }

  /**
   * Map GitLab job status to JobStatus
   */
  private mapJobStatus(status: string): JobStatus {
    switch (status) {
      case 'created':
      case 'waiting_for_resource':
      case 'preparing':
        return 'pending';
      case 'pending':
        return 'queued';
      case 'running':
        return 'running';
      case 'success':
      case 'failed':
      case 'canceled':
      case 'skipped':
      case 'manual':
        return 'completed';
      default:
        return 'pending';
    }
  }

  // CICDProvider implementation

  async listPipelines(repo: string): Promise<Pipeline[]> {
    // GitLab doesn't have separate pipeline definitions like GitHub workflows
    // We'll return a virtual pipeline representing .gitlab-ci.yml
    const projectId = this.encodeProject(repo);

    // Verify the project exists
    await this.fetch<{ id: number }>(`/projects/${projectId}`);

    return [{
      id: 'gitlab-ci',
      name: 'GitLab CI/CD',
      path: '.gitlab-ci.yml',
      repo,
      defaultBranch: 'main'
    }];
  }

  async getPipeline(repo: string, pipelineId: string): Promise<Pipeline> {
    if (pipelineId === 'gitlab-ci') {
      const pipelines = await this.listPipelines(repo);
      return pipelines[0];
    }
    throw new PipelineNotFoundError(pipelineId, 'gitlab');
  }

  async listRuns(repo: string, options?: RunQuery): Promise<Run[]> {
    const projectId = this.encodeProject(repo);

    const params = new URLSearchParams();
    if (options?.branch) params.set('ref', options.branch);
    if (options?.limit) params.set('per_page', options.limit.toString());
    if (options?.offset) {
      const page = Math.floor(options.offset / (options.limit ?? 20)) + 1;
      params.set('page', page.toString());
    }

    const queryString = params.toString();
    const path = `/projects/${projectId}/pipelines${queryString ? `?${queryString}` : ''}`;

    const pipelines = await this.fetch<GitLabPipeline[]>(path);

    let runs = pipelines.map(p => this.mapPipelineToRun(p, repo));

    // Filter by status if specified
    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      runs = runs.filter(r => statuses.includes(r.status));
    }

    return runs;
  }

  private mapPipelineToRun(p: GitLabPipeline, repo: string): Run {
    const startedAt = p.started_at ? new Date(p.started_at) : undefined;
    const completedAt = p.finished_at ? new Date(p.finished_at) : undefined;

    return {
      id: p.id.toString(),
      pipelineId: 'gitlab-ci',
      pipelineName: 'GitLab CI/CD',
      repo,
      status: this.mapRunStatus(p.status),
      conclusion: this.mapConclusion(p.status),
      branch: p.ref,
      commit: p.sha,
      triggeredBy: p.user?.username ?? 'unknown',
      triggerEvent: p.source,
      startedAt,
      completedAt,
      duration: p.duration ?? undefined,
      url: p.web_url
    };
  }

  async getRun(repo: string, runId: string): Promise<Run> {
    const projectId = this.encodeProject(repo);

    try {
      const pipeline = await this.fetch<GitLabPipeline>(
        `/projects/${projectId}/pipelines/${runId}`
      );
      return this.mapPipelineToRun(pipeline, repo);
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'gitlab');
      }
      throw error;
    }
  }

  async triggerRun(repo: string, _pipelineId: string, options?: TriggerOptions): Promise<Run> {
    const projectId = this.encodeProject(repo);

    try {
      const body: Record<string, unknown> = {
        ref: options?.branch ?? 'main'
      };

      if (options?.inputs) {
        body.variables = Object.entries(options.inputs).map(([key, value]) => ({
          key,
          value
        }));
      }

      const pipeline = await this.fetch<GitLabPipeline>(
        `/projects/${projectId}/pipeline`,
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      return this.mapPipelineToRun(pipeline, repo);
    } catch (error) {
      if (error instanceof ProviderError) {
        throw new TriggerError(`Failed to trigger pipeline: ${error.message}`, 'gitlab');
      }
      throw error;
    }
  }

  async cancelRun(repo: string, runId: string): Promise<void> {
    const projectId = this.encodeProject(repo);

    try {
      await this.fetch(`/projects/${projectId}/pipelines/${runId}/cancel`, {
        method: 'POST'
      });
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'gitlab');
      }
      throw error;
    }
  }

  async retryRun(repo: string, runId: string): Promise<Run> {
    const projectId = this.encodeProject(repo);

    try {
      const pipeline = await this.fetch<GitLabPipeline>(
        `/projects/${projectId}/pipelines/${runId}/retry`,
        { method: 'POST' }
      );
      return this.mapPipelineToRun(pipeline, repo);
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'gitlab');
      }
      throw error;
    }
  }

  async listJobs(repo: string, runId: string): Promise<Job[]> {
    const projectId = this.encodeProject(repo);

    try {
      const jobs = await this.fetch<GitLabJob[]>(
        `/projects/${projectId}/pipelines/${runId}/jobs`
      );

      return jobs.map(j => this.mapJob(j));
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'gitlab');
      }
      throw error;
    }
  }

  private mapJob(j: GitLabJob): Job {
    const startedAt = j.started_at ? new Date(j.started_at) : undefined;
    const completedAt = j.finished_at ? new Date(j.finished_at) : undefined;

    return {
      id: j.id.toString(),
      runId: j.pipeline.id.toString(),
      name: j.name,
      status: this.mapJobStatus(j.status),
      conclusion: this.mapConclusion(j.status),
      startedAt,
      completedAt,
      duration: j.duration ?? undefined,
      runner: j.runner?.description,
      metadata: { stage: j.stage }
    };
  }

  async getJobLogs(repo: string, jobId: string): Promise<string> {
    const projectId = this.encodeProject(repo);

    try {
      const token = await this.getToken();

      const response = await fetch(
        `${this.apiUrl}/projects/${projectId}/jobs/${jobId}/trace`,
        {
          headers: { 'PRIVATE-TOKEN': token }
        }
      );

      if (response.status === 404) {
        throw new JobNotFoundError(jobId, 'gitlab');
      }

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch logs: ${response.status}`, 'gitlab');
      }

      return response.text();
    } catch (error) {
      if (error instanceof JobNotFoundError) throw error;
      throw new ProviderError(`Failed to fetch logs: ${error}`, 'gitlab');
    }
  }

  async retryJob(repo: string, _runId: string, jobId: string): Promise<void> {
    const projectId = this.encodeProject(repo);

    try {
      await this.fetch(`/projects/${projectId}/jobs/${jobId}/retry`, {
        method: 'POST'
      });
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new JobNotFoundError(jobId, 'gitlab');
      }
      throw error;
    }
  }

  async listArtifacts(repo: string, runId: string): Promise<Artifact[]> {
    const projectId = this.encodeProject(repo);

    try {
      // GitLab artifacts are attached to jobs, not pipelines directly
      const jobs = await this.fetch<GitLabJobWithArtifacts[]>(
        `/projects/${projectId}/pipelines/${runId}/jobs`
      );

      const artifacts: Artifact[] = [];

      for (const job of jobs) {
        if (job.artifacts_file) {
          artifacts.push({
            id: `${job.id}`,
            runId,
            name: job.artifacts_file.filename || `${job.name}-artifacts`,
            sizeBytes: job.artifacts_file.size,
            createdAt: job.finished_at ? new Date(job.finished_at) : new Date()
          });
        }
      }

      return artifacts;
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'gitlab');
      }
      throw error;
    }
  }

  async downloadArtifact(repo: string, artifactId: string): Promise<Buffer> {
    const projectId = this.encodeProject(repo);

    // In GitLab, artifact ID is the job ID
    const jobId = artifactId;

    try {
      const token = await this.getToken();

      const response = await fetch(
        `${this.apiUrl}/projects/${projectId}/jobs/${jobId}/artifacts`,
        {
          headers: { 'PRIVATE-TOKEN': token }
        }
      );

      if (response.status === 404) {
        throw new ArtifactNotFoundError(artifactId, 'gitlab');
      }

      if (!response.ok) {
        throw new ProviderError(`Failed to download artifact: ${response.status}`, 'gitlab');
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof ArtifactNotFoundError) throw error;
      throw new ProviderError(`Failed to download artifact: ${error}`, 'gitlab');
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      await this.fetch('/user');

      return {
        healthy: true,
        message: 'GitLab API is accessible',
        latencyMs: Date.now() - startTime,
        details: { host: this.host }
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
        details: { host: this.host }
      };
    }
  }
}
