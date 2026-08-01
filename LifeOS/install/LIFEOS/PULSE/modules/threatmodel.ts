/**
 * ThreatModel Pulse module — read-only surface over the private risk register.
 *
 * Routes:
 *   GET /api/threatmodel        → register posture: counts by level/status,
 *                                 overdue-review count, and per-risk summaries
 *                                 (id, title, level, score, status, assets,
 *                                 data_classes, owner, review_by) — NO history,
 *                                 NO notes, NO free-text beyond title/threat.
 *
 * Holds ZERO truth: reads the register JSON written by
 * skills/ThreatModel/Tools/RiskRegister.ts. The register itself stores no secret
 * values (credential references by name only); this module additionally strips
 * history and notes so the browser payload stays a posture summary, not the raw
 * record. Data dir is the private USER tree, never bundled into the client.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MODULE_NAME = "threatmodel";
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
const DATA_DIR =
  process.env.THREATMODEL_DATA_DIR ||
  join(CLAUDE_DIR, "LIFEOS", "USER", "SECURITY", "THREATMODEL");
const REGISTER_PATH = join(DATA_DIR, "risk-register.json");

const LEVELS = ["Critical", "High", "Medium", "Low"] as const;
const STATUSES = ["open", "mitigating", "accepted", "closed"] as const;

const CACHE_MS = 15_000;
const state: { running: boolean; cached: string | null; cachedAt: number } = {
  running: false,
  cached: null,
  cachedAt: 0,
};

export function start() {
  state.running = true;
}

export function health() {
  return {
    module: MODULE_NAME,
    running: state.running,
    register_present: existsSync(REGISTER_PATH),
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Strip each risk down to a posture summary — no history, no notes. */
function summarize(r: any) {
  return {
    id: r.id,
    title: r.title,
    threat: r.threat,
    level: r.level,
    score: r.score,
    likelihood: r.likelihood,
    impact: r.impact,
    status: r.status,
    assets: r.assets ?? [],
    data_classes: r.data_classes ?? [],
    owner: r.owner ?? "",
    response: r.response ?? "",
    review_by: r.review_by ?? "",
    overdue: r.status !== "closed" && (!r.review_by || r.review_by <= today()),
  };
}

export async function handleRequest(_req: Request, pathname: string): Promise<Response | null> {
  if (pathname !== "/api/threatmodel") return null;

  const now = Date.now();
  if (state.cached && now - state.cachedAt < CACHE_MS) {
    return new Response(state.cached, { headers: { "Content-Type": "application/json" } });
  }

  if (!existsSync(REGISTER_PATH)) {
    return Response.json({
      available: false,
      error: "no risk register — run: bun ~/.claude/skills/ThreatModel/Tools/RiskRegister.ts init",
    });
  }

  try {
    const store = JSON.parse(readFileSync(REGISTER_PATH, "utf8"));
    const risks: any[] = store.risks ?? [];
    const open = risks.filter((r) => r.status !== "closed");
    const byLevel = Object.fromEntries(
      LEVELS.map((l) => [l, open.filter((r) => r.level === l).length]),
    );
    const byStatus = Object.fromEntries(
      STATUSES.map((s) => [s, risks.filter((r) => r.status === s).length]),
    );
    const summaries = risks.map(summarize).sort((a, b) => b.score - a.score);
    const overdue = summaries.filter((r) => r.status !== "closed" && r.overdue).length;

    // Traffic-light grade for the card face: red if any open Critical, orange
    // if any open High or anything overdue, green otherwise.
    const grade =
      byLevel.Critical > 0 ? "red" : byLevel.High > 0 || overdue > 0 ? "orange" : "green";

    const body = JSON.stringify({
      available: true,
      register_age_ms: now - statSync(REGISTER_PATH).mtimeMs,
      updated: store.updated ?? null,
      grade,
      total: risks.length,
      open: open.length,
      overdue_review: overdue,
      byLevel,
      byStatus,
      risks: summaries,
    });
    state.cached = body;
    state.cachedAt = now;
    return new Response(body, { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return Response.json({ available: false, error: String(err) });
  }
}
