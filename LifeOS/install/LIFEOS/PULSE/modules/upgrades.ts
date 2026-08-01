// Normalize env path vars Claude Code may inject unexpanded — literal $HOME/${HOME}
// in LIFEOS_DIR/LIFEOS_CONFIG_DIR/PROJECTS_DIR resolves to a shadow dir (#1404 / PR #1451, author jbmml).
for (const __k of ["LIFEOS_DIR", "LIFEOS_CONFIG_DIR", "PROJECTS_DIR"]) {
  const __v = process.env[__k];
  if (__v && /^\$\{?HOME\}?(\/|$)/.test(__v)) process.env[__k] = __v.replace(/^\$\{?HOME\}?/, process.env.HOME ?? "~");
}

/**
 * Upgrades — Pulse API module for the unified system-improvement queue.
 *
 * ONE queue, five sources, one lifecycle. Merges:
 *   1. Upgrade records — LIFEOS/MEMORY/UPGRADES/records/*.md, written by
 *      Upgrades.ts (directive/correction capture via SatisfactionCapture,
 *      Upgrade-skill scans, /algo runs, manual adds)
 *   2. Pending deriver hypotheses — WISDOM/FRAMES/_hypotheses/*.md, mapped in
 *      as source=autonomous (the deriver's format is unchanged; accept/reject
 *      proxy to the hypotheses module's graduate/reject, so PromoteFixture
 *      and frame-graduation behavior is identical to the old /hypotheses tab)
 *
 * Doctrine constraint ({{PRINCIPAL_NAME}}, 2026-05-08): Pulse reads clean sources only —
 * USER/ or MEMORY/, nothing hard-coded. Every byte served comes from files.
 *
 * Routes:
 *   GET  /api/upgrades                    → { recommended, implemented, closed, stats }
 *   GET  /api/upgrades/:id                → full record (hyp:<slug> for hypotheses)
 *   POST /api/upgrades/:id/accept         → accept (hypothesis → graduate)
 *   POST /api/upgrades/:id/reject         → reject
 */

import {
  listUpgrades,
  getUpgrade,
  setStatus,
  expireSweep,
  type UpgradeRecord,
} from "../../TOOLS/Upgrades";
import { listPending, graduateHypothesis, rejectHypothesis } from "./hypotheses";

const MODULE = "upgrades";
const HYP_PREFIX = "hyp:";

interface QueueItem {
  id: string;                  // upgrade id, or "hyp:<slug>" for deriver hypotheses
  claim: string;
  source: string;              // directive | correction | upgrade-skill | algo-run | autonomous | manual
  status: string;
  created: string;
  expires_in_days: number | null;
  confidence: number;
  target_surface: string;
  evidence_count: number;
  ledger_id: string | null;
  has_patch: boolean;          // autonomous healing-fixture hypotheses only
  recommendation: string;
}

function fromRecord(r: UpgradeRecord): QueueItem {
  const expMs = r.expires ? new Date(r.expires).getTime() : 0;
  return {
    id: r.id,
    claim: r.claim,
    source: r.source,
    status: r.status,
    created: r.created,
    expires_in_days: r.status === "recommended" && expMs > 0 ? Math.round((expMs - Date.now()) / 86400000) : null,
    confidence: r.confidence ?? 0.5,
    target_surface: r.target_surface ?? "unknown",
    evidence_count: (r.evidence ?? []).length,
    ledger_id: r.ledger_id,
    has_patch: false,
    recommendation: r.recommendation ?? "",
  };
}

function fromHypothesis(h: ReturnType<typeof listPending>[number]): QueueItem {
  return {
    id: `${HYP_PREFIX}${h.slug}`,
    claim: h.claim || h.slug,
    source: "autonomous",
    status: "recommended",
    created: h.generated,
    expires_in_days: h.expires_in_days,
    confidence: h.confidence,
    target_surface: h.enforcement_surface || "context",
    evidence_count: h.evidence_signals.length,
    ledger_id: null,
    has_patch: h.has_patch,
    recommendation: h.suggested_action || "",
  };
}

function buildQueue(): { recommended: QueueItem[]; implemented: QueueItem[]; closed: QueueItem[] } {
  const records = listUpgrades();
  const hyps = listPending().map(fromHypothesis);

  const recommended = [
    ...records.filter((r) => r.status === "recommended" || r.status === "accepted").map(fromRecord),
    ...hyps,
  ].sort((a, b) => b.created.localeCompare(a.created));

  const implemented = records
    .filter((r) => r.status === "applied" || r.status === "verified")
    .map(fromRecord)
    .sort((a, b) => b.created.localeCompare(a.created));

  const closed = records
    .filter((r) => r.status === "rejected" || r.status === "expired")
    .map(fromRecord)
    .sort((a, b) => b.created.localeCompare(a.created));

  return { recommended, implemented, closed };
}

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function handleRequest(req: Request, pathname: string): Promise<Response | null> {
  if (pathname === "/api/upgrades" && req.method === "GET") {
    // Opportunistic TTL sweep keeps the queue honest without a cron.
    try { expireSweep(); } catch {}
    const q = buildQueue();
    const bySource = q.recommended.reduce<Record<string, number>>(
      (acc, i) => ((acc[i.source] = (acc[i.source] ?? 0) + 1), acc), {});
    return jsonResponse({ ...q, stats: { pending: q.recommended.length, implemented: q.implemented.length, closed: q.closed.length, by_source: bySource } });
  }

  const detail = pathname.match(/^\/api\/upgrades\/([^/]+)$/);
  const action = pathname.match(/^\/api\/upgrades\/([^/]+)\/(accept|reject)$/);

  if (detail && req.method === "GET") {
    const id = decodeURIComponent(detail[1]);
    if (id.startsWith(HYP_PREFIX)) {
      const h = listPending().find((x) => x.slug === id.slice(HYP_PREFIX.length));
      return h ? jsonResponse({ ...fromHypothesis(h), falsifier: h.falsifier, evidence_signals: h.evidence_signals, raw_body: h.raw_body, proposed_patch: h.proposed_patch }) : jsonResponse({ error: "not_found" }, 404);
    }
    const r = getUpgrade(id);
    return r ? jsonResponse(r) : jsonResponse({ error: "not_found" }, 404);
  }

  if (action && req.method === "POST") {
    const id = decodeURIComponent(action[1]);
    const verb = action[2] as "accept" | "reject";
    let note: string | undefined;
    try { note = ((await req.json()) as { note?: string })?.note; } catch {}

    if (id.startsWith(HYP_PREFIX)) {
      const slug = id.slice(HYP_PREFIX.length);
      const res = verb === "accept" ? graduateHypothesis(slug, note) : rejectHypothesis(slug, note);
      return jsonResponse(res, res.ok ? 200 : res.reason === "not_found" ? 404 : 409);
    }
    const res = setStatus(id, verb === "accept" ? "accepted" : "rejected", { note });
    return jsonResponse(res, res.ok ? 200 : res.reason === "not_found" ? 404 : 409);
  }

  return null;
}

export function start() {
  void MODULE; // read-on-demand module, no background polling
}
