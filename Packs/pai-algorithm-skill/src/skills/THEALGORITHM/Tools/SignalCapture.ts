#!/usr/bin/env bun

/**
 * SignalCapture - Track failures, loopbacks, and patterns for THE ALGORITHM
 *
 * Maintains JSONL files in MEMORY/Signals/:
 * - failures.jsonl    - Every VERIFY failure with context
 * - loopbacks.jsonl   - Phase loopback events
 * - patterns.jsonl    - Aggregated patterns from failures/loopbacks
 * - ratings.jsonl     - User satisfaction ratings
 *
 * Usage:
 *   bun run SignalCapture.ts failure --work-item "task" --criterion "tests pass" --expected "all green" --observed "3 failing"
 *   bun run SignalCapture.ts loopback --work-item "task" --from VERIFY --to THINK --reason "unclear requirements"
 *   bun run SignalCapture.ts rating --work-item "task" --score 4 --feedback "good work"
 *   bun run SignalCapture.ts analyze   # Aggregate patterns from recent signals
 *   bun run SignalCapture.ts report    # Generate signal report
 */

import { parseArgs } from "util";
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";

// Types
interface FailureSignal {
  timestamp: string;
  workItem: string;
  phase: string;
  criterion: string;
  expected: string;
  observed: string;
  rootCause?: string;
  capability?: string;
}

interface LoopbackSignal {
  timestamp: string;
  workItem: string;
  fromPhase: string;
  toPhase: string;
  reason: string;
  iteration: number;
}

interface RatingSignal {
  timestamp: string;
  workItem: string;
  score: number; // 1-5
  feedback?: string;
  implicit: boolean; // true if inferred from behavior
}

interface Pattern {
  id: string;
  week: string;
  type: "failure" | "success" | "loopback";
  pattern: string;
  frequency: number;
  recommendation: string;
  sourceItems: string[];
  lastSeen: string;
}

interface AlgorithmStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalIterations: number;
  avgIterationsPerTask: number;
  totalLoopbacks: number;
  avgRating: number;
  ratingCount: number;
  lastUpdated: string;
}

interface AlgorithmStreak {
  current: number;
  best: number;
  lastSuccess: string | null;
  lastFailure: string | null;
}

// Paths
const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "~", ".claude");
const MEMORY_DIR = join(PAI_DIR, "MEMORY");
const SIGNALS_DIR = join(MEMORY_DIR, "Signals");
const STATE_DIR = join(MEMORY_DIR, "State");

const FAILURES_PATH = join(SIGNALS_DIR, "failures.jsonl");
const LOOPBACKS_PATH = join(SIGNALS_DIR, "loopbacks.jsonl");
const PATTERNS_PATH = join(SIGNALS_DIR, "patterns.jsonl");
const RATINGS_PATH = join(SIGNALS_DIR, "ratings.jsonl");
const STATS_PATH = join(STATE_DIR, "algorithm-stats.json");
const STREAK_PATH = join(STATE_DIR, "algorithm-streak.json");

// Ensure directories
function ensureDirs() {
  if (!existsSync(SIGNALS_DIR)) mkdirSync(SIGNALS_DIR, { recursive: true });
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

// Append to JSONL file
function appendSignal(path: string, data: object): void {
  ensureDirs();
  appendFileSync(path, JSON.stringify(data) + "\n");
}

// Read JSONL file
function readSignals<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map(line => JSON.parse(line) as T);
}

// Load or initialize stats
function loadStats(): AlgorithmStats {
  if (existsSync(STATS_PATH)) {
    return JSON.parse(readFileSync(STATS_PATH, "utf-8"));
  }
  return {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalIterations: 0,
    avgIterationsPerTask: 0,
    totalLoopbacks: 0,
    avgRating: 0,
    ratingCount: 0,
    lastUpdated: new Date().toISOString(),
  };
}

// Save stats
function saveStats(stats: AlgorithmStats): void {
  ensureDirs();
  stats.lastUpdated = new Date().toISOString();
  writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
}

// Load or initialize streak
function loadStreak(): AlgorithmStreak {
  if (existsSync(STREAK_PATH)) {
    return JSON.parse(readFileSync(STREAK_PATH, "utf-8"));
  }
  return {
    current: 0,
    best: 0,
    lastSuccess: null,
    lastFailure: null,
  };
}

// Save streak
function saveStreak(streak: AlgorithmStreak): void {
  ensureDirs();
  writeFileSync(STREAK_PATH, JSON.stringify(streak, null, 2));
}

