import { describe, test, expect, beforeEach } from 'bun:test';
import { MockCICDAdapter } from '../src/index.ts';
import type { Pipeline, Run, Job, Artifact } from 'mai-cicd-core';
import {
  PipelineNotFoundError,
  RunNotFoundError,
  JobNotFoundError,
  ArtifactNotFoundError,
} from 'mai-cicd-core';

// Test fixtures
const createPipeline = (overrides: Partial<Pipeline> = {}): Pipeline => ({
  id: 'pipeline-1',
  name: 'CI',
  path: '.github/workflows/ci.yml',
  repo: 'owner/repo',
  defaultBranch: 'main',
  ...overrides
});

const createRun = (overrides: Partial<Run> = {}): Run => ({
  id: 'run-1',
  pipelineId: 'pipeline-1',
  pipelineName: 'CI',
  repo: 'owner/repo',
  status: 'completed',
  conclusion: 'success',
  branch: 'main',
  commit: 'abc123',
  triggeredBy: 'user',
  triggerEvent: 'push',
  startedAt: new Date('2026-01-07T10:00:00Z'),
  completedAt: new Date('2026-01-07T10:05:00Z'),
  duration: 300,
  url: 'https://mock.ci/run-1',
  ...overrides
});

const createJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  runId: 'run-1',
  name: 'build',
  status: 'completed',
  conclusion: 'success',
  startedAt: new Date('2026-01-07T10:00:00Z'),
  completedAt: new Date('2026-01-07T10:03:00Z'),
  duration: 180,
  ...overrides
});

const createArtifact = (overrides: Partial<Artifact> = {}): Artifact => ({
  id: 'artifact-1',
  runId: 'run-1',
  name: 'build-output',
  sizeBytes: 1024,
  createdAt: new Date('2026-01-07T10:05:00Z'),
  ...overrides
});

