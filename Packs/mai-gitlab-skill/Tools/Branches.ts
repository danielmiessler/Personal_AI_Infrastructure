#!/usr/bin/env bun
/**
 * GitLab Branches Tool
 * Manage repository branches
 *
 * Usage:
 *   bun run Branches.ts list <project> [--search "pattern"] [--limit <num>]
 *   bun run Branches.ts get <project> <branch>
 *   bun run Branches.ts create <project> <branch> --ref "source-branch-or-sha"
 *   bun run Branches.ts delete <project> <branch>
 *   bun run Branches.ts protect <project> <branch> [--push-level <level>] [--merge-level <level>]
 *   bun run Branches.ts unprotect <project> <branch>
 *   bun run Branches.ts compare <project> --from "branch" --to "branch"
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabBranch,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Branches.ts list <project> [--search "pattern"] [--limit <num>]
  bun run Branches.ts get <project> <branch>
  bun run Branches.ts create <project> <branch> --ref "source-branch-or-sha"
  bun run Branches.ts delete <project> <branch>
  bun run Branches.ts protect <project> <branch> [--push-level <level>] [--merge-level <level>]
  bun run Branches.ts unprotect <project> <branch>
  bun run Branches.ts compare <project> --from "branch" --to "branch"

Arguments:
  <project>    Project ID (number) or path (group/project)
  <branch>     Branch name

Access Levels for protect:
  0  = No access
  30 = Developer
  40 = Maintainer
  60 = Admin`;

interface CompareResult {
  commit: {
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    authored_date: string;
  } | null;
  commits: Array<{
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    authored_date: string;
  }>;
  diffs: Array<{
    old_path: string;
    new_path: string;
    diff: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
  }>;
  compare_timeout: boolean;
  compare_same_ref: boolean;
}

interface ProtectedBranch {
  id: number;
  name: string;
  push_access_levels: Array<{ access_level: number }>;
  merge_access_levels: Array<{ access_level: number }>;
}

/**
 * List branches
 */
