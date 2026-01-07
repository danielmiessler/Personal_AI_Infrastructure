#!/usr/bin/env bun
/**
 * GitLab Files Tool
 * Manage repository files and directory trees
 *
 * Usage:
 *   bun run Files.ts tree <project> [--path "dir"] [--ref "branch"] [--recursive]
 *   bun run Files.ts get <project> <file_path> [--ref "branch"]
 *   bun run Files.ts create <project> <file_path> --content "..." --message "commit msg" [--branch "branch"]
 *   bun run Files.ts update <project> <file_path> --content "..." --message "commit msg" [--branch "branch"]
 *   bun run Files.ts delete <project> <file_path> --message "commit msg" [--branch "branch"]
 *   bun run Files.ts blame <project> <file_path> [--ref "branch"]
 */

import {
  gitlabFetch,
  gitlabFetchPaginated,
  encodeProjectPath,
  GitLabFile,
  GitLabTreeItem,
  outputJson,
  outputError,
  parseArgs,
} from './Client.ts';

const USAGE = `Usage:
  bun run Files.ts tree <project> [--path "dir"] [--ref "branch"] [--recursive]
  bun run Files.ts get <project> <file_path> [--ref "branch"]
  bun run Files.ts create <project> <file_path> --content "..." --message "commit msg" [--branch "branch"]
  bun run Files.ts update <project> <file_path> --content "..." --message "commit msg" [--branch "branch"]
  bun run Files.ts delete <project> <file_path> --message "commit msg" [--branch "branch"]
  bun run Files.ts blame <project> <file_path> [--ref "branch"]

Arguments:
  <project>      Project ID (number) or path (group/project)
  <file_path>    Path to file in repository`;

interface BlameRange {
  commit: {
    id: string;
    message: string;
    authored_date: string;
    author_name: string;
  };
  lines: string[];
}

/**
 * List repository tree
 */
async function listTree(
  project: string,
  options: {
    path?: string;
    ref?: string;
    recursive?: boolean;
  }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const params: Record<string, string | number | boolean | undefined> = {};

  if (options.path) params.path = options.path;
  if (options.ref) params.ref = options.ref;
  if (options.recursive) params.recursive = true;

  const items = await gitlabFetchPaginated<GitLabTreeItem>(
    `/projects/${encoded}/repository/tree`,
    { params }
  );

  // Sort: directories first, then alphabetically
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  outputJson({
    project,
    path: options.path || '/',
    ref: options.ref || 'default',
    total: items.length,
    items: items.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type,
      mode: item.mode,
    })),
  });
}

/**
 * Get file content
 */
async function getFile(
  project: string,
  filePath: string,
  options: { ref?: string }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const encodedPath = encodeURIComponent(filePath);
  const params: Record<string, string | undefined> = {};

  if (options.ref) params.ref = options.ref;

  const file = await gitlabFetch<GitLabFile>(
    `/projects/${encoded}/repository/files/${encodedPath}`,
    { params }
  );

  // Decode content from base64
  const content = file.content
    ? Buffer.from(file.content, 'base64').toString('utf-8')
    : '';

  outputJson({
    project,
    file_path: file.file_path,
    file_name: file.file_name,
    size: file.size,
    ref: file.ref,
    commit_id: file.commit_id,
    last_commit_id: file.last_commit_id,
    content,
  });
}

/**
 * Create a new file
 */
async function createFile(
  project: string,
  filePath: string,
  options: {
    content: string;
    message: string;
    branch?: string;
  }
): Promise<void> {
  if (!options.content) {
    outputError('--content is required for create');
  }
  if (!options.message) {
    outputError('--message is required for create');
  }

  const encoded = encodeProjectPath(project);
  const encodedPath = encodeURIComponent(filePath);

  const body: Record<string, unknown> = {
    branch: options.branch || 'main',
    content: options.content,
    commit_message: options.message,
  };

  await gitlabFetch(`/projects/${encoded}/repository/files/${encodedPath}`, {
    method: 'POST',
    body,
  });

  outputJson({
    success: true,
    message: `Created file '${filePath}'`,
    project,
    file_path: filePath,
    branch: options.branch || 'main',
    commit_message: options.message,
  });
}

