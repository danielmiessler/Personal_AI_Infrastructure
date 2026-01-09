/**
 * Joplin REST API Client for Issues Adapter
 */

import { $ } from 'bun';

const DEFAULT_PORT = 41184;
const KEYCHAIN_SERVICE = 'joplin-token';
const KEYCHAIN_ACCOUNT = 'claude-code';

/**
 * Joplin API types
 */
export interface JoplinNote {
  id: string;
  parent_id: string;
  title: string;
  body?: string;
  created_time: number;
  updated_time: number;
  is_todo: number;
  todo_completed: number;
  todo_due?: number;
  source_url?: string;
}

export interface JoplinNotebook {
  id: string;
  title: string;
  parent_id: string;
  created_time: number;
  updated_time: number;
}

export interface JoplinTag {
  id: string;
  title: string;
  created_time: number;
  updated_time: number;
}

export interface JoplinSearchResult {
  id: string;
  parent_id: string;
  title: string;
  body?: string;
  created_time: number;
  updated_time: number;
  is_todo: number;
  todo_completed: number;
}

/**
 * Custom error class for Joplin API errors
 */
export class JoplinError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public responseBody?: string
  ) {
    super(`Joplin API Error (${statusCode}): ${statusText}${responseBody ? ` - ${responseBody}` : ''}`);
    this.name = 'JoplinError';
  }
}

/**
 * Joplin REST API Client
 */
export class JoplinClient {
  private readonly baseUrl: string;
  private token: string | null = null;

  constructor(port: number = DEFAULT_PORT) {
    this.baseUrl = `http://localhost:${port}`;
  }

  /**
   * Get API token from keychain
   */
  private async getToken(): Promise<string> {
    if (this.token) {
      return this.token;
    }

    try {
      const result = await $`security find-generic-password -s ${KEYCHAIN_SERVICE} -a ${KEYCHAIN_ACCOUNT} -w`.text();
      this.token = result.trim();
      if (!this.token) {
        throw new Error('Empty token retrieved from keychain');
      }
      return this.token;
    } catch {
      throw new Error(
        `Failed to retrieve Joplin API token from keychain. ` +
        `Ensure token is stored with: security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w "<token>"`
      );
    }
  }

  /**
   * Build URL with token and params
   */
  private buildUrl(endpoint: string, token: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('token', token);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /**
   * Make API request
   */
  async request<T = unknown>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: Record<string, unknown>;
      params?: Record<string, string | number | boolean>;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, params } = options;
    const token = await this.getToken();
    const url = this.buildUrl(endpoint, token, params);

    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const responseBody = await response.text();
        throw new JoplinError(response.status, response.statusText, responseBody);
      }

      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      if (error instanceof JoplinError) {
        throw error;
      }
      if (error instanceof Error) {
        if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
          throw new Error(
            `Joplin not running at ${this.baseUrl}. ` +
            `Please start Joplin Desktop and enable the Web Clipper service.`
          );
        }
      }
      throw error;
    }
  }

  /**
   * Paginated request - fetches all pages
   */
  async requestPaginated<T = unknown>(
    endpoint: string,
    options: {
      params?: Record<string, string | number | boolean>;
    } = {}
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const params = { ...options.params, page, limit };
      const response = await this.request<{ items: T[]; has_more: boolean }>(endpoint, { params });

      if (response.items) {
        allItems.push(...response.items);
        hasMore = response.has_more;
        page++;
      } else {
        if (Array.isArray(response)) {
          return response as T[];
        }
        break;
      }
    }

    return allItems;
  }

  /**
   * Ping Joplin to check connectivity
   */
  async ping(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const url = this.buildUrl('/ping', token);
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============ Note Operations ============

  async getNote(id: string): Promise<JoplinNote> {
    return this.request<JoplinNote>(`/notes/${id}`, {
      params: { fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed,todo_due' },
    });
  }

  async createNote(data: {
    title: string;
    body?: string;
    parent_id: string;
    is_todo?: number;
    todo_due?: number;
  }): Promise<JoplinNote> {
    return this.request<JoplinNote>('/notes', {
      method: 'POST',
      body: data,
    });
  }

  async updateNote(id: string, data: Partial<{
    title: string;
    body: string;
    parent_id: string;
    is_todo: number;
    todo_completed: number;
    todo_due: number;
  }>): Promise<JoplinNote> {
    return this.request<JoplinNote>(`/notes/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request(`/notes/${id}`, { method: 'DELETE' });
  }

  async listNotes(params?: Record<string, string | number | boolean>): Promise<JoplinNote[]> {
    return this.requestPaginated<JoplinNote>('/notes', {
      params: {
        ...params,
        fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed,todo_due',
      },
    });
  }

  async searchNotes(query: string, params?: Record<string, string | number | boolean>): Promise<JoplinSearchResult[]> {
    return this.requestPaginated<JoplinSearchResult>('/search', {
      params: {
        ...params,
        query,
        fields: 'id,title,body,parent_id,created_time,updated_time,is_todo,todo_completed',
      },
    });
  }

  // ============ Notebook Operations ============

  async getNotebook(id: string): Promise<JoplinNotebook> {
    return this.request<JoplinNotebook>(`/folders/${id}`, {
      params: { fields: 'id,title,parent_id,created_time,updated_time' },
    });
  }

  async listNotebooks(): Promise<JoplinNotebook[]> {
    return this.requestPaginated<JoplinNotebook>('/folders', {
      params: { fields: 'id,title,parent_id,created_time,updated_time' },
    });
  }

  async findNotebookByName(name: string): Promise<JoplinNotebook | null> {
    const notebooks = await this.listNotebooks();
    const lowerName = name.toLowerCase();
    return notebooks.find(nb => nb.title.toLowerCase() === lowerName) || null;
  }

  // ============ Tag Operations ============

  async listTags(): Promise<JoplinTag[]> {
    return this.requestPaginated<JoplinTag>('/tags', {
      params: { fields: 'id,title,created_time,updated_time' },
    });
  }

  async getTagsByNote(noteId: string): Promise<JoplinTag[]> {
    return this.requestPaginated<JoplinTag>(`/notes/${noteId}/tags`, {
      params: { fields: 'id,title,created_time,updated_time' },
    });
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    await this.request(`/tags/${tagId}/notes`, {
      method: 'POST',
      body: { id: noteId },
    });
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await this.request(`/tags/${tagId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  async createTag(title: string): Promise<JoplinTag> {
    return this.request<JoplinTag>('/tags', {
      method: 'POST',
      body: { title },
    });
  }

  async findOrCreateTag(title: string): Promise<JoplinTag> {
    const tags = await this.listTags();
    const existing = tags.find(t => t.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      return existing;
    }
    return this.createTag(title);
  }
}
