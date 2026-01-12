#!/usr/bin/env bun

/**
 * ContextLoader - Load relevant project/area context
 *
 * Gathers context from active Projects and Areas to inform AI responses.
 * Helps Claude understand the user's current work situation.
 *
 * Usage:
 *   bun run ContextLoader.ts --topic "current task or question"
 *   bun run ContextLoader.ts --project "ProjectName"
 *   bun run ContextLoader.ts --area "AreaName"
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
  type SearchResult,
  type FileInfo
} from "./VaultReader";

interface ContextNote {
  path: string;
  title: string;
  category: "projects" | "areas";
  relevance: "direct" | "related";
  summary: string;
  keyPoints: string[];
}

interface LoadedContext {
  topic: string;
  projectContext: ContextNote[];
  areaContext: ContextNote[];
  totalNotes: number;
  contextSummary: string;
}

// ============================================================================
// Content Extraction
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

function extractSummary(content: string, maxLength: number = 200): string {
  // Skip frontmatter
  let text = content.replace(/^---[\s\S]*?---\s*/m, "");

  // Skip title
  text = text.replace(/^#\s+.+\n/m, "");

  // Get first meaningful paragraph
  const paragraphs = text.split(/\n\n+/).filter(p => {
    const trimmed = p.trim();
    return trimmed.length > 30 &&
           !trimmed.startsWith("#") &&
           !trimmed.startsWith("-") &&
           !trimmed.startsWith("|");
  });

  if (paragraphs.length > 0) {
    return paragraphs[0].replace(/\n/g, " ").trim().substring(0, maxLength);
  }

  // Fallback: first non-empty lines
  const lines = text.split("\n").filter(l => l.trim().length > 0).slice(0, 3);
  return lines.join(" ").substring(0, maxLength);
}

