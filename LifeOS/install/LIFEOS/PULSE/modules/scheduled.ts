/**
 * scheduled — unified view of every recurring job LifeOS runs, wherever it runs.
 *
 * Scheduled work had two partial homes and no single one: `Services.ts` knew the
 * launchd registry but only from a CLI, and Arbol's cron triggers lived in
 * wrangler configs nobody reads. A job that silently stopped looked exactly like
 * a healthy one. This module is the union.
 *
 * Three executors, one ledger:
 *
 *   local   — launchd on this machine. Registry from `LIFEOS/TOOLS/Services.ts`
 *             (imported, never copied) joined against live `launchctl` state, so
 *             the response reports reality rather than intent.
 *   arbol   — Cloudflare Workers. Cron expressions parsed from each worker's own
 *             wrangler config, which is the deploy source of truth.
 *   hermes  — the sidecar's scheduler, where delivered agent work lives
 *             ("text me the brief at 07:00").
 *
 * Read-only by construction: it reports state and never installs, starts, or
 * stops anything. Mutating a service stays with `Services.ts` (launchd) and the
 * Assistant module's cron CRUD, each behind its own confirmations.
 *
 * These are COLLECTORS, not an HTTP surface. `/assistant` already owns the
 * scheduled-task view and its source model; this feeds `aggregateTasks()` there.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SERVICES, cadenceOf, findPlist, loadedLabels } from "../../TOOLS/Services.ts";
import { checkHermesHealth, type HermesHealth } from "../../HERMES/Health.ts";

const HOME = homedir();
const ARBOL_WORKERS = join(HOME, ".claude/LIFEOS/USER/CUSTOMIZATIONS/ARBOL/Workers");
const HERMES_HOME = process.env.HERMES_HOME || join(HOME, ".hermes");

export type Executor = "local" | "arbol" | "hermes";
export type JobState = "running" | "installed" | "available" | "unknown";

export interface ScheduledJob {
  id: string;
  title: string;
  executor: Executor;
  cadence: string;
  state: JobState;
  purpose?: string;
  category?: string;
  /** Last observed activity, when the executor exposes one. */
  lastRun?: string;
}

// ── local (launchd) ──────────────────────────────────────────────────────────

function localJobs(): ScheduledJob[] {
  const loaded = loadedLabels();
  return SERVICES.map((svc) => {
    const plist = findPlist(svc.label);
    // Three genuinely different conditions, and collapsing them is what made a
    // dead job indistinguishable from a healthy one:
    //   running   — loaded in launchd right now
    //   installed — plist on disk but not loaded (it stopped, or never started)
    //   available — known to the registry, never installed (an opt-in)
    const jobState: JobState = loaded.has(svc.label)
      ? "running"
      : plist?.installed
        ? "installed"
        : "available";
    return {
      id: svc.label,
      title: svc.title,
      executor: "local" as const,
      cadence: plist ? cadenceOf(plist.path) : "—",
      state: jobState,
      purpose: svc.purpose,
      category: svc.category,
    };
  });
}

// ── arbol (Cloudflare) ───────────────────────────────────────────────────────

/** Strip comments/trailing commas so a .jsonc parses as JSON. */
function parseJsonc(text: string): unknown {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(stripped);
}

/** Render a cron expression as something readable without lying about it. */
function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  if (min.startsWith("*/") && hour === "*") return `every ${min.slice(2)}m`;
  if (hour.startsWith("*/") && dom === "*") return `every ${hour.slice(2)}h`;
  if (min !== "*" && hour === "*") return "hourly";
  if (min !== "*" && hour !== "*" && dom === "*" && mon === "*" && dow === "*") {
    return `daily ${hour.padStart(2, "0")}:${min.padStart(2, "0")} UTC`;
  }
  return expr;
}

