/**
 * Integration Test Support
 *
 * Integration testing uses a manual workflow with the PAI Test Cases channel:
 *
 * 1. **Populate Test Cases Channel** (`ingest test send --all`):
 *    - Sends all test messages to PAI Test Cases channel
 *    - Creates a library of test inputs that can be forwarded
 *
 * 2. **Run Integration Test**:
 *    - Forward a message from PAI Test Cases to PAI Test Inbox
 *    - The production watch daemon processes it
 *    - Check vault and PAI Test Events for results
 *
 * Why this approach:
 * - Bots cannot receive their own API-sent messages as updates
 * - When a USER forwards a message, the bot receives the update
 * - This tests the real production pipeline
 *
 * Required configuration in ~/.claude/.env:
 * - TEST_TELEGRAM_CHANNEL_ID: PAI Test Inbox
 * - TEST_TELEGRAM_OUTBOX_ID: PAI Test Events
 * - TEST_TELEGRAM_CASES_ID: PAI Test Cases
 */

import { existsSync, rmSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import type { TestSpec, ValidationResult } from "./types";
import { getSpecById } from "../specs";
import { getConfig, resetConfig } from "../../lib/config";
import { validateTestOutput, type TestOutput } from "./validate";
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

// =============================================================================
// Test Channel Functions
// =============================================================================

/**
 * Send a test message to a channel (PAI Test Cases or PAI Test Inbox)
 *
 * Used to populate the PAI Test Cases channel with test inputs.
 */
export async function sendTestMessageToChannel(
  testId: string,
  channelId?: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const spec = getSpecById(testId);
  if (!spec) {
    return { success: false, error: `Test spec not found: ${testId}` };
  }

  const config = getConfig();
  const targetChannel = channelId || config.testTelegramCasesId || config.testTelegramChannelId || config.telegramChannelId;

  const result = await sendTestMessage(spec, targetChannel);
  if (!result) {
    return { success: false, error: "Failed to send message" };
  }

  return { success: true, messageId: result.message_id };
}

/**
 * Load fixture file for a test spec
 */
function loadFixture(spec: TestSpec): { message: any } | null {
  if (!spec.fixture) return null;

  const fixturePath = join(FIXTURES_DIR, spec.fixture);
  if (!existsSync(fixturePath)) return null;

  try {
    const content = readFileSync(fixturePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Send a test message based on spec type
 *
 * Each message is prefixed with [TEST-ID] so it can be identified
 * when processing and validated against the correct test spec.
 *
 * Uses captured fixture file_ids when available to send real files.
 */
async function sendTestMessage(
  spec: TestSpec,
  channelId: string
): Promise<{ message_id: number } | null> {
  const config = getConfig();
  const testIdPrefix = `[${spec.id}] `;

  // Load fixture to get file_id for media types
  const fixture = loadFixture(spec);
  const fixtureMsg = fixture?.message;

  try {
    switch (spec.input.type) {
      case "text":
      case "url": {
        // Get text from fixture or spec example
        const originalText = fixtureMsg?.text || spec.input.example;
        if (!originalText) {
          console.error(`Test ${spec.id} requires example or fixture for text/url type`);
          return null;
        }
        // Prepend test ID to message text
        const text = testIdPrefix + originalText;
        return await sendTextMessage(config.telegramBotToken, channelId, text);
      }

      case "photo": {
        // Get file_id from fixture
        const fileId = fixtureMsg?.photo?.[fixtureMsg.photo.length - 1]?.file_id;
        if (!fileId) {
          console.error(`Test ${spec.id} requires captured fixture with photo file_id`);
          return null;
        }
        // Prepend test ID to caption
        const originalCaption = fixtureMsg?.caption || spec.input.caption || "";
        const caption = testIdPrefix + originalCaption;
        return await sendPhotoByFileId(config.telegramBotToken, channelId, fileId, caption);
      }

      case "document": {
        // Get file_id from fixture
        const fileId = fixtureMsg?.document?.file_id;
        if (!fileId) {
          console.error(`Test ${spec.id} requires captured fixture with document file_id`);
          return null;
        }
        // Prepend test ID to caption
        const originalCaption = fixtureMsg?.caption || spec.input.caption || "";
        const caption = testIdPrefix + originalCaption;
        return await sendDocumentByFileId(config.telegramBotToken, channelId, fileId, caption);
      }

      case "voice": {
        // Get file_id from fixture
        const fileId = fixtureMsg?.voice?.file_id;
        if (!fileId) {
          console.error(`Test ${spec.id} requires captured fixture with voice file_id - send manually first`);
          return null;
        }
        // Voice messages don't support captions in Telegram, but we can add text after
        return await sendVoiceByFileId(config.telegramBotToken, channelId, fileId);
      }

      default:
        console.error(`Unsupported test type: ${spec.input.type}`);
        return null;
    }
  } catch (error) {
    console.error(`Error sending ${spec.id}: ${error}`);
    return null;
  }
}

/**
 * Send text message to channel
 */
async function sendTextMessage(
  token: string,
  channelId: string,
  text: string
): Promise<{ message_id: number } | null> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channelId, text }),
  });
  const result = await response.json() as any;
  if (!result.ok) {
    throw new Error(`Failed to send text: ${result.description}`);
  }
  return { message_id: result.result.message_id };
}

/**
 * Send photo by file_id to channel
 */
