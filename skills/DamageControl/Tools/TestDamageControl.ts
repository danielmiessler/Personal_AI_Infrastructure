#!/usr/bin/env bun
/**
 * DamageControl - Test CLI Tool
 * ==============================
 *
 * Interactive and CLI testing for DamageControl hooks.
 *
 * Usage:
 *   bun run TestDamageControl.ts -i                              # Interactive mode
 *   bun run TestDamageControl.ts bash Bash "rm -rf /"            # Test bash command
 *   bun run TestDamageControl.ts edit Edit "~/.ssh/id_rsa"       # Test edit path
 *   bun run TestDamageControl.ts write Write ".env"              # Test write path
 *   bun run TestDamageControl.ts bash Bash "rm -rf /" --expect-blocked
 */

import { dirname, join } from "path";
import * as readline from "readline";

const SCRIPT_DIR = dirname(Bun.main);

interface TestResult {
  tool: string;
  input: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  blocked: boolean;
  ask: boolean;
}

async function runHook(
  hookScript: string,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<TestResult> {
  const input = JSON.stringify({
    tool_name: toolName,
    tool_input: toolInput,
  });

  const proc = Bun.spawn({
    cmd: ["bun", "run", hookScript],
    stdin: new Blob([input]),
    stdout: "pipe",
    stderr: "pipe",
  });

  // Wait for completion
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  // Determine result type
  let ask = false;
  if (exitCode === 0 && stdout.trim()) {
    try {
      const json = JSON.parse(stdout.trim());
      ask = json.action === "ask";
    } catch {
      // Not JSON, just regular output
    }
  }

  return {
    tool: toolName,
    input: JSON.stringify(toolInput),
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    blocked: exitCode === 2,
    ask,
  };
}

function formatResult(result: TestResult): string {
  const status = result.blocked
    ? "\x1b[31mBLOCKED\x1b[0m"
    : result.ask
      ? "\x1b[33mASK\x1b[0m"
      : "\x1b[32mALLOWED\x1b[0m";

  let output = `\n${status} (exit code: ${result.exitCode})\n`;
  output += `Tool: ${result.tool}\n`;
  output += `Input: ${result.input}\n`;

  if (result.stderr) {
    output += `Message: ${result.stderr}\n`;
  }
  if (result.ask && result.stdout) {
    output += `Ask reason: ${result.stdout}\n`;
  }

  return output;
}

async function interactiveMode(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  console.log("\n\x1b[1mDamageControl Interactive Tester\x1b[0m");
  console.log("================================\n");

  while (true) {
    console.log("Select tool to test:");
    console.log("[1] Bash - Test shell commands");
    console.log("[2] Edit - Test file paths for edit operations");
    console.log("[3] Write - Test file paths for write operations");
    console.log("[q] Quit\n");

    const choice = await question("Tool [1/2/3/q]> ");

    if (choice.toLowerCase() === "q") {
      console.log("Goodbye!");
      rl.close();
      break;
    }

    let hookScript: string;
    let toolName: string;
    let prompt: string;
    let inputKey: string;

    switch (choice) {
      case "1":
        hookScript = join(SCRIPT_DIR, "BashToolDamageControl.ts");
        toolName = "Bash";
        prompt = "Command> ";
        inputKey = "command";
        break;
      case "2":
        hookScript = join(SCRIPT_DIR, "EditToolDamageControl.ts");
        toolName = "Edit";
        prompt = "File path> ";
        inputKey = "file_path";
        break;
      case "3":
        hookScript = join(SCRIPT_DIR, "WriteToolDamageControl.ts");
        toolName = "Write";
        prompt = "File path> ";
        inputKey = "file_path";
        break;
      default:
        console.log("Invalid choice\n");
        continue;
    }

    const inputValue = await question(prompt);
    if (!inputValue.trim()) {
      console.log("Empty input, skipping\n");
      continue;
    }

    const result = await runHook(hookScript, toolName, { [inputKey]: inputValue });
    console.log(formatResult(result));
  }
}

async function cliMode(args: string[]): Promise<void> {
  if (args.length < 3) {
    console.log("Usage: TestDamageControl.ts <hook> <tool> <input> [--expect-blocked|--expect-allowed]");
    console.log("");
    console.log("Hooks: bash, edit, write");
    console.log("Tools: Bash, Edit, Write");
    console.log("");
    console.log("Examples:");
    console.log('  bun run TestDamageControl.ts bash Bash "rm -rf /" --expect-blocked');
    console.log('  bun run TestDamageControl.ts edit Edit "~/.ssh/id_rsa" --expect-blocked');
    console.log('  bun run TestDamageControl.ts write Write ".env" --expect-blocked');
    console.log('  bun run TestDamageControl.ts bash Bash "ls -la" --expect-allowed');
    process.exit(1);
  }

  const [hook, tool, input] = args;
  const expectBlocked = args.includes("--expect-blocked");
  const expectAllowed = args.includes("--expect-allowed");

  let hookScript: string;
  let inputKey: string;

  switch (hook.toLowerCase()) {
    case "bash":
      hookScript = join(SCRIPT_DIR, "BashToolDamageControl.ts");
      inputKey = "command";
      break;
    case "edit":
      hookScript = join(SCRIPT_DIR, "EditToolDamageControl.ts");
      inputKey = "file_path";
      break;
    case "write":
      hookScript = join(SCRIPT_DIR, "WriteToolDamageControl.ts");
      inputKey = "file_path";
      break;
    default:
      console.error(`Unknown hook: ${hook}`);
      process.exit(1);
  }

  const result = await runHook(hookScript, tool, { [inputKey]: input });
  console.log(formatResult(result));

  // Validate expectations
  if (expectBlocked && !result.blocked) {
    console.log("\x1b[31mFAILED: Expected BLOCKED but got ALLOWED\x1b[0m");
    process.exit(1);
  }
  if (expectAllowed && result.blocked) {
    console.log("\x1b[31mFAILED: Expected ALLOWED but got BLOCKED\x1b[0m");
    process.exit(1);
  }
  if (expectBlocked || expectAllowed) {
    console.log("\x1b[32mPASSED\x1b[0m");
  }
}

async function runQuickTests(): Promise<void> {
  console.log("\n\x1b[1mRunning Quick Tests\x1b[0m\n");

  const tests = [
    // Bash tests - should block
    { hook: "bash", tool: "Bash", input: "rm -rf /tmp/test", expectBlocked: true },
    { hook: "bash", tool: "Bash", input: "git reset --hard", expectBlocked: true },
    { hook: "bash", tool: "Bash", input: "terraform destroy", expectBlocked: true },
    { hook: "bash", tool: "Bash", input: "DELETE FROM users;", expectBlocked: true },

    // Bash tests - should allow
    { hook: "bash", tool: "Bash", input: "ls -la", expectBlocked: false },
    { hook: "bash", tool: "Bash", input: "git status", expectBlocked: false },

    // Commit message tests - paths in messages should NOT trigger blocks
    { hook: "bash", tool: "Bash", input: 'git commit -m "fix: Update /root/.claude to /home/user"', expectBlocked: false },
    { hook: "bash", tool: "Bash", input: "git commit -m 'Changed path from /etc/passwd reference'", expectBlocked: false },
    { hook: "bash", tool: "Bash", input: 'git commit --message="Update ~/.ssh config docs"', expectBlocked: false },

    // But actual dangerous commands should still be blocked even with -m
    { hook: "bash", tool: "Bash", input: 'git commit -m "safe" && rm -rf /tmp', expectBlocked: true },

    // Edit tests - should block
    { hook: "edit", tool: "Edit", input: "~/.ssh/id_rsa", expectBlocked: true },
    { hook: "edit", tool: "Edit", input: ".env", expectBlocked: true },
    { hook: "edit", tool: "Edit", input: "package-lock.json", expectBlocked: true },

    // Write tests - should block
    { hook: "write", tool: "Write", input: "~/.aws/credentials", expectBlocked: true },
    { hook: "write", tool: "Write", input: ".env.local", expectBlocked: true },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    let hookScript: string;
    let inputKey: string;

    switch (test.hook) {
      case "bash":
        hookScript = join(SCRIPT_DIR, "BashToolDamageControl.ts");
        inputKey = "command";
        break;
      case "edit":
        hookScript = join(SCRIPT_DIR, "EditToolDamageControl.ts");
        inputKey = "file_path";
        break;
      case "write":
        hookScript = join(SCRIPT_DIR, "WriteToolDamageControl.ts");
        inputKey = "file_path";
        break;
      default:
        continue;
    }

    const result = await runHook(hookScript, test.tool, { [inputKey]: test.input });
    const success = result.blocked === test.expectBlocked;

    const status = success ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    const expected = test.expectBlocked ? "BLOCKED" : "ALLOWED";
    const actual = result.blocked ? "BLOCKED" : result.ask ? "ASK" : "ALLOWED";

    console.log(`${status} ${test.hook}/${test.tool}: "${test.input}" (expected: ${expected}, got: ${actual})`);

    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Main
const args = process.argv.slice(2);

if (args.includes("-i") || args.includes("--interactive")) {
  await interactiveMode();
} else if (args.includes("-t") || args.includes("--test")) {
  await runQuickTests();
} else if (args.length > 0) {
  await cliMode(args);
} else {
  console.log("DamageControl Test Tool");
  console.log("");
  console.log("Usage:");
  console.log("  bun run TestDamageControl.ts -i              # Interactive mode");
  console.log("  bun run TestDamageControl.ts -t              # Run quick tests");
  console.log('  bun run TestDamageControl.ts bash Bash "cmd" # Test specific command');
  console.log("");
  console.log("Run with -i for interactive testing.");
}
