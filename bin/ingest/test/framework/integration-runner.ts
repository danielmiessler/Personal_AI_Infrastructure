/**
 * Integration Test Runner
 *
 * Executes tests by forwarding real Telegram messages and processing them directly.
 * No external watcher needed - the test handles everything in a single process.
 *
 * Flow:
 * 1. Forward fixture message from Test Cases → Test Inbox
 * 2. Call processMessage() directly on the forwarded message
 * 3. Validate vault output against spec.expected
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { parse as parseYaml } from "yaml";
import type { TestSpec, ValidationResult, ValidationCheck, TestCategory, Fixture } from "./types";
import { getSpecById, getSpecsByCategory, allIngestSpecs } from "../specs";
import { loadFixtureFromPath, fixtureExists } from "./capture";
import { getConfig } from "../../lib/config";
import { processMessage, saveToVault, type ProcessResult } from "../../lib/process";
import { loadProfile } from "../../lib/profiles";
import type { ContentType, TelegramMessage } from "../../lib/telegram";

// =============================================================================
// Types
// =============================================================================

export interface IntegrationOptions {
  testId?: string;
  suite?: TestCategory;
  all?: boolean;
  verbose?: boolean;
  timeout?: number;  // Default 90s, voice tests may need more
  dryRun?: boolean;  // Just show what would be done
  parallel?: boolean;  // Run tests in parallel
  concurrency?: number;  // Max concurrent tests (default: 5)
}

export interface IntegrationResult extends ValidationResult {
  processingTime: number;  // Time for direct processing
  processResult?: ProcessResult;
  vaultFilePath?: string;
  dropboxFilePath?: string;
  // Detailed info for reporting
  spec?: {
    id: string;
    name: string;
    category: string;
    inputType: string;
    inputExample?: string;
    inputCaption?: string;
  };
  actualOutput?: {
    pipeline?: string;
    tags?: string[];
    scope?: string;
    vaultPath?: string;
    content?: string;  // First 500 chars of vault content
  };
  expectedOutput?: {
    pipeline?: string;
    tags?: string[];
    frontmatter?: Record<string, unknown>;
  };
}

// EventsPayload kept for reference but not used in direct processing approach
// (Integration tests now call processMessage directly instead of polling Events)

interface IntegrationRunSummary {
  startedAt: string;
  completedAt: string;
  duration: number;
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  results: IntegrationResult[];
}

// =============================================================================
// Constants
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");
const DEFAULT_TIMEOUT = 90000;  // 90 seconds
const VOICE_TIMEOUT = 120000;   // 2 minutes for voice tests

// =============================================================================
// Telegram API Helpers
// =============================================================================

/**
 * Determine content type from a Telegram message
 */
function getContentTypeFromMessage(msg: TelegramMessage): ContentType {
  if (msg.voice) return "voice";
  if (msg.audio) return "voice"; // Audio files use voice pipeline
  if (msg.photo) return "photo";
  if (msg.document) return "document";
  // Check if text contains a URL
  if (msg.text) {
    const urlPattern = /https?:\/\/[^\s]+/;
    if (urlPattern.test(msg.text)) return "url";
  }
  return "text";
}

/**
 * Forward a message from one channel to another
 * Returns the full forwarded message object
 */
async function forwardMessage(
  fromChatId: string,
  toChatId: string,
  messageId: number
): Promise<{ ok: boolean; result?: TelegramMessage; description?: string }> {
  const config = getConfig();
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/forwardMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from_chat_id: fromChatId,
      chat_id: toChatId,
      message_id: messageId,
    }),
  });

  return response.json();
}

/**
 * Send a test message directly to a channel
 * Returns the full sent message object
 */
