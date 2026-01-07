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
  Step,
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
} from 'kai-cicd-core';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Configuration for GitHubCICDAdapter
 */
export interface GitHubCICDConfig {
  apiUrl?: string;
  token?: string;
}

/**
 * GitHub Actions API response types
 */
interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

interface GitHubWorkflowRun {
  id: number;
  workflow_id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  html_url: string;
  actor: { login: string };
  triggering_actor: { login: string };
}

interface GitHubJob {
  id: number;
  run_id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  runner_name: string | null;
  steps?: GitHubStep[];
}

interface GitHubStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
  started_at: string | null;
  completed_at: string | null;
}

interface GitHubArtifact {
  id: number;
  name: string;
  size_in_bytes: number;
  created_at: string;
  expires_at: string | null;
  archive_download_url: string;
}

/**
 * GitHubCICDAdapter - GitHub Actions implementation of CICDProvider
 */
export default class GitHubCICDAdapter implements CICDProvider {
  readonly name = 'github';
  readonly version = '1.0.0';

  private apiUrl: string;
  private token: string | null = null;

  constructor(config: GitHubCICDConfig = {}) {
    this.apiUrl = config.apiUrl ?? 'https://api.github.com';
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
    if (process.env.GITHUB_TOKEN) {
      this.token = process.env.GITHUB_TOKEN;
      return this.token;
    }

    // Try macOS Keychain
    try {
      const { stdout } = await execAsync(
        'security find-generic-password -s "github-token" -a "claude-code" -w 2>/dev/null'
      );
      this.token = stdout.trim();
      return this.token;
    } catch {
      // Keychain not available or token not found
    }

    throw new AuthenticationError(
      'No GitHub token found. Set GITHUB_TOKEN env var or store in keychain.',
      'github'
    );
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
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...options.headers
        }
      });

      // Handle rate limiting
      if (response.status === 403) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        if (remaining === '0') {
          const reset = response.headers.get('X-RateLimit-Reset');
          const retryAfter = reset ? Math.ceil((parseInt(reset) * 1000 - Date.now()) / 1000) : undefined;
          throw new RateLimitError(retryAfter, 'github');
        }
      }

      // Handle authentication errors
      if (response.status === 401) {
        this.token = null; // Clear cached token
        throw new AuthenticationError('Invalid or expired token', 'github');
      }

      if (!response.ok) {
        throw new ProviderError(`GitHub API error: ${response.status}`, 'github');
      }

      return response.json() as T;
    }, {
      retryableErrors: ['401', '403', '500', '502', '503', '504', 'ECONNRESET', 'ETIMEDOUT']
    });
  }

  /**
   * Parse owner/repo from various formats
   */
  private parseRepo(repo: string): { owner: string; repo: string } {
    // Handle full URLs
    const urlMatch = repo.match(/github\.com[/:]([^/]+)\/([^/\s]+)/);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
    }

    // Handle owner/repo format
    const parts = repo.split('/');
    if (parts.length === 2) {
      return { owner: parts[0], repo: parts[1] };
    }

    throw new ProviderError(`Invalid repository format: ${repo}`, 'github');
  }

  /**
   * Map GitHub status to RunStatus
   */
  private mapRunStatus(status: string): RunStatus {
    switch (status) {
      case 'queued':
        return 'queued';
      case 'in_progress':
        return 'running';
      case 'completed':
        return 'completed';
      case 'waiting':
      case 'pending':
      default:
        return 'pending';
    }
  }

  /**
   * Map GitHub conclusion to RunConclusion
   */
  private mapConclusion(conclusion: string | null): RunConclusion | undefined {
    if (!conclusion) return undefined;
    switch (conclusion) {
      case 'success':
        return 'success';
      case 'failure':
        return 'failure';
      case 'cancelled':
        return 'cancelled';
      case 'skipped':
        return 'skipped';
      case 'timed_out':
        return 'timed_out';
      default:
        return 'failure';
    }
  }

  /**
   * Map GitHub job status to JobStatus
   */
  private mapJobStatus(status: string): JobStatus {
    switch (status) {
      case 'queued':
        return 'queued';
      case 'in_progress':
        return 'running';
      case 'completed':
        return 'completed';
      default:
        return 'pending';
    }
  }

  // CICDProvider implementation

  async listPipelines(repo: string): Promise<Pipeline[]> {
    const { owner, repo: repoName } = this.parseRepo(repo);
    const data = await this.fetch<{ workflows: GitHubWorkflow[] }>(
      `/repos/${owner}/${repoName}/actions/workflows`
    );

    return data.workflows.map(w => ({
      id: w.id.toString(),
      name: w.name,
      path: w.path,
      repo: `${owner}/${repoName}`,
      metadata: { state: w.state }
    }));
  }

  async getPipeline(repo: string, pipelineId: string): Promise<Pipeline> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      const workflow = await this.fetch<GitHubWorkflow>(
        `/repos/${owner}/${repoName}/actions/workflows/${pipelineId}`
      );

      return {
        id: workflow.id.toString(),
        name: workflow.name,
        path: workflow.path,
        repo: `${owner}/${repoName}`,
        metadata: { state: workflow.state }
      };
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new PipelineNotFoundError(pipelineId, 'github');
      }
      throw error;
    }
  }

  async listRuns(repo: string, options?: RunQuery): Promise<Run[]> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    const params = new URLSearchParams();
    if (options?.branch) params.set('branch', options.branch);
    if (options?.limit) params.set('per_page', options.limit.toString());
    if (options?.offset) params.set('page', Math.floor(options.offset / (options.limit ?? 30) + 1).toString());

    let path = `/repos/${owner}/${repoName}/actions/runs`;
    if (options?.pipelineId) {
      path = `/repos/${owner}/${repoName}/actions/workflows/${options.pipelineId}/runs`;
    }

    const queryString = params.toString();
    if (queryString) path += `?${queryString}`;

    const data = await this.fetch<{ workflow_runs: GitHubWorkflowRun[] }>(path);

    let runs = data.workflow_runs.map(r => this.mapWorkflowRun(r, owner, repoName));

    // Filter by status if specified
    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      runs = runs.filter(r => statuses.includes(r.status));
    }

    return runs;
  }

  private mapWorkflowRun(r: GitHubWorkflowRun, owner: string, repoName: string): Run {
    const startedAt = r.run_started_at ? new Date(r.run_started_at) : undefined;
    const completedAt = r.status === 'completed' ? new Date(r.updated_at) : undefined;
    const duration = startedAt && completedAt
      ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
      : undefined;

    return {
      id: r.id.toString(),
      pipelineId: r.workflow_id.toString(),
      pipelineName: r.name,
      repo: `${owner}/${repoName}`,
      status: this.mapRunStatus(r.status),
      conclusion: this.mapConclusion(r.conclusion),
      branch: r.head_branch,
      commit: r.head_sha,
      triggeredBy: r.triggering_actor?.login ?? r.actor?.login ?? 'unknown',
      triggerEvent: r.event,
      startedAt,
      completedAt,
      duration,
      url: r.html_url
    };
  }

  async getRun(repo: string, runId: string): Promise<Run> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      const run = await this.fetch<GitHubWorkflowRun>(
        `/repos/${owner}/${repoName}/actions/runs/${runId}`
      );
      return this.mapWorkflowRun(run, owner, repoName);
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'github');
      }
      throw error;
    }
  }

  async triggerRun(repo: string, pipelineId: string, options?: TriggerOptions): Promise<Run> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    // First get the workflow to verify it exists
    const pipeline = await this.getPipeline(repo, pipelineId);

    try {
      await this.fetch(`/repos/${owner}/${repoName}/actions/workflows/${pipelineId}/dispatches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref: options?.branch ?? 'main',
          inputs: options?.inputs ?? {}
        })
      });

      // GitHub doesn't return the run, so we need to poll for it
      // Wait a bit and get the most recent run
      await new Promise(resolve => setTimeout(resolve, 2000));

      const runs = await this.listRuns(repo, { pipelineId, limit: 1 });
      if (runs.length > 0) {
        return runs[0];
      }

      // Return a placeholder if we can't find the run yet
      return {
        id: 'pending',
        pipelineId,
        pipelineName: pipeline.name,
        repo: `${owner}/${repoName}`,
        status: 'pending',
        branch: options?.branch ?? 'main',
        commit: options?.commitSha ?? 'unknown',
        triggeredBy: 'api',
        triggerEvent: 'workflow_dispatch',
        url: `https://github.com/${owner}/${repoName}/actions`
      };
    } catch (error) {
      if (error instanceof ProviderError) {
        throw new TriggerError(
          `Failed to trigger workflow: ${error.message}. Ensure the workflow supports workflow_dispatch.`,
          'github'
        );
      }
      throw error;
    }
  }

  async cancelRun(repo: string, runId: string): Promise<void> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      await this.fetch(`/repos/${owner}/${repoName}/actions/runs/${runId}/cancel`, {
        method: 'POST'
      });
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'github');
      }
      throw error;
    }
  }

  async retryRun(repo: string, runId: string): Promise<Run> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      await this.fetch(`/repos/${owner}/${repoName}/actions/runs/${runId}/rerun`, {
        method: 'POST'
      });

      // Wait a bit for the new run to be created
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Return the updated run
      return this.getRun(repo, runId);
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'github');
      }
      throw error;
    }
  }

  async listJobs(repo: string, runId: string): Promise<Job[]> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      const data = await this.fetch<{ jobs: GitHubJob[] }>(
        `/repos/${owner}/${repoName}/actions/runs/${runId}/jobs`
      );

      return data.jobs.map(j => this.mapJob(j));
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'github');
      }
      throw error;
    }
  }

  private mapJob(j: GitHubJob): Job {
    const startedAt = j.started_at ? new Date(j.started_at) : undefined;
    const completedAt = j.completed_at ? new Date(j.completed_at) : undefined;
    const duration = startedAt && completedAt
      ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
      : undefined;

    return {
      id: j.id.toString(),
      runId: j.run_id.toString(),
      name: j.name,
      status: this.mapJobStatus(j.status),
      conclusion: this.mapConclusion(j.conclusion),
      startedAt,
      completedAt,
      duration,
      runner: j.runner_name ?? undefined,
      steps: j.steps?.map(s => this.mapStep(s))
    };
  }

  private mapStep(s: GitHubStep): Step {
    return {
      name: s.name,
      status: this.mapJobStatus(s.status),
      conclusion: this.mapConclusion(s.conclusion),
      number: s.number,
      startedAt: s.started_at ? new Date(s.started_at) : undefined,
      completedAt: s.completed_at ? new Date(s.completed_at) : undefined
    };
  }

  async getJobLogs(repo: string, jobId: string): Promise<string> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      const token = await this.getToken();

      const response = await fetch(
        `${this.apiUrl}/repos/${owner}/${repoName}/actions/jobs/${jobId}/logs`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          redirect: 'follow'
        }
      );

      if (response.status === 404) {
        throw new JobNotFoundError(jobId, 'github');
      }

      if (!response.ok) {
        throw new ProviderError(`Failed to fetch logs: ${response.status}`, 'github');
      }

      return response.text();
    } catch (error) {
      if (error instanceof JobNotFoundError) throw error;
      throw new ProviderError(`Failed to fetch logs: ${error}`, 'github');
    }
  }

  async listArtifacts(repo: string, runId: string): Promise<Artifact[]> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      const data = await this.fetch<{ artifacts: GitHubArtifact[] }>(
        `/repos/${owner}/${repoName}/actions/runs/${runId}/artifacts`
      );

      return data.artifacts.map(a => ({
        id: a.id.toString(),
        runId,
        name: a.name,
        sizeBytes: a.size_in_bytes,
        createdAt: new Date(a.created_at),
        expiresAt: a.expires_at ? new Date(a.expires_at) : undefined,
        downloadUrl: a.archive_download_url
      }));
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('404')) {
        throw new RunNotFoundError(runId, 'github');
      }
      throw error;
    }
  }

  async downloadArtifact(repo: string, artifactId: string): Promise<Buffer> {
    const { owner, repo: repoName } = this.parseRepo(repo);

    try {
      const token = await this.getToken();

      const response = await fetch(
        `${this.apiUrl}/repos/${owner}/${repoName}/actions/artifacts/${artifactId}/zip`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          redirect: 'follow'
        }
      );

      if (response.status === 404) {
        throw new ArtifactNotFoundError(artifactId, 'github');
      }

      if (!response.ok) {
        throw new ProviderError(`Failed to download artifact: ${response.status}`, 'github');
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof ArtifactNotFoundError) throw error;
      throw new ProviderError(`Failed to download artifact: ${error}`, 'github');
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      await this.fetch('/user');

      return {
        healthy: true,
        message: 'GitHub API is accessible',
        latencyMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime
      };
    }
  }
}
