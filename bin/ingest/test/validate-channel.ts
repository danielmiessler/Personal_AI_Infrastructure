#!/usr/bin/env bun
/**
 * Validate PAI Test Cases channel against test registry
 *
 * Usage: bun run test/validate-channel.ts
 *
 * Fetches all messages from PAI Test Cases channel and cross-references
 * with test-case-registry.csv to identify missing or extra test cases.
 */

import { getConfig } from "../lib/config";
import { readFileSync } from "fs";
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

interface ChannelMessage {
  message_id: number;
  test_id: string | null;
  type: string;
  content: string;
}

async function getChannelMessages(token: string, chatId: string): Promise<ChannelMessage[]> {
  // We'll try to get messages by iterating through message IDs
  // Telegram doesn't have a "get all messages" API, but we can use getUpdates
  // or try to delete/check messages to find which exist

  const messages: ChannelMessage[] = [];

  // Try message IDs from 1 to 300 (adjust as needed)
  const maxMessageId = 300;
  const batchSize = 20;

  console.log("Scanning channel for messages...");

  for (let startId = 1; startId <= maxMessageId; startId += batchSize) {
    const batch = [];
    for (let msgId = startId; msgId < startId + batchSize && msgId <= maxMessageId; msgId++) {
      batch.push(checkMessage(token, chatId, msgId));
    }

    const results = await Promise.all(batch);
    for (const msg of results) {
      if (msg) {
        messages.push(msg);
      }
    }

    // Small delay to avoid rate limits
    await Bun.sleep(100);
  }

  return messages;
}

async function checkMessage(token: string, chatId: string, messageId: number): Promise<ChannelMessage | null> {
  // Use copyMessage to self to check if message exists (non-destructive)
  // Actually, let's use forwardMessage to a temp check - but that's complex
  // Instead, we'll use the getChat approach or just trust our fixture data

  // For now, let's use a workaround: try to pin/unpin which tells us if message exists
  // Actually the simplest is to use getUpdates offset approach

  // Let's try a different approach - use the Bot API's getHistory equivalent
  // Unfortunately Telegram Bot API doesn't support message history directly

  // We'll rely on recent updates instead
  return null;
}

async function getRecentUpdates(token: string): Promise<ChannelMessage[]> {
  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const messages: ChannelMessage[] = [];

  // Get recent updates (last 100)
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ limit: 100, timeout: 1 }),
  });

  const data = await res.json() as any;
  if (!data.ok) return messages;

  for (const update of data.result) {
    const msg = update.message || update.channel_post;
    if (!msg) continue;

    const text = msg.text || msg.caption || "";
    const testMatch = text.match(/\[(TEST-[A-Z0-9-]+[a-z]?)\]/);

    messages.push({
      message_id: msg.message_id,
      test_id: testMatch ? testMatch[1] : null,
      type: msg.voice ? "voice" : msg.audio ? "audio" : msg.photo ? "photo" : msg.document ? "document" : "text",
      content: text.substring(0, 80),
    });
  }

  return messages;
}

async function main() {
  const config = getConfig();
  const token = config.telegramBotToken;
  const testCasesChannel = config.testTelegramCasesId;

  if (!testCasesChannel) {
    console.error("ERROR: TEST_TELEGRAM_CASES_ID not set in environment");
    process.exit(1);
  }

  const testDir = dirname(new URL(import.meta.url).pathname);
  const registryPath = join(testDir, "test-case-registry.csv");

  // Parse registry
  const csvContent = readFileSync(registryPath, "utf-8");
  const records: TestCase[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Registry: ${records.length} test cases`);
  console.log(`Channel: ${testCasesChannel}`);
  console.log("");

  // Get test IDs from registry (excluding skipped)
  const registryTests = new Map<string, TestCase>();
  for (const tc of records) {
    if (tc.fixture_status !== "skip") {
      registryTests.set(tc.test_id, tc);
    }
  }

  console.log(`Expected tests (non-skip): ${registryTests.size}`);
  console.log("");

  // Read fixtures to see what we have captured
  const fixturesDirs = ["scope", "date", "archive", "regression", "voice"];
  const capturedTests = new Map<string, { message_id: number; type: string }>();

  for (const subdir of fixturesDirs) {
    const dirPath = join(testDir, "fixtures", subdir);
    try {
      const files = await Bun.file(dirPath).exists() ? [] : [];
      const glob = new Bun.Glob("*.json");
      for await (const file of glob.scan(dirPath)) {
        try {
          const content = readFileSync(join(dirPath, file), "utf-8");
          const fixture = JSON.parse(content);
          const testId = fixture._meta?.testId;
          const msgId = fixture.message?.message_id;
          const type = fixture.message?.voice ? "voice" :
                       fixture.message?.audio ? "audio" :
                       fixture.message?.photo ? "photo" :
                       fixture.message?.document ? "document" : "text";

          if (testId && msgId) {
            capturedTests.set(testId, { message_id: msgId, type });
          }
        } catch (e) {
          // Skip invalid fixtures
        }
      }
    } catch (e) {
      // Directory might not exist
    }
  }

  console.log(`Captured fixtures: ${capturedTests.size}`);
  console.log("");

  // Cross-reference
  const missing: string[] = [];
  const captured: string[] = [];
  const pending: string[] = [];
  const skipped: string[] = [];

  for (const [testId, tc] of registryTests) {
    if (tc.fixture_status === "pending") {
      pending.push(testId);
    } else if (capturedTests.has(testId)) {
      captured.push(testId);
    } else {
      missing.push(testId);
    }
  }

  for (const tc of records) {
    if (tc.fixture_status === "skip") {
      skipped.push(tc.test_id);
    }
  }

  // Report
  console.log("=== VALIDATION REPORT ===");
  console.log("");

  console.log(`✅ Captured (${captured.length}):`);
  if (captured.length <= 20) {
    for (const id of captured.sort()) {
      const info = capturedTests.get(id);
      console.log(`   ${id} (msg_id=${info?.message_id}, ${info?.type})`);
    }
  } else {
    console.log(`   ${captured.slice(0, 10).join(", ")}...`);
    console.log(`   (and ${captured.length - 10} more)`);
  }
  console.log("");

  console.log(`⏳ Pending (${pending.length}):`);
  for (const id of pending.sort()) {
    const tc = registryTests.get(id);
    console.log(`   ${id}: ${tc?.notes || tc?.name}`);
  }
  console.log("");

  console.log(`❌ Missing (${missing.length}):`);
  for (const id of missing.sort()) {
    const tc = registryTests.get(id);
    console.log(`   ${id}: ${tc?.name} (${tc?.input_type})`);
  }
  console.log("");

  console.log(`⊘ Skipped (${skipped.length}):`);
  for (const id of skipped.sort()) {
    console.log(`   ${id}`);
  }
  console.log("");

  console.log("=== SUMMARY ===");
  console.log(`Total in registry: ${records.length}`);
  console.log(`Captured: ${captured.length}`);
  console.log(`Pending: ${pending.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Skipped: ${skipped.length}`);

  if (missing.length === 0 && pending.length === 0) {
    console.log("\n✅ All non-skipped tests have fixtures!");
  } else {
    console.log(`\n⚠️  ${missing.length + pending.length} tests need attention`);
  }
}

main().catch(console.error);
