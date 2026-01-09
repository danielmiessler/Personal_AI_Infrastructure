import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import JoplinIssuesAdapter from '../src/JoplinIssuesAdapter.ts';
import { JoplinClient } from '../src/JoplinClient.ts';
import { IssueNotFoundError, ProjectNotFoundError } from 'mai-issues-core';

// Mock the JoplinClient
const mockClient = {
  ping: mock(() => Promise.resolve(true)),
  getNote: mock(() => Promise.resolve({
    id: 'note-1',
    title: 'Test Issue',
    body: 'Description',
    parent_id: 'notebook-1',
    created_time: Date.now(),
    updated_time: Date.now(),
    is_todo: 1,
    todo_completed: 0,
  })),
  createNote: mock(() => Promise.resolve({
    id: 'note-new',
    title: 'New Issue',
    body: '',
    parent_id: 'notebook-1',
    created_time: Date.now(),
    updated_time: Date.now(),
    is_todo: 1,
    todo_completed: 0,
  })),
  updateNote: mock(() => Promise.resolve({
    id: 'note-1',
    title: 'Updated Issue',
    body: 'Updated description',
    parent_id: 'notebook-1',
    created_time: Date.now(),
    updated_time: Date.now(),
    is_todo: 1,
    todo_completed: 0,
  })),
  deleteNote: mock(() => Promise.resolve()),
  listNotes: mock(() => Promise.resolve([
    {
      id: 'note-1',
      title: 'Issue 1',
      body: 'Body 1',
      parent_id: 'notebook-1',
      created_time: Date.now(),
      updated_time: Date.now(),
      is_todo: 1,
      todo_completed: 0,
    },
    {
      id: 'note-2',
      title: 'Issue 2',
      body: 'Body 2',
      parent_id: 'notebook-1',
      created_time: Date.now(),
      updated_time: Date.now(),
      is_todo: 1,
      todo_completed: Date.now(),
    },
    {
      id: 'note-3',
      title: 'Regular note',
      body: 'Not a todo',
      parent_id: 'notebook-1',
      created_time: Date.now(),
      updated_time: Date.now(),
      is_todo: 0,
      todo_completed: 0,
    },
  ])),
  searchNotes: mock(() => Promise.resolve([
    {
      id: 'note-1',
      title: 'Issue 1',
      body: 'Body 1',
      parent_id: 'notebook-1',
      created_time: Date.now(),
      updated_time: Date.now(),
      is_todo: 1,
      todo_completed: 0,
    },
  ])),
  getNotebook: mock(() => Promise.resolve({
    id: 'notebook-1',
    title: 'Test Notebook',
    parent_id: '',
    created_time: Date.now(),
    updated_time: Date.now(),
  })),
  listNotebooks: mock(() => Promise.resolve([
    {
      id: 'notebook-1',
      title: 'Test Notebook',
      parent_id: '',
      created_time: Date.now(),
      updated_time: Date.now(),
    },
    {
      id: 'notebook-2',
      title: 'Another Notebook',
      parent_id: '',
      created_time: Date.now(),
      updated_time: Date.now(),
    },
  ])),
  findNotebookByName: mock(() => Promise.resolve({
    id: 'notebook-1',
    title: 'Test Notebook',
    parent_id: '',
    created_time: Date.now(),
    updated_time: Date.now(),
  })),
  listTags: mock(() => Promise.resolve([
    { id: 'tag-1', title: 'bug', created_time: Date.now(), updated_time: Date.now() },
    { id: 'tag-2', title: 'p1', created_time: Date.now(), updated_time: Date.now() },
    { id: 'tag-3', title: 'feature-request', created_time: Date.now(), updated_time: Date.now() },
  ])),
  getTagsByNote: mock(() => Promise.resolve([
    { id: 'tag-1', title: 'bug', created_time: Date.now(), updated_time: Date.now() },
    { id: 'tag-2', title: 'p1', created_time: Date.now(), updated_time: Date.now() },
  ])),
  addTagToNote: mock(() => Promise.resolve()),
  removeTagFromNote: mock(() => Promise.resolve()),
  createTag: mock(() => Promise.resolve({
    id: 'tag-new',
    title: 'new-tag',
    created_time: Date.now(),
    updated_time: Date.now(),
  })),
  findOrCreateTag: mock(() => Promise.resolve({
    id: 'tag-1',
    title: 'bug',
    created_time: Date.now(),
    updated_time: Date.now(),
  })),
};

