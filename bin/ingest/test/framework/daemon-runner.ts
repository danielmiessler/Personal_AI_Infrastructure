/**
 * Daemon Deployment Test Runner
 *
 * Self-contained test that verifies the watch daemon is working correctly.
 * Use this before deploying to production or to diagnose daemon issues.
 *
 * Flow:
 * 1. Start watch daemon in background
 * 2. Send a test message via Telegram
 * 3. Wait for Events notification (polls outbox)
 * 4. Validate vault file was created
 * 5. Report pass/fail
 * 6. Clean up daemon process
 *
 * Usage:
 *   ingest test daemon              # Test with production channel
 *   ingest test daemon --test       # Test with test channels
 *   ingest test daemon --timeout 60 # Custom timeout in seconds
 */

import { spawn, type Subprocess } from "bun";
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from "fs";
import { join, basename } from "path";
import { getConfig } from "../../lib/config";
import { getUpdates, sendMessage, type TelegramMessage } from "../../lib/telegram";

// =============================================================================
// Types
// =============================================================================

export interface DaemonTestOptions {
  /** Use test channels instead of production */
  useTestChannels?: boolean;
  /** Timeout in seconds (default: 90) */
  timeout?: number;
  /** Verbose output */
  verbose?: boolean;
  /** Custom test message (default: generated) */
  testMessage?: string;
  /** Skip cleanup of test files */
  skipCleanup?: boolean;
}

export interface DaemonTestResult {
  passed: boolean;
  duration: number;
  checks: Array<{ name: string; passed: boolean; error?: string; detail?: string }>;
  error?: string;
  vaultFile?: string;
  eventsNotification?: string;
}

// =============================================================================
// Constants
// =============================================================================

const INGEST_DIR = join(import.meta.dir, "..", "..");
const DEFAULT_TIMEOUT = 90; // 90 seconds
const POLL_INTERVAL = 2000; // 2 seconds

// =============================================================================
// Daemon Test Runner
// =============================================================================

/**
 * Run daemon deployment test
 */
