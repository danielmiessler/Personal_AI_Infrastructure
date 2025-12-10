#!/usr/bin/env bun

/**
 * jira - Jira CLI for PAI
 *
 * Commands:
 *   search      Search issues using JQL
 *   load        Load issues from last search into context
 *   view        View a single issue
 *   create      Create a new issue
 *   update      Update an issue's fields
 *   transition  Transition issue to new status
 *   comment     Add a comment to an issue
 *   projects    List configured projects
 *   statuses    List available statuses
 *   types       List available issue types
 *   status      Health check / connection test
 */

import { getConfig, listProjects, validateCredentials, getCredentials } from "./lib/config";
import { search, SearchOptions, buildJQL } from "./lib/search";
import {
  toIndexedIssues,
  formatIndexTable,
  formatIndexJson,
  saveSearchIndex,
  loadBySelection,
  formatLoadSummary,
  formatIssueDetails,
  SearchIndex,
} from "./lib/index";
import {
  getIssue,
  createIssue,
  updateIssue,
  transitionIssue,
  addComment,
  getTransitions,
  getStatuses,
  getIssueTypes,
  getMyself,
} from "./lib/api";

const HELP = `
jira - Jira CLI for PAI

USAGE:
  jira <command> [options]

COMMANDS:
  search      Search issues (discovery phase)
  load        Load issues from last search (injection phase)
  view        View a single issue by key
  create      Create a new issue
  update      Update an issue's fields
  transition  Transition issue to new status
  comment     Add a comment to an issue
  projects    List configured projects
  statuses    List available statuses for project
  types       List available issue types for project
  status      Health check / connection test

SEARCH OPTIONS:
  <query>                  Text search
  --project, -p <alias>    Project alias (work, personal, etc.)
  --assignee, -a <user>    Filter by assignee ("me", "unassigned", or name)
  --status, -s <status>    Filter by status ("open", "done", "in progress", or name)
  --type, -t <type>        Filter by issue type (Bug, Story, Task, etc.)
  --priority <priority>    Filter by priority (Highest, High, Medium, Low, Lowest)
  --labels <labels>        Filter by labels (comma-separated)
  --updated <time>         Updated within (7d, 1w, 30d)
  --created <time>         Created within (7d, 1w, 30d)
  --jql <query>            Raw JQL query (overrides other filters)
  --format <fmt>           Output format: list, index, json (default: index)

LOAD OPTIONS:
  <selection>              Numbers to load: "all", "1,2,5", "1-5"

VIEW OPTIONS:
  <issue-key>              Issue key (e.g., PROJ-123)

CREATE OPTIONS:
  --project, -p <alias>    Project alias
  --type, -t <type>        Issue type (Bug, Story, Task, Epic)
  --summary <text>         Issue summary (required)
  --description <text>     Issue description
  --priority <priority>    Priority level
  --labels <labels>        Labels (comma-separated)
  --assignee <user>        Assignee ("me" or account ID)
  --parent <key>           Parent issue key (for sub-tasks)

UPDATE OPTIONS:
  <issue-key>              Issue to update
  --summary <text>         New summary
  --description <text>     New description
  --priority <priority>    New priority
  --labels <labels>        New labels
  --assignee <user>        New assignee

TRANSITION OPTIONS:
  <issue-key>              Issue to transition
  <status>                 Target status name

COMMENT OPTIONS:
  <issue-key>              Issue to comment on
  <comment>                Comment text

EXAMPLES:
  # Two-phase context retrieval
  jira search --assignee me --status open --format index
  jira load 1,2,5

  # Search variations
  jira search "authentication bug"
  jira search --project work --type Bug
  jira search --updated 7d

  # View single issue
  jira view PROJ-123

  # Create issues
  jira create --type Bug --summary "Login button broken"
  jira create --type Story --summary "Add dark mode" --description "User setting"

  # Update and transition
  jira transition PROJ-123 "In Progress"
  jira comment PROJ-123 "Fixed in commit abc123"
  jira update PROJ-123 --assignee me --priority High

  # Info commands
  jira projects
  jira status
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
      case "load":
        await handleLoad(commandArgs);
        break;
      case "view":
        await handleView(commandArgs);
        break;
      case "create":
        await handleCreate(commandArgs);
        break;
      case "update":
        await handleUpdate(commandArgs);
        break;
      case "transition":
        await handleTransition(commandArgs);
        break;
      case "comment":
        await handleComment(commandArgs);
        break;
      case "projects":
        await handleProjects();
        break;
      case "statuses":
        await handleStatuses(commandArgs);
        break;
      case "types":
        await handleTypes(commandArgs);
        break;
      case "status":
        await handleStatus(commandArgs);
        break;
      case "transitions":
        await handleTransitions(commandArgs);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log("Run 'jira --help' for usage.");
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function handleSearch(args: string[]) {
  const options: SearchOptions = {};
  let format: "list" | "index" | "json" = "index";

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--project":
      case "-p":
        options.projectAlias = args[++i];
        break;
      case "--assignee":
      case "-a":
        options.assignee = args[++i];
        break;
      case "--status":
      case "-s":
        options.status = args[++i];
        break;
      case "--type":
      case "-t":
        options.type = args[++i];
        break;
      case "--priority":
        options.priority = args[++i];
        break;
      case "--labels":
      case "-l":
        options.labels = args[++i].split(",").map((l) => l.trim());
        break;
      case "--updated":
        options.updated = args[++i];
        break;
      case "--created":
        options.created = args[++i];
        break;
      case "--jql":
        options.jql = args[++i];
        break;
      case "--format":
      case "-f":
        const formatArg = args[++i]?.toLowerCase();
        if (formatArg === "list" || formatArg === "index" || formatArg === "json") {
          format = formatArg;
        }
        break;
      case "--limit":
        options.maxResults = parseInt(args[++i], 10);
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

  const result = await search(options);

  if (result.issues.length === 0) {
    console.log("No issues found matching criteria.");
    return;
  }

  const projectAlias = options.projectAlias || getConfig().defaultProject;
  const indexed = toIndexedIssues(result.issues, projectAlias);

  // Build query description for display
  let queryDesc = options.jql || buildJQL(options);
  if (options.text) queryDesc = `"${options.text}"`;

  // Save for load command
  const searchIndex: SearchIndex = {
    query: queryDesc,
    projectAlias,
    timestamp: new Date().toISOString(),
    issues: indexed,
  };
  await saveSearchIndex(searchIndex);

  // Output based on format
  if (format === "json") {
    console.log(formatIndexJson(indexed, queryDesc));
  } else if (format === "list") {
    console.log(`Found ${result.issues.length} issue(s):\n`);
    for (const issue of indexed) {
      console.log(`  ${issue.key}: ${issue.summary} [${issue.status}]`);
    }
  } else {
    console.log(formatIndexTable(indexed, queryDesc));
  }
}

async function handleLoad(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: jira load <selection>");
    console.error("\nSelection formats:");
    console.error("  all         - Load all results from last search");
    console.error("  1,2,5       - Load specific items by number");
    console.error("  1-5         - Load range of items");
    console.error("\nRun 'jira search --format index' first.");
    process.exit(1);
  }

  const selection = args[0];

  const result = await loadBySelection(selection);

  // Calculate total size
  const totalSize = Buffer.byteLength(result.content, "utf-8");

  // Output summary to stderr
  console.error(formatLoadSummary(result.loaded, totalSize));
  console.error("");

  // Output content to stdout
  console.log(result.content);
}

async function handleView(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: jira view <issue-key>");
    process.exit(1);
  }

  const issueKey = args[0];
  let projectAlias: string | undefined;

  // Check for --project flag
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--project" || args[i] === "-p") {
      projectAlias = args[++i];
    }
  }

  const issue = await getIssue(issueKey, { projectAlias });
  console.log(formatIssueDetails(issue));
}

async function handleCreate(args: string[]) {
  let projectAlias: string | undefined;
  let issueType: string | undefined;
  let summary: string | undefined;
  let description: string | undefined;
  let priority: string | undefined;
  let labels: string[] | undefined;
  let assignee: string | undefined;
  let parentKey: string | undefined;

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--project":
      case "-p":
        projectAlias = args[++i];
        break;
      case "--type":
      case "-t":
        issueType = args[++i];
        break;
      case "--summary":
        summary = args[++i];
        break;
      case "--description":
        description = args[++i];
        break;
      case "--priority":
        priority = args[++i];
        break;
      case "--labels":
      case "-l":
        labels = args[++i].split(",").map((l) => l.trim());
        break;
      case "--assignee":
      case "-a":
        assignee = args[++i];
        break;
      case "--parent":
        parentKey = args[++i];
        break;
      default:
        break;
    }
    i++;
  }

  if (!issueType) {
    console.error("Error: --type is required (Bug, Story, Task, etc.)");
    process.exit(1);
  }

  if (!summary) {
    console.error("Error: --summary is required");
    process.exit(1);
  }

  // Read description from stdin if not provided
  if (!description) {
    const stdin = await Bun.stdin.text();
    if (stdin.trim()) {
      description = stdin.trim();
    }
  }

  const credentials = getCredentials(projectAlias);

  const result = await createIssue(
    {
      projectKey: credentials.projectKey,
      issueType,
      summary,
      description,
      priority,
      labels,
      assignee,
      parentKey,
    },
    projectAlias
  );

  const config = getConfig();
  const project = config.projectsConfig.projects[projectAlias || config.defaultProject];

  console.log(`✅ Created ${result.key}: ${summary}`);
  console.log(`   URL: ${project.url}/browse/${result.key}`);
}

async function handleUpdate(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: jira update <issue-key> [--field value]");
    process.exit(1);
  }

  const issueKey = args[0];
  let projectAlias: string | undefined;
  const updates: {
    summary?: string;
    description?: string;
    priority?: string;
    labels?: string[];
    assignee?: string;
  } = {};

  let i = 1;
  while (i < args.length) {
    const arg = args[i];
    switch (arg) {
      case "--project":
      case "-p":
        projectAlias = args[++i];
        break;
      case "--summary":
        updates.summary = args[++i];
        break;
      case "--description":
        updates.description = args[++i];
        break;
      case "--priority":
        updates.priority = args[++i];
        break;
      case "--labels":
      case "-l":
        updates.labels = args[++i].split(",").map((l) => l.trim());
        break;
      case "--assignee":
      case "-a":
        updates.assignee = args[++i];
        break;
      default:
        break;
    }
    i++;
  }

  if (Object.keys(updates).length === 0) {
    console.error("Error: No updates specified");
    console.error("Use: --summary, --description, --priority, --labels, --assignee");
    process.exit(1);
  }

  await updateIssue(issueKey, updates, projectAlias);
  console.log(`✅ Updated ${issueKey}`);
}

async function handleTransition(args: string[]) {
  if (args.length < 2) {
    console.error("Usage: jira transition <issue-key> <status>");
    console.error("\nExample: jira transition PROJ-123 'In Progress'");
    process.exit(1);
  }

  const issueKey = args[0];
  const targetStatus = args[1];
  let projectAlias: string | undefined;

  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--project" || args[i] === "-p") {
      projectAlias = args[++i];
    }
  }

  await transitionIssue(issueKey, targetStatus, projectAlias);
  console.log(`✅ Transitioned ${issueKey} to "${targetStatus}"`);
}

async function handleComment(args: string[]) {
  if (args.length < 2) {
    console.error("Usage: jira comment <issue-key> <comment>");
    process.exit(1);
  }

  const issueKey = args[0];
  let projectAlias: string | undefined;
  let comment = args[1];

  // Check for project flag and handle multi-word comments
  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--project" || args[i] === "-p") {
      projectAlias = args[++i];
    } else {
      // Append to comment if not a flag
      comment += " " + args[i];
    }
  }

  // Read from stdin if no comment provided
  if (!comment || comment.trim() === "") {
    const stdin = await Bun.stdin.text();
    if (stdin.trim()) {
      comment = stdin.trim();
    } else {
      console.error("Error: No comment provided");
      process.exit(1);
    }
  }

  await addComment(issueKey, comment, projectAlias);
  console.log(`✅ Added comment to ${issueKey}`);
}

async function handleProjects() {
  const projects = listProjects();

  console.log("Configured Jira projects:\n");
  for (const project of projects) {
    const defaultMark = project.isDefault ? " (default)" : "";
    console.log(`  ${project.alias}${defaultMark}`);
    console.log(`    Key: ${project.key}`);
    console.log(`    URL: ${project.url}`);
    if (project.description) {
      console.log(`    Description: ${project.description}`);
    }
    console.log("");
  }
}

async function handleStatuses(args: string[]) {
  let projectAlias: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" || args[i] === "-p") {
      projectAlias = args[++i];
    }
  }

  const credentials = getCredentials(projectAlias);
  const statuses = await getStatuses(credentials.projectKey, projectAlias);

  console.log(`Available statuses for ${credentials.projectKey}:\n`);
  for (const status of statuses) {
    console.log(`  ${status.name} [${status.category}]`);
  }
}

async function handleTypes(args: string[]) {
  let projectAlias: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" || args[i] === "-p") {
      projectAlias = args[++i];
    }
  }

  const credentials = getCredentials(projectAlias);
  const types = await getIssueTypes(credentials.projectKey, projectAlias);

  console.log(`Available issue types for ${credentials.projectKey}:\n`);
  for (const type of types) {
    console.log(`  ${type.name}`);
    if (type.description) {
      console.log(`    ${type.description}`);
    }
  }
}

async function handleTransitions(args: string[]) {
  if (args.length === 0) {
    console.error("Usage: jira transitions <issue-key>");
    process.exit(1);
  }

  const issueKey = args[0];
  let projectAlias: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--project" || args[i] === "-p") {
      projectAlias = args[++i];
    }
  }

  const transitions = await getTransitions(issueKey, projectAlias);

  console.log(`Available transitions for ${issueKey}:\n`);
  for (const t of transitions) {
    console.log(`  ${t.name} → ${t.to.name} [${t.to.statusCategory.name}]`);
  }
}

async function handleStatus(args: string[]) {
  let projectAlias: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project" || args[i] === "-p") {
      projectAlias = args[++i];
    }
  }

  console.log("Jira Connection Status\n");

  const projects = listProjects();

  for (const project of projects) {
    // Skip if specific project requested and this isn't it
    if (projectAlias && project.alias !== projectAlias) continue;

    process.stdout.write(`  ${project.alias} (${project.key}): `);

    try {
      validateCredentials(project.alias);
      const myself = await getMyself(project.alias);
      console.log(`✅ Connected as ${myself.displayName}`);
    } catch (error) {
      console.log(`❌ ${error instanceof Error ? error.message : "Failed"}`);
    }
  }
}

main();
