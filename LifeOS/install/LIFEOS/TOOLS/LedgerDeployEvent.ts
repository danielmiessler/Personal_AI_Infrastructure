#!/usr/bin/env bun
/**
 * LedgerDeployEvent — append a deploy event to the Ledger's estate-wide record.
 *
 * Part of the Ledger system (LIFEOS/DOCUMENTATION/Ledger/LedgerSystem.md).
 * Every gated deploy (the _CLOUDFLARE Deploy workflow, project deploy scripts)
 * records one event here so "what shipped, when, at what version" has a single
 * answer across the whole estate — not just the ~/.claude tree.
 *
 * The record is append-only JSONL at MEMORY/SYSTEMUPDATES/deploys.jsonl
 * (private via the MEMORY symlink into the user-data repo). Pulse reads it
 * for the Ledger page. Absence of a per-project VERSION file never blocks:
 * the git SHA is always recorded; version is best-effort.
 *
 * Usage:
 *   bun LedgerDeployEvent.ts record --project <name> --target worker:<name> [--domain <domain>] [--repo <path>] [--ok|--fail] [--note "..."]
 *   bun LedgerDeployEvent.ts list [--n 20] [--project <name>]
 *
 * Version resolution order (first hit wins):
 *   1. <repo>/VERSION file (single line, Major.Feature.Patch)
 *   2. <repo>/package.json "version"
 *   3. null (SHA still recorded)
 *
 * @version 1.0.0
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

const LIFEOS_DIR = process.env.LIFEOS_DIR || join(homedir(), ".claude", "LIFEOS");
const DEPLOYS_PATH = join(LIFEOS_DIR, "MEMORY", "SYSTEMUPDATES", "deploys.jsonl");

interface DeployEvent {
  ts: string;
  project: string;
  target: string;        // e.g. "worker:<name>", "pages:<name>", "arbol:<worker>"
  domain: string | null; // authoritative URL host if one exists
  repo: string | null;
  sha: string | null;
  dirty: boolean | null;
  version: string | null;
  ok: boolean;
  note?: string;
}

function git(repo: string, args: string[]): string | null {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function resolveVersion(repo: string): string | null {
  const versionFile = join(repo, "VERSION");
  if (existsSync(versionFile)) {
    const v = readFileSync(versionFile, "utf8").trim();
    if (/^\d+\.\d+\.\d+$/.test(v)) return v;
  }
  const pkgFile = join(repo, "package.json");
  if (existsSync(pkgFile)) {
    try {
      const v = JSON.parse(readFileSync(pkgFile, "utf8")).version;
      if (typeof v === "string" && v.length > 0) return v;
    } catch {}
  }
  return null;
}

function record(opts: { project: string; target: string; domain?: string; repo?: string; ok: boolean; note?: string }): DeployEvent {
  const repo = opts.repo ? resolve(opts.repo) : process.cwd();
  const inGit = git(repo, ["rev-parse", "--is-inside-work-tree"]) === "true";
  const event: DeployEvent = {
    ts: new Date().toISOString(),
    project: opts.project,
    target: opts.target,
    domain: opts.domain ?? null,
    repo: inGit ? repo : null,
    sha: inGit ? git(repo, ["rev-parse", "--short", "HEAD"]) : null,
    dirty: inGit ? git(repo, ["status", "--porcelain"]) !== "" : null,
    version: resolveVersion(repo),
    ok: opts.ok,
    ...(opts.note ? { note: opts.note } : {}),
  };
  mkdirSync(join(LIFEOS_DIR, "MEMORY", "SYSTEMUPDATES"), { recursive: true });
  appendFileSync(DEPLOYS_PATH, JSON.stringify(event) + "\n");
  return event;
}

function list(n: number, project?: string): DeployEvent[] {
  if (!existsSync(DEPLOYS_PATH)) return [];
  const rows = readFileSync(DEPLOYS_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l) as DeployEvent; } catch { return null; }
    })
    .filter((e): e is DeployEvent => e !== null);
  const filtered = project ? rows.filter((e) => e.project === project) : rows;
  return filtered.slice(-n).reverse();
}

const [cmd] = process.argv.slice(2);
const { values } = parseArgs({
  args: process.argv.slice(3),
  options: {
    project: { type: "string" },
    target: { type: "string" },
    domain: { type: "string" },
    repo: { type: "string" },
    note: { type: "string" },
    ok: { type: "boolean" },
    fail: { type: "boolean" },
    n: { type: "string" },
  },
  strict: true,
});

if (cmd === "record") {
  if (!values.project || !values.target) {
    console.error("record requires --project and --target");
    process.exit(2);
  }
  const event = record({
    project: values.project,
    target: values.target,
    domain: values.domain,
    repo: values.repo,
    ok: values.fail ? false : true,
    note: values.note,
  });
  console.log(JSON.stringify(event));
} else if (cmd === "list") {
  const rows = list(parseInt(values.n ?? "20", 10), values.project);
  for (const e of rows) console.log(JSON.stringify(e));
} else {
  console.error("usage: LedgerDeployEvent.ts record --project <p> --target <t> [--domain d] [--repo path] [--fail] [--note s] | list [--n 20] [--project p]");
  process.exit(2);
}
