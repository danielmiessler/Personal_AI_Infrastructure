#!/usr/bin/env bun
/**
 * GenerateSummary.ts - Generate skill usage summary reports
 *
 * CLI tool to analyze skill usage patterns and suggest improvements.
 *
 * Usage:
 *   bun run GenerateSummary.ts --period weekly
 *   bun run GenerateSummary.ts --since 2026-01-01
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PAI_DIR = process.env.PAI_DIR || join(homedir(), ".claude");
const SKILLS_LOG = join(PAI_DIR, "history", "skills-used.jsonl");
const SKILL_INDEX = join(PAI_DIR, "skills", "skill-index.json");

export interface SkillUsageEntry {
  timestamp: string;
  skill: string;
  session_id?: string;
  workflow?: string;
  context_tokens?: number;
}

/**
 * Parse JSONL content into array of entries
 */
export function parseJsonlEntries(content: string): SkillUsageEntry[] {
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((entry): entry is SkillUsageEntry => entry !== null);
}

/**
 * Aggregate entries by skill name
 */
export function aggregateBySkill(entries: SkillUsageEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.skill, (counts.get(entry.skill) || 0) + 1);
  }
  return counts;
}

/**
 * Filter entries by date range
 */
export function filterByDateRange(
  entries: SkillUsageEntry[],
  startDate: Date,
  endDate: Date
): SkillUsageEntry[] {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.timestamp);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

/**
 * Get all available skills from skill-index.json
 */
function getAvailableSkills(): string[] {
  try {
    if (!existsSync(SKILL_INDEX)) return [];
    const index = JSON.parse(readFileSync(SKILL_INDEX, "utf-8"));
    return index.skills?.map((s: { name: string }) => s.name) || [];
  } catch {
    return [];
  }
}

/**
 * Identify underutilized skills
 */
function findUnderutilizedSkills(
  usedSkills: Map<string, number>,
  availableSkills: string[]
): string[] {
  return availableSkills.filter(
    (skill) => !usedSkills.has(skill) || (usedSkills.get(skill) || 0) < 2
  );
}

/**
 * Generate markdown summary report
 */
function generateReport(
  entries: SkillUsageEntry[],
  periodLabel: string
): string {
  const counts = aggregateBySkill(entries);
  const availableSkills = getAvailableSkills();
  const underutilized = findUnderutilizedSkills(counts, availableSkills);

  // Sort by count descending
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  let report = `## Skill Usage Summary (${periodLabel})\n\n`;
  report += `### Most Used Skills\n`;

  if (sorted.length === 0) {
    report += `No skill usage recorded in this period.\n\n`;
  } else {
    for (let i = 0; i < Math.min(10, sorted.length); i++) {
      report += `${i + 1}. **${sorted[i][0]}** - ${sorted[i][1]} invocations\n`;
    }
    report += "\n";
  }

  if (underutilized.length > 0) {
    report += `### Underutilized Skills\n`;
    report += `Consider using these skills more:\n`;
    for (const skill of underutilized.slice(0, 5)) {
      report += `- ${skill}\n`;
    }
    report += "\n";
  }

  report += `### Summary Statistics\n`;
  report += `- Total invocations: ${entries.length}\n`;
  report += `- Unique skills used: ${counts.size}\n`;
  report += `- Available skills: ${availableSkills.length}\n`;

  return report;
}

/**
 * Parse command line arguments
 */
function parseArgs(): { since?: Date; period?: string } {
  const args = process.argv.slice(2);
  const result: { since?: Date; period?: string } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--since" && args[i + 1]) {
      result.since = new Date(args[i + 1]);
      i++;
    } else if (args[i] === "--period" && args[i + 1]) {
      result.period = args[i + 1];
      i++;
    }
  }

  return result;
}

/**
 * Get date range for period
 */
function getDateRangeForPeriod(period: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = now;
  let start: Date;
  let label: string;

  switch (period) {
    case "daily":
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      label = "Last 24 hours";
      break;
    case "weekly":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = "Last 7 days";
      break;
    case "monthly":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      label = "Last 30 days";
      break;
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = "Last 7 days";
  }

  return { start, end, label };
}

async function main() {
  const args = parseArgs();

  // Load skill usage log
  if (!existsSync(SKILLS_LOG)) {
    console.log("No skill usage data found. Start using skills to generate data!");
    process.exit(0);
  }

  const content = readFileSync(SKILLS_LOG, "utf-8");
  let entries = parseJsonlEntries(content);

  // Apply date filter
  let periodLabel: string;
  if (args.since) {
    entries = filterByDateRange(entries, args.since, new Date());
    periodLabel = `Since ${args.since.toISOString().split("T")[0]}`;
  } else {
    const { start, end, label } = getDateRangeForPeriod(args.period || "weekly");
    entries = filterByDateRange(entries, start, end);
    periodLabel = label;
  }

  // Generate and output report
  const report = generateReport(entries, periodLabel);
  console.log(report);
}

// Only run main when executed directly
if (import.meta.main) {
  main();
}
