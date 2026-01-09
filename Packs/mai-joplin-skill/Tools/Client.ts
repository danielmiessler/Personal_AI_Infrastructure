/**
 * Joplin REST API Client
 * Shared client for all Joplin TypeScript tools
 *
 * Authentication: macOS Keychain
 *   Service: joplin-token
 *   Account: claude-code
 *
 * Setup:
 *   security add-generic-password -s "joplin-token" -a "claude-code" -w "<your-token>"
 *
 * Usage:
 *   import { joplinApi, JoplinError } from './Client.ts';
 *   const notebooks = await joplinApi('/folders');
 */

import { $ } from 'bun';

const JOPLIN_BASE_URL = 'http://localhost:41184';
const KEYCHAIN_SERVICE = 'joplin-token';
const KEYCHAIN_ACCOUNT = 'claude-code';

/**
 * Custom error class for Joplin API errors
 */
export class JoplinError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public responseBody?: string
  ) {
    super(`Joplin API Error (${statusCode}): ${statusText}${responseBody ? ` - ${responseBody}` : ''}`);
    this.name = 'JoplinError';
  }
}

/**
 * Retrieve Joplin API token from macOS Keychain
 * @throws Error if token cannot be retrieved
 */
export async function getToken(): Promise<string> {
  try {
    const result = await $`security find-generic-password -s ${KEYCHAIN_SERVICE} -a ${KEYCHAIN_ACCOUNT} -w`.text();
    const token = result.trim();
    if (!token) {
      throw new Error('Empty token retrieved from keychain');
    }
    return token;
  } catch (error) {
    throw new Error(`Failed to retrieve Joplin API token from keychain. Ensure token is stored with: security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w "<token>"`);
  }
}

/**
 * Build URL with token and optional query parameters
 */
function buildUrl(endpoint: string, token: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(`${JOPLIN_BASE_URL}${endpoint}`);
  url.searchParams.set('token', token);
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
 * Options for joplinApi calls
 */
export interface JoplinApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

/**
 * Make a request to the Joplin REST API
 * @param endpoint - API endpoint (e.g., '/folders', '/notes/abc123')
 * @param options - Request options
 * @returns Parsed JSON response
 * @throws JoplinError on API errors
 */
export async function joplinApi<T = unknown>(
  endpoint: string,
  options: JoplinApiOptions = {}
): Promise<T> {
  const { method = 'GET', body, params, timeout = 30000 } = options;

  const token = await getToken();
  const url = buildUrl(endpoint, token, params);

  const fetchOptions: RequestInit = {
    method,
    headers: {
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
      throw new JoplinError(response.status, response.statusText, responseBody);
    }

    // Some endpoints return empty responses (e.g., DELETE)
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof JoplinError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Joplin API request timed out after ${timeout}ms`);
      }
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Joplin not running at localhost:41184. Please start Joplin Desktop and enable the Web Clipper service.');
      }
    }

    throw error;
  }
}

/**
 * Paginated API request - fetches all pages
 * @param endpoint - API endpoint (e.g., '/folders', '/notes')
 * @param options - Request options (params will be merged with pagination)
 * @returns All items from all pages
 */
export async function joplinApiPaginated<T = unknown>(
  endpoint: string,
  options: JoplinApiOptions = {}
): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  const limit = 100; // Max items per page
  let hasMore = true;

  while (hasMore) {
    const params = {
      ...options.params,
      page,
      limit,
    };

    const response = await joplinApi<{ items: T[]; has_more: boolean }>(endpoint, {
      ...options,
      params,
    });

    if (response.items) {
      allItems.push(...response.items);
      hasMore = response.has_more;
      page++;
    } else {
      // Some endpoints return array directly
      if (Array.isArray(response)) {
        return response as T[];
      }
      break;
    }
  }

  return allItems;
}

/**
 * Make a raw text request to the Joplin REST API (for endpoints that don't return JSON)
 * @param endpoint - API endpoint (e.g., '/ping')
 * @returns Raw text response
 */
export async function joplinApiRaw(endpoint: string, timeout = 30000): Promise<string> {
  const token = await getToken();
  const url = buildUrl(endpoint, token);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const responseBody = await response.text();
      throw new JoplinError(response.status, response.statusText, responseBody);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof JoplinError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Joplin API request timed out after ${timeout}ms`);
      }
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Joplin not running at localhost:41184. Please start Joplin Desktop and enable the Web Clipper service.');
      }
    }

    throw error;
  }
}

/**
 * Check if Joplin is running and accessible
 * @returns true if Joplin is accessible
 */
export async function pingJoplin(): Promise<boolean> {
  try {
    await joplinApiRaw('/ping');
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a 32-character hex ID
 */
export function isValidId(id: string): boolean {
  return /^[a-f0-9]{32}$/i.test(id);
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

// Joplin API types
export interface JoplinNote {
  id: string;
  parent_id: string;
  title: string;
  body?: string;
  created_time: number;
  updated_time: number;
  is_todo: number;
  todo_completed: number;
  source_url?: string;
  markup_language?: number;
}

export interface JoplinNotebook {
  id: string;
  title: string;
  parent_id: string;
  created_time: number;
  updated_time: number;
  note_count?: number;
}

export interface JoplinTag {
  id: string;
  title: string;
  created_time: number;
  updated_time: number;
  parent_id?: string;
}

export interface JoplinSearchResult {
  id: string;
  parent_id: string;
  title: string;
  body?: string;
  created_time: number;
  updated_time: number;
  is_todo: number;
  todo_completed: number;
}
