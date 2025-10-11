#!/usr/bin/env bun
/**
 * Delegation Router - Smart task routing to optimal AI tool
 * Analyzes task requirements and routes to best available tool
 *
 * Usage: bun delegate-router.md --task "description" [options]
 *        echo "task description" | bun delegate-router.md
 *
 * Options:
 *   --task <desc>      Task description
 *   --path <path>      File/directory path
 *   --pattern <glob>   File pattern (e.g., "**\/*.ts")
 *   --tool <name>      Force specific tool (auggie|gemini|aider)
 *   --dry-run          Show decision without executing
 *   --json             Output JSON format
 */

import { $ } from "bun";
import { existsSync, statSync } from "fs";
import { glob } from "glob";

interface TaskAnalysis {
  type:
    | "analyze"
    | "summarize"
    | "generate"
    | "refactor"
    | "research"
    | "unknown";
  scope: "file" | "directory" | "codebase" | "document" | "web";
  inputSize: {
    fileCount?: number;
    estimatedTokens: number;
    complexity: "low" | "medium" | "high";
  };
  requirements: string[];
}

interface DelegationDecision {
  shouldDelegate: boolean;
  tool: "auggie" | "gemini" | "aider" | "none";
  reason: string;
  estimatedTokenSavings: number;
  command: string;
}

interface DelegationResult {
  success: boolean;
  tool: string;
  output: string;
  tokensSaved: number;
  executionTime: number;
  error?: string;
}

interface DelegationOptions {
  task: string;
  path?: string;
  pattern?: string;
  tool?: string;
  dryRun: boolean;
  json: boolean;
}

interface DelegationLogEntry {
  tool: string;
  task: string;
  tokensSaved: number;
  executionTime: number;
  timestamp: string;
}

interface DelegationLog {
  delegations: DelegationLogEntry[];
}

async function analyzeTask(
  taskDescription: string,
  options: DelegationOptions
): Promise<TaskAnalysis> {
  // Determine task type from keywords
  const taskLower = taskDescription.toLowerCase();
  let type: TaskAnalysis["type"] = "unknown";

  if (
    taskLower.includes("analyze") ||
    taskLower.includes("review") ||
    taskLower.includes("audit")
  ) {
    type = "analyze";
  } else if (
    taskLower.includes("summarize") ||
    taskLower.includes("summary") ||
    taskLower.includes("tldr")
  ) {
    type = "summarize";
  } else if (
    taskLower.includes("generate") ||
    taskLower.includes("create") ||
    taskLower.includes("write")
  ) {
    type = "generate";
  } else if (
    taskLower.includes("refactor") ||
    taskLower.includes("rewrite") ||
    taskLower.includes("migrate")
  ) {
    type = "refactor";
  } else if (
    taskLower.includes("research") ||
    taskLower.includes("find") ||
    taskLower.includes("search")
  ) {
    type = "research";
  }

  // Determine scope and input size
  let scope: TaskAnalysis["scope"] = "document";
  let fileCount = 0;
  let estimatedTokens = 1000;

  if (options.path && existsSync(options.path)) {
    const stats = statSync(options.path);

    if (stats.isDirectory()) {
      scope = "directory";
      // Count files matching pattern
      const pattern = options.pattern || "**/*";
      const files = await glob(pattern, { cwd: options.path });
      fileCount = files.length;
      estimatedTokens = fileCount * 500; // Rough estimate

      if (fileCount > 20) {
        scope = "codebase";
        estimatedTokens = fileCount * 750;
      }
    } else {
      scope = "file";
      fileCount = 1;
      const size = stats.size;
      estimatedTokens = Math.floor(size / 4); // ~4 bytes per token
    }
  }

  // Determine complexity
  let complexity: TaskAnalysis["inputSize"]["complexity"] = "low";
  if (fileCount > 10 || estimatedTokens > 10000) complexity = "medium";
  if (fileCount > 30 || estimatedTokens > 30000) complexity = "high";

  // Extract requirements
  const requirements: string[] = [];
  if (taskLower.includes("security")) requirements.push("security-aware");
  if (taskLower.includes("test")) requirements.push("test-generation");
  if (taskLower.includes("performance")) requirements.push("performance");
  if (scope === "codebase") requirements.push("codebase-context");

  return {
    type,
    scope,
    inputSize: {
      fileCount,
      estimatedTokens,
      complexity,
    },
    requirements,
  };
}

