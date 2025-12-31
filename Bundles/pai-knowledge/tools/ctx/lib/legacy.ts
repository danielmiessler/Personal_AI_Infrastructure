/**
 * Legacy & Identity Tracking Module
 *
 * Provides session summaries, topic growth tracking, synthesis rate metrics,
 * identity signals, and lineage preservation for the cultivation workflow.
 *
 * REQ-LEGACY-001: Session Summary on Completion
 * REQ-LEGACY-002: Topic Growth Tracking
 * REQ-LEGACY-003: Synthesis Rate Metric
 * REQ-LEGACY-004: Identity Signals
 * REQ-LEGACY-005: Archive with Lineage
 * REQ-LEGACY-006: Knowledge Base Health Dashboard
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, basename } from "path";
import { getConfig } from "./config";
import { parseNoteContent, generateFrontmatter } from "./parse";
import { searchNotes } from "./search";
import { FlashcardSession } from "./flashcard";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SessionSummary {
  notesProcessed: number;
  permanentNotesCreated: number;
  linksAdded: number;
  tagsEdited: number;
  topicGrowth: Map<string, number>;
  synthesisRate: number;
}

export interface GrowthMetrics {
  byTopic: Map<string, { current: number; previous: number; change: number }>;
  synthesisRate: { current: number; previous: number; periodDays: number };
  topGrowing: string[];
  neglected: string[];
}

export interface IdentitySignal {
  type: 'focus' | 'emerging' | 'core' | 'neglected';
  topic: string;
  detail: string;
}

export interface HealthReport {
  permanentNotes: { total: number; byType: Map<string, number> };
  topicCoverage: Map<string, number>;
  orphans: string[];
  hubs: Array<{ note: string; connections: number }>;
  recentActivity: { last7days: number; last30days: number };
}

export interface SessionLog {
  timestamp: Date;
  notesProcessed: number;
  permanentNotesCreated: number;
  linksAdded: number;
  tagsEdited: number;
  topicGrowth: Record<string, number>;
  synthesisRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Session Tracking
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get session log file path
 */
function getSessionLogPath(): string {
  const config = getConfig();
  const logDir = join(config.contextRoot, "sessions");
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return join(logDir, "cultivation-sessions.jsonl");
}

/**
 * Load session logs from file
 */
function loadSessionLogs(days: number = 365): SessionLog[] {
  const logPath = getSessionLogPath();
  if (!existsSync(logPath)) {
    return [];
  }

  const content = readFileSync(logPath, "utf-8");
  const lines = content.trim().split("\n").filter(l => l.trim());

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const logs: SessionLog[] = [];
  for (const line of lines) {
    try {
      const log = JSON.parse(line);
      log.timestamp = new Date(log.timestamp);
      if (log.timestamp >= cutoff) {
        logs.push(log);
      }
    } catch (err) {
      // Skip malformed lines
    }
  }

  return logs;
}

/**
 * Append session log to file
 */
function appendSessionLog(log: SessionLog): void {
  const logPath = getSessionLogPath();
  const line = JSON.stringify(log) + "\n";
  writeFileSync(logPath, line, { flag: "a" });
}

/**
 * Generate session summary from flashcard session
 */
export function generateSessionSummary(
  session: FlashcardSession,
  stats: {
    permanentNotesCreated: number;
    linksAdded: number;
    tagsEdited: number;
  }
): SessionSummary {
  const notesProcessed = session.completed.length;

  // Calculate topic growth by counting topics in completed notes
  const topicGrowth = new Map<string, number>();
  for (const notePath of session.completed) {
    const note = session.notes.find(n => n.path === notePath);
    if (note) {
      for (const tag of note.tags) {
        if (tag.startsWith("topic/")) {
          const count = topicGrowth.get(tag) || 0;
          topicGrowth.set(tag, count + 1);
        }
      }
    }
  }

  const synthesisRate = notesProcessed > 0
    ? stats.permanentNotesCreated / notesProcessed
    : 0;

  const summary: SessionSummary = {
    notesProcessed,
    permanentNotesCreated: stats.permanentNotesCreated,
    linksAdded: stats.linksAdded,
    tagsEdited: stats.tagsEdited,
    topicGrowth,
    synthesisRate,
  };

  // Save to session log
  const log: SessionLog = {
    timestamp: new Date(),
    notesProcessed: summary.notesProcessed,
    permanentNotesCreated: summary.permanentNotesCreated,
    linksAdded: summary.linksAdded,
    tagsEdited: summary.tagsEdited,
    topicGrowth: Object.fromEntries(topicGrowth),
    synthesisRate: summary.synthesisRate,
  };
  appendSessionLog(log);

  return summary;
}

