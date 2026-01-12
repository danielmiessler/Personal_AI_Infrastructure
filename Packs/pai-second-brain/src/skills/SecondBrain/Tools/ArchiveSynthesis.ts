#!/usr/bin/env bun

/**
 * ArchiveSynthesis - Find breakthrough patterns from archives
 *
 * Retrieves dormant patterns from archives and connects them with new catalysts
 * to generate breakthrough insights. Core to Second Brain philosophy:
 * "Pattern A + Pattern B + New Catalyst = Novel Insight"
 *
 * Usage:
 *   bun run ArchiveSynthesis.ts --catalyst "current problem or topic"
 *   bun run ArchiveSynthesis.ts --catalyst "API redesign" --depth deep
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import {
  getVaultConfig,
  searchVault,
  listCategory,
  readNote,
  findRelated,
  type SearchResult
} from "./VaultReader";

interface PatternMatch {
  file: string;
  title: string;
  relevance: "high" | "medium" | "low";
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

// ============================================================================
// Pattern Extraction
// ============================================================================

function extractTitle(content: string, filename: string): string {
  // Try to get title from H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1];

  // Try frontmatter title
  const frontmatterMatch = content.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*$/m);
  if (frontmatterMatch) return frontmatterMatch[1];

  // Fall back to filename
  return filename.replace(/\.md$/, "").replace(/-/g, " ");
}

function extractKeySnippets(content: string, query: string, maxSnippets: number = 3): string[] {
  const snippets: string[] = [];
  const lines = content.split("\n");
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);

  for (let i = 0; i < lines.length && snippets.length < maxSnippets; i++) {
    const line = lines[i].trim();
    const lineLower = line.toLowerCase();

    // Skip empty lines, headers, and very short lines
    if (!line || line.startsWith("#") || line.length < 20) continue;

    // Check if line contains query or query words
    const hasMatch = lineLower.includes(queryLower) ||
      queryWords.some(word => lineLower.includes(word));

    if (hasMatch) {
      // Get some context (current line + next line if exists)
      let snippet = line;
      if (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].startsWith("#")) {
        snippet += " " + lines[i + 1].trim();
      }
      snippets.push(snippet.substring(0, 300));
    }
  }

  return snippets;
}

function assessRelevance(matchCount: number, snippetQuality: number): "high" | "medium" | "low" {
  const score = matchCount * 2 + snippetQuality;
  if (score >= 6) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function generateConnectionHint(title: string, catalyst: string): string {
  // Simple heuristic-based connection hints
  const catalystWords = catalyst.toLowerCase().split(/\s+/);
  const titleWords = title.toLowerCase().split(/\s+/);

  const sharedConcepts = catalystWords.filter(w =>
    w.length > 3 && titleWords.some(tw => tw.includes(w) || w.includes(tw))
  );

  if (sharedConcepts.length > 0) {
    return `Shared concepts: ${sharedConcepts.join(", ")}. May offer patterns applicable to "${catalyst}"`;
  }

  return `Past experience that might inform approach to "${catalyst}"`;
}

// ============================================================================
// Core Synthesis Logic
// ============================================================================

async function synthesizeFromArchives(
  catalyst: string,
  options: {
    depth?: "quick" | "normal" | "deep";
    maxPatterns?: number;
  } = {}
): Promise<SynthesisResult> {
  const config = getVaultConfig();

  if (!config.vault_root) {
    throw new Error("No vault configured. Set PARA_VAULT or vault_root in config.");
  }

  const depth = options.depth || "normal";
  const maxPatterns = options.maxPatterns || (depth === "deep" ? 20 : depth === "quick" ? 5 : 10);

  // Search archives for related content
  const archiveResults = searchVault(config.vault_root, catalyst, {
    category: "archives",
    maxResults: maxPatterns * 2
  });

  // Also search with individual keywords for broader matches
  const catalystWords = catalyst.split(/\s+/).filter(w => w.length > 3);
  const additionalResults: SearchResult[] = [];

  if (depth !== "quick" && catalystWords.length > 1) {
    for (const word of catalystWords.slice(0, 3)) {
      const wordResults = searchVault(config.vault_root, word, {
        category: "archives",
        maxResults: 10
      });
      additionalResults.push(...wordResults);
    }
  }

  // Deduplicate results
  const seenFiles = new Set(archiveResults.map(r => r.file));
  for (const result of additionalResults) {
    if (!seenFiles.has(result.file)) {
      archiveResults.push(result);
      seenFiles.add(result.file);
    }
  }

  // Process each result into pattern matches
  const patterns: PatternMatch[] = [];

  for (const result of archiveResults.slice(0, maxPatterns)) {
    const note = readNote(config.vault_root, result.file);
    if (!note) continue;

    const title = extractTitle(note.content, result.file);
    const snippets = extractKeySnippets(note.content, catalyst);
    const relevance = assessRelevance(result.matches.length, snippets.length);

    patterns.push({
      file: result.file,
      title,
      relevance,
      snippets,
      potentialConnection: generateConnectionHint(title, catalyst)
    });
  }

  // Sort by relevance
  patterns.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.relevance] - order[b.relevance];
  });

  // Generate synthesis prompt for AI consumption
  const synthesisPrompt = generateSynthesisPrompt(catalyst, patterns);

  // Generate breakthrough hints
  const breakthroughHints = generateBreakthroughHints(catalyst, patterns);

  return {
    catalyst,
    archivesSearched: archiveResults.length,
    patternsFound: patterns,
    synthesisPrompt,
    breakthroughHints
  };
}

function generateSynthesisPrompt(catalyst: string, patterns: PatternMatch[]): string {
  if (patterns.length === 0) {
    return `No archive patterns found for "${catalyst}". This may be a novel problem space.`;
  }

  const highRelevance = patterns.filter(p => p.relevance === "high");
  const mediumRelevance = patterns.filter(p => p.relevance === "medium");

  let prompt = `ARCHIVE SYNTHESIS for: "${catalyst}"\n\n`;

  if (highRelevance.length > 0) {
    prompt += `HIGH RELEVANCE PATTERNS (${highRelevance.length}):\n`;
    for (const p of highRelevance) {
      prompt += `- "${p.title}": ${p.potentialConnection}\n`;
    }
    prompt += "\n";
  }

  if (mediumRelevance.length > 0) {
    prompt += `MEDIUM RELEVANCE PATTERNS (${mediumRelevance.length}):\n`;
    for (const p of mediumRelevance.slice(0, 5)) {
      prompt += `- "${p.title}": ${p.potentialConnection}\n`;
    }
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

  const highRelevance = patterns.filter(p => p.relevance === "high");

  if (highRelevance.length >= 2) {
    hints.push(`Cross-reference "${highRelevance[0].title}" with "${highRelevance[1].title}" for potential synthesis`);
  }

  if (highRelevance.length > 0) {
    hints.push(`Adapt patterns from "${highRelevance[0].title}" to current context`);
  }

  const uniqueConnections = [...new Set(patterns.map(p => p.potentialConnection))];
  if (uniqueConnections.length > 3) {
    hints.push("Multiple diverse patterns found - look for unexpected connections");
  }

  if (patterns.some(p => p.title.toLowerCase().includes("fail") || p.title.toLowerCase().includes("lesson"))) {
    hints.push("Past failure/lesson patterns found - review to avoid repeating mistakes");
  }

  return hints;
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatSynthesisResult(result: SynthesisResult): string {
  const lines: string[] = [];
  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const cyan = "\x1b[36m";
  const magenta = "\x1b[35m";
  const reset = "\x1b[0m";

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    ARCHIVE SYNTHESIS");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`${cyan}Catalyst:${reset} "${result.catalyst}"`);
  lines.push(`${cyan}Archives searched:${reset} ${result.archivesSearched}`);
  lines.push(`${cyan}Patterns found:${reset} ${result.patternsFound.length}`);
  lines.push("");

  if (result.patternsFound.length === 0) {
    lines.push(`${yellow}No matching patterns in archives.${reset}`);
    lines.push("This appears to be a novel problem space.");
  } else {
    lines.push("─── PATTERNS ───");
    lines.push("");

    for (const pattern of result.patternsFound) {
      const relevanceColor = pattern.relevance === "high" ? green :
        pattern.relevance === "medium" ? yellow : reset;

      lines.push(`${relevanceColor}[${pattern.relevance.toUpperCase()}]${reset} ${pattern.title}`);
      lines.push(`  ${cyan}File:${reset} ${pattern.file}`);
      lines.push(`  ${cyan}Connection:${reset} ${pattern.potentialConnection}`);

      if (pattern.snippets.length > 0) {
        lines.push(`  ${cyan}Snippets:${reset}`);
        for (const snippet of pattern.snippets.slice(0, 2)) {
          lines.push(`    "${snippet.substring(0, 100)}..."`);
        }
      }
      lines.push("");
    }

    if (result.breakthroughHints.length > 0) {
      lines.push("─── BREAKTHROUGH HINTS ───");
      lines.push("");
      for (const hint of result.breakthroughHints) {
        lines.push(`${magenta}→${reset} ${hint}`);
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
      catalyst: { type: "string", short: "c" },
      depth: { type: "string", short: "d" },
      "max-patterns": { type: "string", short: "m" },
      json: { type: "boolean", short: "j" },
      prompt: { type: "boolean", short: "p" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
ArchiveSynthesis - Find breakthrough patterns from archives

USAGE:
  bun run ArchiveSynthesis.ts --catalyst "current problem or topic"

OPTIONS:
  -c, --catalyst <text>    The current problem/topic to find patterns for (REQUIRED)
  -d, --depth <level>      Search depth: quick, normal, deep (default: normal)
  -m, --max-patterns <n>   Maximum patterns to return (default: 10)
  -p, --prompt             Output synthesis prompt only (for AI consumption)
  -j, --json               Output as JSON
  -h, --help               Show this help

PHILOSOPHY:
  "Pattern A + Pattern B + New Catalyst = Novel Insight"

  Archives are living subconscious memory. Dormant patterns wait for
  catalysts to trigger breakthrough synthesis.

EXAMPLES:
  bun run ArchiveSynthesis.ts -c "API redesign for scalability"
  bun run ArchiveSynthesis.ts -c "hiring first employee" --depth deep
  bun run ArchiveSynthesis.ts -c "pricing strategy" --prompt
`);
    return;
  }

  if (!values.catalyst) {
    console.error("Error: --catalyst is required");
    console.error("Run with --help for usage");
    process.exit(1);
  }

  const result = await synthesizeFromArchives(values.catalyst, {
    depth: values.depth as "quick" | "normal" | "deep",
    maxPatterns: values["max-patterns"] ? parseInt(values["max-patterns"]) : undefined
  });

  if (values.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (values.prompt) {
    console.log(result.synthesisPrompt);
  } else {
    console.log(formatSynthesisResult(result));
  }
}

// Only run main() if this file is the entry point
if (import.meta.main) {
  main().catch(console.error);
}

// Export for use as module
export {
  synthesizeFromArchives,
  type SynthesisResult,
  type PatternMatch
};
