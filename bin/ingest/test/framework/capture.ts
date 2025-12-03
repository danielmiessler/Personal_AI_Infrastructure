/**
 * Capture Mechanism
 *
 * Captures real Telegram messages as test fixtures.
 * Used to build test data from actual user inputs.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { getConfig } from "../../lib/config";
import { getUpdates, downloadFile, sendToInbox, sendPhotoToInbox, sendDocumentToInbox } from "../../lib/telegram";
import type { TestSpec, Fixture, FixtureMeta, TelegramMessage, CaptureOptions } from "./types";
import { getSpecById, allIngestSpecs } from "../specs";

// =============================================================================
// Constants
// =============================================================================

const FIXTURES_DIR = join(import.meta.dir, "..", "fixtures");
const MEDIA_DIR = join(FIXTURES_DIR, "media");
const ASSETS_DIR = join(FIXTURES_DIR, "assets");
const DEFAULT_TIMEOUT = 120000; // 2 minutes
const POLL_INTERVAL = 2000; // 2 seconds

// Placeholder for channel ID in fixtures (replaced at runtime)
const CHANNEL_ID_PLACEHOLDER = "$TEST_CASES_CHANNEL_ID";

// Test assets for auto-send
const TEST_PHOTO = join(ASSETS_DIR, "test-image.png");
const TEST_DOCUMENT = join(ASSETS_DIR, "test-document.pdf");

// =============================================================================
// Capture Functions
// =============================================================================

/**
 * Capture a fixture for a specific test
 */
export async function captureFixture(
  testId: string,
  options: { timeout?: number; user?: string } = {}
): Promise<{ success: boolean; fixturePath?: string; error?: string }> {
  const spec = getSpecById(testId);
  if (!spec) {
    return { success: false, error: `Test spec not found: ${testId}` };
  }

  const config = getConfig();
  if (!config.telegramBotToken || !config.telegramChannelId) {
    return { success: false, error: "Telegram not configured" };
  }

  // Show capture instructions
  console.log("\n" + "=".repeat(60));
  console.log(`CAPTURE: ${spec.id}`);
  console.log("=".repeat(60));
  console.log(`\nTest: ${spec.name}`);
  console.log(`Type: ${spec.input.type}`);
  console.log(`\nExpected input:`);
  console.log(`  ${spec.input.description}`);
  if (spec.input.example) {
    console.log(`\nExample to send:`);
    console.log(`  "${spec.input.example}"`);
  }
  if (spec.input.caption) {
    console.log(`\nCaption to use:`);
    console.log(`  "${spec.input.caption}"`);
  }
  if (spec.input.spokenKeywords) {
    console.log(`\nSpoken keywords expected:`);
    console.log(`  ${spec.input.spokenKeywords.join(", ")}`);
  }
  console.log("\n" + "-".repeat(60));
  console.log("Send your message to Telegram now (or use most recent matching message)...");
  console.log(`Waiting ${(options.timeout || DEFAULT_TIMEOUT) / 1000}s for message...`);
  console.log("-".repeat(60) + "\n");

  // Strategy: Get all recent updates and find the LATEST matching message
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const startTime = Date.now();
  let message: TelegramMessage | null = null;

  while (Date.now() - startTime < timeout) {
    // Get recent updates (don't acknowledge yet)
    const updates = await getUpdates(
      config.telegramBotToken,
      undefined, // Get all available
      100,
      POLL_INTERVAL / 1000
    );

    // Find the LATEST message matching our criteria
    for (const update of updates.reverse()) {
      const msg = update.message || update.channel_post;
      if (msg && isMessageForCapture(msg, spec, config.telegramChannelId)) {
        message = msg as TelegramMessage;
        break;
      }
    }

    if (message) break;
    await sleep(POLL_INTERVAL);
  }

  if (!message) {
    return { success: false, error: "Timeout waiting for message" };
  }

  console.log(`\n✓ Message captured: message_id=${message.message_id}`);

  // Download media if present
  let mediaFile: string | undefined;
  if (message.voice || message.audio || message.photo || message.document) {
    const mediaResult = await downloadMediaForFixture(message, spec.id, config.telegramBotToken);
    if (mediaResult.success) {
      mediaFile = mediaResult.relativePath;
      console.log(`✓ Media downloaded: ${mediaFile}`);
    } else {
      console.log(`⚠ Media download failed: ${mediaResult.error}`);
    }
  }

  // Create fixture
  const fixturePath = join(FIXTURES_DIR, spec.fixture);
  const fixture: Fixture = {
    _meta: {
      testId: spec.id,
      capturedAt: new Date().toISOString(),
      capturedBy: options.user,
      description: spec.input.description,
      mediaFile,
    },
    message,
  };

  // Ensure directory exists
  const fixtureDir = dirname(fixturePath);
  if (!existsSync(fixtureDir)) {
    mkdirSync(fixtureDir, { recursive: true });
  }

  // Write fixture
  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
  console.log(`✓ Fixture saved: ${spec.fixture}`);

  return { success: true, fixturePath };
}

