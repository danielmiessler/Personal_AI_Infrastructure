#!/usr/bin/env bun
/**
 * @version 1.0.1
 * SystemChangeSurface.hook.ts — makes self-modification VISIBLE in the response.
 *
 * TRIGGER: PostToolUse (Write, Edit, MultiEdit) — composed inside
 * PostToolObserver, so this adds no extra process per tool call.
 *
 * WHY PostToolUse and not UserPromptSubmit (principal, 2026-07-27: "any time
 * that we modify the system, I want the response format to include a
 * maintenance-looking system message"): the line has to describe THIS turn's
 * writes, and it has to be in context before the model composes its final
 * message. UserPromptSubmit — where MemoryDeltaSurface lives — fires before the
 * turn's work happens, so a line built there is always one turn late. That lag
 * is exactly why the principal had never seen an ISA-updated readout. Stop is
 * worse: it fires after the message is on screen and its only enforcement is a
 * full re-emit, which prints the response twice (see FormatGate's header for
 * why that is forbidden).
 *
 * MECHANISM: every matching write appends to a per-SESSION ledger; each fire
 * re-emits the ACCUMULATED line, so whatever landed last before the model
 * composes is complete. `clearLedger()` is called at turn start from
 * MemoryTurnStart (the one UserPromptSubmit composer), which needs no new
 * settings.json registration — the memory surface's own history shows a fresh
 * registration is the fragile part (clobbered by a concurrent whole-file write,
 * dead for five days, invisible because change-only silence looks healthy).
 *
 * REJECTED, and why it matters: v0 used the mtime of the memory system's global
 * `delta-surface-heartbeat` as the turn boundary. That file is shared — so a
 * CONCURRENT session's prompt (or, as caught in testing, simply running the
 * hook test suite) advanced it and silently wiped this session's ledger
 * mid-turn. A turn boundary must be per-session or it is not a turn boundary.
 *
 * CONTRACT: the string is computed HERE and echoed verbatim, identical to the
 * 🧠 MEMORY line. A model-computed status line failed compliance repeatedly in
 * the 2026-05-28 experiment; never go back.
 *
 * Failure mode: any error → return null. A maintenance readout must never be
 * why a tool call breaks. Subagents are skipped — the line is for the
 * principal's primary session, and a fleet of delegates would spam it.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve as pathResolve, dirname } from "node:path";
import { homedir } from "node:os";
/** The line is for the principal's primary session. Subagents write plenty of
 *  system files (a delegate editing a skill, a fork editing an ISA) and would
 *  each emit their own line into their own context, which helps nobody. */
import { isSubagentContext as isSubagent } from './lib/subagent';
import {
  classifySurface,
  countClaims,
  renderSystemLine,
  type ChangeEntry,
} from "./lib/system-surfaces";

const CLAUDE_ROOT = pathResolve(process.env.HOME ?? homedir(), ".claude");
const LEDGER_DIR = pathResolve(CLAUDE_ROOT, "LIFEOS/MEMORY/STATE");

interface LedgerEntry extends ChangeEntry {
  at: number;
  /** ISA only: claim counts the first time we saw this file this turn. */
  firstClosed?: number;
}

interface Ledger {
  entries: LedgerEntry[];
}

export interface HookInput {
  session_id?: string;
  tool_name?: string;
  tool_input?: { file_path?: string };
}

const WRITE_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);

const ledgerPath = (sessionId: string): string =>
  pathResolve(LEDGER_DIR, `system-delta-${sessionId.replace(/[^\w-]/g, "")}.json`);

function readLedger(path: string): Ledger {
  try {
    if (!existsSync(path)) return { entries: [] };
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Ledger;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

/**
 * Drop this session's ledger. Called at turn start (MemoryTurnStart) so the
 * line describes THIS turn and nothing before it. Per-session by construction:
 * a concurrent session clearing its own ledger must never touch this one.
 */
export function clearLedger(sessionId: string): void {
  try {
    const path = ledgerPath(sessionId || "default");
    if (existsSync(path)) writeFileSync(path, JSON.stringify({ entries: [] }));
  } catch {
    /* non-fatal */
  }
}

function writeLedger(path: string, ledger: Ledger): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(ledger));
  } catch {
    /* non-fatal: the line degrades, the tool call does not */
  }
}

export function run(input: HookInput): string | null {
  try {
    if (isSubagent()) return null;
    const tool = input.tool_name ?? "";
    if (!WRITE_TOOLS.has(tool)) return null;
    const filePath = input.tool_input?.file_path;
    if (!filePath) return null;

    const surface = classifySurface(filePath, CLAUDE_ROOT);
    if (!surface) return null;

    const sessionId = input.session_id ?? "default";
    const path = ledgerPath(sessionId);
    const ledger = readLedger(path);

    const entry: LedgerEntry = { tier: surface.tier, label: surface.label, at: Date.now() };

    // ISA: show a real claim delta across the turn, which is the readout the
    // principal actually asked for ("I'd like to see ISA updated").
    if (surface.tier === "isa") {
      let closed: number | undefined;
      try {
        closed = countClaims(readFileSync(filePath, "utf8")).closed;
      } catch {
        closed = undefined;
      }
      const prior = ledger.entries.find((e) => e.tier === "isa" && e.label === surface.label);
      const first = prior?.firstClosed ?? closed;
      entry.firstClosed = first;
      if (typeof closed === "number") {
        entry.detail = typeof first === "number" && first !== closed ? `${first}→${closed}` : `${closed} closed`;
      }
    }

    ledger.entries.push(entry);
    writeLedger(path, ledger);

    return renderSystemLine(ledger.entries);
  } catch {
    return null;
  }
}

// Standalone execution (manual probe): read stdin, print the line.
if (import.meta.main) {
  const chunks: Buffer[] = [];
  process.stdin.on("data", (c) => chunks.push(Buffer.from(c)));
  process.stdin.on("end", () => {
    try {
      const line = run(JSON.parse(Buffer.concat(chunks).toString() || "{}") as HookInput);
      if (line) console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: line } }));
    } catch {
      /* silent */
    }
    process.exit(0);
  });
}
