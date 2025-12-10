#!/usr/bin/env bun
/**
 * Integration Test Setup - Ensures test messages exist in PAI Test Cases channel
 *
 * Usage:
 *   bun run test/integration-setup.ts [options]
 *
 * Options:
 *   --dry-run      Preview what would be done without sending messages
 *   --skip-tests   Only populate channel, don't run tests
 *   --force        Force recreate all messages (clears channel first)
 *   --verbose      Show detailed output
 *
 * Default behavior (smart/persistent mode):
 * 1. Checks which test messages already exist in PAI Test Cases channel
 * 2. Only sends messages that are missing or expired
 * 3. Updates fixtures with message IDs
 * 4. Messages persist in channel for future test runs (no cleanup)
 *
 * With --force:
 * 1. Clears ALL messages from PAI Test Cases channel
 * 2. Sends ALL test messages fresh
 * 3. Updates all fixtures with new message IDs
 */

import { getConfig } from "../lib/config";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { parse } from "csv-parse/sync";

interface TestCase {
  test_id: string;
  category: string;
  name: string;
  input_type: string;
  file_required: string;
  caption: string;
  source_file: string;
  fixture_status: string;
  notes: string;
}

interface Fixture {
  _meta: {
    testId: string;
    capturedAt?: string;
    capturedBy?: string;
    description?: string;
    synthetic?: boolean;
    [key: string]: any;
  };
  message: any;
}

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: any[];
  document?: any;
  voice?: any;
  audio?: any;
}

// ============================================================================
// Telegram API helpers
// ============================================================================

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;  // 2 seconds base delay

