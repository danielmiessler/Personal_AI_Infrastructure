/**
 * Cloudflare collector — workers, zones, DNS records, worker custom domains, KV/R2/D1.
 * Reads CLOUDFLARE_API_TOKEN from ~/.claude/.env (Authorization header only, never URLs).
 * complete=true only when every page of every listing succeeded.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AssetObs, CollectResult, Collector, EdgeObs } from "../Store";

const API = "https://api.cloudflare.com/client/v4";

/** Token, or null when there is no .env / no token in it (absent source). */
function token(): string | null {
  const envPath = join(homedir(), ".claude/.env");
  if (!existsSync(envPath)) return null;
  const env = readFileSync(envPath, "utf8");
  const m = env.match(/^CLOUDFLARE_API_TOKEN=["']?([^"'\n]+)/m);
  return m ? m[1] : null;
}

async function cf(path: string, tok: string): Promise<unknown[]> {
  const out: unknown[] = [];
  let page = 1;
  for (;;) {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${API}${path}${sep}per_page=50&page=${page}`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) throw new Error(`CF ${path} -> ${res.status}`);
    const body = (await res.json()) as {
      success: boolean;
      result: unknown[];
      result_info?: { page: number; total_pages?: number };
    };
    if (!body.success) throw new Error(`CF ${path} success=false`);
    // Some endpoints (e.g. r2/buckets) wrap the list in an object instead of an array.
    if (Array.isArray(body.result)) out.push(...body.result);
    else if (body.result) return [body.result];
    const info = body.result_info;
    if (!info?.total_pages || info.page >= info.total_pages) return out;
    page++;
  }
}

/** Single-object GET (settings, subdomain, schedules). Returns null on any non-OK. */
async function cfOne(path: string, tok: string): Promise<any | null> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${tok}` } });
  if (!res.ok) return null;
  const body = (await res.json()) as { success: boolean; result: unknown };
  return body.success ? body.result : null;
}

/**
 * Degrading wrapper around cf() for listing calls that can legitimately hit a
 * token-scope gap (a narrowly-scoped CLOUDFLARE_API_TOKEN throws on
 * workers/routes 403, then storage/kv/namespaces 401, discarding everything
 * already gathered each time). One missing permission on one resource type must
 * degrade that signal only, never the whole collector — matches Atlas's own
 * doctrine ("a partial page, an API error → PARTIAL run, no sweep, prior state
 * intact"), which the bare cf() calls didn't actually implement for this failure
 * class. Sets `partial` via the caller-owned flag so the run reports incomplete
 * (never sweeps) instead of claiming success over data it couldn't fully see.
 *
 * ported from public PR #1744, @schmetti-dev
 */
async function cfSoft(path: string, tok: string, label: string, onFail: () => void): Promise<unknown[]> {
  try {
    return await cf(path, tok);
  } catch (err) {
    onFail();
    console.error(`[cloudflare] ${label} failed: ${(err as Error).message}`);
    return [];
  }
}

/** Bounded-concurrency map — keeps the per-worker fan-out from hammering the API. */
async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

/** A worker binding as returned by the script settings endpoint. Values are never present. */
interface Binding {
  type: string;
  name?: string;
  service?: string;
  id?: string;
  namespace_id?: string;
  bucket_name?: string;
  database_id?: string;
}

/** Resolve a data-store binding to the Atlas asset it points at, or null if it isn't one. */
function datastoreTarget(b: Binding, d1ByUuid: Map<string, string>): { key: string; kind: string } | null {
  if (b.type === "kv_namespace" && b.namespace_id) return { key: `cloudflare:kv:${b.namespace_id}`, kind: "kv_namespace" };
  if (b.type === "r2_bucket" && b.bucket_name) return { key: `cloudflare:r2:${b.bucket_name}`, kind: "r2_bucket" };
  if (b.type === "d1" || b.type === "d1_database") {
    // Bindings carry the uuid; the asset is keyed by name. An unmapped uuid means the
    // database listing didn't include it — skip rather than invent a key.
    const uuid = b.id ?? b.database_id;
    const name = uuid ? d1ByUuid.get(uuid) : undefined;
    if (name) return { key: `cloudflare:d1:${name}`, kind: "d1_database" };
  }
  return null;
}

