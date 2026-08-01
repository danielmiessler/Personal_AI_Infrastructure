#!/usr/bin/env bun
/**
 * @version 1.1.2
 * MemoryTurnStart.hook.ts — the ONE UserPromptSubmit memory hook.
 *
 * Consolidation (2026-07-11, hooks BPE pass): merges the three per-prompt
 * memory spawns into one process. Each sub-hook file remains the owner of its
 * logic and stays runnable standalone; this hook imports their exported run()
 * and concatenates output. Order matches the old registration order:
 *
 *   1. MemoryReviewTrigger.run()  — cadence tick (state only, no output)
 *   2. LoadMemory.run()           — <lifeos-memory> hot-layer injection
 *   3. MemoryDeltaSurface.run()   — <lifeos-memory-health>? + <lifeos-memory-delta>
 *   4. getRelevantContext(prompt) — <lifeos-ground> task-scoped BM25 retrieval
 *
 * Step 4 (public issue #1573, @christauff): the ranked retriever previously
 * fired only on remote channels (ln), never on the CLI turn path — so prior
 * work sitting top-ranked in the corpus for the exact query never reached a
 * terminal session. Every-turn (query-specific, so the inject gate below does
 * not apply); the 0.20 score threshold means below-threshold prompts inject
 * NOTHING — no header noise. Synchronous BM25 over the typed corpus, 60s
 * cached by query hash. Fail-open: a retriever error never blocks the prompt.
 *
 * Subagent skip: checked ONCE here (the sub-hooks' own shims keep their checks
 * for standalone runs). Failure mode: any sub-hook error is caught inside its
 * run() (stderr + null); this wrapper never blocks a prompt. Always exit 0.
 */

// tickCadence removed 2026-07-11: MemoryReviewFire (Stop) owns the whole
// cadence now — counting, decision, and firing in one place.
import { run as loadMemory } from "./LoadMemory.hook";
import { run as deltaSurface } from "./MemoryDeltaSurface.hook";
import { getRelevantContext } from "../LIFEOS/TOOLS/MemoryRetriever";
import { clearLedger as clearSystemDelta } from "./SystemChangeSurface.hook";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve as pathResolve } from "node:path";
import { homedir } from "node:os";
import { isSubagentContext as isSubagent } from './lib/subagent';

// ── Hot-layer injection gate (2026-07-11, context-window cleanup #1) ─────────
// The <lifeos-memory> block is ~1.5K tokens; injecting it EVERY prompt duplicated
// it dozens of times per session. Policy: inject on a session's FIRST prompt,
// whenever the memory files' content actually CHANGED, or after REFRESH_TURNS
// prompts without an injection (compaction backstop — a post-compact window
// must re-see memory within a bounded number of turns). The 🧠 delta line and
// the cadence tick remain every-turn: the visible contract is unchanged.
const CLAUDE_ROOT = pathResolve(homedir(), ".claude");
const STATE_DIR = pathResolve(CLAUDE_ROOT, "LIFEOS/MEMORY/STATE/memory-inject");
const PRINCIPAL_MEMORY = pathResolve(CLAUDE_ROOT, "LIFEOS/USER/PRINCIPAL/PRINCIPAL_MEMORY.md");
const DA_MEMORY = pathResolve(CLAUDE_ROOT, "LIFEOS/USER/DIGITAL_ASSISTANT/DA_MEMORY.md");
const REFRESH_TURNS = 20;

interface InjectState { lastHash: string; turnsSinceInject: number; }

function memoryHash(): string {
  const h = createHash("sha256");
  for (const p of [PRINCIPAL_MEMORY, DA_MEMORY]) {
    try { if (existsSync(p)) h.update(readFileSync(p, "utf8")); } catch {}
  }
  return h.digest("hex").slice(0, 16);
}

function shouldInject(sessionId: string): boolean {
  const statePath = pathResolve(STATE_DIR, `${sessionId.replace(/[^A-Za-z0-9._-]/g, "_")}.json`);
  const hash = memoryHash();
  let state: InjectState | null = null;
  try { if (existsSync(statePath)) state = JSON.parse(readFileSync(statePath, "utf8")); } catch {}

  const inject = !state || state.lastHash !== hash || state.turnsSinceInject >= REFRESH_TURNS;
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(statePath, JSON.stringify({
      lastHash: hash,
      turnsSinceInject: inject ? 0 : (state!.turnsSinceInject + 1),
    }), "utf8");
  } catch { /* best-effort — on state failure we fall back to injecting */ }
  return inject;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    const timer = setTimeout(() => resolve(data), 1500);
    process.stdin.on("data", (c) => { data += c.toString(); });
    process.stdin.on("end", () => { clearTimeout(timer); resolve(data); });
    process.stdin.on("error", () => { clearTimeout(timer); resolve(data); });
  });
}

if (isSubagent()) process.exit(0);

(async () => {
  let sessionId = "unknown";
  let prompt = "";
  try {
    const input = JSON.parse(await readStdin());
    sessionId = input.session_id || "unknown";
    prompt = typeof input.prompt === "string" ? input.prompt : "";
  } catch {}

  // Turn boundary for the ⚙️ SYSTEM surface. It lives here because this is the
  // ONE UserPromptSubmit composer, so it needs no new settings.json entry — and
  // a fresh registration is the fragile part (see MemoryDeltaSurface's header:
  // one was clobbered by a concurrent write and sat dead five days). Per-session
  // by construction; a concurrent session's turn must not clear this one's.
  try { clearSystemDelta(sessionId); } catch {}

  if (shouldInject(sessionId)) {
    const memory = loadMemory();
    if (memory) process.stdout.write(memory);
  }
  const delta = deltaSurface();
  if (delta) process.stdout.write(delta);

  // Task-scoped retrieval (public issue #1573, @christauff) — CLI parity with
  // the remote-channel ln() path. Empty markdownBlock (below threshold, empty
  // corpus, or trivial prompt) injects nothing.
  if (prompt.trim().length > 0) {
    try {
      const ground = getRelevantContext(prompt, { topK: 5, threshold: 0.20 });
      if (ground.markdownBlock) {
        process.stdout.write(`<lifeos-ground>\n${ground.markdownBlock}\n</lifeos-ground>\n`);
      }
    } catch (e) {
      process.stderr.write(`MemoryTurnStart ground error: ${(e as Error)?.message || String(e)}\n`);
    }
  }
  process.exit(0);
})().catch(() => process.exit(0));
