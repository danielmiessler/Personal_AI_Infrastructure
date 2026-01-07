import type {
  CICDProvider,
  Pipeline,
  Run,
  RunQuery,
  TriggerOptions,
  Job,
  Artifact,
  HealthStatus,
} from 'kai-cicd-core';
import {
  PipelineNotFoundError,
  RunNotFoundError,
  JobNotFoundError,
  ArtifactNotFoundError,
  ProviderError,
} from 'kai-cicd-core';

/**
 * Method call record for verification
 */
export interface MethodCall {
  method: string;
  args: unknown[];
  timestamp: Date;
}

/**
 * Configuration for MockCICDAdapter
 */
export interface MockCICDConfig {
  pipelines?: Pipeline[];
  runs?: Run[];
  jobs?: Job[];
  artifacts?: Map<string, { artifact: Artifact; content: Buffer }>;
  simulateLatency?: number;
  failureRate?: number;
}

/**
 * MockCICDAdapter - Mock implementation of CICDProvider for testing
 */
export default class MockCICDAdapter implements CICDProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  private pipelines: Map<string, Pipeline> = new Map();
  private runs: Map<string, Run> = new Map();
  private jobs: Map<string, Job> = new Map();
  private artifacts: Map<string, { artifact: Artifact; content: Buffer }> = new Map();
  private latency = 0;
  private failureRate = 0;
  private callLog: MethodCall[] = [];

  constructor(config: MockCICDConfig = {}) {
    if (config.pipelines) {
      for (const pipeline of config.pipelines) {
        this.pipelines.set(pipeline.id, pipeline);
      }
    }
    if (config.runs) {
      for (const run of config.runs) {
        this.runs.set(run.id, run);
      }
    }
    if (config.jobs) {
      for (const job of config.jobs) {
        this.jobs.set(job.id, job);
      }
    }
    if (config.artifacts) {
      this.artifacts = config.artifacts;
    }
    if (config.simulateLatency !== undefined) {
      this.latency = config.simulateLatency;
    }
    if (config.failureRate !== undefined) {
      this.failureRate = config.failureRate;
    }
  }

  // Test helpers

  setPipelines(pipelines: Pipeline[]): void {
    this.pipelines.clear();
    for (const pipeline of pipelines) {
      this.pipelines.set(pipeline.id, pipeline);
    }
  }

  addPipeline(pipeline: Pipeline): void {
    this.pipelines.set(pipeline.id, pipeline);
  }

  clearPipelines(): void {
    this.pipelines.clear();
  }

  setRuns(runs: Run[]): void {
    this.runs.clear();
    for (const run of runs) {
      this.runs.set(run.id, run);
    }
  }

  addRun(run: Run): void {
    this.runs.set(run.id, run);
  }

  updateRun(runId: string, updates: Partial<Run>): void {
    const run = this.runs.get(runId);
    if (run) {
      this.runs.set(runId, { ...run, ...updates });
    }
  }

  clearRuns(): void {
    this.runs.clear();
  }

  setJobs(jobs: Job[]): void {
    this.jobs.clear();
    for (const job of jobs) {
      this.jobs.set(job.id, job);
    }
  }

  addJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  clearJobs(): void {
    this.jobs.clear();
  }

  setArtifacts(artifacts: Artifact[]): void {
    this.artifacts.clear();
    for (const artifact of artifacts) {
      this.artifacts.set(artifact.id, { artifact, content: Buffer.from('mock content') });
    }
  }

  addArtifact(artifact: Artifact, content: Buffer): void {
    this.artifacts.set(artifact.id, { artifact, content });
  }

  clearArtifacts(): void {
    this.artifacts.clear();
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate;
  }

  setLatency(ms: number): void {
    this.latency = ms;
  }

  getCallLog(): MethodCall[] {
    return [...this.callLog];
  }

  clearCallLog(): void {
    this.callLog = [];
  }

  // Private helpers

  private async simulateCall(method: string, args: unknown[]): Promise<void> {
    this.callLog.push({ method, args, timestamp: new Date() });

    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }

    if (this.failureRate > 0 && Math.random() * 100 < this.failureRate) {
      throw new ProviderError(`Simulated failure in ${method}`, 'mock');
    }
  }

  // CICDProvider implementation

  async listPipelines(repo: string): Promise<Pipeline[]> {
    await this.simulateCall('listPipelines', [repo]);
    return Array.from(this.pipelines.values()).filter(p => p.repo === repo);
  }

  async getPipeline(repo: string, pipelineId: string): Promise<Pipeline> {
    await this.simulateCall('getPipeline', [repo, pipelineId]);
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.repo !== repo) {
      throw new PipelineNotFoundError(pipelineId, 'mock');
    }
    return pipeline;
  }

  async listRuns(repo: string, options?: RunQuery): Promise<Run[]> {
    await this.simulateCall('listRuns', [repo, options]);

    let runs = Array.from(this.runs.values()).filter(r => r.repo === repo);

    if (options?.pipelineId) {
      runs = runs.filter(r => r.pipelineId === options.pipelineId);
    }
    if (options?.branch) {
      runs = runs.filter(r => r.branch === options.branch);
    }
    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      runs = runs.filter(r => statuses.includes(r.status));
    }

    // Sort by startedAt descending
    runs.sort((a, b) => {
      const aTime = a.startedAt?.getTime() ?? 0;
      const bTime = b.startedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    if (options?.offset) {
      runs = runs.slice(options.offset);
    }
    if (options?.limit) {
      runs = runs.slice(0, options.limit);
    }

    return runs;
  }

  async getRun(repo: string, runId: string): Promise<Run> {
    await this.simulateCall('getRun', [repo, runId]);
    const run = this.runs.get(runId);
    if (!run || run.repo !== repo) {
      throw new RunNotFoundError(runId, 'mock');
    }
    return run;
  }

  async triggerRun(repo: string, pipelineId: string, options?: TriggerOptions): Promise<Run> {
    await this.simulateCall('triggerRun', [repo, pipelineId, options]);

    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline || pipeline.repo !== repo) {
      throw new PipelineNotFoundError(pipelineId, 'mock');
    }

    const run: Run = {
      id: `run-${Date.now()}`,
      pipelineId,
      pipelineName: pipeline.name,
      repo,
      status: 'queued',
      branch: options?.branch ?? pipeline.defaultBranch ?? 'main',
      commit: options?.commitSha ?? 'mock-sha',
      triggeredBy: 'mock-user',
      triggerEvent: 'manual',
      startedAt: new Date(),
      url: `https://mock.ci/${repo}/runs/${Date.now()}`,
      metadata: { inputs: options?.inputs }
    };

    this.runs.set(run.id, run);
    return run;
  }

  async cancelRun(repo: string, runId: string): Promise<void> {
    await this.simulateCall('cancelRun', [repo, runId]);
    const run = this.runs.get(runId);
    if (!run || run.repo !== repo) {
      throw new RunNotFoundError(runId, 'mock');
    }
    this.runs.set(runId, {
      ...run,
      status: 'completed',
      conclusion: 'cancelled',
      completedAt: new Date()
    });
  }

  async retryRun(repo: string, runId: string): Promise<Run> {
    await this.simulateCall('retryRun', [repo, runId]);
    const originalRun = this.runs.get(runId);
    if (!originalRun || originalRun.repo !== repo) {
      throw new RunNotFoundError(runId, 'mock');
    }

    const newRun: Run = {
      ...originalRun,
      id: `run-${Date.now()}`,
      status: 'queued',
      conclusion: undefined,
      startedAt: new Date(),
      completedAt: undefined,
      duration: undefined
    };

    this.runs.set(newRun.id, newRun);
    return newRun;
  }

  async listJobs(repo: string, runId: string): Promise<Job[]> {
    await this.simulateCall('listJobs', [repo, runId]);
    const run = this.runs.get(runId);
    if (!run || run.repo !== repo) {
      throw new RunNotFoundError(runId, 'mock');
    }
    return Array.from(this.jobs.values()).filter(j => j.runId === runId);
  }

  async getJobLogs(repo: string, jobId: string): Promise<string> {
    await this.simulateCall('getJobLogs', [repo, jobId]);
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new JobNotFoundError(jobId, 'mock');
    }
    return `[Mock logs for job ${jobId}]\nStep 1: Checkout - success\nStep 2: Build - success\nStep 3: Test - success`;
  }

  async retryJob(repo: string, runId: string, jobId: string): Promise<void> {
    await this.simulateCall('retryJob', [repo, runId, jobId]);
    const job = this.jobs.get(jobId);
    if (!job || job.runId !== runId) {
      throw new JobNotFoundError(jobId, 'mock');
    }
    this.jobs.set(jobId, {
      ...job,
      status: 'queued',
      conclusion: undefined,
      startedAt: new Date(),
      completedAt: undefined
    });
  }

  async listArtifacts(repo: string, runId: string): Promise<Artifact[]> {
    await this.simulateCall('listArtifacts', [repo, runId]);
    const run = this.runs.get(runId);
    if (!run || run.repo !== repo) {
      throw new RunNotFoundError(runId, 'mock');
    }
    return Array.from(this.artifacts.values())
      .map(({ artifact }) => artifact)
      .filter(a => a.runId === runId);
  }

  async downloadArtifact(repo: string, artifactId: string): Promise<Buffer> {
    await this.simulateCall('downloadArtifact', [repo, artifactId]);
    const entry = this.artifacts.get(artifactId);
    if (!entry) {
      throw new ArtifactNotFoundError(artifactId, 'mock');
    }
    return entry.content;
  }

  async healthCheck(): Promise<HealthStatus> {
    await this.simulateCall('healthCheck', []);
    return {
      healthy: true,
      message: 'Mock adapter is healthy',
      latencyMs: this.latency
    };
  }
}