// Record failure
function recordFailure(
  workItem: string,
  criterion: string,
  expected: string,
  observed: string,
  rootCause?: string,
  capability?: string
): FailureSignal {
  const signal: FailureSignal = {
    timestamp: new Date().toISOString(),
    workItem,
    phase: "VERIFY",
    criterion,
    expected,
    observed,
    rootCause,
    capability,
  };
  appendSignal(FAILURES_PATH, signal);

  // Update stats
  const stats = loadStats();
  stats.failedTasks++;
  saveStats(stats);

  // Update streak (reset on failure)
  const streak = loadStreak();
  streak.current = 0;
  streak.lastFailure = new Date().toISOString();
  saveStreak(streak);

  return signal;
}

// Record loopback
function recordLoopback(
  workItem: string,
  fromPhase: string,
  toPhase: string,
  reason: string,
  iteration: number
): LoopbackSignal {
  const signal: LoopbackSignal = {
    timestamp: new Date().toISOString(),
    workItem,
    fromPhase,
    toPhase,
    reason,
    iteration,
  };
  appendSignal(LOOPBACKS_PATH, signal);

  // Update stats
  const stats = loadStats();
  stats.totalLoopbacks++;
  saveStats(stats);

  return signal;
}

// Record rating
function recordRating(
  workItem: string,
  score: number,
  feedback?: string,
  implicit: boolean = false
): RatingSignal {
  const signal: RatingSignal = {
    timestamp: new Date().toISOString(),
    workItem,
    score: Math.max(1, Math.min(5, score)),
    feedback,
    implicit,
  };
  appendSignal(RATINGS_PATH, signal);

  // Update stats
  const stats = loadStats();
  const totalRatingSum = stats.avgRating * stats.ratingCount + score;
  stats.ratingCount++;
  stats.avgRating = totalRatingSum / stats.ratingCount;
  saveStats(stats);

  // Update streak based on rating
  const streak = loadStreak();
  if (score >= 4) {
    streak.current++;
    streak.best = Math.max(streak.best, streak.current);
    streak.lastSuccess = new Date().toISOString();
  } else if (score <= 2) {
    streak.current = 0;
    streak.lastFailure = new Date().toISOString();
  }
  saveStreak(streak);

  return signal;
}

// Record task completion
function recordTaskComplete(iterations: number, success: boolean): void {
  const stats = loadStats();
  stats.totalTasks++;
  stats.totalIterations += iterations;
  stats.avgIterationsPerTask = stats.totalIterations / stats.totalTasks;
  if (success) {
    stats.completedTasks++;
  }
  saveStats(stats);

  const streak = loadStreak();
  if (success) {
    streak.current++;
    streak.best = Math.max(streak.best, streak.current);
    streak.lastSuccess = new Date().toISOString();
  }
  saveStreak(streak);
}

// Get current week string
function getWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  const weekNum = Math.ceil(diff / oneWeek);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

// Analyze and aggregate patterns
function analyzePatterns(): Pattern[] {
  const failures = readSignals<FailureSignal>(FAILURES_PATH);
  const loopbacks = readSignals<LoopbackSignal>(LOOPBACKS_PATH);

  const week = getWeek();
  const patternMap = new Map<string, Pattern>();

  // Analyze failure patterns
  const failureReasons = new Map<string, string[]>();
  for (const f of failures) {
    const key = f.criterion.toLowerCase().slice(0, 50);
    if (!failureReasons.has(key)) {
      failureReasons.set(key, []);
    }
    failureReasons.get(key)!.push(f.workItem);
  }

  for (const [criterion, items] of failureReasons) {
    if (items.length >= 2) {
      const id = `fail_${criterion.replace(/\s+/g, "_").slice(0, 20)}`;
      patternMap.set(id, {
        id,
        week,
        type: "failure",
        pattern: `Repeated failure: "${criterion}"`,
        frequency: items.length,
        recommendation: `Review verification criteria for: ${criterion}`,
        sourceItems: [...new Set(items)],
        lastSeen: new Date().toISOString(),
      });
    }
  }

  // Analyze loopback patterns
  const loopbackPatterns = new Map<string, string[]>();
  for (const l of loopbacks) {
    const key = `${l.fromPhase}_to_${l.toPhase}`;
    if (!loopbackPatterns.has(key)) {
      loopbackPatterns.set(key, []);
    }
    loopbackPatterns.get(key)!.push(l.workItem);
  }

  for (const [transition, items] of loopbackPatterns) {
    if (items.length >= 2) {
      const [from, _, to] = transition.split("_");
      const id = `loop_${transition}`;
      patternMap.set(id, {
        id,
        week,
        type: "loopback",
        pattern: `Frequent loopback: ${from} → ${to}`,
        frequency: items.length,
        recommendation: `Improve ${to} phase to reduce loopbacks from ${from}`,
        sourceItems: [...new Set(items)],
        lastSeen: new Date().toISOString(),
      });
    }
  }

  // Write patterns
  const patterns = Array.from(patternMap.values());
  if (patterns.length > 0) {
    // Read existing patterns and merge
    const existingPatterns = readSignals<Pattern>(PATTERNS_PATH);
    const existingIds = new Set(existingPatterns.map(p => p.id));

    for (const pattern of patterns) {
      if (!existingIds.has(pattern.id)) {
        appendSignal(PATTERNS_PATH, pattern);
      }
    }
  }

  return patterns;
}

