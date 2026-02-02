#!/usr/bin/env bun

/**
 * InboxProcessor - Process unorganized captures from Inbox
 *
 * Usage:
 *   bun run InboxProcessor.ts                # Process all inbox items
 *   bun run InboxProcessor.ts --limit 10     # Process first 10 items
 */

import { parseArgs } from "util";
import { listCategory, readNote, searchVault } from "./VaultReader";
import { getVaultRoot } from "../lib/config-loader";
import { c, header, divider } from "../lib/colors";
import { extractTitle, extractSummary } from "../lib/markdown";
import { scoreByIndicators, PARA_INDICATORS } from "../lib/relevance";

type ParaCategory = "projects" | "areas" | "resources" | "archives" | "delete";

interface InboxItem {
  path: string;
  title: string;
  created: Date;
  size: number;
  suggestedCategory: ParaCategory;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  relatedNotes: string[];
  preview: string;
}

interface ProcessingResult {
  totalItems: number;
  processed: InboxItem[];
  summary: Record<ParaCategory, number>;
  recommendations: string[];
}

function analyzeContent(content: string, title: string): { category: ParaCategory; confidence: "high" | "medium" | "low"; reasoning: string } {
  const text = (content + " " + title).toLowerCase();

  // Check for empty content
  if (content.trim().length < 20) {
    return { category: "delete", confidence: "high", reasoning: "Empty or near-empty note" };
  }

  // Score each category
  const scores: { category: ParaCategory; score: number }[] = [
    { category: "projects", score: scoreByIndicators(text, PARA_INDICATORS.projects) * 2 },
    { category: "areas", score: scoreByIndicators(text, PARA_INDICATORS.areas) * 1.5 },
    { category: "resources", score: scoreByIndicators(text, PARA_INDICATORS.resources) * 1.5 },
    { category: "archives", score: scoreByIndicators(text, PARA_INDICATORS.archives) },
    { category: "delete", score: scoreByIndicators(text, PARA_INDICATORS.delete) + (content.length < 100 ? 1 : 0) },
  ];

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  const second = scores[1];

  // Determine confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (top.score >= 3 && top.score > second.score * 2) confidence = "high";
  else if (top.score >= 2) confidence = "medium";

  // Default to resources if no clear signals
  if (top.score === 0) {
    return { category: "resources", confidence: "low", reasoning: "No clear indicators - defaulting to Resources" };
  }

  const reasonings: Record<ParaCategory, string> = {
    projects: "Contains project indicators: active work with deliverables",
    areas: "Contains area indicators: ongoing responsibility or system",
    resources: "Contains resource indicators: reference material or guide",
    archives: "Contains archive indicators: completed or historical content",
    delete: "Contains delete indicators or is very short: likely temporary",
  };

  return { category: top.category, confidence, reasoning: reasonings[top.category] };
}

function findRelatedNotes(vaultRoot: string, title: string): string[] {
  const keyTerms = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .slice(0, 3);

  if (keyTerms.length === 0) return [];

  const related = new Set<string>();
  for (const term of keyTerms) {
    for (const r of searchVault(vaultRoot, term, { maxResults: 5 })) {
      if (!r.file.includes("_00_Inbox")) related.add(r.file);
    }
    if (related.size >= 5) break;
  }

  return Array.from(related).slice(0, 5);
}

function processInbox(vaultRoot: string, options: { limit?: number; includeRelated?: boolean } = {}): ProcessingResult {
  const limit = options.limit || 100;
  const includeRelated = options.includeRelated !== false;

  const inboxFiles = listCategory(vaultRoot, "inbox", { recursive: true, limit });
  const processed: InboxItem[] = [];
  const summary: Record<ParaCategory, number> = { projects: 0, areas: 0, resources: 0, archives: 0, delete: 0 };

  for (const file of inboxFiles) {
    const noteData = readNote(vaultRoot, file.path);
    if (!noteData) continue;

    const title = extractTitle(noteData.content, file.name);
    const preview = extractSummary(noteData.content, 200);
    const analysis = analyzeContent(noteData.content, title);

    processed.push({
      path: file.path,
      title,
      created: file.modified,
      size: file.size,
      suggestedCategory: analysis.category,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      relatedNotes: includeRelated ? findRelatedNotes(vaultRoot, title) : [],
      preview,
    });
    summary[analysis.category]++;
  }

  return { totalItems: inboxFiles.length, processed, summary, recommendations: generateRecommendations(processed, summary) };
}