describe('MockCICDAdapter', () => {
  let adapter: MockCICDAdapter;

  beforeEach(() => {
    adapter = new MockCICDAdapter();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(adapter.name).toBe('mock');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should accept initial configuration', () => {
      const pipeline = createPipeline();
      const run = createRun();
      const job = createJob();

      const configuredAdapter = new MockCICDAdapter({
        pipelines: [pipeline],
        runs: [run],
        jobs: [job],
        simulateLatency: 100,
        failureRate: 10
      });

      expect(configuredAdapter.getCallLog()).toEqual([]);
    });
  });

  describe('pipeline operations', () => {
    test('listPipelines should return pipelines for repo', async () => {
      const pipeline1 = createPipeline({ id: 'p1', repo: 'owner/repo' });
      const pipeline2 = createPipeline({ id: 'p2', repo: 'other/repo' });
      adapter.setPipelines([pipeline1, pipeline2]);

      const result = await adapter.listPipelines('owner/repo');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    test('getPipeline should return specific pipeline', async () => {
      const pipeline = createPipeline();
      adapter.addPipeline(pipeline);

      const result = await adapter.getPipeline('owner/repo', 'pipeline-1');

      expect(result.id).toBe('pipeline-1');
      expect(result.name).toBe('CI');
    });

    test('getPipeline should throw for non-existent pipeline', async () => {
      await expect(adapter.getPipeline('owner/repo', 'nonexistent'))
        .rejects.toThrow(PipelineNotFoundError);
    });

    test('clearPipelines should remove all pipelines', async () => {
      adapter.addPipeline(createPipeline());
      adapter.clearPipelines();

      const result = await adapter.listPipelines('owner/repo');
      expect(result).toHaveLength(0);
    });
  });

  describe('run operations', () => {
    test('listRuns should return runs for repo', async () => {
      const run1 = createRun({ id: 'r1', repo: 'owner/repo' });
      const run2 = createRun({ id: 'r2', repo: 'other/repo' });
      adapter.setRuns([run1, run2]);

      const result = await adapter.listRuns('owner/repo');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });

    test('listRuns should filter by pipeline', async () => {
      const run1 = createRun({ id: 'r1', pipelineId: 'ci' });
      const run2 = createRun({ id: 'r2', pipelineId: 'deploy' });
      adapter.setRuns([run1, run2]);

      const result = await adapter.listRuns('owner/repo', { pipelineId: 'ci' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });

    test('listRuns should filter by branch', async () => {
      const run1 = createRun({ id: 'r1', branch: 'main' });
      const run2 = createRun({ id: 'r2', branch: 'develop' });
      adapter.setRuns([run1, run2]);

      const result = await adapter.listRuns('owner/repo', { branch: 'main' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });

    test('listRuns should filter by status', async () => {
      const run1 = createRun({ id: 'r1', status: 'running' });
      const run2 = createRun({ id: 'r2', status: 'completed' });
      adapter.setRuns([run1, run2]);

      const result = await adapter.listRuns('owner/repo', { status: 'running' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('r1');
    });

    test('listRuns should support limit and offset', async () => {
      const runs = Array.from({ length: 5 }, (_, i) =>
        createRun({ id: `r${i}`, startedAt: new Date(Date.now() - i * 1000) })
      );
      adapter.setRuns(runs);

      const result = await adapter.listRuns('owner/repo', { limit: 2, offset: 1 });

      expect(result).toHaveLength(2);
    });

    test('getRun should return specific run', async () => {
      adapter.addRun(createRun());

      const result = await adapter.getRun('owner/repo', 'run-1');

      expect(result.id).toBe('run-1');
    });

    test('getRun should throw for non-existent run', async () => {
      await expect(adapter.getRun('owner/repo', 'nonexistent'))
        .rejects.toThrow(RunNotFoundError);
    });

    test('triggerRun should create new run', async () => {
      adapter.addPipeline(createPipeline());

      const result = await adapter.triggerRun('owner/repo', 'pipeline-1', {
        branch: 'feature',
        inputs: { deploy: 'true' }
      });

      expect(result.pipelineId).toBe('pipeline-1');
      expect(result.branch).toBe('feature');
      expect(result.status).toBe('queued');
      expect(result.triggerEvent).toBe('manual');
    });

    test('triggerRun should throw for non-existent pipeline', async () => {
      await expect(adapter.triggerRun('owner/repo', 'nonexistent'))
        .rejects.toThrow(PipelineNotFoundError);
    });

    test('cancelRun should update run status', async () => {
      adapter.addRun(createRun({ status: 'running' }));

      await adapter.cancelRun('owner/repo', 'run-1');

      const run = await adapter.getRun('owner/repo', 'run-1');
      expect(run.status).toBe('completed');
      expect(run.conclusion).toBe('cancelled');
    });

    test('retryRun should create new run based on original', async () => {
      adapter.addRun(createRun({ conclusion: 'failure' }));

      const result = await adapter.retryRun('owner/repo', 'run-1');

      expect(result.id).not.toBe('run-1');
      expect(result.status).toBe('queued');
      expect(result.conclusion).toBeUndefined();
    });

    test('updateRun should modify existing run', async () => {
      adapter.addRun(createRun({ status: 'running' }));

      adapter.updateRun('run-1', { status: 'completed', conclusion: 'success' });

      const run = await adapter.getRun('owner/repo', 'run-1');
      expect(run.status).toBe('completed');
      expect(run.conclusion).toBe('success');
    });
  });

  describe('job operations', () => {
    test('listJobs should return jobs for run', async () => {
      adapter.addRun(createRun());
      adapter.addJob(createJob({ id: 'j1', runId: 'run-1' }));
      adapter.addJob(createJob({ id: 'j2', runId: 'run-2' }));

      const result = await adapter.listJobs('owner/repo', 'run-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('j1');
    });

    test('listJobs should throw for non-existent run', async () => {
      await expect(adapter.listJobs('owner/repo', 'nonexistent'))
        .rejects.toThrow(RunNotFoundError);
    });

    test('getJobLogs should return mock logs', async () => {
      adapter.addJob(createJob());

      const logs = await adapter.getJobLogs('owner/repo', 'job-1');

      expect(logs).toContain('Mock logs');
      expect(logs).toContain('job-1');
    });

    test('getJobLogs should throw for non-existent job', async () => {
      await expect(adapter.getJobLogs('owner/repo', 'nonexistent'))
        .rejects.toThrow(JobNotFoundError);
    });

    test('retryJob should reset job status', async () => {
      adapter.addJob(createJob({ status: 'completed', conclusion: 'failure' }));

      await adapter.retryJob('owner/repo', 'run-1', 'job-1');

      const jobs = await adapter.listJobs('owner/repo', 'run-1').catch(() => []);
      // Note: We need a run for listJobs to work
      adapter.addRun(createRun());
      const jobsAfter = await adapter.listJobs('owner/repo', 'run-1');
      expect(jobsAfter[0].status).toBe('queued');
      expect(jobsAfter[0].conclusion).toBeUndefined();
    });
  });

  describe('artifact operations', () => {
    test('listArtifacts should return artifacts for run', async () => {
      adapter.addRun(createRun());
      adapter.addArtifact(createArtifact({ id: 'a1', runId: 'run-1' }), Buffer.from('content1'));
      adapter.addArtifact(createArtifact({ id: 'a2', runId: 'run-2' }), Buffer.from('content2'));

      const result = await adapter.listArtifacts('owner/repo', 'run-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
    });

    test('listArtifacts should throw for non-existent run', async () => {
      await expect(adapter.listArtifacts('owner/repo', 'nonexistent'))
        .rejects.toThrow(RunNotFoundError);
    });

    test('downloadArtifact should return artifact content', async () => {
      const content = Buffer.from('test artifact content');
      adapter.addArtifact(createArtifact(), content);

      const result = await adapter.downloadArtifact('owner/repo', 'artifact-1');

      expect(result.toString()).toBe('test artifact content');
    });

    test('downloadArtifact should throw for non-existent artifact', async () => {
      await expect(adapter.downloadArtifact('owner/repo', 'nonexistent'))
        .rejects.toThrow(ArtifactNotFoundError);
    });

    test('setArtifacts should set default content', async () => {
      adapter.addRun(createRun());
      adapter.setArtifacts([createArtifact()]);

      const content = await adapter.downloadArtifact('owner/repo', 'artifact-1');
      expect(content.toString()).toBe('mock content');
    });
  });

  describe('health check', () => {
    test('healthCheck should return healthy status', async () => {
      const result = await adapter.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Mock adapter is healthy');
    });
  });

  describe('call logging', () => {
    test('should log method calls', async () => {
      adapter.addPipeline(createPipeline());
      await adapter.listPipelines('owner/repo');
      await adapter.getPipeline('owner/repo', 'pipeline-1');

      const calls = adapter.getCallLog();

      expect(calls).toHaveLength(2);
      expect(calls[0].method).toBe('listPipelines');
      expect(calls[1].method).toBe('getPipeline');
    });

    test('clearCallLog should remove all calls', async () => {
      await adapter.healthCheck();
      adapter.clearCallLog();

      expect(adapter.getCallLog()).toHaveLength(0);
    });
  });

  describe('simulated latency', () => {
    test('should delay responses when latency is set', async () => {
      adapter.setLatency(50);

      const start = Date.now();
      await adapter.healthCheck();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
    });
  });

  describe('simulated failures', () => {
    test('should throw errors based on failure rate', async () => {
      adapter.setFailureRate(100); // 100% failure rate

      await expect(adapter.healthCheck()).rejects.toThrow('Simulated failure');
    });

    test('should not fail when failure rate is 0', async () => {
      adapter.setFailureRate(0);

      await expect(adapter.healthCheck()).resolves.toBeDefined();
    });
  });
});