function arbolJobs(): ScheduledJob[] {
  if (!existsSync(ARBOL_WORKERS)) return [];
  const out: ScheduledJob[] = [];
  for (const dir of readdirSync(ARBOL_WORKERS)) {
    for (const name of ["wrangler.jsonc", "wrangler.json"]) {
      const cfg = join(ARBOL_WORKERS, dir, name);
      if (!existsSync(cfg)) continue;
      try {
        const parsed = parseJsonc(readFileSync(cfg, "utf8")) as {
          name?: string;
          triggers?: { crons?: string[] };
        };
        const crons = parsed.triggers?.crons ?? [];
        if (!crons.length) break;
        out.push({
          id: parsed.name || dir,
          title: dir.replace(/^_[AFP]_/, "").replace(/_/g, " ").toLowerCase(),
          executor: "arbol",
          cadence: crons.map(describeCron).join(", "),
          // A cron in a deployed worker's config is scheduled by definition;
          // whether the last run SUCCEEDED is a different question this module
          // does not pretend to answer.
          state: "running",
          purpose: `Cloudflare cron — ${crons.join(", ")}`,
          category: dir.startsWith("_F_") ? "flow" : dir.startsWith("_P_") ? "pipeline" : "action",
        });
      } catch {
        // A malformed config is worth surfacing, not swallowing.
        out.push({
          id: dir,
          title: dir,
          executor: "arbol",
          cadence: "?",
          state: "unknown",
          purpose: "wrangler config could not be parsed",
        });
      }
      break;
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

// ── hermes (sidecar) ─────────────────────────────────────────────────────────

function hermesJobs(): ScheduledJob[] {
  const jobsFile = join(HERMES_HOME, "cron", "jobs.json");
  if (!existsSync(jobsFile)) return [];
  try {
    const raw = parseJsonc(readFileSync(jobsFile, "utf8")) as
      | { jobs?: Record<string, unknown>[] }
      | Record<string, unknown>[];
    const list = Array.isArray(raw) ? raw : (raw.jobs ?? []);
    return list.map((j) => {
      const job = j as {
        id?: string; name?: string; prompt?: string;
        schedule?: string; interval?: string; enabled?: boolean;
      };
      return {
        id: job.id || job.name || "job",
        title: job.name || job.prompt?.slice(0, 60) || "scheduled agent turn",
        executor: "hermes" as const,
        cadence: job.schedule ? describeCron(job.schedule) : (job.interval ?? "—"),
        state: (job.enabled === false ? "installed" : "running") as JobState,
        purpose: job.prompt?.slice(0, 160),
        category: "agent",
      };
    });
  } catch {
    return [];
  }
}

/**
 * Health of the sidecar PROCESS, distinct from both the jobs it holds and the
 * scheduler tick. Listing a sidecar's cron jobs while saying nothing about
 * whether the gateway behind them is alive is how a crash loop went unnoticed
 * for hours on 2026-07-30 — the surface looked covered.
 *
 * Best-effort: any failure degrades to null so a broken sidecar can never take
 * the dashboard down with it.
 */
function hermesHealth(): HermesHealth | null {
  try {
    return checkHermesHealth();
  } catch {
    return null;
  }
}

/** Liveness of the sidecar scheduler itself, distinct from the jobs it holds. */
function hermesTicker(): { present: boolean; lastBeat?: string } {
  const beat = join(HERMES_HOME, "cron", "ticker_last_success");
  if (!existsSync(beat)) return { present: existsSync(join(HERMES_HOME, "cron")) };
  try {
    return { present: true, lastBeat: statSync(beat).mtime.toISOString() };
  } catch {
    return { present: true };
  }
}

// ── collector exports ────────────────────────────────────────────────────────
//
// This file is a LIBRARY, not a Pulse module. The scheduled-task surface lives
// at /assistant (Tasks tab), which already owns cron CRUD and a source model.
// Standing up a second endpoint here would have re-created the fragmentation
// this work exists to remove, so these collectors feed `aggregateTasks()`.

export { localJobs, arbolJobs, hermesJobs, hermesTicker, hermesHealth };
export type { HermesHealth };
