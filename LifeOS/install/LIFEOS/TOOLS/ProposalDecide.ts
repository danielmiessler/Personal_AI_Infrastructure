#!/usr/bin/env bun
/**
 * ProposalDecide — the shipped exit path for human-gated memory proposals.
 *
 * The memory reviewer auto-applies rows at or above the confidence threshold.
 * Everything below it enqueues to pending-proposals.jsonl and waits — and until
 * now waited forever, because no surface could resolve a row. The queue only
 * grew, every surface re-showed the same rows, and the honest states a human
 * needed (this landed somewhere else; use this wording instead) had nowhere to
 * be written (public issues #1804, #1805, @catchingknives).
 *
 * This CLI is a thin driver over the decision writers in
 * `LIFEOS/PULSE/lib/memory-proposals.ts`. The transitions, the target pinning,
 * and the observability logging all live there, so a Pulse or Hermes surface can
 * offer the same four decisions without reimplementing any of it.
 *
 * A row is addressed by its list index (1-based, as printed) or by its id.
 * Indices are positions in the CURRENT pending list — they shift as rows resolve,
 * so re-list between decisions when scripting a batch.
 *
 * Usage:
 *   bun ProposalDecide.ts                              # list pending rows with indices
 *   bun ProposalDecide.ts --json                       # same, machine-readable
 *   bun ProposalDecide.ts --accept 2                   # apply the row's own text to its target
 *   bun ProposalDecide.ts --reject 2                   # close it, write nothing
 *   bun ProposalDecide.ts --edit 2 "better wording"    # apply alternate text instead
 *   bun ProposalDecide.ts --applied-elsewhere 2 --note "landed in skills/_COFFEE/SKILL.md"
 *
 * Exit codes: 0 decision made or list printed, 1 bad usage or refused decision.
 */
import {
  acceptProposal,
  editProposal,
  markProposalAppliedElsewhere,
  pendingProposals,
  rejectProposal,
  type DecisionResult,
  type ProposalRow,
} from "../PULSE/lib/memory-proposals";

const HOME = process.env.HOME ?? "";

function shortFile(row: ProposalRow): string {
  return row.target_file.replace(`${HOME}/.claude/`, "").replace(/^.*\/LIFEOS\//, "LIFEOS/");
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= n ? flat : `${flat.slice(0, n - 1)}…`;
}

/** Resolve an index (1-based, as listed) or a raw id to a queue row. */
function rowFor(selector: string, rows: ProposalRow[]): ProposalRow | null {
  if (/^\d+$/.test(selector)) return rows[Number(selector) - 1] ?? null;
  return rows.find((r) => r.id === selector) ?? null;
}

function list(rows: ProposalRow[]): void {
  if (rows.length === 0) {
    console.log("No pending proposals.");
    return;
  }
  console.log(`${rows.length} pending proposal${rows.length === 1 ? "" : "s"}:\n`);
  rows.forEach((r, i) => {
    const kind = r.target_kind ?? "?";
    console.log(`${String(i + 1).padStart(3)}. [${kind}] → ${shortFile(r)}  (${r.confidence.toFixed(2)}, ${r.status}, id ${r.id})`);
    console.log(`     ${truncate(r.edit, 160)}`);
    if (r.rationale) console.log(`     why: ${truncate(r.rationale, 120)}`);
    console.log("");
  });
  console.log('Decide with: --accept N | --reject N | --edit N "text" | --applied-elsewhere N --note "where"');
}

function report(action: string, selector: string, result: DecisionResult): number {
  if (!result.ok) {
    console.error(`✗ ${action} ${selector}: ${result.reason}`);
    return 1;
  }
  const row = result.row!;
  console.log(`✓ ${row.id} → ${row.status}`);
  if (row.status === "accepted" || row.status === "edited") {
    console.log(`  applied to ${shortFile(row)}`);
  }
  if (row.resolution_note) console.log(`  note: ${row.resolution_note}`);
  return 0;
}

function main(): number {
  const argv = process.argv.slice(2);
  const flagAt = (name: string) => argv.indexOf(name);
  const valueAfter = (i: number) => (i >= 0 ? argv[i + 1] : undefined);

  const rows = pendingProposals();

  const noteIdx = flagAt("--note");
  const note = valueAfter(noteIdx) ?? "";

  const actions: Array<[string, (row: ProposalRow) => DecisionResult]> = [
    ["--accept", (row) => acceptProposal(row.id)],
    ["--reject", (row) => rejectProposal(row.id)],
    // `--edit N "text"` — the text is the argument after the selector.
    ["--edit", (row) => editProposal(row.id, argv[flagAt("--edit") + 2] ?? "")],
    ["--applied-elsewhere", (row) => markProposalAppliedElsewhere(row.id, note)],
  ];

  for (const [flag, run] of actions) {
    const idx = flagAt(flag);
    if (idx < 0) continue;
    const selector = valueAfter(idx);
    if (!selector) {
      console.error(`✗ ${flag} needs an index or id (run with no args to list).`);
      return 1;
    }
    const row = rowFor(selector, rows);
    if (!row) {
      console.error(`✗ no pending proposal at "${selector}" (run with no args to list).`);
      return 1;
    }
    if (flag === "--applied-elsewhere" && !note) {
      console.error('✗ --applied-elsewhere needs --note "where it landed".');
      return 1;
    }
    return report(flag, selector, run(row));
  }

  if (argv.includes("--json")) {
    console.log(JSON.stringify({ pending: rows.length, rows }, null, 2));
    return 0;
  }

  list(rows);
  return 0;
}

process.exit(main());
