import { describe, it, expect } from 'bun:test';
import type {
  Issue,
  IssueStatus,
  IssueType,
  IssuePriority,
  CreateIssueInput,
  UpdateIssueInput,
  IssueQuery,
  Label,
  Project,
  HealthStatus
} from '../src/types/index.ts';

describe('Issue types', () => {
  describe('IssueStatus', () => {
    it('accepts valid status values', () => {
      const statuses: IssueStatus[] = ['open', 'in_progress', 'done', 'cancelled'];
      expect(statuses).toHaveLength(4);
    });
  });

  describe('IssueType', () => {
    it('accepts valid type values', () => {
      const types: IssueType[] = ['task', 'bug', 'feature', 'story', 'epic'];
      expect(types).toHaveLength(5);
    });
  });

  describe('IssuePriority', () => {
    it('accepts valid priority values', () => {
      const priorities: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
      expect(priorities).toHaveLength(5);
    });
  });

  describe('Issue', () => {
    it('can create a minimal issue', () => {
      const issue: Issue = {
        id: 'issue-1',
        title: 'Test issue',
        status: 'open',
        type: 'task',
        labels: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(issue.id).toBe('issue-1');
      expect(issue.title).toBe('Test issue');
      expect(issue.status).toBe('open');
      expect(issue.type).toBe('task');
    });

    it('can create a full issue with all fields', () => {
      const now = new Date();
      const issue: Issue = {
        id: 'issue-2',
        title: 'Full issue',
        description: 'This is a description',
        status: 'in_progress',
        type: 'bug',
        priority: 'high',
        labels: [{ id: 'label-1', name: 'urgent', color: '#ff0000' }],
        assignee: 'user-123',
        project: { id: 'project-1', name: 'Main Project' },
        createdAt: now,
        updatedAt: now,
        completedAt: undefined,
        dueDate: new Date(now.getTime() + 86400000),
        metadata: { externalId: 'ext-123' }
      };

      expect(issue.description).toBe('This is a description');
      expect(issue.priority).toBe('high');
      expect(issue.assignee).toBe('user-123');
      expect(issue.project?.name).toBe('Main Project');
      expect(issue.labels[0].name).toBe('urgent');
    });
  });

  describe('CreateIssueInput', () => {
    it('requires only title', () => {
      const input: CreateIssueInput = {
        title: 'New issue'
      };

      expect(input.title).toBe('New issue');
    });

    it('accepts all optional fields', () => {
      const input: CreateIssueInput = {
        title: 'New issue',
        description: 'Description',
        type: 'feature',
        priority: 'medium',
        labels: ['label-1', 'label-2'],
        assignee: 'user-1',
        projectId: 'project-1',
        dueDate: new Date(),
        metadata: { source: 'api' }
      };

      expect(input.type).toBe('feature');
      expect(input.labels).toHaveLength(2);
    });
  });

  describe('UpdateIssueInput', () => {
    it('all fields are optional', () => {
      const input: UpdateIssueInput = {};
      expect(input).toEqual({});
    });

    it('accepts partial updates', () => {
      const input: UpdateIssueInput = {
        status: 'done',
        priority: 'low'
      };

      expect(input.status).toBe('done');
      expect(input.priority).toBe('low');
    });
  });

  describe('IssueQuery', () => {
    it('all fields are optional', () => {
      const query: IssueQuery = {};
      expect(query).toEqual({});
    });

    it('accepts single status', () => {
      const query: IssueQuery = {
        status: 'open'
      };
      expect(query.status).toBe('open');
    });

    it('accepts multiple statuses', () => {
      const query: IssueQuery = {
        status: ['open', 'in_progress']
      };
      expect(query.status).toHaveLength(2);
    });

    it('accepts all filter options', () => {
      const query: IssueQuery = {
        status: ['open'],
        type: 'bug',
        priority: ['high', 'urgent'],
        assignee: 'user-1',
        projectId: 'project-1',
        labels: ['label-1'],
        createdAfter: new Date('2026-01-01'),
        createdBefore: new Date('2026-12-31'),
        updatedAfter: new Date('2026-06-01'),
        limit: 50,
        offset: 10
      };

      expect(query.limit).toBe(50);
      expect(query.offset).toBe(10);
    });
  });

  describe('Label', () => {
    it('creates a minimal label', () => {
      const label: Label = {
        id: 'label-1',
        name: 'bug'
      };
      expect(label.id).toBe('label-1');
      expect(label.name).toBe('bug');
    });

    it('creates a label with color', () => {
      const label: Label = {
        id: 'label-2',
        name: 'feature',
        color: '#00ff00'
      };
      expect(label.color).toBe('#00ff00');
    });
  });

  describe('Project', () => {
    it('creates a minimal project', () => {
      const project: Project = {
        id: 'project-1',
        name: 'Main Project'
      };
      expect(project.id).toBe('project-1');
      expect(project.name).toBe('Main Project');
    });

    it('creates a project with all fields', () => {
      const project: Project = {
        id: 'project-2',
        name: 'Side Project',
        description: 'A side project',
        metadata: { archived: false }
      };
      expect(project.description).toBe('A side project');
      expect(project.metadata?.archived).toBe(false);
    });
  });

  describe('HealthStatus', () => {
    it('creates a healthy status', () => {
      const status: HealthStatus = {
        healthy: true
      };
      expect(status.healthy).toBe(true);
    });

    it('creates an unhealthy status with details', () => {
      const status: HealthStatus = {
        healthy: false,
        message: 'Connection refused',
        latencyMs: 5000,
        details: { lastError: 'ECONNREFUSED' }
      };
      expect(status.healthy).toBe(false);
      expect(status.message).toBe('Connection refused');
    });
  });
});
