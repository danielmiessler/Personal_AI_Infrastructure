#!/usr/bin/env bun

/**
 * VaultReader - Foundation tool for PARA vault operations
 *
 * Reads, searches, and navigates PARA-structured knowledge vaults.
 * Foundation layer that other Second Brain tools build upon.
 *
 * Usage:
 *   bun run VaultReader.ts --search "query"
 *   bun run VaultReader.ts --list projects
 *   bun run VaultReader.ts --read "path/to/note.md"
 *   bun run VaultReader.ts --find-related "topic"
 *
 * @version 1.0.0
 */

import { parseArgs } from "util";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, relative, basename } from "path";
import { parse as parseYaml } from "yaml";

// PARA category mapping
const PARA_CATEGORIES = {
  inbox: ["_00_Inbox", "00_Inbox", "Inbox"],
  projects: ["_01_Projects", "01_Projects", "Projects"],
  areas: ["_02_Areas", "02_Areas", "Areas"],
  resources: ["_03_Resources", "03_Resources", "Resources"],
  archives: ["_04_Archives", "04_Archives", "Archives"]
} as const;

type ParaCategory = keyof typeof PARA_CATEGORIES;

interface VaultConfig {
  vault_root: string | null;
  source: "env" | "config" | "none";
}

interface SearchResult {
  file: string;
  category: ParaCategory | "unknown";
  matches: Array<{
    line: number;
    content: string;
  }>;
}

interface FileInfo {
  path: string;
  name: string;
  category: ParaCategory;
  size: number;
  modified: Date;
}

// ============================================================================
// Configuration
// ============================================================================

function getVaultConfig(): VaultConfig {
  // 1. Check environment variable
  const envVault = process.env.PARA_VAULT;
  if (envVault && existsSync(envVault)) {
    return { vault_root: envVault, source: "env" };
  }

  // 2. Check para-mapping.yaml
  const paiDir = process.env.PAI_DIR || `${process.env.HOME}/.claude`;
  const configPath = `${paiDir}/config/para-mapping.yaml`;

  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, "utf-8");
      const config = parseYaml(content);
      if (config.vault_root && existsSync(config.vault_root)) {
        return { vault_root: config.vault_root, source: "config" };
      }
    } catch {
      // Config parse error, continue
    }
  }

  return { vault_root: null, source: "none" };
}

function getCategoryFolder(vaultRoot: string, category: ParaCategory): string | null {
  const possibleNames = PARA_CATEGORIES[category];
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

  for (const [category, names] of Object.entries(PARA_CATEGORIES)) {
    if (names.includes(firstFolder)) {
      return category as ParaCategory;
    }
  }
  return "unknown";
}

// ============================================================================
// Core Operations
// ============================================================================

function searchVault(vaultRoot: string, query: string, options: { category?: ParaCategory; maxResults?: number } = {}): SearchResult[] {
  const results: SearchResult[] = [];
  const maxResults = options.maxResults || 50;
  const queryLower = query.toLowerCase();

  function searchDir(dir: string): void {
    if (results.length >= maxResults) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = join(dir, entry.name);

        // Skip hidden files/folders
        if (entry.name.startsWith(".")) continue;

        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          const category = detectCategory(fullPath, vaultRoot);

          // Filter by category if specified
          if (options.category && category !== options.category) continue;

          try {
            const content = readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            const matches: Array<{ line: number; content: string }> = [];

            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(queryLower)) {
                matches.push({
                  line: i + 1,
                  content: lines[i].trim().substring(0, 200)
                });
              }
            }

            if (matches.length > 0) {
              results.push({
                file: relative(vaultRoot, fullPath),
                category,
                matches: matches.slice(0, 5) // Max 5 matches per file
              });
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  // Search specific category or all
  if (options.category) {
    const categoryDir = getCategoryFolder(vaultRoot, options.category);
    if (categoryDir) searchDir(categoryDir);
  } else {
    searchDir(vaultRoot);
  }

  return results;
}

function listCategory(vaultRoot: string, category: ParaCategory, options: { recursive?: boolean; limit?: number } = {}): FileInfo[] {
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
            modified: stat.mtime
          });
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  listDir(categoryDir);

  // Sort by modified date, newest first
  files.sort((a, b) => b.modified.getTime() - a.modified.getTime());

  return files;
}

