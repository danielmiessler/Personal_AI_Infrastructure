#!/usr/bin/env bun

/**
 * ingest - Telegram Ingestion Pipeline for PAI Context Management
 *
 * Commands:
 *   poll      Poll Telegram for new messages
 *   process   Process pending messages through pipeline
 *   status    Show queue status
 *   retry     Retry failed messages
 *   profiles  List available profiles
 */

import { getConfig, validateConfig } from "./lib/config";
import { loadProfile } from "./lib/profiles";
import {
  getUpdates,
  downloadFile,
  setReaction,
  classifyContent,
  extractText,
  extractUrl,
  type TelegramMessage,
  type ContentType,
} from "./lib/telegram";
import { processMessage, saveToVault } from "./lib/process";
import {
  initDb,
  getLastOffset,
  setLastOffset,
  isProcessed,
  markProcessing,
  markCompleted,
  markFailed,
  getPending,
  getFailed,
  getCompleted,
  getStatusCounts,
  resetForRetry,
  resetAllFailed,
  getMessage,
} from "./lib/state";

// Telegram only supports these reaction emojis
const REACTIONS = {
  processing: "👀", // eyes - looking at it
  success: "👍",    // thumbs up
  failed: "👎",     // thumbs down
  blocked: "🚫",    // prohibited
};

