/**
 * Atlas Store — SQLite system of record for the LifeOS asset graph.
 *
 * Design (2026-07-21 cross-vendor audit):
 * - bun:sqlite, WAL, STRICT tables. No daemon; Pulse reads a redacted snapshot, never the live DB.
 * - Facts come only from collectors (source_observation per collector — never a singular source field).
 * - Sweep invariants: only a successful, enumeration-complete FULL run may mark a collector's
 *   observations unfresh; targeted runs are structurally incapable of expiring anything.
 * - No secret values, ever. Credential-class assets carry references only.
 *
 * DB lives OUTSIDE both git repos (~/.local/state/lifeos/atlas/).
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export const ATLAS_DIR = process.env.ATLAS_DIR ?? join(homedir(), ".local/state/lifeos/atlas");
export const DB_PATH = join(ATLAS_DIR, "atlas.db");
export const SNAPSHOT_PATH = join(ATLAS_DIR, "snapshot.json");
export const EVENTS_PATH = join(ATLAS_DIR, "events.jsonl");

/** Days without any fresh observation before an asset/edge transitions. */
const STALE_AFTER_DAYS = 2;
const EXPIRE_AFTER_DAYS = 14;

// ── Collector contract ────────────────────────────────────────────────

export interface AssetObs {
  kind: string;
  /** Canonical, provider-scoped key, e.g. "cloudflare:worker:mysite", "domain:example.com". */
  key: string;
  name: string;
  attrs?: Record<string, unknown>;
}

export interface EdgeObs {
  kind: string;
  srcKey: string;
  dstKey: string;
  /** Kinds used to auto-create shell assets when the endpoint isn't otherwise observed. */
  srcKind?: string;
  dstKind?: string;
  attrs?: Record<string, unknown>;
}

export interface CollectResult {
  /** True ONLY when enumeration finished with no errors/truncation. Gates sweeping. */
  complete: boolean;
  assets: AssetObs[];
  edges: EdgeObs[];
}

export interface Collector {
  name: string;
  collect(scope?: string): Promise<CollectResult>;
}

/**
 * Edge kinds that propagate operational failure (used by blast-radius).
 * HOLDS belongs here: an asset holding a credential breaks when that credential rotates,
 * so `blast credential:X` correctly returns everything that needs the new value.
 */
export const OPERATIONAL_EDGE_KINDS = ["SERVES", "ROUTE", "CALLS", "DEPENDS_ON", "RUNS_ON", "OWNS", "DEPLOYED_FROM", "HOLDS"];

