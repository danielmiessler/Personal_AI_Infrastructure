#!/usr/bin/env bun
/**
 * GitLab Repositories Tool
 * Manage GitLab projects/repositories
 *
 * Usage:
 *   bun run Repositories.ts list [--owned] [--membership] [--search "query"] [--limit <num>]
 *   bun run Repositories.ts get <project>
 *   bun run Repositories.ts create "name" [--namespace <id>] [--description "desc"] [--visibility private|internal|public]
 *   bun run Repositories.ts delete <project>
 *   bun run Repositories.ts fork <project> [--namespace <id>] [--name "new-name"]
 *   bun run Repositories.ts archive <project>
 *   bun run Repositories.ts unarchive <project>
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabProject,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Repositories.ts list [--owned] [--membership] [--search "query"] [--limit <num>]
  bun run Repositories.ts get <project>
  bun run Repositories.ts create "name" [--namespace <id>] [--description "desc"] [--visibility private|internal|public]
  bun run Repositories.ts delete <project>
  bun run Repositories.ts fork <project> [--namespace <id>] [--name "new-name"]
  bun run Repositories.ts archive <project>
  bun run Repositories.ts unarchive <project>

Arguments:
  <project>    Project ID (number) or path (group/project)`;

/**
 * List projects
 */
async function listProjects(options: {
  owned?: boolean;
  membership?: boolean;
  search?: string;
  limit?: number;
}): Promise<void> {
  const params: Record<string, string | number | boolean | undefined> = {
    order_by: 'last_activity_at',
    sort: 'desc',
  };

  if (options.owned) params.owned = true;
  if (options.membership) params.membership = true;
  if (options.search) params.search = options.search;

  const projects = await gitlabFetchPaginated<GitLabProject>(
    '/projects',
    { params },
    options.limit || 20
  );

  outputJson({
    total: projects.length,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      path_with_namespace: p.path_with_namespace,
      description: p.description,
      visibility: p.visibility,
      default_branch: p.default_branch,
      web_url: p.web_url,
      last_activity_at: p.last_activity_at,
      archived: p.archived,
    })),
  });
}

/**
 * Get a single project
 */
async function getProject(project: string): Promise<void> {
  const encoded = encodeProjectPath(project);
  const p = await gitlabFetch<GitLabProject>(`/projects/${encoded}`);

  outputJson({
    id: p.id,
    name: p.name,
    name_with_namespace: p.name_with_namespace,
    path: p.path,
    path_with_namespace: p.path_with_namespace,
    description: p.description,
    visibility: p.visibility,
    default_branch: p.default_branch,
    web_url: p.web_url,
    ssh_url_to_repo: p.ssh_url_to_repo,
    http_url_to_repo: p.http_url_to_repo,
    created_at: p.created_at,
    last_activity_at: p.last_activity_at,
    archived: p.archived,
    namespace: p.namespace,
  });
}

/**
 * Create a new project
 */
async function createProject(
  name: string,
  options: {
    namespace?: string;
    description?: string;
    visibility?: string;
  }
): Promise<void> {
  const body: Record<string, unknown> = { name };

  if (options.namespace) body.namespace_id = parseInt(options.namespace, 10);
  if (options.description) body.description = options.description;
  if (options.visibility) body.visibility = options.visibility;

  const p = await gitlabFetch<GitLabProject>('/projects', {
    method: 'POST',
    body,
  });

  outputJson({
    success: true,
    message: `Created project '${p.name}'`,
    id: p.id,
    path_with_namespace: p.path_with_namespace,
    web_url: p.web_url,
    ssh_url_to_repo: p.ssh_url_to_repo,
    http_url_to_repo: p.http_url_to_repo,
  });
}

/**
 * Delete a project
 */
async function deleteProject(project: string): Promise<void> {
  const encoded = encodeProjectPath(project);

  // Get project info first
  const p = await gitlabFetch<GitLabProject>(`/projects/${encoded}`);

  await gitlabFetch(`/projects/${encoded}`, { method: 'DELETE' });

  outputJson({
    success: true,
    message: `Deleted project '${p.path_with_namespace}'`,
    id: p.id,
    path_with_namespace: p.path_with_namespace,
  });
}

/**
 * Fork a project
 */
async function forkProject(
  project: string,
  options: {
    namespace?: string;
    name?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const body: Record<string, unknown> = {};

  if (options.namespace) body.namespace_id = parseInt(options.namespace, 10);
  if (options.name) body.name = options.name;

  const p = await gitlabFetch<GitLabProject>(`/projects/${encoded}/fork`, {
    method: 'POST',
    body: Object.keys(body).length > 0 ? body : undefined,
  });

  outputJson({
    success: true,
    message: `Forked project to '${p.path_with_namespace}'`,
    id: p.id,
    path_with_namespace: p.path_with_namespace,
    web_url: p.web_url,
  });
}

/**
 * Archive a project
 */
async function archiveProject(project: string): Promise<void> {
  const encoded = encodeProjectPath(project);
  const p = await gitlabFetch<GitLabProject>(`/projects/${encoded}/archive`, {
    method: 'POST',
  });

  outputJson({
    success: true,
    message: `Archived project '${p.path_with_namespace}'`,
    id: p.id,
    path_with_namespace: p.path_with_namespace,
    archived: p.archived,
  });
}

/**
 * Unarchive a project
 */
async function unarchiveProject(project: string): Promise<void> {
  const encoded = encodeProjectPath(project);
  const p = await gitlabFetch<GitLabProject>(`/projects/${encoded}/unarchive`, {
    method: 'POST',
  });

  outputJson({
    success: true,
    message: `Unarchived project '${p.path_with_namespace}'`,
    id: p.id,
    path_with_namespace: p.path_with_namespace,
    archived: p.archived,
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'list':
        await listProjects({
          owned: flags.owned === true,
          membership: flags.membership === true,
          search: flags.search as string | undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        break;

      case 'get':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for get`);
        }
        await getProject(positional[1]);
        break;

      case 'create':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: name is required for create`);
        }
        await createProject(positional[1], {
          namespace: flags.namespace as string | undefined,
          description: flags.description as string | undefined,
          visibility: flags.visibility as string | undefined,
        });
        break;

      case 'delete':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for delete`);
        }
        await deleteProject(positional[1]);
        break;

      case 'fork':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for fork`);
        }
        await forkProject(positional[1], {
          namespace: flags.namespace as string | undefined,
          name: flags.name as string | undefined,
        });
        break;

      case 'archive':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for archive`);
        }
        await archiveProject(positional[1]);
        break;

      case 'unarchive':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for unarchive`);
        }
        await unarchiveProject(positional[1]);
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
