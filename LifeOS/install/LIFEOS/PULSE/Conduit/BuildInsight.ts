#!/usr/bin/env bun
/**
 * Conduit content-type read — the "what kind of stuff is coming in?" layer.
 *
 * CHEAP & SUSTAINABLE BY CONSTRUCTION:
 *   - Runs on an HOURLY launchd cadence (com.lifeos.conduit.insight), NOT per page load.
 *   - Uses the CHEAPEST inference rung: Inference.ts --level low (haiku).
 *   - Subscription billing only — Inference.ts scrubs ANTHROPIC_API_KEY/AUTH_TOKEN.
 *     This script never sets an API key and never spawns `claude` directly.
 *   - Metadata only — app names, git subjects, session slugs. Never keystrokes/content.
 *   - BOUNDED input — top-N apps + a handful of git subjects/slugs, capped.
 *   - IDEMPOTENT — if no new events since the last insight's `since` watermark, it
 *     EXITS WITHOUT an inference call. Idle hours cost nothing.
 *
 * Output (data — under USER): USER/CONDUIT/insights/<date>.json
 *   { date, generatedAt, level, model, since, eventsConsidered, narrative, contentTypes[] }
 *
 * CLI: `bun BuildInsight.ts [date]`  (date defaults to today; also the launchd entrypoint)
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { inference } from "../../TOOLS/Inference.ts";
import { loadConfig } from "./config.ts";
import { INSIGHTS_DIR, insightPathFor } from "./paths.ts";
import { localDate, readDayEvents } from "./store.ts";
import type { ConduitEvent } from "./types.ts";
import { CONDUIT_VERSION } from "./version.ts";

const LEVEL = "low" as const; // haiku rung — cheapest. ISC-16.
const MAX_APPS = 15; // bounded input. ISC-18.
const MAX_SUBJECTS = 12;
const MAX_SLUGS = 8;
const MAX_THEMES = 6;
const MAX_NARRATIVE = 320;

export interface ContentType {
  label: string;
  share: number; // 0..1
  evidence: string;
}
export interface ConduitInsight {
  date: string;
  generatedAt: string;
  conduitVersion: string;
  level: string;
  model: string;
  /** ts of the last event this insight considered — the idempotency watermark. */
  since: string | null;
  eventsConsidered: number;
  skipped?: boolean;
  narrative: string;
  contentTypes: ContentType[];
}

/** Build a bounded, metadata-only summary of the day's events for the prompt. */
function summarize(events: ConduitEvent[]): { text: string; since: string | null } {
  const appMin = new Map<string, number>();
  const subjects: string[] = [];
  const slugs = new Set<string>();
  const prTitles: string[] = [];
  let commits = 0;
  let sessions = 0;
  let prs = 0;
  let since: string | null = null;

  for (const e of events) {
    if (since === null || e.ts > since) since = e.ts;
    if (e.type === "app-focus" && e.app) {
      const sec = Number(e.detail?.intervalSec) || 120;
      appMin.set(e.app, (appMin.get(e.app) ?? 0) + sec / 60);
    } else if (e.type === "git-commit") {
      commits++;
      const s = e.detail?.subject;
      if (typeof s === "string" && subjects.length < MAX_SUBJECTS) subjects.push(s);
    } else if (e.type === "claude-session") {
      sessions++;
      const s = e.detail?.lastSlug;
      if (typeof s === "string") slugs.add(s);
    } else if (e.type === "github-pr") {
      prs++;
      const t = e.detail?.title;
      if (typeof t === "string" && t && prTitles.length < MAX_SUBJECTS) prTitles.push(t);
    }
  }

  const apps = [...appMin.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_APPS)
    .map(([app, min]) => `${app} ${Math.round(min)}min`);

  const text = [
    `Foreground apps today (minutes): ${apps.join(", ") || "(none)"}`,
    `LifeOS coding sessions: ${sessions}${slugs.size ? `; recent slugs: ${[...slugs].slice(0, MAX_SLUGS).join(", ")}` : ""}`,
    `Git commits: ${commits}${subjects.length ? `; subjects: ${subjects.join(" | ")}` : ""}`,
    `Pull requests: ${prs}${prTitles.length ? `; titles: ${prTitles.join(" | ")}` : ""}`,
  ].join("\n");

  return { text, since };
}

const SYSTEM_PROMPT = [
  "You characterize a person's local computer activity into a short read + a few content-type themes.",
  "You receive ONLY metadata (app names, minutes, session slugs, git subjects) — never content.",
  "Return STRICT JSON only, no prose around it, shape:",
  `{"narrative":"<=280 chars, plain English, second person, what kind of work/activity this was","contentTypes":[{"label":"2-4 words","share":0.0,"evidence":"which metadata"}]}`,
  `Rules: at most ${MAX_THEMES} themes; shares are fractions of the day that SUM TO 1.0; order by share desc; plain language, no hype.`,
].join(" ");

