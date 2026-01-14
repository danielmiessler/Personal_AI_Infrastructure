#!/usr/bin/env bun

/**
 * PreFlightCheck - Self-improving pre-flight advisor for THE ALGORITHM
 *
 * Consults past learnings at algorithm start to inform decision-making.
 * This closes the feedback loop, making the system self-improving.
 *
 * Research sources:
 * - Codex (gpt-5.2): Staged retrieval, scoring recommendations
 * - Gemini: SAOR schema, max 5 learnings, natural language synthesis
 * - Daniel Miessler's PAI: "Verifiability is everything", Two Loops Algorithm
 * - LangGraph: Episodic memory patterns
 *
 * Usage:
 *   bun run PreFlightCheck.ts check                    # Run preflight for current context
 *   bun run PreFlightCheck.ts check --request "..."   # With specific request context
 *   bun run PreFlightCheck.ts check --format json     # JSON output
 *   bun run PreFlightCheck.ts check --format markdown # Markdown output (default)
 */

import { parseArgs } from "util";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// ============================================================================
// TYPES
// ============================================================================

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

type EffortLevel = "TRIVIAL" | "QUICK" | "STANDARD" | "THOROUGH" | "DETERMINED";

interface ScoredLearning {
  learning: Learning;
  score: number;
  reasons: string[];
}

interface RiskWarning {
  severity: "high" | "medium" | "low";
  message: string;
  source: string;
  frequency?: number;
}

interface SuccessPattern {
  pattern: string;
  frequency: number;
  capability?: string;
}

interface Recommendation {
  type: "avoid" | "prefer" | "consider";
  message: string;
  confidence: number;
  source: string;
}

interface PreFlightReport {
  requestSummary: string;
  suggestedEffort: EffortLevel;
  relevantLearnings: ScoredLearning[];
  riskWarnings: RiskWarning[];
  successPatterns: SuccessPattern[];
  currentStreak: number;
  recentSuccessRate: number;
  recommendations: Recommendation[];
  suggestedCapabilities: string[];
  sourcesConsulted: string[];
  generatedAt: string;
}

// ============================================================================
// PATHS
// ============================================================================

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || "~", ".claude");
const MEMORY_DIR = join(PAI_DIR, "MEMORY");
const LEARNING_DIR = join(MEMORY_DIR, "Learning");
const SIGNALS_DIR = join(MEMORY_DIR, "Signals");
const STATE_DIR = join(MEMORY_DIR, "State");

const FAILURES_PATH = join(SIGNALS_DIR, "failures.jsonl");
const LOOPBACKS_PATH = join(SIGNALS_DIR, "loopbacks.jsonl");
const PATTERNS_PATH = join(SIGNALS_DIR, "patterns.jsonl");
const STATS_PATH = join(STATE_DIR, "algorithm-stats.json");
const STREAK_PATH = join(STATE_DIR, "algorithm-streak.json");

// ============================================================================
// DATA LOADING
// ============================================================================

function readJSONL<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").filter(line => line.trim()).map(line => {
    try {
      return JSON.parse(line) as T;
    } catch {
      return null;
    }
  }).filter((item): item is T => item !== null);
}

function loadLearnings(): Learning[] {
  const learnings: Learning[] = [];
  const phases = ["ALGORITHM", "OBSERVE", "THINK", "PLAN", "BUILD", "EXECUTE", "VERIFY"];

  for (const phase of phases) {
    const dirPath = join(LEARNING_DIR, phase);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const content = readFileSync(join(dirPath, file), "utf-8");
        const learning = JSON.parse(content) as Learning;
        learnings.push(learning);
      } catch {
        // Skip invalid files
      }
    }
  }

  return learnings;
}

function loadStats(): AlgorithmStats | null {
  if (!existsSync(STATS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATS_PATH, "utf-8")) as AlgorithmStats;
  } catch {
    return null;
  }
}

