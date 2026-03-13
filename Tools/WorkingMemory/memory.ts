#!/usr/bin/env bun
// Working Memory System - Query CLI
// Usage: bun memory.ts <command> [args] [--flags]

import type {
  SearchResult,
  DecisionRecord,
  TopicRecord,
  SessionRow,
  EntryRow,
} from "./types";

// --- Dynamic imports with graceful fallback ---

let dbReader: {
  searchEntries: (query: string, limit?: number) => SearchResult[];
  getTopicEntries: (topicName: string, limit?: number) => EntryRow[];
  getRecentDecisions: (
    days?: number,
    limit?: number
  ) => DecisionRecord[];
  getSessionList: (limit?: number) => SessionRow[];
  getSessionById: (id: string) => SessionRow | null;
  getSessionEntries: (sessionId: string) => EntryRow[];
  getTopics: () => TopicRecord[];
  getStats: () => {
    totalEntries: number;
    totalSessions: number;
    totalTopics: number;
    totalDecisions: number;
    dbSizeBytes: number;
  };
} | null = null;

try {
  dbReader = await import("./db-reader");
} catch {
  // db-reader may not be available yet
}

// --- ANSI Color Helpers ---

const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[90m";

function bold(s: string): string {
  return `${BOLD}${s}${RESET}`;
}
function cyan(s: string): string {
  return `${CYAN}${s}${RESET}`;
}
function yellow(s: string): string {
  return `${YELLOW}${s}${RESET}`;
}
function green(s: string): string {
  return `${GREEN}${s}${RESET}`;
}
function red(s: string): string {
  return `${RED}${s}${RESET}`;
}
function dim(s: string): string {
  return `${DIM}${s}${RESET}`;
}

// --- Arg Parsing ---

function parseArgs(argv: string[]): {
  command: string;
  args: string[];
  flags: Record<string, string>;
} {
  const raw = argv.slice(2); // skip bun + script path
  const command = raw[0] || "help";
  const args: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 1; i < raw.length; i++) {
    const token = raw[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = raw[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    } else {
      args.push(token);
    }
  }

  return { command, args, flags };
}

// --- Formatting Utilities ---

function truncate(s: string, maxLen: number): string {
  if (!s) return "";
  const clean = s.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + "...";
}

function truncateId(id: string, len: number = 8): string {
  return id ? id.slice(0, len) : "";
}

function formatTimestamp(ts: string): string {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return ts.slice(0, 19);
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function parseDaysFlag(value: string | undefined): number {
  if (!value) return 7;
  const match = value.match(/^(\d+)d$/);
  if (match) return parseInt(match[1], 10);
  const num = parseInt(value, 10);
  return isNaN(num) ? 7 : num;
}

function parseLimitFlag(
  value: string | undefined,
  defaultVal: number = 20
): number {
  if (!value) return defaultVal;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultVal : num;
}

// --- Table Drawing ---

function drawTable(
  headers: string[],
  rows: string[][],
  colWidths: number[]
): string {
  const lines: string[] = [];

  // Top border
  lines.push(
    "\u250c" +
      colWidths.map((w) => "\u2500".repeat(w + 2)).join("\u252c") +
      "\u2510"
  );

  // Header row
  const headerCells = headers.map(
    (h, i) => ` ${cyan(h.padEnd(colWidths[i]))} `
  );
  lines.push("\u2502" + headerCells.join("\u2502") + "\u2502");

  // Header separator
  lines.push(
    "\u251c" +
      colWidths.map((w) => "\u2500".repeat(w + 2)).join("\u253c") +
      "\u2524"
  );

  // Data rows
  for (const row of rows) {
    const cells = row.map((cell, i) => {
      const padded = truncate(cell, colWidths[i]).padEnd(colWidths[i]);
      return ` ${padded} `;
    });
    lines.push("\u2502" + cells.join("\u2502") + "\u2502");
  }

  // Bottom border
  lines.push(
    "\u2514" +
      colWidths.map((w) => "\u2500".repeat(w + 2)).join("\u2534") +
      "\u2518"
  );

  return lines.join("\n");
}

// --- Guard: ensure db-reader is available ---

function requireDbReader(): NonNullable<typeof dbReader> {
  if (!dbReader) {
    console.error(red("Error: db-reader module not available."));
    console.error(
      dim(
        "Run `bun db-init.ts` first to initialize the database."
      )
    );
    process.exit(1);
  }
  return dbReader;
}

// --- Subcommands ---

function cmdSearch(query: string, limit: number): void {
  const db = requireDbReader();
  if (!query) {
    console.error(
      red('Usage: bun memory.ts search "query string" [--limit N]')
    );
    process.exit(1);
  }

  console.log(bold(cyan(`\n  Search Results for: "${query}"\n`)));

  try {
    const results = db.searchEntries(query, limit);

    if (!results || results.length === 0) {
      console.log(yellow("  No results found.\n"));
      return;
    }

    const rows = results.map((r) => [
      r.rank != null ? r.rank.toFixed(2) : "0.00",
      yellow(formatTimestamp(r.timestamp)),
      dim(truncateId(r.session_id)),
      r.tool_name || "",
      truncate(r.matched_text || "", 50),
    ]);

    console.log(
      drawTable(
        ["Rank", "Timestamp", "Session", "Tool", "Matched Text"],
        rows,
        [6, 19, 8, 12, 50]
      )
    );

    console.log(
      dim(`\n  ${results.length} result(s) shown (limit: ${limit})\n`)
    );
  } catch (e: any) {
    console.error(red(`  Search error: ${e.message}`));
    process.exit(1);
  }
}

function cmdContext(topicName: string, limit: number): void {
  const db = requireDbReader();
  if (!topicName) {
    console.error(
      red(
        'Usage: bun memory.ts context "project/topic name" [--limit N]'
      )
    );
    process.exit(1);
  }

  console.log(
    bold(cyan(`\n  Context for topic: "${topicName}"\n`))
  );

  try {
    const entries = db.getTopicEntries(topicName, limit);

    if (!entries || entries.length === 0) {
      console.log(yellow("  No entries found for this topic.\n"));
      return;
    }

    // Group entries by session
    const bySession = new Map<string, EntryRow[]>();
    for (const entry of entries) {
      const list = bySession.get(entry.session_id) || [];
      list.push(entry);
      bySession.set(entry.session_id, list);
    }

    for (const [sessionId, sessionEntries] of bySession) {
      console.log(bold(`  Session: ${dim(truncateId(sessionId))}`));
      console.log(dim("  " + "\u2500".repeat(60)));

      for (const entry of sessionEntries) {
        const ts = yellow(formatTimestamp(entry.timestamp));
        const tool = entry.tool_name || "unknown";
        console.log(`    ${ts}  ${bold(tool)}`);

        if (entry.tool_input_summary) {
          console.log(
            `      ${dim("Input:")}  ${truncate(entry.tool_input_summary, 70)}`
          );
        }
        if (entry.tool_output_summary) {
          console.log(
            `      ${dim("Output:")} ${truncate(entry.tool_output_summary, 70)}`
          );
        }
        if (entry.reasoning_chain) {
          console.log(
            `      ${dim("Reasoning:")} ${truncate(entry.reasoning_chain, 65)}`
          );
        }

        // Show decisions if any
        try {
          const decisions = JSON.parse(entry.decisions_json || "[]");
          if (decisions.length > 0) {
            for (const d of decisions) {
              console.log(
                `      ${green("Decision:")} ${truncate(typeof d === "string" ? d : d.text || "", 65)}`
              );
            }
          }
        } catch {
          /* ignore parse errors */
        }

        console.log("");
      }
    }

    console.log(
      dim(
        `  ${entries.length} entries across ${bySession.size} session(s)\n`
      )
    );
  } catch (e: any) {
    console.error(red(`  Context error: ${e.message}`));
    process.exit(1);
  }
}

function cmdDecisions(days: number, limit: number): void {
  const db = requireDbReader();

  console.log(
    bold(cyan(`\n  Recent Decisions (last ${days} days)\n`))
  );

  try {
    const decisions = db.getRecentDecisions(days, limit);

    if (!decisions || decisions.length === 0) {
      console.log(yellow("  No decisions found.\n"));
      return;
    }

    for (const d of decisions) {
      const ts = yellow(formatTimestamp(d.timestamp));
      const confidence =
        d.confidence === "high"
          ? green(d.confidence)
          : d.confidence === "low"
            ? red(d.confidence)
            : yellow(d.confidence || "medium");

      console.log(
        `  ${ts}  [${confidence}]  ${dim(truncateId(d.session_id))}`
      );
      console.log(`    ${bold(truncate(d.decision_text, 76))}`);
      if (d.reasoning_context) {
        console.log(`    ${dim(truncate(d.reasoning_context, 76))}`);
      }
      console.log("");
    }

    console.log(dim(`  ${decisions.length} decision(s) shown\n`));
  } catch (e: any) {
    console.error(red(`  Decisions error: ${e.message}`));
    process.exit(1);
  }
}

function cmdSessionList(limit: number): void {
  const db = requireDbReader();

  console.log(bold(cyan("\n  Recent Sessions\n")));

  try {
    const sessions = db.getSessionList(limit);

    if (!sessions || sessions.length === 0) {
      console.log(yellow("  No sessions found.\n"));
      return;
    }

    const rows = sessions.map((s) => {
      // Parse topics for display
      let topTopics = "";
      try {
        const topics = JSON.parse(s.topics_json || "[]");
        const topicNames = (topics as any[]).map((t) =>
          typeof t === "string" ? t : t.name || ""
        );
        topTopics = topicNames.slice(0, 3).join(", ");
      } catch {
        /* ignore */
      }

      return [
        dim(truncateId(s.id)),
        yellow(formatTimestamp(s.started_at)),
        formatDuration(s.duration_seconds),
        String(s.entry_count || 0),
        truncate(topTopics, 30),
      ];
    });

    console.log(
      drawTable(
        ["Session", "Started", "Duration", "Entries", "Top Topics"],
        rows,
        [8, 19, 10, 7, 30]
      )
    );

    console.log(dim(`\n  ${sessions.length} session(s) shown\n`));
  } catch (e: any) {
    console.error(red(`  Session list error: ${e.message}`));
    process.exit(1);
  }
}

function cmdSessionSummary(sessionId: string): void {
  const db = requireDbReader();

  if (!sessionId) {
    console.error(
      red("Usage: bun memory.ts session summary <session-id>")
    );
    process.exit(1);
  }

  try {
    const session = db.getSessionById(sessionId);

    if (!session) {
      console.error(red(`  Session not found: ${sessionId}`));
      console.error(
        dim(
          '  Try "bun memory.ts session list" to see available sessions.'
        )
      );
      process.exit(1);
    }

    console.log(
      bold(
        cyan(
          `\n  Session Summary: ${truncateId(session.id, 12)}\n`
        )
      )
    );
    console.log(dim("  " + "\u2500".repeat(60)));

    console.log(`  ${bold("ID:")}        ${session.id}`);
    console.log(
      `  ${bold("Started:")}   ${yellow(formatTimestamp(session.started_at))}`
    );
    console.log(
      `  ${bold("Ended:")}     ${session.ended_at ? yellow(formatTimestamp(session.ended_at)) : dim("in progress")}`
    );
    console.log(
      `  ${bold("Duration:")}  ${formatDuration(session.duration_seconds)}`
    );
    console.log(`  ${bold("Entries:")}   ${session.entry_count}`);
    console.log("");

    // Topics
    try {
      const topics = JSON.parse(session.topics_json || "[]");
      if (topics.length > 0) {
        console.log(`  ${bold(cyan("Topics:"))}`);
        for (const t of topics) {
          const name =
            typeof t === "string" ? t : t.name || "";
          const freq =
            typeof t === "object" && t.frequency
              ? ` (${t.frequency}x)`
              : "";
          console.log(`    ${green("*")} ${name}${dim(freq)}`);
        }
        console.log("");
      }
    } catch {
      /* ignore */
    }

    // Decisions
    try {
      const decisions = JSON.parse(
        session.decisions_json || "[]"
      );
      if (decisions.length > 0) {
        console.log(`  ${bold(cyan("Decisions:"))}`);
        for (const d of decisions) {
          const text =
            typeof d === "string" ? d : d.text || "";
          const conf =
            typeof d === "object" && d.confidence
              ? ` [${d.confidence}]`
              : "";
          const reason =
            typeof d === "object" && d.reasoning
              ? `\n      ${dim(truncate(d.reasoning, 70))}`
              : "";
          console.log(
            `    ${yellow(">")} ${text}${dim(conf)}${reason}`
          );
        }
        console.log("");
      }
    } catch {
      /* ignore */
    }

    // Action items
    try {
      const items = JSON.parse(
        session.action_items_json || "[]"
      );
      if (items.length > 0) {
        console.log(`  ${bold(cyan("Action Items:"))}`);
        for (const item of items) {
          const text =
            typeof item === "string"
              ? item
              : item.text || "";
          const status =
            typeof item === "object" && item.status
              ? item.status === "completed"
                ? green("[done]")
                : item.status === "deferred"
                  ? yellow("[deferred]")
                  : red("[open]")
              : "";
          console.log(`    ${status} ${text}`);
        }
        console.log("");
      }
    } catch {
      /* ignore */
    }

    // Unresolved questions
    try {
      const questions = JSON.parse(
        session.unresolved_json || "[]"
      );
      if (questions.length > 0) {
        console.log(
          `  ${bold(cyan("Unresolved Questions:"))}`
        );
        for (const q of questions) {
          console.log(
            `    ${red("?")} ${typeof q === "string" ? q : q.text || ""}`
          );
        }
        console.log("");
      }
    } catch {
      /* ignore */
    }

    // Summary text
    if (session.summary) {
      console.log(`  ${bold(cyan("Summary:"))}`);
      console.log(`    ${session.summary}`);
      console.log("");
    }

    // Show files touched from session entries
    try {
      const entries = db.getSessionEntries(session.id);
      if (entries && entries.length > 0) {
        const filesSet = new Set<string>();
        for (const e of entries) {
          const pathMatches = (
            e.tool_input_summary || ""
          ).match(/(?:\/[\w\-./]+\.\w+)/g);
          if (pathMatches) {
            for (const p of pathMatches) filesSet.add(p);
          }
        }

        if (filesSet.size > 0) {
          console.log(`  ${bold(cyan("Files Touched:"))}`);
          for (const f of Array.from(filesSet).slice(0, 20)) {
            console.log(`    ${dim(f)}`);
          }
          console.log("");
        }
      }
    } catch {
      /* ignore */
    }
  } catch (e: any) {
    console.error(red(`  Session summary error: ${e.message}`));
    process.exit(1);
  }
}

function cmdStats(): void {
  const db = requireDbReader();

  console.log(bold(cyan("\n  Working Memory Statistics\n")));
  console.log(dim("  " + "\u2500".repeat(40)));

  try {
    const stats = db.getStats();

    console.log(
      `  ${bold("Total Entries:")}    ${green(String(stats.totalEntries))}`
    );
    console.log(
      `  ${bold("Total Sessions:")}   ${green(String(stats.totalSessions))}`
    );
    console.log(
      `  ${bold("Total Topics:")}     ${green(String(stats.totalTopics))}`
    );
    console.log(
      `  ${bold("Total Decisions:")}  ${green(String(stats.totalDecisions))}`
    );
    console.log(
      `  ${bold("Database Size:")}    ${formatBytes(stats.dbSizeBytes)}`
    );

    // Calculate JSONL folder size
    try {
      const paiDir =
        process.env.PAI_DIR || `${process.env.HOME}/.claude`;
      const captureDir = `${paiDir}/MEMORY/CAPTURE`;
      const { readdirSync, statSync } = require("fs");
      const { join } = require("path");
      let totalJsonlBytes = 0;
      let fileCount = 0;

      function scanDir(dir: string): void {
        try {
          const entries = readdirSync(dir, {
            withFileTypes: true,
          });
          for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (
              entry.isFile() &&
              entry.name.endsWith(".jsonl")
            ) {
              try {
                const st = statSync(fullPath);
                totalJsonlBytes += st.size;
                fileCount++;
              } catch {
                /* skip unreadable files */
              }
            } else if (
              entry.isDirectory() &&
              /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
            ) {
              scanDir(fullPath);
            }
          }
        } catch {
          /* dir unreadable */
        }
      }

      scanDir(captureDir);
      console.log(
        `  ${bold("JSONL Files:")}     ${fileCount} file(s), ${formatBytes(totalJsonlBytes)}`
      );
    } catch {
      /* ignore fs errors */
    }

    console.log("");
  } catch (e: any) {
    console.error(red(`  Stats error: ${e.message}`));
    process.exit(1);
  }
}

function cmdHelp(): void {
  console.log(`
${bold(cyan("  Working Memory System - Query CLI"))}
${dim("  " + "\u2500".repeat(49))}

  ${bold("USAGE:")}
    bun memory.ts ${green("<command>")} [args] [--flags]

  ${bold("COMMANDS:")}

    ${green("search")} ${dim('"query string"')} ${dim("[--limit N]")}
        Full-text search across all captured sessions.
        Default limit: 20

    ${green("context")} ${dim('"project/topic"')} ${dim("[--limit N]")}
        Get all entries related to a project or topic,
        grouped by session with associated decisions.

    ${green("decisions")} ${dim("[--last 7d|30d|90d]")} ${dim("[--limit N]")}
        Show recent decisions with reasoning and confidence.
        Default: last 7 days

    ${green("session list")} ${dim("[--limit N]")}
        List recent sessions with dates, durations, and topics.
        Default limit: 20

    ${green("session summary")} ${dim("<session-id>")}
        Full session detail: topics, decisions, action items,
        unresolved questions, and files touched.

    ${green("stats")}
        Storage and usage statistics for the memory system.

    ${green("help")}
        Show this help message.

  ${bold("EXAMPLES:")}

    ${dim("$")} bun memory.ts search "database migration" --limit 5
    ${dim("$")} bun memory.ts context "PAI"
    ${dim("$")} bun memory.ts decisions --last 30d
    ${dim("$")} bun memory.ts session list --limit 10
    ${dim("$")} bun memory.ts session summary a1b2c3d4
    ${dim("$")} bun memory.ts stats

`);
}

// --- Main Dispatch ---

function main(): void {
  const { command, args, flags } = parseArgs(process.argv);
  const limit = parseLimitFlag(flags.limit);

  switch (command) {
    case "search":
      cmdSearch(args[0] || "", limit);
      break;

    case "context":
      cmdContext(args[0] || "", limit);
      break;

    case "decisions":
      cmdDecisions(parseDaysFlag(flags.last), limit);
      break;

    case "session":
      if (args[0] === "list") {
        cmdSessionList(limit);
      } else if (args[0] === "summary" && args[1]) {
        cmdSessionSummary(args[1]);
      } else if (
        args[0] &&
        args[0] !== "list" &&
        args[0] !== "summary"
      ) {
        // Treat bare session arg as summary shortcut
        cmdSessionSummary(args[0]);
      } else {
        console.error(
          red(
            "Usage: bun memory.ts session list [--limit N]"
          )
        );
        console.error(
          red(
            "       bun memory.ts session summary <session-id>"
          )
        );
        process.exit(1);
      }
      break;

    case "stats":
      cmdStats();
      break;

    case "help":
    case "--help":
    case "-h":
      cmdHelp();
      break;

    default:
      console.error(red(`Unknown command: ${command}`));
      cmdHelp();
      process.exit(1);
  }
}

main();