export const cloudflare: Collector = {
  name: "cloudflare",
  async collect(): Promise<CollectResult> {
  // Absent source ⇒ degrade, never throw (ratchet gate 3). `atlas sync` runs
  // every collector and turns the failure count into its exit code, so throwing
  // because this machine simply lacks the source makes sync exit non-zero forever
  // on most public installs. A source that EXISTS but is malformed still throws.
    const tok = token();
    if (tok === null) return { complete: false, assets: [], edges: [] };
    const assets: AssetObs[] = [];
    const edges: EdgeObs[] = [];
    // Set when a per-zone/per-resource call fails on a token-scope gap rather than
    // a wholesale outage — everything gathered so far (and after) is still real
    // and worth writing, but the run can't claim enumeration-complete, so it must
    // never sweep (Store.applyRun's gate). A throw here would discard the WHOLE
    // collector's output (zones/DNS/workers/KV/R2/D1) over one missing permission
    // on one zone: a token lacking "Workers Routes:Read" turns a single zone's
    // routes lookup into a total loss instead of a partial one.
    let partial = false;

    const accounts = (await cf("/accounts", tok)) as Array<{ id: string; name: string }>;
    const acct = accounts[0];
    if (!acct) throw new Error("no CF account visible to token");

    // Account workers.dev subdomain — the host suffix for every workers.dev-enabled script.
    const sub = (await cfOne(`/accounts/${acct.id}/workers/subdomain`, tok)) as { subdomain?: string } | null;
    const wdevSuffix = sub?.subdomain ? `${sub.subdomain}.workers.dev` : null;

    const zones = (await cf("/zones", tok)) as Array<{ id: string; name: string; status: string }>;
    for (const z of zones) {
      assets.push({ kind: "domain", key: `domain:${z.name}`, name: z.name, attrs: { is_zone: true, zone_status: z.status } });
      // Zone worker ROUTES (pattern-based, not custom domains) — a real serving path.
      // Token-scope gaps are per-zone (a token can be scoped to some zones' Workers
      // Routes permission and not others), so one zone's 403 degrades only this
      // signal for that zone, never the rest of the collector.
      const routes = (await cfSoft(`/zones/${z.id}/workers/routes`, tok, `routes lookup for zone ${z.name}`, () => { partial = true; })) as Array<{ pattern: string; script?: string }>;
      for (const rt of routes) {
        if (!rt.script) continue;
        const host = rt.pattern.replace(/^https?:\/\//, "").split("/")[0].replace(/^\*\./, "");
        if (host) edges.push({ kind: "ROUTE", srcKey: `cloudflare:worker:${rt.script}`, dstKey: `domain:${host}`, srcKind: "worker", dstKind: "domain" });
      }
      const records = (await cfSoft(`/zones/${z.id}/dns_records`, tok, `DNS records for zone ${z.name}`, () => { partial = true; })) as Array<{ type: string; name: string; content: string; proxied?: boolean }>;
      for (const r of records) {
        const key = `dns:${z.name}/${r.type}/${r.name}`;
        assets.push({ kind: "dns_record", key, name: `${r.type} ${r.name}`, attrs: { content: r.content, proxied: r.proxied ?? false } });
        edges.push({ kind: "OWNS", srcKey: `domain:${z.name}`, dstKey: key, srcKind: "domain", dstKind: "dns_record" });
        if (r.name !== z.name && r.name.endsWith(`.${z.name}`)) {
          assets.push({ kind: "domain", key: `domain:${r.name}`, name: r.name, attrs: { is_zone: false } });
          edges.push({ kind: "OWNS", srcKey: `domain:${z.name}`, dstKey: `domain:${r.name}`, srcKind: "domain", dstKind: "domain" });
        }
      }
    }

    const kv = (await cfSoft(`/accounts/${acct.id}/storage/kv/namespaces`, tok, "KV namespaces", () => { partial = true; })) as Array<{ id: string; title: string }>;
    for (const ns of kv) assets.push({ kind: "kv_namespace", key: `cloudflare:kv:${ns.id}`, name: ns.title });

    const r2 = (await cfSoft(`/accounts/${acct.id}/r2/buckets`, tok, "R2 buckets", () => { partial = true; })) as Array<{ name?: string; buckets?: Array<{ name: string }> }>;
    // Endpoint wraps the list: result = { buckets: [...] } → cf() returns [wrapper].
    const buckets = r2.flatMap((item) => (item.buckets ? item.buckets : item.name ? [{ name: item.name }] : []));
    for (const b of buckets) assets.push({ kind: "r2_bucket", key: `cloudflare:r2:${b.name}`, name: b.name });

    const d1 = (await cfSoft(`/accounts/${acct.id}/d1/database`, tok, "D1 databases", () => { partial = true; })) as Array<{ uuid: string; name: string }>;
    for (const db of d1) assets.push({ kind: "d1_database", key: `cloudflare:d1:${db.name}`, name: db.name, attrs: { uuid: db.uuid } });

    // D1 assets are keyed by NAME but bindings reference the uuid — map it before the
    // worker loop so a binding can be resolved to the asset it actually points at.
    const d1ByUuid = new Map(d1.map((db) => [db.uuid, db.name]));

    const workers = (await cfSoft(`/accounts/${acct.id}/workers/scripts`, tok, "worker scripts", () => { partial = true; })) as Array<{ id: string; modified_on?: string }>;
    // Per-worker wiring: cron schedules, workers.dev enablement, and bindings
    // (service → CALLS edge, queue → consumer flag). Bounded fan-out.
    await mapPool(workers, 8, async (w) => {
      const [sched, settings, subdomain] = await Promise.all([
        cfOne(`/accounts/${acct.id}/workers/scripts/${w.id}/schedules`, tok),
        cfOne(`/accounts/${acct.id}/workers/scripts/${w.id}/settings`, tok),
        cfOne(`/accounts/${acct.id}/workers/scripts/${w.id}/subdomain`, tok),
      ]);
      const cron = Array.isArray(sched?.schedules) && sched.schedules.length > 0;
      const workersDev = subdomain?.enabled === true;
      const bindings = (settings?.bindings ?? []) as Binding[];
      const queueConsumer = bindings.some((b) => b.type === "queue");

      assets.push({
        kind: "worker",
        key: `cloudflare:worker:${w.id}`,
        name: w.id,
        attrs: { modified_on: w.modified_on ?? null, cron, workers_dev: workersDev, queue_consumer: queueConsumer },
      });
      // A worker on workers.dev is reachable there — record it as a served host.
      if (workersDev && wdevSuffix) {
        const host = `${w.id}.${wdevSuffix}`;
        assets.push({ kind: "domain", key: `domain:${host}`, name: host, attrs: { workers_dev: true } });
        edges.push({ kind: "SERVES", srcKey: `cloudflare:worker:${w.id}`, dstKey: `domain:${host}`, srcKind: "worker", dstKind: "domain" });
      }
      // Service bindings: this worker CALLS the bound service worker.
      // secret_text bindings: this worker HOLDS that credential. Cloudflare's own settings
      // response is the AUTHORITY for which secrets a deployed worker carries — source
      // grepping misses everything pushed via `wrangler secret put`, which is most of it.
      // Names only; the API never returns secret values.
      for (const b of bindings) {
        if (b.type === "service" && b.service) {
          edges.push({ kind: "CALLS", srcKey: `cloudflare:worker:${w.id}`, dstKey: `cloudflare:worker:${b.service}`, srcKind: "worker", dstKind: "worker" });
        }
        if (b.type === "secret_text" && b.name) {
          // Emit the credential ASSET too, not just the edge. An edge alone makes the store
          // auto-create an attribute-less stub, so a deployed-only secret lands in the graph
          // with no vendor, no provenance, and no way to tell "we know nothing about this"
          // from "nobody has judged its blast radius yet". Only DERIVED facts go here —
          // priority stays absent until a human classifies it in RegistryOverlay.md, because
          // inventing a severity is worse than admitting the gap. A registry-classified key
          // overwrites this in the secrets collector.
          assets.push({
            kind: "credential",
            key: `credential:${b.name}`,
            name: b.name,
            attrs: { vendor: "Cloudflare", classification: "worker secret (deployed only, not in the env file)" },
          });
          edges.push({ kind: "HOLDS", srcKey: `cloudflare:worker:${w.id}`, dstKey: `credential:${b.name}`, srcKind: "worker", dstKind: "credential" });
        }
        // Data-store bindings: this worker DEPENDS_ON the store it can read and write.
        // Without these, `blast` on a D1/R2/KV returned empty and a data blast radius
        // was invisible — the whole point of asking "what does compromising this reach".
        const store = datastoreTarget(b, d1ByUuid);
        if (store) {
          edges.push({ kind: "DEPENDS_ON", srcKey: `cloudflare:worker:${w.id}`, dstKey: store.key, srcKind: "worker", dstKind: store.kind, attrs: { binding: b.name ?? null } });
        }
      }
    });

    const wDomains = (await cfSoft(`/accounts/${acct.id}/workers/domains`, tok, "worker custom domains", () => { partial = true; })) as Array<{ hostname: string; service: string; zone_name: string }>;
    for (const d of wDomains) {
      assets.push({ kind: "domain", key: `domain:${d.hostname}`, name: d.hostname, attrs: { is_zone: false, worker_custom_domain: true } });
      edges.push({ kind: "SERVES", srcKey: `cloudflare:worker:${d.service}`, dstKey: `domain:${d.hostname}`, srcKind: "worker", dstKind: "domain" });
      if (d.zone_name && d.hostname !== d.zone_name) {
        edges.push({ kind: "OWNS", srcKey: `domain:${d.zone_name}`, dstKey: `domain:${d.hostname}`, srcKind: "domain", dstKind: "domain" });
      }
    }

    return { complete: !partial, assets, edges };
  },
};
