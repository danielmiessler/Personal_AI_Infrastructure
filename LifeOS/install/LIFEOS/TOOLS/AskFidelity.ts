#!/usr/bin/env bun
/**
 * AskFidelity — the emitter for Algorithm doctrine claim 10.
 *
 * Claim 10 says every explicit ask in the principal's verbatim message was met,
 * skipped with a stated reason, or surfaced, and that one line lands in
 * MEMORY/OBSERVABILITY/ask-fidelity.jsonl — "any ✗ blocks complete".
 *
 * Until 2026-07-24 there was no writer on disk. Rows were hand-authored freehand,
 * so the 2026-07-24 audit found 54/108 in-window rows with `all_met` AND `slug`
 * null, two incompatible schemas (`session_id`+`verdict` vs `session`+`all_met`),
 * and exactly ONE `false` in 122 rows ever. A gate that cannot record a ✗ has no
 * teeth. This tool is that missing instrument.
 *
 * Design rules, each answering a specific way the freehand rows failed:
 *   - `all_met` is DERIVED from the asks, never accepted as input. No row can
 *     claim a pass its own asks contradict.
 *   - A row with zero parseable asks is an ERROR, not an empty pass.
 *   - `slug` and `session` are required. Null-keyed rows can't be joined to a
 *     run, which is what made half the corpus unusable.
 *   - Exit code 1 when any ask is unmet, so the caller's gate can actually block.
 *
 * Status vocabulary (closed set, matching what the consumers already parse):
 *   met      — the ask was satisfied
 *   skipped  — deliberately not done; REQUIRES a reason after a colon or dash
 *   surfaced — raised to the principal, awaiting his call; also requires a reason
 *   unmet    — not done and not accounted for → blocks
 *
 * Consumers (do not break these):
 *   - skills/Evals/Tools/ProposeFromFailures.ts — reads asks[].ask, asks[].status,
 *     deferred[].item, deferred[].reason, session, ts
 *   - skills/_LIFEOS/Workflows/AlgorithmAudit.md — reads all_met, slug
 *
 * Usage:
 *   bun AskFidelity.ts --slug 20260724-foo --session <uuid> \
 *     --ask "build the thing:met" \
 *     --ask "ship it:skipped — principal deferred to next release" \
 *     [--deferred "docs sync:waiting on release cut"] [--dry-run]
 *
 *   bun AskFidelity.ts --check   # report corpus health, write nothing
 *
 * @version 1.0.0
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const LIFEOS_DIR = process.env.LIFEOS_DIR || join(homedir(), ".claude", "LIFEOS");
const LOG_PATH = join(LIFEOS_DIR, "MEMORY", "OBSERVABILITY", "ask-fidelity.jsonl");

const BLOCKING = "unmet";
const STATUSES = ["met", "skipped", "surfaced", BLOCKING] as const;
type Status = (typeof STATUSES)[number];

interface Ask {
  ask: string;
  status: string; // "met" | "skipped — <reason>" | "surfaced — <reason>" | "unmet"
}

interface Row {
  ts: string;
  slug: string;
  session: string;
  asks: Ask[];
  deferred?: { item: string; reason: string }[];
  all_met: boolean;
  unmet: number;
  emitter: string;
}

/** Split "ask text:status — reason" on the LAST colon so ask text may contain colons. */
function parseAsk(raw: string): Ask {
  const idx = raw.lastIndexOf(":");
  if (idx === -1) {
    throw new Error(`--ask "${raw}" has no ":<status>" — expected one of ${STATUSES.join(", ")}`);
  }
  const ask = raw.slice(0, idx).trim();
  const status = raw.slice(idx + 1).trim();
  if (!ask) throw new Error(`--ask "${raw}" has empty ask text`);
  if (!status) throw new Error(`--ask "${raw}" has empty status`);

  const head = status.split(/[\s:—-]/)[0].toLowerCase();
  if (!STATUSES.includes(head as Status)) {
    throw new Error(`--ask "${raw}": status must start with one of ${STATUSES.join(", ")} (got "${head}")`);
  }
  // skipped/surfaced are only honest with a reason attached — claim 10 says
  // "skipped with a stated reason", so an unexplained skip is an unmet ask.
  if ((head === "skipped" || head === "surfaced") && status.length <= head.length + 2) {
    throw new Error(`--ask "${raw}": "${head}" requires a stated reason (e.g. "${head} — principal deferred it")`);
  }
  return { ask, status };
}