async function sendTestMessageDirect(
  spec: TestSpec,
  channelId: string,
  fixture: { message: any; _meta?: any }
): Promise<{ ok: boolean; result?: TelegramMessage; description?: string }> {
  const config = getConfig();
  const testIdPrefix = `[${spec.id}] `;
  const fixtureMsg = fixture.message;

  try {
    switch (spec.input.type) {
      case "text":
      case "url": {
        const originalText = fixtureMsg?.text || spec.input.example;
        if (!originalText) {
          return { ok: false, description: `No text content for ${spec.id}` };
        }
        // Strip any existing test ID prefix to avoid duplication
        const cleanText = originalText.replace(/^\[TEST-[A-Z]+-\d+[a-z]?\]\s*/, "");
        const text = testIdPrefix + cleanText;

        const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channelId, text }),
        });
        return response.json();
      }

      case "photo": {
        const fileId = fixtureMsg?.photo?.[fixtureMsg.photo.length - 1]?.file_id;
        if (!fileId) {
          return { ok: false, description: `No photo file_id in fixture for ${spec.id}` };
        }
        const originalCaption = fixtureMsg?.caption || spec.input.caption || "";
        const cleanCaption = originalCaption.replace(/^\[TEST-[A-Z]+-\d+[a-z]?\]\s*/, "");
        const caption = testIdPrefix + cleanCaption;

        const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendPhoto`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channelId, photo: fileId, caption }),
        });
        return response.json();
      }

      case "document": {
        const fileId = fixtureMsg?.document?.file_id;
        const isValidFileId = fileId && !fileId.includes("REDACTED") && fileId.length > 20;

        const originalCaption = spec.input.caption || fixtureMsg?.caption || "";
        const cleanCaption = originalCaption.replace(/^\[TEST-[A-Z]+-\d+[a-z]?\]\s*/, "");
        const caption = testIdPrefix + cleanCaption;

        // If file_id is invalid but we have a local asset, upload it
        if (!isValidFileId && fixture._meta?.mediaFile) {
          const assetPath = join(__dirname, "../fixtures", fixture._meta.mediaFile);
          if (existsSync(assetPath)) {
            const fileName = basename(assetPath);
            const fileContent = readFileSync(assetPath);

            // Upload using multipart form data
            const formData = new FormData();
            formData.append("chat_id", channelId);
            formData.append("document", new Blob([fileContent]), fileName);
            if (caption) formData.append("caption", caption);

            const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendDocument`;
            const response = await fetch(url, {
              method: "POST",
              body: formData,
            });
            return response.json();
          }
          return { ok: false, description: `Local asset not found: ${assetPath}` };
        }

        if (!isValidFileId) {
          return { ok: false, description: `No valid document file_id in fixture for ${spec.id}` };
        }

        const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendDocument`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: channelId, document: fileId, caption }),
        });
        return response.json();
      }

      case "voice":
      case "audio": {
        const fileId = fixtureMsg?.voice?.file_id || fixtureMsg?.audio?.file_id;
        if (!fileId) {
          return { ok: false, description: `No voice/audio file_id in fixture for ${spec.id}` };
        }
        // Voice messages can have captions with hints (e.g., #project @person)
        // Prefer spec.input.caption (what we're testing) over fixture caption
        const originalCaption = spec.input.caption || fixtureMsg?.caption || "";
        const cleanCaption = originalCaption.replace(/^\[TEST-[A-Z]+-\d+[a-z]?\]\s*/, "");
        const caption = cleanCaption ? testIdPrefix + cleanCaption : "";

        const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendVoice`;
        const body: Record<string, unknown> = { chat_id: channelId, voice: fileId };
        if (caption) body.caption = caption;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return response.json();
      }

      default:
        return { ok: false, description: `Unsupported test type: ${spec.input.type}` };
    }
  } catch (error) {
    return { ok: false, description: String(error) };
  }
}

// =============================================================================
// Vault File Search
// =============================================================================

/**
 * Find vault file containing test ID
 * Searches by filename first, then content
 */
