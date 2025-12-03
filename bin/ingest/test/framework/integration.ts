/**
 * Integration Test Runner
 *
 * Two modes of operation:
 *
 * 1. Process Pending Mode (`ingest test integration --process-pending`):
 *    - Processes ALL pending messages from the test channel
 *    - Use after manually sending test messages to the test inbox
 *    - True end-to-end Telegram integration testing
 *
 * 2. Send Mode (`ingest test integration --send TEST-ID`):
 *    - Sends a test message to the test channel
 *    - Useful for setting up test data
 *    - NOTE: Bot cannot receive its own messages as updates
 *
 * Workflow for integration testing:
 * 1. User sends test message to PAI Test Inbox channel
 * 2. Run `ingest test integration --process-pending --cleanup`
 * 3. Validates output in vault
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
  getUpdates,
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

  const config = getConfig();
  const timeout = options.timeout || 120000; // 2 minute default

  // Check for test channels
  const inboxChannel = config.testTelegramChannelId || config.telegramChannelId;
  const eventsChannel = config.testTelegramOutboxId || config.telegramOutboxId;

  if (!config.testTelegramChannelId) {
    console.log("⚠️  Warning: TEST_TELEGRAM_CHANNEL_ID not set, using production inbox");
  }
  if (!config.testTelegramOutboxId && eventsChannel) {
    console.log("⚠️  Warning: TEST_TELEGRAM_OUTBOX_ID not set, using production events");
  }

  const startTime = Date.now();

  try {
    // 1. Send test message to inbox
    if (options.verbose) {
      console.log(`\n--- Integration Test: ${spec.id} ---`);
      console.log(`Sending to channel: ${inboxChannel}`);
    }

    const sentMessage = await sendTestMessage(spec, inboxChannel);
    if (!sentMessage) {
      return {
        testId,
        passed: false,
        duration: Date.now() - startTime,
        checks: [],
        error: "Failed to send test message",
      };
    }

    if (options.verbose) {
      console.log(`✓ Message sent: ${sentMessage.message_id}`);
    }

    // 2. Process the message through ingest pipeline
    // This runs `ingest process` which polls the test channel and processes new messages
    if (options.verbose) {
      console.log("Processing message through ingest pipeline...");
    }

    const processResult = await processViaIngest(timeout);
    if (!processResult.success) {
      return {
        testId,
        passed: false,
        duration: Date.now() - startTime,
        checks: [],
        error: processResult.error || "Processing failed",
      };
    }

    if (options.verbose) {
      console.log(`✓ Processing complete`);
      console.log(`  Vault files: ${processResult.vaultFiles.length}`);
    }

    // 3. Validate output
    const testOutput: TestOutput = {
      vaultFiles: processResult.vaultFiles,
      verboseOutput: processResult.verboseOutput,
      dropboxPath: processResult.dropboxPath,
    };

    const result = validateTestOutput(spec, testOutput);
    result.duration = Date.now() - startTime;

    // 4. Cleanup if requested
    if (options.cleanupVault && processResult.vaultFiles.length > 0) {
      for (const file of processResult.vaultFiles) {
        try {
          rmSync(file);
          if (options.verbose) {
            console.log(`  Cleaned up: ${file}`);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }

    return result;
  } catch (err) {
    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      checks: [],
      error: String(err),
    };
  }
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
 * Process messages through the actual ingest pipeline via subprocess
 *
 * This runs `ingest process` which will poll Telegram for new messages
 * and process them through the full pipeline.
 *
 * The flow mirrors production:
 * 1. Message sent to test inbox channel (like iOS shortcut does)
 * 2. `ingest process` polls channel via getUpdates
 * 3. Messages processed through pipeline
 * 4. Output saved to vault + notification to test events channel
 */
async function processViaIngest(
  timeout: number
): Promise<{
  success: boolean;
  vaultFiles: string[];
  verboseOutput: string;
  dropboxPath?: string;
  error?: string;
}> {
  const config = getConfig();
  const vaultPath = config.vaultPath;

  // Track files before processing
  const filesBefore = new Set<string>();
  scanVaultDir(vaultPath, filesBefore);

  // Run ingest process as subprocess
  // This will poll Telegram for new messages and process them
  const ingestPath = join(import.meta.dir, "..", "..", "ingest.ts");

  // Set environment to use test channels (inbox + events)
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  if (config.testTelegramChannelId) {
    env.TELEGRAM_CHANNEL_ID = config.testTelegramChannelId;
  }
  if (config.testTelegramOutboxId) {
    env.TELEGRAM_OUTBOX_ID = config.testTelegramOutboxId;
  }

  try {
    // Small delay to ensure Telegram API has the message available
    await Bun.sleep(1000);

    const proc = Bun.spawn(["bun", "run", ingestPath, "process", "--verbose"], {
      cwd: join(import.meta.dir, "..", ".."),
      env,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Process timeout")), timeout);
    });

    // Wait for process to complete or timeout
    const exitCode = await Promise.race([proc.exited, timeoutPromise]);

    // Capture output
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const verboseOutput = stdout + "\n" + stderr;

    if (exitCode !== 0) {
      return {
        success: false,
        vaultFiles: [],
        verboseOutput,
        error: `Process exited with code ${exitCode}`,
      };
    }

    // Track files after processing
    const filesAfter = new Set<string>();
    scanVaultDir(vaultPath, filesAfter);

    const newFiles = [...filesAfter].filter(f => !filesBefore.has(f));

    // Extract dropbox path from verbose output if present
    let dropboxPath: string | undefined;
    const dropboxMatch = verboseOutput.match(/dropboxPath[=:]\s*["']?([^\s"']+)/);
    if (dropboxMatch) {
      dropboxPath = dropboxMatch[1];
    }

    return {
      success: true,
      vaultFiles: newFiles,
      verboseOutput,
      dropboxPath,
    };
  } catch (err) {
    return {
      success: false,
      vaultFiles: [],
      verboseOutput: "",
      error: String(err),
    };
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
