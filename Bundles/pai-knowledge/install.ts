#!/usr/bin/env bun
/**
 * PAI Knowledge Capture Bundle - Installation Wizard
 *
 * Interactive CLI wizard for setting up Telegram-based knowledge capture
 * with automatic taxonomy tagging and Obsidian vault integration.
 *
 * Usage: bun run install.ts
 */

import * as readline from "readline";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, symlinkSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { $ } from "bun";

// =============================================================================
// TYPES
// =============================================================================

interface CaptureConfig {
  paiDir: string;
  vaultPath: string;
  // Two bots with different purposes
  telegramSenderBotToken: string;  // For iOS Shortcuts + CLI to SEND captures
  telegramReaderBotToken: string;  // For daemon to READ/POLL the inbox
  // Two channels for the workflow
  telegramInboxChannelId: string;  // Where raw captures land
  telegramEventChannelId: string;  // Where processed notifications go
  processingProfile: "zettelkasten" | "simple";
  openaiApiKey?: string;
  jinaApiKey?: string;
  icloudDropFolder?: string;
  // Audio transcription
  whisperBin?: string;
  whisperModelDir?: string;
  // Content processing patterns
  fabricEnabled?: boolean;
}

interface WizardState {
  config: Partial<CaptureConfig>;
  stepCompleted: boolean[];
  postInstallSteps: string[];  // Actions user must take after wizard completes
}

// =============================================================================
// UTILITIES
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askWithDefault(question: string, defaultValue: string): Promise<string> {
  const answer = await ask(`${question} [${defaultValue}]: `);
  return answer || defaultValue;
}

async function askYesNo(question: string, defaultYes = true): Promise<boolean> {
  const defaultStr = defaultYes ? "Y/n" : "y/N";
  const answer = await ask(`${question} [${defaultStr}]: `);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

async function askChoice<T extends string>(question: string, options: T[], defaultOption?: T): Promise<T> {
  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    const isDefault = opt === defaultOption ? " (default)" : "";
    console.log(`  ${i + 1}. ${opt}${isDefault}`);
  });

  while (true) {
    const answer = await ask("Enter number: ");
    if (!answer && defaultOption) return defaultOption;

    const num = parseInt(answer, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return options[num - 1];
    }

    console.log("Invalid choice, please try again.");
  }
}

function printHeader(title: string, step?: number) {
  // Pad before adding ANSI codes (ANSI codes break string length calculations)
  // Box is 62 dashes (64 total) to match other boxes in the wizard
  const stepText = step ? `[ STEP ${step} of 7 ]` : "";
  const paddedTitle = title.padEnd(44);
  const paddedStep = stepText.padStart(15);
  console.log(`
\x1b[90m┌${"─".repeat(62)}┐\x1b[0m
\x1b[90m│\x1b[0m  \x1b[1m\x1b[36m${paddedTitle}\x1b[0m\x1b[33m${paddedStep}\x1b[0m \x1b[90m│\x1b[0m
\x1b[90m└${"─".repeat(62)}┘\x1b[0m
`);
}

function printSection(title: string) {
  console.log(`\n\x1b[1m\x1b[90m── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}\x1b[0m\n`);
}

function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