function loadStreak(): AlgorithmStreak | null {
  if (!existsSync(STREAK_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STREAK_PATH, "utf-8")) as AlgorithmStreak;
  } catch {
    return null;
  }
}

// ============================================================================
// SCORING ALGORITHM
// ============================================================================

/**
 * Calculate days since a timestamp
 */
function daysSince(timestamp: string): number {
  const then = new Date(timestamp).getTime();
  const now = Date.now();
  return Math.max(0, (now - then) / (1000 * 60 * 60 * 24));
}

/**
 * Recency decay function: e^(-0.1 * days)
 * Half-life of approximately 7 days
 */
function recencyDecay(timestamp: string): number {
  const days = daysSince(timestamp);
  return Math.exp(-0.1 * days);
}

/**
 * Calculate keyword overlap between request and learning
 */
function keywordMatch(request: string, learning: Learning): number {
  const requestWords = new Set(
    request.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  );

  // Combine learning title, tags, and context request
  const learningText = [
    learning.title,
    learning.insight,
    learning.context.request,
    ...learning.tags
  ].join(" ").toLowerCase();

  const learningWords = new Set(
    learningText.split(/\s+/).filter(w => w.length > 3)
  );

  // Calculate Jaccard-like overlap
  let matches = 0;
  for (const word of requestWords) {
    if (learningWords.has(word)) matches++;
  }

  return requestWords.size > 0 ? matches / requestWords.size : 0;
}

/**
 * Outcome weight based on learning type and actionability
 * Per Gemini: Success: 1.0, Recent Failure: 1.2, Old Failure: 0.5
 */
function outcomeWeight(learning: Learning): number {
  const days = daysSince(learning.timestamp);

  if (learning.type === "pattern" && learning.category === "failure") {
    // Recent failures weighted higher (warning value)
    return days < 7 ? 1.2 : 0.5;
  }

  if (learning.actionable) {
    // Actionable items get a boost
    return 1.1;
  }

  // Success patterns
  if (learning.type === "general" || !learning.actionable) {
    return 1.0;
  }

  return 0.8;
}

/**
 * Score a learning for relevance to current request
 * FinalScore = (ContextMatch × 0.4) + (OutcomeWeight × 0.3) + (RecencyDecay × 0.3)
 */
function scoreLearning(learning: Learning, request: string): ScoredLearning {
  const contextMatch = keywordMatch(request, learning);
  const outcome = outcomeWeight(learning);
  const recency = recencyDecay(learning.timestamp);

  const score = (contextMatch * 0.4) + (outcome * 0.3) + (recency * 0.3);

  const reasons: string[] = [];
  if (contextMatch > 0.3) reasons.push(`High keyword match (${(contextMatch * 100).toFixed(0)}%)`);
  if (outcome > 1) reasons.push(`Weighted outcome (${outcome.toFixed(1)}x)`);
  if (recency > 0.7) reasons.push(`Recent (${daysSince(learning.timestamp).toFixed(0)} days ago)`);

  return { learning, score, reasons };
}

// ============================================================================
// PATTERN ANALYSIS
// ============================================================================

/**
 * Extract risk warnings from failure signals and patterns
 */
function extractRiskWarnings(
  failures: FailureSignal[],
  patterns: Pattern[],
  request: string
): RiskWarning[] {
  const warnings: RiskWarning[] = [];

  // Recent failures (last 14 days)
  const recentFailures = failures.filter(f => daysSince(f.timestamp) < 14);

  // Group by criterion
  const criterionCounts = new Map<string, number>();
  for (const f of recentFailures) {
    const key = f.criterion.toLowerCase().slice(0, 50);
    criterionCounts.set(key, (criterionCounts.get(key) || 0) + 1);
  }

  // Create warnings for repeated failures
  for (const [criterion, count] of criterionCounts) {
    if (count >= 2) {
      warnings.push({
        severity: count >= 3 ? "high" : "medium",
        message: `"${criterion}" has failed ${count} times recently`,
        source: "failures.jsonl",
        frequency: count,
      });
    }
  }

  // Add pattern-based warnings
  const failurePatterns = patterns.filter(p => p.type === "failure");
  for (const p of failurePatterns) {
    warnings.push({
      severity: p.frequency >= 3 ? "high" : "medium",
      message: p.pattern,
      source: "patterns.jsonl",
      frequency: p.frequency,
    });
  }

  // Check loopback patterns
  const loopbackPatterns = patterns.filter(p => p.type === "loopback");
  for (const p of loopbackPatterns) {
    warnings.push({
      severity: "low",
      message: `${p.pattern} - Consider: ${p.recommendation}`,
      source: "patterns.jsonl",
      frequency: p.frequency,
    });
  }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return warnings.slice(0, 5); // Max 5 warnings
}

