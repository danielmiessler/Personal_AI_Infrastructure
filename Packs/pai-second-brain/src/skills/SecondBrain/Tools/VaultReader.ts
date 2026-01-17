#!/usr/bin/env bun

/**
 * VaultReader - Foundation tool for PARA vault operations
 *
 * Usage:
 *   bun run VaultReader.ts --search "query"
 *   bun run VaultReader.ts --list projects
 *   bun run VaultReader.ts --read "path/to/note.md"
 *   bun run VaultReader.ts --find-related "topic"
 */

import { parseArgs } from "util";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { colors, c, header, divider } from "../lib/colors";
import { getVaultRoot, loadPARAConfig, type PARAConfig } from "../lib/config-loader";

// Load PARA categories from config
const PARA_CONFIG = loadPARAConfig();
type ParaCategory = keyof typeof PARA_CONFIG.categories;

interface SearchResult {
  file: string;
  category: ParaCategory | "unknown";
  matches: Array<{ line: number; content: string }>;
}

interface FileInfo {
  path: string;
  name: string;
  category: ParaCategory;
  size: number;
  modified: Date;
}

// ============================================================================
// Helpers
// ============================================================================

function getCategoryFolder(vaultRoot: string, category: ParaCategory): string | null {
  const possibleNames = PARA_CONFIG.categories[category];
  for (const name of possibleNames) {
    const path = join(vaultRoot, name);
    if (existsSync(path) && statSync(path).isDirectory()) {
      return path;
    }
  }
  return null;
}

function detectCategory(filePath: string, vaultRoot: string): ParaCategory | "unknown" {
  const relativePath = relative(vaultRoot, filePath);
  const firstFolder = relativePath.split("/")[0];

  for (const [category, names] of Object.entries(PARA_CONFIG.categories)) {
    if (names.includes(firstFolder)) {
      return category as ParaCategory;
    }
  }
  return "unknown";
}

// ============================================================================
// Core Operations
// ============================================================================

function searchVault(
  vaultRoot: string,
  query: string,
  options: { category?: ParaCategory; maxResults?: number } = {}
): SearchResult[] {
  const results: SearchResult[] = [];
  const maxResults = options.maxResults || 50;
  const queryLower = query.toLowerCase();

  function searchDir(dir: string): void {
    if (results.length >= maxResults) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (entry.name.startsWith(".")) continue;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          const category = detectCategory(fullPath, vaultRoot);
          if (options.category && category !== options.category) continue;

          try {
            const content = readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            const matches: Array<{ line: number; content: string }> = [];

            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(queryLower)) {
                matches.push({ line: i + 1, content: lines[i].trim().substring(0, 200) });
              }
            }

            if (matches.length > 0) {
              results.push({
                file: relative(vaultRoot, fullPath),
                category,
                matches: matches.slice(0, 5),
              });
            }
          } catch {}
        }
      }
    } catch {}
  }

  if (options.category) {
    const categoryDir = getCategoryFolder(vaultRoot, options.category);
    if (categoryDir) searchDir(categoryDir);
  } else {
    searchDir(vaultRoot);
  }

  return results;
}

function listCategory(
  vaultRoot: string,
  category: ParaCategory,
  options: { recursive?: boolean; limit?: number } = {}
): FileInfo[] {
  const categoryDir = getCategoryFolder(vaultRoot, category);
  if (!categoryDir) return [];

  const files: FileInfo[] = [];
  const limit = options.limit || 100;

  function listDir(dir: string, depth: number = 0): void {
    if (files.length >= limit) return;
    if (!options.recursive && depth > 0) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= limit) break;
        if (entry.name.startsWith(".")) continue;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          listDir(fullPath, depth + 1);
        } else if (entry.name.endsWith(".md")) {
          const stat = statSync(fullPath);
          files.push({
            path: relative(vaultRoot, fullPath),
            name: entry.name,
            category,
            size: stat.size,
            modified: stat.mtime,
          });
        }
      }
    } catch {}
  }

  listDir(categoryDir);
  files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  return files;
}

function readNote(
  vaultRoot: string,
  notePath: string
): { content: string; category: ParaCategory | "unknown" } | null {
  const fullPath = notePath.startsWith("/") ? notePath : join(vaultRoot, notePath);
  if (!existsSync(fullPath)) return null;

  try {
    const content = readFileSync(fullPath, "utf-8");
    return { content, category: detectCategory(fullPath, vaultRoot) };
  } catch {
    return null;
  }
}

function findRelated(
  vaultRoot: string,
  topic: string,
  options: { limit?: number } = {}
): SearchResult[] {
  const stopwords = ["the", "and", "for", "with", "that", "this", "from", "have", "been"];
  const keywords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.includes(w))
    .slice(0, 5);

  if (keywords.length === 0) {
    return searchVault(vaultRoot, topic, { maxResults: options.limit || 20 });
  }

  const allResults = new Map<string, SearchResult>();

  for (const keyword of keywords) {
    for (const result of searchVault(vaultRoot, keyword, { maxResults: 20 })) {
      const existing = allResults.get(result.file);
      if (existing) {
        existing.matches = [...existing.matches, ...result.matches].slice(0, 10);
      } else {
        allResults.set(result.file, result);
      }
    }
  }

  return Array.from(allResults.values())
    .sort((a, b) => b.matches.length - a.matches.length)
    .slice(0, options.limit || 20);
}

