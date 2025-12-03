/**
 * Integration Test Runner
 *
 * IMPORTANT: Telegram bots CANNOT receive their own messages via getUpdates.
 * Bot-sent messages never appear in updates, so automated send+process won't work.
 *
 * Primary workflow for integration testing:
 * 1. User sends test message to PAI Test Inbox (via Telegram app or iOS shortcut)
 * 2. Run `ingest test integration --process-pending --cleanup`
 * 3. Validates output in vault and PAI Test Events
 *
 * The `--send` mode is only for putting test content in the channel for reference,
 * NOT for automated testing (those messages won't be picked up by getUpdates).
 *
 * Requires test channels to be configured:
 * - TEST_TELEGRAM_CHANNEL_ID: Test inbox channel
 * - TEST_TELEGRAM_OUTBOX_ID: Test events channel
 */

import { existsSync, mkdirSync, rmSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { TestSpec, ValidationResult } from "./types";
import { validateTestOutput, type TestOutput } from "./validate";
import { getSpecById, allIngestSpecs } from "../specs";
import { getConfig, resetConfig } from "../../lib/config";
import {
  sendToInbox,
  sendPhotoToInbox,
  sendDocumentToInbox,
} from "../../lib/telegram";

// =============================================================================
// Constants
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");
const ASSETS_DIR = join(FIXTURES_DIR, "assets");
const OUTPUT_BASE_DIR = join(import.meta.dir, "..", "output");

// =============================================================================
// Integration Test Functions
// =============================================================================

interface IntegrationTestOptions {
  verbose?: boolean;
  cleanupVault?: boolean;  // Delete test notes from vault after validation
  timeout?: number;        // Max time to wait for processing (ms)
}

/**
 * Run a single test through the full Telegram pipeline
 *
 * NOTE: This function cannot work automatically because Telegram bots cannot
 * receive their own messages via getUpdates. Use the workflow:
 * 1. User sends message to PAI Test Inbox manually
 * 2. Run `ingest test integration --process-pending`
 */
export async function runIntegrationTest(
  testId: string,
  options: IntegrationTestOptions = {}
): Promise<ValidationResult> {
  const spec = getSpecById(testId);
  if (!spec) {
    return {
      testId,
      passed: false,
      duration: 0,
      checks: [],
      error: `Test spec not found: ${testId}`,
    };
  }

  // Automated integration tests cannot work because Telegram bots cannot
  // receive their own messages via getUpdates API.
  return {
    testId,
    passed: false,
    duration: 0,
    checks: [],
    error: `Automated integration tests not supported. Telegram bots cannot receive their own messages.

To run integration tests:
1. Send test message to PAI Test Inbox manually (or via iOS shortcut)
2. Run: ingest test integration --process-pending --cleanup

To see what this test would send:
  ingest test send ${testId}`,
  };
}

/**
 * Send a test message based on spec type
 */
async function sendTestMessage(
  spec: TestSpec,
  channelId: string
): Promise<{ message_id: number } | null> {
  // Override channel for sending
  const originalChannel = process.env.TELEGRAM_CHANNEL_ID;
  process.env.TELEGRAM_CHANNEL_ID = channelId;
  resetConfig();

  try {
    switch (spec.input.type) {
      case "text":
      case "url":
        if (!spec.input.example) {
          console.error(`Test ${spec.id} requires example for text/url type`);
          return null;
        }
        return await sendToInbox(spec.input.example) as { message_id: number };

      case "photo": {
        const photoPath = join(ASSETS_DIR, "test-image.png");
        if (!existsSync(photoPath)) {
          console.error(`Test photo not found: ${photoPath}`);
          return null;
        }
        return await sendPhotoToInbox(photoPath, spec.input.caption) as { message_id: number };
      }

      case "document": {
        const docPath = spec.input.filename
          ? join(ASSETS_DIR, spec.input.filename)
          : join(ASSETS_DIR, "test-document.pdf");
        if (!existsSync(docPath)) {
          console.error(`Test document not found: ${docPath}`);
          return null;
        }
        return await sendDocumentToInbox(docPath, spec.input.caption) as { message_id: number };
      }

      case "voice":
        console.error(`Voice tests require manual sending - use 'ingest test capture ${spec.id}'`);
        return null;

      default:
        console.error(`Unsupported test type: ${spec.input.type}`);
        return null;
    }
  } finally {
    // Restore original channel
    if (originalChannel) {
      process.env.TELEGRAM_CHANNEL_ID = originalChannel;
    } else {
      delete process.env.TELEGRAM_CHANNEL_ID;
    }
    resetConfig();
  }
}

/**
 * Scan vault for .md files (recursive)
 */
function scanVaultDir(dir: string, files: Set<string>): void {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "_meta") {
      scanVaultDir(fullPath, files);
    } else if (entry.name.endsWith(".md")) {
      files.add(fullPath);
    }
  }
}