async function checkCommandExists(command: string): Promise<boolean> {
  try {
    await $`which ${command}`.quiet();
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Spinner for async operations
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

async function withSpinner<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; success: boolean }> {
  let frameIndex = 0;
  let success = true;

  // Start spinner
  process.stdout.write(`  ${spinnerFrames[0]} ${label}`);

  const interval = setInterval(() => {
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
    process.stdout.write(`\r  ${spinnerFrames[frameIndex]} ${label}`);
  }, 80);

  try {
    const result = await fn();
    clearInterval(interval);
    process.stdout.write(`\r  ✅ ${label}\n`);
    return { result, success: true };
  } catch (err) {
    clearInterval(interval);
    process.stdout.write(`\r  ❌ ${label}\n`);
    return { result: err as T, success: false };
  }
}

async function checkWithSpinner(
  label: string,
  fn: () => Promise<boolean>,
  errorHint?: string,
  delayAfter = 250  // Pause after completion so user can see result
): Promise<{ pass: boolean; name: string; error?: string }> {
  let frameIndex = 0;

  // Start spinner
  process.stdout.write(`  ${spinnerFrames[0]} ${label}`);

  const interval = setInterval(() => {
    frameIndex = (frameIndex + 1) % spinnerFrames.length;
    process.stdout.write(`\r  ${spinnerFrames[frameIndex]} ${label}`);
  }, 80);

  try {
    const pass = await fn();
    clearInterval(interval);
    const icon = pass ? "✅" : "❌";
    process.stdout.write(`\r  ${icon} ${label}\n`);
    await sleep(delayAfter);  // Let user see the result
    return { pass, name: label, error: pass ? undefined : errorHint };
  } catch {
    clearInterval(interval);
    process.stdout.write(`\r  ❌ ${label}\n`);
    await sleep(delayAfter);  // Let user see the error
    return { pass: false, name: label, error: errorHint };
  }
}

// =============================================================================
// WIZARD STEPS
// =============================================================================

async function step1TelegramBots(state: WizardState): Promise<void> {
  printHeader("Create Telegram Bots", 1);

  console.log(`This system uses \x1b[1mTWO Telegram bots\x1b[0m for security separation:

\x1b[32m┌──────────────────────────────────────────────────────────────┐
│  SENDER BOT                                                  │
│  - Lives on your devices (iOS Shortcuts, CLI)                │
│  - Used to SEND captures to your inbox channel               │
│  - If compromised, can only send--not read your knowledge    │
└──────────────────────────────────────────────────────────────┘\x1b[0m
\x1b[34m┌──────────────────────────────────────────────────────────────┐
│  READER BOT                                                  │
│  - Lives on your machine (daemon only)                       │
│  - Used to POLL/READ messages from the inbox channel         │
│  - Processes captures and saves to Obsidian                  │
└──────────────────────────────────────────────────────────────┘\x1b[0m

\x1b[33mCreate BOTH bots now via @BotFather:\x1b[0m

  1. Open Telegram and search for \x1b[1m@BotFather\x1b[0m
  2. Send \x1b[36m/newbot\x1b[0m
  3. Name it (e.g., "PAI Sender Bot")
  4. Copy the token
  5. Repeat for the second bot (e.g., "PAI Reader Bot")
`);

  // Sender Bot
  printSection("Sender Bot (for iOS Shortcuts + CLI)");
  console.log("This token will be used in your iOS Shortcuts and CLI to send captures.\n");

  while (true) {
    const token = await ask("Paste your SENDER bot token: ");

    if (/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      state.config.telegramSenderBotToken = token;
      console.log("\n✅ Sender bot token saved");
      break;
    }

    console.log("❌ Invalid token format. It should look like: 123456789:ABCdef...");
    const retry = await askYesNo("Try again?");
    if (!retry) {
      throw new Error("Sender bot token is required");
    }
  }

  // Reader Bot
  printSection("Reader Bot (for daemon polling)");
  console.log("This token stays on your machine. The daemon uses it to read and process messages.\n");

  while (true) {
    const token = await ask("Paste your READER bot token: ");

    if (/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      state.config.telegramReaderBotToken = token;
      console.log("\n✅ Reader bot token saved");
      break;
    }

    console.log("❌ Invalid token format. It should look like: 123456789:ABCdef...");
    const retry = await askYesNo("Try again?");
    if (!retry) {
      throw new Error("Reader bot token is required");
    }
  }

  state.stepCompleted[0] = true;
}

async function step2TelegramChannels(state: WizardState): Promise<void> {
  printHeader("Create Telegram Channels", 2);

  console.log(`This system uses \x1b[1mTWO Telegram channels\x1b[0m:

\x1b[35m┌──────────────────────────────────────────────────────────────┐
│  INBOX CHANNEL                                               │
│  - Where raw captures land from iOS Shortcuts and CLI        │
│  - Sender bot SENDS here, Reader bot READS here              │
│  - Add BOTH bots as admins                                   │
└──────────────────────────────────────────────────────────────┘\x1b[0m
\x1b[33m┌──────────────────────────────────────────────────────────────┐
│  EVENT CHANNEL                                               │
│  - Where processed notifications go after ingestion          │
│  - "New note created: AI Architecture Ideas"                 │
│  - Add BOTH bots as admins (Reader sends notifications)      │
└──────────────────────────────────────────────────────────────┘\x1b[0m

\x1b[33mCreate BOTH channels now:\x1b[0m

  1. In Telegram, create a new Channel (pencil icon → New Channel)
  2. Name it (e.g., "PAI Inbox") and make it \x1b[1mPRIVATE\x1b[0m
  3. Add your bots as admins (channel settings → Administrators)
  4. Get the channel ID:
     • Send any message to the channel
     • Forward it to \x1b[1m@userinfobot\x1b[0m
     • The bot will reply with the channel ID (starts with \x1b[36m-100\x1b[0m)
  5. Repeat for the Event channel
`);

  // Inbox Channel
  printSection("Inbox Channel (where captures land)");
  console.log("Add BOTH bots as admins to this channel.\n");

  while (true) {
    const channelId = await ask("Enter your INBOX channel ID: ");

    if (/^-100\d+$/.test(channelId)) {
      state.config.telegramInboxChannelId = channelId;
      console.log("\n✅ Inbox channel ID saved");
      break;
    }

    console.log("❌ Invalid channel ID. It should start with -100");
    const retry = await askYesNo("Try again?");
    if (!retry) {
      throw new Error("Inbox channel ID is required");
    }
  }

  // Event Channel
  printSection("Event Channel (processed notifications)");
  console.log("Add BOTH bots as admins to this channel.\n");

  while (true) {
    const channelId = await ask("Enter your EVENT channel ID: ");

    if (/^-100\d+$/.test(channelId)) {
      state.config.telegramEventChannelId = channelId;
      console.log("\n✅ Event channel ID saved");
      break;
    }

    console.log("❌ Invalid channel ID. It should start with -100");
    const retry = await askYesNo("Try again?");
    if (!retry) {
      throw new Error("Event channel ID is required");
    }
  }

  state.stepCompleted[1] = true;
}

async function step3ObsidianVault(state: WizardState): Promise<void> {
  printHeader("Configure Obsidian Vault", 3);

  console.log(`The capture system needs to know where your Obsidian vault is located.

Notes will be saved to this vault with automatic frontmatter and taxonomy tags.
`);

  // Try to detect common vault locations
  const commonPaths = [
    "~/Documents/Obsidian",
    "~/Documents/Notes",
    "~/Documents/vault",
    "~/Obsidian",
  ];

  const existingVaults = commonPaths
    .map(expandPath)
    .filter(p => existsSync(p));

  if (existingVaults.length > 0) {
    console.log("Found possible vault locations:");
    existingVaults.forEach(v => console.log(`  • ${v}`));
    console.log("");
  }

  while (true) {
    const vaultPath = await askWithDefault(
      "Enter your vault path",
      existingVaults[0] || "~/Documents/vault"
    );

    const expanded = expandPath(vaultPath);

    if (existsSync(expanded)) {
      state.config.vaultPath = expanded;
      console.log(`\n✅ Vault configured: ${expanded}`);
      break;
    }

    console.log(`❌ Path does not exist: ${expanded}`);
    const create = await askYesNo("Create this directory?");
    if (create) {
      mkdirSync(expanded, { recursive: true });
      state.config.vaultPath = expanded;
      console.log(`\n✅ Created and configured vault: ${expanded}`);
      break;
    }
  }

  state.stepCompleted[2] = true;
}

async function step4ProfileSelection(state: WizardState): Promise<void> {
  printHeader("Select Processing Profile", 4);

  console.log(`Choose how captured content should be processed:

ZETTELKASTEN (recommended for knowledge workers):
  • Atomic notes with unique IDs
  • Extensive taxonomy tagging (PARA, 13 dimensions)
  • Link suggestions and backlinks
  • Optimized for building a second brain

SIMPLE (recommended for quick notes):
  • Straightforward file naming
  • Basic frontmatter
  • Faster processing
  • Good for task capture and logs
`);

  const profile = await askChoice<"zettelkasten" | "simple">(
    "Select processing profile:",
    ["zettelkasten", "simple"],
    "zettelkasten"
  );

  state.config.processingProfile = profile;
  console.log(`\n✅ Profile selected: ${profile}`);

  state.stepCompleted[3] = true;
}

async function step5EnvSetup(state: WizardState): Promise<void> {
  printHeader("Environment Setup", 5);

  // Always use ~/.claude for .env - this is where the daemon reads from
  // ~/.claude is a symlink managed by pai-switch pointing to the active environment
  const paiDir = expandPath("~/.claude");
  state.config.paiDir = paiDir;

  console.log(`\x1b[90mConfiguration will be saved to: ${paiDir}/.env\x1b[0m\n`);

  // ── OpenAI Section ──────────────────────────────────────────────
  console.log(`\x1b[1m\x1b[36m┌──────────────────────────────────────────────────────────────┐
│  🤖 OPENAI API KEY (Highly Recommended)                      │
└──────────────────────────────────────────────────────────────┘\x1b[0m
`);

  console.log(`Used throughout the system for:
  • Semantic search (embeddings for ctx search)
  • Auto-naming (voice memos, documents, photos)
  • Tag inference (automatic taxonomy classification)
  • Vision analysis (photo description, whiteboard OCR)
  • Name suggestions (during sweep cultivation)

\x1b[90mWithout it, the system works but with reduced intelligence.\x1b[0m
`);

  const wantsOpenAI = await askYesNo("Add OpenAI API key?", true);
  if (wantsOpenAI) {
    state.config.openaiApiKey = await ask("Enter OpenAI API key: ");
  } else {
    console.log("\n\x1b[33m⚠️  System will work but with limited AI features\x1b[0m");
  }

  // ── Jina Section ────────────────────────────────────────────────
  console.log(`
\x1b[1m\x1b[33m┌──────────────────────────────────────────────────────────────┐
│  🌐 JINA API KEY (Optional)                                  │
└──────────────────────────────────────────────────────────────┘\x1b[0m

Extracts clean content from web pages when you capture URLs.
\x1b[90mGenerous free tier: https://jina.ai/reader\x1b[0m
`);

  const wantsJina = await askYesNo("Add Jina API key?", false);
  if (wantsJina) {
    state.config.jinaApiKey = await ask("Enter Jina API key: ");
  }

  // ── iCloud Section ──────────────────────────────────────────────
  console.log(`
\x1b[1m\x1b[35m┌──────────────────────────────────────────────────────────────┐
│  ☁️  ICLOUD DROP FOLDER (Optional - for files > 20MB)         │
└──────────────────────────────────────────────────────────────┘\x1b[0m

Telegram has a 20MB file limit. For larger files, use iCloud:
  1. iOS Shortcut saves file to iCloud folder
  2. Daemon polls the folder and ingests files
`);

  console.log(`\x1b[31m⚠️  REQUIRES FULL DISK ACCESS\x1b[0m

\x1b[90mBefore enabling, grant Full Disk Access:\x1b[0m
  1. System Preferences → Privacy & Security → Full Disk Access
  2. Add: ~/.bun/bin/bun (or /usr/local/bin/bun)
  3. Add: Terminal.app

\x1b[90mSet this up NOW before proceeding if you want iCloud support.\x1b[0m
`);

  const wantsIcloud = await askYesNo("Configure iCloud drop folder?", false);
  if (wantsIcloud) {
    const defaultIcloud = expandPath("~/Library/Mobile Documents/com~apple~CloudDocs/PAI-Inbox");
    state.config.icloudDropFolder = await askWithDefault(
      "iCloud drop folder path",
      defaultIcloud
    );

    const icloudPath = expandPath(state.config.icloudDropFolder);
    if (!existsSync(icloudPath)) {
      mkdirSync(icloudPath, { recursive: true });
      console.log(`Created: ${icloudPath}`);
    }

    // Track FDA requirement for post-install summary
    state.postInstallSteps.push("Grant Full Disk Access to bun and Terminal (System Preferences → Privacy & Security)");
  }

  // ── Whisper.cpp Section (Auto-detect) ──────────────────────────
  const defaultWhisperBin = existsSync("/usr/local/bin/whisper-cpp")
    ? "/usr/local/bin/whisper-cpp"
    : existsSync(expandPath("~/Documents/src/whisper.cpp/whisper-cpp"))
      ? expandPath("~/Documents/src/whisper.cpp/whisper-cpp")
      : "";

  const defaultWhisperModels = existsSync(expandPath("~/.whisper/models"))
    ? expandPath("~/.whisper/models")
    : existsSync(expandPath("~/Documents/src/whisper.cpp/models"))
      ? expandPath("~/Documents/src/whisper.cpp/models")
      : "";

  // Auto-configure if fully installed (no prompts needed)
  if (defaultWhisperBin && defaultWhisperModels) {
    console.log(`
\x1b[1m\x1b[34m┌──────────────────────────────────────────────────────────────┐
│  🎙️  WHISPER.CPP (Optional - voice transcription)            │
└──────────────────────────────────────────────────────────────┘\x1b[0m

\x1b[32m✓ Auto-configured\x1b[0m
  Binary: ${defaultWhisperBin}
  Models: ${defaultWhisperModels}
`);
    state.config.whisperBin = defaultWhisperBin;
    state.config.whisperModelDir = defaultWhisperModels;
  } else if (defaultWhisperBin || defaultWhisperModels) {
    // Partial install - ask if user wants to complete setup
    console.log(`
\x1b[1m\x1b[34m┌──────────────────────────────────────────────────────────────┐
│  🎙️  WHISPER.CPP (Optional - voice transcription)            │
└──────────────────────────────────────────────────────────────┘\x1b[0m

Partial installation detected:
${defaultWhisperBin ? `  \x1b[32m✓\x1b[0m Binary: ${defaultWhisperBin}` : "  \x1b[33m✗\x1b[0m Binary: not found"}
${defaultWhisperModels ? `  \x1b[32m✓\x1b[0m Models: ${defaultWhisperModels}` : "  \x1b[33m✗\x1b[0m Models: not found"}
`);
    const wantsWhisper = await askYesNo("Complete Whisper.cpp setup?", true);
    if (wantsWhisper) {
      state.config.whisperBin = await askWithDefault(
        "Path to whisper-cpp binary",
        defaultWhisperBin || "/usr/local/bin/whisper-cpp"
      );
      state.config.whisperModelDir = await askWithDefault(
        "Path to whisper models directory",
        defaultWhisperModels || expandPath("~/.whisper/models")
      );

      // Add post-install steps for missing components
      if (!defaultWhisperBin) {
        state.postInstallSteps.push(`Install whisper-cpp: brew install whisper-cpp`);
      }
      if (!defaultWhisperModels) {
        state.postInstallSteps.push(`Download whisper model: mkdir -p ~/.whisper/models && cd ~/.whisper/models && curl -LO https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin`);
      }
    }
  } else {
    // Not installed - just inform, no prompt
    console.log(`
\x1b[1m\x1b[90m┌──────────────────────────────────────────────────────────────┐
│  🎙️  WHISPER.CPP (Optional - voice transcription)            │
└──────────────────────────────────────────────────────────────┘\x1b[0m

\x1b[90m⊘ Not detected
  Install: https://github.com/ggerganov/whisper.cpp\x1b[0m
`);
  }

  // ── Fabric Section (Auto-detect) ───────────────────────────────
  const fabricInstalled = await checkCommandExists("fabric");

  if (fabricInstalled) {
    // Auto-enable if installed (no prompt needed)
    console.log(`
\x1b[1m\x1b[34m┌──────────────────────────────────────────────────────────────┐
│  🧵 FABRIC (Optional - AI content patterns)                  │
└──────────────────────────────────────────────────────────────┘\x1b[0m

\x1b[32m✓ Auto-enabled\x1b[0m
  Commands: /summarize, /wisdom, /article, /clean
`);
    state.config.fabricEnabled = true;
  } else {
    // Not installed - just inform, no prompt
    console.log(`
\x1b[1m\x1b[90m┌──────────────────────────────────────────────────────────────┐
│  🧵 FABRIC (Optional - AI content patterns)                  │
└──────────────────────────────────────────────────────────────┘\x1b[0m

\x1b[90m⊘ Not detected
  Install: https://github.com/danielmiessler/fabric\x1b[0m
`);
  }

  // Write .env file
  const envPath = join(paiDir, ".env");
  const envContent = generateEnvContent(state.config as CaptureConfig);

  // Read existing .env if present
  let existingEnv = "";
  if (existsSync(envPath)) {
    existingEnv = readFileSync(envPath, "utf-8");
    console.log(`\nExisting .env found. Will merge configuration.`);
  }

  // Merge: add new keys, preserve existing ones
  const mergedEnv = mergeEnvContent(existingEnv, envContent);

  // Ensure directory exists
  if (!existsSync(paiDir)) {
    mkdirSync(paiDir, { recursive: true });
  }

  writeFileSync(envPath, mergedEnv);
  console.log(`\n✅ Environment saved to: ${envPath}`);

  // Install skill pack (SKILL.md and workflows)
  printSection("Installing Context Skill");
  const { installed, errors, pathAdded, coreSkillMissing } = await installSkillPack(paiDir);

  if (errors.length > 0) {
    console.log(`⚠️  Skill installation had errors:`);
    errors.forEach(e => console.log(`   • ${e}`));
  }

  // Track post-installation steps
  if (pathAdded) {
    state.postInstallSteps.push("Run: source ~/.zshrc (or start a new terminal) to activate PATH changes");
  }

  if (coreSkillMissing) {
    state.postInstallSteps.push("CORE skill not found - NLP routing unavailable. Install CORE skill and re-run wizard, or manually add Context routing from skill-pack.md");
  }

  if (installed > 0) {
    console.log(`✅ Installed ${installed} skill file(s) to ${paiDir}/skills/Context/`);
  }

  state.stepCompleted[4] = true;
}

async function step6DaemonInstall(state: WizardState): Promise<void> {
  printHeader("Install Background Daemon", 6);

  const platform = process.platform;

  if (platform !== "darwin") {
    console.log(`⚠️  Daemon installation is currently macOS-only.
For Linux, you'll need to create a systemd service manually.
See the documentation for instructions.`);

    const proceed = await askYesNo("Continue without daemon installation?");
    if (!proceed) {
      throw new Error("Daemon installation required");
    }
    state.stepCompleted[5] = true;
    return;
  }

  const paiDir = state.config.paiDir!;
  const launchAgentsDir = expandPath("~/Library/LaunchAgents");
  const plistName = "com.pai.ingest-watch.plist";
  const plistPath = join(launchAgentsDir, plistName);

  // Check if daemon already exists (reinstall scenario)
  let isReinstall = false;
  try {
    await $`launchctl list | grep pai.ingest`.quiet();
    isReinstall = true;
    console.log("Existing daemon detected - will restart with new configuration...\n");
  } catch {
    console.log("Installing LaunchAgent for automatic Telegram polling...\n");
  }

  // Create LaunchAgents directory if needed
  if (!existsSync(launchAgentsDir)) {
    mkdirSync(launchAgentsDir, { recursive: true });
  }

  // Generate plist content
  const plistContent = generateLaunchAgentPlist(paiDir);

  // Unload if already exists
  try {
    await $`launchctl unload ${plistPath} 2>/dev/null`.quiet();
  } catch {
    // Ignore if not loaded
  }

  writeFileSync(plistPath, plistContent);

  // Load the daemon
  try {
    await $`launchctl load ${plistPath}`;
    if (isReinstall) {
      console.log(`✅ Daemon restarted with new configuration`);
    } else {
      console.log(`✅ LaunchAgent installed and loaded`);
    }
    console.log(`   Logs: /tmp/ingest-watch.log`);
  } catch (error) {
    console.log(`⚠️  Failed to load LaunchAgent. You may need to load it manually:`);
    console.log(`   launchctl load ${plistPath}`);
  }

  // Apple Shortcuts (optional)
  console.log(`
\x1b[1m\x1b[36m┌──────────────────────────────────────────────────────────────┐
│  📱 APPLE SHORTCUTS (Optional - iOS/macOS capture)           │
└──────────────────────────────────────────────────────────────┘\x1b[0m

One-tap capture from iPhone, iPad, or Mac to your knowledge inbox:
  • Clipboard → Telegram (text, links, rich content)
  • Files → Telegram (documents, images)
  • Large files → iCloud buffer → Telegram
`);

  const buildShortcuts = await askYesNo("Build Apple shortcuts?", true);

  if (buildShortcuts) {
    const bundleDir = dirname(import.meta.path);
    const shortcutsDir = join(bundleDir, "shortcuts");
    const buildDir = join(shortcutsDir, "build");

    console.log("");

    // Build all shortcuts at once
    const buildResult = await checkWithSpinner(
      "Building shortcuts from templates",
      async () => {
        await $`cd ${shortcutsDir} && ./setup.sh`.quiet();
        return true;
      },
      "Run manually: cd shortcuts && ./setup.sh"
    );

    if (buildResult.pass) {
      // List built shortcuts with checkmarks
      const shortcuts = ["clipboard-capture", "file-capture", "large-file-capture"];
      for (const name of shortcuts) {
        const shortcutPath = join(buildDir, `${name}.shortcut`);
        const displayName = name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        await checkWithSpinner(
          displayName,
          async () => existsSync(shortcutPath),
          `Missing: ${name}.shortcut`
        );
      }

      // Offer to import shortcuts on macOS
      if (process.platform === "darwin") {
        const importNow = await askYesNo("Import shortcuts to Shortcuts app now?", true);

        if (importNow) {
          console.log("\n  Opening shortcuts for import (confirm each dialog)...\n");
          for (const name of shortcuts) {
            const shortcutPath = join(buildDir, `${name}.shortcut`);
            const displayName = name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            await checkWithSpinner(
              `Opening ${displayName}`,
              async () => {
                await $`open ${shortcutPath}`;
                await sleep(1500); // Wait for dialog to appear
                return true;
              },
              `Failed to open ${name}.shortcut`
            );
          }
          console.log(`
  \x1b[33mConfirm each import dialog in the Shortcuts app.\x1b[0m
`);
        }
      }

      console.log(`
\x1b[36mTo install on other devices:\x1b[0m

  1. AirDrop .shortcut files to iPhone/iPad
  2. Or copy to iCloud Drive → open from Files app

  Location: \x1b[90m${buildDir}\x1b[0m
`);
    }
  } else {
    console.log(`
  \x1b[90mYou can build shortcuts later with:\x1b[0m
  \x1b[90mcd ${dirname(import.meta.path)}/shortcuts && ./setup.sh\x1b[0m
`);
  }

  state.stepCompleted[5] = true;
}

async function step7Verification(state: WizardState): Promise<void> {
  printHeader("Verify Installation", 7);

  console.log("Running verification checks...\n");

  const checks: { name: string; pass: boolean; error?: string }[] = [];

  // ─────────────────────────────────────────────────────────────────
  // PREREQUISITES
  // ─────────────────────────────────────────────────────────────────

  console.log("Prerequisites:\n");

  // Check: Bun runtime
  checks.push(await checkWithSpinner(
    "Bun runtime installed",
    async () => {
      await $`bun --version`.quiet();
      return true;
    },
    "curl -fsSL https://bun.sh/install | bash"
  ));

  // Check: OpenAI API key (required for full functionality)
  checks.push(await checkWithSpinner(
    "OpenAI API key configured",
    async () => !!state.config.openaiApiKey,
    "Re-run wizard and add key, or edit ~/.claude/.env"
  ));

  // ─────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────

  console.log("\nConfiguration:\n");

  // Check: .env exists
  const envPath = join(state.config.paiDir!, ".env");
  checks.push(await checkWithSpinner(
    ".env configuration exists",
    async () => existsSync(envPath)
  ));

  // Check: Vault exists
  checks.push(await checkWithSpinner(
    "Obsidian vault accessible",
    async () => existsSync(state.config.vaultPath!)
  ));

  // Check: Context skill installed
  const skillPath = join(state.config.paiDir!, "skills/Context/SKILL.md");
  checks.push(await checkWithSpinner(
    "Context skill installed",
    async () => existsSync(skillPath),
    "Re-run wizard or manually copy from skill-pack.md"
  ));

  // Check: Workflows installed
  const workflows = ["semantic-search.md", "sweep.md"];
  for (const wf of workflows) {
    const wfPath = join(state.config.paiDir!, `skills/Context/workflows/${wf}`);
    checks.push(await checkWithSpinner(
      `Workflow: ${wf}`,
      async () => existsSync(wfPath),
      "Re-run wizard to reinstall workflows"
    ));
  }

  // Check: Context configuration (taxonomy, migrations, aliases)
  // Context configs always live at ~/.claude/ regardless of PAI_DIR
  const claudeDir = expandPath("~/.claude");
  const contextConfigs = [
    { path: "context/taxonomies/default.yaml", name: "Taxonomy config" },
    { path: "context/migrations/default-rules.yaml", name: "Migration rules" },
    { path: "context/config/aliases.yaml", name: "Tag aliases" },
  ];
  for (const cfg of contextConfigs) {
    const cfgPath = join(claudeDir, cfg.path);
    checks.push(await checkWithSpinner(
      cfg.name,
      async () => existsSync(cfgPath),
      "Re-run wizard to reinstall context config"
    ));
  }

  // Check: CORE skill routing includes Context skill (optional - CORE may not be installed)
  const corePath = join(state.config.paiDir!, "skills/CORE/SKILL.md");
  if (existsSync(corePath)) {
    checks.push(await checkWithSpinner(
      "CORE skill routes to Context",
      async () => {
        const coreContent = readFileSync(corePath, "utf-8");
        return coreContent.includes("skills/Context/SKILL.md");
      },
      "Add Context routing to CORE skill (see skill-pack.md Dependencies section)"
    ));
  } else {
    console.log("  \x1b[90m⊘\x1b[0m CORE skill not installed (NLP routing unavailable)");
  }

  // ─────────────────────────────────────────────────────────────────
  // CLIs
  // ─────────────────────────────────────────────────────────────────

  console.log("\nCLI Tools:\n");

  // Check: ingest CLI
  checks.push(await checkWithSpinner(
    "ingest CLI available",
    async () => {
      await $`which ingest`.quiet();
      return true;
    },
    "bun link (in tools/ingest/) or add to PATH"
  ));

  // Check: ctx CLI
  checks.push(await checkWithSpinner(
    "ctx CLI available",
    async () => {
      await $`which ctx`.quiet();
      return true;
    },
    "bun link (in tools/ctx/) or add to PATH"
  ));

  // ─────────────────────────────────────────────────────────────────
  // DAEMON
  // ─────────────────────────────────────────────────────────────────

  console.log("\nDaemon:\n");

  // Check: LaunchAgent (macOS only)
  if (process.platform === "darwin") {
    checks.push(await checkWithSpinner(
      "Background daemon running",
      async () => {
        await $`launchctl list | grep pai.ingest`.quiet();
        return true;
      },
      "launchctl load ~/Library/LaunchAgents/com.pai.ingest-watch.plist"
    ));
  }

  // ─────────────────────────────────────────────────────────────────
  // iOS SHORTCUTS (optional)
  // ─────────────────────────────────────────────────────────────────

  const bundleDir = dirname(import.meta.path);
  const shortcutsBuildDir = join(bundleDir, "shortcuts/build");

  if (existsSync(shortcutsBuildDir)) {
    console.log("\nApple Shortcuts:\n");

    const expectedShortcuts = ["clipboard-capture", "file-capture", "large-file-capture"];
    for (const name of expectedShortcuts) {
      const shortcutPath = join(shortcutsBuildDir, `${name}.shortcut`);
      const displayName = name.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      checks.push(await checkWithSpinner(
        displayName,
        async () => existsSync(shortcutPath),
        `Rebuild: cd shortcuts && ./setup.sh`
      ));
    }
  } else {
    console.log("\n  \x1b[90m⊘\x1b[0m Apple shortcuts not built (optional)");
  }

  // ─────────────────────────────────────────────────────────────────
  // TELEGRAM CONNECTIVITY
  // ─────────────────────────────────────────────────────────────────

  console.log("\nTelegram:\n");

  const wantsApiTests = await askYesNo("Run API validation tests? (requires internet)", true);
  if (wantsApiTests) {
    // Test Sender Bot
    let senderUsername = "";
    let inboxTitle = "";

    checks.push(await checkWithSpinner(
      "Sender bot connected",
      async () => {
        const senderToken = state.config.telegramSenderBotToken!;
        const response = await fetch(`https://api.telegram.org/bot${senderToken}/getMe`);
        const data = await response.json() as { ok: boolean; result?: { username: string } };
        if (data.ok) {
          senderUsername = data.result?.username || "";
          return true;
        }
        return false;
      },
      "Check your sender bot token"
    ));

    if (senderUsername) {
      // Update the check name with username
      checks[checks.length - 1].name = `Sender bot connected (@${senderUsername})`;

      // Test sender bot can send to inbox channel
      checks.push(await checkWithSpinner(
        "Sender → Inbox channel access",
        async () => {
          const senderToken = state.config.telegramSenderBotToken!;
          const inboxId = state.config.telegramInboxChannelId!;
          const chatResponse = await fetch(`https://api.telegram.org/bot${senderToken}/getChat?chat_id=${inboxId}`);
          const chatData = await chatResponse.json() as { ok: boolean; result?: { title: string } };
          if (chatData.ok) {
            inboxTitle = chatData.result?.title || "";
            return true;
          }
          return false;
        },
        "Add sender bot as admin to inbox channel"
      ));

      if (inboxTitle) {
        checks[checks.length - 1].name = `Sender → Inbox channel (${inboxTitle})`;
      }
    }

    // Test Reader Bot
    let readerUsername = "";

    checks.push(await checkWithSpinner(
      "Reader bot connected",
      async () => {
        const readerToken = state.config.telegramReaderBotToken!;
        const response = await fetch(`https://api.telegram.org/bot${readerToken}/getMe`);
        const data = await response.json() as { ok: boolean; result?: { username: string } };
        if (data.ok) {
          readerUsername = data.result?.username || "";
          return true;
        }
        return false;
      },
      "Check your reader bot token"
    ));

    if (readerUsername) {
      checks[checks.length - 1].name = `Reader bot connected (@${readerUsername})`;

      // Test reader bot can read from inbox channel
      checks.push(await checkWithSpinner(
        "Reader → Inbox channel (read access)",
        async () => {
          const readerToken = state.config.telegramReaderBotToken!;
          const inboxId = state.config.telegramInboxChannelId!;
          const chatResponse = await fetch(`https://api.telegram.org/bot${readerToken}/getChat?chat_id=${inboxId}`);
          const chatData = await chatResponse.json() as { ok: boolean; result?: { title: string } };
          return chatData.ok;
        },
        "Add reader bot as admin to inbox channel"
      ));
    }

    // ─────────────────────────────────────────────────────────────────
    // API KEYS
    // ─────────────────────────────────────────────────────────────────

    console.log("\nAPI Keys:\n");

    // Test OpenAI API key
    if (state.config.openaiApiKey) {
      checks.push(await checkWithSpinner(
        "OpenAI API key valid",
        async () => {
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: { "Authorization": `Bearer ${state.config.openaiApiKey}` }
          });
          return response.ok;
        },
        "Invalid API key - check your key at platform.openai.com"
      ));
    } else {
      checks.push({
        name: "OpenAI API key configured",
        pass: false,
        error: "Limited functionality without OpenAI - re-run wizard to add"
      });
      console.log("  ❌ OpenAI API key configured");
    }

    // Test Jina API key (if configured)
    if (state.config.jinaApiKey) {
      checks.push(await checkWithSpinner(
        "Jina API key valid",
        async () => {
          const response = await fetch("https://r.jina.ai/https://example.com", {
            headers: { "Authorization": `Bearer ${state.config.jinaApiKey}` }
          });
          // Jina returns various status codes, but 401 means unauthorized
          return response.status !== 401;
        },
        "Invalid API key - check at jina.ai"
      ));
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // EMBEDDINGS (optional)
  // ─────────────────────────────────────────────────────────────────

  // Check if embeddings database exists
  const vaultPath = state.config.vaultPath!;
  const embeddingsDb = join(vaultPath, ".embeddings", "notes.db");
  const hasEmbeddings = existsSync(embeddingsDb);

  if (hasEmbeddings) {
    console.log("\nVector Embeddings:\n");
    checks.push({
      name: "Embeddings database exists",
      pass: true,
    });
    console.log("  ✅ Embeddings database exists");
  } else {
    console.log(`
\x1b[1m\x1b[36m┌──────────────────────────────────────────────────────────────┐
│  🧠 VECTOR EMBEDDINGS (Optional - semantic search)           │
└──────────────────────────────────────────────────────────────┘\x1b[0m

Build a vector database for natural language search of your vault:
  • "Find notes about machine learning" → semantic matches
  • "What did I write about productivity?" → concept search
  • Runs in background, doesn't block installation
`);
    const wantsBuildEmbeddings = await askYesNo("Build embeddings now?", true);
    if (wantsBuildEmbeddings) {
      // Start embeddings build in background - don't block wizard
      const logFile = "/tmp/ctx-embed.log";
      Bun.spawn(["ctx", "embed", "--verbose"], {
        stdout: Bun.file(logFile),
        stderr: Bun.file(logFile),
      });
      console.log(`\n  \x1b[36m⟳\x1b[0m Embeddings build started in background`);
      console.log(`    Logs: ${logFile}`);
      console.log(`    Check progress: ctx embed --stats`);
      checks.push({
        name: "Embeddings build started",
        pass: true,
      });
    } else {
      console.log("\n  \x1b[90mSkipped - run 'ctx embed' later for semantic search\x1b[0m");
    }
  }

  // Check for any failures and show fixes needed
  const failedChecks = checks.filter(c => !c.pass && c.error);
  const allPassed = checks.every(c => c.pass);

  if (failedChecks.length > 0) {
    console.log("\n\x1b[33m── Fixes Needed ──────────────────────────────────────────────\x1b[0m\n");
    for (const check of failedChecks) {
      console.log(`  ❌ ${check.name}`);
      console.log(`     → ${check.error}`);
    }
  }

  if (allPassed) {
    console.log(`
\x1b[32m╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🎉 I N S T A L L A T I O N   C O M P L E T E ! 🎉        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝\x1b[0m

\x1b[1m\x1b[36mYour second brain is ready.\x1b[0m
`);

    // Show required post-installation steps if any
    if (state.postInstallSteps.length > 0) {
      console.log(`\x1b[31m\x1b[1m⚠️  REQUIRED: Complete these steps before using:\x1b[0m\n`);
      state.postInstallSteps.forEach((step, i) => {
        console.log(`\x1b[31m   ${i + 1}. ${step}\x1b[0m`);
      });
      console.log("");
    }

    console.log(`\x1b[33m┌──────────────────────────────────────────────────────────────┐
│  GET STARTED                                                 │
├──────────────────────────────────────────────────────────────┤
│  1. Send a voice memo, photo, or text to Telegram channel    │
│  2. Wait for the daemon to process it                        │
│  3. Find your note in Obsidian with auto-generated tags      │
└──────────────────────────────────────────────────────────────┘\x1b[0m

\x1b[90m┌──────────────────────────────────────────────────────────────┐
│  USEFUL COMMANDS                                             │
├──────────────────────────────────────────────────────────────┤
│  ctx --help          Show all available commands             │
│  ctx search <query>  Semantic search your knowledge          │
│  ctx sweep           Review and cultivate inbox notes        │
│  ingest config       View current configuration              │
│  ingest poll         Manually check for messages             │
│  ingest process      Process all pending messages            │
└──────────────────────────────────────────────────────────────┘\x1b[0m

Logs: \x1b[36m/tmp/ingest-watch.log\x1b[0m
`);
  } else {
    console.log(`
\x1b[33m╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║       S O M E   C H E C K S   F A I L E D                    ║
║                                                              ║
║       Please fix the issues above and re-run the wizard      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝\x1b[0m
`);

    // Still show required post-installation steps even on failure
    if (state.postInstallSteps.length > 0) {
      console.log(`\x1b[31m\x1b[1m⚠️  REQUIRED: Complete these steps before using:\x1b[0m\n`);
      state.postInstallSteps.forEach((step, i) => {
        console.log(`\x1b[31m   ${i + 1}. ${step}\x1b[0m`);
      });
      console.log("");
    }
  }

  state.stepCompleted[6] = true;
}

// =============================================================================
// SKILL PACK INSTALLATION
// =============================================================================

interface ExtractedFile {
  path: string;
  content: string;
}

function parseSkillPack(packContent: string): ExtractedFile[] {
  const files: ExtractedFile[] = [];

  // Find all "Copy to:" markers with their opening code fence
  // Supports markdown, json, yaml, or no language identifier
  const copyToRegex = /Copy to:\s*`([^`]+)`\s*\n\n```(?:markdown|json|yaml)?\n/g;
  const allMatches: { path: string; startIdx: number }[] = [];

  let match;
  while ((match = copyToRegex.exec(packContent)) !== null) {
    allMatches.push({
      path: match[1],
      startIdx: match.index + match[0].length,
    });
  }

  // Process each match, using the next match's position to find bounds
  for (let i = 0; i < allMatches.length; i++) {
    const current = allMatches[i];
    const nextStart = allMatches[i + 1]?.startIdx || packContent.length;

    // Find the last ``` before the next section
    // Look backwards from nextStart to find the closing ```
    const searchRange = packContent.substring(current.startIdx, nextStart);

    // Find all ``` in the range and take the last one that's followed by \n\n---
    // Pattern: \n```\n\n---\n\n (section boundary)
    const closingMatches = [...searchRange.matchAll(/\n```\n\n---\n\n/g)];

    let endIdx: number;
    if (closingMatches.length > 0) {
      // Use the last match
      const lastMatch = closingMatches[closingMatches.length - 1];
      endIdx = current.startIdx + lastMatch.index!;
    } else {
      // Fallback: look for bare \n```\n at end of content
      const bareClose = searchRange.lastIndexOf("\n```\n");
      endIdx = bareClose >= 0 ? current.startIdx + bareClose : nextStart;
    }

    const content = packContent.substring(current.startIdx, endIdx);
    files.push({
      path: current.path.replace("~/.claude", ""), // Make relative to PAI_DIR
      content: content.trim(),
    });
  }

  return files;
}

async function installSkillPack(paiDir: string): Promise<{ installed: number; errors: string[]; pathAdded: boolean; coreSkillMissing: boolean }> {
  const errors: string[] = [];
  let installed = 0;
  let coreSkillMissing = false;

  // Read skill-pack.md from the bundle directory
  const bundleDir = dirname(import.meta.path);
  const skillPackPath = join(bundleDir, "skill-pack.md");

  if (!existsSync(skillPackPath)) {
    errors.push(`skill-pack.md not found at ${skillPackPath}`);
    return { installed, errors, pathAdded: false, coreSkillMissing };
  }

  const packContent = readFileSync(skillPackPath, "utf-8");
  const files = parseSkillPack(packContent);

  if (files.length === 0) {
    errors.push("No extractable files found in skill-pack.md");
    return { installed, errors, pathAdded: false, coreSkillMissing };
  }

  console.log("  Installing skill files...\n");
  for (const file of files) {
    // Context configs always go to ~/.claude/, skills go to paiDir
    // This supports multi-install setups where PAI_DIR != ~/.claude
    const isContextConfig = file.path.startsWith("/context/");
    const baseDir = isContextConfig ? expandPath("~/.claude") : paiDir;

    const result = await checkWithSpinner(
      file.path,
      async () => {
        const targetPath = join(baseDir, file.path);
        const targetDir = dirname(targetPath);

        // Create directory if needed
        if (!existsSync(targetDir)) {
          mkdirSync(targetDir, { recursive: true });
        }

        writeFileSync(targetPath, file.content);
        return true;
      },
      `Failed to write ${file.path}`
    );

    if (result.pass) {
      installed++;
    } else {
      errors.push(result.error || `Failed to write ${file.path}`);
    }
  }

  // Append CORE routing if not already present
  console.log("\n  Configuring CORE skill routing...\n");
  const corePath = join(paiDir, "skills/CORE/SKILL.md");

  if (!existsSync(corePath)) {
    // CORE skill not installed - show informative message (not a failure)
    console.log("  \x1b[90m⊘\x1b[0m CORE skill not found (NLP routing unavailable - ctx CLI still works)");
    coreSkillMissing = true;
  } else {
    const coreRoutingResult = await checkWithSpinner(
      "CORE/SKILL.md → Context routing",
      async () => {
        const coreContent = readFileSync(corePath, "utf-8");

        // Check if Context routing already exists
        if (coreContent.includes("skills/Context/SKILL.md")) {
          return true; // Already configured
        }

        // Extract the CORE routing from skill-pack.md
        const appendToRegex = /Append to:\s*`~\/\.claude\/skills\/CORE\/SKILL\.md`[^`]*\n\n```markdown\n([\s\S]*?)```\n\n---/;
        const appendMatch = packContent.match(appendToRegex);

        if (!appendMatch) {
          throw new Error("CORE routing not found in skill-pack.md");
        }

        const routingContent = appendMatch[1].trim();

        // Append to CORE skill
        const newContent = coreContent.trimEnd() + "\n\n" + routingContent + "\n";
        writeFileSync(corePath, newContent);
        return true;
      },
      "Check CORE skill or manually add routing from skill-pack.md"
    );

    if (coreRoutingResult.pass) {
      installed++;
    } else if (coreRoutingResult.error) {
      errors.push(coreRoutingResult.error);
    }
  }

  // Install CLI tools
  // - ctx: use bun link (interactive use, symlink is fine)
  // - ingest: compile to binary (daemon needs stability, avoids Bun EDEADLK bug)
  console.log("\n  Installing CLI tools...\n");

  const localBin = join(homedir(), ".local/bin");
  if (!existsSync(localBin)) {
    mkdirSync(localBin, { recursive: true });
  }

  // Install ctx via bun link (interactive CLI)
  const ctxDir = join(bundleDir, "tools/ctx");
  console.log(`  \x1b[90m$ cd ${ctxDir}\x1b[0m`);
  console.log(`  \x1b[90m$ bun install && bun link\x1b[0m`);

  const ctxResult = await checkWithSpinner(
    `ctx → ~/.local/bin/ctx`,
    async () => {
      await $`cd ${ctxDir} && bun install`.quiet();
      await $`cd ${ctxDir} && bun link`.quiet();
      // Create symlink at ~/.local/bin/ctx pointing to ~/.bun/bin/ctx
      // This ensures ctx works regardless of PATH order
      const bunBinCtx = join(homedir(), ".bun/bin/ctx");
      const localBinCtx = join(localBin, "ctx");
      if (existsSync(bunBinCtx)) {
        try {
          if (existsSync(localBinCtx)) unlinkSync(localBinCtx);
          symlinkSync(bunBinCtx, localBinCtx);
        } catch {
          // Symlink failed - not critical if ~/.bun/bin is in PATH
        }
      }
      return true;
    },
    `bun link failed for ctx`
  );
  if (ctxResult.pass) installed++;
  else errors.push(ctxResult.error || "Failed to install ctx");
  console.log("");

  // Install ingest - try compiled binary first, fall back to bun link
  const ingestDir = join(bundleDir, "tools/ingest");
  const ingestBin = join(localBin, "ingest");
  let ingestCompiled = false;

  // First, always run bun install
  await $`cd ${ingestDir} && bun install`.quiet();

  // Try to compile (more stable for daemon)
  console.log(`  \x1b[90m$ cd ${ingestDir}\x1b[0m`);
  console.log(`  \x1b[90m$ bun build --compile\x1b[0m`);

  try {
    await $`cd ${ingestDir} && bun build ingest.ts --compile --outfile ${ingestBin}`.quiet();
    ingestCompiled = true;
    console.log(`  \x1b[32m✓\x1b[0m ingest → ~/.local/bin/ingest (compiled)`);
    installed++;
  } catch {
    // Compile failed - fall back to bun link + symlink for plist compatibility
    console.log(`  \x1b[33m⚠\x1b[0m Compile failed, using bun link instead`);
    console.log(`  \x1b[90m$ bun link\x1b[0m`);

    const linkResult = await checkWithSpinner(
      `ingest → ~/.bun/bin/ingest`,
      async () => {
        await $`cd ${ingestDir} && bun link`.quiet();
        // Create symlink at ~/.local/bin/ingest pointing to ~/.bun/bin/ingest
        // This ensures the plist path works regardless of compile success
        const bunBinIngest = join(homedir(), ".bun/bin/ingest");
        if (existsSync(bunBinIngest)) {
          try {
            if (existsSync(ingestBin)) unlinkSync(ingestBin);
            symlinkSync(bunBinIngest, ingestBin);
          } catch {
            // Symlink failed - not critical, daemon will still work with bun link
          }
        }
        return true;
      },
      `bun link failed for ingest`
    );
    if (linkResult.pass) installed++;
    else errors.push(linkResult.error || "Failed to install ingest");
  }
  console.log("");

  // Check if ~/.bun/bin and ~/.local/bin are in PATH and auto-add if needed
  const currentPath = process.env.PATH || "";
  let pathAdded = false;
  const zshrcPath = join(homedir(), ".zshrc");
  let zshrcContent = "";
  if (existsSync(zshrcPath)) {
    zshrcContent = readFileSync(zshrcPath, "utf-8");
  }

  const pathsToAdd: string[] = [];
  if (!currentPath.includes(".local/bin") && !zshrcContent.includes(".local/bin")) {
    pathsToAdd.push("$HOME/.local/bin");
  }
  if (!currentPath.includes(".bun/bin") && !zshrcContent.includes(".bun/bin")) {
    pathsToAdd.push("$HOME/.bun/bin");
  }

  if (pathsToAdd.length > 0) {
    const exportLine = `export PATH="${pathsToAdd.join(":")}:$PATH"`;
    const addition = `\n# Added by PAI Knowledge Bundle\n${exportLine}\n`;
    writeFileSync(zshrcPath, zshrcContent + addition);
    console.log(`    ✓ Added ${pathsToAdd.join(", ")} to PATH in ~/.zshrc`);
    pathAdded = true;
  }

  return { installed, errors, pathAdded, coreSkillMissing };
}

// =============================================================================
// GENERATORS
// =============================================================================

function generateEnvContent(config: CaptureConfig): string {
  const lines: string[] = [
    "# PAI Knowledge Capture Configuration",
    "# Generated by install.ts",
    "",
    "# Telegram Bots",
    "# BOT_TOKEN: Used by daemon to poll and process messages (legacy name)",
    `TELEGRAM_BOT_TOKEN=${config.telegramReaderBotToken}`,
    "# SENDER: Used by iOS Shortcuts + CLI to send captures",
    `TELEGRAM_SENDER_BOT_TOKEN=${config.telegramSenderBotToken}`,
    "",
    "# Telegram Channels",
    "# CHANNEL_ID: Where raw captures land (inbox)",
    `TELEGRAM_CHANNEL_ID=${config.telegramInboxChannelId}`,
    "# OUTBOX_ID: Where processed notifications go (events)",
    `TELEGRAM_OUTBOX_ID=${config.telegramEventChannelId}`,
    "",
    "# Obsidian Vault",
    `OBSIDIAN_VAULT_PATH=${config.vaultPath}`,
    "",
    "# Processing Profile",
    `INGEST_PROFILE=${config.processingProfile}`,
  ];

  if (config.openaiApiKey) {
    lines.push("", "# OpenAI (embeddings, naming, tags, vision)");
    lines.push(`OPENAI_API_KEY=${config.openaiApiKey}`);
  }

  if (config.jinaApiKey) {
    lines.push("", "# Jina (for web extraction)");
    lines.push(`JINA_API_KEY=${config.jinaApiKey}`);
  }

  if (config.icloudDropFolder) {
    lines.push("", "# iCloud Drop Folder (for files > 20MB)");
    lines.push(`ICLOUD_DROP_FOLDER=${config.icloudDropFolder}`);
  }

  if (config.whisperBin || config.whisperModelDir) {
    lines.push("", "# Whisper.cpp (voice transcription)");
    if (config.whisperBin) {
      lines.push(`WHISPER_BIN=${config.whisperBin}`);
    }
    if (config.whisperModelDir) {
      lines.push(`WHISPER_MODEL_DIR=${config.whisperModelDir}`);
    }
  }

  if (config.fabricEnabled) {
    lines.push("", "# Fabric (AI content processing)");
    lines.push("FABRIC_ENABLED=true");
  }

  lines.push("");
  return lines.join("\n");
}

function mergeEnvContent(existing: string, newContent: string): string {
  const existingLines = existing.split("\n");
  const newLines = newContent.split("\n");

  const existingKeys = new Set<string>();
  existingLines.forEach(line => {
    const match = line.match(/^([A-Z_]+)=/);
    if (match) existingKeys.add(match[1]);
  });

  const result: string[] = [];

  // Add existing content
  if (existing.trim()) {
    result.push(existing.trim());
    result.push("");
  }

  // Add new keys that don't exist
  for (const line of newLines) {
    const match = line.match(/^([A-Z_]+)=/);
    if (match && !existingKeys.has(match[1])) {
      result.push(line);
    } else if (!match && line.startsWith("#")) {
      // Include comments for new sections
      result.push(line);
    }
  }

  return result.join("\n");
}

function generateLaunchAgentPlist(paiDir: string): string {
  const user = process.env.USER;
  const home = process.env.HOME || `/Users/${user}`;

  // Use compiled binary at ~/.local/bin/ingest for stability (avoids Bun EDEADLK bug)
  // The ingest binary follows ~/.claude symlink (managed by pai-switch)
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pai.ingest-watch</string>

    <key>ProgramArguments</key>
    <array>
        <string>${home}/.local/bin/ingest</string>
        <string>watch</string>
    </array>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>StandardOutPath</key>
    <string>/tmp/ingest-watch.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/ingest-watch-error.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${home}</string>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${home}/.bun/bin:${home}/.local/bin:${home}/bin</string>
    </dict>
</dict>
</plist>`;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  // Clear screen and show banner
  console.log("\x1b[2J\x1b[H"); // Clear screen

  console.log(`
\x1b[36m
                        ╭──────────────────────────────╮
                        │                              │
                        │    ◉─────◉      ◉─────◉      │
                        │     ╲   ╱ ╲    ╱ ╲   ╱       │
                        │      ╲ ╱   ╲  ╱   ╲ ╱        │
                        │       ◉─────◉─────◉          │
                        │      ╱ ╲   ╱  ╲   ╱ ╲        │
                        │     ╱   ╲ ╱    ╲ ╱   ╲       │
                        │    ◉─────◉      ◉─────◉      │
                        │                              │
                        ╰──────────────────────────────╯

    ██╗  ██╗███╗   ██╗ ██████╗ ██╗    ██╗██╗     ███████╗██████╗  ██████╗ ███████╗
    ██║ ██╔╝████╗  ██║██╔═══██╗██║    ██║██║     ██╔════╝██╔══██╗██╔════╝ ██╔════╝
    █████╔╝ ██╔██╗ ██║██║   ██║██║ █╗ ██║██║     █████╗  ██║  ██║██║  ███╗█████╗
    ██╔═██╗ ██║╚██╗██║██║   ██║██║███╗██║██║     ██╔══╝  ██║  ██║██║   ██║██╔══╝
    ██║  ██╗██║ ╚████║╚██████╔╝╚███╔███╔╝███████╗███████╗██████╔╝╚██████╔╝███████╗
    ╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚══╝╚══╝ ╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚══════╝

                    [ PAI Knowledge Bundle · Installation Wizard ]
\x1b[0m

\x1b[90m┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  📲 Capture from any device -> ⚙️ Process automatically -> 🗄️ Store in Obsidian │
│                                                                               │
│  Voice memos - Photos - URLs - Documents - Clipboard                          │
│  All flow through Telegram into your second brain                             │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘\x1b[0m
`);

  const state: WizardState = {
    config: {},
    stepCompleted: [false, false, false, false, false, false, false],
    postInstallSteps: [],
  };

  const steps = [
    step1TelegramBots,
    step2TelegramChannels,
    step3ObsidianVault,
    step4ProfileSelection,
    step5EnvSetup,
    step6DaemonInstall,
    step7Verification,
  ];

  try {
    for (let i = 0; i < steps.length; i++) {
      await steps[i](state);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(`\n❌ Installation aborted: ${error.message}`);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
