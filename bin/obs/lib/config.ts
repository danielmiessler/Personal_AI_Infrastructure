/**
 * Configuration management for obs CLI
 * Reads from environment variables and ~/.config/fabric/.env
 */

import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface Config {
  vaultPath: string;
  metaPath: string;
  embeddingsDb: string;
  dailyNoteFormat: string;
  scratchPadHeader: string;
}

let cachedConfig: Config | null = null;

/**
 * Load environment variables from a .env file
 */
function loadEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};

  if (existsSync(path)) {
    try {
      // Parse .env file synchronously for startup
      const lines = require("fs").readFileSync(path, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join("=").trim();
          }
        }
      }
    } catch (error) {
      // Ignore errors reading config
    }
  }

  return env;
}

/**
 * Load environment variables from all config sources (priority: env > claude > fabric)
 */
function loadAllEnv(): Record<string, string> {
  const fabricEnvPath = join(homedir(), ".config", "fabric", ".env");
  const claudeEnvPath = join(homedir(), ".claude", ".env");

  // Load in reverse priority order (later overwrites earlier)
  const fabricEnv = loadEnvFile(fabricEnvPath);
  const claudeEnv = loadEnvFile(claudeEnvPath);

  // Claude env takes precedence over fabric
  return { ...fabricEnv, ...claudeEnv };
}

/**
 * Get configuration, loading from environment and config files
 */
export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = loadAllEnv();

  // Resolve vault path with fallbacks
  const vaultPath =
    process.env.OBSIDIAN_VAULT_PATH ||
    env.OBSIDIAN_VAULT_PATH ||
    process.env.FABRIC_OUTPUT_PATH ||
    env.FABRIC_OUTPUT_PATH ||
    join(homedir(), "Documents", "vault");

  // Expand ~ in path
  const resolvedVaultPath = vaultPath.replace(/^~/, homedir());

  const metaPath =
    process.env.OBSIDIAN_META_PATH ||
    env.OBSIDIAN_META_PATH ||
    join(resolvedVaultPath, "_meta");

  const embeddingsDb =
    process.env.CONTEXT_EMBEDDINGS_DB ||
    env.CONTEXT_EMBEDDINGS_DB ||
    join(metaPath, "embeddings.db");

  cachedConfig = {
    vaultPath: resolvedVaultPath,
    metaPath: metaPath.replace(/^~/, homedir()),
    embeddingsDb: embeddingsDb.replace(/^~/, homedir()),
    dailyNoteFormat: process.env.DAILY_NOTE_FORMAT || env.DAILY_NOTE_FORMAT || "%Y-%m-%d",
    scratchPadHeader: process.env.SCRATCH_PAD_HEADER || env.SCRATCH_PAD_HEADER || "# Scratchpad",
  };

  return cachedConfig;
}

/**
 * Validate that vault path exists
 */
export function validateVault(): void {
  const config = getConfig();
  if (!existsSync(config.vaultPath)) {
    throw new Error(`Vault path does not exist: ${config.vaultPath}`);
  }
}
