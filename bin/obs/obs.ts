#!/usr/bin/env bun

/**
 * obs - Obsidian Vault CLI for PAI Context Management
 *
 * Commands:
 *   search    Search notes by tag or text
 *   read      Read a note's content
 *   write     Write a new note to the vault
 *   tags      List all tags in the vault
 *   embed     Build/update vector embeddings (future)
 *   semantic  Semantic search (future)
 */

import { parseArgs } from "util";
import { searchNotes, SearchOptions, ScopeFilter, parseSince } from "./lib/search";
import { readNote } from "./lib/read";
import { writeNote, WriteOptions } from "./lib/write";
import { listTags, addTagToNote, removeTagFromNote, resolveNotePath } from "./lib/tags";
import { getConfig } from "./lib/config";
import { buildEmbeddings, semanticSearch, getEmbeddingStats, ScopeFilter as EmbedScopeFilter, SemanticSearchOptions } from "./lib/embed";
import {
  toIndexedResults,
  toSemanticIndexedResults,
  formatIndexTable,
  formatIndexJson,
  saveSearchIndex,
  loadSearchIndex,
  loadBySelection,
  formatLoadSummary,
  parseSelection,
  SearchIndex,
  IndexedResult,
} from "./lib/index";

const HELP = `
obs - Obsidian Vault CLI for PAI Context Management

USAGE:
  obs <command> [options]

COMMANDS:
  search     Search notes by tag or text (discovery phase)
  semantic   Semantic search using embeddings (discovery phase)
  load       Load notes from last search by selection (injection phase)
  read       Read a specific note's content
  write      Write a new note to the vault
  tag        Add or remove tags from notes
  tags       List all tags in the vault
  incoming   List notes waiting to be processed (#incoming tag)
  context    Load context for a project (shortcut for tag search)
  embed      Build/update vector embeddings
  config     Show current configuration

SEARCH OPTIONS:
  --tag, -t <tag>        Filter by tag (can use multiple, AND logic)
  --any-tag <tag>        Filter by tag (can use multiple, OR logic)
  --not-tag <tag>        Exclude notes with this tag
  --type <type>          Filter by type (transcript, meeting, wisdom, note, etc.)
  --text, -x <query>     Full-text search
  --recent, -r <n>       Limit to N most recent notes
  --format <fmt>         Output format: list, index (table), json (for Claude)
  --since <when>         Filter by capture date (frontmatter generation_date)
                         - "7d", "2w", "1m" - relative (days/weeks/months)
                         - "today", "yesterday", "this week", "this month"
                         - "2025-12-01" - ISO date
  --modified <when>      Filter by file modification time (same formats as --since)
  --created <when>       Filter by file creation time (same formats as --since)
  --untagged             Find notes without tags
  --scope <scope>        Scope filter: work (default), private, all

SEMANTIC OPTIONS:
  <query>                Natural language search query
  --limit, -l <n>        Limit results (default: 10)
  --format <fmt>         Output format: list (default), index (numbered for load)
  --scope <scope>        Scope filter: work (default), private, all
  --tag, -t <tag>        Filter to notes with this tag (can use multiple, AND logic)
  --any-tag <tag>        Filter to notes with any of these tags (OR logic)
  --doc, -d <pattern>    Filter by document name pattern (glob: * = any, ? = single char)

LOAD OPTIONS (from last search):
  <selection>            Numbers to load: "all", "1,2,5", "1-5", "1,3-5,10"
  --tag <tag>            Load by tag (can use multiple, AND logic)
  --any-tag <tag>        Load by tag (can use multiple, OR logic)
  --type <type>          Load by type: transcript, meeting, note, wisdom, etc.
  --since <date>         Load notes from date (YYYY-MM-DD)

CONTEXT OPTIONS:
  <project>              Project name (searches project/<name> tag)
  --recent, -r <n>       Limit results (default: 20)
  --format <fmt>         Output format: list (default), index (numbered)

TAG OPTIONS:
  tag add <note> <tag>   Add a tag to a note
  tag remove <note> <tag> Remove a tag from a note

  Note selectors:
    - Index from last search: obs tag add 3 architecture
    - Note name: obs tag add "My Note" project/pai
    - Full path: obs tag add /path/to/note.md todo

EXAMPLES:
  # Two-phase context retrieval
  obs search --tag project/pai --format index    # Discovery: numbered list
  obs semantic "deployment" --format index       # Discovery: semantic search
  obs load 1,2,5                                 # Injection: load selected
  obs load all                                   # Injection: load everything
  obs load --type transcript                     # Injection: filter by type
  obs load --tag architecture                    # Injection: filter by tag

  # Semantic search with filters (NEW)
  obs semantic "what did Lyndon say" --tag project/ai-tailgating
  obs semantic "architecture concerns" --doc "2025-12-08-Architecture*"
  obs semantic "compliance" --tag project/ai-tailgating --tag compliance

  # Project context
  obs context pai --format index                 # Discovery + numbered
  obs context eea24 --recent 10

  # Basic search
  obs search --tag meeting-notes --tag ed_overy
  obs search --text "kubernetes" --not-tag incoming
  obs incoming --recent 20

  # Read/Write
  obs read "2024-06-10-Meeting"
  obs write "My Note" --tags "incoming,project/pai"

  # Embeddings
  obs embed --verbose
  obs semantic "deployment strategies"

  # Tag management
  obs tag add 3 architecture                 # Add tag to note #3 from last search
  obs tag add "My Note" project/pai          # Add tag by note name
  obs tag remove 3 incoming                  # Remove tag from note
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case "search":
        await handleSearch(commandArgs);
        break;
      case "read":
        await handleRead(commandArgs);
        break;
      case "write":
        await handleWrite(commandArgs);
        break;
      case "tags":
        await handleTags(commandArgs);
        break;
      case "tag":
        await handleTag(commandArgs);
        break;
      case "config":
        await handleConfig();
        break;
      case "embed":
        await handleEmbed(commandArgs);
        break;
      case "semantic":
        await handleSemantic(commandArgs);
        break;
      case "context":
        await handleContext(commandArgs);
        break;
      case "incoming":
        await handleIncoming(commandArgs);
        break;
      case "load":
        await handleLoad(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log("Run 'obs --help' for usage.");
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function handleSearch(args: string[]) {
  const options: SearchOptions = {
    tags: [],
    text: undefined,
    recent: undefined,
    untagged: false,
    notTags: [],
    scope: "work",  // Default: exclude private content
  };
  let format: "list" | "index" | "json" = "list";
  let filterType: string | undefined;
  const anyTags: string[] = [];  // OR logic tags

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--tag":
      case "-t":
        options.tags.push(args[++i]);
        break;
      case "--any-tag":
        anyTags.push(args[++i]);
        break;
      case "--not-tag":
        options.notTags!.push(args[++i]);
        break;
      case "--type":
        filterType = args[++i];
        break;
      case "--text":
      case "-x":
        options.text = args[++i];
        break;
      case "--recent":
      case "-r":
        options.recent = parseInt(args[++i], 10);
        break;
      case "--untagged":
        options.untagged = true;
        break;
      case "--format":
      case "-f":
        const formatArg = args[++i]?.toLowerCase();
        if (formatArg === "list" || formatArg === "index" || formatArg === "json") {
          format = formatArg;
        } else {
          console.error(`Invalid format: ${formatArg}. Use: list, index, or json`);
          process.exit(1);
        }
        break;
      case "--scope":
      case "-s":
        const scopeArg = args[++i]?.toLowerCase();
        if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
          options.scope = scopeArg as ScopeFilter;
        } else {
          console.error(`Invalid scope: ${scopeArg}. Use: work, private, or all`);
          process.exit(1);
        }
        break;
      case "--since":
        const sinceValue = args[++i];
        const sinceDate = parseSince(sinceValue);
        if (sinceDate) {
          options.since = sinceDate;
        } else {
          console.error(`Invalid --since value: ${sinceValue}`);
          console.error(`Use: 7d, 2w, 1m, today, yesterday, "this week", "this month", or YYYY-MM-DD`);
          process.exit(1);
        }
        break;
      case "--modified":
        const modifiedValue = args[++i];
        const modifiedDate = parseSince(modifiedValue);
        if (modifiedDate) {
          options.modified = modifiedDate;
        } else {
          console.error(`Invalid --modified value: ${modifiedValue}`);
          console.error(`Use: 7d, 2w, 1m, today, yesterday, "this week", "this month", or YYYY-MM-DD`);
          process.exit(1);
        }
        break;
      case "--created":
        const createdValue = args[++i];
        const createdDate = parseSince(createdValue);
        if (createdDate) {
          options.created = createdDate;
        } else {
          console.error(`Invalid --created value: ${createdValue}`);
          console.error(`Use: 7d, 2w, 1m, today, yesterday, "this week", "this month", or YYYY-MM-DD`);
          process.exit(1);
        }
        break;
      default:
        // Treat as text search if no flag
        if (!arg.startsWith("-")) {
          options.text = arg;
        }
        break;
    }
    i++;
  }

  let results = await searchNotes(options);

  // Apply anyTags filter (OR logic) if specified
  if (anyTags.length > 0) {
    results = results.filter(r =>
      anyTags.some(tag => r.tags.some(t => t.includes(tag)))
    );
  }

  if (results.length === 0) {
    console.log("No notes found matching criteria.");
    return;
  }

  // Format output based on --format flag
  if (format === "index" || format === "json") {
    let queryParts: string[] = [];
    if (options.tags.length > 0) queryParts.push(`#${options.tags.join(" #")}`);
    if (anyTags.length > 0) queryParts.push(`any:${anyTags.map(t => `#${t}`).join("|")}`);
    if (options.text) queryParts.push(options.text);
    const query = queryParts.length > 0 ? queryParts.join(" ") : "search";
    let indexedResults = toIndexedResults(results);

    // Filter by type if specified
    if (filterType) {
      indexedResults = indexedResults.filter(r => r.type === filterType);
      // Re-index after filtering
      indexedResults = indexedResults.map((r, i) => ({ ...r, index: i + 1 }));
    }

    if (indexedResults.length === 0) {
      console.log(`No notes found matching type: ${filterType}`);
      return;
    }

    // Save for subsequent load command
    const searchIndex: SearchIndex = {
      query: filterType ? `${query} [type:${filterType}]` : query,
      timestamp: new Date().toISOString(),
      tagMatches: indexedResults,
      semanticMatches: [],
    };
    await saveSearchIndex(searchIndex);

    if (format === "json") {
      console.log(formatIndexJson(indexedResults, [], query));
    } else {
      console.log(formatIndexTable(indexedResults, [], query));
    }
  } else {
    // Default list format - also filter by type
    let filteredResults = results;
    if (filterType) {
      // Need to detect type for filtering in list mode
      const indexed = toIndexedResults(results);
      const filteredIndexed = indexed.filter(r => r.type === filterType);
      const filteredNames = new Set(filteredIndexed.map(r => r.name));
      filteredResults = results.filter(r => filteredNames.has(r.name));
    }

    if (filteredResults.length === 0) {
      console.log(`No notes found matching type: ${filterType}`);
      return;
    }

    console.log(`Found ${filteredResults.length} note(s):\n`);
    for (const note of filteredResults) {
      const tagsStr = note.tags.length > 0 ? ` [${note.tags.join(", ")}]` : "";
      console.log(`  ${note.name}${tagsStr}`);
    }
  }
}

