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
import { processMessage, type ProcessResult } from "../../lib/process";
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
}

export interface IntegrationResult extends ValidationResult {
  processingTime: number;  // Time for direct processing
  processResult?: ProcessResult;
  vaultFilePath?: string;
  dropboxFilePath?: string;
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

  // Get channel IDs
  // Use test channel IDs if available, otherwise fall back to production channels
  const testCasesChannelId = config.testTelegramCasesId;
  const testInboxChannelId = config.testTelegramChannelId || config.telegramChannelId;
  const eventsChannelId = config.testTelegramOutboxId || config.telegramOutboxId;

  if (!testCasesChannelId || !testInboxChannelId || !eventsChannelId) {
    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      processingTime: 0,
      checks: [],
      error: "Missing channel IDs in config. Need: TEST_TELEGRAM_CASES_ID, and either (TEST_TELEGRAM_CHANNEL_ID or TELEGRAM_CHANNEL_ID), and either (TEST_TELEGRAM_OUTBOX_ID or TELEGRAM_OUTBOX_ID)",
    };
  }

  if (options.verbose) {
    console.log(`\n--- ${testId}: ${spec.name} ---`);
    console.log(`Forwarding message ${fixture.message.message_id} to inbox...`);
  }

  // Dry run mode - just show what would happen
  if (options.dryRun) {
    console.log(`[DRY RUN] Would forward message ${fixture.message.message_id} from ${testCasesChannelId} to ${testInboxChannelId}`);
    return {
      testId,
      passed: true,
      duration: Date.now() - startTime,
      processingTime: 0,
      checks: [{ name: "dry_run", passed: true }],
    };
  }

  // Forward message to test inbox
  const forwardResult = await forwardMessage(
    testCasesChannelId,
    testInboxChannelId,
    fixture.message.message_id
  );

  if (!forwardResult.ok) {
    return {
      testId,
      passed: false,
      duration: Date.now() - startTime,
      processingTime: 0,
      checks: [],
      error: `Forward failed: ${forwardResult.description}`,
    };
  }

  const forwardedMessage = forwardResult.result!;

  checks.push({
    name: "message_forwarded",
    passed: true,
    actual: forwardedMessage.message_id,
  });

  if (options.verbose) {
    console.log(`Forwarded as message ${forwardedMessage.message_id}`);
    console.log(`Processing message directly...`);
  }

  // Determine content type from message
  const contentType = getContentTypeFromMessage(forwardedMessage);

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
    processResult = await processMessage(forwardedMessage, contentType, profile);
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

  // Use original file path from processResult if available
  if (firstContent?.originalFilePath && config.obsidianVaultPath) {
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

  // Validate content
  if (spec.expected.content?.contains) {
    for (const expectedText of spec.expected.content.contains) {
      const found = vaultContent.toLowerCase().includes(expectedText.toLowerCase());
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

  return {
    testId,
    passed,
    duration,
    processingTime,
    checks,
    processResult,
    vaultFilePath,
    dropboxFilePath: processResult.dropboxPath,
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
 * Run multiple integration tests
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

  console.log(`\nRunning ${specs.length} integration tests...\n`);

  for (const spec of specs) {
    const result = await runIntegrationTest(spec.id, options);
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
    await Bun.sleep(1000);
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
