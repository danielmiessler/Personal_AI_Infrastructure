/**
 * memory-proposals — pure helpers for the Tier-C proposal queue.
 *
 * Queue I/O, lifecycle marking, observability logging, and edit application
 * for memory-system proposals. The MemoryReviewer writes and auto-applies
 * high-confidence rows; pending rows surface via the Pulse dashboard and the
 * inline 🧠 MEMORY line. (Formerly telegram-proposals — the Telegram
 * surfacing channel was removed 2026-07-15.)
 *
 * Decision path: the four `*Proposal` writers below are the shipped exit for a
 * human-gated row — accept, reject, edit, or applied-elsewhere. `TERMINAL_STATUSES`
 * is the single authority on which statuses are resolved; every consumer that
 * counts or filters the queue imports it instead of hand-rolling a list (a
 * hand-rolled list is how rejected/accepted rows stayed "pending" forever —
 * public issue #1610, @xmasyx). The deterministic CLI over these writers is
 * `LIFEOS/TOOLS/ProposalDecide.ts`; Pulse and Hermes surfaces are free to wrap
 * the same functions rather than reimplementing the transitions.
 * (public issues #1804, #1805, @catchingknives)
 */

import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import {
  PENDING_PROPOSALS_PATH,
  inferProposalKind,
  pinProposalTargetFile,
  type ProposalTargetKind,
} from "../../TOOLS/MemoryTypes";
import { assertInsideUserData } from "../../TOOLS/lib/ForeignDataCheck";

const HOME = process.env.HOME ?? homedir();
const OBS_DIR = join(HOME, ".claude", "LIFEOS", "MEMORY", "OBSERVABILITY");
const PROPOSAL_REPLIES_LOG_PATH = join(OBS_DIR, "proposal-replies.jsonl");
const IDENTITY_PROPOSALS_LOG_PATH = join(OBS_DIR, "identity-proposals.jsonl");

/**
 * Lifecycle states:
 *   pending           — fresh from MemorySystem.add, awaiting surface or auto-apply
 *   sent              — surfaced to the principal; awaiting reply
 *   accepted          — principal replied `yes`, edit applied
 *   rejected          — principal replied `no`
 *   edited            — principal replied `edit <text>`, alternate text applied
 *   auto-applied      — confidence ≥ threshold; reviewer applied without surfacing
 *   applied-elsewhere — the capture was correct but the content landed somewhere
 *                       other than target_file (a skill, an ISA, a hook). The row
 *                       is resolved; nothing is owed to target_file. Without this
 *                       state the only honest options were a false `accepted` or
 *                       a `rejected` that lies about a good capture
 *                       (public issue #1804, @catchingknives).
 */
export type ProposalStatus =
  | "pending"
  | "sent"
  | "accepted"
  | "rejected"
  | "edited"
  | "auto-applied"
  | "applied-elsewhere";

/**
 * The one authority on "this row is resolved". Consumers that count or filter
 * the queue import this instead of writing their own list — the hand-rolled
 * variants drifted apart and left resolved rows counted as pending
 * (public issue #1805, @catchingknives).
 *
 * `pending` and `sent` are deliberately absent: `sent` means surfaced and still
 * awaiting a decision. Any status not listed here (including a runtime value
 * this union hasn't caught up with) counts as open, which is the safe default —
 * an unknown row shows up for a human rather than disappearing.
 */
export const TERMINAL_STATUSES: readonly ProposalStatus[] = Object.freeze([
  "accepted",
  "rejected",
  "edited",
  "auto-applied",
  "applied-elsewhere",
]);

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export interface ProposalRow {
  id: string;
  ts: string;
  status: ProposalStatus;
  target_file: string;
  /**
   * P1 2026-05-25: proposal subtype discriminator. Tells the surfacer which
   * label to render and the auditor which curated-context file class this
   * proposal touches. Backwards-compatible — absent rows infer kind from
   * target_file via inferProposalKind().
   */
  target_kind?: ProposalTargetKind;
  edit: string;
  confidence: number;
  rationale: string;
  observed_across_sessions?: number;
  source_session?: string | null;
  surfaced_at?: string;
  resolved_at?: string;
  applied_edit?: string;
  /** Where the content actually landed, for `applied-elsewhere` rows. */
  resolution_note?: string;
}

export type ProposalReply =
  | { kind: "yes"; id: string }
  | { kind: "no"; id: string }
  | { kind: "edit"; id: string; editText: string }
  | { kind: "list" }
  | { kind: null };

export function loadProposalQueue(path: string = PENDING_PROPOSALS_PATH): ProposalRow[] {
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const rows: ProposalRow[] = [];
    for (const line of lines) {
      try {
        const row = JSON.parse(line) as Partial<ProposalRow>;
        if (row.id && row.target_file && row.edit && row.status) {
          rows.push(row as ProposalRow);
        }
      } catch {
        // skip malformed row
      }
    }
    return rows;
  } catch {
    return [];
  }
}

