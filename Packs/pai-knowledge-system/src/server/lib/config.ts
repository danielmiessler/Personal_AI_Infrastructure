/**
 * Configuration Loader Library
 *
 * Handles loading and mapping environment variables for the PAI Knowledge System.
 * Supports PAI_KNOWLEDGE_* prefixed variables and maps them to standard container env vars.
 */

import { join } from "path";

/**
 * Configuration interface
 */
export interface KnowledgeConfig {
  // API Keys
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  GROQ_API_KEY?: string;
  VOYAGE_API_KEY?: string;

  // LLM Provider Configuration
  LLM_PROVIDER: string;
  EMBEDDER_PROVIDER: string;
  MODEL_NAME: string;

  // Performance Configuration
  SEMAPHORE_LIMIT: string;

  // Knowledge Graph Configuration
  GROUP_ID: string;

  // Database Configuration
  DATABASE_TYPE: string;
  FALKORDB_HOST?: string;
  FALKORDB_PORT?: string;
  FALKORDB_PASSWORD?: string;

  // Neo4j Configuration (alternative)
  NEO4J_URI?: string;
  NEO4J_USER?: string;
  NEO4J_PASSWORD?: string;

  // Telemetry
  GRAPHITI_TELEMETRY_ENABLED: string;

  // Container Configuration
  NETWORK_NAME: string;
  FALKORDB_CONTAINER: string;
  MCP_CONTAINER: string;
  VOLUME_NAME: string;

  // Port Configuration
  MCP_SERVER_PORT: string;
  FALKORDB_UI_PORT: string;

  // Original PAI_KNOWLEDGE_* prefixed values (for reference)
  PAI_PREFIXES?: Record<string, string | undefined>;
}

/**
 * Default configuration values
 */
const DEFAULTS: Record<string, string> = {
  LLM_PROVIDER: "openai",
  EMBEDDER_PROVIDER: "openai",
  MODEL_NAME: "gpt-4o-mini",
  SEMAPHORE_LIMIT: "10",
  GROUP_ID: "main",
  DATABASE_TYPE: "falkordb",
  GRAPHITI_TELEMETRY_ENABLED: "false",
  NETWORK_NAME: "pai-knowledge-net",
  FALKORDB_CONTAINER: "pai-knowledge-falkordb",
  MCP_CONTAINER: "pai-knowledge-graph-mcp",
  VOLUME_NAME: "pai-knowledge-falkordb-data",
  MCP_SERVER_PORT: "8000",
  FALKORDB_UI_PORT: "3000",
  FALKORDB_HOST: "pai-knowledge-falkordb",
  FALKORDB_PORT: "6379",
  NEO4J_URI: "bolt://localhost:7687",
  NEO4J_USER: "neo4j",
  NEO4J_PASSWORD: "demodemo",
};

/**
 * Configuration Loader class
 */
export class ConfigLoader {
  private packRoot: string;
  private configDir: string;
  private envFile: string;

  constructor(packRoot?: string) {
    // If packRoot not provided, navigate up from src/server/lib to pack root
    this.packRoot = packRoot || join(import.meta.dir, "../../../");
    this.configDir = join(this.packRoot, "config");
    this.envFile = join(this.configDir, ".env");
  }

  /**
   * Get the pack root directory
   */
  getPackRoot(): string {
    return this.packRoot;
  }

  /**
   * Get the config directory
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * Get the .env file path
   */
  getEnvFile(): string {
    return this.envFile;
  }

  /**
   * Check if .env file exists
   */
  envExists(): boolean {
    const file = Bun.file(this.envFile);
    return file.exists();
  }

  /**
   * Load environment variables from .env file using Bun
   */
  async loadEnv(): Promise<Record<string, string>> {
    const env: Record<string, string> = { ...process.env };

    // Try to load from config directory
    if (this.envExists()) {
      const file = Bun.file(this.envFile);
      const content = await file.text();
      this.parseEnvFile(content, env);
    } else {
      // Try pack root
      const rootEnvFile = join(this.packRoot, ".env");
      try {
        const file = Bun.file(rootEnvFile);
        if (file.exists()) {
          const content = await file.text();
          this.parseEnvFile(content, env);
        }
      } catch {
        // Ignore
      }
    }

    return env;
  }

