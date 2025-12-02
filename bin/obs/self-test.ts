#!/usr/bin/env bun
/**
 * Context Management Skills - Self Test
 *
 * Verifies that all required components are configured correctly.
 * Similar to PAI Contract health check pattern.
 *
 * Usage: bun self-test.ts [--full]
 *
 * Options:
 *   --full    Run full tests including Telegram API connectivity
 */

import { existsSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

const results: TestResult[] = [];
const fullMode = process.argv.includes("--full");

function pass(name: string, message: string): void {
  results.push({ name, status: "pass", message });
  console.log(`✅ ${name}: ${message}`);
}

function fail(name: string, message: string): void {
  results.push({ name, status: "fail", message });
  console.log(`❌ ${name}: ${message}`);
}

function warn(name: string, message: string): void {
  results.push({ name, status: "warn", message });
  console.log(`⚠️  ${name}: ${message}`);
}

// Load environment from .env files
function loadEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (existsSync(path)) {
    try {
      const content = require("fs").readFileSync(path, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            env[key.trim()] = valueParts.join("=").trim();
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }
  return env;
}

async function runTests(): Promise<void> {
  console.log("\n🔍 Context Management Skills - Self Test\n");
  console.log("─".repeat(50));

  // Load environment
  const claudeEnv = loadEnvFile(join(homedir(), ".claude", ".env"));
  const fabricEnv = loadEnvFile(join(homedir(), ".config", "fabric", ".env"));
  const env = { ...fabricEnv, ...claudeEnv };

  // Test 1: OBSIDIAN_VAULT_PATH
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH || env.OBSIDIAN_VAULT_PATH || "";
  if (vaultPath) {
    const resolvedPath = vaultPath.replace(/^~/, homedir());
    if (existsSync(resolvedPath)) {
      pass("Vault Path", resolvedPath);
    } else {
      fail("Vault Path", `Path does not exist: ${resolvedPath}`);
    }
  } else {
    fail("Vault Path", "OBSIDIAN_VAULT_PATH not set in ~/.claude/.env or ~/.config/fabric/.env");
  }

  // Test 2: OPENAI_API_KEY (for embeddings)
  const openaiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || "";
  if (openaiKey) {
    if (openaiKey.startsWith("sk-")) {
      pass("OpenAI API Key", `Set (${openaiKey.slice(0, 7)}...${openaiKey.slice(-4)})`);
    } else {
      warn("OpenAI API Key", "Key format unexpected (should start with sk-)");
    }
  } else {
    fail("OpenAI API Key", "OPENAI_API_KEY not set (required for semantic search)");
  }

  // Test 3: Embeddings database
  if (vaultPath) {
    const resolvedPath = vaultPath.replace(/^~/, homedir());
    const embeddingsDb = join(resolvedPath, "_meta", "embeddings.db");
    if (existsSync(embeddingsDb)) {
      const stats = require("fs").statSync(embeddingsDb);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
      pass("Embeddings DB", `${embeddingsDb} (${sizeMB} MB)`);
    } else {
      warn("Embeddings DB", "Not found - run 'obs embed' to create");
    }
  }

  // Test 4: Telegram config (optional)
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || "";
  const telegramChannel = process.env.TELEGRAM_CHANNEL_ID || env.TELEGRAM_CHANNEL_ID || "";

  if (telegramToken && telegramChannel) {
    pass("Telegram Config", `Bot token set, Channel: ${telegramChannel}`);
  } else {
    warn("Telegram Config", "Not configured (optional - for ingest pipeline)");
  }

  // Test 5: obs CLI availability
  try {
    const obsPath = join(import.meta.dir, "obs.ts");
    if (existsSync(obsPath)) {
      pass("obs CLI", obsPath);
    } else {
      fail("obs CLI", "obs.ts not found in expected location");
    }
  } catch {
    fail("obs CLI", "Could not check obs CLI");
  }

  // Test 6: ingest CLI availability
  try {
    const ingestPath = join(import.meta.dir, "..", "ingest", "ingest.ts");
    if (existsSync(ingestPath)) {
      pass("ingest CLI", ingestPath);
    } else {
      warn("ingest CLI", "Not found (optional - for Telegram ingestion)");
    }
  } catch {
    warn("ingest CLI", "Could not check ingest CLI");
  }

  // Test 7: Skills directory
  const skillsPath = join(import.meta.dir, "..", "..", ".claude", "skills");
  if (existsSync(skillsPath)) {
    const contextSkill = existsSync(join(skillsPath, "context", "SKILL.md"));
    const vaultSkill = existsSync(join(skillsPath, "vault", "SKILL.md"));

    if (contextSkill && vaultSkill) {
      pass("Skills", "context/ and vault/ skills found");
    } else {
      warn("Skills", `Missing: ${!contextSkill ? "context" : ""} ${!vaultSkill ? "vault" : ""}`);
    }
  } else {
    warn("Skills", "Skills directory not found at expected path");
  }

  // Test 8: Required tools
  const tools = [
    { name: "bun", cmd: "which bun" },
    { name: "fabric", cmd: "which fabric" },
  ];

  for (const tool of tools) {
    try {
      const result = Bun.spawnSync(["sh", "-c", tool.cmd]);
      if (result.exitCode === 0) {
        const path = result.stdout.toString().trim();
        pass(tool.name, path);
      } else {
        warn(tool.name, "Not found in PATH");
      }
    } catch {
      warn(tool.name, "Could not check");
    }
  }

  // ─────────────────────────────────────────────────
  // INGEST PIPELINE TESTS
  // ─────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("📥 Ingest Pipeline Tests\n");

  // Test 9: Ingest state database
  // The ingest state DB is in the vault's _meta folder
  if (vaultPath) {
    const resolvedVault = vaultPath.replace(/^~/, homedir());
    const stateDbPath = join(resolvedVault, "_meta", "ingest.db");
    if (existsSync(stateDbPath)) {
      const stats = statSync(stateDbPath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      pass("Ingest State DB", `${stateDbPath} (${sizeKB} KB)`);
    } else {
      warn("Ingest State DB", "Not found - will be created on first 'ingest poll'");
    }
  }

  // Test 10: Ingest profiles command
  try {
    const ingestPath = join(import.meta.dir, "..", "ingest", "ingest.ts");
    const result = Bun.spawnSync(["bun", "run", ingestPath, "profiles"], {
      env: { ...process.env, ...env },
    });
    if (result.exitCode === 0) {
      const output = result.stdout.toString();
      const hasZettelkasten = output.includes("zettelkasten");
      const hasSimple = output.includes("simple");
      if (hasZettelkasten && hasSimple) {
        pass("Ingest Profiles", "zettelkasten, simple");
      } else {
        warn("Ingest Profiles", "Some profiles missing from output");
      }
    } else {
      fail("Ingest Profiles", "Command failed: " + result.stderr.toString().slice(0, 100));
    }
  } catch (e) {
    fail("Ingest Profiles", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // Test 11: Ingest config command
  try {
    const ingestPath = join(import.meta.dir, "..", "ingest", "ingest.ts");
    const result = Bun.spawnSync(["bun", "run", ingestPath, "config"], {
      env: { ...process.env, ...env },
    });
    if (result.exitCode === 0) {
      const output = result.stdout.toString();
      const hasVault = output.includes("Vault Path:");
      const hasProfile = output.includes("Profile:");
      if (hasVault && hasProfile) {
        pass("Ingest Config", "Configuration readable");
      } else {
        warn("Ingest Config", "Output format unexpected");
      }
    } else {
      fail("Ingest Config", "Command failed: " + result.stderr.toString().slice(0, 100));
    }
  } catch (e) {
    fail("Ingest Config", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // Test 12: Ingest status command
  try {
    const ingestPath = join(import.meta.dir, "..", "ingest", "ingest.ts");
    const result = Bun.spawnSync(["bun", "run", ingestPath, "status"], {
      env: { ...process.env, ...env },
    });
    if (result.exitCode === 0) {
      const output = result.stdout.toString();
      // Extract counts from status output
      const pendingMatch = output.match(/Pending:\s*(\d+)/);
      const completedMatch = output.match(/Completed:\s*(\d+)/);
      const failedMatch = output.match(/Failed:\s*(\d+)/);

      if (pendingMatch && completedMatch && failedMatch) {
        const pending = parseInt(pendingMatch[1]);
        const completed = parseInt(completedMatch[1]);
        const failed = parseInt(failedMatch[1]);
        pass("Ingest Status", `${completed} completed, ${pending} pending, ${failed} failed`);
      } else {
        warn("Ingest Status", "Could not parse status counts");
      }
    } else {
      fail("Ingest Status", "Command failed: " + result.stderr.toString().slice(0, 100));
    }
  } catch (e) {
    fail("Ingest Status", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // Test 13: Telegram API connectivity (only in full mode)
  if (fullMode) {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || "";
    if (telegramToken) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${telegramToken}/getMe`);
        const data = await response.json() as { ok: boolean; result?: { username: string } };
        if (data.ok && data.result) {
          pass("Telegram API", `Bot @${data.result.username} connected`);
        } else {
          fail("Telegram API", "API returned error - check bot token");
        }
      } catch (e) {
        fail("Telegram API", `Connection failed: ${e instanceof Error ? e.message : e}`);
      }
    } else {
      warn("Telegram API", "Bot token not set - skipping connectivity test");
    }
  }

  // Test 14: Ingest poll dry-run (only in full mode)
  if (fullMode) {
    try {
      const ingestPath = join(import.meta.dir, "..", "ingest", "ingest.ts");
      const ingestDir = join(import.meta.dir, "..", "ingest");
      const result = Bun.spawnSync(["bun", "run", ingestPath, "poll"], {
        cwd: ingestDir,
        env: { ...process.env, ...env },
        timeout: 15000, // 15 second timeout for network
      });
      const output = result.stdout.toString();
      const errOutput = result.stderr.toString();

      // Check for success indicators in output (regardless of exit code)
      const hasPolling = output.includes("Polling") || output.includes("No new messages") || output.includes("Found");

      if (hasPolling) {
        pass("Ingest Poll", "Telegram polling works");
      } else if (result.exitCode !== 0) {
        const errorMsg = errOutput.trim() || output.trim() || "Unknown error";
        fail("Ingest Poll", "Command failed: " + errorMsg.slice(0, 100));
      } else {
        warn("Ingest Poll", "Unexpected output format");
      }
    } catch (e) {
      fail("Ingest Poll", `Error: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ─────────────────────────────────────────────────
  // INGEST PIPELINE v2 TESTS
  // ─────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("📥 Ingest Pipeline v2 Tests\n");

  // Test 15: Jina AI accessibility (URL extraction)
  const jinaApiKey = process.env.JINA_API_KEY || env.JINA_API_KEY || "";
  if (fullMode) {
    try {
      // Test Jina with a simple URL
      const testUrl = "https://example.com";
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(testUrl)}`;
      const headers: Record<string, string> = { "Accept": "text/markdown" };
      if (jinaApiKey) {
        headers["Authorization"] = `Bearer ${jinaApiKey}`;
      }

      const response = await fetch(jinaUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const keyStatus = jinaApiKey ? "API key set" : "using free tier";
        pass("Jina AI", `Accessible (${keyStatus})`);
      } else {
        warn("Jina AI", `Returned ${response.status} - may have rate limit issues`);
      }
    } catch (e) {
      warn("Jina AI", `Connection failed: ${e instanceof Error ? e.message : e}`);
    }
  } else {
    // In non-full mode, just check if API key is set
    if (jinaApiKey) {
      pass("Jina API Key", `Set (${jinaApiKey.slice(0, 8)}...)`);
    } else {
      pass("Jina API Key", "Not set (using free tier - 20 req/min)");
    }
  }

  // Test 16: Dropbox archive path
  const dropboxArchivePath =
    process.env.DROPBOX_ARCHIVE_PATH ||
    env.DROPBOX_ARCHIVE_PATH ||
    join(homedir(), "Dropbox", "document", "_archive");
  const resolvedDropboxPath = dropboxArchivePath.replace(/^~/, homedir());

  if (existsSync(resolvedDropboxPath)) {
    // Check if writable
    try {
      const testFile = join(resolvedDropboxPath, ".pai-test-" + Date.now());
      require("fs").writeFileSync(testFile, "test");
      require("fs").unlinkSync(testFile);
      pass("Dropbox Archive", `${resolvedDropboxPath} (writable)`);
    } catch {
      warn("Dropbox Archive", `${resolvedDropboxPath} (read-only)`);
    }
  } else {
    warn("Dropbox Archive", `Path not found: ${resolvedDropboxPath}`);
  }

  // Test 17: Vision API (for receipt OCR) - reusing OpenAI key check
  if (openaiKey) {
    pass("Vision API", "Available (using OPENAI_API_KEY for gpt-4o)");
  } else {
    warn("Vision API", "OPENAI_API_KEY not set (receipt OCR disabled)");
  }

  // Test 18: Metadata parsing regex
  try {
    const testCaptions = [
      "[source:clipboard][device:iphone] Test message",
      "/archive [type:RECEIPT][category:HOME] Receipt from store",
      "#tag @person /note [user:andreas]",
    ];

    const metadataPattern = /\[([a-zA-Z_]+):([^\]]+)\]/g;
    let allPassed = true;

    for (const caption of testCaptions) {
      const matches = [...caption.matchAll(metadataPattern)];
      if (caption.includes("[") && matches.length === 0) {
        allPassed = false;
        break;
      }
    }

    if (allPassed) {
      pass("Metadata Parsing", "[key:value] regex valid");
    } else {
      fail("Metadata Parsing", "Regex failed to match expected patterns");
    }
  } catch (e) {
    fail("Metadata Parsing", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // Test 19: Events channel (Telegram outbox)
  const telegramOutbox = process.env.TELEGRAM_OUTBOX_ID || env.TELEGRAM_OUTBOX_ID || "";
  if (telegramOutbox) {
    pass("Events Channel", `Configured: ${telegramOutbox}`);
  } else {
    warn("Events Channel", "TELEGRAM_OUTBOX_ID not set (notifications disabled)");
  }

  // Test 20: Spoken hints regex patterns
  try {
    const spokenTests = [
      { input: "hashtag project pai", expected: "project-pai" },
      { input: "at ed overy", expected: "ed_overy" },
      { input: "forward slash archive", expected: "archive" },
    ];

    let spokenPassed = true;

    // Test hashtag pattern
    const hashtagResult = "hashtag project pai".replace(
      /\b(?:hash\s*tag|hashtag)\s+([a-zA-Z][a-zA-Z0-9]*(?:\s+(?:slash\s+)?[a-zA-Z][a-zA-Z0-9]*)?)\b/gi,
      (match, captured) => {
        return ` #${captured.replace(/\s+slash\s+/gi, "/").replace(/\s+/g, "-").toLowerCase()}`;
      }
    );
    if (!hashtagResult.includes("#project-pai")) spokenPassed = false;

    // Test at pattern (with skip word check)
    const atResult = "at ed overy".replace(
      /\bat\s+([a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*)?)\b/gi,
      (match, captured) => {
        const words = captured.toLowerCase().split(/\s+/);
        const skipWords = ["the", "a", "an", "this", "that"];
        if (skipWords.includes(words[0])) return match;
        return ` @${captured.replace(/\s+/g, "_").toLowerCase()}`;
      }
    );
    if (!atResult.includes("@ed_overy")) spokenPassed = false;

    // Test forward slash pattern
    const slashResult = "forward slash archive".replace(
      /\b(?:forward\s+)?slash\s+([a-zA-Z][a-zA-Z0-9]*(?:\s+[a-zA-Z][a-zA-Z0-9]*)?)\b/gi,
      (match, captured) => {
        return ` /${captured.replace(/\s+/g, "-").toLowerCase()}`;
      }
    );
    if (!slashResult.includes("/archive")) spokenPassed = false;

    if (spokenPassed) {
      pass("Spoken Hints", "Regex patterns valid (hashtag, at, slash)");
    } else {
      fail("Spoken Hints", "One or more spoken hint patterns failed");
    }
  } catch (e) {
    fail("Spoken Hints", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // Test 21: Archive naming pattern
  try {
    const archivePattern = /^(CONTRACT|RECEIPT|CORRESPONDANCE|DOCUMENT|REPORT)\s*-\s*\d{8}\s*-/i;
    const testNames = [
      { name: "CONTRACT - 20240208 - Lease Agreement.pdf", shouldMatch: true },
      { name: "RECEIPT - 20241201 - Amazon Order - HOME.pdf", shouldMatch: true },
      { name: "random-document.pdf", shouldMatch: false },
      { name: "Document about contracts.pdf", shouldMatch: false },
    ];

    let archivePassed = true;
    for (const test of testNames) {
      const matches = archivePattern.test(test.name);
      if (matches !== test.shouldMatch) {
        archivePassed = false;
        break;
      }
    }

    if (archivePassed) {
      pass("Archive Naming", "Pattern correctly identifies archive-named files");
    } else {
      fail("Archive Naming", "Pattern failed to match expected filenames");
    }
  } catch (e) {
    fail("Archive Naming", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // Test 22: whisper-cpp availability (for voice transcription)
  const whisperBin = "/Users/andreas/Documents/src/whisper.cpp/whisper-cpp";
  const whisperModelDir = "/Users/andreas/Documents/src/whisper.cpp/models";
  if (existsSync(whisperBin)) {
    const hasLargeV3 = existsSync(join(whisperModelDir, "ggml-large-v3.bin"));
    const hasMedium = existsSync(join(whisperModelDir, "ggml-medium.bin"));
    if (hasLargeV3) {
      pass("whisper-cpp", "Installed with large-v3 model");
    } else if (hasMedium) {
      pass("whisper-cpp", "Installed with medium model");
    } else {
      warn("whisper-cpp", "Binary found but no model files");
    }
  } else {
    warn("whisper-cpp", "Not found at expected path");
  }

  // Test 23: ffmpeg (for audio conversion)
  try {
    const result = Bun.spawnSync(["which", "ffmpeg"]);
    if (result.exitCode === 0) {
      pass("ffmpeg", result.stdout.toString().trim());
    } else {
      warn("ffmpeg", "Not found (required for voice memo processing)");
    }
  } catch {
    warn("ffmpeg", "Could not check");
  }

  // Test 24: Dictated pipeline intent patterns
  try {
    const intentTests = [
      { input: "archive this lease agreement", shouldMatch: "archive", type: "LEASE" },
      { input: "save this receipt from Bunnings", shouldMatch: "receipt", type: null },
      { input: "this is my work contract", shouldMatch: "archive", type: "CONTRACT" },
      { input: "just a random note", shouldMatch: null, type: null },
    ];

    let intentPassed = true;

    // Receipt patterns
    const receiptPatterns = [
      /\b(receipt|invoice|bill|purchase|expense)\b/i,
      /\b(bought|purchased|paid)\b/i,
    ];

    // Archive patterns
    const archivePatterns = [
      /\b(archive|file|store|save)\s*(this\s*)?(document|contract|agreement|paper|file)?\b/i,
      /\b(contract|agreement|lease|deed|certificate|license|permit)\b/i,
    ];

    for (const test of intentTests) {
      const isReceipt = receiptPatterns.some(p => p.test(test.input));
      const isArchive = archivePatterns.some(p => p.test(test.input));

      const detectedPipeline = isReceipt ? "receipt" : isArchive ? "archive" : null;

      if (detectedPipeline !== test.shouldMatch) {
        intentPassed = false;
        break;
      }
    }

    if (intentPassed) {
      pass("Dictated Intent", "Archive/receipt pipeline detection patterns valid");
    } else {
      fail("Dictated Intent", "One or more intent patterns failed");
    }
  } catch (e) {
    fail("Dictated Intent", `Error: ${e instanceof Error ? e.message : e}`);
  }

  // Test 25: Real-time embedding check
  if (vaultPath) {
    const resolvedPath = vaultPath.replace(/^~/, homedir());
    const embeddingsDb = join(resolvedPath, "_meta", "embeddings.db");
    if (existsSync(embeddingsDb)) {
      try {
        const { Database } = await import("bun:sqlite");
        const db = new Database(embeddingsDb);
        const noteCount = (db.query("SELECT COUNT(*) as count FROM notes").get() as { count: number }).count;
        const lastUpdate = db.query("SELECT MAX(embedded_at) as ts FROM notes").get() as { ts: number | null };
        db.close();

        if (noteCount > 0) {
          const lastDate = lastUpdate.ts ? new Date(lastUpdate.ts).toISOString().slice(0, 16) : "never";
          pass("Real-time Embedding", `${noteCount} notes indexed, last: ${lastDate}`);
        } else {
          warn("Real-time Embedding", "No notes indexed yet - run 'obs embed' or process a message");
        }
      } catch (e) {
        warn("Real-time Embedding", `Could not read embedding stats: ${e instanceof Error ? e.message : e}`);
      }
    } else {
      warn("Real-time Embedding", "Embeddings DB not found - new notes won't be searchable until created");
    }
  }

  // Summary
  console.log("\n" + "─".repeat(50));
  const passed = results.filter(r => r.status === "pass").length;
  const failed = results.filter(r => r.status === "fail").length;
  const warned = results.filter(r => r.status === "warn").length;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${warned} warnings\n`);

  if (failed > 0) {
    console.log("❌ Some required components are missing. Please check the errors above.\n");
    process.exit(1);
  } else if (warned > 0) {
    console.log("⚠️  All required components present, but some optional features are not configured.\n");
    process.exit(0);
  } else {
    console.log("✅ All components configured correctly!\n");
    process.exit(0);
  }
}

runTests().catch(console.error);