/**
 * Format session summary for display
 */
export function formatSessionSummary(summary: SessionSummary): string {
  const separator = "═".repeat(63);
  const divider = "─".repeat(63);

  const lines: string[] = [];
  lines.push(separator);
  lines.push("  SESSION COMPLETE");
  lines.push(separator);
  lines.push(`  Processed: ${summary.notesProcessed} notes`);
  lines.push(`  Created:   ${summary.permanentNotesCreated} permanent notes`);
  lines.push(`  Linked:    ${summary.linksAdded} connections`);
  lines.push(`  Tagged:    ${summary.tagsEdited} corrections`);

  if (summary.topicGrowth.size > 0) {
    lines.push(divider);
    lines.push("  TOPIC GROWTH:");
    for (const [topic, count] of summary.topicGrowth) {
      const topicName = topic.replace("topic/", "");
      lines.push(`    ${topicName}: +${count}`);
    }
  }

  lines.push(divider);
  const rate = Math.round(summary.synthesisRate * 100);
  const ratio = `${summary.permanentNotesCreated}/${summary.notesProcessed}`;
  lines.push(`  Synthesis rate: ${rate}% (${ratio})`);
  lines.push(separator);

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// Growth Metrics
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate growth metrics over time period
 */
export async function calculateGrowthMetrics(days: number = 30): Promise<GrowthMetrics> {
  const config = getConfig();
  const vaultPath = config.vaultPath;

  // Get current permanent note counts by topic
  const permanentNotes = await searchNotes({
    tags: ["type/permanent"],
    scope: "all",
  });

  const currentCounts = new Map<string, number>();
  for (const note of permanentNotes) {
    for (const tag of note.tags) {
      if (tag.startsWith("topic/")) {
        const count = currentCounts.get(tag) || 0;
        currentCounts.set(tag, count + 1);
      }
    }
  }

  // Get historical counts from notes created before cutoff
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const previousCounts = new Map<string, number>();
  for (const note of permanentNotes) {
    if (note.mtime < cutoffDate) {
      for (const tag of note.tags) {
        if (tag.startsWith("topic/")) {
          const count = previousCounts.get(tag) || 0;
          previousCounts.set(tag, count + 1);
        }
      }
    }
  }

  // Calculate changes
  const byTopic = new Map<string, { current: number; previous: number; change: number }>();
  const allTopics = new Set([...currentCounts.keys(), ...previousCounts.keys()]);

  for (const topic of allTopics) {
    const current = currentCounts.get(topic) || 0;
    const previous = previousCounts.get(topic) || 0;
    const change = current - previous;
    byTopic.set(topic, { current, previous, change });
  }

  // Find top growing topics
  const topGrowing = Array.from(byTopic.entries())
    .filter(([_, stats]) => stats.change > 0)
    .sort((a, b) => b[1].change - a[1].change)
    .slice(0, 5)
    .map(([topic, _]) => topic);

  // Find neglected topics (no new notes in period, but had previous activity)
  const neglected = Array.from(byTopic.entries())
    .filter(([_, stats]) => stats.previous > 0 && stats.change === 0)
    .map(([topic, _]) => topic);

  // Calculate synthesis rate from session logs
  const logs = loadSessionLogs(days);
  let totalProcessed = 0;
  let totalCreated = 0;
  for (const log of logs) {
    totalProcessed += log.notesProcessed;
    totalCreated += log.permanentNotesCreated;
  }
  const currentRate = totalProcessed > 0 ? totalCreated / totalProcessed : 0;

  // Calculate previous period rate
  const previousLogs = loadSessionLogs(days * 2).filter(log => {
    const age = Date.now() - log.timestamp.getTime();
    const dayAge = age / (1000 * 60 * 60 * 24);
    return dayAge >= days && dayAge < days * 2;
  });
  let prevProcessed = 0;
  let prevCreated = 0;
  for (const log of previousLogs) {
    prevProcessed += log.notesProcessed;
    prevCreated += log.permanentNotesCreated;
  }
  const previousRate = prevProcessed > 0 ? prevCreated / prevProcessed : 0;

  return {
    byTopic,
    synthesisRate: {
      current: currentRate,
      previous: previousRate,
      periodDays: days,
    },
    topGrowing,
    neglected,
  };
}

/**
 * Format growth metrics for display
 */
export function formatGrowthMetrics(metrics: GrowthMetrics): string {
  const separator = "═".repeat(67);
  const divider = "─".repeat(67);

  const lines: string[] = [];
  lines.push(separator);
  lines.push("  KNOWLEDGE GROWTH TRENDS");
  lines.push(separator);

  // Synthesis rate
  const currentRate = Math.round(metrics.synthesisRate.current * 100);
  const previousRate = Math.round(metrics.synthesisRate.previous * 100);
  const rateChange = currentRate - previousRate;
  const rateArrow = rateChange > 0 ? "↑" : rateChange < 0 ? "↓" : "→";

  lines.push(`  Synthesis Rate (${metrics.synthesisRate.periodDays}d):`);
  lines.push(`    Current:  ${currentRate}% ${rateArrow} ${Math.abs(rateChange)}% vs previous period`);
  lines.push("");

  // Top growing topics
  if (metrics.topGrowing.length > 0) {
    lines.push(divider);
    lines.push("  TOP GROWING TOPICS:");
    for (const topic of metrics.topGrowing) {
      const stats = metrics.byTopic.get(topic);
      if (stats) {
        const topicName = topic.replace("topic/", "");
        lines.push(`    ${topicName}: ${stats.previous} → ${stats.current} (+${stats.change})`);
      }
    }
    lines.push("");
  }

  // Neglected topics
  if (metrics.neglected.length > 0) {
    lines.push(divider);
    lines.push("  NEGLECTED TOPICS:");
    for (const topic of metrics.neglected.slice(0, 5)) {
      const topicName = topic.replace("topic/", "");
      lines.push(`    ${topicName}: No new notes in ${metrics.synthesisRate.periodDays} days`);
    }
    lines.push("");
  }

  lines.push(separator);
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// Identity Signals
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze identity signals from knowledge patterns
 */
export async function analyzeIdentitySignals(): Promise<IdentitySignal[]> {
  const signals: IdentitySignal[] = [];

  // Get all permanent notes
  const permanentNotes = await searchNotes({
    tags: ["type/permanent"],
    scope: "all",
  });

  // Count notes by topic with timestamps
  const topicActivity = new Map<string, Date[]>();
  for (const note of permanentNotes) {
    for (const tag of note.tags) {
      if (tag.startsWith("topic/")) {
        const dates = topicActivity.get(tag) || [];
        dates.push(note.mtime);
        topicActivity.set(tag, dates);
      }
    }
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);

  // Analyze each topic
  for (const [topic, dates] of topicActivity) {
    const topicName = topic.replace("topic/", "");

    // Focus: Most activity in last 7 days
    const recentCount = dates.filter(d => d >= oneWeekAgo).length;

    // Emerging: Rapid growth (>50% increase) in last 30 days
    const lastMonthCount = dates.filter(d => d >= oneMonthAgo).length;
    const previousMonthCount = dates.filter(d =>
      d < oneMonthAgo && d >= new Date(oneMonthAgo.getTime() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const growthRate = previousMonthCount > 0
      ? (lastMonthCount - previousMonthCount) / previousMonthCount
      : 0;

    // Core: Consistent activity over 6+ months
    const isCore = dates.filter(d => d >= sixMonthsAgo).length >= 5 &&
                   dates.some(d => d < sixMonthsAgo);

    // Neglected: No new notes in 3 weeks, but had previous activity
    const lastActivityDate = dates.sort((a, b) => b.getTime() - a.getTime())[0];
    const isNeglected = lastActivityDate < threeWeeksAgo && dates.length > 0;

    // Add signals
    if (recentCount >= 3) {
      signals.push({
        type: 'focus',
        topic: topicName,
        detail: `${recentCount} notes created in last 7 days`,
      });
    }

    if (growthRate > 0.5 && lastMonthCount >= 3) {
      const pct = Math.round(growthRate * 100);
      signals.push({
        type: 'emerging',
        topic: topicName,
        detail: `${pct}% growth in last 30 days (${lastMonthCount} notes)`,
      });
    }

    if (isCore) {
      const totalNotes = dates.length;
      const ageMonths = Math.floor(
        (now.getTime() - Math.min(...dates.map(d => d.getTime()))) / (30 * 24 * 60 * 60 * 1000)
      );
      signals.push({
        type: 'core',
        topic: topicName,
        detail: `Long-running interest: ${totalNotes} notes over ${ageMonths} months`,
      });
    }

    if (isNeglected) {
      const daysSince = Math.floor(
        (now.getTime() - lastActivityDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      signals.push({
        type: 'neglected',
        topic: topicName,
        detail: `No new notes in ${daysSince} days`,
      });
    }
  }

  // Sort: focus > emerging > core > neglected
  const typeOrder: Record<string, number> = { focus: 0, emerging: 1, core: 2, neglected: 3 };
  signals.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return signals;
}

/**
 * Format identity signals for display
 */
export function formatIdentitySignals(signals: IdentitySignal[]): string {
  const separator = "═".repeat(67);
  const divider = "─".repeat(67);

  const lines: string[] = [];
  lines.push(separator);
  lines.push("  KNOWLEDGE IDENTITY SIGNALS");
  lines.push(separator);

  // Group by type
  const byType = new Map<string, IdentitySignal[]>();
  for (const signal of signals) {
    const group = byType.get(signal.type) || [];
    group.push(signal);
    byType.set(signal.type, group);
  }

  // Focus
  const focus = byType.get('focus');
  if (focus && focus.length > 0) {
    lines.push("  CURRENT FOCUS:");
    for (const signal of focus.slice(0, 3)) {
      lines.push(`    → ${signal.topic}: ${signal.detail}`);
    }
    lines.push("");
  }

  // Emerging
  const emerging = byType.get('emerging');
  if (emerging && emerging.length > 0) {
    lines.push(divider);
    lines.push("  EMERGING INTERESTS:");
    for (const signal of emerging.slice(0, 3)) {
      lines.push(`    → ${signal.topic}: ${signal.detail}`);
    }
    lines.push("");
  }

  // Core
  const core = byType.get('core');
  if (core && core.length > 0) {
    lines.push(divider);
    lines.push("  CORE INTERESTS:");
    for (const signal of core.slice(0, 3)) {
      lines.push(`    → ${signal.topic}: ${signal.detail}`);
    }
    lines.push("");
  }

  // Neglected
  const neglected = byType.get('neglected');
  if (neglected && neglected.length > 0) {
    lines.push(divider);
    lines.push("  NEGLECTED AREAS:");
    for (const signal of neglected.slice(0, 3)) {
      lines.push(`    → ${signal.topic}: ${signal.detail}`);
    }
    lines.push("");
  }

  lines.push(separator);
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// Health Report
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate knowledge base health report
 */
export async function generateHealthReport(): Promise<HealthReport> {
  const config = getConfig();

  // Get all permanent notes
  const permanentNotes = await searchNotes({
    tags: ["type/permanent"],
    scope: "all",
  });

  // Count by type
  const byType = new Map<string, number>();
  const topicCoverage = new Map<string, number>();

  for (const note of permanentNotes) {
    // Count types
    for (const tag of note.tags) {
      if (tag.startsWith("type/")) {
        const count = byType.get(tag) || 0;
        byType.set(tag, count + 1);
      }
      if (tag.startsWith("topic/")) {
        const count = topicCoverage.get(tag) || 0;
        topicCoverage.set(tag, count + 1);
      }
    }
  }

  // Find orphans (no wikilinks)
  const orphans: string[] = [];
  const connections = new Map<string, number>();

  for (const note of permanentNotes) {
    const content = readFileSync(note.path, "utf-8");
    const links = content.match(/\[\[([^\]]+)\]\]/g) || [];
    const linkCount = links.length;

    connections.set(note.name, linkCount);

    if (linkCount === 0) {
      orphans.push(note.name);
    }
  }

  // Find hubs (most connected notes)
  const hubs = Array.from(connections.entries())
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([note, count]) => ({ note, connections: count }));

  // Recent activity
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const last7days = permanentNotes.filter(n => n.mtime >= sevenDaysAgo).length;
  const last30days = permanentNotes.filter(n => n.mtime >= thirtyDaysAgo).length;

  return {
    permanentNotes: {
      total: permanentNotes.length,
      byType,
    },
    topicCoverage,
    orphans,
    hubs,
    recentActivity: { last7days, last30days },
  };
}

/**
 * Format health report for display
 */
export function formatHealthReport(report: HealthReport): string {
  const separator = "═".repeat(67);
  const divider = "─".repeat(67);

  const lines: string[] = [];
  lines.push(separator);
  lines.push("  KNOWLEDGE BASE HEALTH REPORT");
  lines.push(separator);

  // Permanent notes
  lines.push(`  Total Permanent Notes: ${report.permanentNotes.total}`);
  lines.push("");

  // By type
  if (report.permanentNotes.byType.size > 0) {
    lines.push(divider);
    lines.push("  BY TYPE:");
    for (const [type, count] of report.permanentNotes.byType) {
      const typeName = type.replace("type/", "");
      lines.push(`    ${typeName}: ${count}`);
    }
    lines.push("");
  }

  // Topic coverage
  if (report.topicCoverage.size > 0) {
    lines.push(divider);
    lines.push("  TOPIC COVERAGE:");
    const topTopics = Array.from(report.topicCoverage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [topic, count] of topTopics) {
      const topicName = topic.replace("topic/", "");
      lines.push(`    ${topicName}: ${count} notes`);
    }
    lines.push("");
  }

  // Orphans
  lines.push(divider);
  lines.push(`  Orphan Notes (no links): ${report.orphans.length}`);
  if (report.orphans.length > 0) {
    const shown = report.orphans.slice(0, 5);
    for (const orphan of shown) {
      lines.push(`    → ${orphan}`);
    }
    if (report.orphans.length > 5) {
      lines.push(`    ... and ${report.orphans.length - 5} more`);
    }
  }
  lines.push("");

  // Hubs
  if (report.hubs.length > 0) {
    lines.push(divider);
    lines.push("  MOST CONNECTED NOTES:");
    for (const hub of report.hubs.slice(0, 5)) {
      lines.push(`    → ${hub.note}: ${hub.connections} links`);
    }
    lines.push("");
  }

  // Recent activity
  lines.push(divider);
  lines.push("  RECENT ACTIVITY:");
  lines.push(`    Last 7 days:  ${report.recentActivity.last7days} notes`);
  lines.push(`    Last 30 days: ${report.recentActivity.last30days} notes`);
  lines.push(separator);

  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// Lineage Tracking
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Archive notes with lineage preservation
 * Updates source notes with synthesized_into link
 * Updates permanent note with synthesized_from links
 */
export async function archiveWithLineage(
  sourceNotePaths: string[],
  permanentNotePath: string
): Promise<void> {
  const permanentNoteName = basename(permanentNotePath, ".md");

  // Update each source note
  for (const sourcePath of sourceNotePaths) {
    const sourceContent = readFileSync(sourcePath, "utf-8");
    const { frontmatter, body } = parseNoteContent(sourceContent);

    // Add synthesized_into
    frontmatter.synthesized_into = `[[${permanentNoteName}]]`;

    // Update status to archived
    if (frontmatter.tags) {
      // Remove status/captured, add status/archived
      frontmatter.tags = frontmatter.tags
        .filter((t: string) => !t.startsWith("status/"))
        .concat(["status/archived"]);
    }

    // Write back
    const updatedContent = generateFrontmatter(frontmatter) + "\n" + body;
    writeFileSync(sourcePath, updatedContent, "utf-8");
  }

  // Update permanent note
  const permanentContent = readFileSync(permanentNotePath, "utf-8");
  const { frontmatter: permFrontmatter, body: permBody } = parseNoteContent(permanentContent);

  // Add synthesized_from
  const sourceNames = sourceNotePaths.map(p => basename(p, ".md"));
  permFrontmatter.synthesized_from = sourceNames.map(n => `[[${n}]]`).join(", ");

  // Write back
  const updatedPermContent = generateFrontmatter(permFrontmatter) + "\n" + permBody;
  writeFileSync(permanentNotePath, updatedPermContent, "utf-8");
}