// Generate report
function generateReport(): string {
  const stats = loadStats();
  const streak = loadStreak();
  const failures = readSignals<FailureSignal>(FAILURES_PATH);
  const loopbacks = readSignals<LoopbackSignal>(LOOPBACKS_PATH);
  const patterns = readSignals<Pattern>(PATTERNS_PATH);
  const ratings = readSignals<RatingSignal>(RATINGS_PATH);

  // Get recent items (last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentFailures = failures.filter(f => f.timestamp > weekAgo);
  const recentLoopbacks = loopbacks.filter(l => l.timestamp > weekAgo);

  let report = `
# 📊 Algorithm Signal Report

**Generated:** ${new Date().toISOString()}

## Overview

| Metric | Value |
|--------|-------|
| Total Tasks | ${stats.totalTasks} |
| Completed | ${stats.completedTasks} |
| Failed | ${stats.failedTasks} |
| Success Rate | ${stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% |
| Avg Iterations | ${stats.avgIterationsPerTask.toFixed(1)} |
| Total Loopbacks | ${stats.totalLoopbacks} |
| Avg Rating | ${stats.avgRating.toFixed(1)}/5 (${stats.ratingCount} ratings) |

## Streak

| Metric | Value |
|--------|-------|
| Current Streak | ${streak.current} |
| Best Streak | ${streak.best} |
| Last Success | ${streak.lastSuccess || "Never"} |
| Last Failure | ${streak.lastFailure || "Never"} |

## Recent Activity (7 days)

- **Failures:** ${recentFailures.length}
- **Loopbacks:** ${recentLoopbacks.length}

## Active Patterns

`;

  if (patterns.length === 0) {
    report += "No patterns detected yet.\n";
  } else {
    report += "| Type | Pattern | Frequency | Recommendation |\n";
    report += "|------|---------|-----------|----------------|\n";
    for (const p of patterns.slice(-10)) {
      report += `| ${p.type} | ${p.pattern.slice(0, 30)}... | ${p.frequency} | ${p.recommendation.slice(0, 40)}... |\n`;
    }
  }

  report += `
## Recent Failures

`;

  if (recentFailures.length === 0) {
    report += "No failures in the last 7 days! 🎉\n";
  } else {
    report += "| Work Item | Criterion | Expected vs Observed |\n";
    report += "|-----------|-----------|----------------------|\n";
    for (const f of recentFailures.slice(-5)) {
      report += `| ${f.workItem.slice(0, 20)}... | ${f.criterion.slice(0, 20)}... | ${f.expected.slice(0, 15)} vs ${f.observed.slice(0, 15)} |\n`;
    }
  }

  report += `
## Recent Loopbacks

`;

  if (recentLoopbacks.length === 0) {
    report += "No loopbacks in the last 7 days! 🎉\n";
  } else {
    report += "| Work Item | From → To | Reason |\n";
    report += "|-----------|-----------|--------|\n";
    for (const l of recentLoopbacks.slice(-5)) {
      report += `| ${l.workItem.slice(0, 20)}... | ${l.fromPhase} → ${l.toPhase} | ${l.reason.slice(0, 30)}... |\n`;
    }
  }

  return report;
}

