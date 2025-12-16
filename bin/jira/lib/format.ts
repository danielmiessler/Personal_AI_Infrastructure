/**
 * Output Formatters for JIRA CLI
 *
 * Supports: table (default), json, markdown
 */

import type { JiraIssue, JiraProject, Transition, IssueLinkType, DevInfo } from "./api";
import { adfToText } from "./api";

export type OutputFormat = "table" | "json" | "markdown" | "index";

// ============================================================================
// Issue Formatting
// ============================================================================

export interface IssueIndexRow {
  index: number;
  key: string;
  type: string;
  summary: string;
  status: string;
  created: string;
  labels: string;
  instance?: string;
}

export function formatIssueIndex(
  issues: (JiraIssue & { _instance?: string })[],
  format: OutputFormat,
  showInstance?: boolean
): string {
  const rows: IssueIndexRow[] = issues.map((issue, i) => ({
    index: i + 1,
    key: issue.key,
    type: truncate(issue.fields.issuetype?.name || "-", 10),
    summary: truncate(issue.fields.summary, 35),
    status: truncate(issue.fields.status.name, 12),
    created: formatDate(issue.fields.created),
    labels: formatLabelsShort(issue.fields.labels),
    instance: issue._instance,
  }));

  switch (format) {
    case "json":
      return JSON.stringify(rows, null, 2);

    case "markdown":
      return formatMarkdownTable(
        ["#", "Key", "Type", "Summary", "Status", "Created", "Labels"],
        rows.map(r => [String(r.index), r.key, r.type, r.summary, r.status, r.created, r.labels])
      );

    case "index":
    case "table":
    default:
      return formatTable(
        showInstance
          ? ["#", "Instance", "Key", "Type", "Summary", "Status", "Created", "Labels"]
          : ["#", "Key", "Type", "Summary", "Status", "Created", "Labels"],
        rows.map(r =>
          showInstance
            ? [String(r.index), r.instance || "", r.key, r.type, r.summary, r.status, r.created, r.labels]
            : [String(r.index), r.key, r.type, r.summary, r.status, r.created, r.labels]
        )
      );
  }
}

/**
 * Format labels for index display (show first 2-3, truncated)
 */
function formatLabelsShort(labels: string[]): string {
  if (!labels?.length) return "-";
  const shown = labels.slice(0, 2).map(l => truncate(l, 12));
  if (labels.length > 2) {
    return shown.join(", ") + `... (+${labels.length - 2})`;
  }
  return shown.join(", ");
}

export function formatIssueDetail(issue: JiraIssue, format: OutputFormat): string {
  const description = typeof issue.fields.description === "object"
    ? adfToText(issue.fields.description)
    : issue.fields.description || "";

  switch (format) {
    case "json":
      return JSON.stringify(issue, null, 2);

    case "markdown":
      return formatIssueMarkdown(issue, description);

    case "table":
    default:
      return formatIssueTable(issue, description);
  }
}

function formatIssueTable(issue: JiraIssue, description: string): string {
  const lines: string[] = [
    `${issue.key}: ${issue.fields.summary}`,
    "─".repeat(60),
    `Type:     ${issue.fields.issuetype.name}`,
    `Status:   ${issue.fields.status.name}`,
    `Priority: ${issue.fields.priority?.name || "-"}`,
    `Assignee: ${issue.fields.assignee?.displayName || "Unassigned"}`,
    `Reporter: ${issue.fields.reporter?.displayName || "-"}`,
    `Labels:   ${issue.fields.labels.join(", ") || "-"}`,
    `Created:  ${formatDate(issue.fields.created)}`,
    `Updated:  ${formatDate(issue.fields.updated)}`,
  ];

  // Parent (for sub-tasks)
  if (issue.fields.parent) {
    lines.push(`Parent:   ${issue.fields.parent.key} - ${issue.fields.parent.fields.summary}`);
  }

  // Description
  if (description) {
    lines.push("", "Description:", "─".repeat(40), truncate(description, 500));
  }

  // Sub-tasks
  if (issue.fields.subtasks?.length) {
    lines.push("", "Sub-tasks:", "─".repeat(40));
    for (const sub of issue.fields.subtasks) {
      lines.push(`  ${sub.key}: ${sub.fields.summary} [${sub.fields.status.name}]`);
    }
  }

  // Links
  if (issue.fields.issuelinks?.length) {
    lines.push("", "Links:", "─".repeat(40));
    for (const link of issue.fields.issuelinks) {
      if (link.outwardIssue) {
        lines.push(`  ${link.type.outward}: ${link.outwardIssue.key} - ${link.outwardIssue.fields.summary}`);
      }
      if (link.inwardIssue) {
        lines.push(`  ${link.type.inward}: ${link.inwardIssue.key} - ${link.inwardIssue.fields.summary}`);
      }
    }
  }

  // Comments (last 3)
  const comments = issue.fields.comment?.comments || [];
  if (comments.length) {
    lines.push("", `Comments (${issue.fields.comment?.total || comments.length}):`);
    lines.push("─".repeat(40));
    for (const comment of comments.slice(-3)) {
      const body = typeof comment.body === "object" ? adfToText(comment.body) : comment.body;
      lines.push(`  ${comment.author.displayName} (${formatDate(comment.created)}):`);
      lines.push(`    ${truncate(body, 200)}`);
    }
  }

  return lines.join("\n");
}