async function handleRead(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: obs read <note-name>");
    process.exit(1);
  }

  const noteName = args[0];
  const content = await readNote(noteName);
  console.log(content);
}

async function handleWrite(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: obs write <title> [--tags <tags>] [--content <text>]");
    console.error("   or: obs write --title <title> --tag <tag> --content <text>");
    process.exit(1);
  }

  const options: WriteOptions = {
    title: "",
    tags: [],
    content: "",
  };

  // If first arg is not a flag, treat it as the title
  let i = 0;
  if (!args[0].startsWith("-")) {
    options.title = args[0];
    i = 1;
  }

  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--title":
        options.title = args[++i];
        break;
      case "--tags":
        options.tags = args[++i].split(",").map(t => t.trim());
        break;
      case "--tag":
      case "-t":
        options.tags.push(args[++i]);
        break;
      case "--content":
      case "-c":
        options.content = args[++i];
        break;
      default:
        break;
    }
    i++;
  }

  if (!options.title) {
    console.error("Error: Title is required");
    process.exit(1);
  }

  // Read from stdin if no content provided
  if (!options.content) {
    const stdin = await Bun.stdin.text();
    if (stdin.trim()) {
      options.content = stdin.trim();
    }
  }

  const filePath = await writeNote(options);
  console.log(`Created: ${filePath}`);
}

