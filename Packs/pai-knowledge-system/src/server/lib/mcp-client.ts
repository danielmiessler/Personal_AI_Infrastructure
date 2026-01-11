/**
 * MCP Client Library
 *
 * HTTP client for communicating with the Graphiti MCP server.
 * Handles JSON-RPC 2.0 requests for all MCP tools.
 */

import { sanitizeGroupIds, sanitizeGroupId, sanitizeSearchQuery } from "./lucene.js";

/**
 * MCP tool names (Graphiti MCP server)
 *
 * Note: The Graphiti MCP server uses a hybrid naming convention:
 * - Memory-prefixed: add_memory, search_memory_nodes, search_memory_facts
 * - Episode-based: get_episodes, delete_episode
 * - Entity-based: delete_entity_edge, get_entity_edge
 *
 * TypeScript methods use Graphiti-native terminology (Episode, Node, Fact)
 * while calling the actual MCP tool names.
 */
export const MCP_TOOLS = {
  // Knowledge capture (adds an "episode" to memory)
  ADD_EPISODE: "add_memory",
  // Entity search (searches "nodes" in memory)
  SEARCH_NODES: "search_memory_nodes",
  // Relationship search (searches "facts" in memory)
  SEARCH_FACTS: "search_memory_facts",
  // Episode retrieval
  GET_EPISODES: "get_episodes",
  // System operations
  GET_STATUS: "get_status",
  CLEAR_GRAPH: "clear_graph",
  DELETE_EPISODE: "delete_episode",
  DELETE_ENTITY_EDGE: "delete_entity_edge",
  GET_ENTITY_EDGE: "get_entity_edge",
} as const;

/**
 * MCP tool parameters
 */
export interface AddEpisodeParams {
  name: string;
  episode_body: string;
  source?: string;
  reference_timestamp?: string;
  source_description?: string;
}

export interface SearchNodesParams {
  query: string;
  limit?: number;
  group_ids?: string[];
  /** Filter by entity type (e.g., "Preference", "Procedure", "Learning", "Research", "Decision") */
  entity?: string;
}

export interface SearchFactsParams {
  query: string;
  limit?: number;
  group_ids?: string[];
  max_facts?: number;
  /** Filter by entity type (e.g., "Preference", "Procedure", "Learning", "Research", "Decision") */
  entity?: string;
}

export interface GetEpisodesParams {
  limit?: number;
  group_id?: string;
}

export interface GetStatusParams {
  // No parameters
}

export interface ClearGraphParams {
  // No parameters
}

export interface DeleteEpisodeParams {
  uuid: string;
}

export interface DeleteEntityEdgeParams {
  uuid: string;
}

export interface GetEntityEdgeParams {
  uuid: string;
}

/**
 * JSON-RPC 2.0 request
 */
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/**
 * JSON-RPC 2.0 response
 */
export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP client response
 */
export interface MCPClientResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

/**
 * MCP Client configuration
 */
export interface MCPClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Default MCP server URL
 */
const DEFAULT_BASE_URL = "http://localhost:8000/mcp/";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Simple LRU Cache for search results
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = 100, ttlMs: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Extended MCP Client configuration with caching options
 */
export interface MCPClientConfigExtended extends MCPClientConfig {
  enableCache?: boolean;
  cacheMaxSize?: number;
  cacheTtlMs?: number;
}

/**
 * MCP Client class with optional response caching
 */
export class MCPClient {
  private baseURL: string;
  private timeout: number;
  private headers: Record<string, string>;
  private requestId: number;
  private cache: LRUCache<unknown> | null;

  constructor(config: MCPClientConfigExtended = {}) {
    this.baseURL = config.baseURL || DEFAULT_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };
    this.requestId = 1;

