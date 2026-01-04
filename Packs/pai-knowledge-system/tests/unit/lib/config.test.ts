/**
 * Unit Tests for Config Loader Library
 *
 * Tests the ConfigLoader class with mocked file system.
 */

import { setupTestEnvironment, createMockConfigLoader, cleanupTests } from "../../setup.js";

describe("ConfigLoader", () => {
  let ctx: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    ctx = setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTests();
  });

  describe("Environment File Detection", () => {
    it("should detect existing .env file in config directory", () => {
      ctx.mockFile("config/.env", "OPENAI_API_KEY=test-key\n");

      const mockLoader = createMockConfigLoader();
      expect(mockLoader.envExists()).toBe(true);
    });

    it("should return false when .env does not exist", () => {
      const mockLoader = createMockConfigLoader();
      expect(mockLoader.envExists()).toBe(false);
    });

    it("should return correct env file path", () => {
      const mockLoader = createMockConfigLoader();
      expect(mockLoader.getEnvFile()).toBe("config/.env");
    });

    it("should return correct config directory", () => {
      const mockLoader = createMockConfigLoader();
      expect(mockLoader.getConfigDir()).toBe("config");
    });
  });

  describe("Environment Loading", () => {
    it("should load simple .env file", async () => {
      const envContent = `
OPENAI_API_KEY=sk-test-key-123
LLM_PROVIDER=openai
MODEL_NAME=gpt-4o-mini
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.OPENAI_API_KEY).toBe("sk-test-key-123");
      expect(config.LLM_PROVIDER).toBe("openai");
      expect(config.MODEL_NAME).toBe("gpt-4o-mini");
    });

    it("should load .env with comments and empty lines", async () => {
      const envContent = `
# This is a comment
OPENAI_API_KEY=sk-test-key-456

# Another comment
LLM_PROVIDER=anthropic

MODEL_NAME=claude-sonnet-4-20250514
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.OPENAI_API_KEY).toBe("sk-test-key-456");
      expect(config.LLM_PROVIDER).toBe("anthropic");
      expect(config.MODEL_NAME).toBe("claude-sonnet-4-20250514");
    });

    it("should handle values with spaces", async () => {
      const envContent = `
MODEL_NAME=gpt-4o turbo
GROUP_ID=my knowledge group
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.MODEL_NAME).toBe("gpt-4o turbo");
      expect(config.GROUP_ID).toBe("my knowledge group");
    });

    it("should load PAI_KNOWLEDGE_ prefixed variables", async () => {
      const envContent = `
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-pai-key-789
PAI_KNOWLEDGE_LLM_PROVIDER=groq
PAI_KNOWLEDGE_MODEL_NAME=llama-3.3-70b-versatile
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.OPENAI_API_KEY).toBe("sk-pai-key-789");
      expect(config.LLM_PROVIDER).toBe("groq");
      expect(config.MODEL_NAME).toBe("llama-3.3-70b-versatile");
    });

    it("should map PAI_KNOWLEDGE_OPENAI_API_KEY to OPENAI_API_KEY", async () => {
      const envContent = `
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-mapped-key
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.OPENAI_API_KEY).toBe("sk-mapped-key");
    });

    it("should prioritize standard OPENAI_API_KEY over PAI_KNOWLEDGE_OPENAI_API_KEY", async () => {
      const envContent = `
OPENAI_API_KEY=sk-standard-key
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-pai-key
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      // Standard key should take precedence
      expect(config.OPENAI_API_KEY).toBe("sk-standard-key");
    });

    it("should use default values when not specified", async () => {
      const envContent = `
OPENAI_API_KEY=sk-test-key
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.LLM_PROVIDER).toBe("openai");
      expect(config.EMBEDDER_PROVIDER).toBe("openai");
      expect(config.MODEL_NAME).toBe("gpt-4o-mini");
      expect(config.SEMAPHORE_LIMIT).toBe("10");
      expect(config.GROUP_ID).toBe("main");
      expect(config.DATABASE_TYPE).toBe("falkordb");
    });

    it("should load all API key types", async () => {
      const envContent = `
OPENAI_API_KEY=sk-openai-key
ANTHROPIC_API_KEY=sk-ant-key
GOOGLE_API_KEY=ai-google-key
GROQ_API_KEY=grok-groq-key
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.OPENAI_API_KEY).toBe("sk-openai-key");
      expect(config.ANTHROPIC_API_KEY).toBe("sk-ant-key");
      expect(config.GOOGLE_API_KEY).toBe("ai-google-key");
      expect(config.GROQ_API_KEY).toBe("grok-groq-key");
    });

    it("should load database configuration", async () => {
      const envContent = `
DATABASE_TYPE=falkordb
FALKORDB_HOST=falkordb
FALKORDB_PORT=6379
FALKORDB_PASSWORD=my-secret-password
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.DATABASE_TYPE).toBe("falkordb");
      expect(config.FALKORDB_HOST).toBe("falkordb");
      expect(config.FALKORDB_PORT).toBe("6379");
      expect(config.FALKORDB_PASSWORD).toBe("my-secret-password");
    });

    it("should load Neo4j configuration", async () => {
      const envContent = `
DATABASE_TYPE=neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j-password
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.DATABASE_TYPE).toBe("neo4j");
      expect(config.NEO4J_URI).toBe("bolt://localhost:7687");
      expect(config.NEO4J_USER).toBe("neo4j");
      expect(config.NEO4J_PASSWORD).toBe("neo4j-password");
    });

    it("should parse PAI_PREFIXES correctly", async () => {
      const envContent = `
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-test-key
PAI_KNOWLEDGE_LLM_PROVIDER=openai
PAI_KNOWLEDGE_SEMAPHORE_LIMIT=20
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.PAI_PREFIXES).toBeDefined();
      expect(config.PAI_PREFIXES?.PAI_KNOWLEDGE_OPENAI_API_KEY).toBe("sk-test-key");
      expect(config.PAI_PREFIXES?.PAI_KNOWLEDGE_LLM_PROVIDER).toBe("openai");
      expect(config.PAI_PREFIXES?.PAI_KNOWLEDGE_SEMAPHORE_LIMIT).toBe("20");
    });
  });

  describe("Environment Saving", () => {
    it("should save config to .env file", async () => {
      const mockLoader = createMockConfigLoader();

      const config = {
        OPENAI_API_KEY: "sk-new-key",
        LLM_PROVIDER: "openai",
        MODEL_NAME: "gpt-4o",
        SEMAPHORE_LIMIT: "15",
        GROUP_ID: "test",
        DATABASE_TYPE: "falkordb",
      };

      await mockLoader.save(config);

      const files = ctx.getMockFiles();
      expect(files["config/.env"]).toBeDefined();
      expect(files["config/.env"]).toContain("OPENAI_API_KEY=sk-new-key");
      expect(files["config/.env"]).toContain("LLM_PROVIDER=openai");
    });

    it("should save config with PAI_KNOWLEDGE_ prefixes", async () => {
      const mockLoader = createMockConfigLoader();

      const config = {
        OPENAI_API_KEY: "sk-pai-prefixed-key",
        LLM_PROVIDER: "anthropic",
        MODEL_NAME: "claude-sonnet-4-20250514",
      };

      await mockLoader.save(config);

      const files = ctx.getMockFiles();
      expect(files["config/.env"]).toBeDefined();
      expect(files["config/.env"]).toContain("PAI_KNOWLEDGE_OPENAI_API_KEY=sk-pai-prefixed-key");
      expect(files["config/.env"]).toContain("PAI_KNOWLEDGE_LLM_PROVIDER=anthropic");
    });

    it("should include header and comments in saved .env", async () => {
      const mockLoader = createMockConfigLoader();

      const config = {
        OPENAI_API_KEY: "sk-test",
        LLM_PROVIDER: "openai",
      };

      await mockLoader.save(config);

      const files = ctx.getMockFiles();
      const envContent = files["config/.env"];

      expect(envContent).toContain("# PAI Knowledge System Configuration");
      expect(envContent).toContain("# Generated:");
      expect(envContent).toContain("# API Keys");
      expect(envContent).toContain("# LLM Provider Configuration");
    });

    it("should handle empty optional values when saving", async () => {
      const mockLoader = createMockConfigLoader();

      const config = {
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: undefined,
        GOOGLE_API_KEY: undefined,
      };

      await mockLoader.save(config);

      const files = ctx.getMockFiles();
      const envContent = files["config/.env"];

      expect(envContent).toContain("OPENAI_API_KEY=sk-test");
      expect(envContent).not.toContain("ANTHROPIC_API_KEY=");
      expect(envContent).not.toContain("GOOGLE_API_KEY=");
    });

    it("should save multiple API keys", async () => {
      const mockLoader = createMockConfigLoader();

      const config = {
        OPENAI_API_KEY: "sk-openai",
        ANTHROPIC_API_KEY: "sk-ant",
        GOOGLE_API_KEY: "ai-google",
        GROQ_API_KEY: "gq-groq",
      };

      await mockLoader.save(config);

      const files = ctx.getMockFiles();
      const envContent = files["config/.env"];

      expect(envContent).toContain("PAI_KNOWLEDGE_OPENAI_API_KEY=sk-openai");
      expect(envContent).toContain("ANTHROPIC_API_KEY=sk-ant");
      expect(envContent).toContain("GOOGLE_API_KEY=ai-google");
      expect(envContent).toContain("GROQ_API_KEY=gq-groq");
    });
  });

  describe("Default Values", () => {
    it("should provide sensible defaults for all required fields", async () => {
      ctx.mockFile("config/.env", "OPENAI_API_KEY=sk-test\n");

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.LLM_PROVIDER).toBeDefined();
      expect(config.EMBEDDER_PROVIDER).toBeDefined();
      expect(config.MODEL_NAME).toBeDefined();
      expect(config.SEMAPHORE_LIMIT).toBeDefined();
      expect(config.GROUP_ID).toBeDefined();
      expect(config.DATABASE_TYPE).toBeDefined();
      expect(config.GRAPHITI_TELEMETRY_ENABLED).toBeDefined();

      expect(config.LLM_PROVIDER).toBe("openai");
      expect(config.EMBEDDER_PROVIDER).toBe("openai");
      expect(config.MODEL_NAME).toBe("gpt-4o-mini");
      expect(config.SEMAPHORE_LIMIT).toBe("10");
      expect(config.GROUP_ID).toBe("main");
      expect(config.DATABASE_TYPE).toBe("falkordb");
      expect(config.GRAPHITI_TELEMETRY_ENABLED).toBe("false");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty .env file", async () => {
      ctx.mockFile("config/.env", "");

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config).toBeDefined();
      expect(config.LLM_PROVIDER).toBe("openai");
    });

    it("should handle malformed lines gracefully", async () => {
      const envContent = `
OPENAI_API_KEY=sk-test
invalid line without equals
ANOTHER_KEY=value
=equals-at-start
KEY=value=with=equals
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.OPENAI_API_KEY).toBe("sk-test");
      expect(config).toBeDefined();
    });

    it("should handle trailing newlines", async () => {
      const envContent = "OPENAI_API_KEY=sk-test\n\n\n";

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.OPENAI_API_KEY).toBe("sk-test");
    });

    it("should handle special characters in values", async () => {
      const envContent = `
MODEL_NAME=model-with-dashes_and_underscores
GROUP_ID=group with spaces
FALKORDB_PASSWORD=p@ssw0rd!#$%^&*()
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.MODEL_NAME).toBe("model-with-dashes_and_underscores");
      expect(config.GROUP_ID).toBe("group with spaces");
      expect(config.FALKORDB_PASSWORD).toBe("p@ssw0rd!#$%^&*()");
    });
  });

  describe("Config Validation", () => {
    it("should have required fields defined", async () => {
      ctx.mockFile("config/.env", "OPENAI_API_KEY=sk-test\n");

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      // Check that all expected fields exist
      const expectedFields = [
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GOOGLE_API_KEY",
        "GROQ_API_KEY",
        "LLM_PROVIDER",
        "EMBEDDER_PROVIDER",
        "MODEL_NAME",
        "SEMAPHORE_LIMIT",
        "GROUP_ID",
        "DATABASE_TYPE",
        "FALKORDB_HOST",
        "FALKORDB_PORT",
        "FALKORDB_PASSWORD",
        "NEO4J_URI",
        "NEO4J_USER",
        "NEO4J_PASSWORD",
        "GRAPHITI_TELEMETRY_ENABLED",
        "PAI_PREFIXES",
      ];

      expectedFields.forEach((field) => {
        expect(config).toHaveProperty(field);
      });
    });
  });

  describe("PAI_PREFIXES Structure", () => {
    it("should collect all PAI_KNOWLEDGE_ prefixed variables", async () => {
      const envContent = `
PAI_KNOWLEDGE_OPENAI_API_KEY=sk-test
PAI_KNOWLEDGE_LLM_PROVIDER=groq
PAI_KNOWLEDGE_EMBEDDER_PROVIDER=openai
PAI_KNOWLEDGE_MODEL_NAME=llama-3.3-70b-versatile
PAI_KNOWLEDGE_SEMAPHORE_LIMIT=5
PAI_KNOWLEDGE_GROUP_ID=test-group
PAI_KNOWLEDGE_DATABASE_TYPE=falkordb
PAI_KNOWLEDGE_GRAPHITI_TELEMETRY_ENABLED=true
`;

      ctx.mockFile("config/.env", envContent);

      const mockLoader = createMockConfigLoader();
      const config = await mockLoader.load();

      expect(config.PAI_PREFIXES).toBeDefined();
      expect(Object.keys(config.PAI_PREFIXES || {}).length).toBeGreaterThanOrEqual(8);
      expect(config.PAI_PREFIXES?.PAI_KNOWLEDGE_OPENAI_API_KEY).toBe("sk-test");
    });
  });
});
