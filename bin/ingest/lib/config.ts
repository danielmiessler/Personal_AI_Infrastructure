/**
 * Configuration for ingest CLI
 * Reads from environment, ~/.claude/.env, and ~/.config/fabric/.env
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface IngestConfig {
  telegramBotToken: string;        // For reading/polling (watch command)
  telegramSenderBotToken: string;  // For sending (direct command, notifications)
  telegramChannelId: string;
  telegramOutboxId?: string;  // Optional channel for notifications/results
  // Test channel overrides (for test isolation)
  testTelegramChannelId?: string;  // Test inbox channel
  testTelegramOutboxId?: string;   // Test events channel
  testTelegramCasesId?: string;    // Test cases library channel
  vaultPath: string;
  vaultName?: string;  // For Obsidian deep links
  stateDb: string;
  tempDir: string;
  openaiApiKey?: string;
  jinaApiKey?: string;  // Optional: for higher Jina AI rate limits
  dropboxArchivePath?: string;  // Path for archive sync
}

let cachedConfig: IngestConfig | null = null;

/**
 * Reset config cache (for testing)
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

  // Sender token for direct command and notifications (falls back to bot token)
  const telegramSenderBotToken =
    process.env.TELEGRAM_SENDER_BOT_TOKEN ||
    env.TELEGRAM_SENDER_BOT_TOKEN ||
    telegramBotToken;

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

  // Optional API keys
  const openaiApiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
  const jinaApiKey = process.env.JINA_API_KEY || env.JINA_API_KEY;

  // Dropbox archive path (for archive/receipt sync)
  const dropboxArchivePath =
    process.env.DROPBOX_ARCHIVE_PATH ||
    env.DROPBOX_ARCHIVE_PATH ||
    join(homedir(), "Dropbox", "document", "_archive");

  // Test channel overrides (for integration testing with isolated channels)
  const testTelegramChannelId =
    process.env.TEST_TELEGRAM_CHANNEL_ID || env.TEST_TELEGRAM_CHANNEL_ID;
  const testTelegramOutboxId =
    process.env.TEST_TELEGRAM_OUTBOX_ID || env.TEST_TELEGRAM_OUTBOX_ID;
  const testTelegramCasesId =
    process.env.TEST_TELEGRAM_CASES_ID || env.TEST_TELEGRAM_CASES_ID;

  cachedConfig = {
    telegramBotToken,
    telegramSenderBotToken,
    telegramChannelId,
    telegramOutboxId,
    testTelegramChannelId,
    testTelegramOutboxId,
    testTelegramCasesId,
    vaultPath: resolvedVaultPath,
    vaultName,
    stateDb: stateDb.replace(/^~/, homedir()),
    tempDir: tempDir.replace(/^~/, homedir()),
    openaiApiKey,
    jinaApiKey,
    dropboxArchivePath: dropboxArchivePath.replace(/^~/, homedir()),
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
