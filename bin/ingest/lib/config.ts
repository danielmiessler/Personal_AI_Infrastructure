/**
 * Configuration for ingest CLI
 * Reads from environment and ~/.config/fabric/.env
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface IngestConfig {
  telegramBotToken: string;
  telegramChannelId: string;
  vaultPath: string;
  stateDb: string;
  tempDir: string;
  openaiApiKey?: string;
}

let cachedConfig: IngestConfig | null = null;

/**
 * Load environment variables from fabric config
 */
function loadFabricEnv(): Record<string, string> {
  const fabricEnvPath = join(homedir(), ".config", "fabric", ".env");
  const env: Record<string, string> = {};

  if (existsSync(fabricEnvPath)) {
    try {
      const lines = readFileSync(fabricEnvPath, "utf-8").split("\n");
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
 * Get configuration
 */
export function getConfig(): IngestConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fabricEnv = loadFabricEnv();

  const telegramBotToken =
    process.env.TELEGRAM_BOT_TOKEN || fabricEnv.TELEGRAM_BOT_TOKEN || "";

  const telegramChannelId =
    process.env.TELEGRAM_CHANNEL_ID || fabricEnv.TELEGRAM_CHANNEL_ID || "";

  const vaultPath =
    process.env.OBSIDIAN_VAULT_PATH ||
    fabricEnv.OBSIDIAN_VAULT_PATH ||
    process.env.FABRIC_OUTPUT_PATH ||
    fabricEnv.FABRIC_OUTPUT_PATH ||
    join(homedir(), "Documents", "vault");

  const resolvedVaultPath = vaultPath.replace(/^~/, homedir());

  const stateDb =
    process.env.INGEST_STATE_DB ||
    fabricEnv.INGEST_STATE_DB ||
    join(resolvedVaultPath, "_meta", "ingest.db");

  const tempDir =
    process.env.INGEST_TEMP_DIR ||
    fabricEnv.INGEST_TEMP_DIR ||
    join(homedir(), ".cache", "pai-ingest");

  cachedConfig = {
    telegramBotToken,
    telegramChannelId,
    vaultPath: resolvedVaultPath,
    stateDb: stateDb.replace(/^~/, homedir()),
    tempDir: tempDir.replace(/^~/, homedir()),
    openaiApiKey: process.env.OPENAI_API_KEY || fabricEnv.OPENAI_API_KEY,
  };

  return cachedConfig;
}

/**
 * Validate required configuration
 */
export function validateConfig(): void {
  const config = getConfig();

  if (!config.telegramBotToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN not set. Add it to ~/.config/fabric/.env"
    );
  }

  if (!config.telegramChannelId) {
    throw new Error(
      "TELEGRAM_CHANNEL_ID not set. Add it to ~/.config/fabric/.env"
    );
  }

  if (!existsSync(config.vaultPath)) {
    throw new Error(`Vault path does not exist: ${config.vaultPath}`);
  }
}
