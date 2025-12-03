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
  sendNotification,
  isFromInbox,
  isQueryCommand,
  extractQueryText,
  sendQueryResponse,
  isHelpCommand,
  sendHelpResponse,
  type TelegramMessage,
  type ContentType,
  type TelegramQueryResult,
} from "./lib/telegram";
import { processMessage, saveToVault, type SaveResult } from "./lib/process";
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
  getCachedMessage,
  getRetryableMessages,
} from "./lib/state";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

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
  watch      Continuously poll and process (daemon mode)
  status     Show queue status
  retry      Retry failed messages
  query      Search vault and archive (context retrieval)
  profiles   List available processing profiles
  config     Show current configuration
  test       Run automated tests (capture/replay fixtures)

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
      case "watch":
        await handleWatch(profileName, verbose, commandArgs);
        break;
      case "status":
        await handleStatus();
        break;
      case "retry":
        await handleRetry(commandArgs, verbose);
        break;
      case "query":
        await handleQuery(commandArgs, verbose);
        break;
      case "profiles":
        handleProfiles();
        break;
      case "config":
        handleConfig();
        break;
      case "test":
        await handleTest(commandArgs, verbose);
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

  // Note: poll is read-only - it previews but doesn't advance the offset
  // Only the 'process' command should advance the offset after processing
  const updates = await getUpdates(lastOffset);
  const messages = updates
    .map((u) => u.channel_post || u.message)
    .filter((m): m is TelegramMessage => m !== undefined)
    .filter((m) => isFromInbox(m));

  // Filter out already processed messages (but don't advance offset)
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
    // Check if this is a /help command
    if (isHelpCommand(msg)) {
      console.log(`[${msg.message_id}] Help request`);
      if (!dryRun) {
        await sendHelpResponse(msg.message_id);
        markCompleted(msg.message_id, ["help"]);
        console.log(`  ✅ Sent help response`);
      }
      continue;
    }

    // Check if this is a /query command (context retrieval request)
    if (isQueryCommand(msg)) {
      const queryText = extractQueryText(msg);
      console.log(`[${msg.message_id}] Query: "${queryText}"`);

      if (dryRun) {
        console.log(`  Would search for: ${queryText}`);
        continue;
      }

      try {
        await setReaction(msg.message_id, REACTIONS.processing);

        // Run semantic search
        const results = await executeQuery(queryText, 10);

        // Send response to Telegram
        await sendQueryResponse(msg.message_id, queryText, results);

        // Mark as completed (query, not content)
        markCompleted(msg.message_id, ["query"]);
        await setReaction(msg.message_id, REACTIONS.success);
        console.log(`  ✅ Sent ${results.length} results`);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        console.log(`  ❌ Query failed: ${error}`);
        markFailed(msg.message_id, error);
        await setReaction(msg.message_id, REACTIONS.failed);
      }
      continue;
    }

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
      markProcessing(msg.message_id, type, msg);  // Cache message for retry
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
      let dropboxPath: string | undefined;

      for (let i = 0; i < contents.length; i++) {
        const isWisdom = i > 0; // First is raw, second is wisdom
        const saveResult = await saveToVault(contents[i], profile, isWisdom);
        savedPaths.push(saveResult.vaultPath);
        if (saveResult.dropboxPath) {
          dropboxPath = saveResult.dropboxPath;
        }
        if (verbose) {
          console.log(`  Saved: ${saveResult.vaultPath}`);
          if (saveResult.dropboxPath) {
            console.log(`  Synced to Dropbox: ${saveResult.dropboxPath}`);
          }
        }
      }

      // Mark as success in DB and Telegram
      markCompleted(msg.message_id, savedPaths);
      await setReaction(msg.message_id, REACTIONS.success);
      console.log(`  Status: ✅ Created ${savedPaths.length} note(s)`);

      // Send notification to Events channel
      const config = getConfig();
      const originalFilename = msg.audio?.title ||
        msg.audio?.file_name ||
        msg.document?.file_name ||
        (msg.voice ? `voice_${msg.message_id}.ogg` : undefined);
      const pipeline = contents[0]?.pipeline;

      await sendNotification({
        messageId: msg.message_id,
        status: "success",
        contentType: type,
        title: contents[0]?.title || "Processed",
        originalFilename,
        outputPaths: savedPaths,
        dropboxPath,
        pipeline,
        obsidianVaultName: config.vaultName,
        sourceMetadata: contents[0]?.sourceMetadata,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      markFailed(msg.message_id, errorMsg);
      await setReaction(msg.message_id, REACTIONS.failed);
      console.log(`  Status: ❌ Failed - ${errorMsg}`);
      if (verbose) {
        console.error(error);
      }

      // Send failure notification to outbox
      const config = getConfig();
      await sendNotification({
        messageId: msg.message_id,
        status: "failed",
        contentType: type,
        title: extractText(msg).slice(0, 50) || "Processing failed",
        error: errorMsg,
        obsidianVaultName: config.vaultName,
      });
    }

    console.log("");
  }
}

/**
 * Watch mode - continuously poll and process messages
 */
