#!/usr/bin/env bun
/**
 * VersionDrift.hook.ts — deterministic version-drift tooth (UserPromptSubmit).
 *
 * Versioning used to depend on the DA remembering to run /vb; 2026-07-16 the
 * principal had to ask "did you bump the versions properly?" (answer: no).
 * This hook closes that class: when the core surface has drifted past the last
 * vX.Y.Z tag beyond thresholds and no bump is in flight, it injects a nag line
 * so the system asks the DA instead of the principal asking the system.
 *
 * Deterministic, zero inference. Quiet by design:
 *   - VERSION already moved past the tag → a bump is in flight → silent.
 *   - drift below thresholds (fresh tag, small change set) → silent.
 *   - nag at most once per NAG_INTERVAL_MIN even when drifted.
 * Thresholds (tunable): NAG_FILES=10 changed core files, or any drift once the
 * tag is older than NAG_AGE_HOURS=48.
 *
 * @version 1.0.2
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const CLAUDE_DIR = join(homedir(), ".claude");
const VERSION_FILE = join(CLAUDE_DIR, "LIFEOS", "VERSION");
const STATE_FILE = join(CLAUDE_DIR, "LIFEOS", "MEMORY", "STATE", "version-drift-nag.json");

const NAG_FILES = 10;
const NAG_AGE_HOURS = 48;
const NAG_INTERVAL_MIN = 60;

// Same core surface ClassifyChange diffs — sync asserted by
// test/regression/core-surface-sync.test.ts (run by /ic's replay-corpus check).
const CORE_PATHS = [
  "hooks/", "LIFEOS/ALGORITHM/", "skills/", "settings.json", "CLAUDE.md",
  "LIFEOS/LIFEOS_SYSTEM_PROMPT.md", "LIFEOS/TOOLS/", "agents/", "commands/",
  "LIFEOS/PULSE/", "LIFEOS/ATLAS/", "test/", "LIFEOS/DOCUMENTATION/",
];

function git(args: string[]): string {
  try {
    return execFileSync("git", ["-C", CLAUDE_DIR, ...args], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch { return ""; }
}

function lastSemverTag(): string | null {
  const tags = git(["tag", "-l", "v[0-9]*.[0-9]*.[0-9]*"]).split("\n").map((t) => t.trim())
    .filter((t) => /^v\d+\.\d+\.\d+$/.test(t))
    .sort((a, b) => {
      const pa = a.slice(1).split(".").map(Number), pb = b.slice(1).split(".").map(Number);
      for (let i = 0; i < 3; i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return d; }
      return 0;
    });
  return tags.length ? tags[tags.length - 1]! : null;
}

function recentlyNagged(): boolean {
  try {
    const s = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    return Date.now() - Date.parse(s.ts) < NAG_INTERVAL_MIN * 60_000;
  } catch { return false; }
}

function markNagged(count: number, tag: string): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify({ ts: new Date().toISOString(), count, tag }) + "\n");
}

function main(): void {
  const tag = lastSemverTag();
  if (!tag) return; // untagged repo — bootstrap is UpdateKaiRepo's job, not a nag

  // Bump in flight: VERSION already moved past the tag → UpdateKaiRepo will tag it.
  let version = "";
  try { version = readFileSync(VERSION_FILE, "utf8").trim(); } catch { /* fall through */ }
  if (version && `v${version}` !== tag) return;

  const changed = git(["diff", "--name-only", tag, "--", ...CORE_PATHS])
    .split("\n").map((l) => l.trim()).filter(Boolean);
  if (changed.length === 0) return;

  const tagEpoch = Number(git(["log", "-1", "--format=%ct", tag]) || "0");
  const ageHours = tagEpoch ? (Date.now() / 1000 - tagEpoch) / 3600 : 0;

  const drifted = changed.length >= NAG_FILES || (ageHours > NAG_AGE_HOURS && changed.length >= 1);
  if (!drifted || recentlyNagged()) return;

  markNagged(changed.length, tag);
  const line = `⏫ VERSION-DRIFT: ${changed.length} core file(s) ahead of ${tag}` +
    `${ageHours >= 1 ? ` (tag ${Math.round(ageHours)}h old)` : ""}, no bump in flight — ` +
    `run the VersionBump workflow (/vb: classify → bump → ship) before this ages further, or defer explicitly to the principal.`;
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: line },
  }));
}

main();