function isMet(status: string): boolean {
  const head = status.split(/[\s:—-]/)[0].toLowerCase();
  return head === "met" || head === "skipped" || head === "surfaced";
}

function parseDeferred(raw: string): { item: string; reason: string } {
  const idx = raw.indexOf(":");
  if (idx === -1) throw new Error(`--deferred "${raw}" must be "<item>:<reason>"`);
  const item = raw.slice(0, idx).trim();
  const reason = raw.slice(idx + 1).trim();
  if (!item || !reason) throw new Error(`--deferred "${raw}" must be "<item>:<reason>"`);
  return { item, reason };
}

/** Corpus health — how many rows can actually answer the question they exist to answer. */
function check(): number {
  if (!existsSync(LOG_PATH)) {
    console.log("ask-fidelity.jsonl: absent (no rows yet)");
    return 0;
  }
  const lines = readFileSync(LOG_PATH, "utf8").split("\n").filter(Boolean);
  let usable = 0, nullMet = 0, noKey = 0, unparseable = 0, blocking = 0;
  for (const line of lines) {
    let r: Record<string, unknown>;
    try { r = JSON.parse(line); } catch { unparseable++; continue; }
    if (r.all_met === null || r.all_met === undefined) nullMet++;
    else usable++;
    if (r.all_met === false) blocking++;
    if (!r.slug && !r.session && !r.session_id) noKey++;
  }
  const pct = lines.length ? Math.round((usable / lines.length) * 100) : 0;
  console.log(`ask-fidelity.jsonl: ${lines.length} rows`);
  console.log(`  usable (all_met set): ${usable} (${pct}%)`);
  console.log(`  all_met null:         ${nullMet}`);
  console.log(`  unkeyed (no slug/session): ${noKey}`);
  console.log(`  blocking verdicts (all_met=false): ${blocking}`);
  console.log(`  unparseable: ${unparseable}`);
  return 0;
}

function main(): number {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      slug: { type: "string" },
      session: { type: "string" },
      ask: { type: "string", multiple: true },
      deferred: { type: "string", multiple: true },
      "dry-run": { type: "boolean" },
      check: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(readFileSync(new URL(import.meta.url).pathname, "utf8").split("*/")[0]);
    return 0;
  }
  if (values.check) return check();

  const errors: string[] = [];
  if (!values.slug) errors.push("--slug is required (a null-keyed row cannot be joined to a run)");
  if (!values.session) errors.push("--session is required (session id or run slug)");
  if (!values.ask?.length) errors.push("--ask is required at least once (a row with no asks is not a pass)");
  if (errors.length) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    return 2;
  }

  let asks: Ask[];
  let deferred: { item: string; reason: string }[] | undefined;
  try {
    asks = values.ask!.map(parseAsk);
    deferred = values.deferred?.length ? values.deferred.map(parseDeferred) : undefined;
  } catch (e) {
    console.error(`ERROR: ${(e as Error).message}`);
    return 2;
  }

  const unmet = asks.filter((a) => !isMet(a.status));
  const row: Row = {
    ts: new Date().toISOString(),
    slug: values.slug!,
    session: values.session!,
    asks,
    ...(deferred ? { deferred } : {}),
    all_met: unmet.length === 0, // derived, never supplied
    unmet: unmet.length,
    emitter: "AskFidelity.ts@1.0.0",
  };

  if (values["dry-run"]) {
    console.log(JSON.stringify(row));
  } else {
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify(row) + "\n");
  }

  if (unmet.length) {
    console.error(`✗ ask-fidelity: ${unmet.length} unmet ask(s) — claim 10 blocks complete:`);
    for (const a of unmet) console.error(`    • ${a.ask} [${a.status}]`);
    return 1;
  }
  console.log(`✓ ask-fidelity: ${asks.length}/${asks.length} asks accounted for (${values.slug})`);
  return 0;
}

if (import.meta.main) process.exit(main());
