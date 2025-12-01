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
import { searchNotes, SearchOptions } from "./lib/search";
import { readNote } from "./lib/read";
import { writeNote, WriteOptions } from "./lib/write";
import { listTags } from "./lib/tags";
import { getConfig } from "./lib/config";
import { buildEmbeddings, semanticSearch, getEmbeddingStats } from "./lib/embed";

const HELP = `
obs - Obsidian Vault CLI for PAI Context Management

USAGE:
  obs <command> [options]

COMMANDS:
  search     Search notes by tag or text
  read       Read a note's content
  write      Write a new note to the vault
  tags       List all tags in the vault
  incoming   List notes waiting to be processed (#incoming tag)
  context    Load context for a project (shortcut for tag search)
  embed      Build/update vector embeddings
  semantic   Semantic search using embeddings
  config     Show current configuration

SEARCH OPTIONS:
  --tag, -t <tag>        Filter by tag (can use multiple)
  --not-tag <tag>        Exclude notes with this tag
  --text, -x <query>     Full-text search
  --recent, -r <n>       Limit to N most recent notes
  --untagged             Find notes without tags

CONTEXT OPTIONS:
  <project>              Project name (searches project/<name> tag)
  --recent, -r <n>       Limit results (default: 20)

INCOMING OPTIONS:
  --recent, -r <n>       Limit results (default: all)

EXAMPLES:
  # Context loading (the key feature)
  obs context pai                    # Load all PAI project context
  obs context eea24 --recent 10      # Recent EEA24 notes

  # Search
  obs search --tag meeting-notes --tag ed_overy
  obs search --text "kubernetes" --not-tag incoming
  obs incoming --recent 20           # What needs processing?

  # Read/Write
  obs read "2024-06-10-Meeting"
  obs write "My Note" --tags "incoming,project/pai"

  # Embeddings
  obs embed --verbose
  obs semantic "deployment strategies"
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
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--tag":
      case "-t":
        options.tags.push(args[++i]);
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
      default:
        // Treat as text search if no flag
        if (!arg.startsWith("-")) {
          options.text = arg;
        }
        break;
    }
    i++;
  }

  const results = await searchNotes(options);

  if (results.length === 0) {
    console.log("No notes found matching criteria.");
    return;
  }

  console.log(`Found ${results.length} note(s):\n`);
  for (const note of results) {
    const tagsStr = note.tags.length > 0 ? ` [${note.tags.join(", ")}]` : "";
    console.log(`  ${note.name}${tagsStr}`);
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
    console.error("Usage: obs semantic <query> [--limit <n>]");
    process.exit(1);
  }

  const query = args[0];
  let limit = 10;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--limit" || args[i] === "-l") {
      limit = parseInt(args[++i], 10);
    }
  }

  const results = await semanticSearch(query, limit);

  if (results.length === 0) {
    console.log("No results found. Have you run 'obs embed' first?");
    return;
  }

  console.log(`Top ${results.length} results for: "${query}"\n`);
  for (const result of results) {
    const similarity = (result.similarity * 100).toFixed(1);
    console.log(`  [${similarity}%] ${result.noteName}`);
    // Show snippet of matching content
    const snippet = result.content.slice(0, 100).replace(/\n/g, " ").trim();
    console.log(`          ${snippet}...`);
  }
}

async function handleContext(args: string[]) {
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error("Usage: obs context <project-name> [--recent <n>]");
    console.error("\nExamples:");
    console.error("  obs context pai");
    console.error("  obs context eea24 --recent 10");
    process.exit(1);
  }

  const projectName = args[0];
  let recent = 20; // Default to 20 recent notes

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--recent" || args[i] === "-r") {
      recent = parseInt(args[++i], 10);
    }
  }

  // Search for project tag
  const projectTag = `project/${projectName}`;
  const results = await searchNotes({
    tags: [projectTag],
    recent,
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

  console.log(`Context for #${projectTag} (${results.length} notes):\n`);
  for (const note of results) {
    const otherTags = note.tags.filter((t) => t !== projectTag && !t.includes("incoming"));
    const tagsStr = otherTags.length > 0 ? ` [${otherTags.slice(0, 3).join(", ")}]` : "";
    console.log(`  ${note.name}${tagsStr}`);
  }

  console.log(`\nTo read a note: obs read "<note-name>"`);
}

async function handleIncoming(args: string[]) {
  let recent: number | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--recent" || args[i] === "-r") {
      recent = parseInt(args[++i], 10);
    }
  }

  // Search for notes with #incoming tag
  const results = await searchNotes({
    tags: ["incoming"],
    recent,
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

main();
