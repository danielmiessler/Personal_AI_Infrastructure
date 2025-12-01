/**
 * Configuration for ingest CLI
 * Reads from environment, ~/.claude/.env, and ~/.config/fabric/.env
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface IngestConfig {
  telegramBotToken: string;
  telegramChannelId: string;
  telegramOutboxId?: string;  // Optional channel for notifications/results
  vaultPath: string;
  vaultName?: string;  // For Obsidian deep links
  stateDb: string;
  tempDir: string;
  openaiApiKey?: string;
}

let cachedConfig: IngestConfig | null = null;

/**
 * Load environment variables from a .env file
 */
function loadEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};

  if (existsSync(path)) {
    try {
      const lines = readFileSync(path, "utf-8").split("\n");
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
 * Load environment from multiple sources (priority: env > claude > fabric)
 */
function loadAllEnv(): Record<string, string> {
  const claudeEnvPath = join(homedir(), ".claude", ".env");
  const fabricEnvPath = join(homedir(), ".config", "fabric", ".env");

  // Load in reverse priority order (later overwrites earlier)
  const fabricEnv = loadEnvFile(fabricEnvPath);
  const claudeEnv = loadEnvFile(claudeEnvPath);

  // Claude env takes precedence over fabric
  return { ...fabricEnv, ...claudeEnv };
}

/**
 * Get configuration
 */
export function getConfig(): IngestConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = loadAllEnv();

  const telegramBotToken =
    process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || "";

  const telegramChannelId =
    process.env.TELEGRAM_CHANNEL_ID || env.TELEGRAM_CHANNEL_ID || "";

  const telegramOutboxId =
    process.env.TELEGRAM_OUTBOX_ID || env.TELEGRAM_OUTBOX_ID || undefined;

  const vaultPath =
    process.env.OBSIDIAN_VAULT_PATH ||
    env.OBSIDIAN_VAULT_PATH ||
    process.env.FABRIC_OUTPUT_PATH ||
    env.FABRIC_OUTPUT_PATH ||
    join(homedir(), "Documents", "vault");

  const resolvedVaultPath = vaultPath.replace(/^~/, homedir());

  // Extract vault name from path for Obsidian deep links
  // Can be overridden with OBSIDIAN_VAULT_NAME
  const vaultName =
    process.env.OBSIDIAN_VAULT_NAME ||
    env.OBSIDIAN_VAULT_NAME ||
    resolvedVaultPath.split("/").pop();

  const stateDb =
    process.env.INGEST_STATE_DB ||
    env.INGEST_STATE_DB ||
    join(resolvedVaultPath, "_meta", "ingest.db");

  const tempDir =
    process.env.INGEST_TEMP_DIR ||
    env.INGEST_TEMP_DIR ||
    join(homedir(), ".cache", "pai-ingest");

  cachedConfig = {
    telegramBotToken,
    telegramChannelId,
    telegramOutboxId,
    vaultPath: resolvedVaultPath,
    vaultName,
    stateDb: stateDb.replace(/^~/, homedir()),
    tempDir: tempDir.replace(/^~/, homedir()),
    openaiApiKey: process.env.OPENAI_API_KEY || env.OPENAI_API_KEY,
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
      "TELEGRAM_BOT_TOKEN not set. Add it to ~/.claude/.env or ~/.config/fabric/.env"
    );
  }

  if (!config.telegramChannelId) {
    throw new Error(
      "TELEGRAM_CHANNEL_ID not set. Add it to ~/.claude/.env or ~/.config/fabric/.env"
    );
  }

  if (!existsSync(config.vaultPath)) {
    throw new Error(`Vault path does not exist: ${config.vaultPath}`);
  }
}
