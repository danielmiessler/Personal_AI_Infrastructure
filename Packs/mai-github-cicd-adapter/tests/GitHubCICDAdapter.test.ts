import { describe, test, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { GitHubCICDAdapter } from '../src/index.ts';

// Mock fetch globally
const originalFetch = globalThis.fetch;

describe('GitHubCICDAdapter', () => {
  let adapter: GitHubCICDAdapter;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    // Create adapter with explicit token to avoid keychain lookup
    adapter = new GitHubCICDAdapter({ token: 'test-token' });
    fetchMock = mock(() => Promise.resolve(new Response('{}')));
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('constructor', () => {
    test('should use default API URL', () => {
      expect(adapter.name).toBe('github');
      expect(adapter.version).toBe('1.0.0');
    });

    test('should accept custom API URL', () => {
      const customAdapter = new GitHubCICDAdapter({
        apiUrl: 'https://github.example.com/api/v3',
        token: 'test'
      });
      expect(customAdapter.name).toBe('github');
    });
  });

  describe('listPipelines', () => {
    test('should return mapped workflows', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({
          workflows: [
            { id: 1, name: 'CI', path: '.github/workflows/ci.yml', state: 'active' },
            { id: 2, name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active' }
          ]
        })))
      );

      const pipelines = await adapter.listPipelines('owner/repo');

      expect(pipelines).toHaveLength(2);
      expect(pipelines[0].id).toBe('1');
      expect(pipelines[0].name).toBe('CI');
      expect(pipelines[0].path).toBe('.github/workflows/ci.yml');
      expect(pipelines[0].repo).toBe('owner/repo');
    });

    test('should parse owner/repo from full URL', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ workflows: [] })))
      );

      await adapter.listPipelines('https://github.com/owner/repo');

      expect(fetchMock).toHaveBeenCalled();
      const url = (fetchMock.mock.calls[0] as [string])[0];
      expect(url).toContain('/repos/owner/repo/');
    });
  });

  describe('listRuns', () => {
    test('should return mapped workflow runs', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({
          workflow_runs: [{
            id: 123,
            workflow_id: 1,
            name: 'CI',
            head_branch: 'main',
            head_sha: 'abc123',
            status: 'completed',
            conclusion: 'success',
            event: 'push',
            created_at: '2026-01-07T10:00:00Z',
            updated_at: '2026-01-07T10:05:00Z',
            run_started_at: '2026-01-07T10:00:00Z',
            html_url: 'https://github.com/owner/repo/actions/runs/123',
            actor: { login: 'user' },
            triggering_actor: { login: 'user' }
          }]
        })))
      );

      const runs = await adapter.listRuns('owner/repo');

      expect(runs).toHaveLength(1);
      expect(runs[0].id).toBe('123');
      expect(runs[0].pipelineId).toBe('1');
      expect(runs[0].status).toBe('completed');
      expect(runs[0].conclusion).toBe('success');
      expect(runs[0].branch).toBe('main');
      expect(runs[0].commit).toBe('abc123');
      expect(runs[0].triggeredBy).toBe('user');
      expect(runs[0].triggerEvent).toBe('push');
    });

    test('should apply query filters', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ workflow_runs: [] })))
      );

      await adapter.listRuns('owner/repo', {
        branch: 'develop',
        limit: 10
      });

      const url = (fetchMock.mock.calls[0] as [string])[0];
      expect(url).toContain('branch=develop');
      expect(url).toContain('per_page=10');
    });

    test('should use workflow-specific endpoint when pipelineId provided', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ workflow_runs: [] })))
      );

      await adapter.listRuns('owner/repo', { pipelineId: '123' });

      const url = (fetchMock.mock.calls[0] as [string])[0];
      expect(url).toContain('/workflows/123/runs');
    });
  });

  describe('status mapping', () => {
    test('should map GitHub statuses correctly', async () => {
      const testCases = [
        { status: 'queued', expected: 'queued' },
        { status: 'in_progress', expected: 'running' },
        { status: 'completed', expected: 'completed' },
        { status: 'waiting', expected: 'pending' },
        { status: 'pending', expected: 'pending' }
      ];

      for (const { status, expected } of testCases) {
        fetchMock.mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({
            workflow_runs: [{
              id: 1, workflow_id: 1, name: 'CI',
              head_branch: 'main', head_sha: 'abc',
              status, conclusion: null, event: 'push',
              created_at: '2026-01-07T10:00:00Z',
              updated_at: '2026-01-07T10:00:00Z',
              html_url: 'url',
              actor: { login: 'user' },
              triggering_actor: { login: 'user' }
            }]
          })))
        );

        const runs = await adapter.listRuns('owner/repo');
        expect(runs[0].status).toBe(expected);
      }
    });

    test('should map GitHub conclusions correctly', async () => {
      const testCases = [
        { conclusion: 'success', expected: 'success' },
        { conclusion: 'failure', expected: 'failure' },
        { conclusion: 'cancelled', expected: 'cancelled' },
        { conclusion: 'skipped', expected: 'skipped' },
        { conclusion: 'timed_out', expected: 'timed_out' }
      ];

      for (const { conclusion, expected } of testCases) {
        fetchMock.mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({
            workflow_runs: [{
              id: 1, workflow_id: 1, name: 'CI',
              head_branch: 'main', head_sha: 'abc',
              status: 'completed', conclusion, event: 'push',
              created_at: '2026-01-07T10:00:00Z',
              updated_at: '2026-01-07T10:00:00Z',
              html_url: 'url',
              actor: { login: 'user' },
              triggering_actor: { login: 'user' }
            }]
          })))
        );

        const runs = await adapter.listRuns('owner/repo');
        expect(runs[0].conclusion).toBe(expected);
      }
    });
  });

  describe('listJobs', () => {
    test('should return mapped jobs', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({
          jobs: [{
            id: 456,
            run_id: 123,
            name: 'build',
            status: 'completed',
            conclusion: 'success',
            started_at: '2026-01-07T10:00:00Z',
            completed_at: '2026-01-07T10:03:00Z',
            runner_name: 'ubuntu-latest',
            steps: [
              { name: 'Checkout', status: 'completed', conclusion: 'success', number: 1 }
            ]
          }]
        })))
      );

      const jobs = await adapter.listJobs('owner/repo', '123');

      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('456');
      expect(jobs[0].runId).toBe('123');
      expect(jobs[0].name).toBe('build');
      expect(jobs[0].status).toBe('completed');
      expect(jobs[0].steps).toHaveLength(1);
      expect(jobs[0].steps![0].name).toBe('Checkout');
    });
  });

  describe('listArtifacts', () => {
    test('should return mapped artifacts', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({
          artifacts: [{
            id: 789,
            name: 'build-output',
            size_in_bytes: 1024,
            created_at: '2026-01-07T10:05:00Z',
            expires_at: '2026-01-14T10:05:00Z',
            archive_download_url: 'https://api.github.com/artifacts/789/zip'
          }]
        })))
      );

      const artifacts = await adapter.listArtifacts('owner/repo', '123');

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].id).toBe('789');
      expect(artifacts[0].runId).toBe('123');
      expect(artifacts[0].name).toBe('build-output');
      expect(artifacts[0].sizeBytes).toBe(1024);
    });
  });

  describe('healthCheck', () => {
    test('should return healthy when API responds', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ login: 'user' })))
      );

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('GitHub API is accessible');
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
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

  describe('parseRepo', () => {
    test('should handle various repo formats', async () => {
      const formats = [
        'owner/repo',
        'https://github.com/owner/repo',
        'https://github.com/owner/repo.git',
        'git@github.com:owner/repo.git'
      ];

      for (const format of formats) {
        fetchMock.mockImplementation(() =>
          Promise.resolve(new Response(JSON.stringify({ workflows: [] })))
        );

        await adapter.listPipelines(format);

        const url = (fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string])[0];
        expect(url).toContain('/repos/owner/repo/');
      }
    });
  });
});
