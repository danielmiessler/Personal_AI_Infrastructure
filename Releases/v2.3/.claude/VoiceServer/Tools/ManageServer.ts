#!/usr/bin/env bun
/**
 * ManageServer.ts - Voice Server Manager
 *
 * A CLI tool for managing the PAI Voice Server (ElevenLabs TTS)
 *
 * Usage:
 *   bun ~/.claude/VoiceServer/Tools/ManageServer.ts <command>
 *
 * Commands:
 *   start     Start the voice server
 *   stop      Stop the voice server
 *   restart   Restart the voice server
 *   status    Check if voice server is running
 *   logs      Show recent server output
 *   test      Send a test notification
 *
 * @author PAI (Personal AI Infrastructure)
 */

import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";

const CONFIG = {
  serverPath: join(process.env.HOME || "", ".claude/VoiceServer"),
  port: 8888,
  logFile: join(process.env.HOME || "", "Library/Logs/pai-voice-server.log"),
  processPattern: "VoiceServer/server.ts",
};

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function isServerRunning(): Promise<{ running: boolean; pid?: number }> {
  try {
    const result = await $`lsof -ti :${CONFIG.port}`.quiet().nothrow();
    if (result.exitCode === 0) {
      const pid = parseInt(result.stdout.toString().trim().split("\n")[0]);
      return { running: true, pid };
    }
    return { running: false };
  } catch {
    return { running: false };
  }
}

async function isServerHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${CONFIG.port}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function startServer(): Promise<void> {
  const status = await isServerRunning();

  if (status.running) {
    const healthy = await isServerHealthy();
    if (healthy) {
      console.log(colors.yellow(`Voice server already running (PID: ${status.pid})`));
      return;
    }
    console.log(colors.yellow("Process exists but not responding. Restarting..."));
    await stopServer();
  }

  console.log(colors.blue("Starting voice server..."));

  const cmd = `cd "${CONFIG.serverPath}" && nohup bun server.ts >> "${CONFIG.logFile}" 2>&1 &`;
  await $`sh -c ${cmd}`.quiet();

  // Wait for server to start
  for (let i = 0; i < 10; i++) {
    await Bun.sleep(500);
    if (await isServerHealthy()) {
      const newStatus = await isServerRunning();
      console.log(colors.green("Voice server started successfully!"));
      console.log(colors.dim(`PID: ${newStatus.pid}`));
      console.log(colors.bold(`URL: http://localhost:${CONFIG.port}`));
      return;
    }
  }

  console.error(colors.red("Failed to start voice server. Check logs:"));
  console.log(colors.dim(`tail -20 ${CONFIG.logFile}`));
  process.exit(1);
}

async function stopServer(): Promise<void> {
  const status = await isServerRunning();

  if (!status.running) {
    console.log(colors.yellow("Voice server is not running."));
    return;
  }

  console.log(colors.blue(`Stopping voice server (PID: ${status.pid})...`));

  await $`kill ${status.pid}`.quiet().nothrow();
  await Bun.sleep(500);

  const newStatus = await isServerRunning();
  if (!newStatus.running) {
    console.log(colors.green("Voice server stopped."));
  } else {
    await $`kill -9 ${status.pid}`.quiet().nothrow();
    console.log(colors.yellow("Voice server force stopped."));
  }
}

async function restartServer(): Promise<void> {
  console.log(colors.blue("Restarting voice server..."));
  await stopServer();
  await Bun.sleep(500);
  await startServer();
}

async function showStatus(): Promise<void> {
  const status = await isServerRunning();

  if (status.running) {
    console.log(colors.green("Status: RUNNING"));
    console.log(colors.dim(`PID: ${status.pid}`));
    console.log(colors.dim(`Port: ${CONFIG.port}`));

    const healthy = await isServerHealthy();
    if (healthy) {
      console.log(colors.green("Health: Responding"));
    } else {
      console.log(colors.red("Health: Not responding"));
    }
  } else {
    console.log(colors.red("Status: NOT RUNNING"));
  }
}

async function showLogs(): Promise<void> {
  if (!existsSync(CONFIG.logFile)) {
    console.log(colors.yellow("No log file found."));
    return;
  }

  const result = await $`tail -30 ${CONFIG.logFile}`.quiet();
  console.log(colors.bold("Recent voice server logs:"));
  console.log(colors.dim("─".repeat(50)));
  console.log(result.stdout.toString());
}

async function testNotification(): Promise<void> {
  const healthy = await isServerHealthy();
  if (!healthy) {
    console.log(colors.yellow("Voice server not running. Starting..."));
    await startServer();
  }

  console.log(colors.blue("Sending test notification..."));

  try {
    const response = await fetch(`http://localhost:${CONFIG.port}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Voice server test successful" }),
    });

    if (response.ok) {
      console.log(colors.green("Test notification sent!"));
    } else {
      console.log(colors.red(`Failed: ${response.status}`));
    }
  } catch (error) {
    console.error(colors.red("Error:"), error);
  }
}

function showHelp(): void {
  console.log(colors.bold("ManageServer.ts - Voice Server Manager"));
  console.log(colors.dim("─".repeat(50)));
  console.log(`
${colors.bold("Usage:")}
  bun ManageServer.ts <command>

${colors.bold("Commands:")}
  ${colors.green("start")}     Start the voice server
  ${colors.green("stop")}      Stop the voice server
  ${colors.green("restart")}   Restart the voice server
  ${colors.green("status")}    Check server status and health
  ${colors.green("logs")}      Show recent server logs
  ${colors.green("test")}      Send a test voice notification

${colors.bold("Examples:")}
  ${colors.dim("# Quick restart")}
  bun ManageServer.ts restart

  ${colors.dim("# Check if running")}
  bun ManageServer.ts status

${colors.bold("Server:")} http://localhost:${CONFIG.port}
${colors.bold("Logs:")} ${CONFIG.logFile}
`);
}

async function main(): Promise<void> {
  const command = process.argv[2] || "help";

  switch (command) {
    case "start":
      await startServer();
      break;
    case "stop":
      await stopServer();
      break;
    case "restart":
      await restartServer();
      break;
    case "status":
      await showStatus();
      break;
    case "logs":
      await showLogs();
      break;
    case "test":
      await testNotification();
      break;
    case "help":
    case "--help":
      showHelp();
      break;
    default:
      console.error(colors.red(`Unknown command: ${command}`));
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(colors.red("Fatal error:"), error);
  process.exit(1);
});