describe('JoplinIssuesAdapter', () => {
  let adapter: JoplinIssuesAdapter;

  beforeEach(() => {
    adapter = new JoplinIssuesAdapter();
    // Replace the client with our mock
    (adapter as unknown as { client: typeof mockClient }).client = mockClient;

    // Reset all mocks
    Object.values(mockClient).forEach(fn => {
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as ReturnType<typeof mock>).mockReset();
      }
    });
  });

  describe('constructor', () => {
    it('creates adapter with default config', () => {
      expect(adapter.name).toBe('joplin');
      expect(adapter.version).toBe('1.0.0');
    });
  });

  describe('healthCheck', () => {
    it('returns healthy when Joplin is running', async () => {
      mockClient.ping.mockResolvedValue(true);
      mockClient.listNotebooks.mockResolvedValue([]);

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.message).toBe('Joplin is healthy');
    });

    it('returns unhealthy when Joplin is not running', async () => {
      mockClient.ping.mockResolvedValue(false);

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
    });
  });

  describe('listProjects', () => {
    it('returns notebooks as projects', async () => {
      mockClient.listNotebooks.mockResolvedValue([
        { id: 'nb-1', title: 'Notebook 1', parent_id: '', created_time: Date.now(), updated_time: Date.now() },
        { id: 'nb-2', title: 'Notebook 2', parent_id: '', created_time: Date.now(), updated_time: Date.now() },
      ]);

      const projects = await adapter.listProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0].id).toBe('nb-1');
      expect(projects[0].name).toBe('Notebook 1');
    });
  });

  describe('getProject', () => {
    it('returns notebook as project', async () => {
      mockClient.getNotebook.mockResolvedValue({
        id: 'nb-1',
        title: 'Test Notebook',
        parent_id: '',
        created_time: Date.now(),
        updated_time: Date.now(),
      });

      const project = await adapter.getProject('nb-1');

      expect(project.id).toBe('nb-1');
      expect(project.name).toBe('Test Notebook');
    });
  });

  describe('listLabels', () => {
    it('returns tags as labels, excluding type and priority tags', async () => {
      mockClient.listTags.mockResolvedValue([
        { id: 'tag-1', title: 'bug', created_time: Date.now(), updated_time: Date.now() },
        { id: 'tag-2', title: 'p1', created_time: Date.now(), updated_time: Date.now() },
        { id: 'tag-3', title: 'feature-request', created_time: Date.now(), updated_time: Date.now() },
        { id: 'tag-4', title: 'task', created_time: Date.now(), updated_time: Date.now() },
      ]);

      const labels = await adapter.listLabels();

      // Should exclude bug (type), p1 (priority), and task (type)
      expect(labels).toHaveLength(1);
      expect(labels[0].name).toBe('feature-request');
    });
  });

  describe('listIssues', () => {
    it('returns only todo notes as issues', async () => {
      mockClient.listNotes.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Todo 1',
          body: '',
          parent_id: 'nb-1',
          created_time: Date.now(),
          updated_time: Date.now(),
          is_todo: 1,
          todo_completed: 0,
        },
        {
          id: 'note-2',
          title: 'Regular note',
          body: '',
          parent_id: 'nb-1',
          created_time: Date.now(),
          updated_time: Date.now(),
          is_todo: 0,
          todo_completed: 0,
        },
      ]);
      mockClient.getTagsByNote.mockResolvedValue([]);
      mockClient.getNotebook.mockResolvedValue({
        id: 'nb-1',
        title: 'Notebook',
        parent_id: '',
        created_time: Date.now(),
        updated_time: Date.now(),
      });

      const issues = await adapter.listIssues();

      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Todo 1');
    });

    it('filters by status', async () => {
      mockClient.listNotes.mockResolvedValue([
        {
          id: 'note-1',
          title: 'Open',
          body: '',
          parent_id: 'nb-1',
          created_time: Date.now(),
          updated_time: Date.now(),
          is_todo: 1,
          todo_completed: 0,
        },
        {
          id: 'note-2',
          title: 'Done',
          body: '',
          parent_id: 'nb-1',
          created_time: Date.now(),
          updated_time: Date.now(),
          is_todo: 1,
          todo_completed: Date.now(),
        },
      ]);
      mockClient.getTagsByNote.mockResolvedValue([]);
      mockClient.getNotebook.mockResolvedValue({
        id: 'nb-1',
        title: 'Notebook',
        parent_id: '',
        created_time: Date.now(),
        updated_time: Date.now(),
      });

      const openIssues = await adapter.listIssues({ status: 'open' });
      expect(openIssues).toHaveLength(1);
      expect(openIssues[0].title).toBe('Open');

      const doneIssues = await adapter.listIssues({ status: 'done' });
      expect(doneIssues).toHaveLength(1);
      expect(doneIssues[0].title).toBe('Done');
    });
  });

  describe('note to issue mapping', () => {
    it('maps todo_completed to done status', async () => {
      mockClient.getNote.mockResolvedValue({
        id: 'note-1',
        title: 'Completed task',
        body: '',
        parent_id: 'nb-1',
        created_time: Date.now(),
        updated_time: Date.now(),
        is_todo: 1,
        todo_completed: Date.now(),
      });
      mockClient.getTagsByNote.mockResolvedValue([]);
      mockClient.getNotebook.mockResolvedValue({
        id: 'nb-1',
        title: 'Notebook',
        parent_id: '',
        created_time: Date.now(),
        updated_time: Date.now(),
      });

      const issue = await adapter.getIssue('note-1');

      expect(issue.status).toBe('done');
      expect(issue.completedAt).toBeDefined();
    });

    it('maps type tags correctly', async () => {
      mockClient.getNote.mockResolvedValue({
        id: 'note-1',
        title: 'Bug',
        body: '',
        parent_id: 'nb-1',
        created_time: Date.now(),
        updated_time: Date.now(),
        is_todo: 1,
        todo_completed: 0,
      });
      mockClient.getTagsByNote.mockResolvedValue([
        { id: 'tag-1', title: 'bug', created_time: Date.now(), updated_time: Date.now() },
      ]);
      mockClient.getNotebook.mockResolvedValue({
        id: 'nb-1',
        title: 'Notebook',
        parent_id: '',
        created_time: Date.now(),
        updated_time: Date.now(),
      });

      const issue = await adapter.getIssue('note-1');

      expect(issue.type).toBe('bug');
    });

    it('maps priority tags correctly', async () => {
      mockClient.getNote.mockResolvedValue({
        id: 'note-1',
        title: 'High priority',
        body: '',
        parent_id: 'nb-1',
        created_time: Date.now(),
        updated_time: Date.now(),
        is_todo: 1,
        todo_completed: 0,
      });
      mockClient.getTagsByNote.mockResolvedValue([
        { id: 'tag-1', title: 'p1', created_time: Date.now(), updated_time: Date.now() },
      ]);
      mockClient.getNotebook.mockResolvedValue({
        id: 'nb-1',
        title: 'Notebook',
        parent_id: '',
        created_time: Date.now(),
        updated_time: Date.now(),
      });

      const issue = await adapter.getIssue('note-1');

      expect(issue.priority).toBe('high');
    });

    it('maps remaining tags to labels', async () => {
      mockClient.getNote.mockResolvedValue({
        id: 'note-1',
        title: 'With labels',
        body: '',
        parent_id: 'nb-1',
        created_time: Date.now(),
        updated_time: Date.now(),
        is_todo: 1,
        todo_completed: 0,
      });
      mockClient.getTagsByNote.mockResolvedValue([
        { id: 'tag-1', title: 'bug', created_time: Date.now(), updated_time: Date.now() },
        { id: 'tag-2', title: 'frontend', created_time: Date.now(), updated_time: Date.now() },
        { id: 'tag-3', title: 'urgent-fix', created_time: Date.now(), updated_time: Date.now() },
      ]);
      mockClient.getNotebook.mockResolvedValue({
        id: 'nb-1',
        title: 'Notebook',
        parent_id: '',
        created_time: Date.now(),
        updated_time: Date.now(),
      });

      const issue = await adapter.getIssue('note-1');

      // 'bug' is a type, so labels should have 'frontend' and 'urgent-fix'
      expect(issue.labels).toHaveLength(2);
      expect(issue.labels.map(l => l.name)).toContain('frontend');
      expect(issue.labels.map(l => l.name)).toContain('urgent-fix');
    });
  });
});