/**
 * Auto-send a fixture - sends via API and creates fixture directly
 * Supports: text (with example), photo (with caption), document (with caption), url (with example)
 */
export async function autoSendFixture(
  testId: string,
  options: { user?: string } = {}
): Promise<{ success: boolean; fixturePath?: string; error?: string }> {
  const spec = getSpecById(testId);
  if (!spec) {
    return { success: false, error: `Test spec not found: ${testId}` };
  }

  const config = getConfig();
  if (!config.telegramBotToken || !config.telegramChannelId) {
    return { success: false, error: "Telegram not configured" };
  }

  let message: TelegramMessage;
  const inputType = spec.input.type;

  console.log(`\nAuto-sending: ${spec.id}`);

  switch (inputType) {
    case "text":
    case "url":
      if (!spec.input.example) {
        return { success: false, error: `Test ${testId} requires example for text/url type` };
      }
      console.log(`  Text: "${spec.input.example}"`);
      message = await sendToInbox(spec.input.example) as TelegramMessage;
      break;

    case "photo":
      if (!existsSync(TEST_PHOTO)) {
        return { success: false, error: `Test photo not found: ${TEST_PHOTO}` };
      }
      console.log(`  Photo: ${TEST_PHOTO}`);
      console.log(`  Caption: "${spec.input.caption || ""}"`);
      message = await sendPhotoToInbox(TEST_PHOTO, spec.input.caption) as TelegramMessage;
      break;

    case "document": {
      // Use specific filename if provided, otherwise default test document
      const docPath = spec.input.filename
        ? join(ASSETS_DIR, spec.input.filename)
        : TEST_DOCUMENT;
      if (!existsSync(docPath)) {
        return { success: false, error: `Test document not found: ${docPath}` };
      }
      console.log(`  Document: ${docPath}`);
      console.log(`  Caption: "${spec.input.caption || ""}"`);
      message = await sendDocumentToInbox(docPath, spec.input.caption) as TelegramMessage;
      break;
    }

    case "voice":
      return { success: false, error: `Test ${testId} requires manual capture (voice)` };

    default:
      return { success: false, error: `Test ${testId} has unsupported input type: ${inputType}` };
  }

  console.log(`✓ Message sent: message_id=${message.message_id}`);

  // Create fixture directly from API response
  const fixturePath = join(FIXTURES_DIR, spec.fixture);
  const fixture: Fixture = {
    _meta: {
      testId: spec.id,
      capturedAt: new Date().toISOString(),
      capturedBy: options.user,
      description: spec.input.description,
      autoSent: true,
    },
    message,
  };

  // Ensure directory exists
  const fixtureDir = dirname(fixturePath);
  if (!existsSync(fixtureDir)) {
    mkdirSync(fixtureDir, { recursive: true });
  }

  // Write fixture
  writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
  console.log(`✓ Fixture saved: ${spec.fixture}`);

  return { success: true, fixturePath };
}

/**
 * Capture all missing fixtures interactively
 */