function findVaultFileByTestId(
  vaultPath: string,
  testId: string,
  afterTimestamp: Date
): string | null {
  const candidates: { path: string; mtime: Date }[] = [];

  function scan(dir: string) {
    if (!existsSync(dir)) return;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip special directories
        if (entry.name === "_meta" || entry.name === "node_modules") continue;
        scan(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const stat = statSync(fullPath);
        // Only consider files modified after we started the test
        if (stat.mtime >= afterTimestamp) {
          candidates.push({ path: fullPath, mtime: stat.mtime });
        }
      }
    }
  }

  scan(vaultPath);

  // Sort by mtime descending (newest first)
  candidates.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // Check each candidate for test ID
  for (const { path } of candidates) {
    const content = readFileSync(path, "utf-8");
    // Check filename and content for test ID
    if (basename(path).includes(testId) || content.includes(testId)) {
      return path;
    }
  }

  // For voice tests without caption, may need broader search
  // Return newest file as fallback
  return candidates.length > 0 ? candidates[0].path : null;
}

/**
 * Parse vault file frontmatter
 */
function parseVaultFile(filepath: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  if (!existsSync(filepath)) {
    return { frontmatter: {}, content: "" };
  }

  const text = readFileSync(filepath, "utf-8");

  if (!text.startsWith("---")) {
    return { frontmatter: {}, content: text };
  }

  const endIndex = text.indexOf("---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, content: text };
  }

  const yamlStr = text.slice(3, endIndex).trim();
  const content = text.slice(endIndex + 3).trim();

  try {
    const frontmatter = parseYaml(yamlStr) as Record<string, unknown>;
    return { frontmatter, content };
  } catch {
    return { frontmatter: {}, content: text };
  }
}

// =============================================================================
// Main Runner
// =============================================================================

/**
 * Run a single integration test
 */
