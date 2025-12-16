#!/usr/bin/env bun

/**
 * jira - PAI JIRA CLI
 *
 * Deterministic command-line interface for Jira operations.
 * Supports multiple Jira instances via profile-based configuration.
 *
 * Commands:
 *   search      Search issues (JQL or text)
 *   get         Get issue details
 *   create      Create new issue
 *   update      Update issue
 *   transition  Change issue status
 *   comment     Add comment
 *   transitions List available transitions
 *   projects    List projects
 *   types       List issue types
 *   labels      List/manage labels
 *   label       Add/remove label from issue
 *   filters     List saved filters
 *   link        Create issue link
 *   unlink      Remove issue link
 *   link-types  List link types
 *   links       Show issue links
 *   dev         Show GitHub dev info
 *   config      Show configuration
 *   profiles    List profiles
 */

import {
  getConfig,
  listProfiles,
  getAllConfigs,
  loadProfile,
  cacheProjectProfile,
  getCachedProfile,
  getProjectKeyFromIssue,
  getProfileForProject,
  writeProfileProjects,
  type JiraConfig,
} from "./lib/config";
import {
  JiraClient,
  textToJql,
  type CreateIssueInput,
  type JiraIssue,
  type JiraFilter,
  type JiraFilterSharePermission,
} from "./lib/api";
import {
  formatIssueIndex,
  formatIssueDetail,
  formatProjects,
  formatTransitions,
  formatLinkTypes,
  formatDevInfo,
  formatLabels,
  formatProfiles,
  suggestBranchName,
  type OutputFormat,
} from "./lib/format";
import {
  isVisionAvailable,
  getVisionConfig,
  analyzeAttachments,
  formatVisionAnalysis,
} from "./lib/vision";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

// ============================================================================
// Quick Filters (Service Desk Default Filters)
// ============================================================================

const QUICK_FILTERS: Record<string, string> = {
  // Open/closed status
  "all": "project = {project}",
  "all work items": "project = {project}",
  "open": "project = {project} AND resolution = Unresolved",
  "open work items": "project = {project} AND resolution = Unresolved",
  "my open": "project = {project} AND assignee = currentUser() AND resolution = Unresolved",
  "my open work items": "project = {project} AND assignee = currentUser() AND resolution = Unresolved",
  "done": "project = {project} AND statusCategory = Done",
  "done work items": "project = {project} AND statusCategory = Done",

  // Reporter/assignee
  "reported by me": "project = {project} AND reporter = currentUser()",
  "assigned to me": "project = {project} AND assignee = currentUser()",
  "unassigned": "project = {project} AND assignee IS EMPTY AND resolution = Unresolved",

  // Time-based
  "viewed recently": "project = {project} AND issuekey IN issueHistory()",
  "created recently": "project = {project} AND created >= -7d",
  "resolved recently": "project = {project} AND resolved >= -7d",
  "updated recently": "project = {project} AND updated >= -7d",
  "created today": "project = {project} AND created >= startOfDay()",
  "updated today": "project = {project} AND updated >= startOfDay()",

  // Priority
  "high priority": "project = {project} AND priority IN (High, Highest) AND resolution = Unresolved",
  "critical": "project = {project} AND priority = Highest AND resolution = Unresolved",
};

function getQuickFilter(name: string, project: string): string | null {
  const key = name.toLowerCase().trim();
  const jql = QUICK_FILTERS[key];
  if (!jql) return null;
  return jql.replace(/\{project\}/g, project);
}

function listQuickFilters(): void {
  console.log("Available quick filters:\n");
  const seen = new Set<string>();
  for (const [name, jql] of Object.entries(QUICK_FILTERS)) {
    if (!seen.has(jql)) {
      console.log(`  "${name}"`);
      seen.add(jql);
    }
  }
  console.log("\nUsage: jira search --quick \"open\" --project HD");
}

// ============================================================================
// Search Result Cache (for load command)
// ============================================================================

const CACHE_DIR = join(homedir(), ".claude", "jira", "cache");
const CACHE_FILE = join(CACHE_DIR, "last-search.json");

interface SearchCache {
  timestamp: string;
  profileName: string;
  issues: Array<{ key: string; summary: string; _instance?: string }>;
}

async function saveSearchCache(
  issues: Array<JiraIssue & { _instance?: string }>,
  profileName: string
): Promise<void> {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  const cache: SearchCache = {
    timestamp: new Date().toISOString(),
    profileName,
    issues: issues.map(i => ({
      key: i.key,
      summary: i.fields.summary,
      _instance: i._instance,
    })),
  };
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function loadSearchCache(): SearchCache | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

/**
 * Parse selection string (e.g., "1,2,5", "1-10", "all", "SMS-123") to issue keys
 * Cache is optional - only needed for index-based selection
 */
function parseSelection(selection: string, cache: SearchCache | null): string[] {
  if (selection === "all") {
    if (!cache) {
      console.error("No search results cached. Run 'jira search' first for 'all' selection.");
      process.exit(1);
    }
    return cache.issues.map(i => i.key);
  }

  const keys: string[] = [];
  const parts = selection.split(",");

  for (const part of parts) {
    const trimmed = part.trim();
    if (/^[A-Z]+-\d+$/i.test(trimmed)) {
      // Direct issue key: "SMS-123" (check first to avoid confusion with ranges)
      keys.push(trimmed.toUpperCase());
    } else if (trimmed.includes("-") && /^\d+-\d+$/.test(trimmed)) {
      // Range: "1-5"
      if (!cache) {
        console.error("No search results cached. Run 'jira search' first for index selection.");
        process.exit(1);
      }
      const [start, end] = trimmed.split("-").map(n => parseInt(n, 10));
      for (let i = start; i <= end && i <= cache.issues.length; i++) {
        if (i > 0) keys.push(cache.issues[i - 1].key);
      }
    } else if (/^\d+$/.test(trimmed)) {
      // Single number: "3"
      if (!cache) {
        console.error("No search results cached. Run 'jira search' first for index selection.");
        process.exit(1);
      }
      const idx = parseInt(trimmed, 10);
      if (idx > 0 && idx <= cache.issues.length) {
        keys.push(cache.issues[idx - 1].key);
      }
    }
  }

  return [...new Set(keys)]; // Deduplicate
}

// ============================================================================
// Opened Ticket (for single-ticket workflow)
// ============================================================================

const OPENED_FILE = join(CACHE_DIR, "opened.json");

interface OpenedTicket {
  key: string;
  summary: string;
  profileName: string;
  openedAt: string;
}

function saveOpenedTicket(ticket: OpenedTicket): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
  writeFileSync(OPENED_FILE, JSON.stringify(ticket, null, 2));
}