/** Normalize model output into a safe, bounded ConduitInsight payload. */
function normalize(parsed: unknown): { narrative: string; contentTypes: ContentType[] } {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  let narrative = typeof obj.narrative === "string" ? obj.narrative.trim() : "";
  if (narrative.length > MAX_NARRATIVE) narrative = narrative.slice(0, MAX_NARRATIVE - 1).trimEnd() + "…";

  const raw = Array.isArray(obj.contentTypes) ? obj.contentTypes : [];
  let themes: ContentType[] = raw
    .map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return {
        label: typeof o.label === "string" ? o.label.slice(0, 40) : "",
        share: Number.isFinite(Number(o.share)) ? Math.max(0, Number(o.share)) : 0,
        evidence: typeof o.evidence === "string" ? o.evidence.slice(0, 120) : "",
      };
    })
    .filter((t) => t.label)
    .slice(0, MAX_THEMES);

  // Renormalize shares to sum to 1 (the model is usually close; this guarantees ISC-11).
  const sum = themes.reduce((n, t) => n + t.share, 0);
  if (sum > 0) themes = themes.map((t) => ({ ...t, share: Math.round((t.share / sum) * 1000) / 1000 }));

  return { narrative, contentTypes: themes };
}

function writeAtomic(path: string, content: string): void {
  mkdirSync(INSIGHTS_DIR, { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

function readExisting(date: string): ConduitInsight | null {
  const p = insightPathFor(date);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ConduitInsight;
  } catch {
    return null;
  }
}

export async function buildInsight(date: string): Promise<ConduitInsight> {
  const events = readDayEvents(date);
  const { text, since } = summarize(events);

  // Idempotency (ISC-17): no new events since the last SUCCESSFUL insight → skip the
  // inference call. A prior failure/empty read (contentTypes empty) never satisfies the
  // skip — otherwise a single timed-out hour would freeze a bad read until new events.
  const existing = readExisting(date);
  const existingWasReal = !!existing && existing.contentTypes.length > 0 && existing.model !== "(failed)";
  if (existing && existingWasReal && existing.since === since && events.length > 0) {
    console.log(`[insight] ${date}: no new events since ${since} — skipped (no inference call).`);
    return existing;
  }

  // Nothing captured yet — write an honest empty insight, no inference call.
  if (events.length === 0) {
    const empty: ConduitInsight = {
      date,
      generatedAt: new Date().toISOString(),
      conduitVersion: CONDUIT_VERSION,
      level: LEVEL,
      model: "(none)",
      since,
      eventsConsidered: 0,
      skipped: true,
      narrative: "No activity captured yet today.",
      contentTypes: [],
    };
    writeAtomic(insightPathFor(date), JSON.stringify(empty, null, 2));
    return empty;
  }

  const res = await inference({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: text,
    level: LEVEL,
    expectJson: true,
    // Hourly BACKGROUND job — latency is irrelevant, so give the cheap haiku call
    // generous headroom rather than let the 15s low-tier default time it out. haiku
    // at low effort with a JSON-schema prompt runs ~30-60s (high variance), so 120s
    // is safe headroom. The read is still ONE haiku call/hour; cost is unchanged, and
    // cadence — not speed — is what makes it sustainable. ISC-16 keeps LEVEL=low.
    timeout: 120000,
  });

  // Never let a failed read clobber a good one. If inference fails but we already have
  // a real read for today, keep it — a transient outage shouldn't wipe the last read.
  if (!res.success && existingWasReal) {
    console.log(`[insight] ${date}: inference failed (${res.error}) — kept prior good read.`);
    return existing!;
  }

  const { narrative, contentTypes } = res.success
    ? normalize(res.parsed)
    : { narrative: "Could not generate a read this hour (inference unavailable).", contentTypes: [] };

  const insight: ConduitInsight = {
    date,
    generatedAt: new Date().toISOString(),
    conduitVersion: CONDUIT_VERSION,
    level: LEVEL,
    model: res.success ? "haiku-tier" : "(failed)",
    since,
    eventsConsidered: events.length,
    narrative,
    contentTypes,
  };
  writeAtomic(insightPathFor(date), JSON.stringify(insight, null, 2));
  console.log(`[insight] ${date}: ${res.success ? "wrote" : "wrote FALLBACK"} ${contentTypes.length} themes from ${events.length} events (${res.latencyMs}ms).`);
  return insight;
}

if (import.meta.main) {
  const date = process.argv[2] ?? localDate(new Date());
  loadConfig(); // ensure USER dir exists
  buildInsight(date)
    .then((i) => console.log(JSON.stringify(i.contentTypes.map((t) => `${t.label} ${(t.share * 100).toFixed(0)}%`))))
    .catch((e) => {
      console.error("[insight] error:", e);
      process.exit(1);
    });
}
