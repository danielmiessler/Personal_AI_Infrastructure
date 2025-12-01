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
  console.log("Polling Telegram for new messages...\n");

  const updates = await getUpdates();
  const messages = updates
    .map((u) => u.channel_post || u.message)
    .filter((m): m is TelegramMessage => m !== undefined);

  if (messages.length === 0) {
    console.log("No new messages.");
    return;
  }

  console.log(`Found ${messages.length} message(s):\n`);

  for (const msg of messages) {
    const type = classifyContent(msg);
    const text = extractText(msg);
    const preview = text.slice(0, 60).replace(/\n/g, " ");
    const date = new Date(msg.date * 1000).toLocaleString();

    console.log(`  [${msg.message_id}] ${type} - ${date}`);
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

  const updates = await getUpdates();
  const messages = updates
    .map((u) => u.channel_post || u.message)
    .filter((m): m is TelegramMessage => m !== undefined);

  if (messages.length === 0) {
    console.log("No messages to process.");
    return;
  }

  console.log(`Processing ${messages.length} message(s)...\n`);

  for (const msg of messages) {
    const type = classifyContent(msg);
    console.log(`[${msg.message_id}] Processing ${type}...`);

    if (dryRun) {
      console.log(`  Would process as: ${type}`);
      console.log(`  Patterns: ${profile.processing.patterns[type as keyof typeof profile.processing.patterns]?.join(", ") || "(none)"}`);
      continue;
    }

    try {
      // Mark as processing
      await setReaction(msg.message_id, "⏳");

      // TODO: Implement actual processing pipeline
      // For now, just show what would happen
      console.log(`  Type: ${type}`);
      console.log(`  Text: ${extractText(msg).slice(0, 100)}...`);

      if (type === "url") {
        const url = extractUrl(msg);
        console.log(`  URL: ${url}`);
      }

      // Mark as success (placeholder)
      await setReaction(msg.message_id, "✅");
      console.log("  Status: ✅ Success");
    } catch (error) {
      await setReaction(msg.message_id, "❌");
      console.log(`  Status: ❌ Failed - ${error}`);
    }

    console.log("");
  }
}

async function handleStatus() {
  validateConfig();
  const config = getConfig();

  console.log("Ingestion Status\n");
  console.log(`  Vault: ${config.vaultPath}`);
  console.log(`  State DB: ${config.stateDb}`);
  console.log("");

  // TODO: Read from state database
  console.log("  Pending: (not yet implemented)");
  console.log("  Processed: (not yet implemented)");
  console.log("  Failed: (not yet implemented)");
}

async function handleRetry(args: string[], verbose: boolean) {
  const retryFailed = args.includes("--failed");
  let messageId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--message-id") {
      messageId = parseInt(args[++i], 10);
    }
  }

  if (retryFailed) {
    console.log("Retrying all failed messages...");
    // TODO: Implement retry logic
  } else if (messageId) {
    console.log(`Retrying message ${messageId}...`);
    // TODO: Implement retry logic
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