async function handleWatch(
  profileName: string | undefined,
  verbose: boolean,
  args: string[]
) {
  validateConfig();
  initDb();
  const profile = loadProfile(profileName);

  // Parse interval (default 30 seconds)
  let intervalSeconds = 30;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--interval" || args[i] === "-i") {
      intervalSeconds = parseInt(args[++i], 10) || 30;
    }
  }

  console.log(`🔄 Watch mode started`);
  console.log(`   Profile: ${profile.name}`);
  console.log(`   Interval: ${intervalSeconds}s`);
  console.log(`   Press Ctrl+C to stop\n`);

  let running = true;
  process.on("SIGINT", () => {
    console.log("\n\n⏹️  Stopping watch mode...");
    running = false;
  });

  while (running) {
    try {
      // Poll for new messages
      const lastOffset = getLastOffset();
      const updates = await getUpdates(lastOffset);
      const messages = updates
        .map((u) => u.channel_post || u.message)
        .filter((m): m is TelegramMessage => m !== undefined)
        .filter((m) => isFromInbox(m));

      // Update offset
      if (updates.length > 0) {
        const maxUpdateId = Math.max(...updates.map((u) => u.update_id));
        setLastOffset(maxUpdateId + 1);
      }

      // Filter already processed
      const newMessages = messages.filter((m) => !isProcessed(m.message_id));

      if (newMessages.length > 0) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Found ${newMessages.length} new message(s)`);

        // Process each message
        for (const msg of newMessages) {
          const type = classifyContent(msg);
          console.log(`  [${msg.message_id}] Processing ${type}...`);

          try {
            markProcessing(msg.message_id, type, msg);  // Cache message for retry
            await setReaction(msg.message_id, REACTIONS.processing);

            const result = await processMessage(msg, type, profile);

            if (!result.success) {
              if (result.securityBlocked) {
                console.log(`    ⚠️  Security blocked: ${result.error}`);
                markFailed(msg.message_id, `Security: ${result.error}`);
                await setReaction(msg.message_id, REACTIONS.blocked);
                continue;
              }
              throw new Error(result.error || "Processing failed");
            }

            // Save to vault
            const savedPaths: string[] = [];
            const contents = result.content || [];
            let dropboxPath: string | undefined;

            for (let i = 0; i < contents.length; i++) {
              const isWisdom = i > 0;
              const saveResult = await saveToVault(contents[i], profile, isWisdom);
              savedPaths.push(saveResult.vaultPath);
              if (saveResult.dropboxPath) {
                dropboxPath = saveResult.dropboxPath;
              }
              if (verbose) {
                console.log(`    Saved: ${saveResult.vaultPath}`);
              }
            }

            markCompleted(msg.message_id, savedPaths);
            await setReaction(msg.message_id, REACTIONS.success);
            console.log(`    ✅ Created ${savedPaths.length} note(s)`);

            // Send notification to Events channel
            const config = getConfig();
            const originalFilename = msg.audio?.title ||
              msg.audio?.file_name ||
              msg.document?.file_name ||
              (msg.voice ? `voice_${msg.message_id}.ogg` : undefined);
            const pipeline = contents[0]?.pipeline;

            await sendNotification({
              messageId: msg.message_id,
              status: "success",
              contentType: type,
              title: contents[0]?.title || "Processed",
              originalFilename,
              outputPaths: savedPaths,
              dropboxPath,
              pipeline,
              obsidianVaultName: config.vaultName,
              sourceMetadata: contents[0]?.sourceMetadata,
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            markFailed(msg.message_id, errorMsg);
            await setReaction(msg.message_id, REACTIONS.failed);
            console.log(`    ❌ Failed: ${errorMsg}`);

            // Send failure notification to outbox
            const config = getConfig();
            await sendNotification({
              messageId: msg.message_id,
              status: "failed",
              contentType: type,
              title: extractText(msg).slice(0, 50) || "Processing failed",
              error: errorMsg,
              obsidianVaultName: config.vaultName,
            });
          }
        }
        console.log("");
      } else if (verbose) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] No new messages`);
      }

      // Wait for next interval
      if (running) {
        await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
      }
    } catch (error) {
      console.error(`Poll error: ${error instanceof Error ? error.message : error}`);
      // Wait before retrying on error
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  console.log("Watch mode stopped.");
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
  const profile = loadProfile();

  const retryFailed = args.includes("--failed");
  const processNow = args.includes("--now");  // Reprocess immediately using cached message
  const listRetryable = args.includes("--list");
  let messageId: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--message-id" || args[i] === "-m") {
      messageId = parseInt(args[++i], 10);
    }
  }

  // List retryable messages (those with cached JSON)
  if (listRetryable) {
    const retryable = getRetryableMessages();
    if (retryable.length === 0) {
      console.log("No failed messages with cached content available for retry.");
      return;
    }
    console.log("Failed messages available for retry:\n");
    for (const msg of retryable) {
      console.log(`  [${msg.messageId}] ${msg.contentType}`);
      if (msg.error) {
        console.log(`      Error: ${msg.error.slice(0, 80)}${msg.error.length > 80 ? "..." : ""}`);
      }
    }
    console.log("\nUse: ingest retry --message-id <id> --now");
    return;
  }

  if (retryFailed && processNow) {
    // Reprocess all failed messages using cached JSON
    const retryable = getRetryableMessages();
    if (retryable.length === 0) {
      console.log("No failed messages with cached content available for retry.");
      return;
    }

    console.log(`Reprocessing ${retryable.length} failed message(s)...\n`);
    let success = 0;
    let failed = 0;

    for (const msgInfo of retryable) {
      const cachedMsg = getCachedMessage(msgInfo.messageId) as TelegramMessage;
      if (!cachedMsg) {
        console.log(`  [${msgInfo.messageId}] No cached message, skipping`);
        failed++;
        continue;
      }

      console.log(`  [${msgInfo.messageId}] Processing ${msgInfo.contentType}...`);
      try {
        const type = msgInfo.contentType as ContentType;
        markProcessing(msgInfo.messageId, type, cachedMsg);

        const result = await processMessage(cachedMsg, type, profile);
        if (!result.success) {
          throw new Error(result.error || "Processing failed");
        }

        const savedPaths: string[] = [];
        for (let i = 0; i < (result.content || []).length; i++) {
          const content = result.content![i];
          const isWisdom = i > 0;
          const saveResult = await saveToVault(content, profile, isWisdom);
          savedPaths.push(saveResult.vaultPath);
        }

        markCompleted(msgInfo.messageId, savedPaths);
        console.log(`    ✅ Saved to: ${savedPaths.map(p => p.split("/").pop()).join(", ")}`);
        success++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        markFailed(msgInfo.messageId, errorMsg);
        console.log(`    ❌ Failed: ${errorMsg}`);
        failed++;
      }
    }

    console.log(`\nRetry complete: ${success} succeeded, ${failed} failed`);
  } else if (retryFailed) {
    const count = resetAllFailed();
    console.log(`Reset ${count} failed message(s) to pending.`);
    console.log("\nRun 'ingest retry --failed --now' to reprocess using cached messages.");
    console.log("Or run 'ingest process' to refetch from Telegram (if still available).");
  } else if (messageId && processNow) {
    // Reprocess specific message using cached JSON
    const msgState = getMessage(messageId);
    if (!msgState) {
      console.error(`Message ${messageId} not found in state database.`);
      process.exit(1);
    }

    const cachedMsg = getCachedMessage(messageId) as TelegramMessage;
    if (!cachedMsg) {
      console.error(`No cached message content for ${messageId}.`);
      console.log("This message cannot be retried without refetching from Telegram.");
      process.exit(1);
    }

    console.log(`Reprocessing message ${messageId} (${msgState.contentType})...`);
    try {
      const type = msgState.contentType as ContentType;
      markProcessing(messageId, type, cachedMsg);

      const result = await processMessage(cachedMsg, type, profile);
      if (!result.success) {
        throw new Error(result.error || "Processing failed");
      }

      const savedPaths: string[] = [];
      for (let i = 0; i < (result.content || []).length; i++) {
        const content = result.content![i];
        const isWisdom = i > 0;
        const saveResult = await saveToVault(content, profile, isWisdom);
        savedPaths.push(saveResult.vaultPath);
      }

      markCompleted(messageId, savedPaths);
      console.log(`✅ Saved to:`);
      for (const p of savedPaths) {
        console.log(`   ${p}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      markFailed(messageId, errorMsg);
      console.error(`❌ Failed: ${errorMsg}`);
      process.exit(1);
    }
  } else if (messageId) {
    const msg = getMessage(messageId);
    if (!msg) {
      console.error(`Message ${messageId} not found in state database.`);
      console.log("Try running 'ingest status' to see tracked messages.");
      process.exit(1);
    }
    resetForRetry(messageId);
    console.log(`Reset message ${messageId} (${msg.contentType}) to pending.`);

    const cached = getCachedMessage(messageId);
    if (cached) {
      console.log("\nRun 'ingest retry --message-id ${messageId} --now' to reprocess using cached content.");
    } else {
      console.log("\nRun 'ingest process' to refetch from Telegram.");
      console.log("Note: Message must still be in Telegram's buffer to be refetched.");
    }
  } else {
    console.error("Usage:");
    console.error("  ingest retry --list                     # List retryable messages");
    console.error("  ingest retry --failed                   # Reset all failed to pending");
    console.error("  ingest retry --failed --now             # Reprocess all failed using cached content");
    console.error("  ingest retry --message-id <id>          # Reset specific message to pending");
    console.error("  ingest retry --message-id <id> --now    # Reprocess specific message using cached content");
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

/**
 * Handle query command - full context retrieval from vault and archive
 *
 * Usage:
 *   ingest query "what did I discuss with Ed?"     # Semantic search
 *   ingest query "project PAI status"              # Natural language
 *   ingest query --type CONTRACT                   # Filter by document type
 *   ingest query --category HOME                   # Filter by category
 *   ingest query --archive                         # Search Dropbox archive only
 *   ingest query --tag project/pai                 # Filter by tag
 *   ingest query --person ed_overy                 # Filter by person
 */
async function handleQuery(args: string[], verbose: boolean) {
  const config = getConfig();

  // Parse query arguments
  let searchText = "";
  let docType: string | undefined;
  let category: string | undefined;
  let archiveOnly = false;
  let semanticOnly = false;
  let year: number | undefined;
  let tag: string | undefined;
  let person: string | undefined;
  let limit = 10;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--type" || arg === "-t") {
      docType = args[++i]?.toUpperCase();
    } else if (arg === "--category" || arg === "-c") {
      category = args[++i]?.toUpperCase();
    } else if (arg === "--archive" || arg === "-a") {
      archiveOnly = true;
    } else if (arg === "--semantic" || arg === "-s") {
      semanticOnly = true;
    } else if (arg === "--year" || arg === "-y") {
      year = parseInt(args[++i], 10);
    } else if (arg === "--tag") {
      tag = args[++i];
    } else if (arg === "--person" || arg === "-p") {
      person = args[++i];
    } else if (arg === "--limit" || arg === "-l") {
      limit = parseInt(args[++i], 10) || 10;
    } else if (!arg.startsWith("-") && !arg.startsWith("--")) {
      searchText = arg;
    }
  }

  if (!searchText && !docType && !category && !year && !tag && !person) {
    console.log("Query - Context retrieval from vault and archive\n");
    console.log("Usage:");
    console.log('  ingest query "what did I discuss with Ed?"    # Semantic search');
    console.log('  ingest query "project PAI status"             # Natural language');
    console.log("  ingest query --tag project/pai                # Filter by tag");
    console.log("  ingest query --person ed_overy                # Filter by person");
    console.log("  ingest query --type CONTRACT                  # Archive by type");
    console.log("  ingest query --category HOME                  # Archive by category");
    console.log("  ingest query --archive                        # Dropbox archive only");
    console.log("  ingest query --semantic                       # Semantic search only");
    console.log("  ingest query --limit 20                       # Limit results");
    console.log("");
    console.log("Archive Types: CONTRACT, RECEIPT, DOCUMENT, CORRESPONDANCE, REPORT");
    console.log("Categories: HOME, WORK, CAR, HEALTH, MISC");
    return;
  }

  console.log("🔍 Searching...\n");

  // Track all results
  const allResults: ContextResult[] = [];

  // 1. Semantic search across vault (primary for natural language queries)
  if (searchText && !archiveOnly) {
    try {
      const semanticResults = await runSemanticSearch(searchText, limit, verbose);
      allResults.push(...semanticResults);
      if (verbose && semanticResults.length > 0) {
        console.log(`  Found ${semanticResults.length} semantic matches`);
      }
    } catch (e) {
      if (verbose) {
        console.log(`  Semantic search unavailable: ${e}`);
      }
    }
  }

  // 2. Tag-based search
  if ((tag || person) && !archiveOnly && !semanticOnly) {
    const tagResults = await searchByTag(config.vaultPath, { tag, person, limit });
    allResults.push(...tagResults);
    if (verbose && tagResults.length > 0) {
      console.log(`  Found ${tagResults.length} tag matches`);
    }
  }

  // 3. Archive search (Dropbox + vault archive folder)
  if ((docType || category || year || archiveOnly) && !semanticOnly) {
    // Dropbox archive
    const dropboxPath = config.dropboxArchivePath;
    if (dropboxPath && existsSync(dropboxPath)) {
      const archiveResults = await searchArchive(dropboxPath, {
        type: docType,
        category,
        year,
        textSearch: searchText,
      });
      for (const r of archiveResults) {
        allResults.push({
          title: r.filename,
          path: r.path,
          source: "dropbox",
          type: "archive",
          preview: `${r.type} - ${r.date} - ${r.category}`,
          relevance: 0.8,
        });
      }
    }

    // Vault archive folder
    const vaultArchivePath = join(config.vaultPath, "archive");
    if (existsSync(vaultArchivePath)) {
      const vaultArchiveResults = await searchVaultArchive(vaultArchivePath, {
        type: docType,
        category,
        year,
        textSearch: searchText,
      });
      for (const r of vaultArchiveResults) {
        allResults.push({
          title: r.filename,
          path: r.path,
          source: "vault-archive",
          type: "archive",
          preview: `${r.type} - ${r.date} - ${r.category}`,
          relevance: 0.8,
        });
      }
    }
  }

  // Deduplicate by path
  const seen = new Set<string>();
  const uniqueResults = allResults.filter(r => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  // Sort by relevance
  uniqueResults.sort((a, b) => b.relevance - a.relevance);
  const finalResults = uniqueResults.slice(0, limit);

  if (finalResults.length === 0) {
    console.log("No results found.");
    return;
  }

  console.log(`📋 Found ${finalResults.length} result(s):\n`);

  // Group by source
  const bySource = new Map<string, ContextResult[]>();
  for (const r of finalResults) {
    const existing = bySource.get(r.source) || [];
    existing.push(r);
    bySource.set(r.source, existing);
  }

  const sourceIcons: Record<string, string> = {
    "semantic": "🧠",
    "tag": "🏷️",
    "dropbox": "☁️",
    "vault-archive": "📂",
  };

  for (const [source, sourceResults] of bySource) {
    const icon = sourceIcons[source] || "📄";
    console.log(`\n${icon} ${source.toUpperCase()} (${sourceResults.length}):`);
    for (const r of sourceResults) {
      console.log(`  • ${r.title}`);
      if (r.preview && verbose) {
        console.log(`    ${r.preview.slice(0, 100)}${r.preview.length > 100 ? "..." : ""}`);
      }
      if (verbose) {
        console.log(`    Path: ${r.path}`);
        console.log(`    Relevance: ${(r.relevance * 100).toFixed(0)}%`);
      }
    }
  }

  console.log("");
}

interface ContextResult {
  title: string;
  path: string;
  source: "semantic" | "tag" | "dropbox" | "vault-archive";
  type: string;
  preview: string;
  relevance: number;
}

/**
 * Run semantic search using the obs embed module
 */
async function runSemanticSearch(
  query: string,
  limit: number,
  verbose: boolean
): Promise<ContextResult[]> {
  // Import dynamically to avoid circular deps
  const { semanticSearch } = await import("../obs/lib/embed");

  const results = await semanticSearch(query, limit);

  return results.map(r => ({
    title: r.noteName,
    path: r.notePath,
    source: "semantic" as const,
    type: "note",
    preview: r.content.slice(0, 200),
    relevance: r.similarity,
  }));
}

/**
 * Search by tag or person mention
 */
async function searchByTag(
  vaultPath: string,
  options: { tag?: string; person?: string; limit: number }
): Promise<ContextResult[]> {
  const results: ContextResult[] = [];

  // Use glob to find all markdown files
  const glob = new Bun.Glob("**/*.md");
  const files = await Array.fromAsync(glob.scan({ cwd: vaultPath, absolute: true }));

  for (const filePath of files.slice(0, 500)) { // Limit scan
    try {
      const content = readFileSync(filePath, "utf-8");

      // Parse frontmatter for tags
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) continue;

      const frontmatter = frontmatterMatch[1];
      const tagsMatch = frontmatter.match(/tags:\s*\n((?:\s+-\s+.+\n?)+)/);
      const tags = tagsMatch
        ? tagsMatch[1].match(/-\s+(\S+)/g)?.map(t => t.replace(/^-\s+/, "")) || []
        : [];

      // Check tag filter
      if (options.tag && !tags.some(t => t.includes(options.tag!))) {
        continue;
      }

      // Check person filter (person tags or @mentions in content)
      if (options.person) {
        const hasPerson = tags.some(t => t === options.person) ||
          content.toLowerCase().includes(`@${options.person!.toLowerCase()}`);
        if (!hasPerson) continue;
      }

      const filename = filePath.split("/").pop()?.replace(/\.md$/, "") || "";
      const preview = content.slice(frontmatterMatch[0].length, frontmatterMatch[0].length + 200);

      results.push({
        title: filename,
        path: filePath,
        source: "tag",
        type: "note",
        preview,
        relevance: 0.7,
      });

      if (results.length >= options.limit) break;
    } catch {
      // Skip unreadable files
    }
  }

  return results;
}

interface QueryResult {
  filename: string;
  path: string;
  type: string;
  date: string;
  category: string;
  description: string;
  source: "vault" | "dropbox";
}

interface SearchOptions {
  type?: string;
  category?: string;
  year?: number;
  textSearch?: string;
}

/**
 * Search Dropbox archive by parsing filenames
 */
async function searchArchive(
  archivePath: string,
  options: SearchOptions
): Promise<Omit<QueryResult, "source">[]> {
  const results: Omit<QueryResult, "source">[] = [];
  const archivePattern = /^(CONTRACT|RECEIPT|CORRESPONDANCE|DOCUMENT|REPORT)\s*-\s*(\d{8})\s*-\s*(.+?)\s*-\s*([A-Z]+)\.[a-zA-Z]+$/i;

  try {
    const files = readdirSync(archivePath);

    for (const file of files) {
      const match = file.match(archivePattern);
      if (!match) continue;

      const [, type, dateStr, description, category] = match;
      const fileYear = parseInt(dateStr.slice(0, 4), 10);

      // Apply filters
      if (options.type && type.toUpperCase() !== options.type) continue;
      if (options.category && category.toUpperCase() !== options.category) continue;
      if (options.year && fileYear !== options.year) continue;
      if (options.textSearch) {
        const searchLower = options.textSearch.toLowerCase();
        if (!description.toLowerCase().includes(searchLower) &&
            !file.toLowerCase().includes(searchLower)) {
          continue;
        }
      }

      results.push({
        filename: file,
        path: join(archivePath, file),
        type: type.toUpperCase(),
        date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
        category: category.toUpperCase(),
        description,
      });
    }
  } catch (e) {
    // Directory might not exist
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Search vault archive folder by parsing note frontmatter
 */
async function searchVaultArchive(
  vaultArchivePath: string,
  options: SearchOptions
): Promise<Omit<QueryResult, "source">[]> {
  const results: Omit<QueryResult, "source">[] = [];

  try {
    const files = readdirSync(vaultArchivePath).filter(f => f.endsWith(".md"));

    for (const file of files) {
      const filePath = join(vaultArchivePath, file);
      const content = readFileSync(filePath, "utf-8");

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) continue;

      const frontmatter = frontmatterMatch[1];
      const typeMatch = frontmatter.match(/document_type:\s*(\w+)/);
      const categoryMatch = frontmatter.match(/document_category:\s*(\w+)/);
      const dateMatch = frontmatter.match(/generation_date:\s*(\d{4}-\d{2}-\d{2})/);
      const archiveNameMatch = frontmatter.match(/archive_name:\s*"?([^"\n]+)"?/);

      const type = typeMatch?.[1]?.toUpperCase() || "DOCUMENT";
      const category = categoryMatch?.[1]?.toUpperCase() || "MISC";
      const date = dateMatch?.[1] || "";
      const archiveName = archiveNameMatch?.[1] || file;
      const fileYear = date ? parseInt(date.slice(0, 4), 10) : 0;

      // Apply filters
      if (options.type && type !== options.type) continue;
      if (options.category && category !== options.category) continue;
      if (options.year && fileYear !== options.year) continue;
      if (options.textSearch) {
        const searchLower = options.textSearch.toLowerCase();
        if (!file.toLowerCase().includes(searchLower) &&
            !content.toLowerCase().includes(searchLower)) {
          continue;
        }
      }

      results.push({
        filename: archiveName,
        path: filePath,
        type,
        date,
        category,
        description: file.replace(/\.md$/, ""),
      });
    }
  } catch (e) {
    // Directory might not exist
  }

  return results.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Execute a query for Telegram context retrieval
 *
 * This function is the bridge between Telegram /query commands and the search system.
 * Used when user sends queries via Wispr Flow or direct text to the PAI inbox channel.
 * Results are formatted for Telegram and sent back via the Events channel.
 */
async function executeQuery(
  query: string,
  limit: number
): Promise<TelegramQueryResult[]> {
  const config = getConfig();
  const results: TelegramQueryResult[] = [];

  // 1. Run semantic search (primary for natural language queries)
  try {
    const semanticResults = await runSemanticSearch(query, limit, false);
    for (const r of semanticResults) {
      results.push({
        title: r.title,
        source: "semantic",
        preview: r.preview.slice(0, 100),
        relevance: r.relevance,
      });
    }
  } catch {
    // Semantic search might fail if embeddings aren't available
  }

  // 2. Check if query mentions a person (e.g., "what did I discuss with Ed")
  const personMatch = query.match(/\bwith\s+(\w+)\b/i) ||
    query.match(/\babout\s+(\w+)\s+(?:meeting|discussion|conversation)/i) ||
    query.match(/@(\w+)/i);
  if (personMatch) {
    const person = personMatch[1].toLowerCase();
    const tagResults = await searchByTag(config.vaultPath, {
      person,
      limit: Math.min(5, limit),
    });
    for (const r of tagResults) {
      // Avoid duplicates
      if (!results.some(existing => existing.title === r.title)) {
        results.push({
          title: r.title,
          source: "tag",
          preview: r.preview.slice(0, 100),
          relevance: r.relevance,
        });
      }
    }
  }

  // 3. Check for tag mentions in query (e.g., "project PAI", "#project/pai")
  const tagMatch = query.match(/#?(project[-/]\w+)/i) ||
    query.match(/\b(project\s+\w+)\b/i);
  if (tagMatch) {
    const tag = tagMatch[1].replace(/\s+/, "-").toLowerCase();
    const tagResults = await searchByTag(config.vaultPath, {
      tag,
      limit: Math.min(5, limit),
    });
    for (const r of tagResults) {
      if (!results.some(existing => existing.title === r.title)) {
        results.push({
          title: r.title,
          source: "tag",
          preview: r.preview.slice(0, 100),
          relevance: r.relevance,
        });
      }
    }
  }

  // 4. Archive search for document-type queries
  const docTypeMatch = query.match(/\b(contract|receipt|document|report)\b/i);
  if (docTypeMatch && config.dropboxArchivePath && existsSync(config.dropboxArchivePath)) {
    const archiveResults = await searchArchive(config.dropboxArchivePath, {
      type: docTypeMatch[1].toUpperCase(),
      textSearch: query,
    });
    for (const r of archiveResults.slice(0, 5)) {
      results.push({
        title: r.filename,
        source: "dropbox",
        preview: `${r.type} - ${r.date} - ${r.category}`,
        relevance: 0.7,
      });
    }
  }

  // Sort by relevance and limit
  results.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
  return results.slice(0, limit);
}

// =============================================================================
// Test Command Handler
// =============================================================================

const TEST_HELP = `
ingest test - Automated Test Framework

USAGE:
  ingest test <subcommand> [options]

SUBCOMMANDS:
  run [TEST_ID]         Run unit tests (call processMessage directly)
  integration [TEST_ID] Run integration tests (forward via Telegram)
  forward <ID>         Forward a message by ID or test ID from Test Cases → Test Inbox
  send [TEST_ID]        Send test message(s) to PAI Test Cases channel
  validate              Validate recent integration test results
  capture TEST_ID       Capture fixture for a specific test
  status [runId]        Show test run status by group (current or specific run)
  runs                  List all test runs with summary
  history <TEST_ID>     Show test history for a specific test

OPTIONS:
  --suite <name>     Run tests in category: scope, date, archive, regression
  --all              Run all tests (including those without fixtures)
  --verbose, -v      Show detailed output
  --missing          Capture all missing fixtures interactively
  --include-media    Run media tests (voice, photo, document)
  --cleanup          Delete test notes from vault after validation
  --recent <min>     How far back to look for test results (default: 10 min)
  --timeout <ms>     Integration test timeout (default: 90000, voice: 120000)
  --dry-run          Show what would happen without executing

EXAMPLES:
  ingest test status                      # Show current run status by group
  ingest test status run-2025-12-04-001   # Show specific run status
  ingest test runs                        # List all test runs
  ingest test history TEST-PAT-001        # Show history for a specific test
  ingest test run                         # Run unit tests (no Telegram)
  ingest test run TEST-SCOPE-001          # Run specific unit test
  ingest test run --suite scope           # Run scope unit tests
  ingest test integration TEST-SCOPE-001  # Run integration test (needs watcher)
  ingest test integration --suite scope   # Run scope integration tests
  ingest test integration --dry-run       # Preview without forwarding
  ingest test forward 123                 # Forward message 123 to Test Inbox
  ingest test forward TEST-SCOPE-002     # Forward test by ID (uses fixture message_id)
  ingest test capture TEST-SCOPE-001      # Capture fixture for test
  ingest test send TEST-SCOPE-001         # Send test to PAI Test Cases channel
  ingest test validate                    # Validate recent integration results

INTEGRATION TESTING (requires two terminals):

  Terminal 1 - Start watcher:
    export TELEGRAM_CHANNEL_ID=$TEST_INBOX_ID
    export TELEGRAM_OUTBOX_ID=$TEST_EVENTS_ID
    bun run ingest.ts watch --verbose

  Terminal 2 - Run integration tests:
    bun run ingest.ts test integration TEST-SCOPE-001
    bun run ingest.ts test integration --suite scope

  The integration command:
    1. Forwards fixture from Test Cases → Test Inbox
    2. Waits for Events notification (polls outbox)
    3. Validates vault file, tags, frontmatter
    4. Reports pass/fail

Configure test channels in ~/.claude/.env:
  TEST_TELEGRAM_CHANNEL_ID=<PAI Test Inbox>
  TEST_TELEGRAM_OUTBOX_ID=<PAI Test Events>
  TEST_TELEGRAM_CASES_ID=<PAI Test Cases>

See test/INTEGRATION-TESTS.md for full documentation.
`;

async function handleTest(args: string[], verbose: boolean) {
  // Lazy import to avoid loading test framework in production
  const { captureFixture, captureMissingFixtures, getMissingFixtures, autoSendFixture } = await import("./test/framework/capture");
  const { runTests, runTest, printSummary, printTestStatus } = await import("./test/framework/runner");
  const { getSpecsByCategory, getSpecById, allIngestSpecs } = await import("./test/specs");
  const { TestCategory } = await import("./test/framework/types");

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(TEST_HELP);
    return;
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case "run": {
      // Check for options
      const suiteIndex = subArgs.findIndex(a => a === "--suite");
      const suite = suiteIndex >= 0 ? subArgs[suiteIndex + 1] as "scope" | "date" | "archive" | "regression" : undefined;
      const all = subArgs.includes("--all");
      const keepOutput = subArgs.includes("--keep-output");
      const includeMedia = subArgs.includes("--include-media");
      const testId = subArgs.find(a => a.startsWith("TEST-"));

      const summary = await runTests({
        testId,
        suite,
        all,
        verbose,
        keepOutput,
        includeMedia,
      });

      printSummary(summary);
      process.exit(summary.counts.failed > 0 ? 1 : 0);
      break;
    }

    case "integration": {
      // Integration tests - send to Telegram, process directly, validate
      const { runIntegrationTest, runIntegrationTests, printIntegrationSummary, saveDetailedReport } = await import("./test/framework/integration-runner");

      // Parse options
      const suiteIndex = subArgs.findIndex(a => a === "--suite");
      const suite = suiteIndex >= 0 ? subArgs[suiteIndex + 1] as "scope" | "date" | "archive" | "regression" : undefined;
      const all = subArgs.includes("--all");
      const dryRun = subArgs.includes("--dry-run");
      const parallel = subArgs.includes("--parallel");
      const testId = subArgs.find(a => a.startsWith("TEST-"));

      // Parse timeout (per-test timeout in ms)
      let timeout: number | undefined;
      const timeoutIndex = subArgs.findIndex(a => a === "--timeout");
      if (timeoutIndex >= 0) {
        timeout = parseInt(subArgs[timeoutIndex + 1], 10);
      }

      // Parse concurrency
      let concurrency: number | undefined;
      const concurrencyIndex = subArgs.findIndex(a => a === "--concurrency");
      if (concurrencyIndex >= 0) {
        concurrency = parseInt(subArgs[concurrencyIndex + 1], 10);
      }

      console.log("\n🧪 Integration Test Runner");
      console.log("━".repeat(50));
      console.log("Sends test messages to Test Inbox and processes directly.");
      if (parallel) {
        console.log(`Mode: Parallel (concurrency: ${concurrency || 5})`);
      } else {
        console.log("Mode: Sequential");
      }
      console.log("━".repeat(50));

      if (dryRun) {
        console.log("\n[DRY RUN MODE - no messages will be sent]\n");
      }

      if (testId) {
        // Run single test
        const result = await runIntegrationTest(testId, { verbose, timeout, dryRun });
        const status = result.passed ? "✅ PASSED" : "❌ FAILED";
        console.log(`\n${status}: ${testId}`);
        if (!result.passed && result.error) {
          console.log(`  Error: ${result.error}`);
        }
        if (!result.passed && result.checks.length > 0) {
          const failed = result.checks.filter(c => !c.passed);
          for (const check of failed) {
            console.log(`  - ${check.name}: ${check.error || "failed"}`);
          }
        }
        process.exit(result.passed ? 0 : 1);
      } else {
        // Run multiple tests
        const summary = await runIntegrationTests({
          suite,
          all,
          verbose,
          timeout,
          dryRun,
          parallel,
          concurrency,
        });

        printIntegrationSummary(summary);

        // Save detailed report
        const reportPath = saveDetailedReport(summary);
        console.log(`\nDetailed report saved: ${reportPath}`);

        process.exit(summary.counts.failed > 0 ? 1 : 0);
      }
      break;
    }

    case "forward": {
      // Forward a message by ID or test ID from Test Cases to Test Inbox (manual testing)
      const { getConfig } = await import("./lib/config");
      const { loadFixtureFromPath, fixtureExists } = await import("./test/framework/capture");
      const { getSpecById } = await import("./test/specs");
      const { join } = await import("path");

      const input = subArgs[0];
      if (!input) {
        console.error("Error: Specify a message ID (number) or test ID (TEST-XXX-XXX)");
        console.log("Examples:");
        console.log("  ingest test forward 123              # Forward by message ID");
        console.log("  ingest test forward TEST-SCOPE-002  # Forward by test ID");
        process.exit(1);
      }

      let messageId: number;
      let testId: string | undefined;

      // Check if input is a test ID (starts with TEST-)
      if (input.startsWith("TEST-")) {
        testId = input;
        const spec = getSpecById(testId);
        if (!spec) {
          console.error(`Error: Test spec not found: ${testId}`);
          process.exit(1);
        }

        if (!fixtureExists(testId)) {
          console.error(`Error: Fixture not found for test: ${testId}`);
          console.log(`Run 'ingest test send ${testId}' to populate the test case first.`);
          process.exit(1);
        }

        const fixturesDir = join(import.meta.dir, "test", "fixtures");
        const fixturePath = join(fixturesDir, spec.fixture);
        const fixture = loadFixtureFromPath(fixturePath);

        if (!fixture?.message?.message_id) {
          console.error(`Error: Fixture for ${testId} missing message_id`);
          process.exit(1);
        }

        messageId = fixture.message.message_id;
        console.log(`\n📋 Test: ${testId} - ${spec.name}`);
        console.log(`   Found message ID: ${messageId}`);
      } else {
        // Try to parse as message ID
        messageId = parseInt(input, 10);
        if (!messageId || isNaN(messageId)) {
          console.error("Error: Invalid input. Specify a message ID (number) or test ID (TEST-XXX-XXX)");
          console.log("Examples:");
          console.log("  ingest test forward 123              # Forward by message ID");
          console.log("  ingest test forward TEST-SCOPE-002  # Forward by test ID");
          process.exit(1);
        }
      }

      const config = getConfig();
      const fromChannel = config.testTelegramCasesId;
      // Use test inbox if configured, otherwise fall back to TELEGRAM_CHANNEL_ID
      const toChannel = config.testTelegramChannelId || config.telegramChannelId;

      if (!fromChannel || !toChannel) {
        console.error("Missing channel config:");
        console.error("  TEST_TELEGRAM_CASES_ID (source): " + (fromChannel || "NOT SET"));
        console.error("  TEST_TELEGRAM_CHANNEL_ID or TELEGRAM_CHANNEL_ID (target): " + (toChannel || "NOT SET"));
        process.exit(1);
      }

      console.log(`\n📤 Forwarding message ${messageId}${testId ? ` (${testId})` : ""}`);
      console.log(`   From: ${fromChannel} (Test Cases)`);
      console.log(`   To:   ${toChannel} (Test Inbox)\n`);

      const url = `https://api.telegram.org/bot${config.telegramBotToken}/forwardMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_chat_id: fromChannel,
          chat_id: toChannel,
          message_id: messageId,
        }),
      });

      const result = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };

      if (result.ok) {
        console.log(`✅ Forwarded successfully!`);
        console.log(`   New message ID in inbox: ${result.result?.message_id}`);
        console.log(`\n   Watcher should pick this up. Check Events channel for notification.`);
      } else {
        console.error(`❌ Forward failed: ${result.description}`);
        if (testId) {
          console.error(`\n   Tip: The message ID in the fixture may be outdated.`);
          console.error(`   Try running 'ingest test send ${testId}' to refresh the test case.`);
        }
        process.exit(1);
      }
      break;
    }

    case "capture": {
      const missing = subArgs.includes("--missing");

      if (missing) {
        const result = await captureMissingFixtures({ user: process.env.USER });
        console.log(`\nCapture complete:`);
        console.log(`  Captured: ${result.captured.length}`);
        console.log(`  Skipped: ${result.skipped.length}`);
        console.log(`  Failed: ${result.failed.length}`);
      } else {
        const testId = subArgs.find(a => a.startsWith("TEST-"));
        if (!testId) {
          console.error("Error: Specify TEST_ID or use --missing");
          console.log("Example: ingest test capture TEST-SCOPE-001");
          process.exit(1);
        }

        const result = await captureFixture(testId, { user: process.env.USER });
        if (!result.success) {
          console.error(`Failed: ${result.error}`);
          process.exit(1);
        }
      }
      break;
    }

    case "send": {
      // Use sendTestMessageToChannel which adds [TEST-ID] prefix
      const { sendTestMessageToChannel, checkIntegrationTestConfig } = await import("./test/framework/integration");
      const { getConfig } = await import("./lib/config");

      const config = getConfig();
      // Use TEST_TELEGRAM_CASES_ID or fall back to TELEGRAM_CHANNEL_ID
      const targetChannel = config.testTelegramCasesId || config.telegramChannelId;

      if (!targetChannel) {
        console.error("No target channel configured. Set TEST_TELEGRAM_CASES_ID or TELEGRAM_CHANNEL_ID");
        process.exit(1);
      }

      console.log(`Sending to channel: ${targetChannel}\n`);

      if (subArgs.includes("--all")) {
        // Send all test messages to PAI Test Cases
        console.log("Sending all test messages with [TEST-ID] prefix...\n");
        let sent = 0, skipped = 0, failed = 0;
        for (const spec of allIngestSpecs) {
          const result = await sendTestMessageToChannel(spec.id, targetChannel);
          if (result.success) {
            console.log(`✓ ${spec.id} (msg_id: ${result.messageId})`);
            sent++;
          } else if (result.error?.includes("requires manual") || result.error?.includes("Voice tests")) {
            skipped++;
            console.log(`  Skipped ${spec.id}: ${result.error}`);
          } else {
            console.error(`  Failed ${spec.id}: ${result.error}`);
            failed++;
          }
          // Rate limiting - pause between sends
          await new Promise(r => setTimeout(r, 1500));
        }
        console.log(`\nDone: ${sent} sent, ${skipped} skipped, ${failed} failed`);
      } else {
        const testId = subArgs.find(a => a.startsWith("TEST-"));
        if (!testId) {
          console.error("Error: Specify TEST_ID or use --all");
          console.log("Example: ingest test send TEST-SCOPE-001");
          process.exit(1);
        }

        const result = await sendTestMessageToChannel(testId, targetChannel);
        if (!result.success) {
          console.error(`Failed: ${result.error}`);
          process.exit(1);
        }
        console.log(`✓ ${testId} sent (msg_id: ${result.messageId})`);
      }
      break;
    }

    case "status": {
      // If no arg, show fixture status. If arg is a run ID, show run status.
      const runId = subArgs.find(a => a.startsWith("run-"));

      if (runId) {
        // Show run status using run-tracker
        const { runTracker } = await import("./test/framework/run-tracker");
        const { generateRunStatusReport } = await import("./test/framework/report");
        const { allIngestSpecs } = await import("./test/specs");

        const run = runTracker.loadRun(runId);
        if (!run) {
          console.error(`Run not found: ${runId}`);
          process.exit(1);
        }

        const report = generateRunStatusReport(run, allIngestSpecs);
        console.log(report);
      } else {
        // Check for latest in-progress run
        const { runTracker } = await import("./test/framework/run-tracker");
        const { generateRunStatusReport } = await import("./test/framework/report");
        const { allIngestSpecs } = await import("./test/specs");

        const latestRun = runTracker.getLatestInProgressRun();
        if (latestRun) {
          const report = generateRunStatusReport(latestRun, allIngestSpecs);
          console.log(report);
        } else {
          // Fall back to fixture status
          printTestStatus();

          // Show missing count
          const missing = getMissingFixtures();
          if (missing.length > 0) {
            console.log(`\nMissing fixtures: ${missing.length}`);
            console.log("Run 'ingest test capture --missing' to capture them.");
          }

          // Show recent runs
          const runs = runTracker.listRuns();
          if (runs.length > 0) {
            console.log(`\nRecent runs: ${runs.length}`);
            console.log("Run 'ingest test runs' to list them.");
          }
        }
      }
      break;
    }

    case "runs": {
      // List all test runs
      const { generateRunsListReport } = await import("./test/framework/report");
      const report = generateRunsListReport();
      console.log(report);
      break;
    }

    case "history": {
      // Show history for a specific test
      const testId = subArgs.find(a => a.startsWith("TEST-"));
      if (!testId) {
        console.error("Error: Specify a test ID (e.g., TEST-PAT-001)");
        console.log("Usage: ingest test history TEST-PAT-001");
        process.exit(1);
      }

      const { runTracker } = await import("./test/framework/run-tracker");
      const { generateTestHistoryReport } = await import("./test/framework/report");
      const { getSpecById } = await import("./test/specs");

      const history = runTracker.getTestHistory(testId);
      if (!history) {
        console.log(`No history found for ${testId}`);
        console.log("This test hasn't been recorded in any runs yet.");
        process.exit(0);
      }

      const spec = getSpecById(testId);
      const report = generateTestHistoryReport(testId, history, spec);
      console.log(report);
      break;
    }

    case "validate": {
      // Validate recent integration test results
      const { validateRecentIntegrationTests } = await import("./test/framework/integration");

      const cleanup = subArgs.includes("--cleanup");
      let minutesAgo = 10;

      // Parse --recent option
      for (let i = 0; i < subArgs.length; i++) {
        if (subArgs[i] === "--recent" || subArgs[i] === "-r") {
          minutesAgo = parseInt(subArgs[++i], 10) || 10;
        }
      }

      console.log(`\n🔍 Validating integration test results from last ${minutesAgo} minutes...\n`);

      const { results, summary } = await validateRecentIntegrationTests({
        minutesAgo,
        verbose,
        cleanup,
      });

      if (results.length === 0) {
        console.log("No test results found in recent vault files.");
        console.log("\nMake sure you:");
        console.log("  1. Forwarded test messages from PAI Test Cases → PAI Test Inbox");
        console.log("  2. Watch daemon processed them (check PAI Test Events)");
        console.log("  3. Test IDs are included: [TEST-SCOPE-001] etc.");
        process.exit(0);
      }

      // Print summary
      console.log("\n" + "=".repeat(50));
      console.log(`📊 Test Results: ${summary.passed} passed, ${summary.failed} failed`);
      console.log("=".repeat(50));

      if (summary.failed > 0) {
        console.log("\n❌ Some tests failed. Run with --verbose for details.");
        process.exit(1);
      } else {
        console.log("\n✅ All tests passed!");
        process.exit(0);
      }
      break;
    }

    default:
      console.error(`Unknown test subcommand: ${subcommand}`);
      console.log(TEST_HELP);
      process.exit(1);
  }
}

main();