export function writeProposalQueue(rows: ProposalRow[], path: string = PENDING_PROPOSALS_PATH): void {
  const tmp = `${path}.tmp`;
  const body = rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length > 0 ? "\n" : "");
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, path);
}

export function markProposal(id: string, patch: Partial<ProposalRow>, path: string = PENDING_PROPOSALS_PATH): ProposalRow | null {
  const rows = loadProposalQueue(path);
  let matched: ProposalRow | null = null;
  for (const r of rows) {
    if (r.id === id) {
      Object.assign(r, patch);
      matched = r;
      break;
    }
  }
  if (matched) writeProposalQueue(rows, path);
  return matched;
}

export function logProposalEvent(event: Record<string, unknown>, path: string = IDENTITY_PROPOSALS_LOG_PATH): void {
  try {
    appendFileSync(path, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n", "utf8");
  } catch {
    // best-effort observability
  }
}

export function logProposalReply(event: Record<string, unknown>, path: string = PROPOSAL_REPLIES_LOG_PATH): void {
  try {
    appendFileSync(path, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n", "utf8");
  } catch {
    // best-effort observability
  }
}

export function formatProposalMessage(p: ProposalRow, home: string = HOME): string {
  const fileLabel = p.target_file.replace(`${home}/.claude/`, "");
  const conf = p.confidence.toFixed(2);
  const obs = p.observed_across_sessions ?? 1;
  // P1 2026-05-25: prepend subtype badge so the principal sees at a glance
  // which curated-context class is being touched. Falls back to inference
  // when the row predates target_kind.
  const kind: ProposalTargetKind = p.target_kind ?? inferProposalKind(p.target_file);
  return [
    `🆔 [${kind}] Propose adding to ${fileLabel}:`,
    `"${p.edit}"`,
    `— confidence ${conf}, observed across ${obs} session${obs === 1 ? "" : "s"}.`,
    `Reply: yes #${p.id} / no #${p.id} / edit #${p.id} <text>`,
  ].join("\n");
}

export function parseProposalReply(text: string): ProposalReply {
  const trimmed = text.trim();
  if (/^proposals?$/i.test(trimmed)) return { kind: "list" };
  // Separator is REQUIRED between keyword and id — a zero-length separator
  // made "no idea what happened" parse as {kind:"no", id:"idea"} and swallowed
  // ordinary messages ("Non ..." in Italian). (public issue #1844, @xmasyx)
  const m = trimmed.match(/^(yes|no|edit)(?:\s+#?|#)([\w-]+)(?:\s+(.+))?$/i);
  if (!m) {
    const m2 = trimmed.match(/^#([\w-]+)\s+(yes|no|edit)(?:\s+(.+))?$/i);
    if (!m2) return { kind: null };
    const kind = m2[2]!.toLowerCase() as "yes" | "no" | "edit";
    const id = m2[1]!;
    if (kind === "edit") return { kind, id, editText: (m2[3] ?? "").trim() };
    return { kind, id };
  }
  const kind = m[1]!.toLowerCase() as "yes" | "no" | "edit";
  const id = m[2]!;
  if (kind === "edit") return { kind, id, editText: (m[3] ?? "").trim() };
  return { kind, id };
}

/**
 * Stamp the target's frontmatter after a proposal lands in its body.
 *
 * Without this the header keeps claiming `provenance: template` and whatever
 * `last_updated` it shipped with, while the body carries principal-authored rules —
 * so freshness reads a mutated file as untouched, and ReleaseAudit's "only template
 * may ship" gate reads principal content as shippable.
 *
 * Lazy-required and swallowed on purpose: the rule reaching the file is the outcome
 * that matters, and a stamping failure must never cost the caller that write.
 * (public PR #1667, @elhoim)
 */
function stampTarget(absPath: string): void {
  try {
    const mod = require("../../TOOLS/TelosFreshness") as typeof import("../../TOOLS/TelosFreshness");
    mod.stampContextWrite(absPath, "memory-reviewer");
  } catch {
    // best-effort — see doc above
  }
}

export function applyProposalEdit(targetFile: string, editText: string): { ok: true } | { ok: false; reason: string } {
  // A proposal's targetFile is root-relative (e.g. "LIFEOS/USER/CONFIG/OPERATIONAL_RULES.md").
  // Resolve it against ~/.claude so it works regardless of the process CWD: the Pulse server runs
  // from LIFEOS/PULSE, so a bare relative path resolved to a nonexistent nested path and every
  // apply failed with "target file missing" even though the file was present (public PR #1507,
  // credit @anikinsasha).
  const resolved = isAbsolute(targetFile) ? targetFile : join(HOME, ".claude", targetFile);
  if (!existsSync(resolved)) return { ok: false, reason: `target file missing: ${targetFile}` };
  // Boundary (2026-08-11 incident class): a proposal edit is personal content —
  // its target must physically resolve into the USER_DATA repo. pinProposalTargetFile
  // already constrains the path lexically; this realpath check additionally
  // refuses when the LIFEOS/USER symlink is broken or replaced by a real dir,
  // which would land the edit inside the system tree.
  const boundary = assertInsideUserData(resolved);
  if (!boundary.ok) return { ok: false, reason: `proposal apply refused at the system/user boundary: ${boundary.reason}` };
  try {
    const current = readFileSync(resolved, "utf8");
    const sectionHeader = "## Memory-System Proposals";
    const ts = new Date().toISOString();
    const entry = `\n- ${editText} <!-- applied: ${ts} -->`;
    let next: string;
    if (current.includes(sectionHeader)) {
      next = current.replace(sectionHeader, `${sectionHeader}\n${entry.trim()}`);
    } else {
      next = current.trimEnd() + `\n\n${sectionHeader}\n\n${entry.trim()}\n`;
    }
    const tmp = `${resolved}.tmp`;
    writeFileSync(tmp, next, "utf8");
    renameSync(tmp, resolved);
    stampTarget(resolved);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error)?.message ?? String(e) };
  }
}

// ── Decisions ──
//
// The exit path for a human-gated row. Before these, a proposal below the
// auto-apply threshold had no shipped way to be resolved at all: the queue only
// grew, and every surface that read it re-showed the same rows (public issues
// #1804, #1805, @catchingknives). Each writer is one transition — apply-or-not,
// then mark, then log — so a CLI, Pulse, or Hermes can offer the decision
// without owning the state machine.

export interface DecisionResult {
  ok: boolean;
  row?: ProposalRow;
  reason?: string;
}

/** Fetch a row by id, refusing ids that are missing or already resolved. */
function openRow(id: string, path: string): { ok: true; row: ProposalRow } | { ok: false; reason: string } {
  const row = loadProposalQueue(path).find((r) => r.id === id);
  if (!row) return { ok: false, reason: `no proposal with id ${id}` };
  if (isTerminalStatus(row.status)) return { ok: false, reason: `proposal ${id} is already ${row.status}` };
  return { ok: true, row };
}

/**
 * Resolve the file a decision may write to. Pinned by kind the same way the
 * reviewer's auto-apply path pins it, so a decision can never land an edit on a
 * path the queue row didn't sanction (public PR #1563, @anikinsasha).
 */
function pinnedTargetFor(row: ProposalRow): string | null {
  return pinProposalTargetFile(row.target_kind ?? inferProposalKind(row.target_file), row.target_file);
}

function resolve(
  id: string,
  status: ProposalStatus,
  opts: { editText?: string; note?: string; path?: string },
): DecisionResult {
  const path = opts.path ?? PENDING_PROPOSALS_PATH;
  const found = openRow(id, path);
  if (!found.ok) return { ok: false, reason: found.reason };
  const row = found.row;

  const writes = status === "accepted" || status === "edited";
  const editText = opts.editText ?? row.edit;
  if (writes) {
    const target = pinnedTargetFor(row);
    if (target === null) {
      return { ok: false, reason: `target_file '${row.target_file}' is not an allowed target for its kind` };
    }
    const applied = applyProposalEdit(target, editText);
    if (!applied.ok) return { ok: false, reason: applied.reason };
  }

  const patch: Partial<ProposalRow> = { status, resolved_at: new Date().toISOString() };
  if (writes) patch.applied_edit = editText;
  if (opts.note) patch.resolution_note = opts.note;
  const marked = markProposal(id, patch, path);
  if (!marked) return { ok: false, reason: `proposal ${id} vanished from the queue mid-write` };

  logProposalEvent({
    id,
    file: row.target_file,
    edit: editText,
    confidence: row.confidence,
    status,
    source: "decision",
    ...(opts.note ? { note: opts.note } : {}),
  });
  return { ok: true, row: marked };
}

/** Apply the proposal's own text to its target file and close the row. */
export function acceptProposal(id: string, path?: string): DecisionResult {
  return resolve(id, "accepted", { path });
}

/** Close the row without writing anything. */
export function rejectProposal(id: string, path?: string): DecisionResult {
  return resolve(id, "rejected", { path });
}

/** Apply alternate text instead of the proposal's own, then close the row. */
export function editProposal(id: string, editText: string, path?: string): DecisionResult {
  const text = editText.trim();
  if (!text) return { ok: false, reason: "edit text is empty" };
  return resolve(id, "edited", { editText: text, path });
}

/**
 * Close a row whose content already landed somewhere other than target_file.
 * The note records where — it is the whole value of the state.
 */
export function markProposalAppliedElsewhere(id: string, note: string, path?: string): DecisionResult {
  const where = note.trim();
  if (!where) return { ok: false, reason: "applied-elsewhere needs a note saying where it landed" };
  return resolve(id, "applied-elsewhere", { note: where, path });
}

/** Rows still awaiting a human decision, oldest first. */
export function pendingProposals(path: string = PENDING_PROPOSALS_PATH): ProposalRow[] {
  return loadProposalQueue(path).filter((r) => !isTerminalStatus(r.status));
}
