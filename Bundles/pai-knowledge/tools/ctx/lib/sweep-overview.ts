/**
 * sweep-overview.ts - Sweep Overview Stats
 *
 * Provides inbox statistics as lead-in before triage table.
 * Uses the same searchNotes function as sweep command for consistency.
 *
 * REQ-OVERVIEW-001 to REQ-OVERVIEW-004 from interactive-sweep OpenSpec
 */

import { basename } from "path";
import { searchNotes, type SearchResult } from "./search";
import { getConfig } from "./config";

// ============================================================================
// Types
// ============================================================================

export interface SweepOverviewStats {
  total: number;
  today: number; // Last 24h
  thisWeek: number; // 2-7 days
  thisMonth: number; // 8-30 days
  older: number; // 31+ days
  genericNameCount: number;
  namedCount: number;
}

export type AgeBucket = "today" | "thisWeek" | "thisMonth" | "older";

// ============================================================================
// Constants
// ============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;

// Patterns for generic (auto-generated) note names
// Optional date prefix: YYYY-MM-DD- (added by ingest pipeline)
const DATE_PREFIX = "(?:\\d{4}-\\d{2}-\\d{2}-)?";
const GENERIC_NAME_PATTERNS = [
  new RegExp(`^${DATE_PREFIX}Document-\\w+-Raw-\\d+$`),
  new RegExp(`^${DATE_PREFIX}Image-\\w+-Raw-\\d+$`),
  new RegExp(`^${DATE_PREFIX}Voice-\\w+-Raw-\\d+$`),
  new RegExp(`^${DATE_PREFIX}Video-\\w+-Raw-\\d+$`),
  new RegExp(`^${DATE_PREFIX}File-\\w+-Raw-\\d+$`),
  new RegExp(`^${DATE_PREFIX}Untitled-\\d+$`),
  new RegExp(`^${DATE_PREFIX}New-Note-\\d+$`),
];

// ============================================================================
// Age Bucket Classification
// ============================================================================

/**
 * Classify a file's age into buckets based on mtime
 */
function classifyAge(mtime: Date, now: number): AgeBucket {
  const age = now - mtime.getTime();
  const days = age / DAY_MS;

  if (days < 1) return "today";
  if (days < 7) return "thisWeek";
  if (days < 30) return "thisMonth";
  return "older";
}

/**
 * Check if a note name is generic (auto-generated)
 */
export function isGenericName(name: string): boolean {
  // Remove .md extension
  const baseName = name.replace(/\.md$/, "");
  return GENERIC_NAME_PATTERNS.some((pattern) => pattern.test(baseName));
}

// ============================================================================
// Stats Collection
// ============================================================================

/**
 * Get overview statistics for inbox notes
 * Uses searchNotes with status/inbox tag for consistency with sweep command
 */
export async function getSweepOverviewStats(): Promise<SweepOverviewStats> {
  const stats: SweepOverviewStats = {
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    older: 0,
    genericNameCount: 0,
    namedCount: 0,
  };

  try {
    // Use same search as sweep command - status/inbox tag, exclude archived
    // Use scope: "all" to include notes regardless of work/private scope
    const results = await searchNotes({
      tags: ["status/inbox"],
      notTags: ["status/archived"],
      scope: "all",
    });

    const now = Date.now();

    for (const result of results) {
      stats.total++;

      // Use mtime for age classification
      const bucket = classifyAge(result.mtime, now);
      stats[bucket]++;

      // Check if generic name
      if (isGenericName(result.name)) {
        stats.genericNameCount++;
      } else {
        stats.namedCount++;
      }
    }
  } catch (error) {
    // Return zeros if search fails
  }

  return stats;
}

/**
 * Legacy function that scans a specific inbox folder
 * Kept for backwards compatibility with tests
 */
export async function getSweepOverviewStatsFromPath(inboxPath: string): Promise<SweepOverviewStats> {
  const { readdir, stat } = await import("fs/promises");
  const { join } = await import("path");

  const stats: SweepOverviewStats = {
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    older: 0,
    genericNameCount: 0,
    namedCount: 0,
  };

  try {
    const entries = await readdir(inboxPath, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      // Only count markdown files
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      stats.total++;

      // Get file stats for age classification
      const fullPath = join(inboxPath, entry.name);
      const fileStat = await stat(fullPath);
      const bucket = classifyAge(fileStat.mtime, now);
      stats[bucket]++;

      // Check if generic name
      if (isGenericName(entry.name)) {
        stats.genericNameCount++;
      } else {
        stats.namedCount++;
      }
    }
  } catch (error) {
    // Return zeros if inbox doesn't exist or can't be read
  }

  return stats;
}

// ============================================================================
// Effort Estimation
// ============================================================================

/**
 * Get effort estimate string based on note count
 */
export function getEffortEstimate(count: number): string {
  if (count <= 0) {
    return "🎉 Inbox zero!";
  }
  if (count <= 10) {
    return "Quick review (~5 min)";
  }
  if (count <= 30) {
    return "Moderate session (~15 min)";
  }
  if (count <= 50) {
    return "Extended session (~30 min)";
  }
  return "Consider using --auto mode for bulk processing";
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format overview stats for display
 */
export function formatOverviewStats(stats: SweepOverviewStats): string {
  const lines: string[] = [];

  lines.push("📊 INBOX OVERVIEW");
  lines.push("─".repeat(56));
  lines.push(`  Total notes needing attention: ${stats.total}`);
  lines.push("");
  lines.push("  📅 BY AGE:");
  lines.push(`     Today:      ${stats.today.toString().padStart(3)} notes`);
  lines.push(`     This week:  ${stats.thisWeek.toString().padStart(3)} notes`);
  lines.push(`     This month: ${stats.thisMonth.toString().padStart(3)} notes`);
  lines.push(`     Older:      ${stats.older.toString().padStart(3)} notes`);

  // Naming stats
  if (stats.total > 0) {
    const genericPercent = Math.round((stats.genericNameCount / stats.total) * 100);
    lines.push("");
    lines.push("  📛 NAMING:");
    lines.push(`     Generic names: ${stats.genericNameCount} (${genericPercent}%)`);
    lines.push(`     Named:         ${stats.namedCount} (${100 - genericPercent}%)`);
  }

  // Effort estimate
  lines.push("");
  lines.push(`  ⏱️  ${getEffortEstimate(stats.total)}`);

  // Auto mode suggestion for large inboxes
  if (stats.total > 50) {
    lines.push(`     💡 Consider: ctx sweep --auto --confidence high`);
  }

  lines.push("─".repeat(56));

  return lines.join("\n");
}