    // Initialize cache if enabled (default: enabled for search operations)
    if (config.enableCache !== false) {
      this.cache = new LRUCache<unknown>(
        config.cacheMaxSize || 100,
        config.cacheTtlMs || 5 * 60 * 1000 // 5 minutes default
      );
    } else {
      this.cache = null;
    }
  }

  /**
   * Generate cache key for a tool call
   */
  private getCacheKey(toolName: string, args: Record<string, unknown>): string {
    return `${toolName}:${JSON.stringify(args)}`;
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { enabled: boolean; size: number } {
    return {
      enabled: this.cache !== null,
      size: this.cache?.size() || 0,
    };
  }

  /**
   * Call an MCP tool
   */
  async callTool<T = unknown>(
    toolName: string,
    arguments_: Record<string, unknown>
  ): Promise<MCPClientResponse<T>> {
    const request: JSONRPCRequest = {
      jsonrpc: "2.0",
      id: this.requestId++,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: arguments_,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          code: response.status,
        };
      }

      const data: JSONRPCResponse = await response.json();

      if (data.error) {
        return {
          success: false,
          error: data.error.message,
          code: data.error.code,
        };
      }

      return {
        success: true,
        data: data.result as T,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            success: false,
            error: `Request timeout after ${this.timeout}ms`,
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "Unknown error occurred",
      };
    }
  }

  /**
   * Add an episode to the knowledge graph
   */
  async addEpisode(params: AddEpisodeParams): Promise<MCPClientResponse<{ uuid: string }>> {
    return await this.callTool<{ uuid: string }>(MCP_TOOLS.ADD_EPISODE, params);
  }

  /**
   * Search for nodes (entities) in the knowledge graph
   * Results are cached for repeated queries
   */
  async searchNodes(params: SearchNodesParams): Promise<MCPClientResponse<unknown[]>> {
    // Sanitize query and group_ids to avoid RediSearch/Lucene syntax errors
    const sanitizedParams: SearchNodesParams = {
      ...params,
      query: sanitizeSearchQuery(params.query),
      group_ids: sanitizeGroupIds(params.group_ids),
    };

    // Check cache first
    if (this.cache) {
      const cacheKey = this.getCacheKey(MCP_TOOLS.SEARCH_NODES, sanitizedParams as Record<string, unknown>);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached as unknown[] };
      }

      // Fetch and cache
      const result = await this.callTool<unknown[]>(MCP_TOOLS.SEARCH_NODES, sanitizedParams);
      if (result.success && result.data) {
        this.cache.set(cacheKey, result.data);
      }
      return result;
    }

    return await this.callTool<unknown[]>(MCP_TOOLS.SEARCH_NODES, sanitizedParams);
  }

  /**
   * Search for facts (relationships) in the knowledge graph
   * Results are cached for repeated queries
   */
  async searchFacts(params: SearchFactsParams): Promise<MCPClientResponse<unknown[]>> {
    // Sanitize query and group_ids to avoid RediSearch/Lucene syntax errors
    const sanitizedParams: SearchFactsParams = {
      ...params,
      query: sanitizeSearchQuery(params.query),
      group_ids: sanitizeGroupIds(params.group_ids),
    };

    // Check cache first
    if (this.cache) {
      const cacheKey = this.getCacheKey(MCP_TOOLS.SEARCH_FACTS, sanitizedParams as Record<string, unknown>);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached as unknown[] };
      }

      // Fetch and cache
      const result = await this.callTool<unknown[]>(MCP_TOOLS.SEARCH_FACTS, sanitizedParams);
      if (result.success && result.data) {
        this.cache.set(cacheKey, result.data);
      }
      return result;
    }

    return await this.callTool<unknown[]>(MCP_TOOLS.SEARCH_FACTS, sanitizedParams);
  }

  /**
   * Get recent episodes from the knowledge graph
   */
  async getEpisodes(params: GetEpisodesParams = {}): Promise<MCPClientResponse<unknown[]>> {
    // Sanitize group_id to avoid RediSearch/Lucene syntax errors
    const sanitizedParams: GetEpisodesParams = {
      ...params,
      group_id: sanitizeGroupId(params.group_id),
    };
    return await this.callTool<unknown[]>(MCP_TOOLS.GET_EPISODES, sanitizedParams);
  }

  /**
   * Get the status of the knowledge graph
   */
  async getStatus(): Promise<
    MCPClientResponse<{
      entity_count: number;
      episode_count: number;
      last_updated: string;
    }>
  > {
    return await this.callTool<{
      entity_count: number;
      episode_count: number;
      last_updated: string;
    }>(MCP_TOOLS.GET_STATUS, {});
  }

  /**
   * Clear all data from the knowledge graph
   */
  async clearGraph(): Promise<MCPClientResponse<{ success: boolean }>> {
    return await this.callTool<{ success: boolean }>(MCP_TOOLS.CLEAR_GRAPH, {});
  }

  /**
   * Delete an episode from the knowledge graph
   */
  async deleteEpisode(params: DeleteEpisodeParams): Promise<MCPClientResponse<{ success: boolean }>> {
    return await this.callTool<{ success: boolean }>(MCP_TOOLS.DELETE_EPISODE, params);
  }

  /**
   * Delete an entity edge from the knowledge graph
   */
  async deleteEntityEdge(params: DeleteEntityEdgeParams): Promise<MCPClientResponse<{ success: boolean }>> {
    return await this.callTool<{ success: boolean }>(MCP_TOOLS.DELETE_ENTITY_EDGE, params);
  }

  /**
   * Get an entity edge from the knowledge graph
   */
  async getEntityEdge(params: GetEntityEdgeParams): Promise<MCPClientResponse<unknown>> {
    return await this.callTool<unknown>(MCP_TOOLS.GET_ENTITY_EDGE, params);
  }

  /**
   * Test the connection to the MCP server
   */
  async testConnection(): Promise<MCPClientResponse<{ status: string }>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

      const response = await fetch(`${this.baseURL.replace("/mcp/", "")}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data as { status: string },
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }
      return {
        success: false,
        error: "Unknown error occurred",
      };
    }
  }
}

/**
 * Create an MCP client instance
 */
export function createMCPClient(config?: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}

/**
 * Quick health check function
 */
export async function checkHealth(baseURL?: string): Promise<boolean> {
  const client = new MCPClient({ baseURL });
  const result = await client.testConnection();
  return result.success;
}
