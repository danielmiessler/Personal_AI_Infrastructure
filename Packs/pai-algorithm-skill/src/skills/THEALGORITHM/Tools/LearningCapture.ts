#!/usr/bin/env bun

/**
 * LearningCapture - Extract and persist learnings from completed algorithm runs
 *
 * Captures:
 * - Capability performance (what worked, what didn't)
 * - Phase insights (difficulties, shortcuts discovered)
 * - Estimation accuracy (was effort level correct?)
 * - Patterns (recurring successes/failures)
 *
 * Usage:
 *   bun run LearningCapture.ts capture --isc-path <path>
 *   bun run LearningCapture.ts capture  # Uses current ISC
 *   bun run LearningCapture.ts list     # List recent learnings
 *   bun run LearningCapture.ts stats    # Show learning statistics
 */

import { parseArgs } from "util";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from "fs";
import { join, basename } from "path";

// Types
interface ISCRow {
  id: number;
  description: string;
  source: "EXPLICIT" | "INFERRED" | "IMPLICIT";
  status: "PENDING" | "ACTIVE" | "DONE" | "ADJUSTED" | "BLOCKED";
  parallel: boolean;
  capability?: string;
  capabilityIcon?: string;
  result?: string;
  adjustedReason?: string;
  blockedReason?: string;
  verifyResult?: "PASS" | "ADJUSTED" | "BLOCKED";
  timestamp: string;
}

interface ISCTable {
  request: string;
  effort: string;
  created: string;
  lastModified: string;
  phase: string;
  iteration: number;
  rows: ISCRow[];
  log: string[];
}

interface Learning {
  id: string;
  timestamp: string;
  type: "capability" | "phase" | "estimation" | "pattern" | "general";
  category?: string;
  title: string;
  insight: string;
  context: {
    request: string;
    effort: string;
    iterations: number;
    totalRows: number;
    completedRows: number;
  };
  actionable: boolean;
  tags: string[];
}

interface CapabilityPerformance {
  capability: string;
  usageCount: number;
  successCount: number;
  adjustedCount: number;
  blockedCount: number;
  successRate: number;
}

interface Pattern {
  id: string;
  timestamp: string;
  type: "success" | "failure" | "loopback";
  pattern: string;
  frequency: number;
  recommendation: string;
  sourceItems: string[];
}

// Paths
const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "~", ".claude");
const MEMORY_DIR = join(PAI_DIR, "MEMORY");
const LEARNING_DIR = join(MEMORY_DIR, "Learning");
const SIGNALS_DIR = join(MEMORY_DIR, "Signals");
const WORK_DIR = join(MEMORY_DIR, "Work");
const CURRENT_ISC_PATH = join(WORK_DIR, "current-isc.json");