async function sendPhotoByFileId(
  token: string,
  channelId: string,
  fileId: string,
  caption?: string
): Promise<{ message_id: number } | null> {
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  const body: any = { chat_id: channelId, photo: fileId };
  if (caption) body.caption = caption;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as any;
  if (!result.ok) {
    throw new Error(`Failed to send photo: ${result.description}`);
  }
  return { message_id: result.result.message_id };
}

/**
 * Send document by file_id to channel
 */
async function sendDocumentByFileId(
  token: string,
  channelId: string,
  fileId: string,
  caption?: string
): Promise<{ message_id: number } | null> {
  const url = `https://api.telegram.org/bot${token}/sendDocument`;
  const body: any = { chat_id: channelId, document: fileId };
  if (caption) body.caption = caption;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json() as any;
  if (!result.ok) {
    throw new Error(`Failed to send document: ${result.description}`);
  }
  return { message_id: result.result.message_id };
}

/**
 * Send voice by file_id to channel
 */
async function sendVoiceByFileId(
  token: string,
  channelId: string,
  fileId: string
): Promise<{ message_id: number } | null> {
  const url = `https://api.telegram.org/bot${token}/sendVoice`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: channelId, voice: fileId }),
  });
  const result = await response.json() as any;
  if (!result.ok) {
    throw new Error(`Failed to send voice: ${result.description}`);
  }
  return { message_id: result.result.message_id };
}

/**
 * Check if integration testing is available
 */
export function checkIntegrationTestConfig(): {
  available: boolean;
  useTestChannels: boolean;
  testCasesChannel?: string;
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
  if (!config.testTelegramCasesId) {
    warnings.push("TEST_TELEGRAM_CASES_ID not set - use TEST_TELEGRAM_CHANNEL_ID for test cases");
  }

  return {
    available: true,
    useTestChannels,
    testCasesChannel: config.testTelegramCasesId,
    warnings,
  };
}

/**
 * Process all pending messages from the test channel
 *
 * This runs `ingest process` with test channel overrides.
 * Use after forwarding messages from PAI Test Cases to PAI Test Inbox.
 */
export async function processPendingTestMessages(options: {
  verbose?: boolean;
  cleanupVault?: boolean;
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

// =============================================================================
// Auto-Validation for Integration Tests
// =============================================================================

/**
 * Extract test ID from file content
 * Looks for [TEST-XXX-NNN] pattern in the content
 */
function extractTestId(content: string): string | null {
  const match = content.match(/\[TEST-[A-Z]+-\d+[a-z]?\]/);
  return match ? match[0].slice(1, -1) : null; // Remove brackets
}

/**
 * Validate recent vault files that contain test IDs
 *
 * Scans vault for recently created files, extracts [TEST-ID] from content,
 * and validates each against its test spec.
 *
 * Usage: `ingest test validate --recent 5` (validates files from last 5 minutes)
 */
export async function validateRecentIntegrationTests(options: {
  minutesAgo?: number;  // How far back to look (default: 10 minutes)
  verbose?: boolean;
  cleanup?: boolean;    // Delete test files after validation
}): Promise<{
  results: ValidationResult[];
  summary: { passed: number; failed: number; skipped: number };
}> {
  const config = getConfig();
  const vaultPath = config.vaultPath;
  const minutesAgo = options.minutesAgo || 10;
  const cutoffTime = Date.now() - (minutesAgo * 60 * 1000);

  const results: ValidationResult[] = [];
  const testFilesMap = new Map<string, string[]>(); // testId -> files[]

  // Scan vault for recent files
  const allFiles = new Set<string>();
  scanVaultDir(vaultPath, allFiles);

  // Filter to recent files and group by test ID
  for (const filePath of allFiles) {
    try {
      const stats = statSync(filePath);
      if (stats.mtimeMs < cutoffTime) continue;

      const content = readFileSync(filePath, "utf-8");
      const testId = extractTestId(content);

      if (testId) {
        if (!testFilesMap.has(testId)) {
          testFilesMap.set(testId, []);
        }
        testFilesMap.get(testId)!.push(filePath);

        if (options.verbose) {
          console.log(`Found ${testId} in: ${filePath}`);
        }
      }
    } catch (e) {
      // Ignore file read errors
    }
  }

  if (options.verbose) {
    console.log(`\nFound ${testFilesMap.size} test(s) in recent vault files\n`);
  }

  // Validate each test
  for (const [testId, files] of testFilesMap) {
    const spec = getSpecById(testId);

    if (!spec) {
      results.push({
        testId,
        passed: false,
        duration: 0,
        checks: [],
        error: `Test spec not found: ${testId}`,
      });
      continue;
    }

    // Build test output from vault files
    const testOutput: TestOutput = {
      vaultFiles: files,
      verboseOutput: "", // Not available for integration tests
    };

    const result = validateTestOutput(spec, testOutput);

    if (options.verbose) {
      const status = result.passed ? "✓ PASS" : "✗ FAIL";
      console.log(`${status}: ${testId} - ${spec.name}`);
      for (const check of result.checks) {
        const checkStatus = check.passed ? "  ✓" : "  ✗";
        console.log(`${checkStatus} ${check.name}`);
        if (!check.passed && check.details) {
          console.log(`      ${check.details}`);
        }
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log();
    }

    results.push(result);

    // Cleanup if requested
    if (options.cleanup) {
      for (const file of files) {
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
  }

  // Calculate summary
  const summary = {
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    skipped: 0,
  };

  return { results, summary };
}
