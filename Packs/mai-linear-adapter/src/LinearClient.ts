/**
 * Linear GraphQL API Client
 */

import { $ } from 'bun';

const DEFAULT_API_URL = 'https://api.linear.app/graphql';
const KEYCHAIN_SERVICE = 'linear-api-key';
const KEYCHAIN_ACCOUNT = 'claude-code';

/**
 * Linear API types
 */
export interface LinearIssue {
  id: string;
  title: string;
  description?: string;
  state: {
    id: string;
    name: string;
    type: string;
  };
  priority: number;
  labels: { nodes: LinearLabel[] };
  assignee?: { id: string; name: string };
  project?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  dueDate?: string;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

/**
 * Custom error class for Linear API errors
 */
export class LinearError extends Error {
  constructor(
    public errors: Array<{ message: string }>,
    public status?: number
  ) {
    super(errors.map(e => e.message).join(', '));
    this.name = 'LinearError';
  }
}

/**
 * Linear GraphQL API Client
 */
export class LinearClient {
  private readonly apiUrl: string;
  private token: string | null = null;
  private readonly teamId: string;

  constructor(teamId: string, apiUrl: string = DEFAULT_API_URL) {
    this.teamId = teamId;
    this.apiUrl = apiUrl;
  }

  /**
   * Get API key from keychain
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
        `Failed to retrieve Linear API key from keychain. ` +
        `Ensure key is stored with: security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w "<api-key>"`
      );
    }
  }

  /**
   * Execute GraphQL query
   */
  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getToken();

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json() as { data?: T; errors?: Array<{ message: string }> };

    if (json.errors && json.errors.length > 0) {
      throw new LinearError(json.errors, response.status);
    }

    return json.data as T;
  }

  /**
   * Check API connectivity
   */
  async ping(): Promise<boolean> {
    try {
      await this.query(`query { viewer { id } }`);
      return true;
    } catch {
      return false;
    }
  }

  // ============ Issue Operations ============

  async getIssue(id: string): Promise<LinearIssue> {
    const data = await this.query<{ issue: LinearIssue }>(`
      query GetIssue($id: String!) {
        issue(id: $id) {
          id
          title
          description
          state { id name type }
          priority
          labels { nodes { id name color } }
          assignee { id name }
          project { id name }
          createdAt
          updatedAt
          completedAt
          dueDate
        }
      }
    `, { id });

    return data.issue;
  }

  async createIssue(input: {
    title: string;
    description?: string;
    priority?: number;
    labelIds?: string[];
    projectId?: string;
    dueDate?: string;
  }): Promise<LinearIssue> {
    const data = await this.query<{ issueCreate: { issue: LinearIssue } }>(`
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          issue {
            id
            title
            description
            state { id name type }
            priority
            labels { nodes { id name color } }
            assignee { id name }
            project { id name }
            createdAt
            updatedAt
            completedAt
            dueDate
          }
        }
      }
    `, {
      input: {
        teamId: this.teamId,
        ...input,
      },
    });

    return data.issueCreate.issue;
  }

  async updateIssue(id: string, input: {
    title?: string;
    description?: string;
    stateId?: string;
    priority?: number;
    dueDate?: string;
  }): Promise<LinearIssue> {
    const data = await this.query<{ issueUpdate: { issue: LinearIssue } }>(`
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          issue {
            id
            title
            description
            state { id name type }
            priority
            labels { nodes { id name color } }
            assignee { id name }
            project { id name }
            createdAt
            updatedAt
            completedAt
            dueDate
          }
        }
      }
    `, { id, input });

    return data.issueUpdate.issue;
  }

  async deleteIssue(id: string): Promise<void> {
    await this.query(`
      mutation DeleteIssue($id: String!) {
        issueDelete(id: $id) {
          success
        }
      }
    `, { id });
  }

