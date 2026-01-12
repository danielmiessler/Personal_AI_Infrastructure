#!/usr/bin/env bun

/**
 * InboxProcessor - Process unorganized captures from Inbox
 *
 * Scans the Inbox folder and suggests PARA categorization for each item.
 * Helps maintain a clean inbox by identifying where items should go.
 *
 * Usage:
 *   bun run InboxProcessor.ts                    # Process all inbox items
 *   bun run InboxProcessor.ts --limit 10         # Process first 10 items
 *   bun run InboxProcessor.ts --suggest          # Only suggest, don't show content
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import {
  getVaultConfig,
  listCategory,
  readNote,
  searchVault,
  type FileInfo
} from "./VaultReader";

interface InboxItem {
  path: string;
  title: string;
  created: Date;
  size: number;
  suggestedCategory: "projects" | "areas" | "resources" | "archives" | "delete";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  relatedNotes: string[];
  preview: string;
}

interface ProcessingResult {
  totalItems: number;
  processed: InboxItem[];
  summary: {
    projects: number;
    areas: number;
    resources: number;
    archives: number;
    delete: number;
  };
  recommendations: string[];
}

// ============================================================================
// Content Analysis
// ============================================================================

function extractTitle(content: string, filename: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];

  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*$/m);
  if (frontmatterMatch) return frontmatterMatch[1];

  return filename.replace(/\.md$/, "").replace(/-/g, " ");
}

function extractPreview(content: string, maxLength: number = 200): string {
  // Skip frontmatter
  let text = content.replace(/^---[\s\S]*?---\s*/m, "");
  // Skip title
  text = text.replace(/^#\s+.+\n/m, "");
  // Get first meaningful content
  const lines = text.split("\n").filter(l => l.trim().length > 0).slice(0, 3);
  return lines.join(" ").substring(0, maxLength).trim();
}

function analyzeContent(content: string, title: string): {
  category: InboxItem["suggestedCategory"];
  confidence: InboxItem["confidence"];
  reasoning: string;
} {
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();

  // Check for project indicators
  const projectIndicators = [
    "deadline", "deliverable", "milestone", "sprint", "phase",
    "client", "project", "launch", "release", "todo", "task",
    "goal", "objective", "timeline", "due date"
  ];
  const projectScore = projectIndicators.filter(i =>
    contentLower.includes(i) || titleLower.includes(i)
  ).length;

  // Check for area indicators (ongoing responsibilities)
  const areaIndicators = [
    "process", "routine", "standard", "policy", "guideline",
    "recurring", "maintenance", "health", "finance", "career",
    "relationship", "habit", "system", "workflow"
  ];
  const areaScore = areaIndicators.filter(i =>
    contentLower.includes(i) || titleLower.includes(i)
  ).length;

  // Check for resource indicators (reference material)
  const resourceIndicators = [
    "how to", "guide", "tutorial", "reference", "template",
    "checklist", "framework", "tool", "resource", "course",
    "book", "article", "notes from", "summary"
  ];
  const resourceScore = resourceIndicators.filter(i =>
    contentLower.includes(i) || titleLower.includes(i)
  ).length;

  // Check for archive indicators
  const archiveIndicators = [
    "completed", "finished", "archived", "old", "legacy",
    "deprecated", "2023", "2022", "2021", "historical"
  ];
  const archiveScore = archiveIndicators.filter(i =>
    contentLower.includes(i) || titleLower.includes(i)
  ).length;

  // Check for delete indicators
  const deleteIndicators = [
    "scratch", "temp", "test", "draft", "untitled",
    "copy of", "duplicate"
  ];
  const deleteScore = deleteIndicators.filter(i =>
    contentLower.includes(i) || titleLower.includes(i)
  ).length;

  // Also check content length
  const isShort = content.length < 100;
  const isEmpty = content.trim().length < 20;

  if (isEmpty) {
    return {
      category: "delete",
      confidence: "high",
      reasoning: "Empty or near-empty note"
    };
  }

  // Determine category based on scores
  const scores = [
    { category: "projects" as const, score: projectScore * 2 },
    { category: "areas" as const, score: areaScore * 1.5 },
    { category: "resources" as const, score: resourceScore * 1.5 },
    { category: "archives" as const, score: archiveScore },
    { category: "delete" as const, score: deleteScore + (isShort ? 1 : 0) }
  ];

  scores.sort((a, b) => b.score - a.score);
  const topScore = scores[0];
  const secondScore = scores[1];

  // Determine confidence
  let confidence: InboxItem["confidence"] = "low";
  if (topScore.score >= 3 && topScore.score > secondScore.score * 2) {
    confidence = "high";
  } else if (topScore.score >= 2) {
    confidence = "medium";
  }

  // Default to resources if unclear
  if (topScore.score === 0) {
    return {
      category: "resources",
      confidence: "low",
      reasoning: "No clear category indicators found - defaulting to Resources"
    };
  }

  const reasonings: Record<InboxItem["suggestedCategory"], string> = {
    projects: `Contains project indicators: active work with deliverables`,
    areas: `Contains area indicators: ongoing responsibility or system`,
    resources: `Contains resource indicators: reference material or guide`,
    archives: `Contains archive indicators: completed or historical content`,
    delete: `Contains delete indicators or is very short: likely temporary`
  };

  return {
    category: topScore.category,
    confidence,
    reasoning: reasonings[topScore.category]
  };
}