function getVaultStats(vaultRoot: string): Record<ParaCategory, number> {
  const stats: Record<string, number> = {};
  for (const category of Object.keys(PARA_CONFIG.categories)) {
    const files = listCategory(vaultRoot, category as ParaCategory, { recursive: true, limit: 10000 });
    stats[category] = files.length;
  }
  return stats as Record<ParaCategory, number>;
}

// ============================================================================
// Formatting
// ============================================================================

function formatSearchResults(results: SearchResult[], query: string): string {
  const lines = [header(`SEARCH: "${query}"`), ""];

  if (results.length === 0) {
    lines.push("No results found.");
  } else {
    lines.push(`Found ${c("green", String(results.length))} matching files:\n`);
    for (const r of results) {
      lines.push(`${c("cyan", `[${r.category}]`)} ${r.file}`);
      for (const m of r.matches.slice(0, 3)) {
        lines.push(`  ${c("yellow", `L${m.line}:`)} ${m.content.substring(0, 80)}...`);
      }
      lines.push("");
    }
  }

  lines.push(divider());
  return lines.join("\n");
}

function formatFileList(files: FileInfo[], category: ParaCategory): string {
  const lines = [header(`${category.toUpperCase()} (${files.length} files)`), ""];

  if (files.length === 0) {
    lines.push("No files found in this category.");
  } else {
    for (const f of files) {
      lines.push(`${c("cyan", f.modified.toISOString().split("T")[0])}  ${f.path}`);
    }
  }

  lines.push("", divider());
  return lines.join("\n");
}

function formatVaultStats(stats: Record<ParaCategory, number>, vaultRoot: string): string {
  const lines = [header("VAULT STATISTICS"), "", `Vault: ${vaultRoot}`, "", "PARA Categories:"];

  for (const [cat, count] of Object.entries(stats)) {
    lines.push(`  ${c("green", cat.padEnd(10))} ${count} files`);
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  lines.push("", `Total: ${total} markdown files`, "", divider());
  return lines.join("\n");
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      search: { type: "string", short: "s" },
      list: { type: "string", short: "l" },
      read: { type: "string", short: "r" },
      "find-related": { type: "string", short: "f" },
      category: { type: "string", short: "c" },
      stats: { type: "boolean" },
      json: { type: "boolean", short: "j" },
      limit: { type: "string" },
      recursive: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log(`
VaultReader - Foundation tool for PARA vault operations

USAGE:
  bun run VaultReader.ts [command] [options]

COMMANDS:
  -s, --search <query>       Search across vault
  -l, --list <category>      List files (inbox|projects|areas|resources|archives)
  -r, --read <path>          Read a note
  -f, --find-related <topic> Find related notes
      --stats                Show vault statistics

OPTIONS:
  -c, --category <cat>  Filter to category
      --limit <n>       Max results (default: 50)
      --recursive       Include subdirectories
  -j, --json            Output as JSON
  -h, --help            Show this help

CONFIGURATION:
  Set vault via: PARA_VAULT env or vault_root in ~/.claude/config/para-mapping.yaml
`);
    return;
  }

  const vaultRoot = getVaultRoot();
  if (!vaultRoot) {
    console.error("Error: No vault configured.");
    console.error("Set via: PARA_VAULT env or vault_root in ~/.claude/config/para-mapping.yaml");
    process.exit(1);
  }

  const limit = values.limit ? parseInt(values.limit) : undefined;

  if (values.stats) {
    const stats = getVaultStats(vaultRoot);
    console.log(values.json ? JSON.stringify({ vault_root: vaultRoot, stats }, null, 2) : formatVaultStats(stats, vaultRoot));
    return;
  }

  if (values.search) {
    const results = searchVault(vaultRoot, values.search, { category: values.category as ParaCategory, maxResults: limit });
    console.log(values.json ? JSON.stringify(results, null, 2) : formatSearchResults(results, values.search));
    return;
  }

  if (values.list) {
    const category = values.list as ParaCategory;
    if (!PARA_CONFIG.categories[category]) {
      console.error(`Error: Invalid category. Valid: ${Object.keys(PARA_CONFIG.categories).join(", ")}`);
      process.exit(1);
    }
    const files = listCategory(vaultRoot, category, { recursive: values.recursive, limit });
    console.log(values.json ? JSON.stringify(files, null, 2) : formatFileList(files, category));
    return;
  }

  if (values.read) {
    const result = readNote(vaultRoot, values.read);
    if (!result) {
      console.error(`Error: File not found: ${values.read}`);
      process.exit(1);
    }
    console.log(values.json ? JSON.stringify(result, null, 2) : `[${result.category}] ${values.read}\n\n${result.content}`);
    return;
  }

  if (values["find-related"]) {
    const results = findRelated(vaultRoot, values["find-related"], { limit });
    console.log(values.json ? JSON.stringify(results, null, 2) : formatSearchResults(results, values["find-related"]));
    return;
  }

  console.error("Error: No command specified. Use --help for usage.");
  process.exit(1);
}

if (import.meta.main) {
  main().catch(console.error);
}

export {
  searchVault,
  listCategory,
  readNote,
  findRelated,
  getVaultStats,
  getCategoryFolder,
  detectCategory,
  type ParaCategory,
  type SearchResult,
  type FileInfo,
};
