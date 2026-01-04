/**
 * Test Setup and Utilities
 *
 * Provides common test utilities, mocks, and fixtures for the test suite.
 */

import { bunTest } from "bun:test";

/**
 * Mock result for container commands
 */
export interface MockCommandResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

/**
 * Mock file system structure
 */
export interface MockFileSystem {
  files: Record<string, string>;
  directories: Set<string>;
}

/**
 * Test context with mocks
 */
export interface TestContext {
  mockExec: (args: string[], result: MockCommandResult) => void;
  mockFile: (path: string, content: string) => void;
  mockDirectory: (path: string) => void;
  getMockFiles: () => Record<string, string>;
  getMockDirectories: () => string[];
  resetMocks: () => void;
}

/**
 * Global test state
 */
const mockFileSystem: MockFileSystem = {
  files: {},
  directories: new Set(),
};

const mockExecResults = new Map<string, MockCommandResult>();

/**
 * Create a mock execution result key
 */
function createExecKey(args: string[]): string {
  return args.join(" ");
}

/**
 * Setup test environment
 */
export function setupTestEnvironment(): TestContext {
  // Reset mock state
  mockFileSystem.files = {};
  mockFileSystem.directories.clear();
  mockExecResults.clear();

  return {
    /**
     * Mock a container command execution
     */
    mockExec: (args: string[], result: MockCommandResult) => {
      const key = createExecKey(args);
      mockExecResults.set(key, result);
    },

    /**
     * Mock a file with content
     */
    mockFile: (path: string, content: string) => {
      mockFileSystem.files[path] = content;
      // Ensure parent directories exist
      const dir = path.split("/").slice(0, -1).join("/");
      if (dir) {
        mockFileSystem.directories.add(dir);
      }
    },

    /**
     * Mock a directory
     */
    mockDirectory: (path: string) => {
      mockFileSystem.directories.add(path);
    },

    /**
     * Get all mock files
     */
    getMockFiles: () => {
      return { ...mockFileSystem.files };
    },

    /**
     * Get all mock directories
     */
    getMockDirectories: () => {
      return Array.from(mockFileSystem.directories);
    },

    /**
     * Reset all mocks
     */
    resetMocks: () => {
      mockFileSystem.files = {};
      mockFileSystem.directories.clear();
      mockExecResults.clear();
    },
  };
}

/**
 * Create a mock container manager
 */