function extractKeyPoints(content: string, topic: string, maxPoints: number = 5): string[] {
  const points: string[] = [];
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/\s+/).filter(w => w.length > 3);

  // Extract headers as key points
  const headers = content.match(/^##\s+.+$/gm) || [];
  for (const header of headers.slice(0, 3)) {
    points.push(header.replace(/^##\s+/, ""));
  }

  // Extract bullet points containing topic keywords
  const bullets = content.match(/^[-*]\s+.+$/gm) || [];
  for (const bullet of bullets) {
    const bulletLower = bullet.toLowerCase();
    if (topicWords.some(w => bulletLower.includes(w))) {
      const cleaned = bullet.replace(/^[-*]\s+/, "").substring(0, 100);
      if (!points.includes(cleaned)) {
        points.push(cleaned);
      }
    }
    if (points.length >= maxPoints) break;
  }

  return points.slice(0, maxPoints);
}

// ============================================================================
// Context Loading
// ============================================================================

function loadContext(
  vaultRoot: string,
  topic: string,
  options: {
    projectName?: string;
    areaName?: string;
    maxNotes?: number;
  } = {}
): LoadedContext {
  const maxNotes = options.maxNotes || 10;
  const projectContext: ContextNote[] = [];
  const areaContext: ContextNote[] = [];

  // Load specific project if named
  if (options.projectName) {
    const projectNotes = loadCategoryByName(vaultRoot, "projects", options.projectName, topic);
    projectContext.push(...projectNotes);
  }

  // Load specific area if named
  if (options.areaName) {
    const areaNotes = loadCategoryByName(vaultRoot, "areas", options.areaName, topic);
    areaContext.push(...areaNotes);
  }

  // Search projects and areas for topic if no specific names given
  if (!options.projectName && !options.areaName) {
    // Search projects
    const projectResults = searchVault(vaultRoot, topic, {
      category: "projects",
      maxResults: maxNotes
    });

    for (const result of projectResults.slice(0, Math.floor(maxNotes / 2))) {
      const note = processSearchResult(vaultRoot, result, topic, "projects");
      if (note) projectContext.push(note);
    }

    // Search areas
    const areaResults = searchVault(vaultRoot, topic, {
      category: "areas",
      maxResults: maxNotes
    });

    for (const result of areaResults.slice(0, Math.floor(maxNotes / 2))) {
      const note = processSearchResult(vaultRoot, result, topic, "areas");
      if (note) areaContext.push(note);
    }
  }

  // Generate context summary
  const contextSummary = generateContextSummary(topic, projectContext, areaContext);

  return {
    topic,
    projectContext,
    areaContext,
    totalNotes: projectContext.length + areaContext.length,
    contextSummary
  };
}

function loadCategoryByName(
  vaultRoot: string,
  category: "projects" | "areas",
  name: string,
  topic: string
): ContextNote[] {
  const notes: ContextNote[] = [];

  // List files in the category
  const files = listCategory(vaultRoot, category, { recursive: true, limit: 50 });

  // Filter to matching folder name
  const nameLower = name.toLowerCase();
  const matchingFiles = files.filter(f =>
    f.path.toLowerCase().includes(nameLower)
  );

  for (const file of matchingFiles.slice(0, 10)) {
    const noteData = readNote(vaultRoot, file.path);
    if (!noteData) continue;

    const title = extractTitle(noteData.content, file.name);
    const summary = extractSummary(noteData.content);
    const keyPoints = extractKeyPoints(noteData.content, topic);

    notes.push({
      path: file.path,
      title,
      category,
      relevance: "direct",
      summary,
      keyPoints
    });
  }

  return notes;
}

function processSearchResult(
  vaultRoot: string,
  result: SearchResult,
  topic: string,
  category: "projects" | "areas"
): ContextNote | null {
  const noteData = readNote(vaultRoot, result.file);
  if (!noteData) return null;

  const title = extractTitle(noteData.content, result.file);
  const summary = extractSummary(noteData.content);
  const keyPoints = extractKeyPoints(noteData.content, topic);
  const relevance = result.matches.length >= 3 ? "direct" : "related";

  return {
    path: result.file,
    title,
    category,
    relevance,
    summary,
    keyPoints
  };
}

function generateContextSummary(
  topic: string,
  projectContext: ContextNote[],
  areaContext: ContextNote[]
): string {
  const lines: string[] = [];

  lines.push(`CONTEXT LOADED for: "${topic}"\n`);

  if (projectContext.length > 0) {
    lines.push(`ACTIVE PROJECTS (${projectContext.length}):`);
    const direct = projectContext.filter(n => n.relevance === "direct");
    const related = projectContext.filter(n => n.relevance === "related");

    if (direct.length > 0) {
      lines.push(`  Directly relevant: ${direct.map(n => n.title).join(", ")}`);
    }
    if (related.length > 0) {
      lines.push(`  Related: ${related.map(n => n.title).join(", ")}`);
    }
    lines.push("");
  }

  if (areaContext.length > 0) {
    lines.push(`RELEVANT AREAS (${areaContext.length}):`);
    const direct = areaContext.filter(n => n.relevance === "direct");
    const related = areaContext.filter(n => n.relevance === "related");

    if (direct.length > 0) {
      lines.push(`  Directly relevant: ${direct.map(n => n.title).join(", ")}`);
    }
    if (related.length > 0) {
      lines.push(`  Related: ${related.map(n => n.title).join(", ")}`);
    }
    lines.push("");
  }

  if (projectContext.length === 0 && areaContext.length === 0) {
    lines.push("No direct context found in Projects or Areas.");
    lines.push("Consider checking Archives for historical patterns.");
  }

  return lines.join("\n");
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatLoadedContext(context: LoadedContext): string {
  const lines: string[] = [];
  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const cyan = "\x1b[36m";
  const magenta = "\x1b[35m";
  const reset = "\x1b[0m";

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    CONTEXT LOADER");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`${cyan}Topic:${reset} "${context.topic}"`);
  lines.push(`${cyan}Notes loaded:${reset} ${context.totalNotes}`);
  lines.push("");

  if (context.projectContext.length > 0) {
    lines.push("─── PROJECTS ───");
    lines.push("");

    for (const note of context.projectContext) {
      const relevanceColor = note.relevance === "direct" ? green : yellow;
      lines.push(`${relevanceColor}[${note.relevance.toUpperCase()}]${reset} ${note.title}`);
      lines.push(`  ${cyan}Path:${reset} ${note.path}`);
      lines.push(`  ${cyan}Summary:${reset} ${note.summary.substring(0, 150)}...`);

      if (note.keyPoints.length > 0) {
        lines.push(`  ${cyan}Key points:${reset}`);
        for (const point of note.keyPoints.slice(0, 3)) {
          lines.push(`    ${magenta}•${reset} ${point}`);
        }
      }
      lines.push("");
    }
  }

  if (context.areaContext.length > 0) {
    lines.push("─── AREAS ───");
    lines.push("");

    for (const note of context.areaContext) {
      const relevanceColor = note.relevance === "direct" ? green : yellow;
      lines.push(`${relevanceColor}[${note.relevance.toUpperCase()}]${reset} ${note.title}`);
      lines.push(`  ${cyan}Path:${reset} ${note.path}`);
      lines.push(`  ${cyan}Summary:${reset} ${note.summary.substring(0, 150)}...`);

      if (note.keyPoints.length > 0) {
        lines.push(`  ${cyan}Key points:${reset}`);
        for (const point of note.keyPoints.slice(0, 3)) {
          lines.push(`    ${magenta}•${reset} ${point}`);
        }
      }
      lines.push("");
    }
  }

  if (context.totalNotes === 0) {
    lines.push(`${yellow}No relevant context found in Projects or Areas.${reset}`);
    lines.push("Try searching Archives for historical patterns.");
    lines.push("");
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
      topic: { type: "string", short: "t" },
      project: { type: "string", short: "p" },
      area: { type: "string", short: "a" },
      "max-notes": { type: "string", short: "m" },
      json: { type: "boolean", short: "j" },
      summary: { type: "boolean", short: "s" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
ContextLoader - Load relevant project/area context

USAGE:
  bun run ContextLoader.ts --topic "current task or question"
  bun run ContextLoader.ts --project "ProjectName"
  bun run ContextLoader.ts --area "AreaName"

OPTIONS:
  -t, --topic <text>      Topic to find context for
  -p, --project <name>    Load specific project by name
  -a, --area <name>       Load specific area by name
  -m, --max-notes <n>     Maximum notes to load (default: 10)
  -s, --summary           Output summary only (for AI consumption)
  -j, --json              Output as JSON
  -h, --help              Show this help

PHILOSOPHY:
  Context is everything. Loading relevant Projects and Areas
  ensures AI responses are grounded in your current reality.

EXAMPLES:
  bun run ContextLoader.ts -t "pricing strategy"
  bun run ContextLoader.ts --project "ClientX" --topic "invoice"
  bun run ContextLoader.ts --area "Finance" --summary
`);
    return;
  }

  const config = getVaultConfig();

  if (!config.vault_root) {
    console.error("Error: No vault configured. Set PARA_VAULT or vault_root in config.");
    process.exit(1);
  }

  // Must have at least a topic, project, or area
  if (!values.topic && !values.project && !values.area) {
    console.error("Error: Provide --topic, --project, or --area");
    console.error("Run with --help for usage");
    process.exit(1);
  }

  const context = loadContext(config.vault_root, values.topic || "", {
    projectName: values.project,
    areaName: values.area,
    maxNotes: values["max-notes"] ? parseInt(values["max-notes"]) : undefined
  });

  if (values.json) {
    console.log(JSON.stringify(context, null, 2));
  } else if (values.summary) {
    console.log(context.contextSummary);
  } else {
    console.log(formatLoadedContext(context));
  }
}

// Only run main() if this file is the entry point
if (import.meta.main) {
  main().catch(console.error);
}

// Export for use as module
export {
  loadContext,
  type LoadedContext,
  type ContextNote
};
