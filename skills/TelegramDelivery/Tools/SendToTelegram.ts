#!/usr/bin/env bun
/**
 * SendToTelegram.ts - Send file via Telegram bot
 *
 * Usage:
 *   bun run SendToTelegram.ts -f <file> [-c "caption"] [-u user_id]
 *
 * Does ONE thing: Send a file to Telegram (Unix philosophy)
 */

import { Bot, InputFile } from 'grammy';
import { existsSync, readFileSync } from 'fs';
import { basename } from 'path';
import { parseArgs } from 'util';
import { TelegramLogger } from './Logger';

const HELP = `
SendToTelegram - Send file via Telegram bot

Usage:
  bun run SendToTelegram.ts [options]

Options:
  -f, --file <path>      File to send (required)
  -c, --caption <text>   Message caption (optional)
  -u, --user <id>        Target user ID (default: from TELEGRAM_ALLOWED_USERS first entry)
  --silent               Don't notify user (silent message)
  -h, --help             Show this help

Environment:
  TELEGRAM_BOT_TOKEN     Bot token (required)
  TELEGRAM_ALLOWED_USERS Comma-separated allowed user IDs

Exit Codes:
  0  - Success (message ID written to stdout)
  1  - Error (details on stderr)

Examples:
  bun run SendToTelegram.ts -f report.pdf -c "Your weekly report"
  bun run SendToTelegram.ts -f screenshot.png --user 123456789
  bun run SendToTelegram.ts -f notes.pdf --silent
`.trim();

// Parse arguments
const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    file: { type: 'string', short: 'f' },
    caption: { type: 'string', short: 'c' },
    user: { type: 'string', short: 'u' },
    silent: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
  allowPositionals: false,
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}

// Environment validation
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is required.');
  process.exit(1);
}

// User ID resolution
let targetUserId: number | null = null;

if (values.user) {
  targetUserId = parseInt(values.user, 10);
  if (isNaN(targetUserId)) {
    console.error('Error: --user must be a valid numeric user ID.');
    process.exit(1);
  }
} else {
  // Get from TELEGRAM_ALLOWED_USERS
  const allowedUsers = (process.env.TELEGRAM_ALLOWED_USERS || '')
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id));

  if (allowedUsers.length === 0) {
    console.error('Error: No target user specified. Use --user or set TELEGRAM_ALLOWED_USERS.');
    process.exit(1);
  }

  targetUserId = allowedUsers[0];
}

// File validation
const filePath = values.file;
if (!filePath) {
  console.error('Error: --file is required. Use --help for usage.');
  process.exit(1);
}

if (!existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

// Initialize logger
const logger = new TelegramLogger();

// Send file
async function sendFile(): Promise<void> {
  logger.log({
    event: 'send',
    file: filePath,
    user_id: targetUserId,
    caption: values.caption || null,
  });

  try {
    const bot = new Bot(BOT_TOKEN!);

    // Read file
    const fileBuffer = readFileSync(filePath!);
    const fileName = basename(filePath!);

    // Send document
    const result = await bot.api.sendDocument(
      targetUserId!,
      new InputFile(fileBuffer, fileName),
      {
        caption: values.caption,
        disable_notification: values.silent || false,
      }
    );

    logger.log({
      event: 'complete',
      message_id: result.message_id,
      file: filePath,
    });

    // Print message ID to stdout
    console.log(result.message_id);
  } catch (error) {
    logger.log({
      event: 'error',
      error: String(error),
      file: filePath,
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error sending to Telegram: ${errorMessage}`);
    process.exit(1);
  }
}

sendFile();