export async function captureMissingFixtures(
  options: { timeout?: number; user?: string } = {}
): Promise<{ captured: string[]; skipped: string[]; failed: string[] }> {
  const missing = getMissingFixtures();

  if (missing.length === 0) {
    console.log("All fixtures exist!");
    return { captured: [], skipped: [], failed: [] };
  }

  console.log(`\nFound ${missing.length} tests without fixtures:`);
  for (const spec of missing) {
    console.log(`  - ${spec.id}: ${spec.name}`);
  }

  const captured: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const spec of missing) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Capturing ${spec.id} (${captured.length + 1}/${missing.length})`);

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question("Press Enter to capture, 's' to skip, 'q' to quit: ", resolve);
    });
    rl.close();

    if (answer.toLowerCase() === "q") {
      console.log("Quitting capture mode.");
      break;
    }

    if (answer.toLowerCase() === "s") {
      skipped.push(spec.id);
      continue;
    }

    const result = await captureFixture(spec.id, options);
    if (result.success) {
      captured.push(spec.id);
    } else {
      console.log(`✗ Failed: ${result.error}`);
      failed.push(spec.id);
    }
  }

  return { captured, skipped, failed };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get current Telegram update offset
 */
async function getCurrentOffset(token: string): Promise<number> {
  const updates = await getUpdates(token, -1, 1, 0);
  if (updates.length > 0) {
    return updates[updates.length - 1].update_id;
  }
  return 0;
}

/**
 * Check if message matches expected capture type
 */
function isMessageForCapture(
  msg: unknown,
  spec: TestSpec,
  channelId: string
): boolean {
  const message = msg as Record<string, unknown>;

  // Must be from our channel
  const chat = message.chat as Record<string, unknown> | undefined;
  if (!chat || String(chat.id) !== channelId) {
    return false;
  }

  // Check content type matches
  switch (spec.input.type) {
    case "text":
      return typeof message.text === "string" && !message.voice && !message.photo && !message.document;
    case "voice":
      return !!message.voice || !!message.audio;
    case "photo":
      return !!message.photo;
    case "document":
      return !!message.document;
    case "url":
      return typeof message.text === "string" && /https?:\/\//.test(message.text as string);
    default:
      return true;
  }
}

/**
 * Download media file for fixture
 */
async function downloadMediaForFixture(
  message: TelegramMessage,
  testId: string,
  token: string
): Promise<{ success: boolean; relativePath?: string; error?: string }> {
  let fileId: string | undefined;
  let extension: string;

  if (message.voice) {
    fileId = message.voice.file_id;
    extension = ".ogg";
  } else if (message.audio) {
    fileId = message.audio.file_id;
    extension = message.audio.file_name?.split(".").pop() || ".mp3";
    if (!extension.startsWith(".")) extension = "." + extension;
  } else if (message.photo) {
    // Get largest photo
    const photos = message.photo;
    fileId = photos[photos.length - 1].file_id;
    extension = ".jpg";
  } else if (message.document) {
    fileId = message.document.file_id;
    extension = message.document.file_name?.split(".").pop() || ".bin";
    if (!extension.startsWith(".")) extension = "." + extension;
  }

  if (!fileId) {
    return { success: false, error: "No file_id found" };
  }

  // Ensure media directory exists
  if (!existsSync(MEDIA_DIR)) {
    mkdirSync(MEDIA_DIR, { recursive: true });
  }

  const filename = `${testId}${extension}`;
  const filepath = join(MEDIA_DIR, filename);

  try {
    await downloadFile(token, fileId, filepath);
    return { success: true, relativePath: `media/${filename}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get list of tests without fixtures
 */
export function getMissingFixtures(): TestSpec[] {
  return allIngestSpecs.filter(spec => {
    const fixturePath = join(FIXTURES_DIR, spec.fixture);
    return !existsSync(fixturePath);
  });
}

/**
 * Get list of tests with fixtures
 */
export function getExistingFixtures(): TestSpec[] {
  return allIngestSpecs.filter(spec => {
    const fixturePath = join(FIXTURES_DIR, spec.fixture);
    return existsSync(fixturePath);
  });
}

/**
 * Check if fixture exists for test
 */
export function fixtureExists(testId: string): boolean {
  const spec = getSpecById(testId);
  if (!spec) return false;
  const fixturePath = join(FIXTURES_DIR, spec.fixture);
  return existsSync(fixturePath);
}

/**
 * Load fixture for test (with channel ID hydration)
 */
export function loadFixture(testId: string): Fixture | null {
  const spec = getSpecById(testId);
  if (!spec) return null;

  const fixturePath = join(FIXTURES_DIR, spec.fixture);
  if (!existsSync(fixturePath)) return null;

  const content = Bun.file(fixturePath).text();
  const fixture = JSON.parse(content as unknown as string) as Fixture;
  return hydrateFixture(fixture);
}

/**
 * Load fixture from path with hydration
 */
export function loadFixtureFromPath(filePath: string): Fixture | null {
  if (!existsSync(filePath)) return null;
  const content = Bun.file(filePath).text();
  const fixture = JSON.parse(content as unknown as string) as Fixture;
  return hydrateFixture(fixture);
}

/**
 * Sanitize fixture before saving - replaces real channel IDs with placeholder
 */
export function sanitizeFixture(fixture: Fixture): Fixture {
  const config = getConfig();
  const channelId = config.testTelegramCasesId;

  if (!channelId) return fixture;

  // Deep clone and replace
  const json = JSON.stringify(fixture);
  const sanitized = json.replace(new RegExp(channelId, 'g'), CHANNEL_ID_PLACEHOLDER);
  return JSON.parse(sanitized);
}

/**
 * Hydrate fixture after loading - replaces placeholder with real channel ID
 */
export function hydrateFixture(fixture: Fixture): Fixture {
  const config = getConfig();
  const channelId = config.testTelegramCasesId;

  if (!channelId) return fixture;

  // Deep clone and replace
  const json = JSON.stringify(fixture);
  const hydrated = json.replace(new RegExp('\\' + CHANNEL_ID_PLACEHOLDER, 'g'), channelId);
  return JSON.parse(hydrated);
}

/**
 * Get the channel ID placeholder constant
 */
export function getChannelIdPlaceholder(): string {
  return CHANNEL_ID_PLACEHOLDER;
}

// =============================================================================
// Utilities
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