  /**
   * Parse .env file content
   */
  private parseEnvFile(content: string, env: Record<string, string>): void {
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Parse KEY=VALUE
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();

        // Remove quotes if present
        const unquoted =
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
            ? value.slice(1, -1)
            : value;

        env[key] = unquoted;
      }
    }
  }

  /**
   * Map PAI_KNOWLEDGE_* prefixed variables to standard names
   */
  private mapPrefixes(env: Record<string, string>): {
    mapped: Record<string, string>;
    originals: Record<string, string | undefined>;
  } {
    const mapped: Record<string, string> = { ...env };
    const originals: Record<string, string | undefined> = {};

    // Mapping of PAI_KNOWLEDGE_* -> standard variable
    const mappings: Record<string, string> = {
      PAI_KNOWLEDGE_OPENAI_API_KEY: "OPENAI_API_KEY",
      PAI_KNOWLEDGE_LLM_PROVIDER: "LLM_PROVIDER",
      PAI_KNOWLEDGE_EMBEDDER_PROVIDER: "EMBEDDER_PROVIDER",
      PAI_KNOWLEDGE_MODEL_NAME: "MODEL_NAME",
      PAI_KNOWLEDGE_SEMAPHORE_LIMIT: "SEMAPHORE_LIMIT",
      PAI_KNOWLEDGE_GROUP_ID: "GROUP_ID",
      PAI_KNOWLEDGE_DATABASE_TYPE: "DATABASE_TYPE",
      PAI_KNOWLEDGE_GRAPHITI_TELEMETRY_ENABLED: "GRAPHITI_TELEMETRY_ENABLED",
      PAI_KNOWLEDGE_FALKORDB_PASSWORD: "FALKORDB_PASSWORD",
    };

    // Apply mappings
    for (const [paiVar, standardVar] of Object.entries(mappings)) {
      const paiValue = env[paiVar];
      if (paiValue) {
        // Store original for reference
        originals[paiVar] = paiValue;

        // Only map if standard variable not already set
        if (!mapped[standardVar]) {
          mapped[standardVar] = paiValue;
        }
      }
    }

    return { mapped, originals };
  }

  /**
   * Get configuration value with fallback to default
   */
  private getEnvValue(
    env: Record<string, string>,
    key: string,
    defaultValue?: string
  ): string {
    const value = env[key];
    if (value) {
      return value;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    // Return from defaults
    return DEFAULTS[key] || "";
  }

  /**
   * Load and validate configuration
   */
  async load(): Promise<KnowledgeConfig> {
    // Load .env file
    const env = await this.loadEnv();

    // Map PAI_KNOWLEDGE_* prefixes
    const { mapped, originals } = this.mapPrefixes(env);

    // Build configuration object
    const config: KnowledgeConfig = {
      // API Keys
      OPENAI_API_KEY: this.getEnvValue(mapped, "OPENAI_API_KEY"),
      ANTHROPIC_API_KEY: this.getEnvValue(mapped, "ANTHROPIC_API_KEY"),
      GOOGLE_API_KEY: this.getEnvValue(mapped, "GOOGLE_API_KEY"),
      GROQ_API_KEY: this.getEnvValue(mapped, "GROQ_API_KEY"),
      VOYAGE_API_KEY: this.getEnvValue(mapped, "VOYAGE_API_KEY"),

      // LLM Provider Configuration
      LLM_PROVIDER: this.getEnvValue(mapped, "LLM_PROVIDER", DEFAULTS.LLM_PROVIDER),
      EMBEDDER_PROVIDER: this.getEnvValue(mapped, "EMBEDDER_PROVIDER", DEFAULTS.EMBEDDER_PROVIDER),
      MODEL_NAME: this.getEnvValue(mapped, "MODEL_NAME", DEFAULTS.MODEL_NAME),

      // Performance Configuration
      SEMAPHORE_LIMIT: this.getEnvValue(mapped, "SEMAPHORE_LIMIT", DEFAULTS.SEMAPHORE_LIMIT),

      // Knowledge Graph Configuration
      GROUP_ID: this.getEnvValue(mapped, "GROUP_ID", DEFAULTS.GROUP_ID),

      // Database Configuration
      DATABASE_TYPE: this.getEnvValue(mapped, "DATABASE_TYPE", DEFAULTS.DATABASE_TYPE),
      FALKORDB_HOST: this.getEnvValue(mapped, "FALKORDB_HOST", DEFAULTS.FALKORDB_HOST),
      FALKORDB_PORT: this.getEnvValue(mapped, "FALKORDB_PORT", DEFAULTS.FALKORDB_PORT),
      FALKORDB_PASSWORD: this.getEnvValue(mapped, "FALKORDB_PASSWORD", ""),

      // Neo4j Configuration
      NEO4J_URI: this.getEnvValue(mapped, "NEO4J_URI", DEFAULTS.NEO4J_URI),
      NEO4J_USER: this.getEnvValue(mapped, "NEO4J_USER", DEFAULTS.NEO4J_USER),
      NEO4J_PASSWORD: this.getEnvValue(mapped, "NEO4J_PASSWORD", DEFAULTS.NEO4J_PASSWORD),

      // Telemetry
      GRAPHITI_TELEMETRY_ENABLED: this.getEnvValue(
        mapped,
        "GRAPHITI_TELEMETRY_ENABLED",
        DEFAULTS.GRAPHITI_TELEMETRY_ENABLED
      ),

      // Container Configuration
      NETWORK_NAME: this.getEnvValue(mapped, "NETWORK_NAME", DEFAULTS.NETWORK_NAME),
      FALKORDB_CONTAINER: this.getEnvValue(mapped, "FALKORDB_CONTAINER", DEFAULTS.FALKORDB_CONTAINER),
      MCP_CONTAINER: this.getEnvValue(mapped, "MCP_CONTAINER", DEFAULTS.MCP_CONTAINER),
      VOLUME_NAME: this.getEnvValue(mapped, "VOLUME_NAME", DEFAULTS.VOLUME_NAME),

      // Port Configuration
      MCP_SERVER_PORT: this.getEnvValue(mapped, "MCP_SERVER_PORT", DEFAULTS.MCP_SERVER_PORT),
      FALKORDB_UI_PORT: this.getEnvValue(mapped, "FALKORDB_UI_PORT", DEFAULTS.FALKORDB_UI_PORT),

      // Store original PAI_KNOWLEDGE_* values
      PAI_PREFIXES: originals,
    };

    return config;
  }

  /**
   * Validate that required configuration is present
   */
  validate(config: KnowledgeConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that at least one API key is configured
    const hasAnyKey =
      !!config.OPENAI_API_KEY ||
      !!config.ANTHROPIC_API_KEY ||
      !!config.GOOGLE_API_KEY ||
      !!config.GROQ_API_KEY;

    if (!hasAnyKey) {
      errors.push("No LLM API key configured (need OPENAI_API_KEY or alternative)");
    }

    // Validate LLM provider
    const validProviders = ["openai", "anthropic", "gemini", "groq"];
    if (!validProviders.includes(config.LLM_PROVIDER)) {
      errors.push(`Invalid LLM_PROVIDER: ${config.LLM_PROVIDER}`);
    }

    // Validate database type
    const validDatabases = ["falkordb", "neo4j"];
    if (!validDatabases.includes(config.DATABASE_TYPE)) {
      errors.push(`Invalid DATABASE_TYPE: ${config.DATABASE_TYPE}`);
    }

    // Validate semaphore limit is a number
    const semaphoreLimit = parseInt(config.SEMAPHORE_LIMIT, 10);
    if (isNaN(semaphoreLimit) || semaphoreLimit < 1) {
      errors.push(`Invalid SEMAPHORE_LIMIT: ${config.SEMAPHORE_LIMIT}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration for container environment variables
   * Maps config to container-friendly env var names
   */
  getContainerEnv(config: KnowledgeConfig): Record<string, string> {
    return {
      OPENAI_API_KEY: config.OPENAI_API_KEY || "",
      ANTHROPIC_API_KEY: config.ANTHROPIC_API_KEY || "",
      GOOGLE_API_KEY: config.GOOGLE_API_KEY || "",
      GROQ_API_KEY: config.GROQ_API_KEY || "",
      VOYAGE_API_KEY: config.VOYAGE_API_KEY || "",
      DATABASE_TYPE: config.DATABASE_TYPE,
      FALKORDB_HOST: config.FALKORDB_HOST || config.FALKORDB_CONTAINER,
      FALKORDB_PORT: config.FALKORDB_PORT || "6379",
      FALKORDB_PASSWORD: config.FALKORDB_PASSWORD || "",
      NEO4J_URI: config.NEO4J_URI || "bolt://localhost:7687",
      NEO4J_USER: config.NEO4J_USER || "neo4j",
      NEO4J_PASSWORD: config.NEO4J_PASSWORD || "demodemo",
      SEMAPHORE_LIMIT: config.SEMAPHORE_LIMIT,
      GRAPHITI_TELEMETRY_ENABLED: config.GRAPHITI_TELEMETRY_ENABLED,
      MODEL_NAME: config.MODEL_NAME,
      LLM_PROVIDER: config.LLM_PROVIDER,
      EMBEDDER_PROVIDER: config.EMBEDDER_PROVIDER,
      GROUP_ID: config.GROUP_ID,
    };
  }

  /**
   * Save configuration to .env file
   */
  async save(config: Partial<KnowledgeConfig>): Promise<void> {
    // Build new content
    let newContent = "# PAI Knowledge System Configuration\n";
    newContent += `# Generated: ${new Date().toISOString()}\n`;
    newContent += "\n";

    // Add API Keys
    if (config.OPENAI_API_KEY) {
      newContent += `PAI_KNOWLEDGE_OPENAI_API_KEY=${config.OPENAI_API_KEY}\n`;
    }
    if (config.ANTHROPIC_API_KEY) {
      newContent += `ANTHROPIC_API_KEY=${config.ANTHROPIC_API_KEY}\n`;
    }
    if (config.GOOGLE_API_KEY) {
      newContent += `GOOGLE_API_KEY=${config.GOOGLE_API_KEY}\n`;
    }
    if (config.GROQ_API_KEY) {
      newContent += `GROQ_API_KEY=${config.GROQ_API_KEY}\n`;
    }

    newContent += "\n";

    // Add LLM Configuration
    if (config.LLM_PROVIDER) {
      newContent += `PAI_KNOWLEDGE_LLM_PROVIDER=${config.LLM_PROVIDER}\n`;
    }
    if (config.EMBEDDER_PROVIDER) {
      newContent += `PAI_KNOWLEDGE_EMBEDDER_PROVIDER=${config.EMBEDDER_PROVIDER}\n`;
    }
    if (config.MODEL_NAME) {
      newContent += `PAI_KNOWLEDGE_MODEL_NAME=${config.MODEL_NAME}\n`;
    }

    newContent += "\n";

    // Add Performance Configuration
    if (config.SEMAPHORE_LIMIT) {
      newContent += `PAI_KNOWLEDGE_SEMAPHORE_LIMIT=${config.SEMAPHORE_LIMIT}\n`;
    }

    newContent += "\n";

    // Add Knowledge Graph Configuration
    if (config.GROUP_ID) {
      newContent += `PAI_KNOWLEDGE_GROUP_ID=${config.GROUP_ID}\n`;
    }

    if (config.DATABASE_TYPE) {
      newContent += `PAI_KNOWLEDGE_DATABASE_TYPE=${config.DATABASE_TYPE}\n`;
    }

    if (config.GRAPHITI_TELEMETRY_ENABLED) {
      newContent += `PAI_KNOWLEDGE_GRAPHITI_TELEMETRY_ENABLED=${config.GRAPHITI_TELEMETRY_ENABLED}\n`;
    }

    // Write to file
    await Bun.write(this.envFile, newContent);
  }
}

/**
 * Create a config loader instance
 */
export function createConfigLoader(packRoot?: string): ConfigLoader {
  return new ConfigLoader(packRoot);
}

/**
 * Load configuration (convenience function)
 */
export async function loadConfig(): Promise<KnowledgeConfig> {
  const loader = new ConfigLoader();
  return await loader.load();
}

/**
 * Validate configuration (convenience function)
 */
export function validateConfig(config: KnowledgeConfig): { valid: boolean; errors: string[] } {
  const loader = new ConfigLoader();
  return loader.validate(config);
}
