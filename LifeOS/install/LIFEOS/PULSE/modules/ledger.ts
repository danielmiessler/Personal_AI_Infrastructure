/**
 * Ledger Pulse module — read-only surface over the LifeOS change-tracking system.
 *
 * Composes from local files, each probe fail-soft:
 *   versions  — LIFEOS/VERSION (umbrella) + ALGORITHM/LATEST + system-prompt/memory markers
 *   registry  — MEMORY/SYSTEMUPDATES/index.json (latest N entries + rollups)
 *   deploys   — MEMORY/SYSTEMUPDATES/deploys.jsonl (estate deploy events)
 *   integrity — MEMORY/STATE/integrity/last-run.json + last-pass.json
 *   drift     — MEMORY/STATE/version-drift-nag.json
 *
 * Route: GET /api/ledger → { generated_at, versions, registry, deploys, integrity, drift, errors }
 *
 * Canonical doc: LIFEOS/DOCUMENTATION/Ledger/LedgerSystem.md. Nothing
 * principal-specific lives here; all paths resolve under the install home.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOME = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const LIFEOS_DIR = join(HOME, "LIFEOS");
const SYSTEMUPDATES = join(LIFEOS_DIR, "MEMORY", "SYSTEMUPDATES");
const STATE_DIR = join(LIFEOS_DIR, "MEMORY", "STATE");

const CACHE_TTL_MS = 60_000;
const REGISTRY_SLICE = 40;
const DEPLOYS_SLICE = 40;

const state: { running: boolean; cache: { payload: unknown; expiresAt: number } | null } = {
  running: false,
  cache: null,
};

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return null;
  }
}

function readJson(path: string): any | null {
  const raw = readText(path);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJsonl(path: string, lastN: number): any[] {
  if (!existsSync(path)) return [];
  const raw = readText(path);
  if (!raw) return [];
  const lines = raw.split("\n").filter(Boolean);
  const out: any[] = [];
  for (const line of lines.slice(-lastN)) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // skip malformed rows
    }
  }
  return out.reverse();
}

/** Frontmatter `version:` marker from a markdown file (system prompt, memory doc). */
function frontmatterVersion(path: string): string | null {
  const raw = readText(path);
  if (!raw) return null;
  const m = raw.match(/^version:\s*["']?(\d+\.\d+\.\d+)["']?\s*$/m);
  return m ? m[1] : null;
}

function compose(): any {
  const errors: string[] = [];

  const versions = {
    lifeos: readText(join(LIFEOS_DIR, "VERSION")),
    algorithm: readText(join(LIFEOS_DIR, "ALGORITHM", "LATEST")),
    system_prompt: frontmatterVersion(join(LIFEOS_DIR, "LIFEOS_SYSTEM_PROMPT.md")),
  };
  if (!versions.lifeos) errors.push("VERSION unreadable");

  let registry: any = null;
  const idx = readJson(join(SYSTEMUPDATES, "index.json"));
  if (idx) {
    registry = {
      last_updated: idx.last_updated ?? null,
      total_updates: idx.total_updates ?? null,
      by_significance: idx.by_significance ?? null,
      by_change_type: idx.by_change_type ?? null,
      recent: Array.isArray(idx.updates)
        ? idx.updates.slice(0, REGISTRY_SLICE).map((u: any) => ({
            timestamp: u.timestamp,
            title: u.title,
            significance: u.significance ?? u.impact ?? null,
            change_type: u.change_type ?? u.type ?? null,
            version: u.version ?? null,
            files: Array.isArray(u.files_affected) ? u.files_affected.length : 0,
          }))
        : [],
    };
  } else {
    errors.push("SYSTEMUPDATES/index.json unreadable");
  }

  const deploys = readJsonl(join(SYSTEMUPDATES, "deploys.jsonl"), DEPLOYS_SLICE);

  const lastRun = readJson(join(STATE_DIR, "integrity", "last-run.json"));
  const lastPass = readJson(join(STATE_DIR, "integrity", "last-pass.json"));
  const integrity = {
    last_run: lastRun ? { ts: lastRun.ts, exitCode: lastRun.exitCode, blocking: lastRun.blocking, info: lastRun.info } : null,
    last_pass: lastPass ? { ts: lastPass.ts, critical: lastPass.critical } : null,
    clean: lastRun ? lastRun.exitCode === 0 && (lastRun.blocking ?? 0) === 0 : null,
  };

  const driftNag = readJson(join(STATE_DIR, "version-drift-nag.json"));
  const drift = driftNag ? { ts: driftNag.ts, count: driftNag.count, tag: driftNag.tag } : null;

  return {
    generated_at: new Date().toISOString(),
    versions,
    registry,
    deploys,
    integrity,
    drift,
    errors,
  };
}

export function start(): void {
  state.running = true;
}

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  if (pathname !== "/api/ledger" && pathname !== "/api/ledger/") return null;
  if (req.method !== "GET") return new Response("method not allowed", { status: 405 });
  const now = Date.now();
  if (state.cache && state.cache.expiresAt > now) {
    return Response.json(state.cache.payload, { headers: { "X-Ledger-Cache": "hit" } });
  }
  const payload = compose();
  state.cache = { payload, expiresAt: now + CACHE_TTL_MS };
  return Response.json(payload);
}

export function health(): { running: boolean } {
  return { running: state.running };
}