function loadOpenedTicket(): OpenedTicket | null {
  if (!existsSync(OPENED_FILE)) return null;
  try {
    return JSON.parse(readFileSync(OPENED_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function clearOpenedTicket(): boolean {
  if (!existsSync(OPENED_FILE)) return false;
  try {
    const { unlinkSync } = require("fs");
    unlinkSync(OPENED_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the issue key for write operations.
 * Uses opened ticket if no explicit key provided.
 */
function getWriteTargetKey(explicitKey: string | undefined): string | null {
  if (explicitKey) return explicitKey;
  const opened = loadOpenedTicket();
  return opened?.key || null;
}

// ============================================================================
// Help Text
// ============================================================================

const HELP = `
jira - PAI JIRA CLI

USAGE:
  jira <command> [options]

COMMANDS:
  search <query>         Search issues (JQL or text)
  load <sel>             Load issue details (key, indices, or 'all')
  open <key>             Open ticket for interaction (single-ticket mode)
  close                  Close opened ticket
  status                 Show currently opened ticket
  create                 Create new issue
  update <key>           Update issue
  transition <key> <status>  Change issue status
  comment <key> <text>   Add comment to issue
  transitions <key>      List available transitions
  projects               List accessible projects
  types [project]        List issue types
  labels [key]           List labels (or labels on issue)
  label add <key> <label>    Add label to issue
  label remove <key> <label> Remove label from issue
  filters [name]         List saved/favourite filters
  link <key1> <type> <key2>  Link two issues
  link <key> --epic <epic>   Add issue to epic
  unlink <key1> <key2>       Remove link between issues
  link-types             List available link types
  links <key>            Show all links on issue
  dev <key>              Show GitHub dev info (branches, PRs, commits)
  config                 Show current configuration
  profiles               List available profiles
  setup                  Discover projects and configure auto-detection

GLOBAL OPTIONS:
  --profile, -p <name>   Use specific profile (or 'all' for federated search)
  --format, -f <fmt>     Output format: table (default), json, markdown
  --help, -h             Show this help

SEARCH OPTIONS:
  --project, -P <key>    Filter by project
  --filter <name|id>     Use a saved Jira filter
  --quick, -q <name>     Use a quick filter (e.g., "open", "my open", "created today")
  --label <label>        Filter by label (AND logic, repeatable)
  --any-label <label>    Filter by label (OR logic, repeatable)
  --order <field>        Order by: updated (default), created, key, priority, status
  --asc                  Ascending order (default: descending)
  --limit, -l <n>        Limit results (default: 20)

CREATE OPTIONS:
  --project, -P <key>    Project key (or use default)
  --type, -T <type>      Issue type: Epic, Story, Task, Bug, Sub-task
  --summary, -s <text>   Issue summary
  --description, -d <text>  Description
  --assignee, -a <user>  Assign to user
  --labels <l1,l2>       Comma-separated labels
  --label <label>        Single label (repeatable)
  --epic <key>           Parent epic
  --parent <key>         Parent issue (for sub-tasks)
  --priority <name>      Priority level

UPDATE OPTIONS:
  --summary, -s <text>   New summary
  --description, -d <text>  New description
  --assignee, -a <user>  New assignee
  --type, -t <type>      Change issue type (e.g., Story → Epic)
  --priority <name>      New priority
  --labels <l1,l2>       Replace all labels
  --label <label>        Add label (repeatable)

DEV OPTIONS:
  --branches             Show only branches
  --prs                  Show only pull requests
  --create-branch        Output suggested branch name
  --checkout             Create and checkout branch (requires git)

VISION OPTIONS:
  --vision               Analyze image attachments with AI (requires OPENAI_API_KEY)

FILTER OPTIONS:
  --owner, -o <name>     Filter filters by owner name (partial match)
  --mine, --my           Show only your filters
  --favourites           Show only starred/favourite filters

EXAMPLES:
  # Search
  jira search "login bug"
  jira search "project = PAI AND status = Open"
  jira search --label project/pai --limit 10
  jira search -p all "urgent"              # Search all instances

  # Quick filters (Service Desk defaults)
  jira search --quick "open" --project HD          # Open work items
  jira search --quick "my open" -P HD              # My open work items
  jira search --quick "created today" -P HD        # Created today
  jira search --quick list                         # List all quick filters

  # Saved filters
  jira search --filter "My Active Issues"  # Use saved filter
  jira filters                             # List saved filters
  jira filters "HD" --owner "Paige"        # Filter by owner

  # Load issues
  jira load PAI-123                        # By key
  jira load 1,2,5                          # By index from search
  jira load 1-10                           # Range from search
  jira load all -f json                    # All from search as JSON
  jira load PAI-123 --vision               # With image analysis

  # Create
  jira create --type Bug --summary "Fix login" --labels "project/pai,urgent"
  jira create --type Story --summary "New feature" --epic PAI-100
  jira create --type Sub-task --summary "Write tests" --parent PAI-123
  jira transition PAI-123 "In Progress"
  jira comment PAI-123 "Fixed in commit abc123"

  # Labels
  jira labels                              # List all labels
  jira labels --prefix "project/"          # Labels starting with prefix
  jira label add PAI-123 urgent
  jira label remove PAI-123 urgent

  # Linking
  jira link PAI-123 "blocks" PAI-456
  jira link PAI-123 --epic EPIC-100
  jira unlink PAI-123 PAI-456
  jira links PAI-123

  # GitHub integration
  jira dev PAI-123                         # Show branches, PRs, commits
  jira dev PAI-123 --create-branch         # Suggest branch name

  # Configuration
  jira profiles                            # List profiles
  jira config                              # Show current config
`;

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const rawCommandArgs = args.slice(1);

  // Parse global options and filter them out
  let profileName: string | undefined;
  let format: OutputFormat = "table";
  const commandArgs: string[] = [];

  for (let i = 0; i < rawCommandArgs.length; i++) {
    if (rawCommandArgs[i] === "--profile" || rawCommandArgs[i] === "-p") {
      profileName = rawCommandArgs[++i];
    } else if (rawCommandArgs[i] === "--format" || rawCommandArgs[i] === "-f") {
      const fmt = rawCommandArgs[++i];
      if (["table", "json", "markdown", "index"].includes(fmt)) {
        format = fmt as OutputFormat;
      }
    } else {
      commandArgs.push(rawCommandArgs[i]);
    }
  }

  try {
    switch (command) {
      case "search":
        await handleSearch(commandArgs, profileName, format);
        break;
      case "load":
        await handleLoad(commandArgs, profileName, format);
        break;
      case "get":
        // Deprecated: use 'load' instead
        console.error("Note: 'get' is deprecated. Use 'jira load <key>' instead.\n");
        await handleLoad(commandArgs, profileName, format);
        break;
      case "open":
        await handleOpen(commandArgs, profileName);
        break;
      case "close":
        handleClose();
        break;
      case "status":
        handleStatus();
        break;
      case "create":
        await handleCreate(commandArgs, profileName);
        break;
      case "update":
        await handleUpdate(commandArgs, profileName);
        break;
      case "transition":
        await handleTransition(commandArgs, profileName);
        break;
      case "comment":
        await handleComment(commandArgs, profileName);
        break;
      case "transitions":
        await handleTransitions(commandArgs, profileName, format);
        break;
      case "projects":
        await handleProjects(profileName, format);
        break;
      case "types":
        await handleTypes(commandArgs, profileName, format);
        break;
      case "labels":
        await handleLabels(commandArgs, profileName, format);
        break;
      case "label":
        await handleLabelOp(commandArgs, profileName);
        break;
      case "filters":
        await handleFilters(commandArgs, profileName, format);
        break;
      case "link":
        await handleLink(commandArgs, profileName);
        break;
      case "unlink":
        await handleUnlink(commandArgs, profileName);
        break;
      case "link-types":
        await handleLinkTypes(profileName, format);
        break;
      case "links":
        await handleLinks(commandArgs, profileName, format);
        break;
      case "dev":
        await handleDev(commandArgs, profileName, format);
        break;
      case "config":
        await handleConfig(profileName);
        break;
      case "profiles":
        handleProfiles();
        break;
      case "setup":
        await handleSetup(profileName);
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

// ============================================================================
// Command Handlers
// ============================================================================

async function handleSearch(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  // Parse options
  let query = "";
  let project: string | undefined;
  let filterNameOrId: string | undefined;
  let quickFilterName: string | undefined;
  const labels: string[] = [];
  const anyLabels: string[] = [];
  let limit = 20;
  let orderBy = "updated";  // Default order
  let ascending = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project" || arg === "-P") {
      project = args[++i];
    } else if (arg === "--filter") {
      filterNameOrId = args[++i];
    } else if (arg === "--quick" || arg === "-q") {
      quickFilterName = args[++i];
    } else if (arg === "--label") {
      labels.push(args[++i]);
    } else if (arg === "--any-label") {
      anyLabels.push(args[++i]);
    } else if (arg === "--order") {
      orderBy = args[++i];
    } else if (arg === "--asc") {
      ascending = true;
    } else if (arg === "--limit" || arg === "-l") {
      limit = parseInt(args[++i], 10);
    } else if (!arg.startsWith("-") && !arg.startsWith("--")) {
      query = arg;
    }
  }

  // Handle quick filters (Service Desk defaults)
  if (quickFilterName) {
    // List quick filters if requested
    if (quickFilterName === "list" || quickFilterName === "help") {
      listQuickFilters();
      return;
    }

    // Get project from flag or config
    const config = getConfig(profileName);
    const effectiveProject = project || config.defaultProject;
    if (!effectiveProject) {
      console.error("Quick filters require --project or JIRA_DEFAULT_PROJECT in profile");
      console.error("\nUsage: jira search --quick \"open\" --project HD");
      process.exit(1);
    }

    const quickJql = getQuickFilter(quickFilterName, effectiveProject);
    if (!quickJql) {
      console.error(`Unknown quick filter: "${quickFilterName}"`);
      console.error("\nAvailable quick filters:");
      listQuickFilters();
      process.exit(1);
    }

    query = quickJql;
    project = undefined; // Already in JQL
    console.log(`Using quick filter: ${quickFilterName}`);
    console.log(`JQL: ${query}\n`);
  }

  // If using a saved filter, get its JQL first
  if (filterNameOrId) {
    // Cannot use filter with federated search
    if (profileName === "all") {
      console.error("Cannot use --filter with federated search (-p all)");
      process.exit(1);
    }
    const config = getConfig(profileName);
    const client = new JiraClient(config);
    try {
      query = await client.getFilterJql(filterNameOrId);
      console.log(`Using filter: ${filterNameOrId}`);
      console.log(`JQL: ${query}\n`);
    } catch (err) {
      console.error(`Filter error: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  }

  // Build JQL
  // If using a filter, the query is already JQL - don't transform
  let jql = filterNameOrId ? query : (query ? textToJql(query) : "");
  if (project) {
    jql = jql ? `project = ${project} AND (${jql})` : `project = ${project}`;
  }
  if (labels.length) {
    const labelClause = labels.map(l => `labels = "${l}"`).join(" AND ");
    jql = jql ? `(${jql}) AND ${labelClause}` : labelClause;
  }
  if (anyLabels.length) {
    const labelClause = `labels IN (${anyLabels.map(l => `"${l}"`).join(", ")})`;
    jql = jql ? `(${jql}) AND ${labelClause}` : labelClause;
  }
  // Add ORDER BY clause (unless filter already has one)
  const orderDirection = ascending ? "ASC" : "DESC";
  const orderClause = `ORDER BY ${orderBy} ${orderDirection}`;
  if (!jql) {
    jql = orderClause;
  } else if (!jql.toUpperCase().includes("ORDER BY")) {
    jql += ` ${orderClause}`;
  }

  // Federated search (all profiles)
  if (profileName === "all") {
    const configs = getAllConfigs();
    const allIssues: Array<JiraIssue & { _instance: string }> = [];

    await Promise.all(
      configs.map(async (config) => {
        try {
          const client = new JiraClient(config);
          const result = await client.searchIssues(jql, { maxResults: limit });
          for (const issue of result.issues) {
            allIssues.push({ ...issue, _instance: config.profileName });
            cacheProjectProfile(getProjectKeyFromIssue(issue.key), config.profileName);
          }
        } catch (err) {
          console.error(`[${config.profileName}] ${err instanceof Error ? err.message : err}`);
        }
      })
    );

    console.log(`Found ${allIssues.length} issues across ${configs.length} instances:\n`);
    console.log(formatIssueIndex(allIssues, format, true));

    // Save federated search results for load command
    await saveSearchCache(allIssues, "all");
    console.log(`\nWhich to load? (jira load <KEY> / jira load 1,2,5 / jira load all -f json)`);
    return;
  }

  // Single instance search
  const config = getConfig(profileName);
  const client = new JiraClient(config);
  const result = await client.searchIssues(jql, { maxResults: limit });

  // Cache project mappings
  for (const issue of result.issues) {
    cacheProjectProfile(getProjectKeyFromIssue(issue.key), config.profileName);
  }

  const totalText = result.total !== undefined
    ? `${result.total} issues${result.total > limit ? ` (showing ${limit})` : ""}`
    : `${result.issues.length} issues${result.isLast === false ? " (more available)" : ""}`;
  console.log(`Found ${totalText}:\n`);
  console.log(formatIssueIndex(result.issues, format));

  // Save search results for load command
  await saveSearchCache(result.issues, config.profileName);
  console.log(`\nWhich to load? (jira load <KEY> / jira load 1,2,5 / jira load all -f json)`);
}

async function handleLoad(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  const selection = args.find(a => !a.startsWith("-"));
  const useVision = args.includes("--vision");

  if (!selection) {
    console.error("Usage: jira load <selection> [--vision]\n");
    console.error("Examples:");
    console.error("  jira load SMS-123    Load issue by key");
    console.error("  jira load 1,2,5      Load issues 1, 2, 5 from last search");
    console.error("  jira load 1-10       Load issues 1 through 10 from search");
    console.error("  jira load all        Load all issues from last search");
    console.error("  jira load all -f json   Load all as JSON for context");
    console.error("  jira load SMS-123 --vision  Load with image analysis");
    process.exit(1);
  }

  // Check vision availability
  if (useVision && !isVisionAvailable()) {
    console.error("Vision requires OPENAI_API_KEY environment variable.");
    console.error("Set it in your shell or add to ~/.claude/.env");
    process.exit(1);
  }

  // Cache is optional - only needed for index-based selection
  const cache = loadSearchCache();
  const keys = parseSelection(selection, cache);

  if (keys.length === 0) {
    console.error(`No issues matched selection: ${selection}`);
    if (cache) {
      console.error(`Last search had ${cache.issues.length} results.`);
    }
    process.exit(1);
  }

  console.error(`Loading ${keys.length} issue(s)...\n`);

  // Collect all issues with full details
  const loadedIssues: JiraIssue[] = [];
  const groupedByProfile = new Map<string, string[]>();

  // Group keys by profile (for federated searches)
  for (const key of keys) {
    const issueCache = cache.issues.find(i => i.key === key);
    const profile = issueCache?._instance || profileName || getProfileForProject(getProjectKeyFromIssue(key));
    if (!groupedByProfile.has(profile || "default")) {
      groupedByProfile.set(profile || "default", []);
    }
    groupedByProfile.get(profile || "default")!.push(key);
  }

  // Fetch issues (grouped by profile for efficiency)
  for (const [profile, profileKeys] of groupedByProfile) {
    const config = getConfig(profile === "default" ? profileName : profile);
    const client = new JiraClient(config);

    for (const key of profileKeys) {
      try {
        const issue = await client.getIssue(key, ["comment", "issuelinks", "subtasks"]);
        loadedIssues.push(issue);
      } catch (err) {
        console.error(`[${key}] ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Vision analysis if requested
  const visionResults = new Map<string, Array<{ filename: string; mimeType: string; analysis: string; error?: string }>>();

  if (useVision) {
    const visionConfig = getVisionConfig();
    if (visionConfig) {
      console.error("Analyzing image attachments...\n");
      for (const [profile, profileKeys] of groupedByProfile) {
        const config = getConfig(profile === "default" ? profileName : profile);
        const client = new JiraClient(config);
        for (const key of profileKeys) {
          try {
            const analyses = await analyzeAttachments(client, key, visionConfig);
            if (analyses.length > 0) {
              visionResults.set(key, analyses);
            }
          } catch (err) {
            console.error(`[${key}] Vision error: ${err instanceof Error ? err.message : err}`);
          }
        }
      }
    }
  }

  // Output based on format
  if (format === "json") {
    // JSON format: structured for context loading
    const output = loadedIssues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      type: issue.fields.issuetype.name,
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      reporter: issue.fields.reporter?.displayName,
      labels: issue.fields.labels,
      created: issue.fields.created,
      updated: issue.fields.updated,
      description: formatDescriptionText(issue.fields.description),
      comments: (issue.fields.comment?.comments || []).map(c => ({
        author: c.author.displayName,
        created: c.created,
        body: formatDescriptionText(c.body),
      })),
      ...(visionResults.has(issue.key) && {
        attachments: visionResults.get(issue.key)!.map(a => ({
          filename: a.filename,
          mimeType: a.mimeType,
          analysis: a.analysis,
          ...(a.error && { error: a.error }),
        })),
      }),
    }));
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Table format: human readable
    for (const issue of loadedIssues) {
      console.log(formatIssueDetail(issue, format));

      // Add vision analysis if available
      if (visionResults.has(issue.key)) {
        console.log("\n" + formatVisionAnalysis(visionResults.get(issue.key)!));
      }

      console.log("\n" + "═".repeat(60) + "\n");
    }
    console.log(`Loaded ${loadedIssues.length} issue(s).`);
  }
}

/**
 * Helper to extract text from ADF or plain string description
 */
function formatDescriptionText(desc: string | object | null | undefined): string {
  if (!desc) return "";
  if (typeof desc === "string") return desc;
  // ADF format - extract text
  try {
    const extractText = (node: unknown): string => {
      if (!node || typeof node !== "object") return "";
      const n = node as { type?: string; text?: string; content?: unknown[] };
      if (n.type === "text" && typeof n.text === "string") return n.text;
      if (Array.isArray(n.content)) {
        return n.content.map(extractText).join("");
      }
      return "";
    };
    return extractText(desc);
  } catch {
    return "";
  }
}

async function handleOpen(args: string[], profileName: string | undefined) {
  let issueKey = args.find(a => !a.startsWith("-") && !/^\d+$/.test(a) || /^\d+$/.test(a));
  const useVision = args.includes("--vision");

  // Support opening by index from last search
  if (issueKey && /^\d+$/.test(issueKey)) {
    const cache = loadSearchCache();
    if (cache) {
      const idx = parseInt(issueKey, 10);
      if (idx > 0 && idx <= cache.issues.length) {
        issueKey = cache.issues[idx - 1].key;
      }
    }
  }

  if (!issueKey) {
    console.error("Usage: jira open <issue-key|index> [--vision]");
    console.error("\nExamples:");
    console.error("  jira open SMS-123           Open by key");
    console.error("  jira open 3                 Open #3 from last search");
    console.error("  jira open SMS-123 --vision  Open with image analysis");
    process.exit(1);
  }

  // Check vision availability
  if (useVision && !isVisionAvailable()) {
    console.error("Vision requires OPENAI_API_KEY environment variable.");
    process.exit(1);
  }

  // Auto-detect profile
  if (!profileName) {
    const projectKey = getProjectKeyFromIssue(issueKey);
    profileName = getProfileForProject(projectKey);
  }

  // Fetch issue to verify it exists and get summary
  const config = getConfig(profileName);
  const client = new JiraClient(config);

  try {
    const issue = await client.getIssue(issueKey);

    // Save as opened ticket
    saveOpenedTicket({
      key: issue.key,
      summary: issue.fields.summary,
      profileName: config.profileName,
      openedAt: new Date().toISOString(),
    });

    console.log(`Opened: ${issue.key}`);
    console.log(`  ${issue.fields.summary}`);
    console.log(`  Status: ${issue.fields.status.name} | Type: ${issue.fields.issuetype.name}`);

    // Vision analysis if requested
    if (useVision) {
      const visionConfig = getVisionConfig();
      if (visionConfig) {
        console.log("\nAnalyzing image attachments...\n");
        try {
          const analyses = await analyzeAttachments(client, issue.key, visionConfig);
          console.log(formatVisionAnalysis(analyses));
        } catch (err) {
          console.error(`Vision error: ${err instanceof Error ? err.message : err}`);
        }
      }
    }

    console.log(`\nYou can now run: update, comment, transition, label (without specifying key)`);
  } catch (err) {
    console.error(`Failed to open: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function handleClose() {
  const opened = loadOpenedTicket();
  if (!opened) {
    console.log("No ticket currently opened.");
    return;
  }

  clearOpenedTicket();
  console.log(`Closed: ${opened.key}`);
  console.log(`  ${opened.summary}`);
}

function handleStatus() {
  const opened = loadOpenedTicket();
  if (!opened) {
    console.log("No ticket currently opened.");
    console.log("\nUse 'jira open <key>' to open a ticket for interaction.");
    return;
  }

  const openedTime = new Date(opened.openedAt);
  const elapsed = Math.round((Date.now() - openedTime.getTime()) / 60000);

  console.log(`Currently opened: ${opened.key}`);
  console.log(`  ${opened.summary}`);
  console.log(`  Profile: ${opened.profileName}`);
  console.log(`  Opened: ${elapsed} minutes ago`);
  console.log(`\nAvailable actions: update, comment, transition, label`);
}

async function handleCreate(args: string[], profileName: string | undefined) {
  const input: CreateIssueInput = {
    project: "",
    issuetype: "Task",
    summary: "",
  };
  const labels: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--project":
      case "-P":
        input.project = args[++i];
        break;
      case "--type":
      case "-T":
        input.issuetype = args[++i];
        break;
      case "--summary":
      case "-s":
        input.summary = args[++i];
        break;
      case "--description":
      case "-d":
        input.description = args[++i];
        break;
      case "--assignee":
      case "-a":
        input.assignee = args[++i];
        break;
      case "--labels":
        labels.push(...args[++i].split(",").map(l => l.trim()));
        break;
      case "--label":
        labels.push(args[++i]);
        break;
      case "--epic":
        input.epicKey = args[++i];
        break;
      case "--parent":
        input.parent = args[++i];
        break;
      case "--priority":
        input.priority = args[++i];
        break;
    }
  }

  if (labels.length) {
    input.labels = labels;
  }

  const config = getConfig(profileName);

  // Use default project if not specified
  if (!input.project) {
    if (config.defaultProject) {
      input.project = config.defaultProject;
    } else {
      console.error("Missing required: --project (or set JIRA_DEFAULT_PROJECT in profile)");
      process.exit(1);
    }
  }

  if (!input.summary) {
    console.error("Missing required: --summary");
    process.exit(1);
  }

  const client = new JiraClient(config);
  const result = await client.createIssue(input);

  console.log(`Created ${result.key}`);
  if (input.epicKey) {
    console.log(`  in epic ${input.epicKey}`);
  }
  if (input.parent) {
    console.log(`  as sub-task of ${input.parent}`);
  }
}

async function handleUpdate(args: string[], profileName: string | undefined) {
  const explicitKey = args.find(a => !a.startsWith("-") && /^[A-Z]+-\d+$/i.test(a));
  const issueKey = getWriteTargetKey(explicitKey);

  if (!issueKey) {
    console.error("No ticket opened. Either:");
    console.error("  1. Open a ticket: jira open SMS-123");
    console.error("  2. Specify key: jira update SMS-123 --summary ...");
    process.exit(1);
  }

  // Show which ticket we're updating if using opened ticket
  if (!explicitKey) {
    console.log(`Updating opened ticket: ${issueKey}`);
  }

  const updates: Record<string, string | string[] | undefined> = {};
  const labels: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--summary":
      case "-s":
        updates.summary = args[++i];
        break;
      case "--description":
      case "-d":
        updates.description = args[++i];
        break;
      case "--assignee":
      case "-a":
        updates.assignee = args[++i];
        break;
      case "--priority":
        updates.priority = args[++i];
        break;
      case "--type":
      case "-t":
        updates.issuetype = args[++i];
        break;
      case "--labels":
        labels.push(...args[++i].split(",").map(l => l.trim()));
        break;
      case "--label":
        labels.push(args[++i]);
        break;
    }
  }

  if (labels.length) {
    updates.labels = labels;
  }

  if (Object.keys(updates).length === 0) {
    console.error("No updates specified");
    process.exit(1);
  }

  // Auto-detect profile from issue key
  if (!profileName) {
    const projectKey = getProjectKeyFromIssue(issueKey);
    profileName = getProfileForProject(projectKey);
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  await client.updateIssue(issueKey, updates);

  console.log(`Updated ${issueKey}`);
}

async function handleTransition(args: string[], profileName: string | undefined) {
  // Parse args: either "KEY STATUS" or just "STATUS" (if ticket opened)
  const nonFlags = args.filter(a => !a.startsWith("-"));
  let issueKey: string | null;
  let statusName: string | undefined;

  if (nonFlags.length >= 2 && /^[A-Z]+-\d+$/i.test(nonFlags[0])) {
    // Explicit key: "transition SMS-123 Done"
    issueKey = nonFlags[0];
    statusName = nonFlags[1];
  } else if (nonFlags.length >= 1) {
    // Use opened ticket: "transition Done"
    issueKey = getWriteTargetKey(undefined);
    statusName = nonFlags[0];
  } else {
    issueKey = null;
    statusName = undefined;
  }

  if (!issueKey || !statusName) {
    console.error("Usage: jira transition [issue-key] <status-name>");
    console.error("\nExamples:");
    console.error("  jira transition SMS-123 Done    (explicit key)");
    console.error("  jira transition Done            (uses opened ticket)");
    process.exit(1);
  }

  // Show which ticket if using opened
  if (nonFlags.length === 1) {
    console.log(`Transitioning opened ticket: ${issueKey}`);
  }

  // Auto-detect profile from issue key
  if (!profileName) {
    const projectKey = getProjectKeyFromIssue(issueKey);
    profileName = getProfileForProject(projectKey);
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);

  // Get available transitions
  const transitions = await client.getTransitions(issueKey);
  const transition = transitions.find(
    t => t.name.toLowerCase() === statusName.toLowerCase() ||
         t.to.name.toLowerCase() === statusName.toLowerCase()
  );

  if (!transition) {
    console.error(`Cannot transition to '${statusName}'`);
    console.log(`Available transitions:`);
    for (const t of transitions) {
      console.log(`  - ${t.name} → ${t.to.name}`);
    }
    process.exit(1);
  }

  await client.transitionIssue(issueKey, transition.id);
  console.log(`${issueKey} → ${transition.to.name}`);
}

async function handleComment(args: string[], profileName: string | undefined) {
  // Parse args: either "KEY TEXT" or just "TEXT" (if ticket opened)
  const nonFlags = args.filter(a => !a.startsWith("-"));
  let issueKey: string | null;
  let commentText: string | undefined;

  if (nonFlags.length >= 2 && /^[A-Z]+-\d+$/i.test(nonFlags[0])) {
    // Explicit key: "comment SMS-123 text"
    issueKey = nonFlags[0];
    commentText = nonFlags.slice(1).join(" ");
  } else if (nonFlags.length >= 1) {
    // Use opened ticket: "comment text"
    issueKey = getWriteTargetKey(undefined);
    commentText = nonFlags.join(" ");
  } else {
    issueKey = null;
    commentText = undefined;
  }

  // Read from stdin if '-' is specified
  if (commentText === "-") {
    commentText = await Bun.stdin.text();
  }

  if (!issueKey || !commentText) {
    console.error("Usage: jira comment [issue-key] <text>");
    console.error("\nExamples:");
    console.error("  jira comment SMS-123 \"text\"    (explicit key)");
    console.error("  jira comment \"text\"            (uses opened ticket)");
    console.error("  echo 'text' | jira comment -   (stdin to opened ticket)");
    process.exit(1);
  }

  // Show which ticket if using opened
  const usingOpened = !nonFlags[0] || !/^[A-Z]+-\d+$/i.test(nonFlags[0]);
  if (usingOpened) {
    console.log(`Commenting on opened ticket: ${issueKey}`);
  }

  // Auto-detect profile from issue key
  if (!profileName) {
    const projectKey = getProjectKeyFromIssue(issueKey);
    profileName = getProfileForProject(projectKey);
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  await client.addComment(issueKey, commentText);

  console.log(`Comment added to ${issueKey}`);
}

async function handleTransitions(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  const issueKey = args.find(a => !a.startsWith("-"));
  if (!issueKey) {
    console.error("Usage: jira transitions <issue-key>");
    process.exit(1);
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  const transitions = await client.getTransitions(issueKey);

  console.log(`Available transitions for ${issueKey}:\n`);
  console.log(formatTransitions(transitions, format));
}

async function handleProjects(profileName: string | undefined, format: OutputFormat) {
  const config = getConfig(profileName);
  const client = new JiraClient(config);
  const projects = await client.getProjects();

  console.log(formatProjects(projects, format));
}

async function handleTypes(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  const projectKey = args.find(a => !a.startsWith("-"));

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  const types = await client.getIssueTypes(projectKey);

  if (format === "json") {
    console.log(JSON.stringify(types, null, 2));
  } else {
    console.log("Issue types:\n");
    for (const t of types) {
      console.log(`  ${t.name}${t.subtask ? " (sub-task)" : ""}`);
    }
  }
}

async function handleLabels(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  // Check if querying labels on a specific issue
  const issueKey = args.find(a => !a.startsWith("-") && /^[A-Z]+-\d+$/i.test(a));

  if (issueKey) {
    const config = getConfig(profileName);
    const client = new JiraClient(config);
    const issue = await client.getIssue(issueKey);

    if (format === "json") {
      console.log(JSON.stringify(issue.fields.labels, null, 2));
    } else {
      console.log(`Labels on ${issueKey}:`);
      for (const label of issue.fields.labels) {
        console.log(`  ${label}`);
      }
    }
    return;
  }

  // List all labels
  let prefix: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prefix") {
      prefix = args[++i];
    }
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  const labels = await client.getAllLabels();

  console.log(formatLabels(labels, format, prefix));
}

async function handleLabelOp(args: string[], profileName: string | undefined) {
  const op = args[0]; // add or remove
  const issueKey = args[1];
  const label = args[2];

  if (!["add", "remove"].includes(op) || !issueKey || !label) {
    console.error("Usage: jira label add <issue-key> <label>");
    console.error("       jira label remove <issue-key> <label>");
    process.exit(1);
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);

  if (op === "add") {
    await client.addLabels(issueKey, [label]);
    console.log(`Added '${label}' to ${issueKey}`);
  } else {
    await client.removeLabels(issueKey, [label]);
    console.log(`Removed '${label}' from ${issueKey}`);
  }
}

async function handleFilters(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  // Parse options
  let searchName: string | undefined;
  let ownerFilter: string | undefined;
  let favouritesOnly = false;
  let showMine = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--search" || arg === "-s") {
      searchName = args[++i];
    } else if (arg === "--owner" || arg === "-o") {
      ownerFilter = args[++i];
    } else if (arg === "--mine" || arg === "--my") {
      showMine = true;
    } else if (arg === "--favourites" || arg === "--favorites") {
      favouritesOnly = true;
    } else if (!arg.startsWith("-")) {
      searchName = arg;
    }
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);

  let filters: JiraFilter[];

  if (favouritesOnly || !searchName) {
    // Default: show favourite filters
    filters = await client.getFavouriteFilters();
    if (filters.length === 0) {
      console.log("No favourite filters found.");
      console.log("\nTip: Star filters in Jira to add them to favourites.");
      console.log("Or search by name: jira filters <name>");
      return;
    }
    console.log("Favourite filters:\n");
  } else {
    // Search filters by name
    filters = await client.searchFilters(searchName);
    if (filters.length === 0) {
      console.log(`No filters found matching: ${searchName}`);
      return;
    }
    console.log(`Filters matching "${searchName}":\n`);
  }

  // Apply owner filter
  if (showMine) {
    // Filter to current user's filters (using username from config)
    filters = filters.filter(f =>
      f.owner.displayName.toLowerCase().includes(config.username.split("@")[0].toLowerCase())
    );
    if (filters.length === 0) {
      console.log("No filters found owned by you.");
      return;
    }
  } else if (ownerFilter) {
    filters = filters.filter(f =>
      f.owner.displayName.toLowerCase().includes(ownerFilter.toLowerCase())
    );
    if (filters.length === 0) {
      console.log(`No filters found with owner matching: ${ownerFilter}`);
      return;
    }
  }

  if (format === "json") {
    console.log(JSON.stringify(filters, null, 2));
  } else {
    // Table format
    console.log("#  ID       Name                                    Owner                Shared With");
    console.log("─".repeat(100));
    filters.forEach((f, i) => {
      const name = f.name.length > 35 ? f.name.slice(0, 32) + "..." : f.name;
      const star = f.favourite ? "★" : " ";

      // Format share permissions
      let sharedWith = "private";
      if (f.sharePermissions && f.sharePermissions.length > 0) {
        const shares = f.sharePermissions.map(p => {
          switch (p.type) {
            case "global": return "anyone";
            case "loggedin":
            case "authenticated": return "logged-in users";
            case "project": return p.project?.key || "project";
            case "group": return p.group?.name || "group";
            case "user": return p.user?.displayName || "user";
            default: return p.type;
          }
        });
        sharedWith = shares.join(", ");
        if (sharedWith.length > 20) {
          sharedWith = sharedWith.slice(0, 17) + "...";
        }
      }

      console.log(
        `${star}${String(i + 1).padStart(2)}  ${f.id.padEnd(7)}  ${name.padEnd(35)}  ${f.owner.displayName.padEnd(18)}  ${sharedWith}`
      );
    });
    console.log(`\nUse with search: jira search --filter "<name>"`);
    console.log(`Or by ID:        jira search --filter ${filters[0]?.id || "12345"}`);
  }
}

async function handleLink(args: string[], profileName: string | undefined) {
  // Check for --epic syntax
  const epicIndex = args.indexOf("--epic");
  if (epicIndex !== -1) {
    const issueKey = args.find(a => !a.startsWith("-"));
    const epicKey = args[epicIndex + 1];

    if (!issueKey || !epicKey) {
      console.error("Usage: jira link <issue-key> --epic <epic-key>");
      process.exit(1);
    }

    const config = getConfig(profileName);
    const client = new JiraClient(config);
    await client.linkToEpic(issueKey, epicKey);

    console.log(`${issueKey} added to epic ${epicKey}`);
    return;
  }

  // Standard link: jira link KEY1 "type" KEY2
  const nonFlags = args.filter(a => !a.startsWith("-"));
  if (nonFlags.length < 3) {
    console.error("Usage: jira link <issue-key1> <link-type> <issue-key2>");
    console.error("       jira link <issue-key> --epic <epic-key>");
    process.exit(1);
  }

  const [key1, linkType, key2] = nonFlags;

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  await client.createLink(key1, key2, linkType);

  console.log(`${key1} ${linkType} ${key2}`);
}

async function handleUnlink(args: string[], profileName: string | undefined) {
  const nonFlags = args.filter(a => !a.startsWith("-"));
  if (nonFlags.length < 2) {
    console.error("Usage: jira unlink <issue-key1> <issue-key2>");
    process.exit(1);
  }

  const [key1, key2] = nonFlags;

  const config = getConfig(profileName);
  const client = new JiraClient(config);

  // Get issue to find link ID
  const issue = await client.getIssue(key1, ["issuelinks"]);
  const link = issue.fields.issuelinks?.find(
    l => l.inwardIssue?.key === key2 || l.outwardIssue?.key === key2
  );

  if (!link) {
    console.error(`No link found between ${key1} and ${key2}`);
    process.exit(1);
  }

  await client.deleteLink(link.id);
  console.log(`Removed link between ${key1} and ${key2}`);
}

async function handleLinkTypes(profileName: string | undefined, format: OutputFormat) {
  const config = getConfig(profileName);
  const client = new JiraClient(config);
  const types = await client.getLinkTypes();

  console.log(formatLinkTypes(types, format));
}

async function handleLinks(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  const issueKey = args.find(a => !a.startsWith("-"));
  if (!issueKey) {
    console.error("Usage: jira links <issue-key>");
    process.exit(1);
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  const issue = await client.getIssue(issueKey, ["issuelinks"]);

  const links = issue.fields.issuelinks || [];

  if (links.length === 0) {
    console.log(`No links on ${issueKey}`);
    return;
  }

  if (format === "json") {
    console.log(JSON.stringify(links, null, 2));
  } else {
    console.log(`Links on ${issueKey}:\n`);
    for (const link of links) {
      if (link.outwardIssue) {
        console.log(`  ${link.type.outward}: ${link.outwardIssue.key} - ${link.outwardIssue.fields.summary}`);
      }
      if (link.inwardIssue) {
        console.log(`  ${link.type.inward}: ${link.inwardIssue.key} - ${link.inwardIssue.fields.summary}`);
      }
    }
  }
}

async function handleDev(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  const issueKey = args.find(a => !a.startsWith("-"));
  if (!issueKey) {
    console.error("Usage: jira dev <issue-key>");
    process.exit(1);
  }

  const showBranches = args.includes("--branches");
  const showPRs = args.includes("--prs");
  const createBranch = args.includes("--create-branch");
  const checkout = args.includes("--checkout");

  const config = getConfig(profileName);
  const client = new JiraClient(config);

  // Create branch suggestion
  if (createBranch || checkout) {
    const issue = await client.getIssue(issueKey);
    const branchName = suggestBranchName(issueKey, issue.fields.summary);

    if (checkout) {
      const { execSync } = await import("child_process");
      execSync(`git checkout -b ${branchName}`, { stdio: "inherit" });
    } else {
      console.log(branchName);
    }
    return;
  }

  // Get dev info
  const devInfo = await client.getDevInfo(issueKey);

  // Filter if requested
  if (showBranches) {
    devInfo.commits = [];
    devInfo.pullRequests = [];
  } else if (showPRs) {
    devInfo.branches = [];
    devInfo.commits = [];
  }

  console.log(formatDevInfo(devInfo, issueKey, format));
}

async function handleConfig(profileName: string | undefined) {
  try {
    const config = getConfig(profileName);
    console.log(`Profile: ${config.profileName}`);
    console.log(`URL:     ${config.url}`);
    console.log(`User:    ${config.username}`);
    if (config.defaultProject) {
      console.log(`Default: ${config.defaultProject}`);
    }
    if (config.projects?.length) {
      console.log(`Projects: ${config.projects.join(", ")}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function handleProfiles() {
  const profiles = listProfiles();
  console.log(formatProfiles(profiles));
}

async function handleSetup(profileName: string | undefined) {
  console.log("Jira CLI Setup - Project Discovery\n");

  const profiles = profileName
    ? [{ name: profileName, url: "", isDefault: false }]
    : listProfiles();

  if (profiles.length === 0) {
    console.error("No profiles found. Create profiles in ~/.claude/jira/profiles/ first.");
    process.exit(1);
  }

  console.log(`Discovering projects for ${profiles.length} profile(s)...\n`);

  for (const profile of profiles) {
    console.log(`\n${profile.name}:`);
    console.log("─".repeat(40));

    try {
      const config = loadProfile(profile.name);
      const client = new JiraClient(config);
      const projects = await client.getProjects();

      if (projects.length === 0) {
        console.log("  No accessible projects found");
        continue;
      }

      const projectKeys = projects.map(p => p.key);
      console.log(`  Found ${projects.length} projects:`);
      for (const p of projects) {
        console.log(`    ${p.key.padEnd(10)} ${p.name}`);
      }

      // Check current config
      if (config.projects?.length) {
        console.log(`\n  Currently configured: ${config.projects.join(", ")}`);
      }

      // Write to profile
      writeProfileProjects(profile.name, projectKeys);
      console.log(`\n  ✓ Updated JIRA_PROJECTS in ${profile.name}.env`);

    } catch (error) {
      console.error(`  Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log("\n" + "─".repeat(40));
  console.log("Setup complete! Auto-detection is now enabled.");
  console.log("\nThe CLI will automatically select the correct profile based on issue key.");
  console.log("Example: jira get SMS-123  →  auto-selects profile with SMS project");
}

// ============================================================================
// Run
// ============================================================================

main();
