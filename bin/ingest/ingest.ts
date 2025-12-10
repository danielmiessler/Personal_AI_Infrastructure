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
  shouldFetchUrl,
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
import type { LayerResult } from "./test/framework/report";

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
  direct     Send content to Telegram inbox (same flow as iOS shortcuts)
  status     Show queue status
  retry      Retry failed messages
  search     Search vault (discovery phase - returns index)
  load       Load vault content (injection phase - outputs markdown)
  query      Search vault and archive (legacy, combines search+load)
  profiles   List available processing profiles
  config     Show current configuration
  test       Run automated tests (capture/replay fixtures)

OPTIONS:
  --profile, -p <name>   Use specific processing profile
  --verbose, -v          Show detailed output
  --dry-run              Show what would be processed without doing it

DIRECT INGEST OPTIONS (via Telegram - same as iOS shortcuts):
  --tags, -t <tags>      Add tags (comma-separated)
  --pipeline <name>      Force pipeline:
                           /attach  - keep original filename (default for docs)
                           /archive - rename with TYPE-DATE-TITLE + Dropbox sync
                           /note    - save as note (default for text)
                           /wisdom, /summarize - apply fabric patterns
  --scope, -s <scope>    Set scope (private/work/public)
  --name, -n <name>      Override filename (for archive)
  --date, -d <date>      Set document date (ISO or DD/MM/YYYY)
  --dry-run              Show what would be sent (no network call)
  --caption, -c <text>   Add caption with hints (#tags @people ~scope)
  --text <content>       Send text content (saved as .txt document)

SEARCH OPTIONS (discovery phase):
  <query>                  Semantic search text
  --tag, -t <tag>          Filter by tag
  --person, -p <person>    Filter by person mention
  --limit, -l <n>          Limit results (default: 10)
  --scope <scope>          Scope filter: work (default), private, all

LOAD OPTIONS (injection phase):
  <name>                   Note name or path to load
  --tag, -t <tag>          Load all notes matching tag
  --limit, -l <n>          Limit results (default: 10)
  --json                   Output as JSON (for programmatic use)

EXAMPLES:
  # Two-phase context retrieval workflow
  ingest search "project planning"        # Discovery: see what matches
  ingest load "2025-01-15-Planning"       # Injection: get full content

  ingest search --tag project/pai         # Find notes by tag
  ingest load --tag project/pai           # Load all matching content

  ingest search --person ed_overy         # Find mentions of Ed
  ingest load --tag meeting-notes --limit 5

  # Legacy commands
  ingest poll                        # Check for new messages
  ingest process --verbose           # Process with detailed output
  ingest status                      # Show pending/processed counts
  ingest profiles                    # List available profiles
  ingest process --profile simple    # Use simple profile

  # Direct ingest (via Telegram - unified with iOS shortcuts)
  pbpaste | ingest direct                                    # From clipboard
  echo "Quick note" | ingest direct                          # From stdin
  ingest direct document.pdf                                 # From file
  ingest direct receipt.pdf --tags "finance,2024" --scope private
  pbpaste | ingest direct --tags "project/pai" --pipeline wisdom
  ingest direct voice.m4a --pipeline meeting-notes
  ingest direct --dry-run document.pdf                       # Preview (no send)
  # Note: Run 'ingest watch' or 'ingest process' to process queued items

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
      case "direct":
        await handleDirect(profileName, verbose, commandArgs);
        break;
      case "status":
        await handleStatus();
        break;
      case "retry":
        await handleRetry(commandArgs, verbose);
        break;
      case "search":
        await handleSearch(commandArgs, verbose);
        break;
      case "load":
        await handleLoad(commandArgs, verbose);
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

    let type = classifyContent(msg);
    // Upgrade to "url" if message has URL + fetch command (/article, /wisdom, etc.)
    if (type === "text" && shouldFetchUrl(msg)) {
      type = "url";
    }
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
        tags: contents[0]?.tags,
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
          let type = classifyContent(msg);
          // Upgrade to "url" if message has URL + fetch command (/article, /wisdom, etc.)
          if (type === "text" && shouldFetchUrl(msg)) {
            type = "url";
          }
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
              tags: contents[0]?.tags,
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

/**
 * Handle direct ingest via Telegram
 * Sends content to Telegram inbox channel (same flow as iOS shortcuts)
 * The watch daemon picks it up for processing.
 *
 * ADR-001 Design:
 *   pbpaste | ingest direct                          # Stdin (most common)
 *   ingest direct document.pdf                       # Positional file
 *   pbpaste | ingest direct --tags "project/pai"     # With tags
 *   ingest direct receipt.pdf --scope private        # With scope
 */
async function handleDirect(
  _profileName: string | undefined,
  verbose: boolean,
  args: string[]
): Promise<void> {
  const { sendDocumentToInbox } = await import("./lib/telegram");
  const { basename, extname, resolve } = await import("path");
  const { existsSync, writeFileSync } = await import("fs");
  const { tmpdir } = await import("os");
  const { join } = await import("path");

  // Parse arguments (ADR-001 flags)
  let filePath: string | undefined;
  let textContent: string | undefined;
  let caption: string | undefined;
  let useStdin = false;
  let tags: string | undefined;           // --tags, -t (comma-separated)
  let forcePipeline: string | undefined;  // --pipeline (e.g., /archive, /wisdom)
  let scope: string | undefined;          // --scope, -s (private/work/public)
  let overrideName: string | undefined;   // --name, -n
  let documentDate: string | undefined;   // --date, -d
  let dryRun = false;                     // --dry-run

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--file" || arg === "-f") {
      filePath = args[++i];
    } else if (arg === "--text") {
      // Note: -t is now for --tags (ADR-001), so --text is long-form only
      textContent = args[++i];
    } else if (arg === "--caption" || arg === "-c") {
      caption = args[++i];
    } else if (arg === "--stdin") {
      useStdin = true;
    } else if (arg === "--tags" || arg === "-t") {
      tags = args[++i];
    } else if (arg === "--pipeline") {
      // Note: -p is reserved for --profile at global level
      forcePipeline = args[++i];
    } else if (arg === "--scope" || arg === "-s") {
      scope = args[++i];
    } else if (arg === "--name" || arg === "-n") {
      overrideName = args[++i];
    } else if (arg === "--date" || arg === "-d") {
      documentDate = args[++i];
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (!arg.startsWith("-") && !arg.startsWith("--") && !filePath) {
      // Positional file argument (ADR-001: `ingest direct document.pdf`)
      filePath = arg;
    }
  }

  // Check if stdin is piped (auto-detect without --stdin flag)
  const stdinIsPiped = !process.stdin.isTTY;

  // Read from stdin if explicitly specified OR if stdin is piped and no file/text provided
  if (useStdin || (stdinIsPiped && !filePath && !textContent)) {
    const stdin = Bun.stdin;
    const reader = stdin.stream().getReader();
    const chunks: Uint8Array[] = [];

    const readPromise = (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    })();

    await readPromise;

    if (chunks.length > 0) {
      const decoder = new TextDecoder();
      textContent = chunks.map(chunk => decoder.decode(chunk)).join("");
    }
  }

  // Validate we have something to process
  if (!filePath && !textContent) {
    console.error("Error: No content provided.");
    console.log("\nUsage:");
    console.log("  pbpaste | ingest direct                    # From clipboard");
    console.log("  ingest direct document.pdf                 # From file");
    console.log('  ingest direct --text "My note content"     # Inline text');
    console.log("");
    console.log("Options:");
    console.log("  --tags, -t       Add tags (comma-separated)");
    console.log("  --pipeline       Force specific pipeline (/archive, /wisdom, etc.)");
    console.log("  --scope, -s      Set scope (private/work/public)");
    console.log("  --name, -n       Override filename");
    console.log("  --date, -d       Set document date");
    console.log("  --dry-run        Show what would be sent to Telegram");
    process.exit(1);
  }

  // Expand ~ in file path
  if (filePath) {
    filePath = filePath.replace(/^~/, process.env.HOME || "");
    filePath = resolve(filePath);
    if (!existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }
  }

  // Build caption with metadata tags (like iOS shortcuts)
  // Format: [source:cli][device:mac][user:testuser] /pipeline #tags ~scope [date:...] content
  const captionParts: string[] = [];

  // Source metadata (same format as iOS shortcuts, normalized to lowercase)
  captionParts.push("[source:cli]");

  // Get device model dynamically (matches iOS shortcut "Get Device Model")
  const deviceModel = await getDeviceModel();
  captionParts.push(`[device:${deviceModel.toLowerCase()}]`);

  // Get username from environment (lowercase)
  const user = (process.env.USER || process.env.USERNAME || "unknown").toLowerCase();
  captionParts.push(`[user:${user}]`);

  // Pipeline command (e.g., /archive, /wisdom)
  if (forcePipeline) {
    const pipelineCmd = forcePipeline.startsWith("/") ? forcePipeline : `/${forcePipeline}`;
    captionParts.push(pipelineCmd);
  }

  // Tags as #hashtags
  if (tags) {
    const tagList = tags.split(",").map(t => t.trim());
    for (const tag of tagList) {
      if (!tag.startsWith("#")) {
        captionParts.push(`#${tag}`);
      } else {
        captionParts.push(tag);
      }
    }
  }

  // Scope
  if (scope) {
    captionParts.push(`~${scope}`);
  }

  // Document date
  if (documentDate) {
    captionParts.push(`[date:${documentDate}]`);
  }

  // Override name (for archive pipeline)
  if (overrideName) {
    captionParts.push(`[name:${overrideName}]`);
  }

  // User-provided caption
  if (caption) {
    captionParts.push(caption);
  }

  const finalCaption = captionParts.join(" ");

  // Determine content type for display
  let contentType: "text" | "photo" | "audio" | "document" = "text";
  if (filePath) {
    const ext = extname(filePath).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      contentType = "photo";
    } else if ([".mp3", ".ogg", ".m4a", ".wav", ".opus"].includes(ext)) {
      contentType = "audio";
    } else {
      contentType = "document";
    }
  }

  console.log(`\n📤 Sending to Telegram Inbox`);
  console.log(`${"─".repeat(50)}`);
  console.log(`  Type: ${contentType}`);
  if (filePath) console.log(`  File: ${basename(filePath)}`);
  if (textContent && !filePath) {
    const preview = textContent.slice(0, 60).replace(/\n/g, " ");
    console.log(`  Content: ${preview}${textContent.length > 60 ? "..." : ""}`);
  }
  console.log(`  Caption: ${finalCaption || "(none)"}`);
  if (verbose) {
    console.log(`  Full caption: ${finalCaption}`);
  }
  if (dryRun) console.log(`  Mode: DRY RUN`);
  console.log(`${"─".repeat(50)}\n`);

  // Dry-run: show what would be sent
  if (dryRun) {
    console.log("Would send to Telegram:");
    console.log(`  • Content type: ${contentType}`);
    if (filePath) console.log(`  • File: ${filePath}`);
    if (textContent) {
      const preview = textContent.slice(0, 100).replace(/\n/g, "\\n");
      console.log(`  • Text: ${preview}${textContent.length > 100 ? "..." : ""}`);
    }
    console.log(`  • Caption: ${finalCaption}`);
    console.log("\n[DRY RUN - nothing sent]");
    console.log("\nNote: Content will be processed by `ingest watch` daemon or next `ingest process` run.");
    return;
  }

  try {
    validateConfig();
    let result;
    let tempPath: string | undefined;

    if (filePath) {
      // Send any file via sendDocument API (handles all types)
      result = await sendDocumentToInbox(filePath, finalCaption || undefined);
    } else if (textContent) {
      // For text content, save to temp file and send as document
      // (Telegram can't handle RTF/HTML well in plain messages)
      tempPath = join(tmpdir(), `pai-ingest-${Date.now()}.txt`);
      writeFileSync(tempPath, textContent, "utf-8");
      result = await sendDocumentToInbox(tempPath, finalCaption || undefined);
    }

    // Clean up temp file if created
    if (tempPath) {
      try {
        const { unlinkSync } = await import("fs");
        unlinkSync(tempPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    if (result) {
      console.log(`\n✅ Sent to Telegram inbox`);
      console.log(`   Message ID: ${result.message_id}`);
      console.log(`   Chat ID: ${result.chat?.id || "N/A"}`);
      console.log(`\n💡 Run \`ingest process\` or ensure \`ingest watch\` is running to process.`);
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

/**
 * Get device model dynamically (matches iOS shortcut "Get Device Model")
 * On macOS: Returns model name like "MacBook Pro" or "Mac mini"
 * On Linux: Returns hostname or "Linux"
 */
async function getDeviceModel(): Promise<string> {
  try {
    // macOS: Use system_profiler to get human-readable model name
    if (process.platform === "darwin") {
      const proc = Bun.spawn(["system_profiler", "SPHardwareDataType"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      const output = await new Response(proc.stdout).text();
      // Parse "Model Name: MacBook Pro" from output
      const match = output.match(/Model Name:\s*(.+)/);
      if (match) {
        return match[1].trim();
      }
    }
    // Fallback: use hostname
    const { hostname } = await import("os");
    return hostname() || process.platform;
  } catch {
    return process.platform === "darwin" ? "Mac" : process.platform;
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".rtf": "application/rtf",
    ".html": "text/html",
    ".json": "application/json",
    ".xml": "application/xml",
    ".csv": "text/csv",
  };
  return mimeTypes[ext] || "application/octet-stream";
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
 * Handle search command - Discovery phase of context retrieval
 *
 * Returns an index of matching notes with metadata, not full content.
 * Use 'ingest load' to get full content for context injection.
 *
 * Usage:
 *   ingest search "project planning"    # Semantic search
 *   ingest search --tag project/pai     # Tag filter
 *   ingest search --person ed_overy     # Person filter
 *   ingest search --limit 20            # Limit results
 */
async function handleSearch(args: string[], verbose: boolean) {
  const config = getConfig();

  // Parse arguments
  let searchText = "";
  let tag: string | undefined;
  let person: string | undefined;
  let limit = 10;
  let scope: "work" | "private" | "all" = "work";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--tag" || arg === "-t") {
      tag = args[++i];
    } else if (arg === "--person" || arg === "-p") {
      person = args[++i];
    } else if (arg === "--limit" || arg === "-l") {
      limit = parseInt(args[++i], 10) || 10;
    } else if (arg === "--scope" || arg === "-s") {
      const s = args[++i]?.toLowerCase();
      if (s === "work" || s === "private" || s === "all") scope = s;
    } else if (!arg.startsWith("-")) {
      searchText = arg;
    }
  }

  if (!searchText && !tag && !person) {
    console.log("Search - Discovery phase of context retrieval\n");
    console.log("Returns an index of matching notes. Use 'ingest load' to get full content.\n");
    console.log("Usage:");
    console.log('  ingest search "project planning"    # Semantic search');
    console.log("  ingest search --tag project/pai     # Tag filter");
    console.log("  ingest search --person ed_overy     # Person filter");
    console.log("  ingest search --limit 20            # Limit results");
    console.log("  ingest search --scope private       # Include private notes");
    return;
  }

  const allResults: SearchResult[] = [];

  // 1. Semantic search if text provided
  if (searchText) {
    try {
      const { semanticSearch } = await import("../obs/lib/embed");
      const results = await semanticSearch(searchText, limit);
      for (const r of results) {
        allResults.push({
          name: r.noteName,
          path: r.notePath,
          tags: [], // Will be populated from frontmatter
          preview: r.content.slice(0, 150),
          source: "semantic",
          relevance: r.similarity,
        });
      }
    } catch (e) {
      if (verbose) console.log(`Semantic search unavailable: ${e}`);
    }
  }

  // 2. Tag/person search
  if (tag || person) {
    const tagResults = await searchByTag(config.vaultPath, { tag, person, limit });
    for (const r of tagResults) {
      allResults.push({
        name: r.title,
        path: r.path,
        tags: [],
        preview: r.preview,
        source: "tag",
        relevance: r.relevance,
      });
    }
  }

  // Deduplicate
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

  // Extract tags from frontmatter for each result
  for (const r of finalResults) {
    try {
      const content = readFileSync(r.path, "utf-8");
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const tagsMatch = fmMatch[1].match(/tags:\n([\s\S]*?)(?:\n\w|$)/);
        if (tagsMatch) {
          r.tags = tagsMatch[1].match(/- (.+)/g)?.map(t => t.replace("- ", "")) || [];
        }
      }
    } catch {}
  }

  // Output index format
  console.log(`Found ${finalResults.length} result(s):\n`);
  for (const r of finalResults) {
    const tagsStr = r.tags.length > 0 ? ` [${r.tags.slice(0, 3).join(", ")}${r.tags.length > 3 ? "..." : ""}]` : "";
    const rel = Math.round(r.relevance * 100);
    console.log(`  ${r.name}${tagsStr}`);
    if (verbose) {
      console.log(`    ${r.preview.slice(0, 80).replace(/\n/g, " ")}...`);
      console.log(`    Path: ${r.path}`);
      console.log(`    Relevance: ${rel}%`);
    }
  }

  console.log("\nTo load content: ingest load <name> or ingest load --tag <tag>");
}

interface SearchResult {
  name: string;
  path: string;
  tags: string[];
  preview: string;
  source: "semantic" | "tag";
  relevance: number;
}

/**
 * Handle load command - Injection phase of context retrieval
 *
 * Outputs full markdown content for loading into AI context window.
 *
 * Usage:
 *   ingest load "2025-01-15-Planning"   # Load by name
 *   ingest load --tag project/pai       # Load all matching tag
 *   ingest load --limit 5               # Limit results
 *   ingest load --json                  # Output as JSON
 */
async function handleLoad(args: string[], verbose: boolean) {
  const config = getConfig();

  // Parse arguments
  let noteName = "";
  let tag: string | undefined;
  let limit = 10;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--tag" || arg === "-t") {
      tag = args[++i];
    } else if (arg === "--limit" || arg === "-l") {
      limit = parseInt(args[++i], 10) || 10;
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (!arg.startsWith("-")) {
      noteName = arg;
    }
  }

  if (!noteName && !tag) {
    console.log("Load - Injection phase of context retrieval\n");
    console.log("Outputs full markdown content for AI context window.\n");
    console.log("Usage:");
    console.log('  ingest load "2025-01-15-Planning"   # Load by name');
    console.log("  ingest load --tag project/pai       # Load all matching tag");
    console.log("  ingest load --limit 5               # Limit results");
    console.log("  ingest load --json                  # Output as JSON");
    return;
  }

  const loadedNotes: { name: string; path: string; content: string }[] = [];

  // Load by name
  if (noteName) {
    const glob = new Bun.Glob("**/*.md");
    const files = await Array.fromAsync(glob.scan({ cwd: config.vaultPath, absolute: true }));

    for (const filePath of files) {
      const basename = filePath.split("/").pop()?.replace(".md", "") || "";
      if (basename.toLowerCase().includes(noteName.toLowerCase())) {
        const content = readFileSync(filePath, "utf-8");
        loadedNotes.push({ name: basename, path: filePath, content });
        if (loadedNotes.length >= limit) break;
      }
    }
  }

  // Load by tag
  if (tag) {
    const glob = new Bun.Glob("**/*.md");
    const files = await Array.fromAsync(glob.scan({ cwd: config.vaultPath, absolute: true }));

    for (const filePath of files.slice(0, 500)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const hasTag = fmMatch[1].includes(`- ${tag}`) || fmMatch[1].includes(`/${tag}`);
          if (hasTag) {
            const basename = filePath.split("/").pop()?.replace(".md", "") || "";
            loadedNotes.push({ name: basename, path: filePath, content });
            if (loadedNotes.length >= limit) break;
          }
        }
      } catch {}
    }
  }

  if (loadedNotes.length === 0) {
    console.log("No matching notes found.");
    return;
  }

  // Output
  if (jsonOutput) {
    console.log(JSON.stringify(loadedNotes, null, 2));
  } else {
    for (const note of loadedNotes) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`FILE: ${note.name}`);
      console.log(`PATH: ${note.path}`);
      console.log("=".repeat(60));
      console.log(note.content);
    }
    console.log(`\n--- Loaded ${loadedNotes.length} note(s) ---`);
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
  all                   Run all test layers (unit → integration → cli → acceptance)
  run [TEST_ID]         Run unit tests (call processMessage directly)
  integration [TEST_ID] Run integration tests (forward via Telegram)
  cli [TEST_ID]         Run CLI integration tests (obs search/semantic)
  acceptance [TEST_ID]  Run acceptance tests (claude -p end-to-end workflows)
  semantic --run RUN_ID Run LLM-as-judge semantic validation (claude -p)
  setup                 Set up integration tests (clear channel, populate, run tests)
  forward <ID>         Forward a message by ID or test ID from Test Cases → Test Inbox
  send [TEST_ID]        Send test message(s) to PAI Test Cases channel
  validate              Validate recent integration test results
  capture TEST_ID       Capture fixture for a specific test
  status [runId]        Show test run status by group (current or specific run)
  runs                  List all test runs with summary
  history [TEST_ID]     Show run history (or test history with TEST_ID)
  cleanup               Clean up test-generated files from vault/Dropbox

OPTIONS:
  --suite <name>       Run tests in category: scope, date, archive, regression
  --all                Run all tests (including those without fixtures)
  --verbose, -v        Show detailed output
  --parallel           Run integration tests in parallel
  --skip-unit          Skip unit tests (for 'test all')
  --skip-integration   Skip integration tests (for 'test all')
  --skip-cli           Skip CLI tests (for 'test all')
  --skip-acceptance    Skip acceptance tests (for 'test all')

HISTORY OPTIONS:
  --cumulative, -c     Show cumulative view (latest status per layer)
  --layer <name>       Filter by layer: unit, integration, cli, acceptance, all
  --limit <n>          Limit number of runs shown (default: 15)

OTHER OPTIONS:
  --missing            Capture all missing fixtures interactively
  --skip-media         Skip media tests (voice, photo, document) for faster runs
  --skip-llm-judge     Skip LLM-as-judge semantic validation for faster runs
  --cleanup            Delete test notes from vault after validation
  --recent <min>       How far back to look for test results (default: 10 min)
  --timeout <ms>       Integration test timeout (default: 90000, voice: 120000)
  --dry-run            Show what would happen without executing

EXAMPLES:
  ingest test all                         # Run all test layers
  ingest test all --parallel              # Run with parallel integration tests
  ingest test all --skip-unit             # Skip unit tests
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
  ingest test cleanup --list              # List registered test runs
  ingest test cleanup --all --dry-run     # Preview cleanup (don't delete)
  ingest test cleanup --all               # Clean up all test files
  ingest test cleanup --scan              # Find orphaned test files in vault
  ingest test daemon                      # Test watch daemon before deploying
  ingest test daemon --test               # Use test channels
  ingest test daemon --timeout 120        # Custom timeout (seconds)

LLM-AS-JUDGE SEMANTIC VALIDATION:
  ingest test semantic --run run-2025-12-05-001    # Evaluate all semantic tests
  ingest test semantic --run run-2025-12-05-001 TEST-PAT-001  # Specific test
  ingest test semantic --run run-2025-12-05-001 --dry-run     # Preview prompts

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
  const { existsSync, mkdirSync, appendFileSync } = await import("fs");
  const { join } = await import("path");

  // Helper to set up console logging to run.log
  type LogCleanup = { runLogPath: string; cleanup: () => void };
  function setupRunLog(runId: string, layerName: string): LogCleanup {
    const outputDir = join(import.meta.dir, "test", "output", runId);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    const runLogPath = join(outputDir, "run.log");
    
    const originalLog = console.log;
    const originalError = console.error;
    const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
    
    console.log = (...args: unknown[]) => {
      const line = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      originalLog(...args);
      try {
        appendFileSync(runLogPath, stripAnsi(line) + "\n");
      } catch {}
    };
    console.error = (...args: unknown[]) => {
      const line = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
      originalError(...args);
      try {
        appendFileSync(runLogPath, "[ERROR] " + stripAnsi(line) + "\n");
      } catch {}
    };

    // Write header
    console.log("═".repeat(60));
    console.log(`TEST RUN: ${runId}`);
    console.log(`Layer: ${layerName}`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log("═".repeat(60));
    
    return {
      runLogPath,
      cleanup: () => {
        console.log(`\n📄 Full log saved: ${runLogPath}`);
        console.log = originalLog;
        console.error = originalError;
      }
    };
  }

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
      const skipMedia = subArgs.includes("--skip-media");
      const skipLlmJudge = subArgs.includes("--skip-llm-judge");
      const testId = subArgs.find(a => a.startsWith("TEST-"));

      // Generate run ID and set up logging
      const runId = `unit-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
      const logSetup = setupRunLog(runId, "Unit Tests");

      const summary = await runTests({
        testId,
        suite,
        all,
        verbose,
        keepOutput: keepOutput || !skipLlmJudge, // Keep output for LLM judge (runs by default)
        skipMedia,
        runId,
      });

      printSummary(summary);

      // Run LLM-as-judge semantic validation (default, skip with --skip-llm-judge)
      // Only evaluate tests that were actually executed (passed) in this run
      const executedTestIds = summary.results
        .filter(r => r.passed && !r.checks.some(c => c.name === "skipped"))
        .map(r => r.testId);
      
      if (!skipLlmJudge && executedTestIds.length > 0) {
        const { runLLMJudge } = await import("./test/framework/llm-judge");
        const { allIngestSpecs } = await import("./test/specs");
        
        console.log("\n");
        await runLLMJudge(allIngestSpecs, {
          runId: summary.runId,
          testIds: executedTestIds,  // Only evaluate tests that ran
          verbose,
          timeout: 180000, // 3 min per evaluation
        });
      }

      logSetup.cleanup();
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
      const noSetup = subArgs.includes("--no-setup");  // Skip auto-setup (default is to setup)
      const noCleanup = subArgs.includes("--no-cleanup");
      const autoSetup = !noSetup;  // Auto-setup is default
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

      // Generate run ID and set up logging
      const runId = `integration-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
      const logSetup = setupRunLog(runId, "Integration Tests");

      console.log("\n🧪 Integration Test Runner");
      console.log("━".repeat(50));
      console.log("Sends test messages to Test Inbox and processes directly.");
      if (autoSetup) {
        console.log("Setup: Auto (clear → populate → test → cleanup)");
      } else {
        console.log("Setup: Skipped (--no-setup)");
      }
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
        logSetup.cleanup();
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
          runId,
          autoSetup,
          noCleanup,
        });

        printIntegrationSummary(summary);

        // Save detailed report
        const reportPath = saveDetailedReport(summary, { runId });
        console.log(`\nDetailed report saved: ${reportPath}`);

        logSetup.cleanup();
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
      // Show history for a specific test OR run history summary
      const testId = subArgs.find(a => a.startsWith("TEST-") || a.startsWith("CLI-") || a.startsWith("ACC-"));

      // Parse --layer option for run history
      const layerIndex = subArgs.findIndex(a => a === "--layer");
      const layerArg = layerIndex >= 0 ? subArgs[layerIndex + 1] : undefined;
      const layer = layerArg as "unit" | "integration" | "cli" | "acceptance" | "all" | undefined;

      // Parse --limit option
      const limitIndex = subArgs.findIndex(a => a === "--limit");
      const limit = limitIndex >= 0 ? parseInt(subArgs[limitIndex + 1], 10) : 15;

      // Parse --cumulative flag
      const cumulative = subArgs.includes("--cumulative") || subArgs.includes("-c");

      if (layerArg && !["unit", "integration", "cli", "acceptance", "all"].includes(layerArg)) {
        console.error(`Invalid layer: ${layerArg}`);
        console.log("Valid layers: unit, integration, cli, acceptance, all");
        process.exit(1);
      }

      if (testId) {
        // Show history for specific test
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
      } else if (cumulative) {
        // Show cumulative view (latest status per layer)
        const { printCumulativeView } = await import("./test/framework/report");
        console.log("\n📊 Test Status Summary");
        console.log("═".repeat(70));
        printCumulativeView();
      } else {
        // Show run history summary (per-run view)
        const { printHistory } = await import("./test/framework/report");
        console.log("\n📊 Test Run History");
        console.log("═".repeat(80));
        printHistory(limit, layer);
      }
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

    case "acceptance": {
      // Acceptance tests - use claude -p to test end-to-end workflows
      const { runAcceptanceTests, printAcceptanceTestHelp } = await import("./test/framework/acceptance-runner");

      if (subArgs.includes("--help") || subArgs.includes("-h")) {
        printAcceptanceTestHelp();
        break;
      }

      // Generate run ID and set up logging
      const runId = `acceptance-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
      const logSetup = setupRunLog(runId, "Acceptance Tests");

      const testIds = subArgs.filter(a => a.startsWith("ACC-") || a.startsWith("SKILL-"));

      const summary = await runAcceptanceTests({
        testIds: testIds.length > 0 ? testIds : undefined,
        verbose,
        runId,
      });

      logSetup.cleanup();
      process.exit(summary.counts.failed > 0 ? 1 : 0);
      break;
    }

    case "cli": {
      // CLI integration tests - ingest → embed → obs search/semantic
      const { runCLITests, printCLITestHelp } = await import("./test/framework/cli-runner");

      if (subArgs.includes("--help") || subArgs.includes("-h")) {
        printCLITestHelp();
        break;
      }

      // Generate run ID and set up logging
      const runId = `cli-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`;
      const logSetup = setupRunLog(runId, "CLI Tests");

      const skipEmbeddings = subArgs.includes("--skip-embeddings");
      const testIds = subArgs.filter(a => a.startsWith("CLI-") || a.startsWith("TEST-CLI-"));

      const summary = await runCLITests({
        testIds: testIds.length > 0 ? testIds : undefined,
        verbose,
        skipEmbeddings,
        runId,
      });

      logSetup.cleanup();
      process.exit(summary.counts.failed > 0 ? 1 : 0);
      break;
    }

    case "semantic":
    case "judge": {
      // LLM-as-judge semantic validation using claude -p
      const { runLLMJudge } = await import("./test/framework/llm-judge");
      const { allIngestSpecs } = await import("./test/specs");

      if (subArgs.includes("--help") || subArgs.includes("-h")) {
        console.log(`
LLM-as-Judge Semantic Validation

Uses Claude Code (claude -p) to evaluate test outputs that require
qualitative assessment beyond deterministic checks.

Usage:
  ingest test semantic --run RUN_ID              # Evaluate tests from a run
  ingest test semantic --run RUN_ID TEST-PAT-001 # Evaluate specific test
  ingest test semantic --run RUN_ID --dry-run    # Show prompts without running

Options:
  --run RUN_ID    Run ID to load results from (e.g., run-2025-12-05-10-30-00)
  --dry-run       Show evaluation prompts without executing
  --timeout MS    Timeout per evaluation (default: 120000ms)
  --verbose       Show detailed output

Tests with semantic validation specs:
  - TEST-PAT-001: Meeting notes pattern (/meeting-notes)
  - TEST-PAT-002: Summarize pattern (/summarize)
  - TEST-PAT-003: Wisdom pattern (/wisdom)
  - TEST-REG-003: Metadata extraction (tags, mentions, [key:value])
  - TEST-REG-020: iOS Shortcut clipboard sharing
`);
        break;
      }

      // Parse --run option (required)
      const runIndex = subArgs.findIndex(a => a === "--run");
      if (runIndex < 0 || !subArgs[runIndex + 1]) {
        console.error("Error: --run RUN_ID is required");
        console.log("Example: ingest test semantic --run run-2025-12-05-10-30-00");
        console.log("\nList recent runs with: ls test/output/ | grep run-");
        process.exit(1);
      }
      const runId = subArgs[runIndex + 1];

      const dryRun = subArgs.includes("--dry-run");
      const timeoutIndex = subArgs.findIndex(a => a === "--timeout");
      const timeout = timeoutIndex >= 0 ? parseInt(subArgs[timeoutIndex + 1], 10) : undefined;
      const testIds = subArgs.filter(a => a.startsWith("TEST-"));

      const { results, summary } = await runLLMJudge(allIngestSpecs, {
        runId,
        testIds: testIds.length > 0 ? testIds : undefined,
        timeout,
        verbose,
        dryRun,
      });

      process.exit(summary.failed > 0 ? 1 : 0);
      break;
    }

    case "daemon": {
      // Daemon deployment test - verifies watch daemon is working
      const { runDaemonTest, printDaemonTestResult, printDaemonTestHelp } = await import("./test/framework/daemon-runner");

      if (subArgs.includes("--help") || subArgs.includes("-h")) {
        printDaemonTestHelp();
        break;
      }

      const useTestChannels = subArgs.includes("--test");
      const skipCleanup = subArgs.includes("--no-cleanup");
      const timeoutIndex = subArgs.findIndex(a => a === "--timeout");
      const timeout = timeoutIndex >= 0 ? parseInt(subArgs[timeoutIndex + 1], 10) : undefined;

      const result = await runDaemonTest({
        useTestChannels,
        timeout,
        verbose,
        skipCleanup,
      });

      printDaemonTestResult(result);
      process.exit(result.passed ? 0 : 1);
      break;
    }

    case "setup": {
      // Integration test setup - clear channel, populate, run tests, cleanup
      // Run the setup script (it prints its own header)
      const { spawn } = await import("child_process");
      const { dirname: pathDirname } = await import("path");
      
      const dryRun = subArgs.includes("--dry-run");
      const skipTests = subArgs.includes("--skip-tests");
      const force = subArgs.includes("--force");
      
      const setupArgs = ["run", "test/integration-setup.ts"];
      if (dryRun) setupArgs.push("--dry-run");
      if (skipTests) setupArgs.push("--skip-tests");
      if (force) setupArgs.push("--force");
      if (verbose) setupArgs.push("--verbose");
      
      const scriptDir = pathDirname(new URL(import.meta.url).pathname);
      const setupProcess = spawn("bun", setupArgs, { 
        stdio: "inherit",
        cwd: scriptDir,
      });
      
      setupProcess.on("close", (code) => {
        process.exit(code || 0);
      });
      break;
    }

    case "cleanup": {
      // Clean up test-generated files
      const { cleanupTestFiles, listTestRuns, scanForUnregisteredTestFiles, printCleanupHelp } = await import("./test/framework/cleanup");

      const list = subArgs.includes("--list");
      const scan = subArgs.includes("--scan");
      const dryRun = subArgs.includes("--dry-run");
      const all = subArgs.includes("--all");

      // Parse --run option
      const runIndex = subArgs.findIndex(a => a === "--run");
      const runId = runIndex >= 0 ? subArgs[runIndex + 1] : undefined;

      if (list) {
        listTestRuns();
        break;
      }

      if (scan) {
        console.log("\nScanning vault for unregistered test files...");
        const files = await scanForUnregisteredTestFiles();
        if (files.length === 0) {
          console.log("No unregistered test files found");
        } else {
          console.log(`\nFound ${files.length} unregistered test files:`);
          for (const f of files.slice(0, 20)) {
            console.log(`  - ${f}`);
          }
          if (files.length > 20) {
            console.log(`  ... and ${files.length - 20} more`);
          }
          console.log("\nThese files contain test IDs but aren't in the registry.");
          console.log("They may be from older test runs before registry was added.");
        }
        break;
      }

      if (!runId && !all) {
        printCleanupHelp();
        break;
      }

      const result = await cleanupTestFiles({
        runId,
        all,
        dryRun,
        verbose,
      });

      if (!dryRun && result.deleted.length > 0) {
        console.log("\n✅ Cleanup complete");
      }
      break;
    }

    case "all": {
      // Run all test layers: unit → integration → cli → acceptance
      const { runTests, printSummary } = await import("./test/framework/runner");
      const { runIntegrationTests, printIntegrationSummary, saveDetailedReport } = await import("./test/framework/integration-runner");
      const { runCLITests } = await import("./test/framework/cli-runner");
      const { runAcceptanceTests } = await import("./test/framework/acceptance-runner");

      // Parse options
      const parallel = subArgs.includes("--parallel");
      const skipUnit = subArgs.includes("--skip-unit");
      const skipIntegration = subArgs.includes("--skip-integration");
      const skipCli = subArgs.includes("--skip-cli");
      const skipAcceptance = subArgs.includes("--skip-acceptance");

      // Parse timeout (per-test timeout in ms)
      let timeout: number | undefined;
      const timeoutIndex = subArgs.findIndex(a => a === "--timeout");
      if (timeoutIndex >= 0) {
        timeout = parseInt(subArgs[timeoutIndex + 1], 10);
      }

      // Generate unified run ID for all layers
      const startedAt = new Date().toISOString();
      const unifiedRunId = `all-${startedAt.slice(0, 19).replace(/[T:]/g, "-")}`;

      // Create output directory and set up logging
      const { existsSync, mkdirSync, appendFileSync } = await import("fs");
      const { join } = await import("path");
      const outputDir = join(import.meta.dir, "test", "output", unifiedRunId);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      const runLogPath = join(outputDir, "run.log");
      
      // Intercept console.log to also write to run.log
      const originalLog = console.log;
      const originalError = console.error;
      const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
      
      console.log = (...args: unknown[]) => {
        const line = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
        originalLog(...args);
        try {
          appendFileSync(runLogPath, stripAnsi(line) + "\n");
        } catch {}
      };
      console.error = (...args: unknown[]) => {
        const line = args.map(a => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
        originalError(...args);
        try {
          appendFileSync(runLogPath, "[ERROR] " + stripAnsi(line) + "\n");
        } catch {}
      };

      // Write header to log
      console.log("═".repeat(60));
      console.log(`TEST RUN: ${unifiedRunId}`);
      console.log(`Started: ${startedAt}`);
      console.log("═".repeat(60));

      console.log("\n🧪 Running All Test Layers");
      console.log("═".repeat(60));
      console.log(`Run ID: ${unifiedRunId}`);
      console.log("Layers: unit → integration → cli → acceptance");
      console.log("═".repeat(60));

      const { appendUnifiedHistory } = await import("./test/framework/report");
      const layerResults: LayerResult[] = [];
      let hasFailures = false;

      // Layer 1: Unit Tests
      if (!skipUnit) {
        console.log("\n📦 Layer 1: Unit Tests");
        console.log("─".repeat(60));
        const unitSummary = await runTests({
          all: true,
          verbose,
          keepOutput: false,
          skipMedia: false,  // Include media tests by default
          runId: unifiedRunId,
          skipHistory: true,
        });
        layerResults.push({
          layer: "unit",
          status: "executed",
          passed: unitSummary.counts.passed,
          failed: unitSummary.counts.failed,
          skipped: unitSummary.counts.skipped,
          total: unitSummary.counts.total,
          duration: unitSummary.duration,
          failedTests: unitSummary.results.filter(r => !r.passed).map(r => r.testId),
        });
        if (unitSummary.counts.failed > 0) hasFailures = true;
      } else {
        layerResults.push({ layer: "unit", status: "skipped", passed: 0, failed: 0, skipped: 0, total: 0, duration: 0, failedTests: [] });
      }

      // Layer 2: Integration Tests
      if (!skipIntegration) {
        console.log("\n📡 Layer 2: Integration Tests");
        console.log("─".repeat(60));
        const integrationSummary = await runIntegrationTests({
          all: true,
          verbose,
          timeout,
          parallel,
          runId: unifiedRunId,
          skipHistory: true,
        });
        layerResults.push({
          layer: "integration",
          status: "executed",
          passed: integrationSummary.counts.passed,
          failed: integrationSummary.counts.failed,
          skipped: integrationSummary.counts.skipped,
          total: integrationSummary.counts.total,
          duration: integrationSummary.duration,
          failedTests: integrationSummary.results.filter(r => !r.passed).map(r => r.testId),
        });
        saveDetailedReport(integrationSummary, { runId: unifiedRunId, skipHistory: true });
        if (integrationSummary.counts.failed > 0) hasFailures = true;
      } else {
        layerResults.push({ layer: "integration", status: "skipped", passed: 0, failed: 0, skipped: 0, total: 0, duration: 0, failedTests: [] });
      }

      // Layer 3: CLI Tests
      if (!skipCli) {
        console.log("\n🔧 Layer 3: CLI Tests");
        console.log("─".repeat(60));
        const cliSummary = await runCLITests({
          verbose,
          skipEmbeddings: false,
          runId: unifiedRunId,
          skipHistory: true,
        });
        layerResults.push({
          layer: "cli",
          status: "executed",
          passed: cliSummary.counts.passed,
          failed: cliSummary.counts.failed,
          skipped: cliSummary.counts.skipped,
          total: cliSummary.counts.total,
          duration: cliSummary.duration,
          failedTests: cliSummary.results.filter(r => !r.passed).map(r => r.testId),
        });
        if (cliSummary.counts.failed > 0) hasFailures = true;
      } else {
        layerResults.push({ layer: "cli", status: "skipped", passed: 0, failed: 0, skipped: 0, total: 0, duration: 0, failedTests: [] });
      }

      // Layer 4: Acceptance Tests
      if (!skipAcceptance) {
        console.log("\n🎯 Layer 4: Acceptance Tests");
        console.log("─".repeat(60));
        const acceptanceSummary = await runAcceptanceTests({
          verbose,
          runId: unifiedRunId,
          skipHistory: true,
        });
        layerResults.push({
          layer: "acceptance",
          status: "executed",
          passed: acceptanceSummary.counts.passed,
          failed: acceptanceSummary.counts.failed,
          skipped: acceptanceSummary.counts.skipped,
          total: acceptanceSummary.counts.total,
          duration: acceptanceSummary.duration,
          failedTests: acceptanceSummary.results.filter(r => !r.passed).map(r => r.testId),
        });
        if (acceptanceSummary.counts.failed > 0) hasFailures = true;
      } else {
        layerResults.push({ layer: "acceptance", status: "skipped", passed: 0, failed: 0, skipped: 0, total: 0, duration: 0, failedTests: [] });
      }

      // Calculate total duration
      const totalDurationMs = layerResults.reduce((sum, lr) => sum + lr.duration, 0);

      // Print combined summary
      console.log("\n" + "═".repeat(70));
      console.log("COMBINED TEST SUMMARY");
      console.log("═".repeat(70));
      console.log(` Layer         Status   Passed  Failed  Skipped   Total   Time`);
      console.log("─".repeat(70));

      let totalPassed = 0, totalFailed = 0, totalSkipped = 0, totalTests = 0;
      for (const lr of layerResults) {
        if (lr.status === "skipped") {
          console.log(` - ${lr.layer.padEnd(12)} skipped`);
        } else {
          const icon = lr.failed === 0 ? "✓" : "✗";
          console.log(` ${icon} ${lr.layer.padEnd(12)} run     ${String(lr.passed).padStart(6)}  ${String(lr.failed).padStart(6)}  ${String(lr.skipped).padStart(7)}  ${String(lr.total).padStart(6)}  ${(lr.duration / 1000).toFixed(1)}s`);
          totalPassed += lr.passed;
          totalFailed += lr.failed;
          totalSkipped += lr.skipped;
          totalTests += lr.total;
        }
      }

      console.log("─".repeat(70));
      const overallStatus = hasFailures ? "✗" : "✓";
      console.log(` ${overallStatus} TOTAL                 ${String(totalPassed).padStart(6)}  ${String(totalFailed).padStart(6)}  ${String(totalSkipped).padStart(7)}  ${String(totalTests).padStart(6)}  ${(totalDurationMs / 1000).toFixed(1)}s`);
      console.log("═".repeat(70));

      const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
      console.log(`\nOverall pass rate: ${passRate}%`);

      // Record unified history entry
      appendUnifiedHistory(unifiedRunId, startedAt, totalDurationMs, layerResults);
      
      console.log(`\nRun ID: ${unifiedRunId}`);
      console.log(`\n📄 Full log saved: ${runLogPath}`);
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;

      process.exit(hasFailures ? 1 : 0);
    }

    default:
      console.error(`Unknown test subcommand: ${subcommand}`);
      console.log(TEST_HELP);
      process.exit(1);
  }
}

main();
