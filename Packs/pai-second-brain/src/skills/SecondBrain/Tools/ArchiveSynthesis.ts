#!/usr/bin/env bun

/**
 * ArchiveSynthesis - Find breakthrough patterns from archives
 *
 * "Pattern A + Pattern B + New Catalyst = Novel Insight"
 *
 * Usage:
 *   bun run ArchiveSynthesis.ts --catalyst "current problem or topic"
 *   bun run ArchiveSynthesis.ts --catalyst "API redesign" --depth deep
 */

import { parseArgs } from "util";
import { searchVault, readNote } from "./VaultReader";
import { getVaultRoot } from "../lib/config-loader";
import { c, header, divider } from "../lib/colors";
import { extractTitle, extractKeySnippets } from "../lib/markdown";
import { assessRelevance, type RelevanceLevel } from "../lib/relevance";
import type { SearchResult } from "./VaultReader";

interface PatternMatch {
  file: string;
  title: string;
  relevance: RelevanceLevel;
  snippets: string[];
  potentialConnection: string;
}

interface SynthesisResult {
  catalyst: string;
  archivesSearched: number;
  patternsFound: PatternMatch[];
  synthesisPrompt: string;
  breakthroughHints: string[];
}

function generateConnectionHint(title: string, catalyst: string): string {
  const catalystWords = catalyst.toLowerCase().split(/\s+/);
  const titleWords = title.toLowerCase().split(/\s+/);

  const sharedConcepts = catalystWords.filter(
    (w) => w.length > 3 && titleWords.some((tw) => tw.includes(w) || w.includes(tw))
  );

  if (sharedConcepts.length > 0) {
    return `Shared concepts: ${sharedConcepts.join(", ")}. May offer patterns applicable to "${catalyst}"`;
  }

  return `Past experience that might inform approach to "${catalyst}"`;
}

async function synthesizeFromArchives(
  catalyst: string,
  options: { depth?: "quick" | "normal" | "deep"; maxPatterns?: number } = {}
): Promise<SynthesisResult> {
  const vaultRoot = getVaultRoot();
  if (!vaultRoot) {
    throw new Error("No vault configured. Set PARA_VAULT or vault_root in config.");
  }

  const depth = options.depth || "normal";
  const maxPatterns = options.maxPatterns || (depth === "deep" ? 20 : depth === "quick" ? 5 : 10);

  // Search archives
  const archiveResults = searchVault(vaultRoot, catalyst, { category: "archives", maxResults: maxPatterns * 2 });

  // Search keywords for broader matches
  const catalystWords = catalyst.split(/\s+/).filter((w) => w.length > 3);
  const additionalResults: SearchResult[] = [];

  if (depth !== "quick" && catalystWords.length > 1) {
    for (const word of catalystWords.slice(0, 3)) {
      additionalResults.push(...searchVault(vaultRoot, word, { category: "archives", maxResults: 10 }));
    }
  }

  // Deduplicate
  const seenFiles = new Set(archiveResults.map((r) => r.file));
  for (const result of additionalResults) {
    if (!seenFiles.has(result.file)) {
      archiveResults.push(result);
      seenFiles.add(result.file);
    }
  }

  // Process into patterns
  const patterns: PatternMatch[] = [];

  for (const result of archiveResults.slice(0, maxPatterns)) {
    const note = readNote(vaultRoot, result.file);
    if (!note) continue;

    const title = extractTitle(note.content, result.file);
    const snippets = extractKeySnippets(note.content, catalyst);
    const relevance = assessRelevance(result.matches.length * 2 + snippets.length);

    patterns.push({
      file: result.file,
      title,
      relevance,
      snippets,
      potentialConnection: generateConnectionHint(title, catalyst),
    });
  }

  // Sort by relevance
  const order = { high: 0, medium: 1, low: 2 };
  patterns.sort((a, b) => order[a.relevance] - order[b.relevance]);

  return {
    catalyst,
    archivesSearched: archiveResults.length,
    patternsFound: patterns,
    synthesisPrompt: generateSynthesisPrompt(catalyst, patterns),
    breakthroughHints: generateBreakthroughHints(catalyst, patterns),
  };
}

