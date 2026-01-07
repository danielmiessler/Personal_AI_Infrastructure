#!/usr/bin/env bun
/**
 * List Issues CLI Tool
 *
 * Usage:
 *   bun run list.ts [--status open|in_progress|done|cancelled]
 *                   [--type task|bug|feature|story|epic]
 *                   [--priority urgent|high|medium|low]
 *                   [--project <id>]
 *                   [--limit <num>]
 *                   [--format table|json]
 */

import { getIssuesProvider, type IssueQuery, type Issue } from 'kai-issues-core';

function parseArgs(args: string[]): {
  status?: string;
  type?: string;
  priority?: string;
  project?: string;
  limit?: number;
  format: 'table' | 'json';
} {
  const result: ReturnType<typeof parseArgs> = { format: 'table' };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--status':
        result.status = next;
        i++;
        break;
      case '--type':
        result.type = next;
        i++;
        break;
      case '--priority':
        result.priority = next;
        i++;
        break;
      case '--project':
        result.project = next;
        i++;
        break;
      case '--limit':
        result.limit = parseInt(next, 10);
        i++;
        break;
      case '--format':
        result.format = next as 'table' | 'json';
        i++;
        break;
    }
  }

  return result;
}

function formatTable(issues: Issue[]): string {
  if (issues.length === 0) {
    return 'No issues found.';
  }

  const lines = ['ID\t\tStatus\t\tPriority\tTitle'];
  lines.push('-'.repeat(80));

  for (const issue of issues) {
    const id = issue.id.slice(0, 8);
    const status = issue.status.padEnd(12);
    const priority = (issue.priority || 'none').padEnd(8);
    const title = issue.title.slice(0, 40);
    lines.push(`${id}\t${status}\t${priority}\t${title}`);
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    const provider = await getIssuesProvider();

    const query: IssueQuery = {};
    if (args.status) query.status = args.status as IssueQuery['status'];
    if (args.type) query.type = args.type as IssueQuery['type'];
    if (args.priority) query.priority = args.priority as IssueQuery['priority'];
    if (args.project) query.projectId = args.project;
    if (args.limit) query.limit = args.limit;

    const issues = await provider.listIssues(query);

    if (args.format === 'json') {
      console.log(JSON.stringify(issues, null, 2));
    } else {
      console.log(formatTable(issues));
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
