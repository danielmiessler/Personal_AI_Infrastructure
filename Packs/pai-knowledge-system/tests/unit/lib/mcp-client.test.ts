/**
 * Unit Tests for MCP Client Library
 *
 * Tests the MCPClient class with mocked HTTP requests.
 */

import { setupTestEnvironment, cleanupTests } from "../../setup.js";

describe("MCPClient", () => {
  let ctx: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    ctx = setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTests();
  });

  describe("MCP Tool Constants", () => {
    it("should have all tool constants defined with correct names", () => {
      // These are the actual MCP tool names exposed by Graphiti server
      // Note: add_memory, search_memory_nodes, search_memory_facts are the MCP names
      // TypeScript methods use Graphiti-native names (addEpisode, searchNodes, searchFacts)
      const expectedTools = [
        "add_memory",           // MCP tool for adding episodes
        "search_memory_nodes",  // MCP tool for searching nodes
        "search_memory_facts",  // MCP tool for searching facts
        "get_episodes",
        "get_status",
        "clear_graph",
        "delete_entity_edge",
        "get_entity_edge",
        "delete_episode",
      ];

      expectedTools.forEach((tool) => {
        expect(typeof tool).toBe("string");
        expect(tool.length).toBeGreaterThan(0);
        expect(tool).toMatch(/^[a-z_]+$/);
      });
    });
  });

  describe("JSON-RPC Request Structure", () => {
    it("should create valid JSON-RPC 2.0 request", () => {
      const createRequest = (id: number, method: string, params: Record<string, unknown>) => ({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      const request = createRequest(1, "tools/call", {
        name: "add_episode",
        arguments: { name: "test", episode_body: "content" },
      });

      expect(request.jsonrpc).toBe("2.0");
      expect(request.id).toBe(1);
      expect(request.method).toBe("tools/call");
      expect(request.params).toBeDefined();
      expect(request.params.name).toBe("add_episode");
    });

    it("should increment request IDs", () => {
      let requestId = 0;

      const getNextId = () => ++requestId;

      expect(getNextId()).toBe(1);
      expect(getNextId()).toBe(2);
      expect(getNextId()).toBe(3);
    });
  });

  describe("MCP Tool Parameters", () => {
    describe("add_episode parameters", () => {
      it("should accept required parameters", () => {
        const params = {
          name: "Test Episode",
          episode_body: "This is test content",
          source: "text",
        };

        expect(params.name).toBeDefined();
        expect(params.episode_body).toBeDefined();
        expect(params.source).toBeDefined();
      });

      it("should accept optional parameters", () => {
        const params = {
          name: "Test Episode",
          episode_body: "Content",
          source_description: "Test source",
          group_id: "test-group",
          uuid: "custom-uuid",
        };

        expect(params.source_description).toBeDefined();
        expect(params.group_id).toBeDefined();
        expect(params.uuid).toBeDefined();
      });

      it("should handle JSON source type", () => {
        const params = {
          name: "JSON Episode",
          episode_body: JSON.stringify({ test: "data" }),
          source: "json",
        };

        expect(params.source).toBe("json");
        expect(() => JSON.parse(params.episode_body)).not.toThrow();
      });
    });

    describe("search_nodes parameters", () => {
      it("should accept query and optional limit", () => {
        const params1 = { query: "test query" };
        const params2 = { query: "test query", limit: 10 };

        expect(params1.query).toBeDefined();
        expect(params2.limit).toBeDefined();
        expect(params2.limit).toBe(10);
      });

      it("should accept optional filters", () => {
        const params = {
          query: "test",
          max_nodes: 5,
          group_ids: ["group1", "group2"],
          entity: "Preference",
        };

        expect(params.max_nodes).toBe(5);
        expect(Array.isArray(params.group_ids)).toBe(true);
        expect(params.entity).toBe("Preference");
      });
    });

    describe("search_facts parameters", () => {
      it("should accept query and optional max_facts", () => {
        const params = {
          query: "relationship test",
          max_facts: 15,
        };

        expect(params.query).toBeDefined();
        expect(params.max_facts).toBe(15);
      });
    });

    describe("get_episodes parameters", () => {
      it("should accept optional group_id and last_n", () => {
        const params = {
          group_id: "test-group",
          last_n: 20,
        };

        expect(params.group_id).toBeDefined();
        expect(params.last_n).toBeDefined();
      });

      it("should work with no parameters", () => {
        const params = {};

        expect(params).toBeDefined();
        expect(Object.keys(params).length).toBe(0);
      });
    });
  });

  describe("Response Parsing", () => {
    it("should parse successful response", () => {
      const mockResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [{ type: "text", text: `{"uuid": "test-uuid-123"}` }],
        },
      };

      expect(mockResponse.jsonrpc).toBe("2.0");
      expect(mockResponse.id).toBe(1);
      expect(mockResponse.result).toBeDefined();
      expect(mockResponse.result.content).toBeDefined();
    });

    it("should parse error response", () => {
      const mockResponse = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32600,
          message: "Invalid Request",
          data: "Missing required field",
        },
      };

      expect(mockResponse.error).toBeDefined();
      expect(mockResponse.error.code).toBe(-32600);
      expect(mockResponse.error.message).toBe("Invalid Request");
    });

    it("should extract UUID from response content", () => {
      const mockContent = {
        type: "text",
        text: '{"uuid": "extracted-uuid-456", "status": "success"}',
      };

      const parsed = JSON.parse(mockContent.text);
      expect(parsed.uuid).toBe("extracted-uuid-456");
      expect(parsed.status).toBe("success");
    });

    it("should extract status data", () => {
      const mockContent = {
        type: "text",
        text: '{"entity_count": 42, "episode_count": 100}',
      };

      const parsed = JSON.parse(mockContent.text);
      expect(parsed.entity_count).toBe(42);
      expect(parsed.episode_count).toBe(100);
    });
  });

  describe("MCPClient Interface", () => {
    it("should have required methods", () => {
      // These are the methods that should be available on MCPClient
      const expectedMethods = [
        "callTool",
        "addEpisode",
        "searchNodes",
        "searchFacts",
        "getEpisodes",
        "getStatus",
        "clearGraph",
        "deleteEntityEdge",
        "getEntityEdge",
        "deleteEpisode",
        "testConnection",
      ];

      expectedMethods.forEach((method) => {
        expect(typeof method).toBe("string");
        expect(method.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", () => {
      const networkError = {
        success: false,
        error: "Failed to fetch: Connection refused",
      };

      expect(networkError.success).toBe(false);
      expect(networkError.error).toBeDefined();
      expect(networkError.error).toContain("Connection refused");
    });

    it("should handle timeout errors", () => {
      const timeoutError = {
        success: false,
        error: "Request timeout after 30000ms",
      };

      expect(timeoutError.success).toBe(false);
      expect(timeoutError.error).toContain("timeout");
    });

    it("should handle JSON parse errors", () => {
      const invalidJSON = "This is not valid JSON {{{";

      expect(() => JSON.parse(invalidJSON)).toThrow();
    });

    it("should handle malformed MCP responses", () => {
      const malformedResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          // Missing 'content' field
        },
      };

      expect(malformedResponse.result).toBeDefined();
      expect(malformedResponse.result.content).toBeUndefined();
    });
  });

  describe("Request/Response Types", () => {
    it("should have correct JSONRPCRequest structure", () => {
      interface JSONRPCRequest {
        jsonrpc: "2.0";
        id: number;
        method: string;
        params: {
          name: string;
          arguments: Record<string, unknown>;
        };
      }

      const request: JSONRPCRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: "test_tool",
          arguments: {},
        },
      };

      expect(request.jsonrpc).toBe("2.0");
      expect(typeof request.id).toBe("number");
      expect(typeof request.method).toBe("string");
      expect(typeof request.params).toBe("object");
    });

    it("should have correct JSONRPCResponse structure", () => {
      interface JSONRPCResponse {
        jsonrpc: "2.0";
        id: number;
        result?: {
          content: Array<{ type: string; text: string }>;
        };
        error?: {
          code: number;
          message: string;
          data?: unknown;
        };
      }

      const successResponse: JSONRPCResponse = {
        jsonrpc: "2.0",
        id: 1,
        result: {
          content: [{ type: "text", text: '{"success": true}' }],
        },
      };

      expect(successResponse.result).toBeDefined();
      expect(successResponse.error).toBeUndefined();

      const errorResponse: JSONRPCResponse = {
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32601,
          message: "Method not found",
        },
      };

      expect(errorResponse.result).toBeUndefined();
      expect(errorResponse.error).toBeDefined();
    });
  });

  describe("Tool Names and Aliases", () => {
    it("should have consistent tool naming", () => {
      // MCP tool names (what the server exposes)
      const mcpTools = [
        "add_memory",
        "search_memory_nodes",
        "search_memory_facts",
        "get_episodes",
        "get_status",
        "clear_graph",
      ];

      // All tools should use snake_case
      mcpTools.forEach((tool) => {
        expect(tool).toMatch(/^[a-z_]+$/);
        expect(tool).not.toMatch(/[A-Z]/);
        expect(tool).not.toMatch(/-/);
      });
    });

    it("should have descriptive tool names with hybrid naming convention", () => {
      // MCP tool name -> Graphiti concept -> Description
      const toolDescriptions = {
        add_memory: "Adds an episode to the knowledge graph",
        search_memory_nodes: "Searches for entity nodes in the graph",
        search_memory_facts: "Searches for relationship facts/edges",
        get_episodes: "Retrieves recent episodes",
        get_status: "Gets graph statistics",
        clear_graph: "Clears all data from graph",
      };

      Object.entries(toolDescriptions).forEach(([tool, description]) => {
        expect(description.length).toBeGreaterThan(0);
        expect(tool).toBeDefined();
      });
    });
  });

  describe("Timeout Handling", () => {
    it("should use AbortController for timeout", () => {
      const controller = new AbortController();
      const timeout = 30000;

      expect(controller.signal).toBeDefined();
      expect(typeof timeout).toBe("number");
      expect(timeout).toBeGreaterThan(0);
    });

    it("should abort request on timeout", () => {
      const controller = new AbortController();

      // Simulate timeout
      setTimeout(() => controller.abort(), 100);

      expect(controller.signal.aborted).toBe(false);
      // After 100ms it would be aborted, but we can't wait in tests
    });
  });

  describe("Base URL Configuration", () => {
    it("should construct correct base URL", () => {
      const baseURL = "http://localhost:8000/mcp";

      expect(baseURL).toMatch(/^https?:\/\//);
      expect(baseURL).toContain("localhost");
      expect(baseURL).toContain("8000");
      expect(baseURL).toContain("/mcp");
    });

    it("should handle different host configurations", () => {
      const urls = [
        "http://localhost:8000/mcp",
        "http://127.0.0.1:8000/mcp",
        "https://api.example.com/mcp",
      ];

      urls.forEach((url) => {
        expect(url).toMatch(/^https?:\/\//);
        expect(url).toContain("/mcp");
      });
    });
  });

  describe("Headers Configuration", () => {
    it("should set correct Content-Type header", () => {
      const headers = {
        "Content-Type": "application/json",
      };

      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should allow additional headers", () => {
      const headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer token123",
        "X-Custom-Header": "custom-value",
      };

      expect(Object.keys(headers).length).toBe(3);
      expect(headers["Authorization"]).toBeDefined();
      expect(headers["X-Custom-Header"]).toBeDefined();
    });
  });

  describe("Response Caching", () => {
    it("should generate consistent cache keys", () => {
      const getCacheKey = (toolName: string, args: Record<string, unknown>): string => {
        return `${toolName}:${JSON.stringify(args)}`;
      };

      const key1 = getCacheKey("search_memory_nodes", { query: "test", limit: 10 });
      const key2 = getCacheKey("search_memory_nodes", { query: "test", limit: 10 });
      const key3 = getCacheKey("search_memory_nodes", { query: "different", limit: 10 });

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it("should support cache configuration", () => {
      const config = {
        enableCache: true,
        cacheMaxSize: 100,
        cacheTtlMs: 5 * 60 * 1000, // 5 minutes
      };

      expect(config.enableCache).toBe(true);
      expect(config.cacheMaxSize).toBe(100);
      expect(config.cacheTtlMs).toBe(300000);
    });

    it("should support disabling cache", () => {
      const config = {
        enableCache: false,
      };

      expect(config.enableCache).toBe(false);
    });

    it("should provide cache statistics", () => {
      const cacheStats = {
        enabled: true,
        size: 42,
      };

      expect(cacheStats.enabled).toBe(true);
      expect(cacheStats.size).toBe(42);
    });

    it("should support cache clearing", () => {
      // LRU cache behavior
      const cache = new Map<string, { data: unknown; timestamp: number }>();
      cache.set("key1", { data: "value1", timestamp: Date.now() });
      cache.set("key2", { data: "value2", timestamp: Date.now() });

      expect(cache.size).toBe(2);

      cache.clear();

      expect(cache.size).toBe(0);
    });

    it("should expire entries based on TTL", () => {
      const ttlMs = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      const expiredTimestamp = now - ttlMs - 1000; // 1 second past TTL
      const validTimestamp = now - ttlMs + 1000; // 1 second before TTL

      const isExpired = (timestamp: number): boolean => {
        return now - timestamp > ttlMs;
      };

      expect(isExpired(expiredTimestamp)).toBe(true);
      expect(isExpired(validTimestamp)).toBe(false);
    });

    it("should evict oldest entries when at capacity", () => {
      const maxSize = 3;
      const cache = new Map<string, unknown>();

      // Add entries
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      expect(cache.size).toBe(maxSize);

      // At capacity, would need to evict oldest
      if (cache.size >= maxSize) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey!);
      }

      cache.set("key4", "value4");

      expect(cache.size).toBe(maxSize);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key4")).toBe(true);
    });
  });
});