export async function runDaemonTest(options: DaemonTestOptions = {}): Promise<DaemonTestResult> {
  const startTime = Date.now();
  const checks: Array<{ name: string; passed: boolean; error?: string; detail?: string }> = [];
  const config = getConfig();

  const timeout = (options.timeout || DEFAULT_TIMEOUT) * 1000;
  const verbose = options.verbose ?? true;

  // Generate unique test ID
  const testId = `DAEMON-TEST-${Date.now().toString(36).toUpperCase()}`;
  const testMessage = options.testMessage || `[${testId}] Daemon deployment test at ${new Date().toISOString()}`;

  if (verbose) {
    console.log("\n🔧 Daemon Deployment Test");
    console.log("═".repeat(50));
    console.log(`Test ID: ${testId}`);
    console.log(`Timeout: ${timeout / 1000}s`);
  }

  // Determine channels
  const channelId = options.useTestChannels
    ? config.testTelegramChannelId
    : config.telegramChannelId;
  const outboxId = options.useTestChannels
    ? config.testTelegramOutboxId
    : config.telegramOutboxId;

  if (!channelId) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      checks,
      error: "Missing channel ID. Set TELEGRAM_CHANNEL_ID or TEST_TELEGRAM_CHANNEL_ID",
    };
  }

  if (!outboxId) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      checks,
      error: "Missing outbox ID. Set TELEGRAM_OUTBOX_ID or TEST_TELEGRAM_OUTBOX_ID",
    };
  }

  checks.push({
    name: "config_valid",
    passed: true,
    detail: `Channel: ${channelId}, Outbox: ${outboxId}`,
  });

  if (verbose) {
    console.log(`\n1️⃣ Starting watch daemon...`);
  }

  // Start daemon in background
  let daemon: Subprocess | null = null;
  try {
    daemon = spawn({
      cmd: ["bun", "run", "ingest.ts", "watch", "--verbose", "--interval", "3"],
      cwd: INGEST_DIR,
      env: {
        ...process.env,
        TELEGRAM_CHANNEL_ID: channelId,
        TELEGRAM_OUTBOX_ID: outboxId,
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wait for daemon to start
    await Bun.sleep(3000);

    if (daemon.exitCode !== null) {
      checks.push({
        name: "daemon_started",
        passed: false,
        error: `Daemon exited immediately with code ${daemon.exitCode}`,
      });
      return {
        passed: false,
        duration: Date.now() - startTime,
        checks,
        error: "Daemon failed to start",
      };
    }

    checks.push({
      name: "daemon_started",
      passed: true,
      detail: `PID: ${daemon.pid}`,
    });

    if (verbose) {
      console.log(`   ✓ Daemon started (PID: ${daemon.pid})`);
      console.log(`\n2️⃣ Sending test message...`);
    }

    // Get current update_id to know where to start polling
    const initialUpdates = await getUpdates(config.telegramBotToken, undefined, 1, 1);
    const startOffset = initialUpdates.length > 0 ? initialUpdates[0].update_id : 0;

    // Send test message
    const sendUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        text: testMessage,
      }),
    });

    const sendResult = await sendResponse.json() as { ok: boolean; result?: TelegramMessage; description?: string };
    if (!sendResult.ok) {
      checks.push({
        name: "message_sent",
        passed: false,
        error: sendResult.description || "Failed to send message",
      });
      throw new Error(`Failed to send: ${sendResult.description}`);
    }

    const sentMessageId = sendResult.result!.message_id;
    checks.push({
      name: "message_sent",
      passed: true,
      detail: `Message ID: ${sentMessageId}`,
    });

    if (verbose) {
      console.log(`   ✓ Message sent (ID: ${sentMessageId})`);
      console.log(`\n3️⃣ Waiting for daemon to process...`);
    }

    // Poll for Events notification in outbox
    const pollStart = Date.now();
    let eventsNotification: string | undefined;
    let processed = false;

    while (Date.now() - pollStart < timeout) {
      // Poll outbox for Events notification containing our test ID
      const outboxUrl = `https://api.telegram.org/bot${config.telegramBotToken}/getUpdates`;
      const outboxResponse = await fetch(outboxUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offset: startOffset + 1,
          limit: 100,
          timeout: 5,
        }),
      });

      const outboxData = await outboxResponse.json() as { ok: boolean; result: any[] };
      if (outboxData.ok) {
        for (const update of outboxData.result) {
          const msg = update.message || update.channel_post;
          if (!msg) continue;

          // Check if this is from our outbox channel
          if (String(msg.chat?.id) !== String(outboxId)) continue;

          // Check if it contains our test ID
          const text = msg.text || "";
          if (text.includes(testId)) {
            eventsNotification = text;
            processed = true;
            break;
          }
        }
      }

      if (processed) break;

      const elapsed = Math.round((Date.now() - pollStart) / 1000);
      if (verbose) {
        process.stdout.write(`\r   Waiting... ${elapsed}s / ${timeout / 1000}s`);
      }

      await Bun.sleep(POLL_INTERVAL);
    }

    if (verbose) {
      console.log(""); // Clear the waiting line
    }

    if (!processed) {
      checks.push({
        name: "events_notification",
        passed: false,
        error: `No Events notification received within ${timeout / 1000}s`,
      });

      // Check if daemon is still running
      if (daemon.exitCode !== null) {
        checks.push({
          name: "daemon_running",
          passed: false,
          error: `Daemon died during test with exit code ${daemon.exitCode}`,
        });
      }

      return {
        passed: false,
        duration: Date.now() - startTime,
        checks,
        error: "Daemon did not process message within timeout",
      };
    }

    checks.push({
      name: "events_notification",
      passed: true,
      detail: eventsNotification?.slice(0, 100) || "Received",
    });

    if (verbose) {
      console.log(`   ✓ Events notification received`);
      console.log(`\n4️⃣ Validating vault file...`);
    }

    // Check for vault file
    const vaultPath = config.obsidianVaultPath;
    let vaultFile: string | undefined;

    if (vaultPath) {
      // Search for file containing test ID
      const searchStart = new Date(startTime);
      const found = findVaultFile(vaultPath, testId, searchStart);
      if (found) {
        vaultFile = found;
        checks.push({
          name: "vault_file_created",
          passed: true,
          detail: basename(found),
        });

        if (verbose) {
          console.log(`   ✓ Vault file created: ${basename(found)}`);
        }
      } else {
        checks.push({
          name: "vault_file_created",
          passed: false,
          error: "Vault file not found",
        });
      }
    } else {
      checks.push({
        name: "vault_file_created",
        passed: false,
        error: "No vault path configured",
      });
    }

    // Cleanup test vault file if requested
    if (vaultFile && !options.skipCleanup) {
      try {
        unlinkSync(vaultFile);
        if (verbose) {
          console.log(`\n5️⃣ Cleanup: removed test file`);
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    const allPassed = checks.every((c) => c.passed);

    return {
      passed: allPassed,
      duration: Date.now() - startTime,
      checks,
      vaultFile,
      eventsNotification,
    };
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - startTime,
      checks,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    // Always clean up daemon
    if (daemon && daemon.exitCode === null) {
      if (verbose) {
        console.log(`\n🛑 Stopping daemon (PID: ${daemon.pid})...`);
      }
      daemon.kill();
      await Bun.sleep(500);
    }
  }
}

/**
 * Find vault file containing test ID
 */
function findVaultFile(vaultPath: string, testId: string, afterDate: Date): string | null {
  const candidates: { path: string; mtime: Date }[] = [];

  function scan(dir: string, depth = 0) {
    if (!existsSync(dir) || depth > 3) return;

    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith(".")) continue;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === "_meta" || entry.name === "node_modules") continue;
          scan(fullPath, depth + 1);
        } else if (entry.name.endsWith(".md")) {
          const stat = statSync(fullPath);
          if (stat.mtime >= afterDate) {
            candidates.push({ path: fullPath, mtime: stat.mtime });
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  scan(vaultPath);

  // Sort newest first
  candidates.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // Check for test ID in content
  for (const { path } of candidates) {
    try {
      const content = readFileSync(path, "utf-8");
      if (content.includes(testId)) {
        return path;
      }
    } catch {
      // Ignore read errors
    }
  }

  return null;
}

/**
 * Print daemon test result
 */
export function printDaemonTestResult(result: DaemonTestResult): void {
  console.log("\n" + "═".repeat(50));
  console.log("DAEMON TEST RESULT");
  console.log("═".repeat(50));

  const status = result.passed ? "✅ PASSED" : "❌ FAILED";
  console.log(`Status: ${status}`);
  console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`);

  console.log("\nChecks:");
  for (const check of result.checks) {
    const icon = check.passed ? "✓" : "✗";
    const color = check.passed ? "\x1b[32m" : "\x1b[31m";
    console.log(`  ${color}${icon}\x1b[0m ${check.name}`);
    if (check.detail) {
      console.log(`    ${check.detail}`);
    }
    if (check.error) {
      console.log(`    Error: ${check.error}`);
    }
  }

  if (result.error) {
    console.log(`\nError: ${result.error}`);
  }

  console.log("═".repeat(50));

  if (result.passed) {
    console.log("\n✅ Daemon is working correctly. Safe to deploy.");
  } else {
    console.log("\n❌ Daemon test failed. Check the errors above.");
  }
}

/**
 * Print daemon test help
 */
export function printDaemonTestHelp(): void {
  console.log(`
Daemon Deployment Test

Verifies the watch daemon is working by:
  1. Starting daemon in background
  2. Sending a test message
  3. Waiting for Events notification
  4. Validating vault file created
  5. Cleaning up

Usage:
  ingest test daemon              # Test with production channels
  ingest test daemon --test       # Test with test channels
  ingest test daemon --timeout 60 # Custom timeout (seconds)
  ingest test daemon --verbose    # Show detailed output (default)
  ingest test daemon --no-cleanup # Keep test file in vault

This test is useful for:
  - Pre-deployment verification
  - Diagnosing daemon issues
  - Verifying Telegram connectivity
  - Testing after configuration changes
`);
}