export function createMockContainerManager() {
  return {
    isRuntimeAvailable: () => true,
    getRuntimeCommand: () => "podman",

    exec: async (args: string[]): Promise<MockCommandResult> => {
      const key = createExecKey(args);
      const result = mockExecResults.get(key);

      if (result) {
        return result;
      }

      // Default mock responses
      if (args[0] === "--version") {
        return {
          success: true,
          stdout: "podman version 4.0.0",
        };
      }

      if (args[0] === "ps" && args.includes("--format")) {
        return {
          success: true,
          stdout: "",
        };
      }

      return {
        success: false,
        stderr: "Command not mocked",
      };
    },

    containerExists: async (name: string): Promise<boolean> => {
      const key = createExecKey(["ps", "-a", "--filter", `name=${name}`, "--format", "{{.Names}}"]);
      const result = mockExecResults.get(key);
      return result?.success && result.stdout?.includes(name) || false;
    },

    isContainerRunning: async (name: string): Promise<boolean> => {
      const key = createExecKey(["ps", "--filter", `name=${name}`, "--format", "{{.Status}}"]);
      const result = mockExecResults.get(key);
      return result?.stdout?.includes("running") || false;
    },

    startContainer: async (name: string): Promise<MockCommandResult> => {
      const key = createExecKey(["start", name]);
      const result = mockExecResults.get(key);
      return result || { success: true, stdout: "" };
    },

    stopContainer: async (name: string): Promise<MockCommandResult> => {
      const key = createExecKey(["stop", name]);
      const result = mockExecResults.get(key);
      return result || { success: true, stdout: "" };
    },

    runContainer: async (args: string[]): Promise<MockCommandResult> => {
      const key = createExecKey(args);
      const result = mockExecResults.get(key);
      return result || { success: true, stdout: "container-id" };
    },

    getLogs: async (name: string, follow: boolean): Promise<MockCommandResult> => {
      const args = ["logs", follow ? "-f" : "", name].filter(Boolean);
      const key = createExecKey(args);
      const result = mockExecResults.get(key);
      return result || { success: true, stdout: "Mock log output" };
    },

    networkExists: async (name: string): Promise<boolean> => {
      const key = createExecKey(["network", "exists", name]);
      const result = mockExecResults.get(key);
      return result?.success || false;
    },

    createNetwork: async (name: string, subnet: string): Promise<MockCommandResult> => {
      const key = createExecKey(["network", "create", "--subnet", subnet, name]);
      const result = mockExecResults.get(key);
      return result || { success: true, stdout: "" };
    },

    getNetworkInfo: async (name: string): Promise<{ name: string; exists: boolean; subnet: string | undefined }> => {
      const key = createExecKey(["network", "inspect", name, "--format", "json"]);
      const result = mockExecResults.get(key);

      if (result?.success) {
        try {
          const data = JSON.parse(result.stdout || "{}");
          return {
            name,
            exists: true,
            subnet: data[0]?.subnet,
          };
        } catch {
          return { name, exists: true, subnet: undefined };
        }
      }

      return { name, exists: false, subnet: undefined };
    },

    getContainerInfo: async (name: string): Promise<{
      name: string;
      exists: boolean;
      status: string | undefined;
      uptime: string | undefined;
      ports: string | undefined;
    }> => {
      const key = createExecKey(["inspect", name, "--format", "json"]);
      const result = mockExecResults.get(key);

      if (result?.success) {
        try {
          const data = JSON.parse(result.stdout || "{}");
          return {
            name,
            exists: true,
            status: data[0]?.State?.Status,
            uptime: data[0]?.State?.StartedAt,
            ports: data[0]?.NetworkSettings?.Ports,
          };
        } catch {
          return { name, exists: true, status: undefined, uptime: undefined, ports: undefined };
        }
      }

      return { name, exists: false, status: undefined, uptime: undefined, ports: undefined };
    },

    getStats: async (name: string): Promise<MockCommandResult> => {
      const key = createExecKey(["stats", name, "--no-stream", "--format", "json"]);
      const result = mockExecResults.get(key);
      return result || { success: true, stdout: JSON.stringify([{ name: "mock" }]) };
    },

    stopAndRemoveContainer: async (name: string): Promise<void> => {
      // Mock implementation
    },
  };
}

/**
 * Create a mock config loader
 */