async function makeDecision(
  analysis: TaskAnalysis,
  forcedTool?: string
): Promise<DelegationDecision> {
  // If tool is forced, validate and use it
  if (forcedTool) {
    const validTools = ["auggie", "gemini", "aider"] as const;
    const tool = validTools.includes(forcedTool as any)
      ? (forcedTool as "auggie" | "gemini" | "aider")
      : "gemini"; // Default fallback if invalid tool specified

    return {
      shouldDelegate: true,
      tool,
      reason: `User requested ${tool}`,
      estimatedTokenSavings: analysis.inputSize.estimatedTokens * 0.7,
      command: "", // Will be filled by executor
    };
  }

  // Decision logic based on task analysis
  const { type, scope, inputSize, requirements } = analysis;

  // Don't delegate small, simple tasks
  if (
    inputSize.complexity === "low" &&
    inputSize.estimatedTokens < 5000 &&
    !requirements.includes("codebase-context")
  ) {
    return {
      shouldDelegate: false,
      tool: "none",
      reason: "Task is small enough to handle directly",
      estimatedTokenSavings: 0,
      command: "",
    };
  }

  // Codebase analysis → auggie (best for codebase context)
  if (
    (type === "analyze" && scope === "codebase") ||
    requirements.includes("codebase-context")
  ) {
    return {
      shouldDelegate: true,
      tool: "auggie",
      reason: "Codebase analysis benefits from auggie's indexing",
      estimatedTokenSavings: inputSize.estimatedTokens * 0.8,
      command: "", // Will be filled
    };
  }

  // Large summarization → gemini (fast, large context)
  if (type === "summarize" && inputSize.estimatedTokens > 10000) {
    return {
      shouldDelegate: true,
      tool: "gemini",
      reason: "Large summarization suited for gemini's speed",
      estimatedTokenSavings: inputSize.estimatedTokens * 0.75,
      command: "",
    };
  }

  // Code generation → gemini (fast generation)
  if (type === "generate") {
    return {
      shouldDelegate: true,
      tool: "gemini",
      reason: "Code generation benefits from gemini's speed",
      estimatedTokenSavings: inputSize.estimatedTokens * 0.6,
      command: "",
    };
  }

  // Refactoring → aider (if available) or auggie
  if (type === "refactor") {
    // Check if aider is available
    const aiderCheck = await $`which aider`.quiet().nothrow();
    const hasAider = aiderCheck.exitCode === 0;

    return {
      shouldDelegate: true,
      tool: hasAider ? "aider" : "auggie",
      reason: hasAider
        ? "Refactoring best handled by aider's direct editing"
        : "Refactoring via auggie (aider not available)",
      estimatedTokenSavings: inputSize.estimatedTokens * 0.7,
      command: "",
    };
  }

  // Research → gemini (web search capability)
  if (type === "research") {
    return {
      shouldDelegate: true,
      tool: "gemini",
      reason: "Research benefits from gemini's web search",
      estimatedTokenSavings: inputSize.estimatedTokens * 0.5,
      command: "",
    };
  }

  // Default: delegate medium/high complexity to gemini
  if (inputSize.complexity !== "low") {
    return {
      shouldDelegate: true,
      tool: "gemini",
      reason: `${inputSize.complexity} complexity task, delegating for efficiency`,
      estimatedTokenSavings: inputSize.estimatedTokens * 0.6,
      command: "",
    };
  }

  // Fallback: don't delegate
  return {
    shouldDelegate: false,
    tool: "none",
    reason: "Task suitable for direct handling",
    estimatedTokenSavings: 0,
    command: "",
  };
}