async function handleTags(args: string[]) {
  const showCounts = args.includes("--counts") || args.includes("-c");
  const tags = await listTags(showCounts);

  if (showCounts) {
    console.log("Tag usage:\n");
    for (const [tag, count] of Object.entries(tags).sort((a, b) => (b[1] as number) - (a[1] as number))) {
      console.log(`  ${tag}: ${count}`);
    }
  } else {
    console.log("Tags in vault:\n");
    for (const tag of Object.keys(tags).sort()) {
      console.log(`  ${tag}`);
    }
  }
}

async function handleTag(args: string[]) {
  if (args.length < 2) {
    console.error("Usage: obs tag <action> <note> <tag>");
    console.error("");
    console.error("Actions:");
    console.error("  add <note> <tag>      Add a tag to a note");
    console.error("  remove <note> <tag>   Remove a tag from a note");
    console.error("");
    console.error("Note selectors:");
    console.error("  - Index from last search: obs tag add 3 architecture");
    console.error("  - Note name: obs tag add \"My Note\" project/pai");
    console.error("  - Full path: obs tag add /path/to/note.md todo");
    process.exit(1);
  }

  const action = args[0];
  const noteSelector = args[1];
  const tag = args[2];

  if (!tag) {
    console.error("Error: Tag is required");
    console.error("Usage: obs tag add <note> <tag>");
    process.exit(1);
  }

  // Resolve note path (supports index, name, or path)
  const notePath = await resolveNotePath(noteSelector);
  const noteName = notePath.split("/").pop()?.replace(".md", "") || noteSelector;

  switch (action) {
    case "add": {
      const result = await addTagToNote(notePath, tag);
      if (result.added) {
        console.log(`✅ Added #${tag} to "${noteName}"`);
      } else {
        console.log(`ℹ️  Tag #${tag} already exists on "${noteName}"`);
      }
      break;
    }
    case "remove": {
      const result = await removeTagFromNote(notePath, tag);
      if (result.removed) {
        console.log(`✅ Removed #${tag} from "${noteName}"`);
      } else {
        console.log(`ℹ️  Tag #${tag} not found on "${noteName}"`);
      }
      break;
    }
    default:
      console.error(`Unknown tag action: ${action}`);
      console.error("Use: add, remove");
      process.exit(1);
  }
}

