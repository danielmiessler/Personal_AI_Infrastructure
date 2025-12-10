/**
 * Index formatting and load functionality for jira CLI
 *
 * Provides:
 * - Numbered index output format for search results
 * - Storing last search results for subsequent load commands
 * - Selection parsing (1,2,4,10-15)
 */

import { join } from "path";
import { existsSync } from "fs";
import { mkdir, writeFile, readFile } from "fs/promises";
import { homedir } from "os";
import { JiraIssue, getIssue, extractTextFromADF } from "./api";

// Store last search results in a temp location
const CACHE_DIR = join(homedir(), ".cache", "jira");
const LAST_SEARCH_FILE = join(CACHE_DIR, "last-search.json");

export interface IndexedIssue {
  index: number;
  key: string;
  type: string;
  status: string;
  statusCategory: string;
  priority: string;
  summary: string;
  assignee: string;
  created: string;
  updated: string;
  labels: string[];
  projectAlias: string;
}

export interface SearchIndex {
  query: string;
  projectAlias: string;
  timestamp: string;
  issues: IndexedIssue[];
}

/**
 * Convert Jira issues to indexed format
 */
export function toIndexedIssues(
  issues: JiraIssue[],
  projectAlias: string,
  startIndex: number = 1
): IndexedIssue[] {
  return issues.map((issue, i) => ({
    index: startIndex + i,
    key: issue.key,
    type: issue.fields.issuetype?.name || "Unknown",
    status: issue.fields.status?.name || "Unknown",
    statusCategory: issue.fields.status?.statusCategory?.name || "Unknown",
    priority: issue.fields.priority?.name || "None",
    summary: issue.fields.summary,
    assignee: issue.fields.assignee?.displayName || "Unassigned",
    created: formatDate(issue.fields.created),
    updated: formatDate(issue.fields.updated),
    labels: issue.fields.labels || [],
    projectAlias,
  }));
}

/**
 * Format ISO date to YYYY-MM-DD
 */
function formatDate(isoDate: string): string {
  if (!isoDate) return "unknown";
  return isoDate.split("T")[0];
}

/**
 * Truncate string with ellipsis
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/**
 * Format results as numbered index table
 */
export function formatIndexTable(issues: IndexedIssue[], query: string): string {
  const lines: string[] = [];

  // Header
  lines.push(`📋 Jira Search Results for "${query}"`);
  lines.push("");
  lines.push(`Found ${issues.length} issue(s)`);
  lines.push("─".repeat(100));
  lines.push(formatHeader());
  lines.push("─".repeat(100));

  for (const issue of issues) {
    lines.push(formatResultRow(issue));
  }

  lines.push("");
  lines.push("─".repeat(100));
  lines.push("Load options: jira load <selection>");
  lines.push("  • jira load all              - Load all results");
  lines.push("  • jira load 1,2,5            - Load specific items");
  lines.push("  • jira load 1-5              - Load range");
  lines.push("  • jira view ABC-123          - View single issue directly");

  return lines.join("\n");
}

/**
 * Format results as JSON for Claude to parse
 */
export function formatIndexJson(issues: IndexedIssue[], query: string): string {
  const output = {
    query,
    timestamp: new Date().toISOString(),
    summary: {
      totalCount: issues.length,
    },
    issues: issues.map((i) => ({
      index: i.index,
      key: i.key,
      type: i.type,
      status: i.status,
      priority: i.priority,
      summary: i.summary,
      assignee: i.assignee,
      updated: i.updated,
      labels: i.labels.slice(0, 3),
    })),
    loadInstructions: {
      command: "jira load <selection>",
      examples: [
        { selection: "all", description: "Load all results" },
        { selection: "1,2,5", description: "Load specific items" },
        { selection: "1-5", description: "Load range" },
      ],
    },
  };

  return JSON.stringify(output, null, 2);
}

function formatHeader(): string {
  return " #  │ Key        │ Type    │ Status        │ Summary                              │ Assignee";
}

function formatResultRow(issue: IndexedIssue): string {
  const num = issue.index.toString().padStart(2);
  const key = issue.key.padEnd(10);
  const type = truncate(issue.type, 7).padEnd(7);
  const status = truncate(issue.status, 13).padEnd(13);
  const summary = truncate(issue.summary, 36).padEnd(36);
  const assignee = truncate(issue.assignee, 15);

  return `${num}  │ ${key} │ ${type} │ ${status} │ ${summary} │ ${assignee}`;
}

/**
 * Save search results to cache for subsequent load commands
 */
