#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * @version 1.2.0
 * TRIGGER: UserPromptSubmit
 * DriftReminder — pre-write format contract for the LifeOS output format.
 *
 * WHY (2026-07-31, {{PRINCIPAL_NAME}}): FormatGate went observation-only on 2026-07-11
 * (commit ea6965351) because a Stop hook fires AFTER the text is on screen and
 * can only block, which forces a doubled re-emit. Measured effect in
 * format-gate.jsonl: 0% violations across 168 turns while it blocked
 * (Jul 10-11), then 61-91% EVERY DAY across 2,608 turns once it only logged
 * (Jul 12-31). The teeth were the thing that worked.
 *
 * {{PRINCIPAL_NAME}}'s fix, and it is the right one: check BEFORE the answer is written,
 * not after. This hook is the only enforcement point that runs pre-generation,
 * so it now emits a per-turn CONTRACT rather than an occasional nudge:
 *   - the line budget for THIS turn (lifted when the prompt asks for depth)
 *   - the structural rules (banner first, closer last, em-dash cap)
 *   - what the PREVIOUS response actually broke, measured
 *
 * Every turn, no rate limit. The old MIN_TURNS_BETWEEN_FIRES budget meant the
 * nudge was silent 4 turns out of 5, which is why 80% drift went unnoticed.
 * FormatGate stays as the post-write recorder; this is the pre-write shaper.
 *
 * NOT scaffolding (BPE): every field is a measured number or a deterministic
 * property of an artifact. It states the contract, never how to think.
 *
 * Performance: hot-path hook, no LLM calls, no large reads. Target <20ms.
 * Failure mode: any error logs to stderr and exits 0, never blocking prompts.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { firstBannedHit } from "./lib/banned-vocab";

// Normalize env path vars that Claude Code injects without shell expansion (LifeOS#1404)
for (const k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const v = process.env[k];
  if (v && /^\$\{?HOME\}?(\/|$)/.test(v)) process.env[k] = v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}


interface HookInput {
  prompt?: string;
  user_prompt?: string;
}

interface DriftState {
  last_fired_turn: number;
  turn_count: number;
  last_text: string | null;
  schema_version: 1;
}

const STDIN_TIMEOUT_MS = 300;
// Retained only so the persisted state schema stays readable across the 1.2.0
// change; the contract itself fires every turn (that silence was the bug).
const MIN_TURNS_BETWEEN_FIRES = 5;
// System prompt § Output Format: "often 1-5 lines, and for a question with no
// work attached, rarely more than about fifteen."
const DEFAULT_LINE_CAP = 15;
// The principal asking for depth lifts the cap. His explicit call outranks the
// default; nothing else does.
const DEPTH_RE = /\b(extensive|thorough|comprehensive|exhaustive|deep[\s-]?dive|in[\s-]depth|detailed|long[\s-]form|full (?:analysis|report|breakdown|write[\s-]?up)|go deep|be verbose|everything (?:you|we) (?:know|have))\b/i;
const LIFEOS_DIR = process.env.LIFEOS_DIR || join(process.env.HOME || "", ".claude", "LIFEOS");
const LAST_RESPONSE_PATH = join(LIFEOS_DIR, "MEMORY", "STATE", "last-response.txt");
const STATE_PATH = join(LIFEOS_DIR, "MEMORY", "STATE", "drift-reminder.json");
const INITIAL_STATE: DriftState = {
  last_fired_turn: -MIN_TURNS_BETWEEN_FIRES,
  turn_count: 0,
  last_text: null,
  schema_version: 1,
};
// One format since 2026-07-11 (modes retired): the single LifeOS banner.
// The ═══ substring matches the unified `════ LifeOS ═══…` header.
const MODE_BANNERS = ["═══ LifeOS ═══"] as const;