async function handleConfig() {
  const config = getConfig();
  console.log("Current configuration:\n");
  console.log(`  Vault path: ${config.vaultPath}`);
  console.log(`  Meta path: ${config.metaPath}`);
  console.log(`  Embeddings DB: ${config.embeddingsDb}`);
}

async function handleEmbed(args: string[]) {
  const force = args.includes("--force") || args.includes("-f");
  const verbose = args.includes("--verbose") || args.includes("-v");
  const showStats = args.includes("--stats");

  if (showStats) {
    const stats = await getEmbeddingStats();
    console.log("Embedding statistics:\n");
    console.log(`  Total notes: ${stats.totalNotes}`);
    console.log(`  Total chunks: ${stats.totalChunks}`);
    console.log(`  Last updated: ${stats.lastUpdated?.toLocaleString() || "Never"}`);
    return;
  }

  console.log("Building embeddings...\n");
  const result = await buildEmbeddings({ force, verbose });
  console.log(`\nDone!`);
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Skipped: ${result.skipped}`);
  console.log(`  Errors: ${result.errors}`);
}

async function handleSemantic(args: string[]) {
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error("Usage: obs semantic <query> [--limit <n>] [--scope <scope>] [--format index|json]");
    console.error("       [--tag <tag>] [--doc <pattern>]");
    console.error("\nExamples:");
    console.error("  obs semantic \"what did Lyndon say\" --tag project/ai-tailgating");
    console.error("  obs semantic \"architecture\" --doc \"2025-12-08-Architecture*\"");
    process.exit(1);
  }

  const query = args[0];
  let limit = 10;
  let scope: EmbedScopeFilter = "work"; // Default: exclude private
  let format: "list" | "index" | "json" = "list";
  const tags: string[] = [];
  const anyTags: string[] = [];  // OR logic tags
  let docPattern: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--limit" || args[i] === "-l") {
      limit = parseInt(args[++i], 10);
    } else if (args[i] === "--scope" || args[i] === "-s") {
      const scopeArg = args[++i]?.toLowerCase();
      if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
        scope = scopeArg as EmbedScopeFilter;
      }
    } else if (args[i] === "--format" || args[i] === "-f") {
      const formatArg = args[++i]?.toLowerCase();
      if (formatArg === "list" || formatArg === "index" || formatArg === "json") {
        format = formatArg;
      }
    } else if (args[i] === "--tag" || args[i] === "-t") {
      tags.push(args[++i]);
    } else if (args[i] === "--any-tag") {
      anyTags.push(args[++i]);
    } else if (args[i] === "--doc" || args[i] === "-d") {
      docPattern = args[++i];
    }
  }

  const searchOptions: SemanticSearchOptions = {
    limit,
    scope,
    tags: tags.length > 0 ? tags : undefined,
    docPattern,
  };

  let results = await semanticSearch(query, searchOptions);

  // Apply anyTags filter (OR logic) if specified
  if (anyTags.length > 0) {
    results = results.filter(r =>
      anyTags.some(tag => r.tags?.some(t => t.includes(tag)))
    );
  }

  if (results.length === 0) {
    const hint = tags.length > 0 || anyTags.length > 0 || docPattern
      ? " (check your filters)"
      : " Have you run 'obs embed' first?";
    console.log(`No results found.${hint}`);
    return;
  }

  // Build query string for display (include filters)
  let displayQuery = `"${query}"`;
  if (tags.length > 0) {
    displayQuery += ` [tags: ${tags.map(t => `#${t}`).join(", ")}]`;
  }
  if (anyTags.length > 0) {
    displayQuery += ` [any: ${anyTags.map(t => `#${t}`).join("|")}]`;
  }
  if (docPattern) {
    displayQuery += ` [doc: ${docPattern}]`;
  }

  // Format output based on --format flag
  if (format === "index" || format === "json") {
    const indexedResults = toSemanticIndexedResults(results);

    // Save for subsequent load command
    const searchIndex: SearchIndex = {
      query: displayQuery,
      timestamp: new Date().toISOString(),
      tagMatches: [],
      semanticMatches: indexedResults,
    };
    await saveSearchIndex(searchIndex);
    
    if (format === "json") {
      console.log(formatIndexJson([], indexedResults, displayQuery));
    } else {
      console.log(formatIndexTable([], indexedResults, displayQuery));
    }
  } else {
    // Default list format
    console.log(`Top ${results.length} results for: ${displayQuery}\n`);
    for (const result of results) {
      const similarity = (result.similarity * 100).toFixed(1);
      console.log(`  [${similarity}%] ${result.noteName}`);
      // Show snippet of matching content
      const snippet = result.content.slice(0, 100).replace(/\n/g, " ").trim();
      console.log(`          ${snippet}...`);
    }
  }
}

async function handleContext(args: string[]) {
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error("Usage: obs context <project-name> [--recent <n>] [--scope <scope>] [--format index|json]");
    console.error("\nExamples:");
    console.error("  obs context pai");
    console.error("  obs context pai --format json     # JSON for Claude to format");
    console.error("  obs context pai --format index    # Numbered table");
    console.error("  obs context eea24 --recent 10");
    console.error("  obs context pai --scope all       # Include private notes");
    process.exit(1);
  }

  const projectName = args[0];
  let recent = 20; // Default to 20 recent notes
  let scope: ScopeFilter = "work"; // Default: exclude private
  let format: "list" | "index" | "json" = "list";

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--recent" || args[i] === "-r") {
      recent = parseInt(args[++i], 10);
    } else if (args[i] === "--scope" || args[i] === "-s") {
      const scopeArg = args[++i]?.toLowerCase();
      if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
        scope = scopeArg as ScopeFilter;
      }
    } else if (args[i] === "--format" || args[i] === "-f") {
      const formatArg = args[++i]?.toLowerCase();
      if (formatArg === "list" || formatArg === "index" || formatArg === "json") {
        format = formatArg;
      }
    }
  }

  // Search for project tag
  const projectTag = `project/${projectName}`;
  const results = await searchNotes({
    tags: [projectTag],
    recent,
    scope,
  });

  if (results.length === 0) {
    console.log(`No notes found with tag: #${projectTag}`);
    console.log("\nAvailable project tags:");
    const tags = await listTags(true);
    const projectTags = Object.keys(tags).filter((t) => t.startsWith("project/"));
    for (const tag of projectTags.slice(0, 10)) {
      console.log(`  #${tag} (${tags[tag]} notes)`);
    }
    return;
  }

  // Format output based on --format flag
  if (format === "index" || format === "json") {
    const query = `#${projectTag}`;
    const indexedResults = toIndexedResults(results);
    
    // Save for subsequent load command
    const searchIndex: SearchIndex = {
      query,
      timestamp: new Date().toISOString(),
      tagMatches: indexedResults,
      semanticMatches: [],
    };
    await saveSearchIndex(searchIndex);
    
    if (format === "json") {
      console.log(formatIndexJson(indexedResults, [], query));
    } else {
      console.log(formatIndexTable(indexedResults, [], query));
    }
  } else {
    // Default list format
    console.log(`Context for #${projectTag} (${results.length} notes):\n`);
    for (const note of results) {
      const otherTags = note.tags.filter((t) => t !== projectTag && !t.includes("incoming"));
      const tagsStr = otherTags.length > 0 ? ` [${otherTags.slice(0, 3).join(", ")}]` : "";
      console.log(`  ${note.name}${tagsStr}`);
    }
    console.log(`\nTo read a note: obs read "<note-name>"`);
  }
}