/**
 * Check if integration testing is available
 */
export function checkIntegrationTestConfig(): {
  available: boolean;
  useTestChannels: boolean;
  warnings: string[];
} {
  const config = getConfig();
  const warnings: string[] = [];

  if (!config.telegramBotToken) {
    return { available: false, useTestChannels: false, warnings: ["TELEGRAM_BOT_TOKEN not configured"] };
  }

  const useTestChannels = !!(config.testTelegramChannelId && config.testTelegramOutboxId);

  if (!config.testTelegramChannelId) {
    warnings.push("TEST_TELEGRAM_CHANNEL_ID not set - will use production inbox");
  }
  if (!config.testTelegramOutboxId) {
    warnings.push("TEST_TELEGRAM_OUTBOX_ID not set - will use production events");
  }

  return { available: true, useTestChannels, warnings };
}

/**
 * Process all pending messages from the test channel
 *
 * This is the primary integration testing workflow:
 * 1. User sends test message(s) to PAI Test Inbox
 * 2. Run this function to process them through the full pipeline
 * 3. Validate output
 */
export async function processPendingTestMessages(options: {
  verbose?: boolean;
  cleanupVault?: boolean;
  maxMessages?: number;
}): Promise<{
  processed: number;
  vaultFiles: string[];
  errors: string[];
}> {
  const config = getConfig();
  const testChannelId = config.testTelegramChannelId;

  if (!testChannelId) {
    return {
      processed: 0,
      vaultFiles: [],
      errors: ["TEST_TELEGRAM_CHANNEL_ID not configured"],
    };
  }

  const vaultPath = config.vaultPath;

  // Track files before processing
  const filesBefore = new Set<string>();
  scanVaultDir(vaultPath, filesBefore);

  // Run ingest process with test channel override
  const ingestPath = join(import.meta.dir, "..", "..", "ingest.ts");

  const env: Record<string, string> = { ...process.env as Record<string, string> };
  env.TELEGRAM_CHANNEL_ID = testChannelId;
  if (config.testTelegramOutboxId) {
    env.TELEGRAM_OUTBOX_ID = config.testTelegramOutboxId;
  }

  if (options.verbose) {
    console.log(`Processing messages from test channel: ${testChannelId}`);
  }

  const proc = Bun.spawn(["bun", "run", ingestPath, "process", "--verbose"], {
    cwd: join(import.meta.dir, "..", ".."),
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  if (options.verbose) {
    console.log(stdout);
    if (stderr) console.error(stderr);
  }

  // Track files after processing
  const filesAfter = new Set<string>();
  scanVaultDir(vaultPath, filesAfter);

  const newFiles = [...filesAfter].filter(f => !filesBefore.has(f));

  // Count processed messages from output
  const processedMatches = stdout.match(/Processing.*message_id=/g);
  const processed = processedMatches?.length || 0;

  // Cleanup if requested
  if (options.cleanupVault && newFiles.length > 0) {
    for (const file of newFiles) {
      try {
        rmSync(file);
        if (options.verbose) {
          console.log(`Cleaned up: ${file}`);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  return {
    processed,
    vaultFiles: newFiles,
    errors: exitCode !== 0 ? [`Process exited with code ${exitCode}`] : [],
  };
}

/**
 * Send a test message to the test inbox channel
 *
 * Useful for setting up test data, but note that the bot cannot
 * receive its own messages - so you'll need a human to send
 * messages for true end-to-end testing.
 */
export async function sendTestMessageToChannel(
  testId: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const spec = getSpecById(testId);
  if (!spec) {
    return { success: false, error: `Test spec not found: ${testId}` };
  }

  const config = getConfig();
  const channelId = config.testTelegramChannelId || config.telegramChannelId;

  const result = await sendTestMessage(spec, channelId);
  if (!result) {
    return { success: false, error: "Failed to send message" };
  }

  return { success: true, messageId: result.message_id };
}