async function readStdinWithTimeout(timeoutMs: number = STDIN_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.on("data", (chunk: Buffer) => {
      data += chunk.toString();
      // 10MB cap — unbounded buffering risked multi-GB allocation on a fast stream (public issue #1533, @christauff)
      if (data.length > 10_000_000) { clearTimeout(timer); try { process.stdin.pause(); } catch { /* closed */ } resolve(data); }
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on("error", (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function parseHookInput(raw: string): HookInput {
  try {
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const record = parsed as Record<string, unknown>;
    return {
      prompt: typeof record.prompt === "string" ? record.prompt : undefined,
      user_prompt: typeof record.user_prompt === "string" ? record.user_prompt : undefined,
    };
  } catch {
    return {};
  }
}

function loadState(): DriftState {
  try {
    if (!existsSync(STATE_PATH)) return { ...INITIAL_STATE };
    const raw = JSON.parse(readFileSync(STATE_PATH, "utf8")) as Partial<DriftState>;
    return {
      last_fired_turn: typeof raw.last_fired_turn === "number" ? raw.last_fired_turn : INITIAL_STATE.last_fired_turn,
      turn_count: typeof raw.turn_count === "number" ? raw.turn_count : INITIAL_STATE.turn_count,
      last_text: typeof raw.last_text === "string" ? raw.last_text : null,
      schema_version: 1,
    };
  } catch {
    return { ...INITIAL_STATE };
  }
}

function saveState(state: DriftState): void {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  const tmp = `${STATE_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf8");
  renameSync(tmp, STATE_PATH);
}

function readLastResponse(): string | null {
  try {
    if (!existsSync(LAST_RESPONSE_PATH)) return null;
    // Staleness guard: on the first prompt of a new session the cache still
    // holds the PREVIOUS session's final response — never nag about day-old drift.
    const ageMs = Date.now() - statSync(LAST_RESPONSE_PATH).mtimeMs;
    if (ageMs > 30 * 60 * 1000) return null;
    return readFileSync(LAST_RESPONSE_PATH, "utf8");
  } catch {
    return null;
  }
}

function countEmDashes(text: string): number {
  return (text.match(/—/g) ?? []).length;
}

/**
 * Strip fenced and inline code so prose measurements never count a code block's
 * lines or an em-dash inside a shell command.
 */
function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
}

interface FormatMeasure {
  lines: number;
  emDashes: number;
  banner: boolean;
  closer: boolean;
  banned: string | null;
}

function measure(text: string): FormatMeasure {
  const prose = stripCode(text);
  return {
    lines: prose.split("\n").filter((l) => l.trim().length > 0).length,
    emDashes: countEmDashes(prose),
    banner: MODE_BANNERS.some((banner) => text.includes(banner)),
    closer: /🗣️/.test(text),
    banned: firstBannedHit(text),
  };
}

/** What the previous response actually broke, measured. Empty when clean. */
function breaksIn(m: FormatMeasure, cap: number | null): string[] {
  const out: string[] = [];
  if (!m.banner) out.push("no banner");
  if (!m.closer) out.push("no closer");
  if (m.emDashes > 2) out.push(`${m.emDashes} em-dashes`);
  if (m.banned) out.push(`banned word '${m.banned}'`);
  if (cap !== null && m.lines > cap) out.push(`${m.lines} lines (cap ${cap})`);
  return out;
}

/**
 * The line budget for THIS turn. Null means the principal asked for depth, so
 * the cap is lifted — his explicit call outranks the default (claim 15).
 */
function capFor(prompt: string): number | null {
  return DEPTH_RE.test(prompt) ? null : DEFAULT_LINE_CAP;
}

function contractLine(cap: number | null, last: FormatMeasure | null): string {
  const budget = cap === null
    ? "depth requested, line cap lifted"
    : `max ${cap} prose lines`;
  const structure = "banner first, 🗣️ closer last, max 2 em-dashes";
  const previous = last
    ? (() => {
        const broke = breaksIn(last, cap);
        return broke.length
          ? ` Last response broke: ${broke.join(", ")}.`
          : ` Last response was clean (${last.lines} lines).`;
      })()
    : "";
  return `FORMAT CONTRACT (check before writing, not after): ${budget}; ${structure}.${previous}`;
}

function emit(line: string): void {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: line },
  }));
}

async function main(): Promise<void> {
  try {
    const raw = await readStdinWithTimeout();
    const input = parseHookInput(raw);
    const prompt = input.prompt || input.user_prompt || "";

    const state = loadState();
    state.turn_count += 1;

    const cap = capFor(prompt);
    const lastResponse = readLastResponse();
    const line = contractLine(cap, lastResponse ? measure(lastResponse) : null);

    // Every turn, no rate limit and no dedupe. A contract that is silent 4
    // turns out of 5 is why 61-91% daily drift ran unnoticed for 19 days.
    state.last_fired_turn = state.turn_count;
    state.last_text = line;
    saveState(state);
    emit(line);
  } catch (err) {
    process.stderr.write(`DriftReminder error: ${(err as Error)?.message || String(err)}\n`);
  }
  process.exit(0);
}

main();