export function createMockConfigLoader() {
  return {
    envExists: () => {
      return !!mockFileSystem.files[".env"] || !!mockFileSystem.files["config/.env"];
    },

    getEnvFile: () => {
      return "config/.env";
    },

    getConfigDir: () => {
      return "config";
    },

    load: async () => {
      const envPath = "config/.env";
      const content = mockFileSystem.files[envPath] || "";

      const env: Record<string, string> = {};

      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIndex = trimmed.indexOf("=");
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            env[key] = value;
          }
        }
      }

      return {
        OPENAI_API_KEY: env.OPENAI_API_KEY || env.PAI_KNOWLEDGE_OPENAI_API_KEY,
        ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
        GOOGLE_API_KEY: env.GOOGLE_API_KEY,
        GROQ_API_KEY: env.GROQ_API_KEY,
        LLM_PROVIDER: env.LLM_PROVIDER || env.PAI_KNOWLEDGE_LLM_PROVIDER || "openai",
        EMBEDDER_PROVIDER: env.EMBEDDER_PROVIDER || env.PAI_KNOWLEDGE_EMBEDDER_PROVIDER || "openai",
        MODEL_NAME: env.MODEL_NAME || env.PAI_KNOWLEDGE_MODEL_NAME || "gpt-4o-mini",
        SEMAPHORE_LIMIT: env.SEMAPHORE_LIMIT || env.PAI_KNOWLEDGE_SEMAPHORE_LIMIT || "10",
        GROUP_ID: env.GROUP_ID || env.PAI_KNOWLEDGE_GROUP_ID || "main",
        DATABASE_TYPE: env.DATABASE_TYPE || env.PAI_KNOWLEDGE_DATABASE_TYPE || "falkordb",
        FALKORDB_HOST: env.FALKORDB_HOST || "falkordb",
        FALKORDB_PORT: env.FALKORDB_PORT || "6379",
        FALKORDB_PASSWORD: env.FALKORDB_PASSWORD || "",
        NEO4J_URI: env.NEO4J_URI || "",
        NEO4J_USER: env.NEO4J_USER || "",
        NEO4J_PASSWORD: env.NEO4J_PASSWORD || "",
        GRAPHITI_TELEMETRY_ENABLED: env.GRAPHITI_TELEMETRY_ENABLED || env.PAI_KNOWLEDGE_GRAPHITI_TELEMETRY_ENABLED || "false",
        PAI_PREFIXES: Object.keys(env)
          .filter((k) => k.startsWith("PAI_KNOWLEDGE_"))
          .reduce((acc, k) => ({ ...acc, [k]: env[k] }), {}),
      };
    },

    save: async (config: Record<string, string | undefined>) => {
      const lines = [
        "# PAI Knowledge System Configuration",
        `# Generated: ${new Date().toISOString()}`,
        "",
        "# API Keys",
      ];

      if (config.OPENAI_API_KEY) {
        lines.push(`PAI_KNOWLEDGE_OPENAI_API_KEY=${config.OPENAI_API_KEY}`);
      }
      if (config.ANTHROPIC_API_KEY) {
        lines.push(`ANTHROPIC_API_KEY=${config.ANTHROPIC_API_KEY}`);
      }
      if (config.GOOGLE_API_KEY) {
        lines.push(`GOOGLE_API_KEY=${config.GOOGLE_API_KEY}`);
      }
      if (config.GROQ_API_KEY) {
        lines.push(`GROQ_API_KEY=${config.GROQ_API_KEY}`);
      }

      lines.push("", "# LLM Provider Configuration");
      lines.push(`PAI_KNOWLEDGE_LLM_PROVIDER=${config.LLM_PROVIDER || "openai"}`);
      lines.push(`PAI_KNOWLEDGE_EMBEDDER_PROVIDER=${config.EMBEDDER_PROVIDER || "openai"}`);
      lines.push(`PAI_KNOWLEDGE_MODEL_NAME=${config.MODEL_NAME || "gpt-4o-mini"}`);

      lines.push("", "# Performance Configuration");
      lines.push(`PAI_KNOWLEDGE_SEMAPHORE_LIMIT=${config.SEMAPHORE_LIMIT || "10"}`);

      lines.push("", "# Knowledge Graph Configuration");
      lines.push(`PAI_KNOWLEDGE_GROUP_ID=${config.GROUP_ID || "main"}`);

      lines.push("", "# Database Configuration");
      lines.push(`PAI_KNOWLEDGE_DATABASE_TYPE=${config.DATABASE_TYPE || "falkordb"}`);

      lines.push("", "# Telemetry");
      lines.push(`PAI_KNOWLEDGE_GRAPHITI_TELEMETRY_ENABLED=${config.GRAPHITI_TELEMETRY_ENABLED || "false"}`);

      const content = lines.join("\n");
      mockFileSystem.files["config/.env"] = content;
      mockFileSystem.directories.add("config");
    },
  };
}

/**
 * Assert mock execution was called
 */
export function assertMockExecCalled(args: string[]): boolean {
  const key = createExecKey(args);
  return mockExecResults.has(key);
}

/**
 * Assert mock file exists
 */
export function assertMockFileExists(path: string): boolean {
  return path in mockFileSystem.files;
}

/**
 * Assert mock directory exists
 */
export function assertMockDirectoryExists(path: string): boolean {
  return mockFileSystem.directories.has(path);
}

/**
 * Clean up after tests
 */
export function cleanupTests(): void {
  mockFileSystem.files = {};
  mockFileSystem.directories.clear();
  mockExecResults.clear();
}
