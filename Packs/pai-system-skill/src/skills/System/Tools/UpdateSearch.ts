#!/usr/bin/env bun
/**
 * UpdateSearch - Search and query system updates
 *
 * Usage:
 *   bun UpdateSearch.ts list                  # List all updates
 *   bun UpdateSearch.ts recent [N]            # Last N updates (default: 10)
 *   bun UpdateSearch.ts search <term>         # Search by keyword
 *   bun UpdateSearch.ts by-type <type>        # Filter by type
 *   bun UpdateSearch.ts by-date <YYYY-MM>     # Filter by month
 *   bun UpdateSearch.ts by-impact <impact>    # Filter by impact level
 *   bun UpdateSearch.ts show <id>             # Show full update details
 */

import { readFile } from "fs/promises";
import { join } from "path";

const PAI_DIR = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
const UPDATES_DIR = join(PAI_DIR, "MEMORY/PAISYSTEMUPDATES");
const INDEX_PATH = join(UPDATES_DIR, "index.json");

interface UpdateRecord {
  id: string;
  date: string;
  timestamp?: string;  // New schema
  title: string;
  type?: string;  // Legacy
  impact?: string;  // Legacy
  significance?: string;  // New schema
  change_type?: string;  // New schema
  version?: string;
  tags: string[];
  files_affected: string[];
  summary?: string;
  file_path: string;
}

interface UpdateIndex {
  last_updated: string;
  total_updates: number;
  by_year: Record<string, { count: number; months: string[] }>;
  by_significance?: Record<string, number>;
  by_change_type?: Record<string, number>;
  by_type?: Record<string, number>;  // Legacy
  updates: UpdateRecord[];
}

