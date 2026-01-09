import type { Pipeline, Run, Job, Artifact, Step } from '../src/types/index.ts';

/**
 * Create a test pipeline
 */
export function createTestPipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: 'pipeline-1',
    name: 'CI',
    path: '.github/workflows/ci.yml',
    repo: 'owner/repo',
    defaultBranch: 'main',
    ...overrides
  };
}

/**
 * Create a test run
 */
export function createTestRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'run-1',
    pipelineId: 'pipeline-1',
    pipelineName: 'CI',
    repo: 'owner/repo',
    status: 'completed',
    conclusion: 'success',
    branch: 'main',
    commit: 'abc123',
    commitMessage: 'feat: add new feature',
    triggeredBy: 'user',
    triggerEvent: 'push',
    startedAt: new Date('2026-01-07T10:00:00Z'),
    completedAt: new Date('2026-01-07T10:05:00Z'),
    duration: 300,
    url: 'https://github.com/owner/repo/actions/runs/1',
    ...overrides
  };
}

/**
 * Create a test job
 */
export function createTestJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    runId: 'run-1',
    name: 'build',
    status: 'completed',
    conclusion: 'success',
    startedAt: new Date('2026-01-07T10:00:00Z'),
    completedAt: new Date('2026-01-07T10:03:00Z'),
    duration: 180,
    runner: 'ubuntu-latest',
    ...overrides
  };
}

/**
 * Create a test step
 */
export function createTestStep(overrides: Partial<Step> = {}): Step {
  return {
    name: 'Checkout',
    status: 'completed',
    conclusion: 'success',
    number: 1,
    startedAt: new Date('2026-01-07T10:00:00Z'),
    completedAt: new Date('2026-01-07T10:00:05Z'),
    ...overrides
  };
}

/**
 * Create a test artifact
 */
export function createTestArtifact(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: 'artifact-1',
    runId: 'run-1',
    name: 'build-output',
    sizeBytes: 1024 * 1024,
    createdAt: new Date('2026-01-07T10:05:00Z'),
    expiresAt: new Date('2026-01-14T10:05:00Z'),
    ...overrides
  };
}