/**
 * Update an existing file
 */
async function updateFile(
  project: string,
  filePath: string,
  options: {
    content: string;
    message: string;
    branch?: string;
  }
): Promise<void> {
  if (!options.content) {
    outputError('--content is required for update');
  }
  if (!options.message) {
    outputError('--message is required for update');
  }

  const encoded = encodeProjectPath(project);
  const encodedPath = encodeURIComponent(filePath);

  const body: Record<string, unknown> = {
    branch: options.branch || 'main',
    content: options.content,
    commit_message: options.message,
  };

  await gitlabFetch(`/projects/${encoded}/repository/files/${encodedPath}`, {
    method: 'PUT',
    body,
  });

  outputJson({
    success: true,
    message: `Updated file '${filePath}'`,
    project,
    file_path: filePath,
    branch: options.branch || 'main',
    commit_message: options.message,
  });
}

/**
 * Delete a file
 */
async function deleteFile(
  project: string,
  filePath: string,
  options: {
    message: string;
    branch?: string;
  }
): Promise<void> {
  if (!options.message) {
    outputError('--message is required for delete');
  }

  const encoded = encodeProjectPath(project);
  const encodedPath = encodeURIComponent(filePath);

  const body: Record<string, unknown> = {
    branch: options.branch || 'main',
    commit_message: options.message,
  };

  await gitlabFetch(`/projects/${encoded}/repository/files/${encodedPath}`, {
    method: 'DELETE',
    body,
  });

  outputJson({
    success: true,
    message: `Deleted file '${filePath}'`,
    project,
    file_path: filePath,
    branch: options.branch || 'main',
    commit_message: options.message,
  });
}

/**
 * Get file blame information
 */
async function blameFile(
  project: string,
  filePath: string,
  options: { ref?: string }
): Promise<void> {
  const encoded = encodeProjectPath(project);
  const encodedPath = encodeURIComponent(filePath);
  const params: Record<string, string | undefined> = {};

  if (options.ref) params.ref = options.ref;

  const blame = await gitlabFetch<BlameRange[]>(
    `/projects/${encoded}/repository/files/${encodedPath}/blame`,
    { params }
  );

  outputJson({
    project,
    file_path: filePath,
    ref: options.ref || 'default',
    blame: blame.map((range) => ({
      commit: {
        id: range.commit.id.substring(0, 8),
        message: range.commit.message.split('\n')[0],
        author: range.commit.author_name,
        date: range.commit.authored_date,
      },
      lines: range.lines.length,
    })),
  });
}

async function main() {
  const args = process.argv.slice(2);
  const { positional, flags } = parseArgs(args);
  const command = positional[0];

  try {
    switch (command) {
      case 'tree':
        if (!positional[1]) {
          outputError(`${USAGE}\n\nError: project is required for tree`);
        }
        await listTree(positional[1], {
          path: flags.path as string | undefined,
          ref: flags.ref as string | undefined,
          recursive: flags.recursive === true,
        });
        break;

      case 'get':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and file_path are required for get`);
        }
        await getFile(positional[1], positional[2], {
          ref: flags.ref as string | undefined,
        });
        break;

      case 'create':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and file_path are required for create`);
        }
        await createFile(positional[1], positional[2], {
          content: flags.content as string,
          message: flags.message as string,
          branch: flags.branch as string | undefined,
        });
        break;

      case 'update':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and file_path are required for update`);
        }
        await updateFile(positional[1], positional[2], {
          content: flags.content as string,
          message: flags.message as string,
          branch: flags.branch as string | undefined,
        });
        break;

      case 'delete':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and file_path are required for delete`);
        }
        await deleteFile(positional[1], positional[2], {
          message: flags.message as string,
          branch: flags.branch as string | undefined,
        });
        break;

      case 'blame':
        if (!positional[1] || !positional[2]) {
          outputError(`${USAGE}\n\nError: project and file_path are required for blame`);
        }
        await blameFile(positional[1], positional[2], {
          ref: flags.ref as string | undefined,
        });
        break;

      default:
        outputError(USAGE);
    }
  } catch (error) {
    outputError(error);
  }
}

main();