async function loadIndex(): Promise<UpdateIndex> {
  try {
    const content = await readFile(INDEX_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    console.error("No index.json found. Run 'bun UpdateIndex.ts regenerate' first.");
    process.exit(1);
  }
}

function formatTable(updates: UpdateRecord[]): string {
  if (updates.length === 0) {
    return "No updates found.";
  }

  const lines: string[] = [
    "| Date       | Title                                           | Type/Sig      | Impact |",
    "|------------|------------------------------------------------|---------------|--------|",
  ];

  for (const update of updates) {
    const title = update.title.length > 45 ? update.title.slice(0, 42) + "..." : update.title.padEnd(45);
    // Support both new and legacy schemas
    const dateStr = (update.timestamp || update.date || "unknown").slice(0, 10);
    const typeOrSig = (update.change_type || update.type || "unknown").slice(0, 13).padEnd(13);
    const impactOrSig = (update.significance || update.impact || "unknown").slice(0, 6).padEnd(6);
    lines.push(`| ${dateStr} | ${title} | ${typeOrSig} | ${impactOrSig} |`);
  }

  lines.push("");
  lines.push(`Total: ${updates.length} updates`);

  return lines.join("\n");
}

function formatDetail(update: UpdateRecord): string {
  const dateStr = update.timestamp || update.date || "unknown";
  const lines: string[] = [
    `# ${update.title}`,
    "",
    `**ID:** ${update.id}`,
    `**Date:** ${dateStr}`,
  ];

  // Support both new and legacy schemas
  if (update.change_type) {
    lines.push(`**Change Type:** ${update.change_type}`);
  } else if (update.type) {
    lines.push(`**Type:** ${update.type}`);
  }

  if (update.significance) {
    lines.push(`**Significance:** ${update.significance}`);
  } else if (update.impact) {
    lines.push(`**Impact:** ${update.impact}`);
  }

  if (update.version) {
    lines.push(`**Version:** ${update.version}`);
  }

  if (update.tags && update.tags.length > 0) {
    lines.push(`**Tags:** ${update.tags.join(", ")}`);
  }

  if (update.summary) {
    lines.push("");
    lines.push(`**Summary:** ${update.summary}`);
  }

  if (update.files_affected && update.files_affected.length > 0) {
    lines.push("");
    lines.push("**Files Affected:**");
    for (const file of update.files_affected) {
      lines.push(`  - ${file}`);
    }
  }

  lines.push("");
  lines.push(`**Full Document:** ${UPDATES_DIR}/${update.file_path}`);

  return lines.join("\n");
}

async function listAll() {
  const index = await loadIndex();
  console.log(formatTable(index.updates));
}

async function recent(count: number = 10) {
  const index = await loadIndex();
  const updates = index.updates.slice(0, count);
  console.log(`Last ${count} updates:\n`);
  console.log(formatTable(updates));
}

async function search(term: string) {
  const index = await loadIndex();
  const termLower = term.toLowerCase();

  const matches = index.updates.filter(update =>
    update.title.toLowerCase().includes(termLower) ||
    update.summary?.toLowerCase().includes(termLower) ||
    update.tags.some(tag => tag.toLowerCase().includes(termLower)) ||
    update.id.toLowerCase().includes(termLower)
  );

  console.log(`Search results for "${term}":\n`);
  console.log(formatTable(matches));
}

async function byType(type: string) {
  const index = await loadIndex();
  const typeLower = type.toLowerCase();

  const matches = index.updates.filter(update =>
    update.type.toLowerCase().includes(typeLower)
  );

  console.log(`Updates of type "${type}":\n`);
  console.log(formatTable(matches));
}

async function byDate(datePrefix: string) {
  const index = await loadIndex();

  const matches = index.updates.filter(update =>
    update.date.startsWith(datePrefix)
  );

  console.log(`Updates from ${datePrefix}:\n`);
  console.log(formatTable(matches));
}

async function byImpact(impact: string) {
  const index = await loadIndex();
  const impactLower = impact.toLowerCase();

  const matches = index.updates.filter(update =>
    update.impact.toLowerCase() === impactLower
  );

  console.log(`Updates with impact "${impact}":\n`);
  console.log(formatTable(matches));
}

async function show(id: string) {
  const index = await loadIndex();

  const update = index.updates.find(u =>
    u.id === id || u.id.includes(id)
  );

  if (!update) {
    console.error(`Update not found: ${id}`);
    console.log("\nAvailable IDs:");
    for (const u of index.updates.slice(0, 10)) {
      console.log(`  - ${u.id}`);
    }
    process.exit(1);
  }

  console.log(formatDetail(update));
}

async function stats() {
  const index = await loadIndex();

  console.log("System Updates Statistics\n");
  console.log(`Total Updates: ${index.total_updates}`);
  console.log(`Last Updated: ${index.last_updated}`);
  console.log("");
  console.log("By Year:");
  for (const [year, data] of Object.entries(index.by_year).sort().reverse()) {
    console.log(`  ${year}: ${data.count} updates (${data.months.join(", ")})`);
  }

  // New schema
  if (index.by_significance) {
    console.log("");
    console.log("By Significance:");
    for (const [sig, count] of Object.entries(index.by_significance).sort((a, b) => b[1] - a[1])) {
      if (count > 0) console.log(`  ${sig}: ${count}`);
    }
  }

  if (index.by_change_type) {
    console.log("");
    console.log("By Change Type:");
    for (const [type, count] of Object.entries(index.by_change_type).sort((a, b) => b[1] - a[1])) {
      if (count > 0) console.log(`  ${type}: ${count}`);
    }
  }

  // Legacy fallback
  if (index.by_type && !index.by_significance) {
    console.log("");
    console.log("By Type:");
    for (const [type, count] of Object.entries(index.by_type).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
  }
}

// Main
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case "list":
    await listAll();
    break;
  case "recent":
    await recent(arg ? parseInt(arg) : 10);
    break;
  case "search":
    if (!arg) {
      console.error("Usage: bun UpdateSearch.ts search <term>");
      process.exit(1);
    }
    await search(arg);
    break;
  case "by-type":
    if (!arg) {
      console.error("Usage: bun UpdateSearch.ts by-type <type>");
      console.log("Types: architectural, feature, enhancement, documentation, correction, identity, infrastructure");
      process.exit(1);
    }
    await byType(arg);
    break;
  case "by-date":
    if (!arg) {
      console.error("Usage: bun UpdateSearch.ts by-date <YYYY-MM>");
      process.exit(1);
    }
    await byDate(arg);
    break;
  case "by-impact":
    if (!arg) {
      console.error("Usage: bun UpdateSearch.ts by-impact <impact>");
      console.log("Impacts: major, minor, patch");
      process.exit(1);
    }
    await byImpact(arg);
    break;
  case "show":
    if (!arg) {
      console.error("Usage: bun UpdateSearch.ts show <id>");
      process.exit(1);
    }
    await show(arg);
    break;
  case "stats":
    await stats();
    break;
  default:
    console.log("UpdateSearch - Query system updates\n");
    console.log("Usage: bun UpdateSearch.ts <command> [args]\n");
    console.log("Commands:");
    console.log("  list                  List all updates");
    console.log("  recent [N]            Last N updates (default: 10)");
    console.log("  search <term>         Search by keyword");
    console.log("  by-type <type>        Filter by type");
    console.log("  by-date <YYYY-MM>     Filter by month");
    console.log("  by-impact <impact>    Filter by impact level");
    console.log("  show <id>             Show full update details");
    console.log("  stats                 Show statistics");
}
