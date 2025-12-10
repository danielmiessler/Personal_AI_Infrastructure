/**
 * JQL query building for jira CLI
 * Converts user-friendly options to JQL queries
 */

import { getCredentials } from "./config";
import { searchIssues, JiraSearchResult, getMyself } from "./api";

export interface SearchOptions {
  projectAlias?: string;
  text?: string;
  assignee?: string;
  status?: string;
  type?: string;
  priority?: string;
  labels?: string[];
  updated?: string;  // e.g., "7d", "1w", "30d"
  created?: string;
  jql?: string;      // Raw JQL override
  maxResults?: number;
}

/**
 * Build JQL query from search options
 */
export function buildJQL(options: SearchOptions, currentUserAccountId?: string): string {
  // If raw JQL provided, use it directly
  if (options.jql) {
    return options.jql;
  }

  const clauses: string[] = [];
  const credentials = getCredentials(options.projectAlias);

  // Always filter by project
  clauses.push(`project = "${credentials.projectKey}"`);

  // Text search
  if (options.text) {
    clauses.push(`text ~ "${escapeJQL(options.text)}"`);
  }

  // Assignee
  if (options.assignee) {
    if (options.assignee.toLowerCase() === "me") {
      clauses.push("assignee = currentUser()");
    } else if (options.assignee.toLowerCase() === "unassigned") {
      clauses.push("assignee IS EMPTY");
    } else {
      clauses.push(`assignee = "${escapeJQL(options.assignee)}"`);
    }
  }

  // Status
  if (options.status) {
    const status = options.status.toLowerCase();
    if (status === "open") {
      clauses.push('statusCategory != "Done"');
    } else if (status === "done" || status === "closed") {
      clauses.push('statusCategory = "Done"');
    } else if (status === "in progress" || status === "inprogress") {
      clauses.push('statusCategory = "In Progress"');
    } else {
      clauses.push(`status = "${escapeJQL(options.status)}"`);
    }
  }

  // Issue type
  if (options.type) {
    clauses.push(`issuetype = "${escapeJQL(options.type)}"`);
  }

  // Priority
  if (options.priority) {
    clauses.push(`priority = "${escapeJQL(options.priority)}"`);
  }

  // Labels
  if (options.labels && options.labels.length > 0) {
    for (const label of options.labels) {
      clauses.push(`labels = "${escapeJQL(label)}"`);
    }
  }

  // Updated within timeframe
  if (options.updated) {
    const jqlTime = parseTimeToJQL(options.updated);
    if (jqlTime) {
      clauses.push(`updated >= ${jqlTime}`);
    }
  }

  // Created within timeframe
  if (options.created) {
    const jqlTime = parseTimeToJQL(options.created);
    if (jqlTime) {
      clauses.push(`created >= ${jqlTime}`);
    }
  }

  // Combine with AND and add default ordering
  return clauses.join(" AND ") + " ORDER BY updated DESC";
}

/**
 * Escape special characters in JQL string values
 */
function escapeJQL(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

/**
 * Parse user-friendly time format to JQL
 * e.g., "7d" -> "-7d", "1w" -> "-1w", "30d" -> "-30d"
 */
function parseTimeToJQL(time: string): string | null {
  const match = time.match(/^(\d+)([dwmh])$/i);
  if (!match) return null;

  const [, amount, unit] = match;
  const jqlUnit = unit.toLowerCase();

  // Jira supports: h (hour), d (day), w (week)
  if (["h", "d", "w"].includes(jqlUnit)) {
    return `-${amount}${jqlUnit}`;
  }

  // Convert months to days (approximate)
  if (jqlUnit === "m") {
    const days = parseInt(amount) * 30;
    return `-${days}d`;
  }

  return null;
}

/**
 * Execute search with built JQL
 */
export async function search(options: SearchOptions): Promise<JiraSearchResult> {
  const jql = buildJQL(options);

  return searchIssues(jql, {
    projectAlias: options.projectAlias,
    maxResults: options.maxResults || 50,
  });
}

/**
 * Get my open issues
 */
export async function getMyOpenIssues(
  projectAlias?: string,
  maxResults?: number
): Promise<JiraSearchResult> {
  return search({
    projectAlias,
    assignee: "me",
    status: "open",
    maxResults,
  });
}

/**
 * Get recently updated issues
 */
export async function getRecentIssues(
  projectAlias?: string,
  days: number = 7,
  maxResults?: number
): Promise<JiraSearchResult> {
  return search({
    projectAlias,
    updated: `${days}d`,
    maxResults,
  });
}
