#!/usr/bin/env bun

/**
 * ContextLoader - Load relevant project/area context
 *
 * Gathers context from active Projects and Areas to inform AI responses.
 *
 * Usage:
 *   bun run ContextLoader.ts --topic "current task or question"
 *   bun run ContextLoader.ts --project "ProjectName"
 */

import { parseArgs } from "util";
import { searchVault, listCategory, readNote, type SearchResult, type FileInfo } from "./VaultReader";
import { getVaultRoot } from "../lib/config-loader";
import { c, header, divider } from "../lib/colors";
import { extractTitle, extractSummary, extractKeyPoints } from "../lib/markdown";

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

function loadContext(
  vaultRoot: string,
  topic: string,
  options: { projectName?: string; areaName?: string; maxNotes?: number } = {}
): LoadedContext {
  const maxNotes = options.maxNotes || 10;
  const projectContext: ContextNote[] = [];
  const areaContext: ContextNote[] = [];

  if (options.projectName) {
    projectContext.push(...loadCategoryByName(vaultRoot, "projects", options.projectName, topic));
  }

  if (options.areaName) {
    areaContext.push(...loadCategoryByName(vaultRoot, "areas", options.areaName, topic));
  }

  // Search if no specific names given
  if (!options.projectName && !options.areaName) {
    const half = Math.floor(maxNotes / 2);

    for (const result of searchVault(vaultRoot, topic, { category: "projects", maxResults: half })) {
      const note = processSearchResult(vaultRoot, result, topic, "projects");
      if (note) projectContext.push(note);
    }

    for (const result of searchVault(vaultRoot, topic, { category: "areas", maxResults: half })) {
      const note = processSearchResult(vaultRoot, result, topic, "areas");
      if (note) areaContext.push(note);
    }
  }

  return {
    topic,
    projectContext,
    areaContext,
    totalNotes: projectContext.length + areaContext.length,
    contextSummary: generateContextSummary(topic, projectContext, areaContext),
  };
}

function loadCategoryByName(
  vaultRoot: string,
  category: "projects" | "areas",
  name: string,
  topic: string
): ContextNote[] {
  const notes: ContextNote[] = [];
  const files = listCategory(vaultRoot, category, { recursive: true, limit: 50 });
  const nameLower = name.toLowerCase();

  for (const file of files.filter((f) => f.path.toLowerCase().includes(nameLower)).slice(0, 10)) {
    const noteData = readNote(vaultRoot, file.path);
    if (!noteData) continue;

    notes.push({
      path: file.path,
      title: extractTitle(noteData.content, file.name),
      category,
      relevance: "direct",
      summary: extractSummary(noteData.content),
      keyPoints: extractKeyPoints(noteData.content, topic),
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

  return {
    path: result.file,
    title: extractTitle(noteData.content, result.file),
    category,
    relevance: result.matches.length >= 3 ? "direct" : "related",
    summary: extractSummary(noteData.content),
    keyPoints: extractKeyPoints(noteData.content, topic),
  };
}

function generateContextSummary(topic: string, projectContext: ContextNote[], areaContext: ContextNote[]): string {
  const lines = [`CONTEXT LOADED for: "${topic}"\n`];

  if (projectContext.length > 0) {
    lines.push(`ACTIVE PROJECTS (${projectContext.length}):`);
    const direct = projectContext.filter((n) => n.relevance === "direct");
    const related = projectContext.filter((n) => n.relevance === "related");
    if (direct.length > 0) lines.push(`  Directly relevant: ${direct.map((n) => n.title).join(", ")}`);
    if (related.length > 0) lines.push(`  Related: ${related.map((n) => n.title).join(", ")}`);
    lines.push("");
  }

  if (areaContext.length > 0) {
    lines.push(`RELEVANT AREAS (${areaContext.length}):`);
    const direct = areaContext.filter((n) => n.relevance === "direct");
    const related = areaContext.filter((n) => n.relevance === "related");
    if (direct.length > 0) lines.push(`  Directly relevant: ${direct.map((n) => n.title).join(", ")}`);
    if (related.length > 0) lines.push(`  Related: ${related.map((n) => n.title).join(", ")}`);
    lines.push("");
  }

  if (projectContext.length === 0 && areaContext.length === 0) {
    lines.push("No direct context found in Projects or Areas.");
    lines.push("Consider checking Archives for historical patterns.");
  }

  return lines.join("\n");
}

function formatLoadedContext(context: LoadedContext): string {
  const lines = [header("CONTEXT LOADER"), "", `${c("cyan", "Topic:")} "${context.topic}"`, `${c("cyan", "Notes loaded:")} ${context.totalNotes}`, ""];

  for (const [label, notes] of [
    ["PROJECTS", context.projectContext],
    ["AREAS", context.areaContext],
  ] as const) {
    if (notes.length > 0) {
      lines.push(`--- ${label} ---`, "");
      for (const note of notes) {
        const color = note.relevance === "direct" ? "green" : "yellow";
        lines.push(`${c(color, `[${note.relevance.toUpperCase()}]`)} ${note.title}`);
        lines.push(`  ${c("cyan", "Path:")} ${note.path}`);
        lines.push(`  ${c("cyan", "Summary:")} ${note.summary.substring(0, 150)}...`);
        if (note.keyPoints.length > 0) {
          lines.push(`  ${c("cyan", "Key points:")}`);
          for (const p of note.keyPoints.slice(0, 3)) lines.push(`    ${c("magenta", "•")} ${p}`);
        }
        lines.push("");
      }
    }
  }

  if (context.totalNotes === 0) {
    lines.push(`${c("yellow", "No relevant context found.")}`);
    lines.push("Try searching Archives for historical patterns.", "");
  }

  lines.push(divider());
  return lines.join("\n");
}

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
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
ContextLoader - Load relevant project/area context

USAGE:
  bun run ContextLoader.ts --topic "current task or question"
  bun run ContextLoader.ts --project "ProjectName"

OPTIONS:
  -t, --topic <text>      Topic to find context for
  -p, --project <name>    Load specific project by name
  -a, --area <name>       Load specific area by name
  -m, --max-notes <n>     Maximum notes (default: 10)
  -s, --summary           Output summary only
  -j, --json              Output as JSON
  -h, --help              Show this help
`);
    return;
  }

  const vaultRoot = getVaultRoot();
  if (!vaultRoot) {
    console.error("Error: No vault configured. Set PARA_VAULT or vault_root in config.");
    process.exit(1);
  }

  if (!values.topic && !values.project && !values.area) {
    console.error("Error: Provide --topic, --project, or --area");
    process.exit(1);
  }

  const context = loadContext(vaultRoot, values.topic || "", {
    projectName: values.project,
    areaName: values.area,
    maxNotes: values["max-notes"] ? parseInt(values["max-notes"]) : undefined,
  });

  if (values.json) {
    console.log(JSON.stringify(context, null, 2));
  } else if (values.summary) {
    console.log(context.contextSummary);
  } else {
    console.log(formatLoadedContext(context));
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { loadContext, type LoadedContext, type ContextNote };