async function apiCall(token: string, method: string, params: Record<string, any> = {}, retryCount = 0): Promise<any> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  
  if (!data.ok) {
    // Handle rate limiting (429)
    if (data.error_code === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = data.parameters?.retry_after || 30;
      console.log(`    Rate limited, waiting ${retryAfter}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await Bun.sleep(retryAfter * 1000 + 1000);  // Wait retry_after + 1 second buffer
      return apiCall(token, method, params, retryCount + 1);
    }
    throw new Error(`${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function getChannelMessages(token: string, chatId: string, limit = 100): Promise<TelegramMessage[]> {
  // Telegram doesn't have a direct "get messages" API for bots
  // We need to use getUpdates or getChatHistory (which isn't available for bots)
  // Instead, we'll track message IDs we've sent and delete those
  console.log("  Note: Telegram Bot API doesn't support fetching channel history");
  console.log("  Will delete messages by ID range instead");
  return [];
}

async function deleteMessage(token: string, chatId: string, messageId: number): Promise<boolean> {
  try {
    await apiCall(token, "deleteMessage", { chat_id: chatId, message_id: messageId });
    return true;
  } catch {
    return false; // Message may already be deleted or too old
  }
}

/**
 * Check if a message exists by examining the fixture's age and validity
 * We trust fixtures that were recently created (within 24 hours)
 * For older fixtures, we assume they're valid unless the file_id is clearly invalid
 * 
 * This avoids making API calls that could interfere with messages
 */
function fixtureIsValid(fixture: Fixture | null): boolean {
  if (!fixture?.message?.message_id) return false;
  
  // Check if fixture has valid media file_ids (not redacted/placeholder)
  const hasInvalidFileId = 
    fixture.message.document?.file_id?.includes("REDACTED") ||
    fixture.message.photo?.some((p: any) => p.file_id?.includes("REDACTED")) ||
    fixture.message.voice?.file_id?.includes("REDACTED") ||
    fixture.message.audio?.file_id?.includes("REDACTED");
  
  if (hasInvalidFileId) return false;
  
  // Trust fixtures created by integration-setup (they have valid message_ids)
  if (fixture._meta?.capturedBy === "integration-setup") return true;
  if (fixture._meta?.capturedBy === "populate-channel") return true;
  
  // For older fixtures, check if capturedAt is recent (within 7 days)
  if (fixture._meta?.capturedAt) {
    const capturedDate = new Date(fixture._meta.capturedAt);
    const daysSinceCapture = (Date.now() - capturedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCapture < 7) return true;
  }
  
  // Default: trust the fixture if it has a message_id
  return true;
}

async function sendMessage(token: string, chatId: string, text: string): Promise<TelegramMessage> {
  return apiCall(token, "sendMessage", { chat_id: chatId, text });
}

async function sendPhoto(token: string, chatId: string, photoId: string, caption?: string): Promise<TelegramMessage> {
  return apiCall(token, "sendPhoto", { chat_id: chatId, photo: photoId, caption });
}

/**
 * Upload a local file as a photo (with retry logic)
 */
async function uploadPhoto(token: string, chatId: string, filePath: string, caption?: string, retryCount = 0): Promise<TelegramMessage> {
  const url = `https://api.telegram.org/bot${token}/sendPhoto`;
  
  const formData = new FormData();
  formData.append("chat_id", chatId);
  
  const file = Bun.file(filePath);
  const blob = await file.arrayBuffer();
  const filename = filePath.split("/").pop() || "photo.jpg";
  formData.append("photo", new Blob([blob]), filename);
  
  if (caption) {
    formData.append("caption", caption);
  }
  
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  if (!data.ok) {
    if (data.error_code === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = data.parameters?.retry_after || 30;
      console.log(`    Rate limited, waiting ${retryAfter}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await Bun.sleep(retryAfter * 1000 + 1000);
      return uploadPhoto(token, chatId, filePath, caption, retryCount + 1);
    }
    throw new Error(`uploadPhoto failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendDocument(token: string, chatId: string, documentId: string, caption?: string): Promise<TelegramMessage> {
  return apiCall(token, "sendDocument", { chat_id: chatId, document: documentId, caption });
}

/**
 * Upload a local file as a document (with retry logic)
 */
async function uploadDocument(token: string, chatId: string, filePath: string, caption?: string, retryCount = 0): Promise<TelegramMessage> {
  const url = `https://api.telegram.org/bot${token}/sendDocument`;
  
  const formData = new FormData();
  formData.append("chat_id", chatId);
  
  const file = Bun.file(filePath);
  const blob = await file.arrayBuffer();
  const filename = filePath.split("/").pop() || "document";
  formData.append("document", new Blob([blob]), filename);
  
  if (caption) {
    formData.append("caption", caption);
  }
  
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  if (!data.ok) {
    // Handle rate limiting
    if (data.error_code === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = data.parameters?.retry_after || 30;
      console.log(`    Rate limited, waiting ${retryAfter}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await Bun.sleep(retryAfter * 1000 + 1000);
      return uploadDocument(token, chatId, filePath, caption, retryCount + 1);
    }
    throw new Error(`uploadDocument failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendVoice(token: string, chatId: string, voiceId: string, caption?: string): Promise<TelegramMessage> {
  return apiCall(token, "sendVoice", { chat_id: chatId, voice: voiceId, caption });
}

async function sendAudio(token: string, chatId: string, audioId: string, caption?: string): Promise<TelegramMessage> {
  return apiCall(token, "sendAudio", { chat_id: chatId, audio: audioId, caption });
}

/**
 * Upload a local file as voice memo (with retry logic)
 */
async function uploadVoice(token: string, chatId: string, filePath: string, caption?: string, retryCount = 0): Promise<TelegramMessage> {
  const url = `https://api.telegram.org/bot${token}/sendVoice`;
  
  const formData = new FormData();
  formData.append("chat_id", chatId);
  
  const file = Bun.file(filePath);
  const blob = await file.arrayBuffer();
  const filename = filePath.split("/").pop() || "voice.ogg";
  formData.append("voice", new Blob([blob]), filename);
  
  if (caption) {
    formData.append("caption", caption);
  }
  
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  if (!data.ok) {
    if (data.error_code === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = data.parameters?.retry_after || 30;
      console.log(`    Rate limited, waiting ${retryAfter}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await Bun.sleep(retryAfter * 1000 + 1000);
      return uploadVoice(token, chatId, filePath, caption, retryCount + 1);
    }
    throw new Error(`uploadVoice failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

/**
 * Upload a local file as audio (with retry logic)
 */
async function uploadAudio(token: string, chatId: string, filePath: string, caption?: string, retryCount = 0): Promise<TelegramMessage> {
  const url = `https://api.telegram.org/bot${token}/sendAudio`;
  
  const formData = new FormData();
  formData.append("chat_id", chatId);
  
  const file = Bun.file(filePath);
  const blob = await file.arrayBuffer();
  const filename = filePath.split("/").pop() || "audio.mp3";
  formData.append("audio", new Blob([blob]), filename);
  
  if (caption) {
    formData.append("caption", caption);
  }
  
  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  if (!data.ok) {
    if (data.error_code === 429 && retryCount < MAX_RETRIES) {
      const retryAfter = data.parameters?.retry_after || 30;
      console.log(`    Rate limited, waiting ${retryAfter}s before retry ${retryCount + 1}/${MAX_RETRIES}...`);
      await Bun.sleep(retryAfter * 1000 + 1000);
      return uploadAudio(token, chatId, filePath, caption, retryCount + 1);
    }
    throw new Error(`uploadAudio failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

// ============================================================================
// Fixture helpers
// ============================================================================

function findFixture(testId: string, fixturesDir: string): Fixture | null {
  const subdirs = ["scope", "date", "archive", "regression", "voice"];
  for (const subdir of subdirs) {
    const path = join(fixturesDir, subdir, `${testId}.json`);
    if (existsSync(path)) {
      try {
        let content = readFileSync(path, "utf-8");
        // Handle the placeholder - replace with quoted version for JSON parsing
        content = content.replace(/:(\s*)\$TEST_CASES_CHANNEL_ID(\s*)/g, ':$1-1$2');
        return JSON.parse(content);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function getSourceFixture(tc: TestCase, fixturesDir: string): Fixture | null {
  const sourceFile = tc.source_file;
  if (sourceFile?.startsWith("[REUSES ")) {
    const match = sourceFile.match(/\[REUSES ([^\]]+)\]/);
    if (match) {
      const sourceTestId = match[1].replace("] ", "").trim();
      return findFixture(sourceTestId, fixturesDir);
    }
  }
  return findFixture(tc.test_id, fixturesDir);
}

function getFixtureDir(category: string): string {
  switch (category) {
    case "scope": return "scope";
    case "date": return "date";
    case "archive": return "archive";
    case "voice": return "voice";
    default: return "regression";
  }
}

// ============================================================================
// Main orchestration
// ============================================================================

async function clearChannel(token: string, chatId: string, messageIds: number[], dryRun: boolean): Promise<number> {
  console.log("\n📤 Clearing PAI Test Cases channel...");
  console.log(`   Target channel: ${chatId} (TEST_TELEGRAM_CASES_ID)`);
  
  if (messageIds.length === 0) {
    console.log("  No message IDs to clear");
    return 0;
  }
  
  let deleted = 0;
  for (const msgId of messageIds) {
    if (dryRun) {
      console.log(`  DRY: Would delete message ${msgId}`);
      deleted++;
    } else {
      const success = await deleteMessage(token, chatId, msgId);
      if (success) {
        deleted++;
        process.stdout.write(`\r  Deleted ${deleted}/${messageIds.length} messages`);
      }
      // Small delay to avoid rate limiting
      await Bun.sleep(100);
    }
  }
  console.log(`\n  Deleted ${deleted} messages`);
  return deleted;
}

async function populateChannel(
  token: string, 
  chatId: string, 
  testCases: TestCase[], 
  fixturesDir: string,
  dryRun: boolean,
  verifyFirst: boolean = true  // Check if messages exist before recreating
): Promise<Map<string, number>> {
  console.log("\n📥 Populating PAI Test Cases channel...");
  if (verifyFirst) {
    console.log("   (Checking existing messages first - use --force to skip)");
  }
  
  const messageIds = new Map<string, number>();
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let existing = 0;
  
  for (const tc of testCases) {
    // Skip if status is 'skip'
    if (tc.fixture_status === "skip") {
      console.log(`  ⊘ SKIP ${tc.test_id}: marked as skip`);
      skipped++;
      continue;
    }
    
    // Check if fixture is valid (avoid API calls that could interfere with messages)
    if (verifyFirst && !dryRun) {
      const fixture = findFixture(tc.test_id, fixturesDir);
      if (fixtureIsValid(fixture)) {
        console.log(`  ✓ VALID ${tc.test_id}: msg_id=${fixture!.message.message_id}`);
        messageIds.set(tc.test_id, fixture!.message.message_id);
        existing++;
        continue;
      }
    }
    
    const caption = tc.caption || "";
    const inputType = tc.input_type;
    
    try {
      let result: TelegramMessage | null = null;
      
      if (inputType === "text" || inputType === "url") {
        if (dryRun) {
          console.log(`  DRY: ${tc.test_id} -> sendMessage("${caption.substring(0, 50)}...")`);
          sent++;
          continue;
        }
        result = await sendMessage(token, chatId, caption);
        
      } else if (inputType === "photo") {
        const sourceFixture = getSourceFixture(tc, fixturesDir);
        const photoArray = sourceFixture?.message?.photo;
        const photoId = photoArray?.[photoArray.length - 1]?.file_id;
        
        // Check if we have a valid file_id or need to upload from local
        const isInvalidFileId = !photoId || photoId.includes("REDACTED") || photoId.length < 20;
        const localFilePath = tc.source_file?.startsWith("assets/") 
          ? join(fixturesDir, tc.source_file)
          : null;
        
        if (isInvalidFileId && localFilePath && existsSync(localFilePath)) {
          // Upload from local file
          if (dryRun) {
            console.log(`  DRY: ${tc.test_id} -> uploadPhoto(${localFilePath})`);
            sent++;
            continue;
          }
          console.log(`  📤 ${tc.test_id}: uploading local photo...`);
          result = await uploadPhoto(token, chatId, localFilePath, caption || undefined);
        } else if (photoId && !isInvalidFileId) {
          // Use existing file_id
          if (dryRun) {
            console.log(`  DRY: ${tc.test_id} -> sendPhoto(${photoId.substring(0, 20)}...)`);
            sent++;
            continue;
          }
          result = await sendPhoto(token, chatId, photoId, caption || undefined);
        } else {
          console.log(`  ✗ ERROR ${tc.test_id}: no valid photo (file_id invalid, no local file)`);
          errors++;
          continue;
        }
        
      } else if (inputType === "document") {
        const sourceFixture = getSourceFixture(tc, fixturesDir);
        const docId = sourceFixture?.message?.document?.file_id;
        
        // Check if we have a valid file_id or need to upload from local
        const isInvalidFileId = !docId || docId.includes("REDACTED") || docId.length < 20;
        const localFilePath = tc.source_file?.startsWith("assets/") 
          ? join(fixturesDir, tc.source_file)
          : null;
        
        if (isInvalidFileId && localFilePath && existsSync(localFilePath)) {
          // Upload from local file
          if (dryRun) {
            console.log(`  DRY: ${tc.test_id} -> uploadDocument(${localFilePath})`);
            sent++;
            continue;
          }
          console.log(`  📤 ${tc.test_id}: uploading local file...`);
          result = await uploadDocument(token, chatId, localFilePath, caption || undefined);
        } else if (docId && !isInvalidFileId) {
          // Use existing file_id
          if (dryRun) {
            console.log(`  DRY: ${tc.test_id} -> sendDocument(${docId.substring(0, 20)}...)`);
            sent++;
            continue;
          }
          result = await sendDocument(token, chatId, docId, caption || undefined);
        } else {
          console.log(`  ✗ ERROR ${tc.test_id}: no valid document (file_id invalid, no local file)`);
          errors++;
          continue;
        }
        
      } else if (inputType === "voice" || inputType === "audio") {
        const sourceFixture = getSourceFixture(tc, fixturesDir);
        const voiceId = sourceFixture?.message?.voice?.file_id;
        const audioId = sourceFixture?.message?.audio?.file_id;
        
        // Check for local media files
        const localMediaPath = tc.source_file?.startsWith("media/") 
          ? join(fixturesDir, tc.source_file)
          : tc.source_file?.startsWith("assets/")
            ? join(fixturesDir, tc.source_file)
            : null;
        
        // Check if file_ids are valid
        const isVoiceValid = voiceId && !voiceId.includes("REDACTED") && voiceId.length >= 20;
        const isAudioValid = audioId && !audioId.includes("REDACTED") && audioId.length >= 20;
        
        if (isVoiceValid) {
          // Use existing voice file_id
          if (dryRun) {
            console.log(`  DRY: ${tc.test_id} -> sendVoice(${voiceId.substring(0, 20)}...)`);
            sent++;
            continue;
          }
          result = await sendVoice(token, chatId, voiceId, caption || undefined);
        } else if (isAudioValid) {
          // Use existing audio file_id  
          if (dryRun) {
            console.log(`  DRY: ${tc.test_id} -> sendAudio(${audioId.substring(0, 20)}...)`);
            sent++;
            continue;
          }
          result = await sendAudio(token, chatId, audioId, caption || undefined);
        } else if (localMediaPath && existsSync(localMediaPath)) {
          // Upload from local file
          const isVoiceFile = localMediaPath.endsWith(".ogg") || localMediaPath.endsWith(".oga");
          if (dryRun) {
            console.log(`  DRY: ${tc.test_id} -> upload${isVoiceFile ? "Voice" : "Audio"}(${localMediaPath})`);
            sent++;
            continue;
          }
          console.log(`  📤 ${tc.test_id}: uploading local ${isVoiceFile ? "voice" : "audio"}...`);
          if (isVoiceFile) {
            result = await uploadVoice(token, chatId, localMediaPath, caption || undefined);
          } else {
            result = await uploadAudio(token, chatId, localMediaPath, caption || undefined);
          }
        } else {
          console.log(`  ✗ ERROR ${tc.test_id}: no voice/audio fixture found`);
          errors++;
          continue;
        }
        
      } else {
        console.log(`  ? UNKNOWN ${tc.test_id}: input_type=${inputType}`);
        errors++;
        continue;
      }
      
      if (result) {
        messageIds.set(tc.test_id, result.message_id);
        console.log(`  ✓ SENT ${tc.test_id}: msg_id=${result.message_id}`);
        
        // Update fixture with new message data
        const fixtureSubdir = getFixtureDir(tc.category);
        const fixturePath = join(fixturesDir, fixtureSubdir, `${tc.test_id}.json`);
        mkdirSync(dirname(fixturePath), { recursive: true });
        
        const fixture: Fixture = {
          _meta: {
            testId: tc.test_id,
            capturedAt: new Date().toISOString(),
            capturedBy: "integration-setup",
            description: tc.name,
          },
          message: result,
        };
        writeFileSync(fixturePath, JSON.stringify(fixture, null, 2));
        sent++;
        
        // Rate limit - 2 seconds between messages to avoid 429 errors
        await Bun.sleep(2000);
      }
      
    } catch (err: any) {
      console.log(`  ✗ ERROR ${tc.test_id}: ${err.message}`);
      errors++;
    }
  }
  
  console.log(`\n  Summary: ${existing} existing, ${sent} sent, ${skipped} skipped, ${errors} errors`);
  
  // Return both existing and newly sent message IDs
  return { 
    all: messageIds,
    newlySent: new Map([...messageIds].filter(([k, v]) => {
      // Filter to only include messages we sent (not pre-existing)
      const fixture = findFixture(k, fixturesDir);
      return !fixture?.message?.message_id || fixture.message.message_id !== v;
    })),
    existingCount: existing,
    sentCount: sent,
  };
}

async function runIntegrationTests(verbose: boolean): Promise<{ passed: number; failed: number; skipped: number }> {
  console.log("\n🧪 Running integration tests...");
  
  const { runIntegrationTests: runTests } = await import("./framework/integration-runner");
  const { getSpecsByCategory } = await import("./specs");
  const { TestCategory } = await import("./framework/types");
  
  const integrationSpecs = getSpecsByCategory(TestCategory.Integration);
  const results = await runTests(integrationSpecs, { verbose, dryRun: false });
  
  return {
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed && !r.skipped).length,
    skipped: results.filter(r => r.skipped).length,
  };
}

async function loadExistingMessageIds(fixturesDir: string, testCases: TestCase[]): Promise<number[]> {
  const messageIds: number[] = [];
  
  for (const tc of testCases) {
    const fixture = findFixture(tc.test_id, fixturesDir);
    if (fixture?.message?.message_id) {
      messageIds.push(fixture.message.message_id);
    }
  }
  
  // Also add a range around the known IDs to catch any stragglers
  if (messageIds.length > 0) {
    const minId = Math.min(...messageIds);
    const maxId = Math.max(...messageIds);
    // Add IDs in range that weren't in fixtures
    for (let id = minId; id <= maxId; id++) {
      if (!messageIds.includes(id)) {
        messageIds.push(id);
      }
    }
  }
  
  return messageIds.sort((a, b) => a - b);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose");
  const skipTests = args.includes("--skip-tests");
  const forceRecreate = args.includes("--force");
  
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  INTEGRATION TEST SETUP");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`  Strategy: ${forceRecreate ? "Force recreate all" : "Smart (preserve existing)"}`);
  console.log(`  Run tests: ${!skipTests}`);
  console.log("═══════════════════════════════════════════════════════════");
  
  const config = getConfig();
  const token = config.telegramBotToken;
  const testCasesChannel = config.testTelegramCasesId;
  
  if (!testCasesChannel) {
    console.error("\n❌ ERROR: TEST_TELEGRAM_CASES_ID not set");
    console.error("Add to ~/.claude/.env: TEST_TELEGRAM_CASES_ID=<channel-id>");
    process.exit(1);
  }
  
  // Safety check: Ensure we're not targeting production channels
  const productionChannelId = config.telegramChannelId;
  if (testCasesChannel === productionChannelId) {
    console.error("\n❌ SAFETY ERROR: TEST_TELEGRAM_CASES_ID matches production TELEGRAM_CHANNEL_ID");
    console.error("These must be different channels to prevent data loss!");
    process.exit(1);
  }
  
  console.log(`\n  Test Cases Channel: ${testCasesChannel} (for test messages only)`);
  
  const testDir = dirname(new URL(import.meta.url).pathname);
  const registryPath = join(testDir, "test-case-registry.csv");
  const fixturesDir = join(testDir, "fixtures");
  
  // Parse registry
  const csvContent = readFileSync(registryPath, "utf-8");
  const testCases: TestCase[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });
  
  console.log(`  Test cases: ${testCases.length}`);
  
  // Step 1: Clear existing messages (only if --force)
  if (forceRecreate) {
    const existingIds = await loadExistingMessageIds(fixturesDir, testCases);
    console.log(`  Found ${existingIds.length} existing message IDs in fixtures`);
    console.log("  --force: Clearing all and recreating");
    await clearChannel(token, testCasesChannel, existingIds, dryRun);
  }
  
  // Step 2: Populate channel with test data
  // By default, checks if messages exist and only sends missing ones
  // With --force, sends all messages fresh
  const populateResult = await populateChannel(
    token, 
    testCasesChannel, 
    testCases, 
    fixturesDir, 
    dryRun,
    !forceRecreate  // verifyFirst = true unless --force
  );
  
  // Step 3: Run integration tests (optional)
  let testResults = { passed: 0, failed: 0, skipped: 0 };
  if (!skipTests && !dryRun) {
    // Give Telegram a moment to process new messages
    if (populateResult.sentCount > 0) {
      console.log("\n⏳ Waiting 5s for Telegram to process new messages...");
      await Bun.sleep(5000);
    }
    
    testResults = await runIntegrationTests(verbose);
  }
  
  // No cleanup - messages persist for future test runs
  
  // Final summary
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Existing messages: ${populateResult.existingCount} (preserved)`);
  console.log(`  New messages sent: ${populateResult.sentCount} (will persist)`);
  if (!skipTests && !dryRun) {
    console.log(`  Tests passed: ${testResults.passed}`);
    console.log(`  Tests failed: ${testResults.failed}`);
    console.log(`  Tests skipped: ${testResults.skipped}`);
  }
  console.log("═══════════════════════════════════════════════════════════");
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

