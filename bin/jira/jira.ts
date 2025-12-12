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
  cacheProjectProfile,
  getCachedProfile,
  getProjectKeyFromIssue,
  type JiraConfig,
} from "./lib/config";
import {
  JiraClient,
  textToJql,
  type CreateIssueInput,
  type JiraIssue,
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

// ============================================================================
// Help Text
// ============================================================================

const HELP = `
jira - PAI JIRA CLI

USAGE:
  jira <command> [options]

COMMANDS:
  search <query>         Search issues (JQL or text)
  get <key>              Get issue details
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
  link <key1> <type> <key2>  Link two issues
  link <key> --epic <epic>   Add issue to epic
  unlink <key1> <key2>       Remove link between issues
  link-types             List available link types
  links <key>            Show all links on issue
  dev <key>              Show GitHub dev info (branches, PRs, commits)
  config                 Show current configuration
  profiles               List available profiles

GLOBAL OPTIONS:
  --profile, -p <name>   Use specific profile (or 'all' for federated search)
  --format, -f <fmt>     Output format: table (default), json, markdown
  --help, -h             Show this help

SEARCH OPTIONS:
  --project <key>        Filter by project
  --label <label>        Filter by label (AND logic, repeatable)
  --any-label <label>    Filter by label (OR logic, repeatable)
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

DEV OPTIONS:
  --branches             Show only branches
  --prs                  Show only pull requests
  --create-branch        Output suggested branch name
  --checkout             Create and checkout branch (requires git)

EXAMPLES:
  # Search
  jira search "login bug"
  jira search "project = PAI AND status = Open"
  jira search --label project/pai --limit 10
  jira search -p all "urgent"              # Search all instances

  # Issue operations
  jira get PAI-123
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
  const commandArgs = args.slice(1);

  // Parse global options
  let profileName: string | undefined;
  let format: OutputFormat = "table";

  for (let i = 0; i < commandArgs.length; i++) {
    if (commandArgs[i] === "--profile" || commandArgs[i] === "-p") {
      profileName = commandArgs[++i];
    } else if (commandArgs[i] === "--format" || commandArgs[i] === "-f") {
      const fmt = commandArgs[++i];
      if (["table", "json", "markdown", "index"].includes(fmt)) {
        format = fmt as OutputFormat;
      }
    }
  }

  try {
    switch (command) {
      case "search":
        await handleSearch(commandArgs, profileName, format);
        break;
      case "get":
        await handleGet(commandArgs, profileName, format);
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
  const labels: string[] = [];
  const anyLabels: string[] = [];
  let limit = 20;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project") {
      project = args[++i];
    } else if (arg === "--label") {
      labels.push(args[++i]);
    } else if (arg === "--any-label") {
      anyLabels.push(args[++i]);
    } else if (arg === "--limit" || arg === "-l") {
      limit = parseInt(args[++i], 10);
    } else if (!arg.startsWith("-") && !arg.startsWith("--")) {
      query = arg;
    }
  }

  // Build JQL
  let jql = query ? textToJql(query) : "";
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
  if (!jql) {
    jql = "ORDER BY updated DESC";
  } else {
    jql += " ORDER BY updated DESC";
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
    console.log(`\nLoad details: jira get <KEY>`);
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
  console.log(`\nLoad details: jira get <KEY>`);
}

async function handleGet(
  args: string[],
  profileName: string | undefined,
  format: OutputFormat
) {
  const issueKey = args.find(a => !a.startsWith("-"));
  if (!issueKey) {
    console.error("Usage: jira get <issue-key>");
    process.exit(1);
  }

  // Try to auto-detect profile from cached mapping
  if (!profileName) {
    const projectKey = getProjectKeyFromIssue(issueKey);
    profileName = getCachedProfile(projectKey);
  }

  const config = getConfig(profileName);
  const client = new JiraClient(config);

  const issue = await client.getIssue(issueKey, [
    "comment",
    "issuelinks",
    "subtasks",
  ]);

  console.log(formatIssueDetail(issue, format));
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
  const issueKey = args.find(a => !a.startsWith("-"));
  if (!issueKey) {
    console.error("Usage: jira update <issue-key> [--summary ...] [--description ...]");
    process.exit(1);
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

  const config = getConfig(profileName);
  const client = new JiraClient(config);
  await client.updateIssue(issueKey, updates);

  console.log(`Updated ${issueKey}`);
}

async function handleTransition(args: string[], profileName: string | undefined) {
  const issueKey = args.find(a => !a.startsWith("-"));
  const statusName = args.find((a, i) => i > 0 && !a.startsWith("-") && a !== issueKey);

  if (!issueKey || !statusName) {
    console.error("Usage: jira transition <issue-key> <status-name>");
    process.exit(1);
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
  const issueKey = args.find(a => !a.startsWith("-"));
  let commentText = args.slice(1).find(a => !a.startsWith("-"));

  // Read from stdin if '-' is specified
  if (commentText === "-") {
    commentText = await Bun.stdin.text();
  }

  if (!issueKey || !commentText) {
    console.error("Usage: jira comment <issue-key> <text>");
    console.error("       echo 'text' | jira comment <issue-key> -");
    process.exit(1);
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
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function handleProfiles() {
  const profiles = listProfiles();
  console.log(formatProfiles(profiles));
}

// ============================================================================
// Run
// ============================================================================

main();