export async function runIntegrationTest(
  testId: string,
  options: IntegrationOptions = {}
): Promise<IntegrationResult> {
  const startTime = Date.now();
  const startDate = new Date();
  const checks: ValidationCheck[] = [];

  const spec = getSpecById(testId);
  if (!spec) {
    return {
      testId,
      passed: false,
      duration: 0,
      processingTime: 0,
      checks: [],
      error: `Test spec not found: ${testId}`,
    };
  }

  // Check if test should be skipped
  if (spec.meta?.skip) {
    return {
      testId,
      passed: true,
      duration: 0,
      processingTime: 0,
      checks: [{ name: "skipped", passed: true, expected: spec.meta.skip }],
    };
  }

  // Load fixture
  if (!fixtureExists(testId)) {
    return {
      testId,
      passed: false,
      duration: 0,
      processingTime: 0,
      checks: [],
      error: `Fixture not found: ${testId}`,
    };
  }

  const fixturePath = join(FIXTURES_DIR, spec.fixture);
  const fixture = loadFixtureFromPath(fixturePath);
  if (!fixture) {
    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      processingTime: 0,
      checks: [],
      error: `Failed to load fixture: ${fixturePath}`,
    };
  }

  const config = getConfig();

  // Get channel IDs - only need Test Inbox for direct send approach
  const testInboxChannelId = config.testTelegramChannelId || config.telegramChannelId;

  if (!testInboxChannelId) {
    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      processingTime: 0,
      checks: [],
      error: "Missing channel ID. Need TEST_TELEGRAM_CHANNEL_ID or TELEGRAM_CHANNEL_ID",
    };
  }

  if (options.verbose) {
    console.log(`\n--- ${testId}: ${spec.name} ---`);
    console.log(`Sending test message to inbox...`);
  }

  // Dry run mode - just show what would happen
  if (options.dryRun) {
    console.log(`[DRY RUN] Would send ${spec.input.type} message to ${testInboxChannelId}`);
    return {
      testId,
      passed: true,
      duration: Date.now() - startTime,
      processingTime: 0,
      checks: [{ name: "dry_run", passed: true }],
    };
  }

  // Send test message directly to test inbox (no forwarding needed)
  const sendResult = await sendTestMessageDirect(spec, testInboxChannelId, fixture);

  if (!sendResult.ok) {
    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      processingTime: 0,
      checks: [],
      error: `Send failed: ${sendResult.description}`,
    };
  }

  const sentMessage = sendResult.result!;

  checks.push({
    name: "message_sent",
    passed: true,
    actual: sentMessage.message_id,
  });

  if (options.verbose) {
    console.log(`Sent as message ${sentMessage.message_id}`);
    console.log(`Processing message directly...`);
  }

  // Determine content type from message
  const contentType = getContentTypeFromMessage(sentMessage);

  // Get test profile (uses test vault path if configured)
  const profile = loadProfile();

  // Determine timeout - voice tests need more time
  const isVoiceTest = spec.input.type === "voice" || spec.input.type === "audio";
  const timeout = options.timeout || (isVoiceTest ? VOICE_TIMEOUT : DEFAULT_TIMEOUT);

  // Call processMessage directly - no watcher needed, no Events polling!
  // Note: processMessage will send Events notifications; consider adding skipNotify support
  const processStart = Date.now();
  let processResult: ProcessResult;

  try {
    processResult = await processMessage(sentMessage, contentType, profile);
  } catch (error) {
    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      processingTime: Date.now() - processStart,
      checks,
      error: `Process failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const processingTime = Date.now() - processStart;

  if (!processResult.success) {
    checks.push({
      name: "process_success",
      passed: false,
      error: processResult.error || "Processing failed",
    });

    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      processingTime,
      checks,
      error: processResult.error || "Processing failed",
    };
  }

  // Save processed content to vault (processMessage only processes, doesn't save)
  const savedPaths: string[] = [];
  if (processResult.content) {
    for (const processed of processResult.content) {
      const isWisdom = !!processed.processedContent;
      try {
        const saveResult = await saveToVault(processed, profile, isWisdom);
        if (saveResult.vaultPath) {
          savedPaths.push(saveResult.vaultPath);
          if (options.verbose) {
            console.log(`  Saved: ${saveResult.vaultPath}`);
          }
        }
      } catch (saveError) {
        if (options.verbose) {
          console.log(`  Save error: ${saveError}`);
        }
      }
    }
  }

  // Extract first content item for validation
  const firstContent = processResult.content?.[0];
  const pipeline = firstContent?.pipeline;
  const contentTags = firstContent?.tags || [];

  checks.push({
    name: "process_success",
    passed: true,
    actual: pipeline,
  });

  if (options.verbose) {
    console.log(`Processing complete: ${pipeline} pipeline (${processingTime}ms)`);
    if (firstContent?.originalFilePath) {
      console.log(`Output: ${firstContent.originalFilePath}`);
    }
  }

  // Validate pipeline
  if (spec.expected.pipeline) {
    const pipelineMatch = pipeline?.toLowerCase() === spec.expected.pipeline.toLowerCase();
    checks.push({
      name: `pipeline:${spec.expected.pipeline}`,
      passed: pipelineMatch,
      expected: spec.expected.pipeline,
      actual: pipeline,
    });
  }

  // Validate Dropbox sync
  if (spec.expected.dropboxSync) {
    const hasDropbox = !!firstContent?.originalFilePath;
    checks.push({
      name: "dropbox_sync",
      passed: hasDropbox,
      expected: true,
      actual: hasDropbox,
    });
  }

  // Find and validate vault file
  let vaultFilePath: string | undefined;
  let vaultFrontmatter: Record<string, unknown> = {};
  let vaultContent = "";

  // Use saved paths from our saveToVault calls first (most reliable)
  if (savedPaths.length > 0) {
    vaultFilePath = savedPaths[0];
  }

  // Fallback: Use original file path from processResult if available
  if (!vaultFilePath && firstContent?.originalFilePath && config.obsidianVaultPath) {
    const fullPath = join(config.obsidianVaultPath, firstContent.originalFilePath);
    if (existsSync(fullPath)) {
      vaultFilePath = fullPath;
    }
  }

  // Fallback: search by test ID
  if (!vaultFilePath && config.obsidianVaultPath) {
    vaultFilePath = findVaultFileByTestId(config.obsidianVaultPath, testId, startDate) || undefined;
  }

  if (vaultFilePath) {
    const parsed = parseVaultFile(vaultFilePath);
    vaultFrontmatter = parsed.frontmatter;
    vaultContent = parsed.content;

    checks.push({
      name: "vault_file_created",
      passed: true,
      actual: basename(vaultFilePath),
    });
  } else if (processResult.success) {
    checks.push({
      name: "vault_file_created",
      passed: false,
      error: "Vault file not found",
    });
  }

  // Validate tags - use vault frontmatter tags, fall back to processResult contentTags
  if (spec.expected.tags) {
    const vaultTags = (vaultFrontmatter.tags as string[]) || [];
    const tags = vaultTags.length > 0 ? vaultTags : contentTags;
    for (const expectedTag of spec.expected.tags) {
      const found = tags.some(t =>
        t.toLowerCase() === expectedTag.toLowerCase() ||
        t.toLowerCase().replace(/-/g, "_") === expectedTag.toLowerCase().replace(/-/g, "_")
      );
      checks.push({
        name: `tag_present:${expectedTag}`,
        passed: found,
        expected: expectedTag,
        actual: tags,
        error: found ? undefined : `Tag "${expectedTag}" not found`,
      });
    }
  }

  // Validate excluded tags
  if (spec.expected.excludeTags) {
    const vaultTags = (vaultFrontmatter.tags as string[]) || [];
    const tags = vaultTags.length > 0 ? vaultTags : contentTags;
    for (const excludedTag of spec.expected.excludeTags) {
      const found = tags.some(t => t.toLowerCase() === excludedTag.toLowerCase());
      checks.push({
        name: `tag_absent:${excludedTag}`,
        passed: !found,
        expected: `NOT ${excludedTag}`,
        actual: tags,
        error: found ? `Tag "${excludedTag}" should not be present` : undefined,
      });
    }
  }

  // Validate frontmatter fields
  if (spec.expected.frontmatter) {
    for (const [key, expectedValue] of Object.entries(spec.expected.frontmatter)) {
      const actualValue = vaultFrontmatter[key];
      let passed: boolean;

      if (expectedValue === "string") {
        passed = typeof actualValue === "string";
      } else {
        passed = actualValue === expectedValue;
      }

      checks.push({
        name: `frontmatter:${key}`,
        passed,
        expected: expectedValue,
        actual: actualValue,
        error: passed ? undefined : `Frontmatter "${key}" mismatch`,
      });
    }
  }

  // Validate content - check across ALL saved files (Raw, Wisdom, etc.)
  if (spec.expected.content?.contains) {
    // Combine content from all saved files for pattern tests
    let allContent = vaultContent;
    if (savedPaths.length > 1) {
      for (let i = 1; i < savedPaths.length; i++) {
        const parsed = parseVaultFile(savedPaths[i]);
        allContent += "\n" + parsed.content;
      }
    }

    for (const expectedText of spec.expected.content.contains) {
      const found = allContent.toLowerCase().includes(expectedText.toLowerCase());
      checks.push({
        name: `content_contains:${expectedText.slice(0, 20)}`,
        passed: found,
        expected: expectedText,
        error: found ? undefined : `Content missing: "${expectedText}"`,
      });
    }
  }

  // Validate archive filename
  if (spec.expected.archiveFilenamePattern && processResult.dropboxPath) {
    const pattern = new RegExp(spec.expected.archiveFilenamePattern, "i");
    const filename = basename(processResult.dropboxPath);
    const matched = pattern.test(filename);
    checks.push({
      name: "archive_filename_pattern",
      passed: matched,
      expected: spec.expected.archiveFilenamePattern,
      actual: filename,
      error: matched ? undefined : "Archive filename doesn't match pattern",
    });
  }

  // Calculate overall result
  const passed = checks.every(c => c.passed);
  const duration = Date.now() - startTime;

  // Build detailed result for reporting
  return {
    testId,
    passed,
    duration,
    processingTime,
    checks,
    processResult,
    vaultFilePath,
    dropboxFilePath: processResult.dropboxPath,
    // Detailed spec info
    spec: {
      id: spec.id,
      name: spec.name,
      category: spec.category,
      inputType: spec.input.type,
      inputExample: spec.input.example,
      inputCaption: spec.input.caption,
    },
    // Actual output
    actualOutput: {
      pipeline,
      tags: contentTags,
      scope: vaultFrontmatter.scope as string | undefined,
      vaultPath: vaultFilePath,
      content: vaultContent.slice(0, 500),
    },
    // Expected output
    expectedOutput: {
      pipeline: spec.expected.pipeline,
      tags: spec.expected.tags,
      frontmatter: spec.expected.frontmatter,
    },
  };
}

/**
 * Validate using vault file when Events notification not available
 * (fallback for voice tests with spoken test IDs)
 */
async function validateWithVaultFile(
  spec: TestSpec,
  testId: string,
  vaultFilePath: string,
  checks: ValidationCheck[],
  processingTime: number,
  startTime: number,
  options: IntegrationOptions
): Promise<IntegrationResult> {
  const parsed = parseVaultFile(vaultFilePath);
  const vaultFrontmatter = parsed.frontmatter;
  const vaultContent = parsed.content;

  // Validate tags
  if (spec.expected.tags) {
    const tags = (vaultFrontmatter.tags as string[]) || [];
    for (const expectedTag of spec.expected.tags) {
      const found = tags.some(t =>
        t.toLowerCase() === expectedTag.toLowerCase() ||
        t.toLowerCase().replace(/-/g, "_") === expectedTag.toLowerCase().replace(/-/g, "_")
      );
      checks.push({
        name: `tag_present:${expectedTag}`,
        passed: found,
        expected: expectedTag,
        actual: tags,
      });
    }
  }

  // Validate pipeline from frontmatter
  if (spec.expected.pipeline) {
    const actualPipeline = vaultFrontmatter.pipeline as string | undefined;
    const pipelineMatch = actualPipeline?.toLowerCase() === spec.expected.pipeline.toLowerCase();
    checks.push({
      name: `pipeline:${spec.expected.pipeline}`,
      passed: pipelineMatch,
      expected: spec.expected.pipeline,
      actual: actualPipeline,
    });
  }

  // Validate content
  if (spec.expected.content?.contains) {
    for (const expectedText of spec.expected.content.contains) {
      const found = vaultContent.toLowerCase().includes(expectedText.toLowerCase());
      checks.push({
        name: `content_contains:${expectedText.slice(0, 20)}`,
        passed: found,
        expected: expectedText,
      });
    }
  }

  const passed = checks.every(c => c.passed);
  const duration = Date.now() - startTime;

  return {
    testId,
    passed,
    duration,
    processingTime,
    checks,
    vaultFilePath,
  };
}

/**
 * Run a single test with timeout protection
 */
async function runTestWithTimeout(
  testId: string,
  options: IntegrationOptions,
  timeout: number
): Promise<IntegrationResult> {
  const timeoutPromise = new Promise<IntegrationResult>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Test ${testId} timed out after ${timeout / 1000}s`));
    }, timeout);
  });

  try {
    return await Promise.race([
      runIntegrationTest(testId, options),
      timeoutPromise,
    ]);
  } catch (error) {
    return {
      testId,
      passed: false,
      duration: timeout,
      processingTime: timeout,
      checks: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run multiple integration tests (supports parallel execution)
 */
export async function runIntegrationTests(
  options: IntegrationOptions = {}
): Promise<IntegrationRunSummary> {
  const startedAt = new Date().toISOString();
  const results: IntegrationResult[] = [];

  // Determine which tests to run
  let specs: TestSpec[];
  if (options.testId) {
    const spec = getSpecById(options.testId);
    specs = spec ? [spec] : [];
  } else if (options.suite) {
    specs = getSpecsByCategory(options.suite);
  } else if (options.all) {
    specs = allIngestSpecs;
  } else {
    // Default: run tests that have fixtures
    specs = allIngestSpecs.filter(s => fixtureExists(s.id));
  }

  // Filter out skipped tests
  specs = specs.filter(s => !s.meta?.skip);

  const concurrency = options.concurrency || 5;
  const perTestTimeout = options.timeout || 120000; // 2 min per test default

  if (options.parallel) {
    console.log(`\nRunning ${specs.length} integration tests (parallel, concurrency: ${concurrency})...\n`);

    // Process in batches for controlled concurrency
    for (let i = 0; i < specs.length; i += concurrency) {
      const batch = specs.slice(i, i + concurrency);
      const batchPromises = batch.map(spec =>
        runTestWithTimeout(spec.id, { ...options, verbose: false }, perTestTimeout)
      );

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        results.push(result);
        const spec = batch.find(s => s.id === result.testId);
        const status = result.passed ? "✓" : "✗";
        const color = result.passed ? "\x1b[32m" : "\x1b[31m";
        console.log(`${color}${status}\x1b[0m ${result.testId}: ${spec?.name || ""} (${result.processingTime}ms)`);

        if (!result.passed && result.error) {
          console.log(`  Error: ${result.error}`);
        }
      }
    }
  } else {
    console.log(`\nRunning ${specs.length} integration tests (sequential)...\n`);

    for (const spec of specs) {
      const result = await runTestWithTimeout(spec.id, options, perTestTimeout);
      results.push(result);

      // Print progress
      const status = result.passed ? "✓" : "✗";
      const color = result.passed ? "\x1b[32m" : "\x1b[31m";
      console.log(`${color}${status}\x1b[0m ${spec.id}: ${spec.name} (${result.processingTime}ms)`);

      if (!result.passed && result.error) {
        console.log(`  Error: ${result.error}`);
      }
      if (!result.passed && result.checks.length > 0) {
        const failed = result.checks.filter(c => !c.passed);
        for (const check of failed.slice(0, 3)) {
          console.log(`  - ${check.name}: ${check.error || "failed"}`);
        }
      }

      // Small delay between tests to avoid rate limiting
      await Bun.sleep(500);
    }
  }

  const completedAt = new Date().toISOString();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const skipped = results.filter(r =>
    r.checks.some(c => c.name === "skipped")
  ).length;

  return {
    startedAt,
    completedAt,
    duration: results.reduce((sum, r) => sum + r.duration, 0),
    counts: {
      total: results.length,
      passed,
      failed,
      skipped,
    },
    results,
  };
}

/**
 * Print integration test summary
 */
export function printIntegrationSummary(summary: IntegrationRunSummary): void {
  console.log("\n" + "=".repeat(50));
  console.log("INTEGRATION TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total:   ${summary.counts.total}`);
  console.log(`\x1b[32mPassed:  ${summary.counts.passed}\x1b[0m`);
  if (summary.counts.failed > 0) {
    console.log(`\x1b[31mFailed:  ${summary.counts.failed}\x1b[0m`);
  }
  if (summary.counts.skipped > 0) {
    console.log(`Skipped: ${summary.counts.skipped}`);
  }
  console.log(`Duration: ${summary.duration}ms`);
  console.log("=".repeat(50));

  if (summary.counts.failed > 0) {
    console.log("\nFailed tests:");
    for (const result of summary.results.filter(r => !r.passed)) {
      console.log(`  - ${result.testId}: ${result.error || "validation failed"}`);
    }
  }
}

/**
 * Generate detailed markdown report for integration tests
 */
export function generateDetailedReport(summary: IntegrationRunSummary): string {
  const lines: string[] = [];
  const runId = `integration-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;

  // Header
  lines.push(`# Integration Test Report: ${runId}`);
  lines.push("");
  lines.push(`**Date:** ${new Date(summary.startedAt).toLocaleString()}`);
  lines.push(`**Duration:** ${(summary.duration / 1000).toFixed(1)}s`);
  lines.push(`**Mode:** ${summary.counts.total > 1 ? "batch" : "single"}`);
  lines.push("");

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total | ${summary.counts.total} |`);
  lines.push(`| Passed | ${summary.counts.passed} |`);
  lines.push(`| Failed | ${summary.counts.failed} |`);
  lines.push(`| Skipped | ${summary.counts.skipped} |`);
  lines.push(`| Pass Rate | ${Math.round((summary.counts.passed / summary.counts.total) * 100)}% |`);
  lines.push("");

  // Failed tests section
  const failedTests = summary.results.filter(r => !r.passed);
  if (failedTests.length > 0) {
    lines.push("## Failed Tests");
    lines.push("");

    for (const result of failedTests) {
      lines.push(`### ${result.testId}: ${result.spec?.name || "Unknown"}`);
      lines.push("");
      lines.push(`- **Category:** ${result.spec?.category || "unknown"}`);
      lines.push(`- **Input Type:** ${result.spec?.inputType || "unknown"}`);
      lines.push(`- **Duration:** ${result.duration}ms`);

      if (result.error) {
        lines.push(`- **Error:** ${result.error}`);
      }

      // Input details
      if (result.spec?.inputExample || result.spec?.inputCaption) {
        lines.push("");
        lines.push("**Input:**");
        if (result.spec.inputExample) {
          lines.push("```");
          lines.push(result.spec.inputExample.slice(0, 200));
          lines.push("```");
        }
        if (result.spec.inputCaption) {
          lines.push(`Caption: \`${result.spec.inputCaption}\``);
        }
      }

      // Expected vs Actual
      lines.push("");
      lines.push("**Expected:**");
      if (result.expectedOutput?.pipeline) {
        lines.push(`- Pipeline: ${result.expectedOutput.pipeline}`);
      }
      if (result.expectedOutput?.tags && result.expectedOutput.tags.length > 0) {
        lines.push(`- Tags: ${result.expectedOutput.tags.join(", ")}`);
      }

      lines.push("");
      lines.push("**Actual:**");
      if (result.actualOutput?.pipeline) {
        lines.push(`- Pipeline: ${result.actualOutput.pipeline}`);
      }
      if (result.actualOutput?.tags && result.actualOutput.tags.length > 0) {
        lines.push(`- Tags: ${result.actualOutput.tags.join(", ")}`);
      }
      if (result.actualOutput?.vaultPath) {
        lines.push(`- Vault Path: ${result.actualOutput.vaultPath}`);
      }

      // Failed checks
      const failedChecks = result.checks.filter(c => !c.passed);
      if (failedChecks.length > 0) {
        lines.push("");
        lines.push("**Failed Checks:**");
        for (const check of failedChecks) {
          lines.push(`- ${check.name}: ${check.error || "failed"}`);
          if (check.expected !== undefined) {
            lines.push(`  - Expected: ${JSON.stringify(check.expected)}`);
          }
          if (check.actual !== undefined) {
            lines.push(`  - Actual: ${JSON.stringify(check.actual)}`);
          }
        }
      }

      lines.push("");
    }
  }

  // All tests table
  lines.push("## All Tests");
  lines.push("");
  lines.push("| ID | Name | Type | Status | Duration | Pipeline |");
  lines.push("|---|---|---|---|---|---|");

  for (const result of summary.results) {
    const status = result.passed ? "✅" : "❌";
    const duration = result.duration > 0 ? `${result.duration}ms` : "-";
    const pipeline = result.actualOutput?.pipeline || "-";
    const name = result.spec?.name || "Unknown";
    const type = result.spec?.inputType || "?";
    lines.push(`| ${result.testId} | ${name.slice(0, 30)} | ${type} | ${status} | ${duration} | ${pipeline} |`);
  }

  return lines.join("\n");
}

/**
 * Save detailed integration report to file
 */
export function saveDetailedReport(summary: IntegrationRunSummary): string {
  const { writeFileSync, mkdirSync } = require("fs");
  const { join } = require("path");

  const OUTPUT_DIR = join(import.meta.dir, "..", "output");
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const markdown = generateDetailedReport(summary);
  const reportPath = join(OUTPUT_DIR, "integration-report.md");
  writeFileSync(reportPath, markdown);

  // Also update latest
  const latestPath = join(OUTPUT_DIR, "latest-integration-report.md");
  writeFileSync(latestPath, markdown);

  return reportPath;
}
