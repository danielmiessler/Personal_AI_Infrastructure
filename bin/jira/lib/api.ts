/**
 * JIRA REST API Client
 *
 * Provides typed access to Jira Cloud/Server REST API v3.
 * Uses Basic Auth with API token.
 */

import type { JiraConfig } from "./config";

// ============================================================================
// Types
// ============================================================================

export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    description?: string | null;
    status: { name: string; id: string };
    issuetype: { name: string; id: string };
    priority?: { name: string; id: string };
    assignee?: { displayName: string; accountId: string } | null;
    reporter?: { displayName: string; accountId: string } | null;
    labels: string[];
    created: string;
    updated: string;
    parent?: { key: string; fields: { summary: string } };
    subtasks?: Array<{ key: string; fields: { summary: string; status: { name: string } } }>;
    issuelinks?: IssueLink[];
    comment?: { comments: Comment[]; total: number };
    attachment?: Attachment[];
    [key: string]: unknown;
  };
}

export interface IssueLink {
  id: string;
  type: { name: string; inward: string; outward: string };
  inwardIssue?: { key: string; fields: { summary: string; status: { name: string } } };
  outwardIssue?: { key: string; fields: { summary: string; status: { name: string } } };
}

export interface Comment {
  id: string;
  author: { displayName: string };
  body: string | object;
  created: string;
  updated: string;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string;  // URL to download
  thumbnail?: string;
  created: string;
  author: { displayName: string; accountId: string };
}

export interface JiraProject {
  key: string;
  name: string;
  id: string;
  lead?: { displayName: string };
  projectTypeKey: string;
}

export interface IssueType {
  id: string;
  name: string;
  subtask: boolean;
  description?: string;
}

export interface Transition {
  id: string;
  name: string;
  to: { name: string; id: string };
}

export interface IssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
}

export interface JiraFilterSharePermission {
  id: number;
  type: "global" | "project" | "group" | "user" | "loggedin" | "authenticated";
  project?: { id: string; key: string; name: string };
  group?: { name: string };
  user?: { displayName: string; accountId: string };
}

export interface JiraFilter {
  id: string;
  name: string;
  jql: string;
  description?: string;
  owner: { displayName: string; accountId: string };
  favourite: boolean;
  viewUrl: string;
  sharePermissions?: JiraFilterSharePermission[];
}

export interface SearchResult {
  issues: JiraIssue[];
  total?: number;       // v2 API
  maxResults?: number;  // v2 API
  startAt?: number;     // v2 API
  isLast?: boolean;     // v3 API
}

export interface CreateIssueInput {
  project: string;
  issuetype: string;
  summary: string;
  description?: string;
  assignee?: string;
  labels?: string[];
  parent?: string;      // For sub-tasks
  epicKey?: string;     // For linking to epic
  priority?: string;
}

export interface UpdateIssueInput {
  summary?: string;
  description?: string;
  assignee?: string;
  labels?: string[];
  priority?: string;
  issuetype?: string;
}

export interface DevInfo {
  branches: Array<{
    name: string;
    url: string;
    repository: { name: string; url: string };
  }>;
  commits: Array<{
    id: string;
    message: string;
    author: { name: string };
    url: string;
    timestamp: string;
  }>;
  pullRequests: Array<{
    id: string;
    name: string;
    url: string;
    status: string;
    author: { name: string };
  }>;
}

// ============================================================================
// API Client Class
// ============================================================================

export class JiraClient {
  private baseUrl: string;
  private authHeader: string;
  public profileName: string;