/**
 * Extract success patterns from learnings
 */
function extractSuccessPatterns(learnings: Learning[]): SuccessPattern[] {
  const patterns: SuccessPattern[] = [];

  // Find capability learnings with high success
  const capabilityLearnings = learnings.filter(
    l => l.type === "capability" && !l.actionable
  );

  for (const l of capabilityLearnings) {
    // Extract capability from category or tags
    const capability = l.category || l.tags.find(t => t.includes(".")) || undefined;
    patterns.push({
      pattern: l.insight.slice(0, 100),
      frequency: 1, // Could aggregate if we track more
      capability,
    });
  }

  // Find general success patterns
  const successLearnings = learnings.filter(
    l => l.type === "general" && l.tags.includes("success")
  );

  for (const l of successLearnings) {
    patterns.push({
      pattern: l.title,
      frequency: 1,
    });
  }

  return patterns.slice(0, 5);
}

/**
 * Generate recommendations based on learnings and patterns
 */
function generateRecommendations(
  scoredLearnings: ScoredLearning[],
  riskWarnings: RiskWarning[],
  successPatterns: SuccessPattern[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // From risk warnings
  for (const warning of riskWarnings.filter(w => w.severity === "high")) {
    recommendations.push({
      type: "avoid",
      message: warning.message,
      confidence: 0.8,
      source: warning.source,
    });
  }

  // From actionable learnings
  for (const { learning, score } of scoredLearnings.filter(s => s.learning.actionable && s.score > 0.3)) {
    recommendations.push({
      type: "consider",
      message: learning.insight.slice(0, 150),
      confidence: score,
      source: `Learning: ${learning.id}`,
    });
  }

  // From success patterns
  for (const pattern of successPatterns.slice(0, 2)) {
    recommendations.push({
      type: "prefer",
      message: pattern.pattern,
      confidence: 0.7,
      source: pattern.capability || "past success",
    });
  }

  // Sort by confidence
  recommendations.sort((a, b) => b.confidence - a.confidence);

  return recommendations.slice(0, 5);
}

/**
 * Suggest effort level based on historical data
 */
function suggestEffort(request: string, learnings: Learning[], stats: AlgorithmStats | null): EffortLevel {
  // Default to STANDARD
  let suggested: EffortLevel = "STANDARD";

  // Look for similar past requests
  const similar = learnings.filter(l => {
    const similarity = keywordMatch(request, l);
    return similarity > 0.3;
  });

  // If we have similar tasks, use their effort levels
  if (similar.length > 0) {
    const effortCounts = new Map<string, number>();
    for (const l of similar) {
      const effort = l.context.effort;
      effortCounts.set(effort, (effortCounts.get(effort) || 0) + 1);
    }

    // Find most common effort for similar tasks
    let maxCount = 0;
    for (const [effort, count] of effortCounts) {
      if (count > maxCount) {
        maxCount = count;
        suggested = effort as EffortLevel;
      }
    }
  }

  // Adjust based on complexity indicators in request
  const complexityIndicators = ["refactor", "redesign", "overhaul", "migrate", "architecture"];
  const simpleIndicators = ["fix", "typo", "update", "add", "tweak"];

  const requestLower = request.toLowerCase();

  if (complexityIndicators.some(w => requestLower.includes(w))) {
    // Bump up effort for complex tasks
    const levels: EffortLevel[] = ["TRIVIAL", "QUICK", "STANDARD", "THOROUGH", "DETERMINED"];
    const idx = levels.indexOf(suggested);
    if (idx < levels.length - 1) {
      suggested = levels[idx + 1];
    }
  } else if (simpleIndicators.some(w => requestLower.includes(w)) && requestLower.length < 50) {
    // Lower effort for simple tasks
    const levels: EffortLevel[] = ["TRIVIAL", "QUICK", "STANDARD", "THOROUGH", "DETERMINED"];
    const idx = levels.indexOf(suggested);
    if (idx > 0) {
      suggested = levels[idx - 1];
    }
  }

  return suggested;
}

/**
 * Suggest capabilities based on past performance
 */
function suggestCapabilities(
  request: string,
  learnings: Learning[],
  successPatterns: SuccessPattern[]
): string[] {
  const suggestions = new Set<string>();

  // From success patterns
  for (const p of successPatterns) {
    if (p.capability) {
      suggestions.add(p.capability);
    }
  }

  // From high-performing capability learnings
  const capLearnings = learnings.filter(
    l => l.type === "capability" && !l.actionable && l.category
  );

  for (const l of capLearnings) {
    if (l.category) {
      suggestions.add(l.category);
    }
  }

  return Array.from(suggestions).slice(0, 3);
}

// ============================================================================
// MAIN PREFLIGHT CHECK
// ============================================================================

function runPreFlightCheck(request: string): PreFlightReport {
  const sourcesConsulted: string[] = [];

  // Load all data sources
  const learnings = loadLearnings();
  sourcesConsulted.push(`MEMORY/Learning/ (${learnings.length} entries)`);

  const failures = readJSONL<FailureSignal>(FAILURES_PATH);
  sourcesConsulted.push(`failures.jsonl (${failures.length} entries)`);

  const loopbacks = readJSONL<LoopbackSignal>(LOOPBACKS_PATH);
  sourcesConsulted.push(`loopbacks.jsonl (${loopbacks.length} entries)`);

  const patterns = readJSONL<Pattern>(PATTERNS_PATH);
  sourcesConsulted.push(`patterns.jsonl (${patterns.length} entries)`);

  const stats = loadStats();
  if (stats) sourcesConsulted.push("algorithm-stats.json");

  const streak = loadStreak();
  if (streak) sourcesConsulted.push("algorithm-streak.json");

  // Score all learnings
  const scoredLearnings = learnings
    .map(l => scoreLearning(l, request))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Max 5 per Gemini recommendation

  // Extract patterns and warnings
  const riskWarnings = extractRiskWarnings(failures, patterns, request);
  const successPatterns = extractSuccessPatterns(learnings);

  // Generate recommendations
  const recommendations = generateRecommendations(scoredLearnings, riskWarnings, successPatterns);

  // Suggest effort and capabilities
  const suggestedEffort = suggestEffort(request, learnings, stats);
  const suggestedCapabilities = suggestCapabilities(request, learnings, successPatterns);

  // Calculate success rate
  const recentSuccessRate = stats && stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return {
    requestSummary: request.slice(0, 200),
    suggestedEffort,
    relevantLearnings: scoredLearnings,
    riskWarnings,
    successPatterns,
    currentStreak: streak?.current || 0,
    recentSuccessRate,
    recommendations,
    suggestedCapabilities,
    sourcesConsulted,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function formatMarkdown(report: PreFlightReport): string {
  let output = `
# PreFlight Check Report

**Generated:** ${new Date(report.generatedAt).toLocaleString()}
**Request:** ${report.requestSummary}

---

## Performance Context

| Metric | Value |
|--------|-------|
| Current Streak | ${report.currentStreak} |
| Success Rate | ${report.recentSuccessRate}% |
| Suggested Effort | **${report.suggestedEffort}** |

`;

  // Recommendations (the key output per Gemini's "Advisor" pattern)
  output += `## Relevant Experience

Based on past work, here are key learnings for this task:

`;

  if (report.recommendations.length === 0 && report.relevantLearnings.length === 0) {
    output += "_No relevant past experience found. This appears to be a new type of task._\n\n";
  } else {
    let counter = 1;

    // Risk warnings first
    for (const warning of report.riskWarnings.slice(0, 3)) {
      const icon = warning.severity === "high" ? "🚨" : warning.severity === "medium" ? "⚠️" : "💡";
      output += `${counter}. ${icon} **Risk**: ${warning.message}\n`;
      counter++;
    }

    // Success patterns
    for (const pattern of report.successPatterns.slice(0, 2)) {
      output += `${counter}. ✅ **Success Pattern**: ${pattern.pattern}\n`;
      counter++;
    }

    // Recommendations
    for (const rec of report.recommendations.slice(0, 2)) {
      const icon = rec.type === "avoid" ? "🚫" : rec.type === "prefer" ? "👍" : "💭";
      output += `${counter}. ${icon} **${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}**: ${rec.message}\n`;
      counter++;
    }
  }

  // Suggested capabilities
  if (report.suggestedCapabilities.length > 0) {
    output += `
## Suggested Capabilities

`;
    for (const cap of report.suggestedCapabilities) {
      output += `- ${cap}\n`;
    }
  }

  // Top relevant learnings (for context, not raw dump)
  if (report.relevantLearnings.length > 0 && report.relevantLearnings[0].score > 0.3) {
    output += `
## Most Relevant Past Work

`;
    for (const { learning, score, reasons } of report.relevantLearnings.slice(0, 3)) {
      if (score < 0.2) continue;
      output += `### ${learning.title}
- **Relevance:** ${(score * 100).toFixed(0)}% | **Type:** ${learning.type}
- **Insight:** ${learning.insight.slice(0, 150)}${learning.insight.length > 150 ? "..." : ""}
- **Tags:** ${learning.tags.join(", ")}

`;
    }
  }

  // Sources (audit trail)
  output += `
---

**Sources Consulted:** ${report.sourcesConsulted.join(" | ")}
`;

  return output;
}

function formatJSON(report: PreFlightReport): string {
  return JSON.stringify(report, null, 2);
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      request: { type: "string", short: "r" },
      format: { type: "string", short: "f", default: "markdown" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  const command = positionals[0];

  if (values.help || !command) {
    console.log(`
PreFlightCheck - Self-improving pre-flight advisor for THE ALGORITHM

USAGE:
  bun run PreFlightCheck.ts <command> [options]

COMMANDS:
  check      Run preflight check and generate recommendations

OPTIONS:
  -r, --request <text>   The task/request to analyze (default: generic check)
  -f, --format <type>    Output format: markdown (default) or json
  -h, --help             Show this help

EXAMPLES:
  # Run preflight check
  bun run PreFlightCheck.ts check

  # Run with specific request context
  bun run PreFlightCheck.ts check --request "Add user authentication"

  # Output as JSON
  bun run PreFlightCheck.ts check --format json

WHAT IT DOES:
  1. Loads past learnings from MEMORY/Learning/
  2. Analyzes failure patterns from MEMORY/Signals/
  3. Scores learnings for relevance to your request
  4. Synthesizes recommendations in natural language
  5. Suggests effort level and capabilities based on history

This tool closes the feedback loop, making THE ALGORITHM self-improving.
`);
    return;
  }

  switch (command) {
    case "check": {
      const request = values.request || "General algorithm execution";
      const report = runPreFlightCheck(request);

      const format = values.format || "markdown";
      if (format === "json") {
        console.log(formatJSON(report));
      } else {
        console.log(formatMarkdown(report));
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.error("Use --help for usage information");
      process.exit(1);
  }
}

main().catch(console.error);
