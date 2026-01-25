#!/usr/bin/env bun
/**
 * VoiceServerManager.ts - Voice Server Management Tool
 *
 * Manages the ElevenLabs TTS voice server for PAI notifications.
 *
 * Usage:
 *   bun ~/.claude/skills/VoiceServer/Tools/VoiceServerManager.ts <command>
 *
 * Commands:
 *   start     Start the voice server
 *   stop      Stop the voice server
 *   restart   Restart the voice server
 *   status    Check if server is running
 *   test      Send a test notification
 *   help      Show this help
 *
 * Examples:
 *   bun VoiceServerManager.ts start
 *   bun VoiceServerManager.ts status
 *   bun VoiceServerManager.ts test "Hello from PAI"
 *
 * Infrastructure: ~/.claude/VoiceServer/
 * Port: 8888
 *
 * @author PAI
 * @version 1.0.0
 */

import { $ } from "bun";
import { join } from "path";

const VOICE_SERVER_PATH = join(process.env.HOME || "", ".claude/VoiceServer");
const PORT = 8888;
// Voice ID is read from settings.json via identity module
// Fallback only used if settings not available
const DEFAULT_VOICE_ID = ""; // Configured in settings.json → daidentity.voiceId

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

async function runScript(script: string): Promise<{ success: boolean; output: string }> {
  const scriptPath = join(VOICE_SERVER_PATH, script);
  try {
    const result = await $`${scriptPath}`.quiet();
    return { success: true, output: result.stdout.toString() };
  } catch (error: any) {
    return { success: false, output: error.stderr?.toString() || error.message };
  }
}

async function start(): Promise<void> {
  console.log(colors.blue("Starting voice server..."));
  const result = await runScript("start.sh");
  if (result.success) {
    console.log(colors.green("Voice server started successfully!"));
    console.log(colors.dim(`URL: http://localhost:${PORT}`));
  } else {
    console.error(colors.red("Failed to start voice server:"));
    console.error(result.output);
  }
}

async function stop(): Promise<void> {
  console.log(colors.blue("Stopping voice server..."));
  const result = await runScript("stop.sh");
  if (result.success) {
    console.log(colors.green("Voice server stopped."));
  } else {
    console.error(colors.red("Failed to stop voice server:"));
    console.error(result.output);
  }
}

async function restart(): Promise<void> {
  console.log(colors.blue("Restarting voice server..."));
  const result = await runScript("restart.sh");
  if (result.success) {
    console.log(colors.green("Voice server restarted successfully!"));
  } else {
    console.error(colors.red("Failed to restart voice server:"));
    console.error(result.output);
  }
}

async function status(): Promise<void> {
  const result = await runScript("status.sh");
  console.log(result.output || (result.success ? colors.green("Running") : colors.red("Not running")));

  // Also check health endpoint
  try {
    const response = await fetch(`http://localhost:${PORT}/health`);
    if (response.ok) {
      console.log(colors.green("Health check: OK"));
    } else {
      console.log(colors.yellow(`Health check: HTTP ${response.status}`));
    }
  } catch {
    console.log(colors.red("Health check: Not responding"));
  }
}

async function test(message?: string): Promise<void> {
  const testMessage = message || "Voice server test from PAI";
  console.log(colors.blue(`Sending test notification: "${testMessage}"`));

  try {
    const response = await fetch(`http://localhost:${PORT}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: testMessage,
        voice_id: DEFAULT_VOICE_ID,
        title: "Test"
      })
    });

    if (response.ok) {
      console.log(colors.green("Test notification sent successfully!"));
    } else {
      console.log(colors.red(`Failed: HTTP ${response.status}`));
    }
  } catch (error: any) {
    console.log(colors.red(`Failed: ${error.message}`));
    console.log(colors.dim("Is the voice server running? Try: bun VoiceServerManager.ts start"));
  }
}

function showHelp(): void {
  console.log(colors.bold("VoiceServerManager.ts - Voice Server Management Tool"));
  console.log(colors.dim("─".repeat(50)));
  console.log(`
${colors.bold("Usage:")}
  bun ~/.claude/skills/VoiceServer/Tools/VoiceServerManager.ts <command>

${colors.bold("Commands:")}
  ${colors.green("start")}     Start the voice server
  ${colors.green("stop")}      Stop the voice server
  ${colors.green("restart")}   Restart the voice server
  ${colors.green("status")}    Check if server is running
  ${colors.green("test")}      Send a test notification
  ${colors.green("help")}      Show this help

${colors.bold("Examples:")}
  bun VoiceServerManager.ts start
  bun VoiceServerManager.ts status
  bun VoiceServerManager.ts test "Hello from PAI"

${colors.bold("Infrastructure:")} ${VOICE_SERVER_PATH}
${colors.bold("Port:")} ${PORT}
`);
}

async function main(): Promise<void> {
  const command = process.argv[2] || "help";
  const arg = process.argv[3];

  switch (command) {
    case "start":
      await start();
      break;
    case "stop":
      await stop();
      break;
    case "restart":
      await restart();
      break;
    case "status":
      await status();
      break;
    case "test":
      await test(arg);
      break;
    case "help":
    case "--help":
    case "-h":
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
