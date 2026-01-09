#!/usr/bin/env bun
/**
 * GitLab Merge Requests Tool
 * Manage merge requests
 *
 * Usage:
 *   bun run MergeRequests.ts list <project> [--state opened|merged|closed|all] [--labels "a,b"] [--search "query"] [--limit <num>]
 *   bun run MergeRequests.ts get <project> <mr_iid>
 *   bun run MergeRequests.ts create <project> --source "branch" --target "branch" "title" [--description "..."] [--labels "a,b"] [--draft]
 *   bun run MergeRequests.ts update <project> <mr_iid> [--title "..."] [--description "..."] [--labels "a,b"] [--draft] [--target "branch"]
 *   bun run MergeRequests.ts merge <project> <mr_iid> [--squash] [--delete-source] [--message "..."]
 *   bun run MergeRequests.ts approve <project> <mr_iid>
 *   bun run MergeRequests.ts close <project> <mr_iid>
 *   bun run MergeRequests.ts reopen <project> <mr_iid>
 *   bun run MergeRequests.ts changes <project> <mr_iid>
 *   bun run MergeRequests.ts comment <project> <mr_iid> "body"
 *   bun run MergeRequests.ts comments <project> <mr_iid>
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabMergeRequest,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run MergeRequests.ts list <project> [--state opened|merged|closed|all] [--labels "a,b"] [--search "query"] [--limit <num>]
  bun run MergeRequests.ts get <project> <mr_iid>
  bun run MergeRequests.ts create <project> --source "branch" --target "branch" "title" [--description "..."] [--labels "a,b"] [--draft]
  bun run MergeRequests.ts update <project> <mr_iid> [--title "..."] [--description "..."] [--labels "a,b"] [--draft] [--target "branch"]
  bun run MergeRequests.ts merge <project> <mr_iid> [--squash] [--delete-source] [--message "..."]
  bun run MergeRequests.ts approve <project> <mr_iid>
  bun run MergeRequests.ts close <project> <mr_iid>
  bun run MergeRequests.ts reopen <project> <mr_iid>
  bun run MergeRequests.ts changes <project> <mr_iid>
  bun run MergeRequests.ts comment <project> <mr_iid> "body"
  bun run MergeRequests.ts comments <project> <mr_iid>

Arguments:
  <project>   Project ID (number) or path (group/project)
  <mr_iid>    Merge request IID (the number shown in the UI, not the global ID)`;

interface MRNote {
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

interface MRChanges extends GitLabMergeRequest {
  changes: Array<{
    old_path: string;
    new_path: string;
    diff: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
  }>;
}

/**
 * Format merge request for output
 */
function formatMR(mr: GitLabMergeRequest) {
  return {
    iid: mr.iid,
    id: mr.id,
    title: mr.title,
    state: mr.state,
    draft: mr.draft,
    source_branch: mr.source_branch,
    target_branch: mr.target_branch,
    labels: mr.labels,
    milestone: mr.milestone?.title,
    author: mr.author.username,
    assignees: mr.assignees.map((a) => a.username),
    merge_status: mr.merge_status,
    created_at: mr.created_at,
    updated_at: mr.updated_at,
    merged_at: mr.merged_at,
    web_url: mr.web_url,
  };
}

/**
 * List merge requests
 */
async function listMRs(
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

  const mrs = await gitlabFetchPaginated<GitLabMergeRequest>(
    `/projects/${encoded}/merge_requests`,
    { params },
    options.limit || 20
  );

  outputJson({
    project,
    total: mrs.length,
    merge_requests: mrs.map(formatMR),
  });
}

/**
 * Get a single merge request
 */
async function getMR(project: string, mrIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const mr = await gitlabFetch<GitLabMergeRequest>(
    `/projects/${encoded}/merge_requests/${mrIid}`
  );

  outputJson({
    ...formatMR(mr),
    description: mr.description,
  });
}

/**
 * Create a merge request
 */
async function createMR(
  project: string,
  title: string,
  options: {
    source: string;
    target: string;
    description?: string;
    labels?: string;
    draft?: boolean;
  }
): Promise<void> {
  if (!options.source) {
    outputError('--source is required for create');
  }
  if (!options.target) {
    outputError('--target is required for create');
  }

  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {
    title,
    source_branch: options.source,
    target_branch: options.target,
  };

  if (options.description) body.description = options.description;
  if (options.labels) body.labels = options.labels;
  if (options.draft) body.draft = true;

  const mr = await gitlabFetch<GitLabMergeRequest>(
    `/projects/${encoded}/merge_requests`,
    {
      method: 'POST',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Created merge request !${mr.iid}: ${mr.title}`,
    ...formatMR(mr),
  });
}

/**
 * Update a merge request
 */
async function updateMR(
  project: string,
  mrIid: string,
  options: {
    title?: string;
    description?: string;
    labels?: string;
    draft?: boolean;
    target?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {};

  if (options.title) body.title = options.title;
  if (options.description) body.description = options.description;
  if (options.labels) body.labels = options.labels;
  if (options.draft !== undefined) body.draft = options.draft;
  if (options.target) body.target_branch = options.target;

  if (Object.keys(body).length === 0) {
    outputError('At least one field must be provided to update');
  }

  const mr = await gitlabFetch<GitLabMergeRequest>(
    `/projects/${encoded}/merge_requests/${mrIid}`,
    {
      method: 'PUT',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Updated merge request !${mr.iid}`,
    ...formatMR(mr),
  });
}

/**
 * Merge a merge request
 */
