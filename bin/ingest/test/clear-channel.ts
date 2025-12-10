#!/usr/bin/env bun
/**
 * Clear all messages from PAI Test Cases channel
 *
 * Usage: bun run test/clear-channel.ts [--confirm]
 *
 * Uses TEST_TELEGRAM_CASES_ID from environment
 */

import { getConfig } from "../lib/config";

async function deleteMessage(token: string, chatId: string, messageId: number): Promise<boolean> {
  const url = `https://api.telegram.org/bot${token}/deleteMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
  });
  const data = await res.json();
  return data.ok;
}

async function getUpdates(token: string, offset?: number): Promise<any[]> {
  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const params: any = { timeout: 1, limit: 100 };
  if (offset) params.offset = offset;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  return data.ok ? data.result : [];
}

async function main() {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");

  const config = getConfig();
  const token = config.telegramBotToken;
  const testCasesChannel = config.testTelegramCasesId;

  if (!testCasesChannel) {
    console.error("ERROR: TEST_TELEGRAM_CASES_ID not set in environment");
    console.error("Add to ~/.claude/.env: TEST_TELEGRAM_CASES_ID=<your-channel-id>");
    process.exit(1);
  }

  if (!confirm) {
    console.log("=== DRY RUN ===");
    console.log("This will delete ALL messages from PAI Test Cases channel");
    console.log(`Channel ID: ${testCasesChannel}`);
    console.log("");
    console.log("Run with --confirm to actually delete messages");
    console.log("");
  }

  console.log("Scanning for messages to delete...");
  console.log("(Note: Bot API can only see messages from when bot was added)");
  console.log("");

  // Get recent updates to find message IDs
  // We'll try a range of message IDs based on what we know exists
  let deleted = 0;
  let failed = 0;

  // Try deleting messages in a range (we know messages exist up to ~112 from recent captures)
  // Start from 1 and go up to a reasonable maximum
  const maxMessageId = 200;

  for (let msgId = 1; msgId <= maxMessageId; msgId++) {
    if (confirm) {
      const success = await deleteMessage(token, testCasesChannel, msgId);
      if (success) {
        console.log(`Deleted message ${msgId}`);
        deleted++;
      }
      // Rate limit - 30 requests per second max
      await Bun.sleep(50);
    } else {
      // In dry run, we can't know which messages exist without trying
      // Just show what we'd attempt
      if (msgId <= 10 || msgId % 20 === 0) {
        console.log(`Would try to delete message ${msgId}...`);
      }
    }
  }

  console.log("");
  console.log("=== Summary ===");
  if (confirm) {
    console.log(`Deleted: ${deleted} messages`);
  } else {
    console.log(`Would attempt to delete messages 1-${maxMessageId}`);
    console.log("Run with --confirm to execute");
  }
}

main().catch(console.error);