export async function saveSearchIndex(index: SearchIndex): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    await mkdir(CACHE_DIR, { recursive: true });
  }
  await writeFile(LAST_SEARCH_FILE, JSON.stringify(index, null, 2));
}

/**
 * Load the last search index from cache
 */
export async function loadSearchIndex(): Promise<SearchIndex | null> {
  if (!existsSync(LAST_SEARCH_FILE)) {
    return null;
  }

  try {
    const content = await readFile(LAST_SEARCH_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Parse selection string into array of indices
 * Supports: "1,2,5", "1-5", "1,3-5,10", "all"
 */
export function parseSelection(selection: string, maxIndex: number): number[] {
  if (selection.toLowerCase() === "all") {
    return Array.from({ length: maxIndex }, (_, i) => i + 1);
  }

  const indices: Set<number> = new Set();
  const parts = selection.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      // Range: "1-5"
      const [start, end] = part.split("-").map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end && i <= maxIndex; i++) {
          if (i >= 1) indices.add(i);
        }
      }
    } else {
      // Single number
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= maxIndex) {
        indices.add(num);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Load issues by selection from the last search
 */
export async function loadBySelection(selection: string): Promise<{
  loaded: string[];
  content: string;
}> {
  const index = await loadSearchIndex();

  if (!index) {
    throw new Error("No previous search found. Run 'jira search' first.");
  }

  if (index.issues.length === 0) {
    throw new Error("Previous search had no results.");
  }

  // Parse selection
  const indices = parseSelection(selection, index.issues.length);
  const selectedIssues = index.issues.filter((i) => indices.includes(i.index));

  if (selectedIssues.length === 0) {
    throw new Error(`No results match selection: ${selection}`);
  }

  // Load full details for each selected issue
  const contents: string[] = [];
  const loaded: string[] = [];

  for (const issue of selectedIssues) {
    try {
      const fullIssue = await getIssue(issue.key, {
        projectAlias: issue.projectAlias,
      });
      contents.push(formatIssueDetails(fullIssue));
      loaded.push(issue.key);
    } catch (error) {
      console.error(`Warning: Could not load ${issue.key}: ${error}`);
    }
  }

  return {
    loaded,
    content: contents.join("\n\n"),
  };
}

/**
 * Format full issue details for context injection
 */
export function formatIssueDetails(issue: JiraIssue): string {
  const lines: string[] = [];

  lines.push("=".repeat(80));
  lines.push(`# ${issue.key}: ${issue.fields.summary}`);
  lines.push("=".repeat(80));
  lines.push("");

  // Metadata table
  lines.push("## Metadata");
  lines.push(`- **Type:** ${issue.fields.issuetype?.name || "Unknown"}`);
  lines.push(`- **Status:** ${issue.fields.status?.name || "Unknown"}`);
  lines.push(`- **Priority:** ${issue.fields.priority?.name || "None"}`);
  lines.push(`- **Assignee:** ${issue.fields.assignee?.displayName || "Unassigned"}`);
  lines.push(`- **Reporter:** ${issue.fields.reporter?.displayName || "Unknown"}`);
  lines.push(`- **Created:** ${formatDate(issue.fields.created)}`);
  lines.push(`- **Updated:** ${formatDate(issue.fields.updated)}`);

  if (issue.fields.labels?.length > 0) {
    lines.push(`- **Labels:** ${issue.fields.labels.join(", ")}`);
  }

  if (issue.fields.components?.length) {
    lines.push(`- **Components:** ${issue.fields.components.map((c) => c.name).join(", ")}`);
  }

  if (issue.fields.parent) {
    lines.push(`- **Parent:** ${issue.fields.parent.key} - ${issue.fields.parent.fields.summary}`);
  }

  lines.push("");

  // Description
  if (issue.fields.description) {
    lines.push("## Description");
    lines.push(extractTextFromADF(issue.fields.description));
    lines.push("");
  }

  // Comments (if loaded)
  if (issue.fields.comment?.comments?.length) {
    lines.push("## Comments");
    for (const comment of issue.fields.comment.comments.slice(-5)) {
      lines.push(`### ${comment.author.displayName} (${formatDate(comment.created)})`);
      lines.push(extractTextFromADF(comment.body));
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Format load result summary
 */
export function formatLoadSummary(loaded: string[], totalSize: number): string {
  const lines: string[] = [];
  lines.push(`✅ Loaded ${loaded.length} issue(s) (${formatSize(totalSize)})`);
  lines.push("");
  for (const key of loaded) {
    lines.push(`  • ${key}`);
  }
  return lines.join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
