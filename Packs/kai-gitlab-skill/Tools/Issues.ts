#!/usr/bin/env bun
/**
 * GitLab Issues Tool
 * Manage project issues
 *
 * Usage:
 *   bun run Issues.ts list <project> [--state opened|closed|all] [--labels "a,b"] [--search "query"] [--limit <num>]
 *   bun run Issues.ts get <project> <issue_iid>
 *   bun run Issues.ts create <project> "title" [--description "..."] [--labels "a,b"] [--assignee <user_id>] [--milestone <id>]
 *   bun run Issues.ts update <project> <issue_iid> [--title "..."] [--description "..."] [--labels "a,b"] [--state-event close|reopen]
 *   bun run Issues.ts close <project> <issue_iid>
 *   bun run Issues.ts reopen <project> <issue_iid>
 *   bun run Issues.ts comment <project> <issue_iid> "body"
 *   bun run Issues.ts comments <project> <issue_iid>
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabIssue,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Issues.ts list <project> [--state opened|closed|all] [--labels "a,b"] [--search "query"] [--limit <num>]
  bun run Issues.ts get <project> <issue_iid>
  bun run Issues.ts create <project> "title" [--description "..."] [--labels "a,b"] [--assignee <user_id>] [--milestone <id>]
  bun run Issues.ts update <project> <issue_iid> [--title "..."] [--description "..."] [--labels "a,b"] [--state-event close|reopen]
  bun run Issues.ts close <project> <issue_iid>
  bun run Issues.ts reopen <project> <issue_iid>
  bun run Issues.ts comment <project> <issue_iid> "body"
  bun run Issues.ts comments <project> <issue_iid>

Arguments:
  <project>     Project ID (number) or path (group/project)
  <issue_iid>   Issue IID (the number shown in the UI, not the global ID)`;

interface IssueNote {
  id: number;
  body: string;
  author: {
    id: number;
    username: string;
    name: string;
  };
  created_at: string;
  updated_at: string;
  system: boolean;
}

/**
 * Format issue for output
 */
function formatIssue(issue: GitLabIssue) {
  return {
    iid: issue.iid,
    id: issue.id,
    title: issue.title,
    state: issue.state,
    labels: issue.labels,
    milestone: issue.milestone?.title,
    author: issue.author.username,
    assignees: issue.assignees.map((a) => a.username),
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    web_url: issue.web_url,
  };
}

/**
 * List issues
 */