async function handleIncoming(args: string[]) {
  let recent: number | undefined;
  let scope: ScopeFilter = "work"; // Default: exclude private

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--recent" || args[i] === "-r") {
      recent = parseInt(args[++i], 10);
    } else if (args[i] === "--scope" || args[i] === "-s") {
      const scopeArg = args[++i]?.toLowerCase();
      if (scopeArg === "work" || scopeArg === "private" || scopeArg === "all") {
        scope = scopeArg as ScopeFilter;
      }
    }
  }

  // Search for notes with #incoming tag
  const results = await searchNotes({
    tags: ["incoming"],
    recent,
    scope,
  });

  if (results.length === 0) {
    console.log("No incoming notes waiting to be processed.");
    return;
  }

  console.log(`Incoming notes waiting to be processed (${results.length}):\n`);
  for (const note of results) {
    // Show other tags besides "incoming"
    const otherTags = note.tags.filter((t) => t !== "incoming");
    const tagsStr = otherTags.length > 0 ? ` [${otherTags.join(", ")}]` : "";
    const dateStr = note.date ? ` (${note.date})` : "";
    console.log(`  ${note.name}${tagsStr}${dateStr}`);
  }

  console.log(`\nTo process: read the note, apply fabric pattern, update tags.`);
  console.log(`Example: obs read "<note>" | fabric -p extract_wisdom`);
}