function readNote(vaultRoot: string, notePath: string): { content: string; category: ParaCategory | "unknown" } | null {
  const fullPath = notePath.startsWith("/") ? notePath : join(vaultRoot, notePath);

  if (!existsSync(fullPath)) return null;

  try {
    const content = readFileSync(fullPath, "utf-8");
    const category = detectCategory(fullPath, vaultRoot);
    return { content, category };
  } catch {
    return null;
  }
}

function findRelated(vaultRoot: string, topic: string, options: { limit?: number } = {}): SearchResult[] {
  // Extract keywords from topic
  const keywords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !["the", "and", "for", "with", "that", "this", "from", "have", "been"].includes(w));

  if (keywords.length === 0) {
    return searchVault(vaultRoot, topic, { maxResults: options.limit || 20 });
  }

  // Search for each keyword and combine results
  const allResults = new Map<string, SearchResult>();

  for (const keyword of keywords.slice(0, 5)) { // Max 5 keywords
    const results = searchVault(vaultRoot, keyword, { maxResults: 20 });
    for (const result of results) {
      const existing = allResults.get(result.file);
      if (existing) {
        // Merge matches
        existing.matches = [...existing.matches, ...result.matches].slice(0, 10);
      } else {
        allResults.set(result.file, result);
      }
    }
  }

  // Sort by number of keyword matches (relevance)
  const sorted = Array.from(allResults.values())
    .sort((a, b) => b.matches.length - a.matches.length)
    .slice(0, options.limit || 20);

  return sorted;
}

function getVaultStats(vaultRoot: string): Record<ParaCategory, number> {
  const stats: Record<ParaCategory, number> = {
    inbox: 0,
    projects: 0,
    areas: 0,
    resources: 0,
    archives: 0
  };

  for (const category of Object.keys(PARA_CATEGORIES) as ParaCategory[]) {
    const files = listCategory(vaultRoot, category, { recursive: true, limit: 10000 });
    stats[category] = files.length;
  }

  return stats;
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatSearchResults(results: SearchResult[], query: string): string {
  const lines: string[] = [];
  const green = "\x1b[32m";
  const yellow = "\x1b[33m";
  const cyan = "\x1b[36m";
  const reset = "\x1b[0m";

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`                    SEARCH: "${query}"`);
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  if (results.length === 0) {
    lines.push("No results found.");
  } else {
    lines.push(`Found ${green}${results.length}${reset} matching files:\n`);

    for (const result of results) {
      lines.push(`${cyan}[${result.category}]${reset} ${result.file}`);
      for (const match of result.matches.slice(0, 3)) {
        lines.push(`  ${yellow}L${match.line}:${reset} ${match.content.substring(0, 80)}...`);
      }
      lines.push("");
    }
  }

  lines.push("═══════════════════════════════════════════════════════════════");
  return lines.join("\n");
}

function formatFileList(files: FileInfo[], category: ParaCategory): string {
  const lines: string[] = [];
  const cyan = "\x1b[36m";
  const reset = "\x1b[0m";

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`                    ${category.toUpperCase()} (${files.length} files)`);
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");

  if (files.length === 0) {
    lines.push("No files found in this category.");
  } else {
    for (const file of files) {
      const date = file.modified.toISOString().split("T")[0];
      lines.push(`${cyan}${date}${reset}  ${file.path}`);
    }
  }

  lines.push("");
  lines.push("═══════════════════════════════════════════════════════════════");
  return lines.join("\n");
}