function formatIssueMarkdown(issue: JiraIssue, description: string): string {
  const lines: string[] = [
    `# [${issue.key}](${issue.self.replace("/rest/api/3/issue/", "/browse/")}) ${issue.fields.summary}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Type | ${issue.fields.issuetype.name} |`,
    `| Status | ${issue.fields.status.name} |`,
    `| Priority | ${issue.fields.priority?.name || "-"} |`,
    `| Assignee | ${issue.fields.assignee?.displayName || "Unassigned"} |`,
    `| Labels | ${issue.fields.labels.join(", ") || "-"} |`,
  ];

  if (description) {
    lines.push("", "## Description", "", description);
  }

  return lines.join("\n");
}

// ============================================================================
// Project Formatting
// ============================================================================

export function formatProjects(projects: JiraProject[], format: OutputFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(projects, null, 2);

    case "markdown":
      return formatMarkdownTable(
        ["Key", "Name", "Lead", "Type"],
        projects.map(p => [p.key, p.name, p.lead?.displayName || "-", p.projectTypeKey])
      );

    case "table":
    default:
      return formatTable(
        ["Key", "Name", "Lead"],
        projects.map(p => [p.key, truncate(p.name, 30), p.lead?.displayName || "-"])
      );
  }
}

// ============================================================================
// Transition Formatting
// ============================================================================

export function formatTransitions(transitions: Transition[], format: OutputFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(transitions, null, 2);

    case "table":
    default:
      return formatTable(
        ["ID", "Name", "To Status"],
        transitions.map(t => [t.id, t.name, t.to.name])
      );
  }
}

// ============================================================================
// Link Type Formatting
// ============================================================================

export function formatLinkTypes(types: IssueLinkType[], format: OutputFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(types, null, 2);

    case "table":
    default:
      return formatTable(
        ["Name", "Outward", "Inward"],
        types.map(t => [t.name, t.outward, t.inward])
      );
  }
}

// ============================================================================
// Dev Info Formatting
// ============================================================================

export function formatDevInfo(devInfo: DevInfo, issueKey: string, format: OutputFormat): string {
  const hasBranches = devInfo.branches.length > 0;
  const hasCommits = devInfo.commits.length > 0;
  const hasPRs = devInfo.pullRequests.length > 0;

  if (!hasBranches && !hasCommits && !hasPRs) {
    return `No development info linked to ${issueKey}\n\nTip: Add '${issueKey}' to branch name or commit message to link`;
  }

  switch (format) {
    case "json":
      return JSON.stringify(devInfo, null, 2);

    case "table":
    default: {
      const lines: string[] = [`Development info for ${issueKey}:`, ""];

      if (hasBranches) {
        lines.push("Branches:", "─".repeat(40));
        for (const branch of devInfo.branches) {
          lines.push(`  ${branch.name} (${branch.repository.name})`);
        }
        lines.push("");
      }

      if (hasPRs) {
        lines.push("Pull Requests:", "─".repeat(40));
        for (const pr of devInfo.pullRequests) {
          lines.push(`  #${pr.id}: ${pr.name} [${pr.status}]`);
        }
        lines.push("");
      }

      if (hasCommits) {
        lines.push("Recent Commits:", "─".repeat(40));
        for (const commit of devInfo.commits.slice(0, 5)) {
          lines.push(`  ${commit.id.slice(0, 7)}: ${truncate(commit.message, 50)} (${commit.author.name})`);
        }
      }

      return lines.join("\n");
    }
  }
}

// ============================================================================
// Label Formatting
// ============================================================================

export function formatLabels(
  labels: Map<string, number>,
  format: OutputFormat,
  prefix?: string
): string {
  let entries = Array.from(labels.entries());

  if (prefix) {
    entries = entries.filter(([label]) => label.startsWith(prefix));
  }

  // Sort by count (descending)
  entries.sort((a, b) => b[1] - a[1]);

  switch (format) {
    case "json":
      return JSON.stringify(Object.fromEntries(entries), null, 2);

    case "table":
    default:
      if (entries.length === 0) {
        return prefix ? `No labels matching '${prefix}'` : "No labels found";
      }
      return formatTable(
        ["Label", "Count"],
        entries.map(([label, count]) => [label, String(count)])
      );
  }
}

// ============================================================================
// Profile Formatting
// ============================================================================

export interface ProfileDisplay {
  name: string;
  url: string;
  isDefault: boolean;
}

export function formatProfiles(profiles: ProfileDisplay[]): string {
  if (profiles.length === 0) {
    return "No profiles configured.\n\nCreate one: cp profiles.example/example.env profiles/personal.env";
  }

  const lines = ["Available profiles:", ""];
  for (const p of profiles) {
    const marker = p.isDefault ? " (default)" : "";
    lines.push(`  ${p.name}${marker}`);
    lines.push(`    ${p.url}`);
  }

  return lines.join("\n");
}

// ============================================================================
// Table Helpers
// ============================================================================

function formatTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "No results";
  }

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || "").length))
  );

  // Build table
  const lines: string[] = [];

  // Header
  lines.push(headers.map((h, i) => h.padEnd(widths[i])).join("  "));
  lines.push(widths.map(w => "─".repeat(w)).join("──"));

  // Rows
  for (const row of rows) {
    lines.push(row.map((cell, i) => (cell || "").padEnd(widths[i])).join("  "));
  }

  return lines.join("\n");
}

function formatMarkdownTable(headers: string[], rows: string[][]): string {
  const lines: string[] = [];

  lines.push(`| ${headers.join(" | ")} |`);
  lines.push(`| ${headers.map(() => "---").join(" | ")} |`);

  for (const row of rows) {
    lines.push(`| ${row.join(" | ")} |`);
  }

  return lines.join("\n");
}

// ============================================================================
// Utility Helpers
// ============================================================================

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toISOString().split("T")[0];
}

/**
 * Generate a branch name from issue
 */
export function suggestBranchName(issueKey: string, summary: string): string {
  const slug = summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `${issueKey}-${slug}`;
}
