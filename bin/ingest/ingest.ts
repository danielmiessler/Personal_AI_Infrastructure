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
  replyWithObsidianLink,
  isFromInbox,
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
  getCachedMessage,
  getRetryableMessages,
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
  watch      Continuously poll and process (daemon mode)
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
      case "watch":
        await handleWatch(profileName, verbose, commandArgs);
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
    .filter((m): m is TelegramMessage => m !== undefined)
    .filter((m) => isFromInbox(m));

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

      // Reply to message with Obsidian link
      const config = getConfig();
      await replyWithObsidianLink(msg.message_id, savedPaths, config.vaultName);

      // Send notification to outbox
      const originalFilename = msg.audio?.title ||
        msg.audio?.file_name ||
        msg.document?.file_name ||
        (msg.voice ? `voice_${msg.message_id}.ogg` : undefined);

      await sendNotification({
        messageId: msg.message_id,
        status: "success",
        contentType: type,
        title: contents[0]?.title || "Processed",
        originalFilename,
        outputPaths: savedPaths,
        obsidianVaultName: config.vaultName,
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
            for (let i = 0; i < contents.length; i++) {
              const isWisdom = i > 0;
              const path = await saveToVault(contents[i], profile, isWisdom);
              savedPaths.push(path);
              if (verbose) {
                console.log(`    Saved: ${path}`);
              }
            }

            markCompleted(msg.message_id, savedPaths);
            await setReaction(msg.message_id, REACTIONS.success);
            console.log(`    ✅ Created ${savedPaths.length} note(s)`);

            // Reply to message with Obsidian link
            const config = getConfig();
            await replyWithObsidianLink(msg.message_id, savedPaths, config.vaultName);

            // Send notification to outbox
            // Extract original filename from message
            const originalFilename = msg.audio?.title ||
              msg.audio?.file_name ||
              msg.document?.file_name ||
              (msg.voice ? `voice_${msg.message_id}.ogg` : undefined);

            await sendNotification({
              messageId: msg.message_id,
              status: "success",
              contentType: type,
              title: contents[0]?.title || "Processed",
              originalFilename,
              outputPaths: savedPaths,
              obsidianVaultName: config.vaultName,
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
          const filePath = await saveToVault(content, profile, isWisdom);
          savedPaths.push(filePath);
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
        const filePath = await saveToVault(content, profile, isWisdom);
        savedPaths.push(filePath);
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

main();