async function executeDelegation(
  decision: DelegationDecision,
  task: string,
  options: DelegationOptions
): Promise<DelegationResult> {
  const startTime = Date.now();

  try {
    let output: string;

    switch (decision.tool) {
      case "auggie":
        output = await executeAuggie(task, options);
        break;
      case "gemini":
        output = await executeGemini(task, options);
        break;
      case "aider":
        output = await executeAider(task, options);
        break;
      default:
        throw new Error(`Unknown tool: ${decision.tool}`);
    }

    const executionTime = Date.now() - startTime;

    // Log delegation
    await logDelegation({
      tool: decision.tool,
      task,
      tokensSaved: decision.estimatedTokenSavings,
      executionTime,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      tool: decision.tool,
      output,
      tokensSaved: decision.estimatedTokenSavings,
      executionTime,
    };
  } catch (error) {
    // IMPORTANT: Don't auto-fallback to Kai - ask user what to do
    // This returns a failure result which Kai will handle by asking the user
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      tool: decision.tool,
      output: "",
      tokensSaved: 0,
      executionTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

async function executeAuggie(task: string, options: DelegationOptions): Promise<string> {
  const args = ["-p", "-q", task];

  if (options.path) {
    args.push(options.path);
  }

  const result = await $`auggie ${args}`.quiet();
  return result.stdout.toString();
}

async function executeGemini(task: string, options: DelegationOptions): Promise<string> {
  const args = [task];

  // Add file references if path provided
  if (options.path && existsSync(options.path)) {
    args.unshift(`@${options.path}`);
  }

  const result = await $`gemini ${args}`.quiet();
  return result.stdout.toString();
}

async function executeAider(task: string, options: DelegationOptions): Promise<string> {
  const args = ["--yes", "--message", task];

  if (options.path) {
    args.push(options.path);
  }

  const result = await $`aider ${args}`.quiet();
  return result.stdout.toString();
}

async function logDelegation(entry: DelegationLogEntry): Promise<void> {
  const logPath = "/tmp/delegation-log.json";
  let log: DelegationLog = { delegations: [] };

  if (existsSync(logPath)) {
    log = await Bun.file(logPath).json();
  }

  log.delegations.push(entry);

  // Keep last 100 delegations
  if (log.delegations.length > 100) {
    log.delegations = log.delegations.slice(-100);
  }

  // Write log file with secure permissions (0600 = owner read/write only)
  const logFile = Bun.file(logPath);
  await Bun.write(logFile, JSON.stringify(log, null, 2));

  // Set secure permissions on the log file
  try {
    await $`chmod 600 ${logPath}`.quiet();
  } catch {
    // Permissions setting failed, but don't block operation
    console.warn("Warning: Could not set secure permissions on log file");
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse options
  const options: DelegationOptions = {
    task: "",
    path: undefined,
    pattern: undefined,
    tool: undefined,
    dryRun: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--task" && args[i + 1]) {
      options.task = args[++i];
    } else if (args[i] === "--path" && args[i + 1]) {
      options.path = args[++i];
    } else if (args[i] === "--pattern" && args[i + 1]) {
      options.pattern = args[++i];
    } else if (args[i] === "--tool" && args[i + 1]) {
      options.tool = args[++i];
    } else if (args[i] === "--dry-run") {
      options.dryRun = true;
    } else if (args[i] === "--json") {
      options.json = true;
    }
  }

  // Read from stdin if no task provided
  if (!options.task) {
    const stdin = await Bun.stdin.text();
    if (stdin.trim()) {
      options.task = stdin.trim();
    }
  }

  if (!options.task) {
    console.error("Error: No task provided");
    console.error("Usage: delegate-router --task 'description' [options]");
    process.exit(1);
  }

  // Analyze task
  const analysis = await analyzeTask(options.task, options);

  // Make decision
  const decision = await makeDecision(analysis, options.tool);

  if (options.dryRun || options.json) {
    const output = {
      analysis,
      decision,
      wouldExecute: !options.dryRun && decision.shouldDelegate,
    };

    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log("📊 Task Analysis:");
      console.log(`   Type: ${analysis.type}`);
      console.log(`   Scope: ${analysis.scope}`);
      console.log(`   Complexity: ${analysis.inputSize.complexity}`);
      console.log(
        `   Estimated Tokens: ${analysis.inputSize.estimatedTokens.toLocaleString()}`
      );
      console.log();
      console.log("🎯 Delegation Decision:");
      console.log(`   Should Delegate: ${decision.shouldDelegate}`);
      console.log(`   Tool: ${decision.tool}`);
      console.log(`   Reason: ${decision.reason}`);
      console.log(
        `   Token Savings: ${decision.estimatedTokenSavings.toLocaleString()}`
      );
    }

    return;
  }

  // Execute if should delegate
  if (decision.shouldDelegate) {
    console.log(
      `🔄 Delegating to ${decision.tool}... (saving ~${decision.estimatedTokenSavings} tokens)`
    );

    const result = await executeDelegation(decision, options.task, options);

    if (result.success) {
      console.log(`✅ Delegation complete (${result.executionTime}ms)`);
      console.log();
      console.log(result.output);
    } else {
      // Don't auto-fallback - return error for Kai to ask user
      console.error(`❌ Delegation to ${result.tool} failed: ${result.error}`);
      console.error(
        `\nKai should ask user: "Delegation failed. Would you like me to:"`
      );
      console.error(`  (a) Try another tool`);
      console.error(`  (b) Handle it directly`);
      console.error(`  (c) Skip this task"`);
      process.exit(1);
    }
  } else {
    console.log(`ℹ️  ${decision.reason}`);
    console.log("Task does not require delegation.");
  }
}

main().catch(console.error);