async function listBranches(
  project: string,
  options: {
    search?: string;
    limit?: number;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const params: Record<string, string | number | boolean | undefined> = {};

  if (options.search) params.search = options.search;

  const branches = await gitlabFetchPaginated<GitLabBranch>(
    `/projects/${encoded}/repository/branches`,
    { params },
    options.limit || 50
  );

  outputJson({
    project,
    total: branches.length,
    branches: branches.map((b) => ({
      name: b.name,
      default: b.default,
      protected: b.protected,
      merged: b.merged,
      commit: {
        short_id: b.commit.short_id,
        title: b.commit.title,
        author: b.commit.author_name,
        date: b.commit.authored_date,
      },
      web_url: b.web_url,
    })),
  });
}

/**
 * Get a single branch
 */
async function getBranch(project: string, branch: string): Promise<void> {
  const encoded = encodeProjectPath(project);
  const encodedBranch = encodeURIComponent(branch);

  const b = await gitlabFetch<GitLabBranch>(
    `/projects/${encoded}/repository/branches/${encodedBranch}`
  );

  outputJson({
    name: b.name,
    default: b.default,
    protected: b.protected,
    merged: b.merged,
    commit: {
      id: b.commit.id,
      short_id: b.commit.short_id,
      title: b.commit.title,
      author: b.commit.author_name,
      date: b.commit.authored_date,
    },
    web_url: b.web_url,
  });
}

/**
 * Create a new branch
 */
async function createBranch(
  project: string,
  branch: string,
  ref: string
): Promise<void> {
  const encoded = encodeProjectPath(project);

  const b = await gitlabFetch<GitLabBranch>(
    `/projects/${encoded}/repository/branches`,
    {
      method: 'POST',
      body: {
        branch,
        ref,
      },
    }
  );

  outputJson({
    success: true,
    message: `Created branch '${branch}' from '${ref}'`,
    name: b.name,
    commit: {
      short_id: b.commit.short_id,
      title: b.commit.title,
    },
    web_url: b.web_url,
  });
}

/**
 * Delete a branch
 */
async function deleteBranch(project: string, branch: string): Promise<void> {
  const encoded = encodeProjectPath(project);
  const encodedBranch = encodeURIComponent(branch);

  await gitlabFetch(
    `/projects/${encoded}/repository/branches/${encodedBranch}`,
    { method: 'DELETE' }
  );

  outputJson({
    success: true,
    message: `Deleted branch '${branch}'`,
    project,
    branch,
  });
}

/**
 * Protect a branch
 */
async function protectBranch(
  project: string,
  branch: string,
  options: {
    pushLevel?: string;
    mergeLevel?: string;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);

  const body: Record<string, unknown> = {
    name: branch,
  };

  if (options.pushLevel) {
    body.push_access_level = parseInt(options.pushLevel, 10);
  }
  if (options.mergeLevel) {
    body.merge_access_level = parseInt(options.mergeLevel, 10);
  }

  const pb = await gitlabFetch<ProtectedBranch>(
    `/projects/${encoded}/protected_branches`,
    {
      method: 'POST',
      body,
    }
  );

  outputJson({
    success: true,
    message: `Protected branch '${branch}'`,
    name: pb.name,
    push_access_level: pb.push_access_levels[0]?.access_level,
    merge_access_level: pb.merge_access_levels[0]?.access_level,
  });
}

/**
 * Unprotect a branch
 */
async function unprotectBranch(project: string, branch: string): Promise<void> {
  const encoded = encodeProjectPath(project);
  const encodedBranch = encodeURIComponent(branch);

  await gitlabFetch(
    `/projects/${encoded}/protected_branches/${encodedBranch}`,
    { method: 'DELETE' }
  );

  outputJson({
    success: true,
    message: `Unprotected branch '${branch}'`,
    project,
    branch,
  });
}

/**
 * Compare two branches
 */
async function compareBranches(
  project: string,
  from: string,
  to: string
): Promise<void> {
  const encoded = encodeProjectPath(project);

  const result = await gitlabFetch<CompareResult>(
    `/projects/${encoded}/repository/compare`,
    {
      params: { from, to },
    }
  );

  outputJson({
    project,
    from,
    to,
    compare_same_ref: result.compare_same_ref,
    compare_timeout: result.compare_timeout,
    commits: result.commits.map((c) => ({
      short_id: c.short_id,
      title: c.title,
      author: c.author_name,
      date: c.authored_date,
    })),
    diffs: result.diffs.map((d) => ({
      path: d.new_path,
      old_path: d.old_path !== d.new_path ? d.old_path : undefined,
      new_file: d.new_file,
      renamed: d.renamed_file,
      deleted: d.deleted_file,
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
        await listBranches(positional[1], {
          search: flags.search as string | undefined,
          limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
        });
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and branch are required for get`);
        }
        await getBranch(positional[1], positional[2]);
        break;

      case 'create':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and branch are required for create`);
        }
        if (!flags.ref) {
          outputError(`${USAGE}\n\nError: --ref is required for create`);
        }
        await createBranch(positional[1], positional[2], flags.ref as string);
        break;

      case 'delete':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and branch are required for delete`);
        }
        await deleteBranch(positional[1], positional[2]);
        break;

      case 'protect':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and branch are required for protect`);
        }
        await protectBranch(positional[1], positional[2], {
          pushLevel: flags['push-level'] as string | undefined,
          mergeLevel: flags['merge-level'] as string | undefined,
        });
        break;

      case 'unprotect':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and branch are required for unprotect`);
        }
        await unprotectBranch(positional[1], positional[2]);
        break;

      case 'compare':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for compare`);
        }
        if (!flags.from || !flags.to) {
          outputError(`${USAGE}\n\nError: --from and --to are required for compare`);
        }
        await compareBranches(
          positional[1],
          flags.from as string,
          flags.to as string
        );
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
