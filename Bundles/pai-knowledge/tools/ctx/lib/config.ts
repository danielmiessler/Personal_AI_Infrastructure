/**
 * Configuration management for ctx CLI
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
  contextRoot: string;
}

let cachedConfig: Config | null = null;

/**
 * Reset the config cache (for testing purposes)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

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
 * Load environment variables from all config sources (priority: env > PAI_DIR > fabric)
 */
function loadAllEnv(): Record<string, string> {
  // Use PAI_DIR if set, fallback to ~/.claude
  const paiDir = process.env.PAI_DIR || join(homedir(), ".claude");
  const paiEnvPath = join(paiDir, ".env");
  const fabricEnvPath = join(homedir(), ".config", "fabric", ".env");

  // Load in reverse priority order (later overwrites earlier)
  const fabricEnv = loadEnvFile(fabricEnvPath);
  const paiEnv = loadEnvFile(paiEnvPath);

  // PAI env takes precedence over fabric
  return { ...fabricEnv, ...paiEnv };
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

  // Context root for session logs, migrations, etc.
  const contextRoot =
    process.env.CONTEXT_ROOT ||
    env.CONTEXT_ROOT ||
    join(homedir(), ".claude", "context");

  cachedConfig = {
    vaultPath: resolvedVaultPath,
    metaPath: metaPath.replace(/^~/, homedir()),
    embeddingsDb: embeddingsDb.replace(/^~/, homedir()),
    dailyNoteFormat: process.env.DAILY_NOTE_FORMAT || env.DAILY_NOTE_FORMAT || "%Y-%m-%d",
    scratchPadHeader: process.env.SCRATCH_PAD_HEADER || env.SCRATCH_PAD_HEADER || "# Scratchpad",
    contextRoot: contextRoot.replace(/^~/, homedir()),
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