async function mergeMR(
  project: string,
  mrIid: string,
  options: {
    squash?: boolean;
    deleteSource?: boolean;
    message?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {};

  if (options.squash) body.squash = true;
  if (options.deleteSource) body.should_remove_source_branch = true;
  if (options.message) body.merge_commit_message = options.message;

  const mr = await gitlabFetch<GitLabMergeRequest>(
    `/projects/${encoded}/merge_requests/${mrIid}/merge`,
    {
      method: 'PUT',
      body: Object.keys(body).length > 0 ? body : undefined,
    }
  );

  outputJson({
    success: true,
    message: `Merged merge request !${mr.iid}: ${mr.title}`,
    iid: mr.iid,
    state: mr.state,
    merged_at: mr.merged_at,
    web_url: mr.web_url,
  });
}

/**
 * Approve a merge request
 */
async function approveMR(project: string, mrIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  await gitlabFetch(
    `/projects/${encoded}/merge_requests/${mrIid}/approve`,
    { method: 'POST' }
  );

  outputJson({
    success: true,
    message: `Approved merge request !${mrIid}`,
    project,
    mr_iid: mrIid,
  });
}

/**
 * Close a merge request
 */
async function closeMR(project: string, mrIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const mr = await gitlabFetch<GitLabMergeRequest>(
    `/projects/${encoded}/merge_requests/${mrIid}`,
    {
      method: 'PUT',
      body: { state_event: 'close' },
    }
  );

  outputJson({
    success: true,
    message: `Closed merge request !${mr.iid}: ${mr.title}`,
    iid: mr.iid,
    state: mr.state,
    web_url: mr.web_url,
  });
}

/**
 * Reopen a merge request
 */
async function reopenMR(project: string, mrIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const mr = await gitlabFetch<GitLabMergeRequest>(
    `/projects/${encoded}/merge_requests/${mrIid}`,
    {
      method: 'PUT',
      body: { state_event: 'reopen' },
    }
  );

  outputJson({
    success: true,
    message: `Reopened merge request !${mr.iid}: ${mr.title}`,
    iid: mr.iid,
    state: mr.state,
    web_url: mr.web_url,
  });
}

/**
 * Get merge request changes/diff
 */
async function getMRChanges(project: string, mrIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const mr = await gitlabFetch<MRChanges>(
    `/projects/${encoded}/merge_requests/${mrIid}/changes`
  );

  outputJson({
    iid: mr.iid,
    title: mr.title,
    source_branch: mr.source_branch,
    target_branch: mr.target_branch,
    changes: mr.changes.map((c) => ({
      path: c.new_path,
      old_path: c.old_path !== c.new_path ? c.old_path : undefined,
      new_file: c.new_file,
      renamed: c.renamed_file,
      deleted: c.deleted_file,
      diff_preview: c.diff.substring(0, 500) + (c.diff.length > 500 ? '...' : ''),
    })),
  });
}

/**
 * Add a comment to a merge request
 */
async function addComment(
  project: string,
  mrIid: string,
  body: string
): Promise<void> {
  const encoded = encodeProjectPath(project);

  const note = await gitlabFetch<MRNote>(
    `/projects/${encoded}/merge_requests/${mrIid}/notes`,
    {
      method: 'POST',
      body: { body },
    }
  );

  outputJson({
    success: true,
    message: `Added comment to merge request !${mrIid}`,
    id: note.id,
    author: note.author.username,
    created_at: note.created_at,
    body: note.body,
  });
}

/**
 * List comments on a merge request
 */
async function listComments(project: string, mrIid: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  const notes = await gitlabFetchPaginated<MRNote>(
    `/projects/${encoded}/merge_requests/${mrIid}/notes`,
    {
      params: { sort: 'asc' },
    }
  );

  // Filter out system notes (automatic status changes, etc.)
  const comments = notes.filter((n) => !n.system);

  outputJson({
    project,
    mr_iid: mrIid,
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
        await listMRs(positional[1], {
          state: flags.state as string | undefined,
          labels: flags.labels as string | undefined,
          search: flags.search as string | undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for get`);
        }
        await getMR(positional[1], positional[2]);
        break;

      case 'create':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and title are required for create`);
        }
        await createMR(positional[1], positional[2], {
          source: flags.source as string,
          target: flags.target as string,
          description: flags.description as string | undefined,
          labels: flags.labels as string | undefined,
          draft: flags.draft === true,
        });
        break;

      case 'update':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for update`);
        }
        await updateMR(positional[1], positional[2], {
          title: flags.title as string | undefined,
          description: flags.description as string | undefined,
          labels: flags.labels as string | undefined,
          draft: flags.draft !== undefined ? flags.draft === true || flags.draft === 'true' : undefined,
          target: flags.target as string | undefined,
        });
        break;

      case 'merge':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for merge`);
        }
        await mergeMR(positional[1], positional[2], {
          squash: flags.squash === true,
          deleteSource: flags['delete-source'] === true,
          message: flags.message as string | undefined,
        });
        break;

      case 'approve':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for approve`);
        }
        await approveMR(positional[1], positional[2]);
        break;

      case 'close':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for close`);
        }
        await closeMR(positional[1], positional[2]);
        break;

      case 'reopen':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for reopen`);
        }
        await reopenMR(positional[1], positional[2]);
        break;

      case 'changes':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for changes`);
        }
        await getMRChanges(positional[1], positional[2]);
        break;

      case 'comment':
        if (!positional[1] || !positional[2] || !positional[3]) {
          outputError(`${USAGE}\n\nError: project, mr_iid, and body are required for comment`);
        }
        await addComment(positional[1], positional[2], positional[3]);
        break;

      case 'comments':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and mr_iid are required for comments`);
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
