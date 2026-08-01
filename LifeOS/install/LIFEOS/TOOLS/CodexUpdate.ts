#!/usr/bin/env bun
/**
 * CodexUpdate.ts — Keep the OpenAI Codex CLI current.
 *
 *   bun ~/.claude/LIFEOS/TOOLS/CodexUpdate.ts            # update to @latest
 *   bun ~/.claude/LIFEOS/TOOLS/CodexUpdate.ts --check    # report versions only
 *
 * codex is the agentic runtime behind the cross-vendor GPT-5.6 Sol agents (Forge,
 * the researchers). It's a Bun global (`@openai/codex`), so "stay updated" means
 * `bun install -g @openai/codex@latest` on a cadence. The com.lifeos.codexupdate
 * launchd agent runs this daily; see InstallCodexUpdate.ts.
 *
 * Logs every run (version transition + result) to
 * MEMORY/OBSERVABILITY/codex-update.jsonl so a silent breakage from a bad
 * upstream release is traceable to the exact version bump.
 */

import { spawnSync } from "child_process";
import { appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const HOME = process.env.HOME || "";
const PKG = "@openai/codex";
const LOG = join(HOME, ".claude", "LIFEOS", "MEMORY", "OBSERVABILITY", "codex-update.jsonl");

function codexVersion(): string | null {
  const r = spawnSync("codex", ["--version"], { encoding: "utf-8" });
  if (r.status !== 0 || !r.stdout) return null;
  // "codex-cli 0.137.0" → "0.137.0"
  const m = r.stdout.trim().match(/(\d+\.\d+\.\d+\S*)/);
  return m ? m[1] : r.stdout.trim();
}

function logEvent(event: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(LOG), { recursive: true });
    appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...event }) + "\n");
  } catch { /* logging is best-effort */ }
}

async function latestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${PKG}/latest`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { version?: string };
    return json.version ?? null;
  } catch {
    return null; // offline/registry down — caller falls through to install
  }
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes("--check");
  const before = codexVersion();

  if (checkOnly) {
    console.log(`codex current: ${before ?? "NOT INSTALLED"}`);
    logEvent({ action: "check", version: before });
    return;
  }

  // Idempotency guard (public issue #1513, @xmasyx): skip the global install
  // when already at the registry's latest. This is what makes RunAtLoad safe —
  // without it, every login re-ran `bun install -g`. Registry unreachable →
  // fall through and install (the old behavior, still correct).
  const latest = await latestVersion();
  if (before && latest && before === latest) {
    console.log(`[CodexUpdate] already current (${before}) — skipping install`);
    logEvent({ action: "update", from: before, to: before, changed: false, ok: true, skipped: "already-latest" });
    return;
  }

  console.log(`[CodexUpdate] current: ${before ?? "not installed"} — installing ${PKG}@latest`);
  const r = spawnSync("bun", ["install", "-g", `${PKG}@latest`], { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);

  if (r.status !== 0) {
    console.error(`[CodexUpdate] FAILED (exit ${r.status})`);
    logEvent({ action: "update", from: before, ok: false, exit: r.status, error: (r.stderr || "").slice(0, 500) });
    process.exit(1);
  }

  const after = codexVersion();
  const changed = before !== after;
  console.log(`[CodexUpdate] ${changed ? `updated ${before} → ${after}` : `already current (${after})`}`);
  logEvent({ action: "update", from: before, to: after, changed, ok: true });
}

if (import.meta.main) await main();
