/**
 * Jira REST API client
 * Uses Jira Cloud REST API v3
 * https://developer.atlassian.com/cloud/jira/platform/rest/v3/
 */

import { getCredentials, JiraCredentials } from "./config";

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: any; // ADF format
    status: {
      name: string;
      statusCategory: {
        name: string;
        colorName: string;
      };
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
      accountId: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    labels: string[];
    components?: Array<{ name: string }>;
    fixVersions?: Array<{ name: string }>;
    comment?: {
      total: number;
      comments: Array<{
        id: string;
        body: any; // ADF format
        author: { displayName: string };
        created: string;
      }>;
    };
    parent?: {
      key: string;
      fields: {
        summary: string;
      };
    };
  };
}

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
    statusCategory: {
      name: string;
    };
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export interface CreateIssueInput {
  projectKey: string;
  issueType: string;
  summary: string;
  description?: string;
  priority?: string;
  labels?: string[];
  assignee?: string;
  parentKey?: string;
}

/**
 * Make an authenticated request to the Jira API
 */
async function jiraRequest(
  credentials: JiraCredentials,
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${credentials.url}/rest/api/3${endpoint}`;
  const auth = Buffer.from(`${credentials.email}:${credentials.token}`).toString("base64");

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Jira API error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorBody);
      if (errorJson.errorMessages?.length > 0) {
        errorMessage = errorJson.errorMessages.join(", ");
      } else if (errorJson.errors) {
        errorMessage = Object.values(errorJson.errors).join(", ");
      }
    } catch {
      if (errorBody) errorMessage += `: ${errorBody.slice(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Search issues using JQL
 */
export async function searchIssues(
  jql: string,
  options?: {
    projectAlias?: string;
    maxResults?: number;
    startAt?: number;
    fields?: string[];
  }
): Promise<JiraSearchResult> {
  const credentials = getCredentials(options?.projectAlias);
  const maxResults = options?.maxResults || 50;
  const startAt = options?.startAt || 0;
  const fields = options?.fields || [
    "summary",
    "status",
    "issuetype",
    "priority",
    "assignee",
    "reporter",
    "created",
    "updated",
    "labels",
    "components",
    "parent",
  ];

  const params = new URLSearchParams({
    jql,
    maxResults: maxResults.toString(),
    startAt: startAt.toString(),
    fields: fields.join(","),
  });

  return jiraRequest(credentials, `/search?${params}`);
}

/**
 * Get a single issue by key
 */
export async function getIssue(
  issueKey: string,
  options?: {
    projectAlias?: string;
    expand?: string[];
  }
): Promise<JiraIssue> {
  const credentials = getCredentials(options?.projectAlias);
  const expand = options?.expand || ["renderedFields", "names", "changelog"];

  const params = new URLSearchParams({
    expand: expand.join(","),
  });

  return jiraRequest(credentials, `/issue/${issueKey}?${params}`);
}

/**
 * Create a new issue
 */
export async function createIssue(
  input: CreateIssueInput,
  projectAlias?: string
): Promise<{ id: string; key: string; self: string }> {
  const credentials = getCredentials(projectAlias);

  const body: any = {
    fields: {
      project: { key: input.projectKey || credentials.projectKey },
      issuetype: { name: input.issueType },
      summary: input.summary,
    },
  };

  if (input.description) {
    // Convert plain text to ADF (Atlassian Document Format)
    body.fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: input.description }],
        },
      ],
    };
  }

  if (input.priority) {
    body.fields.priority = { name: input.priority };
  }

  if (input.labels && input.labels.length > 0) {
    body.fields.labels = input.labels;
  }

  if (input.assignee) {
    // Handle "me" as special case
    if (input.assignee === "me") {
      const myself = await getMyself(projectAlias);
      body.fields.assignee = { accountId: myself.accountId };
    } else {
      body.fields.assignee = { accountId: input.assignee };
    }
  }

  if (input.parentKey) {
    body.fields.parent = { key: input.parentKey };
  }

  return jiraRequest(credentials, "/issue", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Update an issue
 */
export async function updateIssue(
  issueKey: string,
  updates: {
    summary?: string;
    description?: string;
    priority?: string;
    labels?: string[];
    assignee?: string;
  },
  projectAlias?: string
): Promise<void> {
  const credentials = getCredentials(projectAlias);

  const body: any = { fields: {} };

  if (updates.summary) {
    body.fields.summary = updates.summary;
  }

  if (updates.description) {
    body.fields.description = {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: updates.description }],
        },
      ],
    };
  }

  if (updates.priority) {
    body.fields.priority = { name: updates.priority };
  }

  if (updates.labels) {
    body.fields.labels = updates.labels;
  }

  if (updates.assignee) {
    if (updates.assignee === "me") {
      const myself = await getMyself(projectAlias);
      body.fields.assignee = { accountId: myself.accountId };
    } else if (updates.assignee === "unassigned" || updates.assignee === "none") {
      body.fields.assignee = null;
    } else {
      body.fields.assignee = { accountId: updates.assignee };
    }
  }

  await jiraRequest(credentials, `/issue/${issueKey}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * Get available transitions for an issue
 */
export async function getTransitions(
  issueKey: string,
  projectAlias?: string
): Promise<JiraTransition[]> {
  const credentials = getCredentials(projectAlias);
  const result = await jiraRequest(credentials, `/issue/${issueKey}/transitions`);
  return result.transitions;
}

/**
 * Transition an issue to a new status
 */
export async function transitionIssue(
  issueKey: string,
  transitionName: string,
  projectAlias?: string
): Promise<void> {
  const credentials = getCredentials(projectAlias);

  // First, get available transitions
  const transitions = await getTransitions(issueKey, projectAlias);

  // Find the transition by name (case-insensitive)
  const transition = transitions.find(
    (t) => t.name.toLowerCase() === transitionName.toLowerCase()
  );

  if (!transition) {
    const available = transitions.map((t) => t.name).join(", ");
    throw new Error(
      `Transition "${transitionName}" not available. Available: ${available}`
    );
  }

  await jiraRequest(credentials, `/issue/${issueKey}/transitions`, {
    method: "POST",
    body: JSON.stringify({ transition: { id: transition.id } }),
  });
}

/**
 * Add a comment to an issue
 */
export async function addComment(
  issueKey: string,
  comment: string,
  projectAlias?: string
): Promise<{ id: string }> {
  const credentials = getCredentials(projectAlias);

  const body = {
    body: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: comment }],
        },
      ],
    },
  };

  return jiraRequest(credentials, `/issue/${issueKey}/comment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Get comments for an issue
 */
export async function getComments(
  issueKey: string,
  options?: {
    projectAlias?: string;
    maxResults?: number;
  }
): Promise<Array<{ id: string; body: string; author: string; created: string }>> {
  const credentials = getCredentials(options?.projectAlias);
  const maxResults = options?.maxResults || 20;

  const result = await jiraRequest(
    credentials,
    `/issue/${issueKey}/comment?maxResults=${maxResults}`
  );

  return result.comments.map((c: any) => ({
    id: c.id,
    body: extractTextFromADF(c.body),
    author: c.author?.displayName || "Unknown",
    created: c.created,
  }));
}

/**
 * Get current user info
 */
export async function getMyself(projectAlias?: string): Promise<{
  accountId: string;
  displayName: string;
  emailAddress: string;
}> {
  const credentials = getCredentials(projectAlias);
  return jiraRequest(credentials, "/myself");
}

/**
 * Get project info
 */
export async function getProject(
  projectKey: string,
  projectAlias?: string
): Promise<JiraProject> {
  const credentials = getCredentials(projectAlias);
  return jiraRequest(credentials, `/project/${projectKey}`);
}

/**
 * Get issue types for a project
 */
export async function getIssueTypes(
  projectKey: string,
  projectAlias?: string
): Promise<Array<{ id: string; name: string; description: string }>> {
  const credentials = getCredentials(projectAlias);
  const project = await jiraRequest(credentials, `/project/${projectKey}`);
  return project.issueTypes || [];
}

/**
 * Get available statuses for a project
 */
export async function getStatuses(
  projectKey: string,
  projectAlias?: string
): Promise<Array<{ name: string; category: string }>> {
  const credentials = getCredentials(projectAlias);

  const result = await jiraRequest(credentials, `/project/${projectKey}/statuses`);

  // Flatten statuses from all issue types
  const statusSet = new Set<string>();
  const statuses: Array<{ name: string; category: string }> = [];

  for (const issueType of result) {
    for (const status of issueType.statuses) {
      if (!statusSet.has(status.name)) {
        statusSet.add(status.name);
        statuses.push({
          name: status.name,
          category: status.statusCategory?.name || "Unknown",
        });
      }
    }
  }

  return statuses;
}

/**
 * Extract plain text from ADF (Atlassian Document Format)
 */
export function extractTextFromADF(adf: any): string {
  if (!adf) return "";
  if (typeof adf === "string") return adf;

  const extractContent = (node: any): string => {
    if (!node) return "";

    if (node.type === "text") {
      return node.text || "";
    }

    if (node.content && Array.isArray(node.content)) {
      return node.content.map(extractContent).join("");
    }

    if (node.type === "paragraph") {
      return (node.content?.map(extractContent).join("") || "") + "\n";
    }

    if (node.type === "bulletList" || node.type === "orderedList") {
      return (
        node.content
          ?.map((item: any, i: number) => {
            const prefix = node.type === "orderedList" ? `${i + 1}. ` : "• ";
            return prefix + extractContent(item);
          })
          .join("") || ""
      );
    }

    if (node.type === "listItem") {
      return (node.content?.map(extractContent).join("") || "") + "\n";
    }

    if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      return "#".repeat(level) + " " + (node.content?.map(extractContent).join("") || "") + "\n";
    }

    if (node.type === "codeBlock") {
      return "```\n" + (node.content?.map(extractContent).join("") || "") + "\n```\n";
    }

    return node.content?.map(extractContent).join("") || "";
  };

  return extractContent(adf).trim();
}