const HELP = `
ingest - Telegram Ingestion Pipeline for PAI Context Management

USAGE:
  ingest <command> [options]

COMMANDS:
  poll       Poll Telegram for new messages
  process    Process all pending messages
  status     Show queue status
  retry      Retry failed messages
  profiles   List available processing profiles
  config     Show current configuration

OPTIONS:
  --profile, -p <name>   Use specific processing profile
  --verbose, -v          Show detailed output
  --dry-run              Show what would be processed without doing it

EXAMPLES:
  ingest poll                        # Check for new messages
  ingest process --verbose           # Process with detailed output
  ingest status                      # Show pending/processed counts
  ingest profiles                    # List available profiles
  ingest process --profile simple    # Use simple profile

CONFIGURATION:
  Add to ~/.config/fabric/.env:
    TELEGRAM_BOT_TOKEN=your_bot_token
    TELEGRAM_CHANNEL_ID=your_channel_id
    INGEST_PROFILE=zettelkasten

PROFILES:
  zettelkasten  - Paired Raw+Wisdom files with backlinks (default)
  simple        - Single processed output file

See docs/architecture/telegram-ingestion.md for full documentation.
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  // Parse global options
  const verbose = commandArgs.includes("--verbose") || commandArgs.includes("-v");
  const dryRun = commandArgs.includes("--dry-run");
  let profileName: string | undefined;

  for (let i = 0; i < commandArgs.length; i++) {
    if (commandArgs[i] === "--profile" || commandArgs[i] === "-p") {
      profileName = commandArgs[++i];
    }
  }

  try {
    switch (command) {
      case "poll":
        await handlePoll(verbose);
        break;
      case "process":
        await handleProcess(profileName, verbose, dryRun);
        break;
      case "status":
        await handleStatus();
        break;
      case "retry":
        await handleRetry(commandArgs, verbose);
        break;
      case "profiles":
        handleProfiles();
        break;
      case "config":
        handleConfig();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log("Run 'ingest --help' for usage.");
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function handlePoll(verbose: boolean) {
  validateConfig();
  initDb();

  const lastOffset = getLastOffset();
  console.log("Polling Telegram for new messages...");
  if (verbose && lastOffset) {
    console.log(`  Last offset: ${lastOffset}`);
  }
  console.log("");

  const updates = await getUpdates(lastOffset);
  const messages = updates
    .map((u) => u.channel_post || u.message)
    .filter((m): m is TelegramMessage => m !== undefined);

  // Track the highest update_id for next poll
  if (updates.length > 0) {
    const maxUpdateId = Math.max(...updates.map((u) => u.update_id));
    setLastOffset(maxUpdateId + 1); // Telegram expects offset = last_id + 1
  }

  // Filter out already processed messages
  const newMessages = messages.filter((m) => !isProcessed(m.message_id));

  if (newMessages.length === 0) {
    console.log("No new messages.");
    return;
  }

  console.log(`Found ${newMessages.length} new message(s):\n`);

  for (const msg of newMessages) {
    const type = classifyContent(msg);
    const text = extractText(msg);
    const preview = text.slice(0, 60).replace(/\n/g, " ");
    const date = new Date(msg.date * 1000).toLocaleString();
    const existing = getMessage(msg.message_id);
    const status = existing?.status || "new";

    console.log(`  [${msg.message_id}] ${type} - ${date} (${status})`);
    if (preview) {
      console.log(`           ${preview}${text.length > 60 ? "..." : ""}`);
    }
    if (verbose) {
      console.log(`           Keys: ${Object.keys(msg).join(", ")}`);
    }
  }
}

async function handleProcess(
  profileName: string | undefined,
  verbose: boolean,
  dryRun: boolean
) {
  validateConfig();
  initDb();
  const profile = loadProfile(profileName);

  console.log(`Using profile: ${profile.name}`);
  if (verbose) {
    console.log(`  Paired output: ${profile.processing.pairedOutput}`);
    console.log(`  Voice patterns: ${profile.processing.patterns.voice.join(", ") || "(none)"}`);
  }
  console.log("");

  if (dryRun) {
    console.log("DRY RUN - no changes will be made\n");
  }

  const lastOffset = getLastOffset();
  const updates = await getUpdates(lastOffset);
  const allMessages = updates
    .map((u) => u.channel_post || u.message)
    .filter((m): m is TelegramMessage => m !== undefined);

  // Track the highest update_id for next poll
  if (updates.length > 0) {
    const maxUpdateId = Math.max(...updates.map((u) => u.update_id));
    setLastOffset(maxUpdateId + 1);
  }

  // Filter out already processed messages
  const messages = allMessages.filter((m) => !isProcessed(m.message_id));

  if (messages.length === 0) {
    console.log("No new messages to process.");
    return;
  }

  console.log(`Processing ${messages.length} message(s)...\n`);

  for (const msg of messages) {
    const type = classifyContent(msg);
    console.log(`[${msg.message_id}] Processing ${type}...`);

    if (dryRun) {
      console.log(`  Would process as: ${type}`);
      const patterns = profile.processing.patterns[type as keyof typeof profile.processing.patterns];
      console.log(`  Patterns: ${patterns?.join(", ") || "(none)"}`);
      console.log(`  Paired output: ${profile.processing.pairedOutput}`);
      continue;
    }

    try {
      // Mark as processing in DB and Telegram
      markProcessing(msg.message_id, type);
      await setReaction(msg.message_id, REACTIONS.processing);

      // Process the message (returns ProcessResult with security checks)
      const result = await processMessage(msg, type, profile);

      // Check if security blocked the message
      if (!result.success) {
        if (result.securityBlocked) {
          console.log(`  ⚠️  Security blocked: ${result.error}`);
          markFailed(msg.message_id, `Security blocked: ${result.error}`);
          await setReaction(msg.message_id, REACTIONS.blocked);
          continue;
        }
        throw new Error(result.error || "Processing failed");
      }

      // Log security warnings if any
      if (result.securityWarnings && result.securityWarnings.length > 0) {
        console.log(`  ⚠️  Warnings: ${result.securityWarnings.join(", ")}`);
      }

      // Save to vault
      const savedPaths: string[] = [];
      const contents = result.content || [];
      for (let i = 0; i < contents.length; i++) {
        const isWisdom = i > 0; // First is raw, second is wisdom
        const path = await saveToVault(contents[i], profile, isWisdom);
        savedPaths.push(path);
        if (verbose) {
          console.log(`  Saved: ${path}`);
        }
      }

      // Mark as success in DB and Telegram
      markCompleted(msg.message_id, savedPaths);
      await setReaction(msg.message_id, REACTIONS.success);
      console.log(`  Status: ✅ Created ${savedPaths.length} note(s)`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      markFailed(msg.message_id, errorMsg);
      await setReaction(msg.message_id, REACTIONS.failed);
      console.log(`  Status: ❌ Failed - ${errorMsg}`);
      if (verbose) {
        console.error(error);
      }
    }

    console.log("");
  }
}

async function handleStatus() {
  validateConfig();
  initDb();
  const config = getConfig();

  console.log("Ingestion Status\n");
  console.log(`  Vault: ${config.vaultPath}`);
  console.log(`  State DB: ${config.stateDb}`);
  console.log("");

  const counts = getStatusCounts();
  console.log(`  Pending:    ${counts.pending}`);
  console.log(`  Processing: ${counts.processing}`);
  console.log(`  Completed:  ${counts.completed}`);
  console.log(`  Failed:     ${counts.failed}`);
  console.log("");

  // Show recent failures
  const failed = getFailed();
  if (failed.length > 0) {
    console.log("Recent Failures:");
    for (const msg of failed.slice(0, 5)) {
      console.log(`  [${msg.messageId}] ${msg.contentType} - ${msg.error?.slice(0, 50)}...`);
    }
    console.log("");
    console.log("Use 'ingest retry --failed' to retry all, or 'ingest retry --message-id <id>' to retry one.");
  }

  // Show recently completed
  const completed = getCompleted(5);
  if (completed.length > 0) {
    console.log("\nRecently Processed:");
    for (const msg of completed) {
      const paths = msg.outputPaths ? JSON.parse(msg.outputPaths) : [];
      console.log(`  [${msg.messageId}] ${msg.contentType} → ${paths.length} file(s)`);
    }
  }
}

async function handleRetry(args: string[], verbose: boolean) {
  validateConfig();
  initDb();

  const retryFailed = args.includes("--failed");
  let messageId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--message-id") {
      messageId = parseInt(args[++i], 10);
    }
  }

  if (retryFailed) {
    const count = resetAllFailed();
    console.log(`Reset ${count} failed message(s) to pending.`);
    console.log("\nRun 'ingest process' to reprocess them.");
    console.log("Note: Messages must still be in Telegram's buffer (last 24h) to be refetched.");
  } else if (messageId) {
    const msg = getMessage(messageId);
    if (!msg) {
      console.error(`Message ${messageId} not found in state database.`);
      console.log("Try running 'ingest status' to see tracked messages.");
      process.exit(1);
    }
    resetForRetry(messageId);
    console.log(`Reset message ${messageId} (${msg.contentType}) to pending.`);
    console.log("\nRun 'ingest process' to reprocess it.");
    console.log("Note: Message must still be in Telegram's buffer to be refetched.");
  } else {
    console.error("Usage: ingest retry --failed OR ingest retry --message-id <id>");
    process.exit(1);
  }
}

function handleProfiles() {
  console.log("Available Processing Profiles\n");

  console.log("  zettelkasten (default)");
  console.log("    Paired Raw+Wisdom files with backlinks");
  console.log("    Uses: extract_wisdom, extract_article_wisdom");
  console.log("");

  console.log("  simple");
  console.log("    Single processed output file");
  console.log("    Uses: summarize");
  console.log("");

  console.log("Custom profiles can be placed in:");
  console.log("  ~/.config/pai/profiles/<name>.json");
  console.log("  ~/.config/fabric/profiles/<name>.json");
}

function handleConfig() {
  try {
    const config = getConfig();
    const profile = loadProfile();

    console.log("Current Configuration\n");
    console.log(`  Bot Token: ${config.telegramBotToken ? "***" + config.telegramBotToken.slice(-4) : "(not set)"}`);
    console.log(`  Channel ID: ${config.telegramChannelId || "(not set)"}`);
    console.log(`  Vault Path: ${config.vaultPath}`);
    console.log(`  State DB: ${config.stateDb}`);
    console.log(`  Temp Dir: ${config.tempDir}`);
    console.log("");
    console.log(`  Profile: ${profile.name}`);
    console.log(`  Paired Output: ${profile.processing.pairedOutput}`);
  } catch (error) {
    console.error(`Configuration error: ${error instanceof Error ? error.message : error}`);
  }
}

main();
