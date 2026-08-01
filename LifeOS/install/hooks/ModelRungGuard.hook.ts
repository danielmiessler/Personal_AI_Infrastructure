#!/usr/bin/env bun
// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * @version 1.0.0
 * TRIGGER: UserPromptSubmit
 * ModelRungGuard — detect a session running BELOW the pinned model rung.
 *
 * WHY (INC-20260731-off-pin-session-undetected, {{PRINCIPAL_NAME}}): `settings.json` pins
 * `"model"` to the top-rung alias so every session starts on MAX. On 2026-07-31
 * a session ran a rung below the pin for its entire length. Nothing noticed:
 * not a hook, not a gate, not `/ic`. A full subsystem analysis and a first
 * design shipped on the wrong rung, and the only detection in the end was
 * {{PRINCIPAL_NAME}} getting angry twice.
 *
 * The pin and the live model are both deterministic facts sitting in plain
 * files. Comparing them is three lines of code, so the gap was never technical.
 *
 * What it does NOT do: change the model. A hook cannot set the main loop's
 * carrier — only `/model` and launch flags can. So this reports the gap and
 * names the sanctioned move (OPERATIONAL_RULES § Model selection: MAX-class
 * work reaches MAX via a tier-alias dispatch, fired immediately, never by
 * asking {{PRINCIPAL_NAME}} to flip a dial).
 *
 * NOT scaffolding (BPE): every field is a measured property of an artifact
 * (the pin in settings.json, the model on the last assistant message). It
 * states a fact and the one rule that applies, never how to think.
 *
 * Performance: hot-path hook. Reads a tail of the transcript, no LLM calls.
 * Failure mode: any error logs to stderr and exits 0, never blocking prompts.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const STDIN_TIMEOUT_MS = 300;
const HOME = process.env.HOME || "";
const CLAUDE_ROOT = join(HOME, ".claude");
const LIFEOS_DIR = process.env.LIFEOS_DIR || join(CLAUDE_ROOT, "LIFEOS");
const SETTINGS_PATH = join(CLAUDE_ROOT, "settings.json");
const LOG_PATH = join(LIFEOS_DIR, "MEMORY", "OBSERVABILITY", "model-rung.jsonl");
/** Only the tail can hold the current session's carrier; the file grows large. */
const TAIL_BYTES = 256 * 1024;

/**
 * Rung order, highest first. Mirrors `EFFORT_MODEL` in `LIFEOS/TOOLS/models.ts`
 * (max/high/medium/low) as TIER ALIASES, never pinned model IDs — an alias
 * resolves to the latest model in its tier, which is the auto-update mechanism.
 */
const RUNGS = ["fable", "opus", "sonnet", "haiku"] as const;
type Rung = (typeof RUNGS)[number];

interface HookInput {
  transcript_path?: string;
}

async function readStdinWithTimeout(timeoutMs: number = STDIN_TIMEOUT_MS): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), timeoutMs);
    process.stdin.on("data", (chunk: Buffer) => {
      data += chunk.toString();
      if (data.length > 10_000_000) {
        clearTimeout(timer);
        try { process.stdin.pause(); } catch { /* closed */ }
        resolve(data);
      }
    });
    process.stdin.on("end", () => { clearTimeout(timer); resolve(data); });
    process.stdin.on("error", (err: Error) => { clearTimeout(timer); reject(err); });
  });
}

function parseHookInput(raw: string): HookInput {
  try {
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const record = parsed as Record<string, unknown>;
    return { transcript_path: typeof record.transcript_path === "string" ? record.transcript_path : undefined };
  } catch {
    return {};
  }
}

/** Map any carrier string (alias or full model ID) onto its rung. */
export function rungOf(model: string | null | undefined): Rung | null {
  if (!model) return null;
  const m = model.toLowerCase();
  return RUNGS.find((r) => m.includes(r)) ?? null;
}

/** The rung `settings.json` pins. Null when unpinned or unrecognizable. */
export function pinnedRung(settingsPath: string = SETTINGS_PATH): Rung | null {
  try {
    if (!existsSync(settingsPath)) return null;
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    return rungOf(typeof parsed.model === "string" ? parsed.model : null);
  } catch {
    return null;
  }
}

/**
 * The carrier actually serving this session, read from the last assistant
 * message in the transcript. Null on the very first prompt, when no assistant
 * message exists yet — the check simply starts on turn two.
 */
export function liveModel(transcriptPath: string | undefined): string | null {
  try {
    if (!transcriptPath || !existsSync(transcriptPath)) return null;
    const size = statSync(transcriptPath).size;
    const fd = readFileSync(transcriptPath);
    const tail = fd.subarray(Math.max(0, size - TAIL_BYTES)).toString("utf8");
    const lines = tail.split("\n").filter((l) => l.trim().length > 0);
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const row = JSON.parse(lines[i] as string) as Record<string, unknown>;
        const msg = row.message as Record<string, unknown> | undefined;
        if (msg && typeof msg.model === "string" && msg.model.trim()) return msg.model;
      } catch { /* partial line at the tail boundary */ }
    }
    return null;
  } catch {
    return null;
  }
}

/** Positive when `live` sits below `pin`. Zero when equal or either is unknown. */
export function rungGap(pin: Rung | null, live: Rung | null): number {
  if (!pin || !live) return 0;
  return RUNGS.indexOf(live) - RUNGS.indexOf(pin);
}

function log(event: Record<string, unknown>): void {
  try {
    mkdirSync(join(LIFEOS_DIR, "MEMORY", "OBSERVABILITY"), { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n", "utf8");
  } catch { /* observability is never worth failing a prompt over */ }
}

function emit(line: string): void {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: line },
  }));
}

async function main(): Promise<void> {
  try {
    const input = parseHookInput(await readStdinWithTimeout());
    const pin = pinnedRung();
    const model = liveModel(input.transcript_path);
    const live = rungOf(model);
    const gap = rungGap(pin, live);

    if (gap > 0) {
      log({ event: "off-pin", pin, live, model, gap });
      emit(
        `⚠️ MODEL RUNG: this session is running '${model}' (${live}), ${gap} rung below the ` +
          `'${pin}' pin in settings.json. Per OPERATIONAL_RULES § Model selection, MAX-class work ` +
          `(judgment, design, architecture, scoping, synthesis, meta work on LifeOS) does NOT run here: ` +
          `dispatch it now with the '${pin}' tier alias. Do not ask which rung to use, and do not ask ` +
          `{{PRINCIPAL_NAME}} to change /model.`,
      );
    } else {
      log({ event: "on-pin", pin, live, model });
    }
  } catch (err) {
    process.stderr.write(`ModelRungGuard error: ${(err as Error)?.message || String(err)}\n`);
  }
  process.exit(0);
}

if (import.meta.main) main();
