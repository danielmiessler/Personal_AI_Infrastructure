/**
 * Apple Health source module — reads the JSON file exported by the iPhone
 * Shortcut "LifeOS Health Export" into iCloud Drive (Shortcuts/PAI/).
 * Path contract is duplicated in LIFEOS/USER/HEALTH/SHORTCUT_SETUP.md — keep in sync.
 */
import { join } from "node:path";
import type { Ctx, DayFile, SourceResult } from "./types";
import { normalizeHae } from "./hae";
import { homedir } from "node:os";
import {
  dayKeyLA,
  isoNowLA,
  loadState,
  readJsonSafe,
  sha256,
  timedFetch,
  writeDayFile,
} from "./store";

const HOME = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
export const APPLE_EXPORT_PATH = join(
  HOME,
  "Library",
  "Mobile Documents",
  "iCloud~is~workflow~my~workflows",
  "Documents",
  "LifeOS",
  "health-export.json",
);

type Json = Record<string, unknown>;
export type AppleParse =
  | { ok: true; data: Json }
  | { ok: false; error: string };

/** Pure, total: never throws on any input string. */
export function parseAppleExport(text: string): AppleParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, error: `invalid JSON: ${error instanceof Error ? error.message : "parse error"}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "export must be a JSON object" };
  }
  return { ok: true, data: parsed as Json };
}

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const NUMERIC_KEYS = [
  "steps",
  "active_energy_kcal",
  "exercise_minutes",
  "resting_hr",
  "hrv_ms",
  "weight_kg",
  "sleep_hours",
] as const;

/** Pure: normalize a parsed export into { day, metrics }. */
export function normalizeApple(
  data: Json,
  nowMs: number,
): { day: string; metrics: Record<string, unknown> } {
  const exportedAt = typeof data.exported_at === "string" ? data.exported_at : null;
  const parsedTs = exportedAt === null ? Number.NaN : Date.parse(exportedAt);
  const day = dayKeyLA(Number.isFinite(parsedTs) ? parsedTs : nowMs);

  const metrics: Record<string, unknown> = {
    exported_at: exportedAt,
  };
  for (const key of NUMERIC_KEYS) {
    metrics[key] = toNum(data[key]);
  }
  return { day, metrics };
}

/**
 * Pure: same-day re-exports can carry a SMALLER sleep window — the Shortcut's
 * lookback is anchored to export time, so evening exports may miss the start
 * of last night. A finished night only grows, never shrinks, so the day's
 * sleep_hours is monotone: keep the larger of prior vs next. Every other key
 * takes the fresh value.
 */
export function mergeDayMetrics(
  prior: Record<string, unknown> | null,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...next };
  const prev = prior?.sleep_hours;
  const cur = next.sleep_hours;
  const prevN = typeof prev === "number" && Number.isFinite(prev) ? prev : null;
  const curN = typeof cur === "number" && Number.isFinite(cur) ? cur : null;
  if (prevN !== null && (curN === null || prevN > curN)) {
    merged.sleep_hours = prevN;
  }
  return merged;
}

async function tryDownloadEvicted(path: string): Promise<void> {
  try {
    const proc = Bun.spawn(["brctl", "download", path], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await proc.exited;
    await Bun.sleep(1500);
  } catch {
    // brctl unavailable or failed — the exists() re-check below decides.
  }
}

const SPOOL_KEEP = 30;

/** Persist a drained payload to the local spool BEFORE normalizing, so a
 * normalizer bug can never destroy the only copy. Prunes to the newest N. */
async function spoolPayload(ctx: Ctx, key: string, body: unknown): Promise<void> {
  const spoolDir = join(ctx.dataDir, "apple", "_spool");
  const safeName = key.replace(/[^A-Za-z0-9._-]/g, "_");
  await Bun.write(join(spoolDir, `${safeName}.json`), JSON.stringify(body));

  const { readdirSync, rmSync } = await import("node:fs");
  const entries = readdirSync(spoolDir).sort();
  for (const stale of entries.slice(0, Math.max(0, entries.length - SPOOL_KEEP))) {
    rmSync(join(spoolDir, stale), { force: true });
  }
}

/**
 * REST transport: drain the health-ingest Cloudflare buffer (Health Auto
 * Export app POSTs there). Two-phase, at-least-once: POST /drain (no delete)
 * → spool raw locally → normalize into day files → POST /ack to delete.
 * Duplicate re-drains are idempotent: day-file merge is replace-per-key
 * (sleep monotone via mergeDayMetrics, fresh-wins elsewhere) and steps only
 * sum WITHIN one payload, never across payloads.
 */
async function pullRest(ctx: Ctx, baseUrl: string, token: string): Promise<SourceResult> {
  const startedAt = Date.now();
  const state = await loadState(ctx);
  const prior = state.apple ?? { lastSuccess: null, lastError: null, lastHash: null };
  const base = baseUrl.replace(/\/$/, "");
  const auth = { Authorization: `Bearer ${token}` };

  let drained: { payloads?: Array<{ key: string; body: unknown }> };
  try {
    const res = await timedFetch(`${base}/drain`, { method: "POST", headers: auth }, 15_000);
    if (!res.ok) {
      return {
        source: "apple",
        status: "failed",
        records: 0,
        lastError: `ingest worker /drain returned HTTP ${res.status}`,
        lastSuccess: prior.lastSuccess,
        ms: Date.now() - startedAt,
      };
    }
    drained = (await res.json()) as typeof drained;
  } catch (error) {
    return {
      source: "apple",
      status: "failed",
      records: 0,
      lastError: `drain failed: ${error instanceof Error ? error.message : String(error)}`,
      lastSuccess: prior.lastSuccess,
      ms: Date.now() - startedAt,
    };
  }

  const payloads = Array.isArray(drained.payloads) ? drained.payloads : [];
  // Keys embed ISO timestamps; oldest-first so fresh-wins merging ends correct.
  payloads.sort((a, b) => (a.key < b.key ? -1 : 1));

  let dayWrites = 0;
  const ackKeys: string[] = [];
  for (const payload of payloads) {
    await spoolPayload(ctx, payload.key, payload.body);
    for (const { day, metrics } of normalizeHae(payload.body)) {
      const priorDay = await readJsonSafe<DayFile | null>(
        join(ctx.dataDir, "apple", `${day}.json`),
        null,
      );
      await writeDayFile(ctx, "apple", day, mergeDayMetrics(priorDay?.metrics ?? null, metrics));
      dayWrites += 1;
    }
    ackKeys.push(payload.key);
  }

  let ackNote: string | undefined;
  if (ackKeys.length > 0) {
    try {
      const ackRes = await timedFetch(
        `${base}/ack`,
        {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ keys: ackKeys }),
        },
        15_000,
      );
      if (!ackRes.ok) {
        ackNote = `ack returned HTTP ${ackRes.status} — payloads re-drain next run (idempotent)`;
      }
    } catch (error) {
      ackNote = `ack failed (${error instanceof Error ? error.message : "error"}) — payloads re-drain next run (idempotent)`;
    }
  }

  if (dayWrites === 0) {
    return {
      source: "apple",
      status: prior.lastSuccess === null ? "awaiting-first-export" : "ok",
      records: 0,
      lastError: null,
      lastSuccess: prior.lastSuccess,
      ms: Date.now() - startedAt,
      note:
        prior.lastSuccess === null
          ? "buffer empty — point Health Auto Export at the ingest worker (HEALTH/SHORTCUT_SETUP.md § E)"
          : "buffer empty — no new exports since last pull",
    };
  }

  return {
    source: "apple",
    status: "ok",
    records: dayWrites,
    lastError: null,
    lastSuccess: isoNowLA(ctx.now),
    ms: Date.now() - startedAt,
    note: ackNote,
  };
}

export async function pull(ctx: Ctx): Promise<SourceResult> {
  const ingestUrl = ctx.env.HEALTH_INGEST_URL ?? "";
  const drainToken = ctx.env.HEALTH_DRAIN_TOKEN ?? "";
  if (ingestUrl !== "" && drainToken !== "") {
    return pullRest(ctx, ingestUrl, drainToken);
  }
  return pullFile(ctx);
}

/** Legacy/fallback transport: iPhone Shortcut JSON file in iCloud Drive. */
async function pullFile(ctx: Ctx): Promise<SourceResult> {
  const startedAt = Date.now();
  let file = Bun.file(APPLE_EXPORT_PATH);

  if (!(await file.exists())) {
    await tryDownloadEvicted(APPLE_EXPORT_PATH);
    file = Bun.file(APPLE_EXPORT_PATH);
    if (!(await file.exists())) {
      return {
        source: "apple",
        status: "awaiting-first-export",
        records: 0,
        lastError: null,
        lastSuccess: null,
        ms: Date.now() - startedAt,
        note: "no export yet — build the Shortcut per LIFEOS/USER/HEALTH/SHORTCUT_SETUP.md",
      };
    }
  }

  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    return {
      source: "apple",
      status: "failed",
      records: 0,
      lastError: `could not read export: ${error instanceof Error ? error.message : String(error)}`,
      lastSuccess: null,
      ms: Date.now() - startedAt,
    };
  }

  const hash = sha256(text);
  const state = await loadState(ctx);
  const prior = state.apple ?? { lastSuccess: null, lastError: null, lastHash: null };

  if (prior.lastHash === hash) {
    return {
      source: "apple",
      status: "ok",
      records: 0,
      lastError: null,
      lastSuccess: prior.lastSuccess,
      ms: Date.now() - startedAt,
      lastHash: hash,
      note: "unchanged since last pull",
    };
  }

  const parsed = parseAppleExport(text);
  if (!parsed.ok) {
    return {
      source: "apple",
      status: "failed",
      records: 0,
      lastError: parsed.error,
      lastSuccess: prior.lastSuccess,
      ms: Date.now() - startedAt,
    };
  }

  const { day, metrics } = normalizeApple(parsed.data, ctx.now.getTime());
  const priorDay = await readJsonSafe<DayFile | null>(
    join(ctx.dataDir, "apple", `${day}.json`),
    null,
  );
  await writeDayFile(ctx, "apple", day, mergeDayMetrics(priorDay?.metrics ?? null, metrics));

  return {
    source: "apple",
    status: "ok",
    records: 1,
    lastError: null,
    lastSuccess: isoNowLA(ctx.now),
    ms: Date.now() - startedAt,
    lastHash: hash,
  };
}