async function handleLoad(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: obs load <selection> [--tag <tag>] [--any-tag <tag>] [--type <type>] [--since <date>]");
    console.error("\nSelection formats:");
    console.error("  all         - Load all results from last search");
    console.error("  1,2,5       - Load specific items by number");
    console.error("  1-5         - Load range of items");
    console.error("  1,3-5,10    - Combined selection");
    console.error("\nFilters:");
    console.error("  --tag <tag>     - Filter by tag (can use multiple, AND logic)");
    console.error("  --any-tag <tag> - Filter by tag (can use multiple, OR logic)");
    console.error("  --type <type>   - Filter by type (transcript, meeting, note, wisdom, etc.)");
    console.error("  --since <date>  - Filter by date (YYYY-MM-DD)");
    console.error("\nRun 'obs search --format index' or 'obs semantic <query> --format index' first.");
    process.exit(1);
  }

  let selection = "";
  let filterType: string | undefined;
  let filterSince: string | undefined;
  const filterTags: string[] = [];
  const filterAnyTags: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tag") {
      filterTags.push(args[++i]);
    } else if (args[i] === "--any-tag") {
      filterAnyTags.push(args[++i]);
    } else if (args[i] === "--type" || args[i] === "-t") {
      filterType = args[++i];
    } else if (args[i] === "--since" || args[i] === "-s") {
      filterSince = args[++i];
    } else if (!args[i].startsWith("-")) {
      selection = args[i];
    }
  }

  // If only filters provided, use "all" as selection base
  if (!selection && (filterType || filterSince || filterTags.length > 0 || filterAnyTags.length > 0)) {
    selection = "all";
  }

  if (!selection) {
    console.error("Error: No selection provided. Use 'all', '1,2,5', '1-5', etc.");
    process.exit(1);
  }

  try {
    const result = await loadBySelection(selection, {
      type: filterType,
      since: filterSince,
      tags: filterTags.length > 0 ? filterTags : undefined,
      anyTags: filterAnyTags.length > 0 ? filterAnyTags : undefined,
    });

    // Calculate total size
    const totalSize = Buffer.byteLength(result.content, "utf-8");

    // Output summary to stderr so content can be piped
    console.error(formatLoadSummary(result.loaded, totalSize));
    console.error("");

    // Output actual content to stdout
    console.log(result.content);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