function formatVaultStats(stats: Record<ParaCategory, number>, vaultRoot: string): string {
  const lines: string[] = [];
  const green = "\x1b[32m";
  const reset = "\x1b[0m";

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    VAULT STATISTICS");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`Vault: ${vaultRoot}`);
  lines.push("");
  lines.push("PARA Categories:");
  lines.push(`  ${green}Inbox${reset}     ${stats.inbox} files`);
  lines.push(`  ${green}Projects${reset}  ${stats.projects} files`);
  lines.push(`  ${green}Areas${reset}     ${stats.areas} files`);
  lines.push(`  ${green}Resources${reset} ${stats.resources} files`);
  lines.push(`  ${green}Archives${reset}  ${stats.archives} files`);
  lines.push("");
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  lines.push(`Total: ${total} markdown files`);
  lines.push("");
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
      search: { type: "string", short: "s" },
      list: { type: "string", short: "l" },
      read: { type: "string", short: "r" },
      "find-related": { type: "string", short: "f" },
      category: { type: "string", short: "c" },
      stats: { type: "boolean" },
      json: { type: "boolean", short: "j" },
      limit: { type: "string" },
      recursive: { type: "boolean" },
      help: { type: "boolean", short: "h" }
    }
  });

  if (values.help) {
    console.log(`
VaultReader - Foundation tool for PARA vault operations

USAGE:
  bun run VaultReader.ts [command] [options]

COMMANDS:
  -s, --search <query>       Search across vault for text
  -l, --list <category>      List files in category (inbox|projects|areas|resources|archives)
  -r, --read <path>          Read a specific note
  -f, --find-related <topic> Find notes related to a topic
      --stats                Show vault statistics

OPTIONS:
  -c, --category <cat>  Filter search to specific category
      --limit <n>       Max results (default: 50)
      --recursive       Include subdirectories when listing
  -j, --json            Output as JSON
  -h, --help            Show this help

CONFIGURATION:
  Set vault location via:
  1. Environment: export PARA_VAULT="/path/to/vault"
  2. Config: vault_root in ~/.claude/config/para-mapping.yaml

EXAMPLES:
  bun run VaultReader.ts --search "microservices"
  bun run VaultReader.ts --list archives --recursive
  bun run VaultReader.ts --read "_01_Projects/MyProject/notes.md"
  bun run VaultReader.ts --find-related "API design patterns"
  bun run VaultReader.ts --stats
`);
    return;
  }

  // Get vault configuration
  const config = getVaultConfig();

  if (!config.vault_root) {
    console.error("Error: No vault configured.");
    console.error("");
    console.error("Set vault location via:");
    console.error("  1. Environment: export PARA_VAULT=\"/path/to/vault\"");
    console.error("  2. Config: Add vault_root to ~/.claude/config/para-mapping.yaml");
    process.exit(1);
  }

  const limit = values.limit ? parseInt(values.limit) : undefined;

  // Stats command
  if (values.stats) {
    const stats = getVaultStats(config.vault_root);
    if (values.json) {
      console.log(JSON.stringify({ vault_root: config.vault_root, stats }, null, 2));
    } else {
      console.log(formatVaultStats(stats, config.vault_root));
    }
    return;
  }

  // Search command
  if (values.search) {
    const category = values.category as ParaCategory | undefined;
    const results = searchVault(config.vault_root, values.search, { category, maxResults: limit });

    if (values.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(formatSearchResults(results, values.search));
    }
    return;
  }

  // List command
  if (values.list) {
    const category = values.list as ParaCategory;
    if (!PARA_CATEGORIES[category]) {
      console.error(`Error: Invalid category "${values.list}"`);
      console.error("Valid categories: inbox, projects, areas, resources, archives");
      process.exit(1);
    }

    const files = listCategory(config.vault_root, category, {
      recursive: values.recursive,
      limit
    });

    if (values.json) {
      console.log(JSON.stringify(files, null, 2));
    } else {
      console.log(formatFileList(files, category));
    }
    return;
  }

  // Read command
  if (values.read) {
    const result = readNote(config.vault_root, values.read);

    if (!result) {
      console.error(`Error: File not found: ${values.read}`);
      process.exit(1);
    }

    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`[${result.category}] ${values.read}\n`);
      console.log(result.content);
    }
    return;
  }

  // Find related command
  if (values["find-related"]) {
    const results = findRelated(config.vault_root, values["find-related"], { limit });

    if (values.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(formatSearchResults(results, values["find-related"]));
    }
    return;
  }

  // No command specified
  console.error("Error: No command specified. Use --help for usage.");
  process.exit(1);
}

// Only run main() if this file is the entry point
if (import.meta.main) {
  main().catch(console.error);
}

// Export for use as module
export {
  getVaultConfig,
  searchVault,
  listCategory,
  readNote,
  findRelated,
  getVaultStats,
  PARA_CATEGORIES,
  type ParaCategory,
  type SearchResult,
  type FileInfo,
  type VaultConfig
};