function generateSynthesisPrompt(catalyst: string, patterns: PatternMatch[]): string {
  if (patterns.length === 0) {
    return `No archive patterns found for "${catalyst}". This may be a novel problem space.`;
  }

  const high = patterns.filter((p) => p.relevance === "high");
  const medium = patterns.filter((p) => p.relevance === "medium");

  let prompt = `ARCHIVE SYNTHESIS for: "${catalyst}"\n\n`;

  if (high.length > 0) {
    prompt += `HIGH RELEVANCE PATTERNS (${high.length}):\n`;
    for (const p of high) prompt += `- "${p.title}": ${p.potentialConnection}\n`;
    prompt += "\n";
  }

  if (medium.length > 0) {
    prompt += `MEDIUM RELEVANCE PATTERNS (${medium.length}):\n`;
    for (const p of medium.slice(0, 5)) prompt += `- "${p.title}": ${p.potentialConnection}\n`;
    prompt += "\n";
  }

  prompt += `SYNTHESIS QUESTION: How might these past patterns inform a novel approach to "${catalyst}"?`;
  return prompt;
}

function generateBreakthroughHints(catalyst: string, patterns: PatternMatch[]): string[] {
  const hints: string[] = [];
  if (patterns.length === 0) {
    hints.push("No prior patterns found - opportunity for first-principles thinking");
    return hints;
  }

  const high = patterns.filter((p) => p.relevance === "high");
  if (high.length >= 2) {
    hints.push(`Cross-reference "${high[0].title}" with "${high[1].title}" for potential synthesis`);
  }
  if (high.length > 0) {
    hints.push(`Adapt patterns from "${high[0].title}" to current context`);
  }
  if ([...new Set(patterns.map((p) => p.potentialConnection))].length > 3) {
    hints.push("Multiple diverse patterns found - look for unexpected connections");
  }
  if (patterns.some((p) => p.title.toLowerCase().includes("fail") || p.title.toLowerCase().includes("lesson"))) {
    hints.push("Past failure/lesson patterns found - review to avoid repeating mistakes");
  }

  return hints;
}

function formatSynthesisResult(result: SynthesisResult): string {
  const lines = [header("ARCHIVE SYNTHESIS"), "", `${c("cyan", "Catalyst:")} "${result.catalyst}"`, `${c("cyan", "Archives searched:")} ${result.archivesSearched}`, `${c("cyan", "Patterns found:")} ${result.patternsFound.length}`, ""];

  if (result.patternsFound.length === 0) {
    lines.push(`${c("yellow", "No matching patterns in archives.")}`);
    lines.push("This appears to be a novel problem space.");
  } else {
    lines.push("--- PATTERNS ---", "");

    for (const p of result.patternsFound) {
      const color = p.relevance === "high" ? "green" : p.relevance === "medium" ? "yellow" : "reset";
      lines.push(`${c(color as any, `[${p.relevance.toUpperCase()}]`)} ${p.title}`);
      lines.push(`  ${c("cyan", "File:")} ${p.file}`);
      lines.push(`  ${c("cyan", "Connection:")} ${p.potentialConnection}`);
      if (p.snippets.length > 0) {
        lines.push(`  ${c("cyan", "Snippets:")}`);
        for (const s of p.snippets.slice(0, 2)) lines.push(`    "${s.substring(0, 100)}..."`);
      }
      lines.push("");
    }

    if (result.breakthroughHints.length > 0) {
      lines.push("--- BREAKTHROUGH HINTS ---", "");
      for (const h of result.breakthroughHints) lines.push(`${c("magenta", "→")} ${h}`);
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
      catalyst: { type: "string", short: "c" },
      depth: { type: "string", short: "d" },
      "max-patterns": { type: "string", short: "m" },
      json: { type: "boolean", short: "j" },
      prompt: { type: "boolean", short: "p" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
ArchiveSynthesis - Find breakthrough patterns from archives

USAGE:
  bun run ArchiveSynthesis.ts --catalyst "problem or topic"

OPTIONS:
  -c, --catalyst <text>    The problem/topic to find patterns for (REQUIRED)
  -d, --depth <level>      Search depth: quick, normal, deep (default: normal)
  -m, --max-patterns <n>   Maximum patterns (default: 10)
  -p, --prompt             Output synthesis prompt only
  -j, --json               Output as JSON
  -h, --help               Show this help
`);
    return;
  }

  if (!values.catalyst) {
    console.error("Error: --catalyst is required");
    process.exit(1);
  }

  const result = await synthesizeFromArchives(values.catalyst, {
    depth: values.depth as "quick" | "normal" | "deep",
    maxPatterns: values["max-patterns"] ? parseInt(values["max-patterns"]) : undefined,
  });

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (values.prompt) {
    console.log(result.synthesisPrompt);
  } else {
    console.log(formatSynthesisResult(result));
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { synthesizeFromArchives, type SynthesisResult, type PatternMatch };
