/**
 * JoplinIssuesAdapter - Implements IssuesProvider using Joplin todo notes
 */

import type {
  IssuesProvider,
  Issue,
  Project,
  Label,
  CreateIssueInput,
  UpdateIssueInput,
  IssueQuery,
  SearchOptions,
  HealthStatus,
  IssueStatus,
  IssueType,
  IssuePriority,
} from 'kai-issues-core';
import {
  IssueNotFoundError,
  ProjectNotFoundError,
  LabelNotFoundError,
  AuthenticationError,
  withRetry,
} from 'kai-issues-core';
import { JoplinClient, JoplinError, type JoplinNote, type JoplinNotebook, type JoplinTag } from './JoplinClient.ts';

/**
 * Configuration for JoplinIssuesAdapter
 */
export interface JoplinIssuesConfig {
  /** Joplin Web Clipper port (default: 41184) */
  port?: number;
  /** Default notebook for new issues */
  defaultNotebook?: string;
}

// Priority tag mappings
const PRIORITY_TAGS: Record<string, IssuePriority> = {
  'p0': 'urgent',
  'p1': 'high',
  'p2': 'medium',
  'p3': 'low',
  'urgent': 'urgent',
  'high': 'high',
  'medium': 'medium',
  'low': 'low',
};

// Type tag mappings
const TYPE_TAGS: Record<string, IssueType> = {
  'bug': 'bug',
  'feature': 'feature',
  'task': 'task',
  'story': 'story',
  'epic': 'epic',
};

/**
 * JoplinIssuesAdapter - Use Joplin todo notes as an issue tracker
 */
export default class JoplinIssuesAdapter implements IssuesProvider {
  readonly name = 'joplin';
  readonly version = '1.0.0';

  private client: JoplinClient;
  private defaultNotebookId: string | null = null;
  private config: JoplinIssuesConfig;

  constructor(config: JoplinIssuesConfig = {}) {
    this.config = config;
    this.client = new JoplinClient(config.port);
  }

  /**
   * Get or resolve default notebook ID
   */
  private async getDefaultNotebookId(): Promise<string | null> {
    if (this.defaultNotebookId) {
      return this.defaultNotebookId;
    }

    if (this.config.defaultNotebook) {
      const notebook = await this.client.findNotebookByName(this.config.defaultNotebook);
      if (notebook) {
        this.defaultNotebookId = notebook.id;
      }
    }

    return this.defaultNotebookId;
  }

  /**
   * Map Joplin note to Issue
   */
  private async noteToIssue(note: JoplinNote): Promise<Issue> {
    // Get tags for this note
    const tags = await this.client.getTagsByNote(note.id);

    // Determine type and priority from tags
    let type: IssueType = 'task';
    let priority: IssuePriority | undefined;
    const labels: Label[] = [];

    for (const tag of tags) {
      const lowerTitle = tag.title.toLowerCase();

      if (TYPE_TAGS[lowerTitle]) {
        type = TYPE_TAGS[lowerTitle];
      } else if (PRIORITY_TAGS[lowerTitle]) {
        priority = PRIORITY_TAGS[lowerTitle];
      } else {
        labels.push({
          id: tag.id,
          name: tag.title,
        });
      }
    }

    // Determine status
    let status: IssueStatus = 'open';
    if (note.todo_completed) {
      status = 'done';
    }

    // Get project (notebook)
    let project: Project | undefined;
    if (note.parent_id) {
      try {
        const notebook = await this.client.getNotebook(note.parent_id);
        project = {
          id: notebook.id,
          name: notebook.title,
        };
      } catch {
        // Notebook not found, ignore
      }
    }

    return {
      id: note.id,
      title: note.title,
      description: note.body,
      status,
      type,
      priority,
      labels,
      project,
      createdAt: new Date(note.created_time),
      updatedAt: new Date(note.updated_time),
      completedAt: note.todo_completed ? new Date(note.updated_time) : undefined,
      dueDate: note.todo_due ? new Date(note.todo_due) : undefined,
      metadata: {
        joplin_is_todo: note.is_todo,
        joplin_parent_id: note.parent_id,
      },
    };
  }

  /**
   * Map notebook to Project
   */
  private notebookToProject(notebook: JoplinNotebook): Project {
    return {
      id: notebook.id,
      name: notebook.title,
      metadata: {
        joplin_parent_id: notebook.parent_id,
      },
    };
  }

  /**
   * Map tag to Label
   */
  private tagToLabel(tag: JoplinTag): Label {
    return {
      id: tag.id,
      name: tag.title,
    };
  }

