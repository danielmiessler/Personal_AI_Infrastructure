#!/usr/bin/env bun

/**
 * Daily Log CLI - Access and manage PAI daily memory logs
 *
 * Commands:
 *   today      - Show today's log
 *   yesterday  - Show yesterday's log
 *   week       - Show this week's logs
 *   search     - Search across all daily logs
 *   edit       - Open today's log in editor
 *   list       - List all daily logs
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import { spawn } from "child_process";

const PAI_DIR =
  process.env.PAI_DIR || resolve(homedir(), ".claude");
const MEMORY_DIR = join(PAI_DIR, "memory");
const DAILY_DIR = join(MEMORY_DIR, "daily");

// Day names
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalDate(daysOffset: number = 0): Date {
  const now = new Date();
  now.setDate(now.getDate() + daysOffset);
  return now;
}

function getDailyLogPath(dateStr: string): string {
  return join(DAILY_DIR, `${dateStr}.md`);
}

function showLog(dateStr: string): void {
  const path = getDailyLogPath(dateStr);

  if (!existsSync(path)) {
    console.log(`No log found for ${dateStr}`);
    return;
  }

  const content = readFileSync(path, "utf-8");
  console.log(content);
}

function showToday(): void {
  const dateStr = formatDate(getLocalDate());
  console.log(`Today: ${dateStr}\n`);
  showLog(dateStr);
}

function showYesterday(): void {
  const dateStr = formatDate(getLocalDate(-1));
  console.log(`Yesterday: ${dateStr}\n`);
  showLog(dateStr);
}

function showWeek(): void {
  console.log("This Week\n");

  for (let i = 6; i >= 0; i--) {
    const date = getLocalDate(-i);
    const dateStr = formatDate(date);
    const dayName = DAYS[date.getDay()];
    const path = getDailyLogPath(dateStr);

    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8");

      const sessionMatch = content.match(
        /sessions: (\d+)/
      );
      const sessions = sessionMatch
        ? sessionMatch[1]
        : "0";

      const focusMatch = content.match(
        /focus_areas: \[([^\]]*)\]/
      );
      const focus = focusMatch ? focusMatch[1] : "none";

      console.log(
        `${dateStr} (${dayName.substring(0, 3)}): ${sessions} session(s) - ${focus}`
      );
    } else {
      console.log(
        `${dateStr} (${dayName.substring(0, 3)}): No log`
      );
    }
  }
}

function searchLogs(query: string): void {
  if (!existsSync(DAILY_DIR)) {
    console.log("No daily logs found");
    return;
  }

  const files = readdirSync(DAILY_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  console.log(`Searching for: "${query}"\n`);

  let found = 0;
  const queryLower = query.toLowerCase();

  for (const file of files) {
    const content = readFileSync(
      join(DAILY_DIR, file),
      "utf-8"
    );

    if (content.toLowerCase().includes(queryLower)) {
      found++;
      const dateStr = file.replace(".md", "");

      const lines = content.split("\n");
      const matches = lines
        .filter((line) =>
          line.toLowerCase().includes(queryLower)
        )
        .slice(0, 3);

      console.log(`  ${dateStr}:`);
      matches.forEach((line) => {
        const highlighted = line.replace(
          new RegExp(query, "gi"),
          (match) => `\x1b[33m${match}\x1b[0m`
        );
        console.log(`   ${highlighted.trim()}`);
      });
      console.log("");
    }
  }

  if (found === 0) {
    console.log("No matches found");
  } else {
    console.log(`Found in ${found} log(s)`);
  }
}

function editToday(): void {
  const dateStr = formatDate(getLocalDate());
  const path = getDailyLogPath(dateStr);

  // Create if doesn't exist
  if (!existsSync(path)) {
    if (!existsSync(DAILY_DIR)) {
      mkdirSync(DAILY_DIR, { recursive: true });
    }

    const dayName = DAYS[getLocalDate().getDay()];
    const content = `---
date: ${dateStr}
day: ${dayName}
sessions: 0
focus_areas: []
---

# ${dateStr} (${dayName})

## Sessions Today
<!-- Sessions will be logged automatically -->

## Key Decisions
<!-- Record important decisions with rationale -->

## Completed
<!-- Work accomplished today -->

## Learnings
<!-- Insights from today's work -->

## Reflections
<!-- Space for manual notes -->

## Tomorrow
<!-- Carried forward to next day -->
`;
    writeFileSync(path, content);
  }

  const editor = process.env.EDITOR || "vim";
  const child = spawn(editor, [path], {
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

function listLogs(): void {
  if (!existsSync(DAILY_DIR)) {
    console.log("No daily logs found");
    return;
  }

  const files = readdirSync(DAILY_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse();

  console.log(`Daily Logs (${files.length} total)\n`);

  // Group by month
  const byMonth: Record<string, string[]> = {};

  for (const file of files) {
    const dateStr = file.replace(".md", "");
    const month = dateStr.substring(0, 7);

    if (!byMonth[month]) {
      byMonth[month] = [];
    }
    byMonth[month].push(dateStr);
  }

  for (const [month, dates] of Object.entries(byMonth)) {
    console.log(`\n${month}:`);
    dates.forEach((d) => console.log(`  ${d}`));
  }
}

function showHelp(): void {
  console.log(`
PAI Daily Log CLI

Usage: bun daily-log.ts <command> [args]

Commands:
  today       Show today's daily log
  yesterday   Show yesterday's daily log
  week        Show summary of this week's logs
  search <q>  Search across all daily logs
  edit        Open today's log in $EDITOR
  list        List all daily logs
  help        Show this help message

Examples:
  bun daily-log.ts today
  bun daily-log.ts search "migration"
  bun daily-log.ts week

Location: ${DAILY_DIR}
`);
}

// Main
const command = process.argv[2] || "today";
const args = process.argv.slice(3);

switch (command) {
  case "today":
    showToday();
    break;
  case "yesterday":
    showYesterday();
    break;
  case "week":
    showWeek();
    break;
  case "search":
    if (args.length === 0) {
      console.error(
        "Usage: bun daily-log.ts search <query>"
      );
      process.exit(1);
    }
    searchLogs(args.join(" "));
    break;
  case "edit":
    editToday();
    break;
  case "list":
    listLogs();
    break;
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