function generateRecommendations(items: InboxItem[], summary: Record<ParaCategory, number>): string[] {
  const recs: string[] = [];
  const total = items.length;

  if (total === 0) {
    recs.push("Inbox is empty - great job keeping it clean!");
    return recs;
  }

  const highConf = items.filter((i) => i.confidence === "high").length;
  if (highConf > 0) recs.push(`${highConf} items can be confidently categorized - process these first`);
  if (summary.delete > 0) recs.push(`${summary.delete} items are deletion candidates - review and remove`);
  if (total > 20) recs.push(`Inbox has ${total} items - consider batch processing`);

  const topCat = (Object.entries(summary).filter(([k]) => k !== "delete") as [ParaCategory, number][]).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] > total * 0.5) recs.push(`Most items (${topCat[1]}) belong in ${topCat[0].toUpperCase()} - batch move recommended`);

  const lowConf = items.filter((i) => i.confidence === "low").length;
  if (lowConf > 0) recs.push(`${lowConf} items need manual review - category unclear`);

  return recs;
}

function formatProcessingResult(result: ProcessingResult): string {
  const lines = [header("INBOX PROCESSOR"), ""];

  if (result.totalItems === 0) {
    lines.push(`${c("green", "✓ Inbox is empty!")}`);
  } else {
    lines.push(`${c("cyan", "Items in inbox:")} ${result.totalItems}`, "", "--- SUMMARY ---", "");
    lines.push(`  ${c("green", "Projects:")}  ${result.summary.projects}`);
    lines.push(`  ${c("green", "Areas:")}     ${result.summary.areas}`);
    lines.push(`  ${c("green", "Resources:")} ${result.summary.resources}`);
    lines.push(`  ${c("yellow", "Archives:")}  ${result.summary.archives}`);
    lines.push(`  ${c("red", "Delete:")}    ${result.summary.delete}`, "");

    if (result.recommendations.length > 0) {
      lines.push("--- RECOMMENDATIONS ---", "");
      for (const rec of result.recommendations) lines.push(`  ${c("magenta", "→")} ${rec}`);
      lines.push("");
    }

    lines.push("--- ITEMS ---", "");
    for (const item of result.processed) {
      const confColor = item.confidence === "high" ? "green" : item.confidence === "medium" ? "yellow" : "reset";
      const catColor = item.suggestedCategory === "delete" ? "red" : "green";
      lines.push(`${c(confColor as any, `[${item.confidence.toUpperCase()}]`)} ${item.title}`);
      lines.push(`  ${c("cyan", "Path:")} ${item.path}`);
      lines.push(`  ${c("cyan", "Suggested:")} ${c(catColor as any, item.suggestedCategory.toUpperCase())}`);
      lines.push(`  ${c("cyan", "Reason:")} ${item.reasoning}`);
      if (item.preview) lines.push(`  ${c("cyan", "Preview:")} ${item.preview.substring(0, 80)}...`);
      if (item.relatedNotes.length > 0) lines.push(`  ${c("cyan", "Related:")} ${item.relatedNotes.slice(0, 2).join(", ")}`);
      lines.push("");
    }
  }

  lines.push(divider());
  return lines.join("\n");
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      limit: { type: "string", short: "l" },
      suggest: { type: "boolean", short: "s" },
      "no-related": { type: "boolean" },
      json: { type: "boolean", short: "j" },
      summary: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
InboxProcessor - Process unorganized captures from Inbox

USAGE:
  bun run InboxProcessor.ts                # Process all
  bun run InboxProcessor.ts --limit 10     # Process first 10

OPTIONS:
  -l, --limit <n>       Maximum items (default: 100)
  -s, --suggest         Summary only
      --no-related      Skip related notes (faster)
      --summary         Statistics only
  -j, --json            JSON output
  -h, --help            Show this help
`);
    return;
  }

  const vaultRoot = getVaultRoot();
  if (!vaultRoot) {
    console.error("Error: No vault configured.");
    process.exit(1);
  }

  const result = processInbox(vaultRoot, { limit: values.limit ? parseInt(values.limit) : undefined, includeRelated: !values["no-related"] });

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (values.summary || values.suggest) {
    console.log(`Inbox: ${result.totalItems} items`);
    for (const [k, v] of Object.entries(result.summary)) console.log(`  ${k}: ${v}`);
    console.log("");
    for (const rec of result.recommendations) console.log(`→ ${rec}`);
  } else {
    console.log(formatProcessingResult(result));
  }
}

main().catch(console.error);

export { processInbox, type ProcessingResult, type InboxItem };