function findRelatedNotes(vaultRoot: string, title: string, content: string): string[] {
  // Extract key terms from title
  const keyTerms = title
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 3);

  if (keyTerms.length === 0) return [];

  const related: Set<string> = new Set();

  for (const term of keyTerms) {
    const results = searchVault(vaultRoot, term, { maxResults: 5 });
    for (const result of results) {
      if (!result.file.includes("_00_Inbox")) {
        related.add(result.file);
      }
    }
    if (related.size >= 5) break;
  }

  return Array.from(related).slice(0, 5);
}

// ============================================================================
// Processing
// ============================================================================

function processInbox(
  vaultRoot: string,
  options: {
    limit?: number;
    includeRelated?: boolean;
  } = {}
): ProcessingResult {
  const limit = options.limit || 100;
  const includeRelated = options.includeRelated !== false;

  // Get inbox items
  const inboxFiles = listCategory(vaultRoot, "inbox", { recursive: true, limit });

  const processed: InboxItem[] = [];
  const summary = {
    projects: 0,
    areas: 0,
    resources: 0,
    archives: 0,
    delete: 0
  };

  for (const file of inboxFiles) {
    const noteData = readNote(vaultRoot, file.path);
    if (!noteData) continue;

    const title = extractTitle(noteData.content, file.name);
    const preview = extractPreview(noteData.content);
    const analysis = analyzeContent(noteData.content, title);

    const relatedNotes = includeRelated
      ? findRelatedNotes(vaultRoot, title, noteData.content)
      : [];

    const item: InboxItem = {
      path: file.path,
      title,
      created: file.modified,
      size: file.size,
      suggestedCategory: analysis.category,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      relatedNotes,
      preview
    };

    processed.push(item);
    summary[analysis.category]++;
  }

  // Generate recommendations
  const recommendations = generateRecommendations(processed, summary);

  return {
    totalItems: inboxFiles.length,
    processed,
    summary,
    recommendations
  };
}

