#!/usr/bin/env bun
/**
 * Artist & Events Scan — daily deterministic tour-date checker for the Hermes
 * Artist & Events Scanner job.
 *
 * Reads the principal's favorite artists from the music reference corpus
 * ($LIFEOS_ROOT/LIFEOS/USER/MUSIC/MusicReference.md, ⭐ rows), queries
 * Ticketmaster Discovery per artist when TICKETMASTER_API_KEY is set
 * (Bandsintown only when a working app id is configured — the shipped default
 * id is known-403 — otherwise SOURCE_DEGRADED wakes the agent to web-sweep),
 * and diffs against durable state. New
 * events print as findings; home-region events additionally enqueue into the
 * Heartbeat time-sensitive queue. Emits the same wake-gate contract as
 * Tick.ts: `{"wakeAgent": false}` when nothing is new (zero model tokens).
 *
 * On the configured discovery weekday the agent wakes regardless, to hunt
 * taste-adjacent artists playing the home region (that leg needs judgment).
 * After 3+ consecutive source failures the agent wakes with SOURCE_DEGRADED
 * so it can fall back to a web sweep instead of the API silently rotting.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const LIFEOS_ROOT = process.env.LIFEOS_ROOT || join(homedir(), ".claude");
const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), ".hermes");
const STATE_DIR = join(HERMES_HOME, "state", "heartbeat");
const CONFIG_PATH = join(LIFEOS_ROOT, "LIFEOS", "USER", "CONFIG", "heartbeat.json");
const MUSIC_PATH = join(LIFEOS_ROOT, "LIFEOS", "USER", "MUSIC", "MusicReference.md");

interface ArtistCfg {
  appId: string;
  homeRegionPatterns: string[];
  discoveryWeekday: string; // e.g. "Mon"; "" disables
  extraArtists: string[];
  skipArtists: string[];
}

const DEFAULTS: ArtistCfg = {
  appId: "lifeos-heartbeat",
  homeRegionPatterns: [],
  discoveryWeekday: "",
  extraArtists: [],
  skipArtists: [],
};

function loadJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    if (Array.isArray(fallback)) return (Array.isArray(parsed) ? parsed : fallback) as T;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function favoriteArtists(cfg: ArtistCfg): string[] {
  const artists = new Set<string>(cfg.extraArtists);
  if (existsSync(MUSIC_PATH)) {
    for (const line of readFileSync(MUSIC_PATH, "utf-8").split("\n")) {
      if (!line.includes("⭐")) continue;
      const cells = line.split("|").map((c) => c.trim());
      // Table shape: | # | Artist | Track | Album | Type | Source |
      if (cells.length >= 6 && cells[2] && !/^[-#]/.test(cells[2]) && cells[2] !== "Artist")
        artists.add(cells[2]);
    }
  }
  const skip = new Set(cfg.skipArtists.map((s) => s.toLowerCase()));
  return [...artists].filter((a) => !skip.has(a.toLowerCase())).sort();
}

const fullCfg = loadJson<any>(CONFIG_PATH, {});
const cfg: ArtistCfg = { ...DEFAULTS, ...(fullCfg.artistScan || {}) };
mkdirSync(STATE_DIR, { recursive: true });

const statePath = join(STATE_DIR, "artist-events.json");
const state = loadJson<{ seen: Record<string, string>; failStreak: number }>(statePath, { seen: {}, failStreak: 0 });
const now = new Date();
const findings: string[] = [];
let failures = 0;
let queried = 0;

const artists = favoriteArtists(cfg);
const queuePath = join(STATE_DIR, "queue.json");
const queue = loadJson<any[]>(queuePath, []);
// Baseline run (empty state): report home-region shows only — the worldwide
// backlog of already-announced dates would flood the first report otherwise.
const baseline = Object.keys(state.seen).length === 0;

// Read TICKETMASTER_API_KEY from the canonical env file — value never printed.
function envKey(name: string): string {
  const envPath = join(LIFEOS_ROOT, ".env");
  if (process.env[name]) return process.env[name]!;
  if (!existsSync(envPath)) return "";
  for (const raw of readFileSync(envPath, "utf-8").split("\n"))
    if (raw.startsWith(`${name}=`)) return raw.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  return "";
}
const tmKey = envKey("TICKETMASTER_API_KEY");

interface FoundEvent { key: string; when: string; venue: string; city: string; url: string }

async function ticketmasterEvents(artist: string): Promise<FoundEvent[] | null> {
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(artist)}&classificationName=music&size=50&sort=date,asc&apikey=${encodeURIComponent(tmKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const body = (await res.json()) as any;
  const events = body?._embedded?.events || [];
  const out: FoundEvent[] = [];
  for (const ev of events) {
    const attractions = (ev._embedded?.attractions || []).map((a: any) => String(a.name || "").toLowerCase());
    if (attractions.length && !attractions.includes(artist.toLowerCase())) continue; // keyword noise
    const v = ev._embedded?.venues?.[0];
    out.push({
      key: String(ev.id),
      when: ev.dates?.start?.dateTime || ev.dates?.start?.localDate || "?",
      venue: v?.name || "?",
      city: [v?.city?.name, v?.state?.stateCode || v?.state?.name, v?.country?.countryCode].filter(Boolean).join(", "),
      url: ev.url || "",
    });
  }
  return out;
}

async function bandsintownEvents(artist: string): Promise<FoundEvent[] | null> {
  const url = `https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events?app_id=${encodeURIComponent(cfg.appId)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const events = (await res.json()) as any[];
  if (!Array.isArray(events)) return null;
  return events.map((ev) => ({
    key: String(ev.id || `${artist}:${ev.datetime}:${ev.venue?.name}`),
    when: ev.datetime || "?",
    venue: ev.venue?.name || "?",
    city: [ev.venue?.city, ev.venue?.region, ev.venue?.country].filter(Boolean).join(", "),
    url: ev.offers?.[0]?.url || ev.url || "",
  }));
}

const sourceAvailable = Boolean(tmKey) || cfg.appId !== DEFAULTS.appId; // default appId is known-403
if (sourceAvailable) {
  for (const artist of artists) {
    try {
      queried++;
      const events = tmKey ? await ticketmasterEvents(artist) : await bandsintownEvents(artist);
      if (events === null) { failures++; continue; }
      for (const ev of events) {
        if (state.seen[ev.key]) continue;
        state.seen[ev.key] = now.toISOString();
        const home = cfg.homeRegionPatterns.some((p) => ev.city.toLowerCase().includes(p.toLowerCase()));
        const line = `${home ? "HOME_REGION_SHOW" : "NEW_SHOW"}: ${artist} — ${ev.venue}, ${ev.city} on ${ev.when}` + (ev.url ? ` · ${ev.url}` : "");
        if (baseline && !home) continue; // recorded in state, not reported
        findings.push(line);
        if (home)
          queue.push({ source: "artist-scan", message: line, dueAt: now.toISOString(), created: now.toISOString() });
      }
    } catch {
      failures++;
    }
    await new Promise((r) => setTimeout(r, 200)); // be gentle with the API
  }
}

// GC seen entries after 400 days (past events)
for (const [k, ts] of Object.entries(state.seen))
  if (now.getTime() - new Date(ts).getTime() > 400 * 86_400_000) delete state.seen[k];

const allFailed = queried > 0 && failures >= queried;
state.failStreak = allFailed || !sourceAvailable ? state.failStreak + 1 : 0;
writeFileSync(statePath, JSON.stringify(state, null, 2));
writeFileSync(queuePath, JSON.stringify(queue, null, 2));

for (const f of findings)
  appendFileSync(join(STATE_DIR, "ledger.jsonl"), JSON.stringify({ ts: now.toISOString(), finding: f }) + "\n");

const weekday = now.toLocaleDateString("en-US", { weekday: "short" });
const discoveryDue = cfg.discoveryWeekday && weekday === cfg.discoveryWeekday;
const degraded = state.failStreak >= 3;

const notes: string[] = [];
if (findings.length) notes.push(findings.join("\n"));
if (discoveryDue) notes.push(`DISCOVERY_DUE: weekly taste-adjacent discovery pass — find artists similar to the corpus playing the home region in the next 60 days.`);
if (!sourceAvailable && discoveryDue)
  notes.push(`SOURCE_MISSING: no ticketing API configured (TICKETMASTER_API_KEY absent, Bandsintown app_id unregistered). Do this week's favorite-artist tour sweep via web search for these artists: ${artists.join("; ")}. Remind the principal ONCE that adding a free Ticketmaster Discovery key makes this deterministic and daily.`);
if (degraded && sourceAvailable)
  notes.push(`SOURCE_DEGRADED: ticketing source failed ${state.failStreak} consecutive days (${failures}/${queried} artists today) — do the favorite-artist tour sweep via web search instead.`);
notes.push(`SCAN_STATS: ${artists.length} favorite artists, ${queried} queried, ${failures} failures, ${findings.length} new events.`);

// Wake rules protect the daily token budget: with a working source, wake on
// diffs/discovery/outage; with NO source, wake on the weekly discovery day only.
const wake = sourceAvailable ? Boolean(findings.length || discoveryDue || degraded) : Boolean(discoveryDue);
if (wake) {
  console.log(notes.join("\n"));
  console.log(JSON.stringify({ wakeAgent: true }));
} else {
  console.log(JSON.stringify({ wakeAgent: false }));
}