// Ensure directories exist
function ensureDirs() {
  const dirs = [
    LEARNING_DIR,
    join(LEARNING_DIR, "ALGORITHM"),
    join(LEARNING_DIR, "OBSERVE"),
    join(LEARNING_DIR, "THINK"),
    join(LEARNING_DIR, "PLAN"),
    join(LEARNING_DIR, "BUILD"),
    join(LEARNING_DIR, "EXECUTE"),
    join(LEARNING_DIR, "VERIFY"),
    join(LEARNING_DIR, "sessions"),
    SIGNALS_DIR,
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

// Load ISC from path or current
function loadISC(path?: string): ISCTable | null {
  const iscPath = path || CURRENT_ISC_PATH;
  if (!existsSync(iscPath)) {
    return null;
  }
  try {
    const content = readFileSync(iscPath, "utf-8");
    if (!content.trim()) return null;
    return JSON.parse(content) as ISCTable;
  } catch {
    return null;
  }
}

// Generate unique ID
function generateId(): string {
  return `learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Extract capability performance from ISC
function extractCapabilityPerformance(isc: ISCTable): CapabilityPerformance[] {
  const capabilityMap = new Map<string, CapabilityPerformance>();

  for (const row of isc.rows) {
    if (!row.capability) continue;

    if (!capabilityMap.has(row.capability)) {
      capabilityMap.set(row.capability, {
        capability: row.capability,
        usageCount: 0,
        successCount: 0,
        adjustedCount: 0,
        blockedCount: 0,
        successRate: 0,
      });
    }

    const perf = capabilityMap.get(row.capability)!;
    perf.usageCount++;

    if (row.status === "DONE" || row.verifyResult === "PASS") {
      perf.successCount++;
    } else if (row.status === "ADJUSTED" || row.verifyResult === "ADJUSTED") {
      perf.adjustedCount++;
    } else if (row.status === "BLOCKED" || row.verifyResult === "BLOCKED") {
      perf.blockedCount++;
    }
  }

  // Calculate success rates
  for (const perf of capabilityMap.values()) {
    perf.successRate = perf.usageCount > 0
      ? Math.round((perf.successCount / perf.usageCount) * 100)
      : 0;
  }

  return Array.from(capabilityMap.values());
}

// Extract learnings from ISC
function extractLearnings(isc: ISCTable): Learning[] {
  const learnings: Learning[] = [];
  const timestamp = new Date().toISOString();

  const context = {
    request: isc.request,
    effort: isc.effort,
    iterations: isc.iteration,
    totalRows: isc.rows.length,
    completedRows: isc.rows.filter(r => r.status === "DONE").length,
  };

  // 1. Capability Performance Learnings
  const capPerf = extractCapabilityPerformance(isc);
  for (const perf of capPerf) {
    if (perf.usageCount >= 2) {
      const isEffective = perf.successRate >= 80;
      learnings.push({
        id: generateId(),
        timestamp,
        type: "capability",
        category: perf.capability.split(".")[0],
        title: `${perf.capability} Performance`,
        insight: isEffective
          ? `${perf.capability} performed well (${perf.successRate}% success rate across ${perf.usageCount} uses)`
          : `${perf.capability} had issues (${perf.successRate}% success rate, ${perf.blockedCount} blocked)`,
        context,
        actionable: !isEffective,
        tags: [perf.capability.split(".")[0], isEffective ? "effective" : "needs-attention"],
      });
    }
  }

  // 2. Estimation Accuracy Learning
  const completionRate = isc.rows.length > 0
    ? Math.round((context.completedRows / isc.rows.length) * 100)
    : 0;

  const estimationAccurate = isc.iteration <= 2 && completionRate >= 80;
  learnings.push({
    id: generateId(),
    timestamp,
    type: "estimation",
    title: `Effort Estimation for "${isc.request.slice(0, 50)}..."`,
    insight: estimationAccurate
      ? `${isc.effort} effort was appropriate (${completionRate}% completion in ${isc.iteration} iteration(s))`
      : `${isc.effort} effort may have been ${isc.iteration > 2 ? "under" : "over"}-estimated (${completionRate}% completion in ${isc.iteration} iteration(s))`,
    context,
    actionable: !estimationAccurate,
    tags: ["estimation", isc.effort.toLowerCase()],
  });

  // 3. Blocked Row Learnings (patterns of what doesn't work)
  const blockedRows = isc.rows.filter(r => r.status === "BLOCKED" || r.verifyResult === "BLOCKED");
  if (blockedRows.length > 0) {
    for (const row of blockedRows) {
      learnings.push({
        id: generateId(),
        timestamp,
        type: "pattern",
        category: "failure",
        title: `Blocked: ${row.description.slice(0, 50)}`,
        insight: `Row blocked: "${row.description}" - Reason: ${row.blockedReason || "Unknown"}`,
        context,
        actionable: true,
        tags: ["blocked", row.capability?.split(".")[0] || "unknown"],
      });
    }
  }

  // 4. Adjusted Row Learnings (what needed modification)
  const adjustedRows = isc.rows.filter(r => r.status === "ADJUSTED" || r.verifyResult === "ADJUSTED");
  if (adjustedRows.length > 0) {
    learnings.push({
      id: generateId(),
      timestamp,
      type: "pattern",
      category: "adjustment",
      title: `${adjustedRows.length} rows required adjustment`,
      insight: `Adjustments: ${adjustedRows.map(r => `"${r.description.slice(0, 30)}..." - ${r.adjustedReason || "unspecified"}`).join("; ")}`,
      context,
      actionable: true,
      tags: ["adjusted", "refinement-needed"],
    });
  }

  // 5. Iteration Learning (if multiple iterations)
  if (isc.iteration > 1) {
    // Parse log for loopback patterns
    const loopbacks = isc.log.filter(l => l.includes("→"));
    learnings.push({
      id: generateId(),
      timestamp,
      type: "phase",
      title: `Multi-iteration execution (${isc.iteration} iterations)`,
      insight: `Required ${isc.iteration} iterations to complete. Phase transitions: ${loopbacks.length} recorded.`,
      context,
      actionable: isc.iteration > 2,
      tags: ["iteration", "loopback"],
    });
  }

  // 6. General Success Learning
  if (completionRate >= 90 && isc.iteration === 1) {
    learnings.push({
      id: generateId(),
      timestamp,
      type: "general",
      title: "Successful first-iteration completion",
      insight: `Task "${isc.request.slice(0, 50)}..." completed in single iteration with ${completionRate}% completion rate. Effort: ${isc.effort}`,
      context,
      actionable: false,
      tags: ["success", "efficient"],
    });
  }

  return learnings;
}

// Save learning to file
function saveLearning(learning: Learning): string {
  ensureDirs();

  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];
  const filename = `${dateStr}-${learning.id}.json`;

  // Determine directory based on type
  let dir: string;
  switch (learning.type) {
    case "capability":
      dir = join(LEARNING_DIR, "EXECUTE");
      break;
    case "phase":
      dir = join(LEARNING_DIR, learning.category?.toUpperCase() || "ALGORITHM");
      break;
    case "estimation":
      dir = join(LEARNING_DIR, "PLAN");
      break;
    case "pattern":
      dir = join(LEARNING_DIR, "ALGORITHM");
      break;
    default:
      dir = join(LEARNING_DIR, "ALGORITHM");
  }

  const filepath = join(dir, filename);
  writeFileSync(filepath, JSON.stringify(learning, null, 2));

  return filepath;
}

// Append to patterns.jsonl
function appendPattern(pattern: Pattern): void {
  ensureDirs();
  const patternsPath = join(SIGNALS_DIR, "patterns.jsonl");
  appendFileSync(patternsPath, JSON.stringify(pattern) + "\n");
}

// Capture learnings from ISC
function captureLearnings(iscPath?: string): { learnings: Learning[]; files: string[] } {
  const isc = loadISC(iscPath);
  if (!isc) {
    throw new Error("No ISC found to capture learnings from");
  }

  if (isc.rows.length === 0) {
    throw new Error("ISC has no rows - nothing to learn from");
  }

  const learnings = extractLearnings(isc);
  const files: string[] = [];

  for (const learning of learnings) {
    const filepath = saveLearning(learning);
    files.push(filepath);

    // If it's a pattern, also append to patterns.jsonl
    if (learning.type === "pattern") {
      appendPattern({
        id: learning.id,
        timestamp: learning.timestamp,
        type: learning.category === "failure" ? "failure" : "success",
        pattern: learning.title,
        frequency: 1,
        recommendation: learning.insight,
        sourceItems: [isc.request],
      });
    }
  }

  // Create summary markdown
  const summaryPath = saveSummary(isc, learnings);
  files.push(summaryPath);

  return { learnings, files };
}

// Create markdown summary
function saveSummary(isc: ISCTable, learnings: Learning[]): string {
  ensureDirs();

  const date = new Date();
  const dateStr = date.toISOString().split("T")[0];
  const timeStr = date.toISOString().split("T")[1].slice(0, 5).replace(":", "");
  const slug = isc.request.slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `${dateStr}_${timeStr}_${slug}.md`;
  const filepath = join(LEARNING_DIR, "sessions", filename);

  const capPerf = extractCapabilityPerformance(isc);
  const completionRate = isc.rows.length > 0
    ? Math.round((isc.rows.filter(r => r.status === "DONE").length / isc.rows.length) * 100)
    : 0;

  let content = `---
request: "${isc.request.replace(/"/g, '\\"')}"
effort: ${isc.effort}
iterations: ${isc.iteration}
completion_rate: ${completionRate}%
learnings_captured: ${learnings.length}
captured_at: ${date.toISOString()}
---

# Learning Summary

**Request:** ${isc.request}

**Effort:** ${isc.effort} | **Iterations:** ${isc.iteration} | **Completion:** ${completionRate}%

## Capability Performance

| Capability | Uses | Success | Adjusted | Blocked | Rate |
|------------|------|---------|----------|---------|------|
`;

  for (const perf of capPerf) {
    content += `| ${perf.capability} | ${perf.usageCount} | ${perf.successCount} | ${perf.adjustedCount} | ${perf.blockedCount} | ${perf.successRate}% |\n`;
  }

  content += `
## Learnings Captured

`;

  for (const learning of learnings) {
    const actionableIcon = learning.actionable ? "⚠️" : "✅";
    content += `### ${actionableIcon} ${learning.title}

**Type:** ${learning.type} | **Tags:** ${learning.tags.join(", ")}

${learning.insight}

---

`;
  }

  content += `
## ISC Final State

| # | Description | Source | Capability | Status |
|---|-------------|--------|------------|--------|
`;

  for (const row of isc.rows) {
    const statusEmoji: Record<string, string> = {
      PENDING: "⏳",
      ACTIVE: "🔄",
      DONE: "✅",
      ADJUSTED: "🔧",
      BLOCKED: "🚫",
    };
    content += `| ${row.id} | ${row.description.slice(0, 40)}... | ${row.source} | ${row.capability || "-"} | ${statusEmoji[row.status]} ${row.status} |\n`;
  }

  writeFileSync(filepath, content);
  return filepath;
}

// List recent learnings
function listLearnings(limit: number = 10): void {
  ensureDirs();

  const allLearnings: { file: string; learning: Learning }[] = [];

  // Scan all learning directories
  const dirs = ["ALGORITHM", "OBSERVE", "THINK", "PLAN", "BUILD", "EXECUTE", "VERIFY"];
  for (const dir of dirs) {
    const dirPath = join(LEARNING_DIR, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = readFileSync(join(dirPath, file), "utf-8");
        const learning = JSON.parse(content) as Learning;
        allLearnings.push({ file: join(dir, file), learning });
      } catch {
        // Skip invalid files
      }
    }
  }

  // Sort by timestamp descending
  allLearnings.sort((a, b) =>
    new Date(b.learning.timestamp).getTime() - new Date(a.learning.timestamp).getTime()
  );

  // Display
  console.log(`\n📚 Recent Learnings (${Math.min(limit, allLearnings.length)} of ${allLearnings.length})\n`);
  console.log("─".repeat(80));

  for (const { file, learning } of allLearnings.slice(0, limit)) {
    const date = new Date(learning.timestamp).toLocaleDateString();
    const actionableIcon = learning.actionable ? "⚠️" : "✅";
    console.log(`\n${actionableIcon} ${learning.title}`);
    console.log(`   Type: ${learning.type} | Date: ${date} | Tags: ${learning.tags.join(", ")}`);
    console.log(`   ${learning.insight.slice(0, 100)}${learning.insight.length > 100 ? "..." : ""}`);
    console.log(`   File: ${file}`);
  }

  console.log("\n" + "─".repeat(80));
}

// Show statistics
function showStats(): void {
  ensureDirs();

  const stats = {
    total: 0,
    byType: {} as Record<string, number>,
    byTag: {} as Record<string, number>,
    actionable: 0,
    resolved: 0,
  };

  // Scan all learning directories
  const dirs = ["ALGORITHM", "OBSERVE", "THINK", "PLAN", "BUILD", "EXECUTE", "VERIFY"];
  for (const dir of dirs) {
    const dirPath = join(LEARNING_DIR, dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = readFileSync(join(dirPath, file), "utf-8");
        const learning = JSON.parse(content) as Learning;

        stats.total++;
        stats.byType[learning.type] = (stats.byType[learning.type] || 0) + 1;

        for (const tag of learning.tags) {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        }

        if (learning.actionable) {
          stats.actionable++;
        }
      } catch {
        // Skip invalid files
      }
    }
  }

  // Check patterns.jsonl
  const patternsPath = join(SIGNALS_DIR, "patterns.jsonl");
  let patternCount = 0;
  if (existsSync(patternsPath)) {
    const lines = readFileSync(patternsPath, "utf-8").trim().split("\n").filter(l => l);
    patternCount = lines.length;
  }

  console.log("\n📊 Learning Statistics\n");
  console.log("─".repeat(50));
  console.log(`Total Learnings: ${stats.total}`);
  console.log(`Actionable Items: ${stats.actionable}`);
  console.log(`Patterns Captured: ${patternCount}`);
  console.log("\nBy Type:");
  for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
  console.log("\nTop Tags:");
  const topTags = Object.entries(stats.byTag).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [tag, count] of topTags) {
    console.log(`  ${tag}: ${count}`);
  }
  console.log("\n" + "─".repeat(50));
}

// Main
async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "isc-path": { type: "string", short: "i" },
      limit: { type: "string", short: "l", default: "10" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  const command = positionals[0];

  if (values.help || !command) {
    console.log(`
LearningCapture - Extract and persist learnings from algorithm runs

USAGE:
  bun run LearningCapture.ts <command> [options]

COMMANDS:
  capture    Extract learnings from ISC and save to MEMORY/Learning/
  list       List recent learnings
  stats      Show learning statistics

OPTIONS:
  -i, --isc-path <path>  Path to ISC file (default: current ISC)
  -l, --limit <n>        Number of learnings to show (default: 10)
  -h, --help             Show this help

EXAMPLES:
  # Capture learnings from current ISC
  bun run LearningCapture.ts capture

  # Capture from specific ISC file
  bun run LearningCapture.ts capture -i ./archive-1234.json

  # List recent learnings
  bun run LearningCapture.ts list -l 20

  # Show statistics
  bun run LearningCapture.ts stats
`);
    return;
  }

  switch (command) {
    case "capture": {
      try {
        const result = captureLearnings(values["isc-path"]);
        console.log(`\n✅ Captured ${result.learnings.length} learnings\n`);
        console.log("Files created:");
        for (const file of result.files) {
          console.log(`  📄 ${file}`);
        }
        console.log("\nLearning types:");
        const byType = new Map<string, number>();
        for (const l of result.learnings) {
          byType.set(l.type, (byType.get(l.type) || 0) + 1);
        }
        for (const [type, count] of byType) {
          console.log(`  ${type}: ${count}`);
        }
      } catch (err) {
        console.error(`❌ Error: ${(err as Error).message}`);
        process.exit(1);
      }
      break;
    }

    case "list": {
      listLearnings(parseInt(values.limit || "10"));
      break;
    }

    case "stats": {
      showStats();
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help for usage information");
      process.exit(1);
  }
}

main().catch(console.error);