// ── Store ─────────────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sync_run (
  id INTEGER PRIMARY KEY,
  collector TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'full',
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  complete INTEGER NOT NULL DEFAULT 0,
  stats TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS asset (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  canonical_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  attrs TEXT NOT NULL DEFAULT '{}'
) STRICT;
CREATE INDEX IF NOT EXISTS idx_asset_kind ON asset(kind);
CREATE TABLE IF NOT EXISTS source_observation (
  asset_id INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  collector TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  last_run_id INTEGER NOT NULL,
  fresh INTEGER NOT NULL DEFAULT 1,
  attrs TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (asset_id, collector)
) STRICT;
CREATE TABLE IF NOT EXISTS edge (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  src INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  dst INTEGER NOT NULL REFERENCES asset(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  attrs TEXT NOT NULL DEFAULT '{}',
  UNIQUE (kind, src, dst)
) STRICT;
CREATE TABLE IF NOT EXISTS edge_observation (
  edge_id INTEGER NOT NULL REFERENCES edge(id) ON DELETE CASCADE,
  collector TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  last_run_id INTEGER NOT NULL,
  fresh INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (edge_id, collector)
) STRICT;
CREATE TABLE IF NOT EXISTS lifecycle_event (
  id INTEGER PRIMARY KEY,
  asset_id INTEGER,
  event TEXT NOT NULL,
  at TEXT NOT NULL,
  detail TEXT
) STRICT;
`;

export class Store {
  db: Database;

  constructor(path: string = DB_PATH, opts: { readonly?: boolean } = {}) {
    mkdirSync(ATLAS_DIR, { recursive: true });
    this.db = new Database(path, opts.readonly ? { readonly: true } : { create: true });
    if (!opts.readonly) {
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA busy_timeout = 10000;");
      this.db.exec("PRAGMA foreign_keys = ON;");
      this.db.exec(SCHEMA);
    }
  }

  close() {
    this.db.close();
  }

  /** Apply one collector run in a single transaction. Sweeps only when eligible. */
  applyRun(collector: string, scope: string, result: CollectResult): { runId: number; swept: boolean } {
    const now = new Date().toISOString();
    const status = result.complete ? "success" : "partial";
    const insertRun = this.db.prepare(
      "INSERT INTO sync_run (collector, scope, started_at, finished_at, status, complete, stats) VALUES (?,?,?,?,?,?,?)",
    );
    const upsertAsset = this.db.prepare(`
      INSERT INTO asset (kind, canonical_key, display_name, first_observed_at, last_observed_at, status, attrs)
      VALUES ($kind, $key, $name, $now, $now, 'active', $attrs)
      ON CONFLICT(canonical_key) DO UPDATE SET
        display_name = $name, last_observed_at = $now, status = 'active',
        attrs = CASE WHEN $attrs != '{}' THEN $attrs ELSE asset.attrs END
      RETURNING id`);
    const upsertObs = this.db.prepare(`
      INSERT INTO source_observation (asset_id, collector, first_seen, last_seen, last_run_id, fresh, attrs)
      VALUES ($aid, $collector, $now, $now, $run, 1, $attrs)
      ON CONFLICT(asset_id, collector) DO UPDATE SET
        last_seen = $now, last_run_id = $run, fresh = 1, attrs = $attrs`);
    const upsertEdge = this.db.prepare(`
      INSERT INTO edge (kind, src, dst, first_observed_at, last_observed_at, status, attrs)
      VALUES ($kind, $src, $dst, $now, $now, 'active', $attrs)
      ON CONFLICT(kind, src, dst) DO UPDATE SET
        last_observed_at = $now, status = 'active', attrs = $attrs
      RETURNING id`);
    const upsertEdgeObs = this.db.prepare(`
      INSERT INTO edge_observation (edge_id, collector, first_seen, last_seen, last_run_id, fresh)
      VALUES ($eid, $collector, $now, $now, $run, 1)
      ON CONFLICT(edge_id, collector) DO UPDATE SET
        last_seen = $now, last_run_id = $run, fresh = 1`);

    let runId = 0;
    let swept = false;

    const tx = this.db.transaction(() => {
      runId = Number(
        insertRun.run(collector, scope, now, now, status, result.complete ? 1 : 0,
          JSON.stringify({ assets: result.assets.length, edges: result.edges.length })).lastInsertRowid,
      );

      const idFor = new Map<string, number>();
      const ensureAsset = (kind: string, key: string, name: string, attrs: Record<string, unknown> = {}): number => {
        const cached = idFor.get(key);
        if (cached) return cached;
        const row = upsertAsset.get({ $kind: kind, $key: key, $name: name, $now: now, $attrs: JSON.stringify(attrs) }) as { id: number };
        idFor.set(key, row.id);
        return row.id;
      };

      for (const a of result.assets) {
        const aid = ensureAsset(a.kind, a.key, a.name, a.attrs ?? {});
        upsertObs.run({ $aid: aid, $collector: collector, $now: now, $run: runId, $attrs: JSON.stringify(a.attrs ?? {}) });
      }
      for (const e of result.edges) {
        const src = ensureAsset(e.srcKind ?? "unknown", e.srcKey, e.srcKey.split(":").pop() ?? e.srcKey);
        const dst = ensureAsset(e.dstKind ?? "unknown", e.dstKey, e.dstKey.split(":").pop() ?? e.dstKey);
        // A shell endpoint is still an observation by this collector.
        upsertObs.run({ $aid: src, $collector: collector, $now: now, $run: runId, $attrs: "{}" });
        upsertObs.run({ $aid: dst, $collector: collector, $now: now, $run: runId, $attrs: "{}" });
        const row = upsertEdge.get({ $kind: e.kind, $src: src, $dst: dst, $now: now, $attrs: JSON.stringify(e.attrs ?? {}) }) as { id: number };
        upsertEdgeObs.run({ $eid: row.id, $collector: collector, $now: now, $run: runId });
      }

      // SWEEP GATE — the only path that can un-fresh observations.
      if (result.complete && scope === "full") {
        this.db.prepare("UPDATE source_observation SET fresh = 0 WHERE collector = ? AND last_run_id != ?").run(collector, runId);
        this.db.prepare("UPDATE edge_observation SET fresh = 0 WHERE collector = ? AND last_run_id != ?").run(collector, runId);
        swept = true;
      }

      this.deriveStatuses(now);
    });
    tx();
    return { runId, swept };
  }

  /** Canonical lifecycle derives from ALL observations: active if ANY fresh; stale/expired by age. */
  private deriveStatuses(now: string) {
    const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 864e5).toISOString();
    const expireCutoff = new Date(Date.now() - EXPIRE_AFTER_DAYS * 864e5).toISOString();
    const transitions = this.db.prepare(`
      SELECT a.id, a.status AS old, a.display_name,
        CASE
          WHEN EXISTS (SELECT 1 FROM source_observation o WHERE o.asset_id = a.id AND o.fresh = 1) THEN 'active'
          WHEN a.last_observed_at < ? THEN 'expired'
          WHEN a.last_observed_at < ? THEN 'stale'
          ELSE a.status
        END AS new
      FROM asset a`).all(expireCutoff, staleCutoff) as Array<{ id: number; old: string; display_name: string; new: string }>;
    const setStatus = this.db.prepare("UPDATE asset SET status = ? WHERE id = ?");
    const logEvent = this.db.prepare("INSERT INTO lifecycle_event (asset_id, event, at, detail) VALUES (?,?,?,?)");
    for (const t of transitions) {
      if (t.old !== t.new) {
        setStatus.run(t.new, t.id);
        logEvent.run(t.id, `${t.old}->${t.new}`, now, t.display_name);
      }
    }
    this.db.exec(`
      UPDATE edge SET status = CASE
        WHEN EXISTS (SELECT 1 FROM edge_observation o WHERE o.edge_id = edge.id AND o.fresh = 1) THEN 'active'
        ELSE 'stale' END`);
  }

  // ── Queries ─────────────────────────────────────────────────────────

  assetByKey(key: string) {
    return this.db.prepare("SELECT * FROM asset WHERE canonical_key = ?").get(key) as Record<string, unknown> | null;
  }

  /** Everything reachable from `key` via outbound OWNS edges (what deleting it orphans/destroys). */
  owns(key: string) {
    return this.db.prepare(`
      WITH RECURSIVE reach(id) AS (
        SELECT id FROM asset WHERE canonical_key = ?
        UNION
        SELECT e.dst FROM edge e JOIN reach r ON e.src = r.id WHERE e.kind = 'OWNS' AND e.status = 'active'
      )
      SELECT a.kind, a.canonical_key, a.display_name, a.status FROM asset a
      JOIN reach r ON a.id = r.id WHERE a.canonical_key != ?`).all(key, key) as Array<Record<string, unknown>>;
  }

  /** Inbound blast radius: what operationally relies on `key`, directly or transitively. */
  blast(key: string) {
    const kinds = OPERATIONAL_EDGE_KINDS.map(() => "?").join(",");
    return this.db.prepare(`
      WITH RECURSIVE reach(id) AS (
        SELECT id FROM asset WHERE canonical_key = ?
        UNION
        SELECT e.src FROM edge e JOIN reach r ON e.dst = r.id
        WHERE e.kind IN (${kinds}) AND e.status = 'active'
      )
      SELECT a.kind, a.canonical_key, a.display_name, a.status FROM asset a
      JOIN reach r ON a.id = r.id WHERE a.canonical_key != ?`)
      .all(key, ...OPERATIONAL_EDGE_KINDS, key) as Array<Record<string, unknown>>;
  }

  /**
   * Credential exposure: which credentials `key` holds, directly or through what it owns.
   * The incident-response direction — "this asset is compromised, what did it leak?" — as
   * opposed to blast(), which answers "what breaks if I rotate this?". Traversal follows
   * OWNS (a compromised host owns its services) and HOLDS (the thing that stores a secret).
   */
  exposed(key: string) {
    return this.db.prepare(`
      WITH RECURSIVE reach(id) AS (
        SELECT id FROM asset WHERE canonical_key = ?
        UNION
        SELECT e.dst FROM edge e JOIN reach r ON e.src = r.id
        WHERE e.kind IN ('OWNS','HOLDS') AND e.status = 'active'
      )
      SELECT a.kind, a.canonical_key, a.display_name, a.status, a.attrs FROM asset a
      JOIN reach r ON a.id = r.id
      WHERE a.canonical_key != ? AND a.kind = 'credential'`).all(key, key) as Array<Record<string, unknown>>;
  }

  stale() {
    return this.db.prepare(
      "SELECT kind, canonical_key, display_name, status, last_observed_at FROM asset WHERE status != 'active' ORDER BY last_observed_at",
    ).all() as Array<Record<string, unknown>>;
  }

  /** Domains something actively SERVES but no security-plane target MONITORS (Bunker registration gap). */
  unregistered() {
    return this.db.prepare(`
      SELECT a.kind, a.canonical_key, a.display_name,
        (SELECT s.display_name FROM edge e2 JOIN asset s ON e2.src = s.id
         WHERE e2.dst = a.id AND e2.kind = 'SERVES' AND e2.status = 'active' LIMIT 1) AS served_by
      FROM asset a
      WHERE a.kind = 'domain' AND a.status = 'active'
        AND a.canonical_key NOT LIKE '%.workers.dev'
        AND EXISTS (
          SELECT 1 FROM edge e WHERE e.dst = a.id AND e.kind = 'SERVES' AND e.status = 'active')
        AND NOT EXISTS (
          SELECT 1 FROM edge e JOIN asset t ON e.src = t.id
          WHERE e.dst = a.id AND e.kind = 'MONITORS' AND t.kind = 'target' AND e.status = 'active')
      ORDER BY a.canonical_key`).all() as Array<Record<string, unknown>>;
  }

  status() {
    const collectors = this.db.prepare(`
      SELECT collector, MAX(finished_at) AS last_run,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successes, COUNT(*) AS runs
      FROM sync_run GROUP BY collector ORDER BY collector`).all();
    const assets = this.db.prepare(
      "SELECT kind, status, COUNT(*) AS n FROM asset GROUP BY kind, status ORDER BY kind",
    ).all();
    const totals = this.db.prepare(
      "SELECT (SELECT COUNT(*) FROM asset) AS assets, (SELECT COUNT(*) FROM edge WHERE status='active') AS edges",
    ).get();
    return { collectors, assets, totals };
  }

  /** Deterministic structural metrics — the factual half of the Insights tab (no inference). */
  insights() {
    const one = (sql: string, ...args: unknown[]) =>
      (this.db.prepare(sql).get(...(args as never[])) as Record<string, number>) ?? {};
    const all = (sql: string) => this.db.prepare(sql).all() as Array<Record<string, unknown>>;

    return {
      census: all("SELECT kind, COUNT(*) AS n FROM asset WHERE status='active' GROUP BY kind ORDER BY n DESC"),
      edge_census: all("SELECT kind, COUNT(*) AS n FROM edge WHERE status='active' GROUP BY kind ORDER BY n DESC"),
      // Operation: workers with NO invocation path at all — not served (custom domain
      // or workers.dev), not routed, not called by another worker, no cron, no queue.
      // This is the real "dead deploy" signal; a missing custom-domain alone is NOT.
      unwired_workers: one(`
        SELECT COUNT(*) AS n FROM asset a
        WHERE a.kind='worker' AND a.status='active'
          AND json_extract(a.attrs,'$.workers_dev') IS NOT 1
          AND json_extract(a.attrs,'$.cron') IS NOT 1
          AND json_extract(a.attrs,'$.queue_consumer') IS NOT 1
          AND NOT EXISTS (SELECT 1 FROM edge e WHERE e.src=a.id AND e.kind IN ('SERVES','ROUTE') AND e.status='active')
          AND NOT EXISTS (SELECT 1 FROM edge e WHERE e.dst=a.id AND e.kind='CALLS' AND e.status='active')`).n,
      // How workers are actually wired — the honest breakdown.
      worker_wiring: {
        total: one("SELECT COUNT(*) AS n FROM asset WHERE kind='worker' AND status='active'").n,
        served: one("SELECT COUNT(DISTINCT src) AS n FROM edge e JOIN asset a ON e.src=a.id WHERE a.kind='worker' AND e.kind IN ('SERVES','ROUTE') AND e.status='active'").n,
        workers_dev: one("SELECT COUNT(*) AS n FROM asset WHERE kind='worker' AND status='active' AND json_extract(attrs,'$.workers_dev')=1").n,
        cron: one("SELECT COUNT(*) AS n FROM asset WHERE kind='worker' AND status='active' AND json_extract(attrs,'$.cron')=1").n,
        service_binding_target: one("SELECT COUNT(DISTINCT dst) AS n FROM edge WHERE kind='CALLS' AND status='active'").n,
      },
      // Operation: live projects with no repo edge — provenance gap.
      projects_no_repo: one(
        "SELECT COUNT(*) AS n FROM asset a WHERE a.kind='project' AND a.status='active' AND NOT EXISTS (SELECT 1 FROM edge e WHERE e.src=a.id AND e.kind='DEPLOYED_FROM')",
      ).n,
      // Interconnection: zones ranked by what they own — the blast-radius map.
      blast_zones: all(
        "SELECT s.display_name AS zone, COUNT(*) AS owns FROM edge e JOIN asset s ON e.src=s.id WHERE e.kind='OWNS' AND s.kind='domain' AND e.status='active' GROUP BY s.id ORDER BY owns DESC LIMIT 8",
      ),
      // Data-store sprawl.
      data_stores: all(
        "SELECT kind, COUNT(*) AS n FROM asset WHERE kind IN ('d1_database','r2_bucket','kv_namespace') AND status='active' GROUP BY kind",
      ),
      // Security: domains served but with no curated auth-boundary target (see unregistered() semantics).
      auth_curation_gaps: this.unregistered().length,
      // Security: multi-tenant/auth-bearing targets present, for context on what SHOULD be curated.
      curated_targets: one("SELECT COUNT(*) AS n FROM asset WHERE kind='target' AND status='active'").n,
      stale: one("SELECT COUNT(*) AS n FROM asset WHERE status!='active'").n,
      totals: this.status().totals,
    };
  }

  /** Redacted snapshot for Pulse — credential-class assets are summarized, attrs stripped. */
  exportSnapshot(): Record<string, unknown> {
    const assets = (this.db.prepare(
      "SELECT id, kind, canonical_key, display_name, status, first_observed_at, last_observed_at, attrs FROM asset",
    ).all() as Array<Record<string, unknown>>).map((a) => ({
      ...a,
      attrs: a.kind === "credential" ? "{}" : a.attrs,
    }));
    const edges = this.db.prepare("SELECT kind, src, dst, status FROM edge").all();
    const observations = this.db.prepare(
      "SELECT asset_id, collector, fresh, last_seen FROM source_observation",
    ).all();
    const lifecycle = this.db.prepare(
      "SELECT asset_id, event, at, detail FROM lifecycle_event ORDER BY id DESC LIMIT 50",
    ).all();
    const unregistered = this.unregistered();
    return { assets, edges, observations, lifecycle, unregistered, status: this.status(), generated_at: new Date().toISOString() };
  }
}