// Main
async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      "work-item": { type: "string", short: "w" },
      criterion: { type: "string", short: "c" },
      expected: { type: "string", short: "e" },
      observed: { type: "string", short: "o" },
      "root-cause": { type: "string" },
      capability: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      reason: { type: "string", short: "r" },
      iteration: { type: "string", short: "i", default: "1" },
      score: { type: "string", short: "s" },
      feedback: { type: "string", short: "f" },
      implicit: { type: "boolean" },
      success: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  const command = positionals[0];

  if (values.help || !command) {
    console.log(`
SignalCapture - Track failures, loopbacks, and patterns

USAGE:
  bun run SignalCapture.ts <command> [options]

COMMANDS:
  failure    Record a verification failure
  loopback   Record a phase loopback
  rating     Record a user rating
  complete   Record task completion
  analyze    Aggregate patterns from signals
  report     Generate signal report
  stats      Show current statistics

OPTIONS:
  -w, --work-item <name>   Work item/task name
  -c, --criterion <text>   Verification criterion (for failure)
  -e, --expected <text>    Expected value (for failure)
  -o, --observed <text>    Observed value (for failure)
  --root-cause <text>      Root cause analysis (for failure)
  --capability <name>      Capability used (for failure)
  --from <phase>           Source phase (for loopback)
  --to <phase>             Target phase (for loopback)
  -r, --reason <text>      Reason for loopback
  -i, --iteration <n>      Iteration number (default: 1)
  -s, --score <1-5>        Rating score (for rating)
  -f, --feedback <text>    User feedback (for rating)
  --implicit               Mark rating as implicit
  --success                Mark task as successful (for complete)
  -h, --help               Show this help

EXAMPLES:
  # Record a failure
  bun run SignalCapture.ts failure -w "Add auth" -c "tests pass" -e "all green" -o "3 failing"

  # Record a loopback
  bun run SignalCapture.ts loopback -w "Add auth" --from VERIFY --to THINK -r "unclear requirements"

  # Record a rating
  bun run SignalCapture.ts rating -w "Add auth" -s 4 -f "good work"

  # Record task completion
  bun run SignalCapture.ts complete -w "Add auth" -i 2 --success

  # Analyze patterns
  bun run SignalCapture.ts analyze

  # Generate report
  bun run SignalCapture.ts report
`);
    return;
  }

  switch (command) {
    case "failure": {
      if (!values["work-item"] || !values.criterion || !values.expected || !values.observed) {
        console.error("Error: --work-item, --criterion, --expected, and --observed are required");
        process.exit(1);
      }
      const signal = recordFailure(
        values["work-item"],
        values.criterion,
        values.expected,
        values.observed,
        values["root-cause"],
        values.capability
      );
      console.log(`❌ Failure recorded: ${signal.criterion}`);
      console.log(`   Expected: ${signal.expected}`);
      console.log(`   Observed: ${signal.observed}`);
      break;
    }

    case "loopback": {
      if (!values["work-item"] || !values.from || !values.to || !values.reason) {
        console.error("Error: --work-item, --from, --to, and --reason are required");
        process.exit(1);
      }
      const signal = recordLoopback(
        values["work-item"],
        values.from.toUpperCase(),
        values.to.toUpperCase(),
        values.reason,
        parseInt(values.iteration || "1")
      );
      console.log(`🔄 Loopback recorded: ${signal.fromPhase} → ${signal.toPhase}`);
      console.log(`   Reason: ${signal.reason}`);
      break;
    }

    case "rating": {
      if (!values["work-item"] || !values.score) {
        console.error("Error: --work-item and --score are required");
        process.exit(1);
      }
      const signal = recordRating(
        values["work-item"],
        parseInt(values.score),
        values.feedback,
        values.implicit || false
      );
      console.log(`⭐ Rating recorded: ${signal.score}/5`);
      if (signal.feedback) console.log(`   Feedback: ${signal.feedback}`);
      break;
    }

    case "complete": {
      if (!values["work-item"]) {
        console.error("Error: --work-item is required");
        process.exit(1);
      }
      recordTaskComplete(parseInt(values.iteration || "1"), values.success || false);
      console.log(`✅ Task completion recorded`);
      console.log(`   Iterations: ${values.iteration || 1}`);
      console.log(`   Success: ${values.success || false}`);
      break;
    }

    case "analyze": {
      const patterns = analyzePatterns();
      if (patterns.length === 0) {
        console.log("No new patterns detected.");
      } else {
        console.log(`\n🔍 Detected ${patterns.length} patterns:\n`);
        for (const p of patterns) {
          console.log(`  ${p.type === "failure" ? "❌" : "🔄"} ${p.pattern}`);
          console.log(`     Frequency: ${p.frequency} | Recommendation: ${p.recommendation}`);
        }
      }
      break;
    }

    case "report": {
      const report = generateReport();
      console.log(report);
      break;
    }

    case "stats": {
      const stats = loadStats();
      const streak = loadStreak();
      console.log("\n📊 Algorithm Statistics\n");
      console.log("─".repeat(40));
      console.log(`Total Tasks:      ${stats.totalTasks}`);
      console.log(`Completed:        ${stats.completedTasks}`);
      console.log(`Failed:           ${stats.failedTasks}`);
      console.log(`Success Rate:     ${stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%`);
      console.log(`Avg Iterations:   ${stats.avgIterationsPerTask.toFixed(1)}`);
      console.log(`Total Loopbacks:  ${stats.totalLoopbacks}`);
      console.log(`Avg Rating:       ${stats.avgRating.toFixed(1)}/5 (${stats.ratingCount} ratings)`);
      console.log("─".repeat(40));
      console.log(`Current Streak:   ${streak.current}`);
      console.log(`Best Streak:      ${streak.best}`);
      console.log("─".repeat(40));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help for usage information");
      process.exit(1);
  }
}

main().catch(console.error);