  // ============ IssuesProvider Implementation ============

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    return withRetry(async () => {
      // Resolve notebook
      let parentId = input.projectId;
      if (!parentId && this.config.defaultNotebook) {
        parentId = await this.getDefaultNotebookId() || undefined;
      }

      if (!parentId) {
        // Get first notebook as fallback
        const notebooks = await this.client.listNotebooks();
        if (notebooks.length === 0) {
          throw new ProjectNotFoundError('No notebooks found', this.name);
        }
        parentId = notebooks[0].id;
      }

      // Create the note as a todo
      const note = await this.client.createNote({
        title: input.title,
        body: input.description,
        parent_id: parentId,
        is_todo: 1,
        todo_due: input.dueDate ? input.dueDate.getTime() : undefined,
      });

      // Add type tag
      if (input.type) {
        const tag = await this.client.findOrCreateTag(input.type);
        await this.client.addTagToNote(note.id, tag.id);
      }

      // Add priority tag
      if (input.priority && input.priority !== 'none') {
        const priorityTag = input.priority === 'urgent' ? 'p0' :
                           input.priority === 'high' ? 'p1' :
                           input.priority === 'medium' ? 'p2' : 'p3';
        const tag = await this.client.findOrCreateTag(priorityTag);
        await this.client.addTagToNote(note.id, tag.id);
      }

      // Add additional labels
      if (input.labels) {
        for (const labelName of input.labels) {
          const tag = await this.client.findOrCreateTag(labelName);
          await this.client.addTagToNote(note.id, tag.id);
        }
      }

      // Fetch and return the full issue
      const fullNote = await this.client.getNote(note.id);
      return this.noteToIssue(fullNote);
    });
  }

  async getIssue(id: string): Promise<Issue> {
    return withRetry(async () => {
      try {
        const note = await this.client.getNote(id);
        return this.noteToIssue(note);
      } catch (error) {
        if (error instanceof JoplinError && error.statusCode === 404) {
          throw new IssueNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async updateIssue(id: string, updates: UpdateIssueInput): Promise<Issue> {
    return withRetry(async () => {
      try {
        const updateData: Record<string, unknown> = {};

        if (updates.title !== undefined) {
          updateData.title = updates.title;
        }
        if (updates.description !== undefined) {
          updateData.body = updates.description;
        }
        if (updates.status !== undefined) {
          updateData.todo_completed = updates.status === 'done' ? Date.now() : 0;
        }
        if (updates.dueDate !== undefined) {
          updateData.todo_due = updates.dueDate.getTime();
        }

        await this.client.updateNote(id, updateData);

        // Update priority tag if changed
        if (updates.priority !== undefined) {
          const tags = await this.client.getTagsByNote(id);

          // Remove existing priority tags
          for (const tag of tags) {
            if (PRIORITY_TAGS[tag.title.toLowerCase()]) {
              await this.client.removeTagFromNote(id, tag.id);
            }
          }

          // Add new priority tag
          if (updates.priority !== 'none') {
            const priorityTag = updates.priority === 'urgent' ? 'p0' :
                               updates.priority === 'high' ? 'p1' :
                               updates.priority === 'medium' ? 'p2' : 'p3';
            const tag = await this.client.findOrCreateTag(priorityTag);
            await this.client.addTagToNote(id, tag.id);
          }
        }

        const note = await this.client.getNote(id);
        return this.noteToIssue(note);
      } catch (error) {
        if (error instanceof JoplinError && error.statusCode === 404) {
          throw new IssueNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async deleteIssue(id: string): Promise<void> {
    return withRetry(async () => {
      try {
        await this.client.deleteNote(id);
      } catch (error) {
        if (error instanceof JoplinError && error.statusCode === 404) {
          throw new IssueNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async listIssues(query?: IssueQuery): Promise<Issue[]> {
    return withRetry(async () => {
      // Get all todo notes
      let notes = await this.client.listNotes();

      // Filter to only todos
      notes = notes.filter(n => n.is_todo === 1);

      // Apply filters
      if (query) {
        // Filter by status
        if (query.status) {
          const statuses = Array.isArray(query.status) ? query.status : [query.status];
          notes = notes.filter(n => {
            const status = n.todo_completed ? 'done' : 'open';
            return statuses.includes(status);
          });
        }

        // Filter by project (notebook)
        if (query.projectId) {
          notes = notes.filter(n => n.parent_id === query.projectId);
        }

        // Filter by date ranges
        if (query.createdAfter) {
          const after = query.createdAfter.getTime();
          notes = notes.filter(n => n.created_time >= after);
        }
        if (query.createdBefore) {
          const before = query.createdBefore.getTime();
          notes = notes.filter(n => n.created_time <= before);
        }
        if (query.updatedAfter) {
          const after = query.updatedAfter.getTime();
          notes = notes.filter(n => n.updated_time >= after);
        }
      }

      // Convert to issues
      const issues = await Promise.all(notes.map(n => this.noteToIssue(n)));

      // Apply type, priority, and label filters (need tags to be loaded)
      let filteredIssues = issues;

      if (query) {
        if (query.type) {
          const types = Array.isArray(query.type) ? query.type : [query.type];
          filteredIssues = filteredIssues.filter(i => types.includes(i.type));
        }

        if (query.priority) {
          const priorities = Array.isArray(query.priority) ? query.priority : [query.priority];
          filteredIssues = filteredIssues.filter(i => i.priority && priorities.includes(i.priority));
        }

        if (query.labels && query.labels.length > 0) {
          filteredIssues = filteredIssues.filter(i =>
            query.labels!.every(labelId =>
              i.labels.some(l => l.id === labelId || l.name === labelId)
            )
          );
        }

        // Apply pagination
        const offset = query.offset || 0;
        const limit = query.limit || filteredIssues.length;
        filteredIssues = filteredIssues.slice(offset, offset + limit);
      }

      return filteredIssues;
    });
  }

  async searchIssues(text: string, options?: SearchOptions): Promise<Issue[]> {
    return withRetry(async () => {
      // Joplin search with is_todo filter
      const results = await this.client.searchNotes(`${text} type:todo`);

      // Convert to issues
      const issues = await Promise.all(results.map(n => this.noteToIssue(n as JoplinNote)));

      // Apply options
      let filteredIssues = issues;

      if (options) {
        if (options.projectId) {
          filteredIssues = filteredIssues.filter(i => i.project?.id === options.projectId);
        }
        if (options.status && options.status.length > 0) {
          filteredIssues = filteredIssues.filter(i => options.status!.includes(i.status));
        }
        if (options.limit) {
          filteredIssues = filteredIssues.slice(0, options.limit);
        }
      }

      return filteredIssues;
    });
  }

  async listProjects(): Promise<Project[]> {
    return withRetry(async () => {
      const notebooks = await this.client.listNotebooks();
      return notebooks.map(nb => this.notebookToProject(nb));
    });
  }

  async getProject(id: string): Promise<Project> {
    return withRetry(async () => {
      try {
        const notebook = await this.client.getNotebook(id);
        return this.notebookToProject(notebook);
      } catch (error) {
        if (error instanceof JoplinError && error.statusCode === 404) {
          throw new ProjectNotFoundError(id, this.name);
        }
        throw error;
      }
    });
  }

  async listLabels(): Promise<Label[]> {
    return withRetry(async () => {
      const tags = await this.client.listTags();

      // Exclude system tags (type and priority)
      return tags
        .filter(t => !TYPE_TAGS[t.title.toLowerCase()] && !PRIORITY_TAGS[t.title.toLowerCase()])
        .map(t => this.tagToLabel(t));
    });
  }

  async addLabel(issueId: string, labelId: string): Promise<void> {
    return withRetry(async () => {
      try {
        // Check if issue exists
        await this.client.getNote(issueId);
      } catch (error) {
        if (error instanceof JoplinError && error.statusCode === 404) {
          throw new IssueNotFoundError(issueId, this.name);
        }
        throw error;
      }

      // Find or create the tag
      const tags = await this.client.listTags();
      let tag = tags.find(t => t.id === labelId || t.title === labelId);

      if (!tag) {
        // If labelId looks like a name, create it
        if (!/^[a-f0-9]{32}$/i.test(labelId)) {
          tag = await this.client.createTag(labelId);
        } else {
          throw new LabelNotFoundError(labelId, this.name);
        }
      }

      await this.client.addTagToNote(issueId, tag.id);
    });
  }

  async removeLabel(issueId: string, labelId: string): Promise<void> {
    return withRetry(async () => {
      try {
        // Check if issue exists
        await this.client.getNote(issueId);
      } catch (error) {
        if (error instanceof JoplinError && error.statusCode === 404) {
          throw new IssueNotFoundError(issueId, this.name);
        }
        throw error;
      }

      // Find the tag
      const tags = await this.client.listTags();
      const tag = tags.find(t => t.id === labelId || t.title === labelId);

      if (tag) {
        await this.client.removeTagFromNote(issueId, tag.id);
      }
    });
  }

  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const isHealthy = await this.client.ping();
      const latencyMs = Date.now() - startTime;

      if (!isHealthy) {
        return {
          healthy: false,
          message: 'Joplin is not responding at localhost:' + (this.config.port || 41184),
          latencyMs,
        };
      }

      // Get notebook count for details
      const notebooks = await this.client.listNotebooks();

      return {
        healthy: true,
        message: 'Joplin is healthy',
        latencyMs,
        details: {
          port: this.config.port || 41184,
          notebookCount: notebooks.length,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof Error) {
        if (error.message.includes('keychain')) {
          return {
            healthy: false,
            message: 'Joplin API token not found in keychain',
            latencyMs,
          };
        }
      }

      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      };
    }
  }
}