  constructor(config: JiraConfig) {
    this.baseUrl = config.url;
    this.profileName = config.profileName;

    // Basic auth: base64(email:api_token)
    const credentials = `${config.username}:${config.apiToken}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString("base64")}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        "Authorization": this.authHeader,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.errorMessages?.join(", ") ||
                       errorJson.errors ? Object.values(errorJson.errors).join(", ") :
                       errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed. Check JIRA_API_TOKEN for profile '${this.profileName}'`);
      }
      if (response.status === 404) {
        throw new Error(`Not found: ${path}`);
      }

      throw new Error(`Jira API error (${response.status}): ${errorMessage}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text) as T;
  }

  // ==========================================================================
  // Issue Operations
  // ==========================================================================

  async getIssue(issueKey: string, expand?: string[]): Promise<JiraIssue> {
    const expandParam = expand?.length ? `?expand=${expand.join(",")}` : "";
    return this.request<JiraIssue>("GET", `/rest/api/2/issue/${issueKey}${expandParam}`);
  }

  async searchIssues(jql: string, options?: {
    maxResults?: number;
    startAt?: number;
    fields?: string[];
  }): Promise<SearchResult> {
    // Use v3 search/jql API with POST (Cloud only - v2 endpoints deprecated)
    const defaultFields = [
      "key", "summary", "status", "issuetype", "priority",
      "assignee", "reporter", "labels", "created", "updated", "parent"
    ];

    const body = {
      jql,
      maxResults: options?.maxResults ?? 50,
      fields: options?.fields || defaultFields,
    };

    return this.request<SearchResult>("POST", "/rest/api/3/search/jql", body);
  }

  async createIssue(input: CreateIssueInput): Promise<{ key: string; id: string }> {
    const fields: Record<string, unknown> = {
      project: { key: input.project },
      issuetype: { name: input.issuetype },
      summary: input.summary,
    };

    if (input.description) {
      // v2 API uses plain text
      fields.description = input.description;
    }

    if (input.assignee) {
      fields.assignee = { accountId: input.assignee };
    }

    if (input.labels?.length) {
      fields.labels = input.labels;
    }

    if (input.parent) {
      fields.parent = { key: input.parent };
    }

    if (input.priority) {
      fields.priority = { name: input.priority };
    }

    const result = await this.request<{ key: string; id: string; self: string }>(
      "POST",
      "/rest/api/2/issue",
      { fields }
    );

    // Link to epic if specified (separate API call)
    if (input.epicKey) {
      await this.linkToEpic(result.key, input.epicKey);
    }

    return { key: result.key, id: result.id };
  }

  async updateIssue(issueKey: string, input: UpdateIssueInput): Promise<void> {
    const fields: Record<string, unknown> = {};

    if (input.summary) {
      fields.summary = input.summary;
    }

    if (input.description !== undefined) {
      // v2 API uses plain text
      fields.description = input.description || null;
    }

    if (input.assignee !== undefined) {
      fields.assignee = input.assignee ? { accountId: input.assignee } : null;
    }

    if (input.labels) {
      fields.labels = input.labels;
    }

    if (input.priority) {
      fields.priority = { name: input.priority };
    }

    if (input.issuetype) {
      fields.issuetype = { name: input.issuetype };
    }

    await this.request("PUT", `/rest/api/2/issue/${issueKey}`, { fields });
  }

  // ==========================================================================
  // Transitions
  // ==========================================================================

  async getTransitions(issueKey: string): Promise<Transition[]> {
    const result = await this.request<{ transitions: Transition[] }>(
      "GET",
      `/rest/api/2/issue/${issueKey}/transitions`
    );
    return result.transitions;
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    await this.request("POST", `/rest/api/2/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
  }

  // ==========================================================================
  // Comments
  // ==========================================================================

  async addComment(issueKey: string, body: string): Promise<Comment> {
    // v2 API uses plain text body, v3 uses ADF
    return this.request<Comment>("POST", `/rest/api/2/issue/${issueKey}/comment`, {
      body,
    });
  }

  // ==========================================================================
  // Labels
  // ==========================================================================

  async addLabels(issueKey: string, labels: string[]): Promise<void> {
    const issue = await this.getIssue(issueKey);
    const currentLabels = issue.fields.labels || [];
    const newLabels = [...new Set([...currentLabels, ...labels])];

    await this.request("PUT", `/rest/api/2/issue/${issueKey}`, {
      fields: { labels: newLabels },
    });
  }

  async removeLabels(issueKey: string, labels: string[]): Promise<void> {
    const issue = await this.getIssue(issueKey);
    const currentLabels = issue.fields.labels || [];
    const newLabels = currentLabels.filter(l => !labels.includes(l));

    await this.request("PUT", `/rest/api/2/issue/${issueKey}`, {
      fields: { labels: newLabels },
    });
  }

  // ==========================================================================
  // Issue Links
  // ==========================================================================

  async getLinkTypes(): Promise<IssueLinkType[]> {
    const result = await this.request<{ issueLinkTypes: IssueLinkType[] }>(
      "GET",
      "/rest/api/2/issueLinkType"
    );
    return result.issueLinkTypes;
  }

  async createLink(
    inwardIssue: string,
    outwardIssue: string,
    linkTypeName: string
  ): Promise<void> {
    await this.request("POST", "/rest/api/2/issueLink", {
      type: { name: linkTypeName },
      inwardIssue: { key: inwardIssue },
      outwardIssue: { key: outwardIssue },
    });
  }

  async deleteLink(linkId: string): Promise<void> {
    await this.request("DELETE", `/rest/api/2/issueLink/${linkId}`);
  }

  async linkToEpic(issueKey: string, epicKey: string): Promise<void> {
    // Jira Cloud uses parent field for epic hierarchy
    // parent field requires { key: "EPIC-123" } format
    try {
      await this.request("PUT", `/rest/api/2/issue/${issueKey}`, {
        fields: { parent: { key: epicKey } },
      });
      return;
    } catch {
      // Try legacy custom fields for older Jira instances
      const legacyFields = ["customfield_10014", "customfield_10008"];
      for (const field of legacyFields) {
        try {
          await this.request("PUT", `/rest/api/2/issue/${issueKey}`, {
            fields: { [field]: epicKey },
          });
          return;
        } catch {
          continue;
        }
      }
    }

    // Fall back to issue link
    await this.createLink(issueKey, epicKey, "Epic-Story Link");
  }

  // ==========================================================================
  // Projects and Types
  // ==========================================================================

  async getProjects(): Promise<JiraProject[]> {
    return this.request<JiraProject[]>("GET", "/rest/api/2/project");
  }

  async getIssueTypes(projectKey?: string): Promise<IssueType[]> {
    if (projectKey) {
      const project = await this.request<{ issueTypes: IssueType[] }>(
        "GET",
        `/rest/api/2/project/${projectKey}`
      );
      return project.issueTypes;
    }

    return this.request<IssueType[]>("GET", "/rest/api/2/issuetype");
  }

  // ==========================================================================
  // Development Info (GitHub Integration)
  // ==========================================================================

  async getDevInfo(issueKey: string): Promise<DevInfo> {
    // Get issue ID first
    const issue = await this.getIssue(issueKey);
    const issueId = issue.id;

    try {
      // Internal dev-status API
      const result = await this.request<{
        detail?: Array<{
          branches?: DevInfo["branches"];
          pullRequests?: DevInfo["pullRequests"];
          repositories?: Array<{
            commits?: DevInfo["commits"];
          }>;
        }>;
      }>(
        "GET",
        `/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=GitHub&dataType=repository`
      );

      const detail = result.detail?.[0];
      return {
        branches: detail?.branches || [],
        commits: detail?.repositories?.[0]?.commits || [],
        pullRequests: detail?.pullRequests || [],
      };
    } catch {
      // Dev-status API not available or no integration
      return { branches: [], commits: [], pullRequests: [] };
    }
  }

  // ==========================================================================
  // Attachments
  // ==========================================================================

  async getAttachments(issueKey: string): Promise<Attachment[]> {
    const issue = await this.request<JiraIssue>(
      "GET",
      `/rest/api/2/issue/${issueKey}?fields=attachment`
    );
    return issue.fields.attachment || [];
  }

  /**
   * Download attachment content as Buffer.
   * Jira attachments require the same auth as the API.
   */
  async downloadAttachment(contentUrl: string): Promise<Buffer> {
    const response = await fetch(contentUrl, {
      headers: {
        "Authorization": this.authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Get image attachments (for vision analysis)
   */
  async getImageAttachments(issueKey: string): Promise<Attachment[]> {
    const attachments = await this.getAttachments(issueKey);
    const imageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    return attachments.filter(a => imageTypes.includes(a.mimeType));
  }

  // ==========================================================================
  // Filters
  // ==========================================================================

  /**
   * Get user's favourite/starred filters
   */
  async getFavouriteFilters(): Promise<JiraFilter[]> {
    return this.request<JiraFilter[]>("GET", "/rest/api/2/filter/favourite");
  }

  /**
   * Get a specific filter by ID
   */
  async getFilter(filterId: string): Promise<JiraFilter> {
    return this.request<JiraFilter>("GET", `/rest/api/2/filter/${filterId}`);
  }

  /**
   * Search for filters by name
   */
  async searchFilters(filterName?: string): Promise<JiraFilter[]> {
    const params = new URLSearchParams();
    if (filterName) {
      params.set("filterName", filterName);
    }
    params.set("expand", "jql,description,owner,sharePermissions");
    const queryString = params.toString();
    const result = await this.request<{ values: JiraFilter[] }>(
      "GET",
      `/rest/api/2/filter/search${queryString ? `?${queryString}` : ""}`
    );
    return result.values || [];
  }

  /**
   * Find filter by name or ID, return its JQL
   */
  async getFilterJql(filterNameOrId: string): Promise<string> {
    // If it looks like an ID (numeric), fetch directly
    if (/^\d+$/.test(filterNameOrId)) {
      const filter = await this.getFilter(filterNameOrId);
      return filter.jql;
    }

    // Otherwise search by name
    const filters = await this.searchFilters(filterNameOrId);
    const match = filters.find(
      f => f.name.toLowerCase() === filterNameOrId.toLowerCase()
    );
    if (!match) {
      throw new Error(`Filter not found: ${filterNameOrId}`);
    }
    return match.jql;
  }

  // ==========================================================================
  // Labels Discovery
  // ==========================================================================

  async getAllLabels(): Promise<Map<string, number>> {
    // Search all issues and count labels
    // Note: Jira doesn't have a direct labels API, so we aggregate from search
    const labelCounts = new Map<string, number>();

    let startAt = 0;
    const maxResults = 100;

    while (true) {
      const result = await this.searchIssues(
        "labels is not EMPTY ORDER BY updated DESC",
        { maxResults, startAt, fields: ["labels"] }
      );

      for (const issue of result.issues) {
        for (const label of issue.fields.labels || []) {
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }
      }

      if (result.issues.length < maxResults || startAt + maxResults >= result.total) {
        break;
      }

      startAt += maxResults;

      // Limit to prevent long-running queries
      if (startAt >= 1000) break;
    }

    return labelCounts;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert text query to JQL if not already JQL
 */
export function textToJql(query: string): string {
  // If it looks like JQL (has operators), return as-is
  if (/\s+(=|!=|~|IN|NOT|AND|OR|ORDER BY)\s+/i.test(query)) {
    return query;
  }

  // Otherwise, treat as text search
  return `text ~ "${query.replace(/"/g, '\\"')}"`;
}

/**
 * Extract ADF text content to plain text
 */
export function adfToText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return String(adf || "");

  const doc = adf as { content?: Array<{ content?: Array<{ text?: string }> }> };
  if (!doc.content) return "";

  return doc.content
    .flatMap(block => block.content?.map(item => item.text || "") || [])
    .join("\n");
}
