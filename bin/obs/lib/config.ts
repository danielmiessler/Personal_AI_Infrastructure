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
 * Load environment variables from fabric config
 */
function loadFabricEnv(): Record<string, string> {
  const fabricEnvPath = join(homedir(), ".config", "fabric", ".env");
  const env: Record<string, string> = {};

  if (existsSync(fabricEnvPath)) {
    try {
      const content = Bun.file(fabricEnvPath).text();
      // Parse .env file synchronously for startup
      const lines = require("fs").readFileSync(fabricEnvPath, "utf-8").split("\n");
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
      // Ignore errors reading fabric config
    }
  }

  return env;
}

/**
 * Get configuration, loading from environment and fabric config
 */
export function getConfig(): Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fabricEnv = loadFabricEnv();

  // Resolve vault path with fallbacks
  const vaultPath =
    process.env.OBSIDIAN_VAULT_PATH ||
    fabricEnv.OBSIDIAN_VAULT_PATH ||
    process.env.FABRIC_OUTPUT_PATH ||
    fabricEnv.FABRIC_OUTPUT_PATH ||
    join(homedir(), "Documents", "vault");

  // Expand ~ in path
  const resolvedVaultPath = vaultPath.replace(/^~/, homedir());

  const metaPath =
    process.env.OBSIDIAN_META_PATH ||
    fabricEnv.OBSIDIAN_META_PATH ||
    join(resolvedVaultPath, "_meta");

  const embeddingsDb =
    process.env.CONTEXT_EMBEDDINGS_DB ||
    fabricEnv.CONTEXT_EMBEDDINGS_DB ||
    join(metaPath, "embeddings.db");

  cachedConfig = {
    vaultPath: resolvedVaultPath,
    metaPath: metaPath.replace(/^~/, homedir()),
    embeddingsDb: embeddingsDb.replace(/^~/, homedir()),
    dailyNoteFormat: process.env.DAILY_NOTE_FORMAT || fabricEnv.DAILY_NOTE_FORMAT || "%Y-%m-%d",
    scratchPadHeader: process.env.SCRATCH_PAD_HEADER || fabricEnv.SCRATCH_PAD_HEADER || "# Scratchpad",
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
