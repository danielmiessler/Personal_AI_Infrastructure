// Normalize env path vars Claude Code may inject unexpanded (LifeOS#1404).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * Evals — Pulse module surfacing standing eval-suite status for the dashboard.
 *
 * Reads MEMORY/STATE/Evals-Results/<suite>/latest.json (written by EvalRunner /
 * ConfigEvalOnChange) and returns each suite's headline pass^k, mean score,
 * pass/regress state, last-run time, and per-case breakdown. Pure file reads,
 * no polling — cheap enough to read on request.
 *
 * Route: GET /api/evals → { suites: [...], ts }
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME || "";
const LIFEOS_DIR = process.env.LIFEOS_DIR || join(HOME, ".claude", "LIFEOS");
const RESULTS_DIR = join(LIFEOS_DIR, "MEMORY", "STATE", "Evals-Results");

interface SuiteStatus {
  suite: string;
  type: string;
  passed: boolean;
  score: number;
  pass_to_k: number;
  pass_at_k: number;
  summary: string;
  ts: string | null;
  cases: { id: string; mean_score: number; pass_to_k: number }[];
}

function readSuites(): SuiteStatus[] {
  if (!existsSync(RESULTS_DIR)) return [];
  const out: SuiteStatus[] = [];
  for (const name of readdirSync(RESULTS_DIR)) {
    if (name.startsWith("__") || name.startsWith(".")) continue; // ephemeral/draft runs are not standing suites
    const latest = join(RESULTS_DIR, name, "latest.json");
    if (!existsSync(latest)) continue;
    try {
      const j = JSON.parse(readFileSync(latest, "utf-8"));
      out.push({
        suite: j.suite ?? name,
        type: j.type ?? "regression",
        passed: Boolean(j.passed),
        score: Number(j.score ?? 0),
        pass_to_k: Number(j.pass_to_k ?? 0),
        pass_at_k: Number(j.pass_at_k ?? 0),
        summary: String(j.summary ?? ""),
        ts: j.ts ?? null,
        cases: Array.isArray(j.cases)
          ? j.cases.map((c: Record<string, unknown>) => ({ id: String(c.id), mean_score: Number(c.mean_score ?? 0), pass_to_k: Number(c.pass_to_k ?? 0) }))
          : [],
      });
    } catch { /* skip malformed */ }
  }
  // Newest run first.
  return out.sort((a, b) => (b.ts ?? "").localeCompare(a.ts ?? ""));
}

export function health(): { status: string; details?: Record<string, unknown> } {
  const n = existsSync(RESULTS_DIR) ? readdirSync(RESULTS_DIR).length : 0;
  return { status: "ok", details: { suites: n } };
}

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  if (req.method !== "GET" || pathname !== "/api/evals") return null;
  const suites = readSuites();
  const body = { suites, ts: existsSync(RESULTS_DIR) ? statSync(RESULTS_DIR).mtime.toISOString() : null };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}
