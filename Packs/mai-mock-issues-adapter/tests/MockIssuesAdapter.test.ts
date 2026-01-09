import { describe, it, expect, beforeEach } from 'bun:test';
import MockIssuesAdapter from '../src/MockIssuesAdapter.ts';
import type { Issue, Project, Label } from 'mai-issues-core';
import { IssueNotFoundError, ProjectNotFoundError, LabelNotFoundError, ProviderError } from 'mai-issues-core';

describe('MockIssuesAdapter', () => {
  let adapter: MockIssuesAdapter;

  beforeEach(() => {
    adapter = new MockIssuesAdapter();
  });

  describe('constructor', () => {
    it('creates adapter with default config', () => {
      expect(adapter.name).toBe('mock');
      expect(adapter.version).toBe('1.0.0');
      expect(adapter.issueCount).toBe(0);
    });

    it('creates adapter with pre-populated issues', () => {
      const issues: Issue[] = [
        {
          id: 'issue-1',
          title: 'Test issue',
          status: 'open',
          type: 'task',
          labels: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      adapter = new MockIssuesAdapter({ issues });
      expect(adapter.issueCount).toBe(1);
    });

    it('creates adapter with pre-populated projects', async () => {
      const projects: Project[] = [
        { id: 'project-1', name: 'Test Project' },
      ];

      adapter = new MockIssuesAdapter({ projects });
      const result = await adapter.listProjects();
      expect(result).toHaveLength(1);
    });

    it('creates adapter with pre-populated labels', async () => {
      const labels: Label[] = [
        { id: 'label-1', name: 'bug', color: '#ff0000' },
      ];

      adapter = new MockIssuesAdapter({ labels });
      const result = await adapter.listLabels();
      expect(result).toHaveLength(1);
    });
  });

  describe('createIssue', () => {
    it('creates an issue with minimal input', async () => {
      const issue = await adapter.createIssue({ title: 'New task' });

      expect(issue.id).toMatch(/^issue-\d+$/);
      expect(issue.title).toBe('New task');
      expect(issue.status).toBe('open');
      expect(issue.type).toBe('task');
      expect(issue.labels).toEqual([]);
      expect(issue.createdAt).toBeInstanceOf(Date);
      expect(issue.updatedAt).toBeInstanceOf(Date);
    });

    it('creates an issue with full input', async () => {
      adapter.setLabels([{ id: 'label-1', name: 'bug' }]);
      adapter.setProjects([{ id: 'project-1', name: 'Main' }]);

      const dueDate = new Date('2026-12-31');
      const issue = await adapter.createIssue({
        title: 'Bug fix',
        description: 'Fix the login bug',
        type: 'bug',
        priority: 'high',
        labels: ['label-1'],
        assignee: 'user-1',
        projectId: 'project-1',
        dueDate,
        metadata: { source: 'api' },
      });

      expect(issue.title).toBe('Bug fix');
      expect(issue.description).toBe('Fix the login bug');
      expect(issue.type).toBe('bug');
      expect(issue.priority).toBe('high');
      expect(issue.labels).toHaveLength(1);
      expect(issue.assignee).toBe('user-1');
      expect(issue.project?.name).toBe('Main');
      expect(issue.dueDate).toEqual(dueDate);
      expect(issue.metadata?.source).toBe('api');
    });

    it('logs the method call', async () => {
      await adapter.createIssue({ title: 'Test' });
      const log = adapter.getCallLog();

      expect(log).toHaveLength(1);
      expect(log[0].method).toBe('createIssue');
      expect(log[0].args[0]).toEqual({ title: 'Test' });
    });
  });

  describe('getIssue', () => {
    it('retrieves an existing issue', async () => {
      const created = await adapter.createIssue({ title: 'Test' });
      const retrieved = await adapter.getIssue(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.title).toBe('Test');
    });

    it('throws IssueNotFoundError for non-existent issue', async () => {
      await expect(adapter.getIssue('nonexistent')).rejects.toThrow(IssueNotFoundError);
    });
  });

  describe('updateIssue', () => {
    it('updates issue fields', async () => {
      const created = await adapter.createIssue({ title: 'Original' });
      const updated = await adapter.updateIssue(created.id, {
        title: 'Updated',
        status: 'in_progress',
        priority: 'high',
      });

      expect(updated.title).toBe('Updated');
      expect(updated.status).toBe('in_progress');
      expect(updated.priority).toBe('high');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('sets completedAt when status is done', async () => {
      const created = await adapter.createIssue({ title: 'Test' });
      expect(created.completedAt).toBeUndefined();

      const updated = await adapter.updateIssue(created.id, { status: 'done' });
      expect(updated.completedAt).toBeInstanceOf(Date);
    });

    it('throws IssueNotFoundError for non-existent issue', async () => {
      await expect(
        adapter.updateIssue('nonexistent', { title: 'Test' })
      ).rejects.toThrow(IssueNotFoundError);
    });
  });

  describe('deleteIssue', () => {
    it('deletes an existing issue', async () => {
      const created = await adapter.createIssue({ title: 'Test' });
      await adapter.deleteIssue(created.id);

      expect(adapter.issueCount).toBe(0);
    });

    it('throws IssueNotFoundError for non-existent issue', async () => {
      await expect(adapter.deleteIssue('nonexistent')).rejects.toThrow(IssueNotFoundError);
    });
  });

  describe('listIssues', () => {
    beforeEach(async () => {
      await adapter.createIssue({ title: 'Task 1', type: 'task', priority: 'high' });
      await adapter.createIssue({ title: 'Bug 1', type: 'bug', priority: 'urgent' });
      await adapter.createIssue({ title: 'Task 2', type: 'task', priority: 'low' });
    });

    it('returns all issues without query', async () => {
      const issues = await adapter.listIssues();
      expect(issues).toHaveLength(3);
    });

    it('filters by status', async () => {
      await adapter.updateIssue('issue-1', { status: 'done' });

      const openIssues = await adapter.listIssues({ status: 'open' });
      expect(openIssues).toHaveLength(2);

      const doneIssues = await adapter.listIssues({ status: 'done' });
      expect(doneIssues).toHaveLength(1);
    });

    it('filters by multiple statuses', async () => {
      await adapter.updateIssue('issue-1', { status: 'done' });
      await adapter.updateIssue('issue-2', { status: 'in_progress' });

      const issues = await adapter.listIssues({ status: ['open', 'in_progress'] });
      expect(issues).toHaveLength(2);
    });

    it('filters by type', async () => {
      const tasks = await adapter.listIssues({ type: 'task' });
      expect(tasks).toHaveLength(2);

      const bugs = await adapter.listIssues({ type: 'bug' });
      expect(bugs).toHaveLength(1);
    });

    it('filters by priority', async () => {
      const highPriority = await adapter.listIssues({ priority: 'high' });
      expect(highPriority).toHaveLength(1);

      const urgentHigh = await adapter.listIssues({ priority: ['urgent', 'high'] });
      expect(urgentHigh).toHaveLength(2);
    });

    it('applies pagination', async () => {
      const page1 = await adapter.listIssues({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await adapter.listIssues({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(1);
    });
  });

  describe('searchIssues', () => {
    beforeEach(async () => {
      await adapter.createIssue({ title: 'Login bug', description: 'User cannot login' });
      await adapter.createIssue({ title: 'Performance issue', description: 'Page loads slowly' });
      await adapter.createIssue({ title: 'User profile', description: 'Add profile picture' });
    });

    it('searches by title', async () => {
      const results = await adapter.searchIssues('login');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Login bug');
    });

    it('searches by description', async () => {
      const results = await adapter.searchIssues('slowly');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Performance issue');
    });

    it('is case insensitive', async () => {
      const results = await adapter.searchIssues('LOGIN');
      expect(results).toHaveLength(1);
    });

    it('applies limit option', async () => {
      const results = await adapter.searchIssues('user', { limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe('listProjects', () => {
    it('returns all projects', async () => {
      adapter.setProjects([
        { id: 'p1', name: 'Project 1' },
        { id: 'p2', name: 'Project 2' },
      ]);

      const projects = await adapter.listProjects();
      expect(projects).toHaveLength(2);
    });
  });

  describe('getProject', () => {
    it('retrieves a project', async () => {
      adapter.setProjects([{ id: 'p1', name: 'Project 1' }]);

      const project = await adapter.getProject('p1');
      expect(project.name).toBe('Project 1');
    });

    it('throws ProjectNotFoundError for non-existent project', async () => {
      await expect(adapter.getProject('nonexistent')).rejects.toThrow(ProjectNotFoundError);
    });
  });

  describe('listLabels', () => {
    it('returns all labels', async () => {
      adapter.setLabels([
        { id: 'l1', name: 'bug' },
        { id: 'l2', name: 'feature' },
      ]);

      const labels = await adapter.listLabels();
      expect(labels).toHaveLength(2);
    });
  });

  describe('addLabel', () => {
    beforeEach(async () => {
      adapter.setLabels([{ id: 'l1', name: 'bug' }]);
      await adapter.createIssue({ title: 'Test' });
    });

    it('adds a label to an issue', async () => {
      await adapter.addLabel('issue-1', 'l1');
      const issue = await adapter.getIssue('issue-1');

      expect(issue.labels).toHaveLength(1);
      expect(issue.labels[0].name).toBe('bug');
    });

    it('does not duplicate labels', async () => {
      await adapter.addLabel('issue-1', 'l1');
      await adapter.addLabel('issue-1', 'l1');
      const issue = await adapter.getIssue('issue-1');

      expect(issue.labels).toHaveLength(1);
    });

    it('throws IssueNotFoundError for non-existent issue', async () => {
      await expect(adapter.addLabel('nonexistent', 'l1')).rejects.toThrow(IssueNotFoundError);
    });

    it('throws LabelNotFoundError for non-existent label', async () => {
      await expect(adapter.addLabel('issue-1', 'nonexistent')).rejects.toThrow(LabelNotFoundError);
    });
  });

  describe('removeLabel', () => {
    beforeEach(async () => {
      adapter.setLabels([{ id: 'l1', name: 'bug' }]);
      await adapter.createIssue({ title: 'Test' });
      await adapter.addLabel('issue-1', 'l1');
    });

    it('removes a label from an issue', async () => {
      await adapter.removeLabel('issue-1', 'l1');
      const issue = await adapter.getIssue('issue-1');

      expect(issue.labels).toHaveLength(0);
    });

    it('throws IssueNotFoundError for non-existent issue', async () => {
      await expect(adapter.removeLabel('nonexistent', 'l1')).rejects.toThrow(IssueNotFoundError);
    });
  });

  describe('healthCheck', () => {
    it('returns healthy status', async () => {
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Mock issues adapter is healthy');
      expect(health.details?.issueCount).toBe(0);
    });
  });

  describe('simulated latency', () => {
    it('adds delay when latencyMs is set', async () => {
      adapter = new MockIssuesAdapter({ latencyMs: 50 });

      const start = Date.now();
      await adapter.healthCheck();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('simulated failures', () => {
    it('throws error based on failure rate', async () => {
      adapter = new MockIssuesAdapter({ failureRate: 1.0, failureError: 'NETWORK_ERROR' });

      await expect(adapter.createIssue({ title: 'Test' })).rejects.toThrow(ProviderError);
    });

    it('does not fail health check even with high failure rate', async () => {
      adapter = new MockIssuesAdapter({ failureRate: 1.0 });

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
    });
  });

  describe('test helpers', () => {
    it('setIssues replaces all issues', () => {
      adapter.addIssue({
        id: 'old',
        title: 'Old',
        status: 'open',
        type: 'task',
        labels: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      adapter.setIssues([
        {
          id: 'new',
          title: 'New',
          status: 'open',
          type: 'task',
          labels: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      expect(adapter.issueCount).toBe(1);
    });

    it('clearIssues removes all issues', () => {
      adapter.addIssue({
        id: 'test',
        title: 'Test',
        status: 'open',
        type: 'task',
        labels: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      adapter.clearIssues();
      expect(adapter.issueCount).toBe(0);
    });

    it('getCallLog returns method calls', async () => {
      await adapter.createIssue({ title: 'Test' });
      await adapter.listIssues();

      const log = adapter.getCallLog();
      expect(log).toHaveLength(2);
      expect(log[0].method).toBe('createIssue');
      expect(log[1].method).toBe('listIssues');
    });

    it('clearCallLog resets the log', async () => {
      await adapter.createIssue({ title: 'Test' });
      adapter.clearCallLog();

      expect(adapter.getCallLog()).toHaveLength(0);
    });

    it('setFailureRate updates failure rate', async () => {
      adapter.setFailureRate(1.0);
      await expect(adapter.createIssue({ title: 'Test' })).rejects.toThrow();
    });

    it('setLatency updates latency', async () => {
      adapter.setLatency(50);

      const start = Date.now();
      await adapter.listIssues();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });
});