function generateRecommendations(items: InboxItem[], summary: ProcessingResult["summary"]): string[] {
  const recommendations: string[] = [];

  const total = items.length;
  if (total === 0) {
    recommendations.push("Inbox is empty - great job keeping it clean!");
    return recommendations;
  }

  // High priority actions
  const highConfidence = items.filter(i => i.confidence === "high");
  if (highConfidence.length > 0) {
    recommendations.push(`${highConfidence.length} items can be confidently categorized - process these first`);
  }

  // Delete candidates
  if (summary.delete > 0) {
    recommendations.push(`${summary.delete} items are deletion candidates - review and remove`);
  }

  // Large inbox warning
  if (total > 20) {
    recommendations.push(`Inbox has ${total} items - consider batch processing`);
  }

  // Category distribution
  const topCategory = Object.entries(summary)
    .filter(([cat]) => cat !== "delete")
    .sort((a, b) => b[1] - a[1])[0];

  if (topCategory && topCategory[1] > total * 0.5) {
    recommendations.push(`Most items (${topCategory[1]}) belong in ${topCategory[0].toUpperCase()} - batch move recommended`);
  }

  // Low confidence items
  const lowConfidence = items.filter(i => i.confidence === "low");
  if (lowConfidence.length > 0) {
    recommendations.push(`${lowConfidence.length} items need manual review - category unclear`);
  }

  return recommendations;
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatProcessingResult(result: ProcessingResult): string {
  const lines: string[] = [];
  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const red = "\x1b[31m";
  const cyan = "\x1b[36m";
  const magenta = "\x1b[35m";
  const reset = "\x1b[0m";

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    INBOX PROCESSOR");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  if (result.totalItems === 0) {
    lines.push(`${green}✓ Inbox is empty!${reset}`);
    lines.push("");
  } else {
    lines.push(`${cyan}Items in inbox:${reset} ${result.totalItems}`);
    lines.push("");
    lines.push("─── SUMMARY ───");
    lines.push("");
    lines.push(`  ${green}Projects:${reset}  ${result.summary.projects}`);
    lines.push(`  ${green}Areas:${reset}     ${result.summary.areas}`);
    lines.push(`  ${green}Resources:${reset} ${result.summary.resources}`);
    lines.push(`  ${yellow}Archives:${reset}  ${result.summary.archives}`);
    lines.push(`  ${red}Delete:${reset}    ${result.summary.delete}`);
    lines.push("");

    if (result.recommendations.length > 0) {
      lines.push("─── RECOMMENDATIONS ───");
      lines.push("");
      for (const rec of result.recommendations) {
        lines.push(`  ${magenta}→${reset} ${rec}`);
      }
      lines.push("");
    }

    lines.push("─── ITEMS ───");
    lines.push("");

    for (const item of result.processed) {
      const confidenceColor = item.confidence === "high" ? green :
        item.confidence === "medium" ? yellow : reset;
      const categoryColor = item.suggestedCategory === "delete" ? red : green;

      lines.push(`${confidenceColor}[${item.confidence.toUpperCase()}]${reset} ${item.title}`);
      lines.push(`  ${cyan}Path:${reset} ${item.path}`);
      lines.push(`  ${cyan}Suggested:${reset} ${categoryColor}${item.suggestedCategory.toUpperCase()}${reset}`);
      lines.push(`  ${cyan}Reason:${reset} ${item.reasoning}`);

      if (item.preview) {
        lines.push(`  ${cyan}Preview:${reset} ${item.preview.substring(0, 80)}...`);
      }

      if (item.relatedNotes.length > 0) {
        lines.push(`  ${cyan}Related:${reset} ${item.relatedNotes.slice(0, 2).join(", ")}`);
      }

      lines.push("");
    }
  }

  lines.push("═══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      limit: { type: "string", short: "l" },
      suggest: { type: "boolean", short: "s" },
      "no-related": { type: "boolean" },
      json: { type: "boolean", short: "j" },
      summary: { type: "boolean" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
InboxProcessor - Process unorganized captures from Inbox

USAGE:
  bun run InboxProcessor.ts                    # Process all inbox items
  bun run InboxProcessor.ts --limit 10         # Process first 10 items

OPTIONS:
  -l, --limit <n>       Maximum items to process (default: 100)
  -s, --suggest         Output suggestions only (summary)
      --no-related      Skip finding related notes (faster)
      --summary         Output summary statistics only
  -j, --json            Output as JSON
  -h, --help            Show this help

PHILOSOPHY:
  The inbox is temporary. Items should flow through quickly
  to their proper PARA destination. A clean inbox = clear mind.

PARA CATEGORIES:
  Projects  - Active work with deadlines/deliverables
  Areas     - Ongoing responsibilities (health, finance, etc.)
  Resources - Reference material for future use
  Archives  - Completed/inactive items worth keeping
  Delete    - Temporary items no longer needed

EXAMPLES:
  bun run InboxProcessor.ts
  bun run InboxProcessor.ts --limit 20 --summary
  bun run InboxProcessor.ts --json --no-related
`);
    return;
  }

  const config = getVaultConfig();

  if (!config.vault_root) {
    console.error("Error: No vault configured. Set PARA_VAULT or vault_root in config.");
    process.exit(1);
  }

  const result = processInbox(config.vault_root, {
    limit: values.limit ? parseInt(values.limit) : undefined,
    includeRelated: !values["no-related"]
  });

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (values.summary || values.suggest) {
    console.log(`Inbox: ${result.totalItems} items`);
    console.log(`  Projects: ${result.summary.projects}`);
    console.log(`  Areas: ${result.summary.areas}`);
    console.log(`  Resources: ${result.summary.resources}`);
    console.log(`  Archives: ${result.summary.archives}`);
    console.log(`  Delete: ${result.summary.delete}`);
    console.log("");
    for (const rec of result.recommendations) {
      console.log(`→ ${rec}`);
    }
  } else {
    console.log(formatProcessingResult(result));
  }
}

main().catch(console.error);

// Export for use as module
export {
  processInbox,
  type ProcessingResult,
  type InboxItem
};
