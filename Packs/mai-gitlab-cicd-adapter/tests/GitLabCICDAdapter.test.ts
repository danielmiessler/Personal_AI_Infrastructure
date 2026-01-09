import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GitLabCICDAdapter } from '../src/index.ts';
import { ConfigurationError } from 'mai-cicd-core';

// Mock fetch globally
const originalFetch = globalThis.fetch;

describe('GitLabCICDAdapter', () => {
  let adapter: GitLabCICDAdapter;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    adapter = new GitLabCICDAdapter({ host: 'gitlab.com', token: 'test-token' });
    fetchMock = mock(() => Promise.resolve(new Response('{}')));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    test('should require host', () => {
      expect(() => new GitLabCICDAdapter({} as any)).toThrow(ConfigurationError);
    });

    test('should use default API version', () => {
      expect(adapter.name).toBe('gitlab');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should accept custom host', () => {
      const customAdapter = new GitLabCICDAdapter({
        host: 'gitlab.example.com',
        token: 'test'
      });
      expect(customAdapter.name).toBe('gitlab');
    });
  });

  describe('listPipelines', () => {
    test('should return virtual gitlab-ci pipeline', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: 123 })))
      );

      const pipelines = await adapter.listPipelines('group/project');

      expect(pipelines).toHaveLength(1);
      expect(pipelines[0].id).toBe('gitlab-ci');
      expect(pipelines[0].name).toBe('GitLab CI/CD');
      expect(pipelines[0].path).toBe('.gitlab-ci.yml');
    });

    test('should encode project path', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: 123 })))
      );

      await adapter.listPipelines('group/subgroup/project');

      const url = (fetchMock.mock.calls[0] as [string])[0];
      expect(url).toContain('group%2Fsubgroup%2Fproject');
    });
  });

  describe('listRuns', () => {
    test('should return mapped pipelines', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify([{
          id: 123,
          iid: 1,
          project_id: 456,
          sha: 'abc123',
          ref: 'main',
          status: 'success',
          source: 'push',
          created_at: '2026-01-07T10:00:00Z',
          updated_at: '2026-01-07T10:05:00Z',
          started_at: '2026-01-07T10:00:00Z',
          finished_at: '2026-01-07T10:05:00Z',
          duration: 300,
          web_url: 'https://gitlab.com/group/project/-/pipelines/123',
          user: { username: 'user' }
        }])))
      );

      const runs = await adapter.listRuns('group/project');

      expect(runs).toHaveLength(1);
      expect(runs[0].id).toBe('123');
      expect(runs[0].pipelineId).toBe('gitlab-ci');
      expect(runs[0].status).toBe('completed');
      expect(runs[0].conclusion).toBe('success');
      expect(runs[0].branch).toBe('main');
      expect(runs[0].commit).toBe('abc123');
      expect(runs[0].triggeredBy).toBe('user');
      expect(runs[0].triggerEvent).toBe('push');
    });

    test('should apply query filters', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify([])))
      );

      await adapter.listRuns('group/project', {
        branch: 'develop',
        limit: 10
      });

      const url = (fetchMock.mock.calls[0] as [string])[0];
      expect(url).toContain('ref=develop');
      expect(url).toContain('per_page=10');
    });
  });

  describe('status mapping', () => {
    test('should map GitLab statuses correctly', async () => {
      const testCases = [
        { status: 'created', expected: 'pending' },
        { status: 'waiting_for_resource', expected: 'pending' },
        { status: 'preparing', expected: 'pending' },
        { status: 'pending', expected: 'queued' },
        { status: 'running', expected: 'running' },
        { status: 'success', expected: 'completed' },
        { status: 'failed', expected: 'completed' },
        { status: 'canceled', expected: 'completed' },
        { status: 'skipped', expected: 'completed' }
      ];

      for (const { status, expected } of testCases) {
        fetchMock.mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify([{
            id: 1, iid: 1, project_id: 1, sha: 'abc', ref: 'main',
            status, source: 'push',
            created_at: '2026-01-07T10:00:00Z',
            updated_at: '2026-01-07T10:00:00Z',
            web_url: 'url',
            user: { username: 'user' }
          }])))
        );

        const runs = await adapter.listRuns('group/project');
        expect(runs[0].status).toBe(expected);
      }
    });

    test('should map GitLab conclusions correctly', async () => {
      const testCases = [
        { status: 'success', expected: 'success' },
        { status: 'failed', expected: 'failure' },
        { status: 'canceled', expected: 'cancelled' },
        { status: 'skipped', expected: 'skipped' }
      ];

      for (const { status, expected } of testCases) {
        fetchMock.mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify([{
            id: 1, iid: 1, project_id: 1, sha: 'abc', ref: 'main',
            status, source: 'push',
            created_at: '2026-01-07T10:00:00Z',
            updated_at: '2026-01-07T10:00:00Z',
            web_url: 'url',
            user: { username: 'user' }
          }])))
        );

        const runs = await adapter.listRuns('group/project');
        expect(runs[0].conclusion).toBe(expected);
      }
    });
  });

  describe('listJobs', () => {
    test('should return mapped jobs', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify([{
          id: 456,
          name: 'build',
          stage: 'build',
          status: 'success',
          started_at: '2026-01-07T10:00:00Z',
          finished_at: '2026-01-07T10:03:00Z',
          duration: 180,
          runner: { description: 'shared-runner' },
          pipeline: { id: 123 }
        }])))
      );

      const jobs = await adapter.listJobs('group/project', '123');

      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('456');
      expect(jobs[0].runId).toBe('123');
      expect(jobs[0].name).toBe('build');
      expect(jobs[0].status).toBe('completed');
      expect(jobs[0].runner).toBe('shared-runner');
      expect(jobs[0].metadata).toEqual({ stage: 'build' });
    });
  });

  describe('triggerRun', () => {
    test('should trigger pipeline with variables', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({
          id: 789,
          iid: 5,
          project_id: 123,
          sha: 'def456',
          ref: 'develop',
          status: 'pending',
          source: 'api',
          created_at: '2026-01-07T10:00:00Z',
          updated_at: '2026-01-07T10:00:00Z',
          web_url: 'https://gitlab.com/group/project/-/pipelines/789',
          user: { username: 'api' }
        })))
      );

      const run = await adapter.triggerRun('group/project', 'gitlab-ci', {
        branch: 'develop',
        inputs: { DEPLOY_ENV: 'staging' }
      });

      expect(run.id).toBe('789');
      expect(run.branch).toBe('develop');
      expect(run.status).toBe('queued');

      // Verify the request body
      const requestInit = (fetchMock.mock.calls[0] as [string, RequestInit])[1];
      const body = JSON.parse(requestInit.body as string);
      expect(body.ref).toBe('develop');
      expect(body.variables).toEqual([{ key: 'DEPLOY_ENV', value: 'staging' }]);
    });
  });

  describe('healthCheck', () => {
    test('should return healthy when API responds', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ username: 'user' })))
      );

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('GitLab API is accessible');
      expect(health.details?.host).toBe('gitlab.com');
    });

    test('should return unhealthy on error', async () => {
      fetchMock.mockImplementation(() =>
        Promise.reject(new Error('Network error'))
      );

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.message).toContain('Network error');
    });
  });

  describe('encodeProject', () => {
    test('should handle various project formats', async () => {
      const formats = [
        'group/project',
        'group/subgroup/project',
        'https://gitlab.com/group/project',
        'https://gitlab.com/group/project.git'
      ];

      for (const format of formats) {
        fetchMock.mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({ id: 123 })))
        );

        await adapter.listPipelines(format);

        const url = (fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string])[0];
        expect(url).toContain('/projects/');
      }
    });
  });
});