async function listIssues(
  project: string,
  options: {
    state?: string;
    labels?: string;
    search?: string;
    limit?: number;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const params: Record<string, string | number | boolean | undefined> = {
    order_by: 'updated_at',
    sort: 'desc',
  };

  if (options.state) params.state = options.state;
  if (options.labels) params.labels = options.labels;
  if (options.search) params.search = options.search;

  const issues = await gitlabFetchPaginated<GitLabIssue>(
    `/projects/${encoded}/issues`,
    { params },
    options.limit || 20
  );

  outputJson({
    project,
    total: issues.length,
    issues: issues.map(formatIssue),
  });
}

/**
 * Get a single issue
 */
async function getIssue(project: string, issueIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const issue = await gitlabFetch<GitLabIssue>(
    `/projects/${encoded}/issues/${issueIid}`
  );

  outputJson({
    ...formatIssue(issue),
    description: issue.description,
  });
}

/**
 * Create an issue
 */
async function createIssue(
  project: string,
  title: string,
  options: {
    description?: string;
    labels?: string;
    assignee?: string;
    milestone?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = { title };

  if (options.description) body.description = options.description;
  if (options.labels) body.labels = options.labels;
  if (options.assignee) body.assignee_ids = [parseInt(options.assignee, 10)];
  if (options.milestone) body.milestone_id = parseInt(options.milestone, 10);

  const issue = await gitlabFetch<GitLabIssue>(
    `/projects/${encoded}/issues`,
    {
      method: 'POST',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Created issue #${issue.iid}: ${issue.title}`,
    ...formatIssue(issue),
  });
}

/**
 * Update an issue
 */
async function updateIssue(
  project: string,
  issueIid: string,
  options: {
    title?: string;
    description?: string;
    labels?: string;
    stateEvent?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {};

  if (options.title) body.title = options.title;
  if (options.description) body.description = options.description;
  if (options.labels) body.labels = options.labels;
  if (options.stateEvent) body.state_event = options.stateEvent;

  if (Object.keys(body).length === 0) {
    outputError('At least one field must be provided to update');
  }

  const issue = await gitlabFetch<GitLabIssue>(
    `/projects/${encoded}/issues/${issueIid}`,
    {
      method: 'PUT',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Updated issue #${issue.iid}`,
    ...formatIssue(issue),
  });
}

/**
 * Close an issue
 */
async function closeIssue(project: string, issueIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const issue = await gitlabFetch<GitLabIssue>(
    `/projects/${encoded}/issues/${issueIid}`,
    {
      method: 'PUT',
      body: { state_event: 'close' },
    }
  );

  outputJson({
    success: true,
    message: `Closed issue #${issue.iid}: ${issue.title}`,
    iid: issue.iid,
    state: issue.state,
    web_url: issue.web_url,
  });
}

/**
 * Reopen an issue
 */
async function reopenIssue(project: string, issueIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const issue = await gitlabFetch<GitLabIssue>(
    `/projects/${encoded}/issues/${issueIid}`,
    {
      method: 'PUT',
      body: { state_event: 'reopen' },
    }
  );

  outputJson({
    success: true,
    message: `Reopened issue #${issue.iid}: ${issue.title}`,
    iid: issue.iid,
    state: issue.state,
    web_url: issue.web_url,
  });
}

/**
 * Add a comment to an issue
 */
async function addComment(
  project: string,
  issueIid: string,
  body: string
): Promise<void> {
  const encoded = encodeProjectPath(project);

  const note = await gitlabFetch<IssueNote>(
    `/projects/${encoded}/issues/${issueIid}/notes`,
    {
      method: 'POST',
      body: { body },
    }
  );

  outputJson({
    success: true,
    message: `Added comment to issue #${issueIid}`,
    id: note.id,
    author: note.author.username,
    created_at: note.created_at,
    body: note.body,
  });
}

/**
 * List comments on an issue
 */
async function listComments(project: string, issueIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const notes = await gitlabFetchPaginated<IssueNote>(
    `/projects/${encoded}/issues/${issueIid}/notes`,
    {
      params: { sort: 'asc' },
    }
  );

  // Filter out system notes (automatic status changes, etc.)
  const comments = notes.filter((n) => !n.system);

  outputJson({
    project,
    issue_iid: issueIid,
    total: comments.length,
    comments: comments.map((n) => ({
      id: n.id,
      author: n.author.username,
      body: n.body,
      created_at: n.created_at,
      updated_at: n.updated_at,
    })),
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'list':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for list`);
        }
        await listIssues(positional[1], {
          state: flags.state as string | undefined,
          labels: flags.labels as string | undefined,
          search: flags.search as string | undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and issue_iid are required for get`);
        }
        await getIssue(positional[1], positional[2]);
        break;

      case 'create':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and title are required for create`);
        }
        await createIssue(positional[1], positional[2], {
          description: flags.description as string | undefined,
          labels: flags.labels as string | undefined,
          assignee: flags.assignee as string | undefined,
          milestone: flags.milestone as string | undefined,
        });
        break;

      case 'update':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and issue_iid are required for update`);
        }
        await updateIssue(positional[1], positional[2], {
          title: flags.title as string | undefined,
          description: flags.description as string | undefined,
          labels: flags.labels as string | undefined,
          stateEvent: flags['state-event'] as string | undefined,
        });
        break;

      case 'close':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and issue_iid are required for close`);
        }
        await closeIssue(positional[1], positional[2]);
        break;

      case 'reopen':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and issue_iid are required for reopen`);
        }
        await reopenIssue(positional[1], positional[2]);
        break;

      case 'comment':
        if (!positional[1] || !positional[2] || !positional[3]) {
          outputError(`${USAGE}\n\nError: project, issue_iid, and body are required for comment`);
        }
        await addComment(positional[1], positional[2], positional[3]);
        break;

      case 'comments':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and issue_iid are required for comments`);
        }
        await listComments(positional[1], positional[2]);
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
