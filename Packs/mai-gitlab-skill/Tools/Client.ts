#!/usr/bin/env bun
/**
 * GitLab API Client
 * Shared client for all GitLab TypeScript tools
 *
 * Authentication:
 *   1. macOS Keychain: security find-generic-password -s "gitlab-token" -a "claude-code" -w
 *   2. Environment: GITLAB_TOKEN
 *
 * Base URL:
 *   GITLAB_URL env var or https://gitlab.com/api/v4
 *
 * Setup:
 *   security add-generic-password -s "gitlab-token" -a "claude-code" -w "<your-token>"
 */

import { $ } from 'bun';

const KEYCHAIN_SERVICE = 'gitlab-token';
const KEYCHAIN_ACCOUNT = 'claude-code';
const DEFAULT_BASE_URL = 'https://gitlab.com/api/v4';

/**
 * Custom error class for GitLab API errors
 */
export class GitLabError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public responseBody?: string
  ) {
    super(`GitLab API Error (${statusCode}): ${statusText}${responseBody ? ` - ${responseBody}` : ''}`);
    this.name = 'GitLabError';
  }
}

/**
 * Retrieve GitLab API token from macOS Keychain or environment
 * @throws Error if token cannot be retrieved
 */
export async function getToken(): Promise<string> {
  // Try Keychain first
  try {
    const result = await $`security find-generic-password -s ${KEYCHAIN_SERVICE} -a ${KEYCHAIN_ACCOUNT} -w`.quiet();
    const token = result.stdout.toString().trim();
    if (token) return token;
  } catch {
    // Keychain not available or token not found
  }

  // Fall back to env var
  const token = process.env.GITLAB_TOKEN;
  if (!token) {
    throw new Error(
      'GitLab token not found. Set up with:\n' +
      `  Keychain: security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w "<token>"\n` +
      '  Or env: export GITLAB_TOKEN=<token>'
    );
  }
  return token;
}

/**
 * Get the GitLab API base URL
 */
export function getBaseUrl(): string {
  return process.env.GITLAB_URL || DEFAULT_BASE_URL;
}

/**
 * Encode a project path for use in URLs
 * Handles both numeric IDs and path strings (group/project -> group%2Fproject)
 */
export function encodeProjectPath(project: string): string {
  // If it's a numeric ID, return as-is
  if (/^\d+$/.test(project)) return project;
  // Otherwise URL-encode the path
  return encodeURIComponent(project);
}

/**
 * Options for gitlabFetch calls
 */
export interface GitLabFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const baseUrl = getBaseUrl();
  const url = new URL(endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`);

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
 * Make a request to the GitLab REST API
 * @param endpoint - API endpoint (e.g., '/projects', '/projects/123/issues')
 * @param options - Request options
 * @returns Parsed JSON response
 * @throws GitLabError on API errors
 */
export async function gitlabFetch<T = unknown>(
  endpoint: string,
  options: GitLabFetchOptions = {}
): Promise<T> {
  const { method = 'GET', body, params, timeout = 30000 } = options;

  const token = await getToken();
  const url = buildUrl(endpoint, params);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'PRIVATE-TOKEN': token,
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    fetchOptions.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      const responseBody = await response.text();
      throw new GitLabError(response.status, response.statusText, responseBody);
    }

    // Handle empty responses (e.g., DELETE)
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof GitLabError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`GitLab API request timed out after ${timeout}ms`);
      }
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error(`Cannot connect to GitLab at ${getBaseUrl()}. Check your network or GITLAB_URL.`);
      }
    }

    throw error;
  }
}

/**
 * Paginated API request - fetches all pages or up to a limit
 * @param endpoint - API endpoint (e.g., '/projects', '/issues')
 * @param options - Request options (params will be merged with pagination)
 * @param maxItems - Maximum items to fetch (default: all)
 * @returns All items from all pages (up to maxItems)
 */
export async function gitlabFetchPaginated<T = unknown>(
  endpoint: string,
  options: GitLabFetchOptions = {},
  maxItems?: number
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  const perPage = 100; // Max items per page
  let hasMore = true;

  while (hasMore) {
    const params = {
      ...options.params,
      page,
      per_page: perPage,
    };

    const response = await gitlabFetch<T[]>(endpoint, {
      ...options,
      params,
    });

    if (Array.isArray(response)) {
      allItems.push(...response);
      hasMore = response.length === perPage;
      page++;

      // Check if we've reached the max
      if (maxItems && allItems.length >= maxItems) {
        return allItems.slice(0, maxItems);
      }
    } else {
      break;
    }
  }

  return allItems;
}

/**
 * Output result as JSON to stdout
 */
export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error as JSON to stdout and exit
 */
export function outputError(error: unknown, exitCode = 1): never {
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify({ error: message }));
  process.exit(exitCode);
}

/**
 * Parse command line arguments
 */
export function parseArgs(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

// GitLab API types
export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email?: string;
  avatar_url: string;
  web_url: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  description: string | null;
  default_branch: string;
  visibility: 'private' | 'internal' | 'public';
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  created_at: string;
  last_activity_at: string;
  archived: boolean;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
    full_path: string;
  };
}

export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    authored_date: string;
  };
  merged: boolean;
  protected: boolean;
  default: boolean;
  web_url: string;
}

export interface GitLabIssue {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: 'opened' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: string[];
  milestone: { id: number; title: string } | null;
  assignees: GitLabUser[];
  author: GitLabUser;
  web_url: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: 'opened' | 'closed' | 'merged' | 'locked';
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  source_branch: string;
  target_branch: string;
  labels: string[];
  milestone: { id: number; title: string } | null;
  assignees: GitLabUser[];
  author: GitLabUser;
  draft: boolean;
  web_url: string;
  merge_status: string;
}

export interface GitLabPipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: 'created' | 'waiting_for_resource' | 'preparing' | 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'skipped' | 'manual' | 'scheduled';
  source: string;
  created_at: string;
  updated_at: string;
  web_url: string;
}

export interface GitLabJob {
  id: number;
  name: string;
  stage: string;
  status: string;
  ref: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  web_url: string;
  pipeline: { id: number; ref: string; sha: string };
}

export interface GitLabVariable {
  key: string;
  value: string;
  variable_type: 'env_var' | 'file';
  protected: boolean;
  masked: boolean;
  environment_scope: string;
}

export interface GitLabSchedule {
  id: number;
  description: string;
  ref: string;
  cron: string;
  cron_timezone: string;
  next_run_at: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  owner: GitLabUser;
}

export interface GitLabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
  content?: string;
}

export interface GitLabTreeItem {
  id: string;
  name: string;
  type: 'tree' | 'blob';
  path: string;
  mode: string;
}

// CLI
async function main() {
  const [command] = process.argv.slice(2);

  if (command === 'ping' || !command) {
    try {
      const user = await gitlabFetch<GitLabUser>('/user');
      outputJson({
        success: true,
        message: `Connected to GitLab as ${user.name} (@${user.username})`,
        baseUrl: getBaseUrl(),
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          web_url: user.web_url,
        },
      });
    } catch (error) {
      outputError(error);
    }
  } else {
    console.log(`
GitLab API Client

Usage:
  bun run Tools/Client.ts ping    Test connection

Setup:
  # Option 1: macOS Keychain (recommended)
  security add-generic-password -s "gitlab-token" -a "claude-code" -w "<your-token>"

  # Option 2: Environment variable
  export GITLAB_TOKEN=<your-token>

  # Optional: Self-hosted GitLab
  export GITLAB_URL=https://gitlab.example.com/api/v4
`);
  }
}

main();
