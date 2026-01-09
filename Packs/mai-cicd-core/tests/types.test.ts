import { describe, test, expect } from 'bun:test';
import type {
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
} from '../src/types/index.ts';
import {
  createTestPipeline,
  createTestRun,
  createTestJob,
  createTestStep,
  createTestArtifact,
} from './fixtures.ts';

describe('Pipeline type', () => {
  test('should have required fields', () => {
    const pipeline: Pipeline = createTestPipeline();

    expect(pipeline.id).toBeDefined();
    expect(pipeline.name).toBeDefined();
    expect(pipeline.path).toBeDefined();
    expect(pipeline.repo).toBeDefined();
  });

  test('should allow optional fields', () => {
    const pipeline: Pipeline = createTestPipeline({
      defaultBranch: 'develop',
      metadata: { key: 'value' }
    });

    expect(pipeline.defaultBranch).toBe('develop');
    expect(pipeline.metadata).toEqual({ key: 'value' });
  });
});

describe('Run type', () => {
  test('should have required fields', () => {
    const run: Run = createTestRun();

    expect(run.id).toBeDefined();
    expect(run.pipelineId).toBeDefined();
    expect(run.pipelineName).toBeDefined();
    expect(run.repo).toBeDefined();
    expect(run.status).toBeDefined();
    expect(run.branch).toBeDefined();
    expect(run.commit).toBeDefined();
    expect(run.triggeredBy).toBeDefined();
    expect(run.triggerEvent).toBeDefined();
    expect(run.url).toBeDefined();
  });

  test('should support all status values', () => {
    const statuses: RunStatus[] = ['pending', 'queued', 'running', 'completed'];

    for (const status of statuses) {
      const run = createTestRun({ status });
      expect(run.status).toBe(status);
    }
  });

  test('should support all conclusion values', () => {
    const conclusions: RunConclusion[] = ['success', 'failure', 'cancelled', 'skipped', 'timed_out'];

    for (const conclusion of conclusions) {
      const run = createTestRun({ conclusion });
      expect(run.conclusion).toBe(conclusion);
    }
  });
});

describe('RunQuery type', () => {
  test('should allow filtering by various criteria', () => {
    const query: RunQuery = {
      pipelineId: 'pipeline-1',
      branch: 'main',
      status: 'running',
      limit: 10,
      offset: 0
    };

    expect(query.pipelineId).toBe('pipeline-1');
    expect(query.branch).toBe('main');
    expect(query.status).toBe('running');
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(0);
  });

  test('should allow array of statuses', () => {
    const query: RunQuery = {
      status: ['pending', 'running']
    };

    expect(query.status).toEqual(['pending', 'running']);
  });
});

describe('TriggerOptions type', () => {
  test('should allow trigger configuration', () => {
    const options: TriggerOptions = {
      branch: 'feature-branch',
      inputs: { deploy: 'true', env: 'staging' },
      commitSha: 'abc123'
    };

    expect(options.branch).toBe('feature-branch');
    expect(options.inputs).toEqual({ deploy: 'true', env: 'staging' });
    expect(options.commitSha).toBe('abc123');
  });
});

describe('Job type', () => {
  test('should have required fields', () => {
    const job: Job = createTestJob();

    expect(job.id).toBeDefined();
    expect(job.runId).toBeDefined();
    expect(job.name).toBeDefined();
    expect(job.status).toBeDefined();
  });

  test('should support all status values', () => {
    const statuses: JobStatus[] = ['pending', 'queued', 'running', 'completed'];

    for (const status of statuses) {
      const job = createTestJob({ status });
      expect(job.status).toBe(status);
    }
  });

  test('should allow steps', () => {
    const steps: Step[] = [
      createTestStep({ name: 'Checkout', number: 1 }),
      createTestStep({ name: 'Build', number: 2 }),
      createTestStep({ name: 'Test', number: 3 }),
    ];

    const job = createTestJob({ steps });
    expect(job.steps).toHaveLength(3);
    expect(job.steps?.[0].name).toBe('Checkout');
    expect(job.steps?.[1].name).toBe('Build');
    expect(job.steps?.[2].name).toBe('Test');
  });
});

describe('Step type', () => {
  test('should have required fields', () => {
    const step: Step = createTestStep();

    expect(step.name).toBeDefined();
    expect(step.status).toBeDefined();
    expect(step.number).toBeDefined();
  });
});

describe('Artifact type', () => {
  test('should have required fields', () => {
    const artifact: Artifact = createTestArtifact();

    expect(artifact.id).toBeDefined();
    expect(artifact.runId).toBeDefined();
    expect(artifact.name).toBeDefined();
    expect(artifact.sizeBytes).toBeDefined();
    expect(artifact.createdAt).toBeDefined();
  });

  test('should allow optional fields', () => {
    const artifact: Artifact = createTestArtifact({
      expiresAt: new Date('2026-02-07'),
      downloadUrl: 'https://example.com/artifact.zip'
    });

    expect(artifact.expiresAt).toBeDefined();
    expect(artifact.downloadUrl).toBe('https://example.com/artifact.zip');
  });
});

describe('HealthStatus type', () => {
  test('should indicate healthy status', () => {
    const status: HealthStatus = {
      healthy: true,
      message: 'OK',
      latencyMs: 50
    };

    expect(status.healthy).toBe(true);
    expect(status.message).toBe('OK');
    expect(status.latencyMs).toBe(50);
  });

  test('should indicate unhealthy status', () => {
    const status: HealthStatus = {
      healthy: false,
      message: 'Connection failed',
      details: { error: 'ECONNREFUSED' }
    };

    expect(status.healthy).toBe(false);
    expect(status.message).toBe('Connection failed');
    expect(status.details).toEqual({ error: 'ECONNREFUSED' });
  });
});