  async listIssues(filter?: {
    stateType?: string[];
    priority?: number[];
    projectId?: string;
    first?: number;
    after?: string;
  }): Promise<{ issues: LinearIssue[]; hasNextPage: boolean; endCursor?: string }> {
    const filterObj: Record<string, unknown> = {
      team: { id: { eq: this.teamId } },
    };

    if (filter?.stateType) {
      filterObj.state = { type: { in: filter.stateType } };
    }
    if (filter?.priority) {
      filterObj.priority = { in: filter.priority };
    }
    if (filter?.projectId) {
      filterObj.project = { id: { eq: filter.projectId } };
    }

    const data = await this.query<{
      issues: {
        nodes: LinearIssue[];
        pageInfo: { hasNextPage: boolean; endCursor?: string };
      };
    }>(`
      query ListIssues($filter: IssueFilter, $first: Int, $after: String) {
        issues(filter: $filter, first: $first, after: $after) {
          nodes {
            id
            title
            description
            state { id name type }
            priority
            labels { nodes { id name color } }
            assignee { id name }
            project { id name }
            createdAt
            updatedAt
            completedAt
            dueDate
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `, {
      filter: filterObj,
      first: filter?.first || 50,
      after: filter?.after,
    });

    return {
      issues: data.issues.nodes,
      hasNextPage: data.issues.pageInfo.hasNextPage,
      endCursor: data.issues.pageInfo.endCursor,
    };
  }

  async searchIssues(query: string, first?: number): Promise<LinearIssue[]> {
    const data = await this.query<{
      issueSearch: { nodes: LinearIssue[] };
    }>(`
      query SearchIssues($query: String!, $first: Int) {
        issueSearch(query: $query, first: $first) {
          nodes {
            id
            title
            description
            state { id name type }
            priority
            labels { nodes { id name color } }
            assignee { id name }
            project { id name }
            createdAt
            updatedAt
            completedAt
            dueDate
          }
        }
      }
    `, { query, first: first || 20 });

    return data.issueSearch.nodes;
  }

  // ============ Project Operations ============

  async listProjects(): Promise<LinearProject[]> {
    const data = await this.query<{
      team: { projects: { nodes: LinearProject[] } };
    }>(`
      query ListProjects($teamId: String!) {
        team(id: $teamId) {
          projects {
            nodes {
              id
              name
              description
            }
          }
        }
      }
    `, { teamId: this.teamId });

    return data.team.projects.nodes;
  }

  async getProject(id: string): Promise<LinearProject> {
    const data = await this.query<{ project: LinearProject }>(`
      query GetProject($id: String!) {
        project(id: $id) {
          id
          name
          description
        }
      }
    `, { id });

    return data.project;
  }

  // ============ Label Operations ============

  async listLabels(): Promise<LinearLabel[]> {
    const data = await this.query<{
      team: { labels: { nodes: LinearLabel[] } };
    }>(`
      query ListLabels($teamId: String!) {
        team(id: $teamId) {
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    `, { teamId: this.teamId });

    return data.team.labels.nodes;
  }

  async addLabelToIssue(issueId: string, labelId: string): Promise<void> {
    await this.query(`
      mutation AddLabel($issueId: String!, $labelIds: [String!]!) {
        issueAddLabel(id: $issueId, labelIds: $labelIds) {
          success
        }
      }
    `, { issueId, labelIds: [labelId] });
  }

  async removeLabelFromIssue(issueId: string, labelId: string): Promise<void> {
    await this.query(`
      mutation RemoveLabel($issueId: String!, $labelIds: [String!]!) {
        issueRemoveLabel(id: $issueId, labelIds: $labelIds) {
          success
        }
      }
    `, { issueId, labelIds: [labelId] });
  }

  // ============ State Operations ============

  async listStates(): Promise<Array<{ id: string; name: string; type: string }>> {
    const data = await this.query<{
      team: { states: { nodes: Array<{ id: string; name: string; type: string }> } };
    }>(`
      query ListStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
              type
            }
          }
        }
      }
    `, { teamId: this.teamId });

    return data.team.states.nodes;
  }
}
