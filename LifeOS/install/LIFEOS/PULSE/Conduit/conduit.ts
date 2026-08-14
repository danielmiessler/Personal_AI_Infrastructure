#!/usr/bin/env bun
/**
 * Conduit CLI + capture entrypoint. Invoked by launchd on a poll interval (`capture`)
 * and by hand for inspection. Stateless one-shot per invocation — no long-lived
 * daemon to leak or crash. Every adapter is wrapped so a single failure never aborts
 * the poll (defense in depth on top of each adapter's own try/catch).
 *
 * Commands:
 *   capture         run enabled adapters once, append events, lazy-roll the prior day
 *   rollup [date]   build + persist the daily record (default: today)
 *   today           print today's live distribution (in-memory, not persisted)
 *   status          print config + event counts
 *   init            write default config under USER
 *   version         print Conduit version
 */
import { capture as captureAppFocus } from "./adapters/appFocus.ts";
import { capture as captureClaude } from "./adapters/claudeSession.ts";
import { capture as captureGit } from "./adapters/git.ts";
import { capture as captureGithub, commitGithubCursor } from "./adapters/github.ts";
import { DEFAULT_CONFIG, loadConfig } from "./config.ts";
import { CONFIG_PATH, DATA_ROOT } from "./paths.ts";
import { buildDailyRecord, renderMarkdown, writeDailyRecord } from "./rollup.ts";
import { appendEvent, dailyRecordExists, listEventDates, localDate, pruneOldEvents, readDayEvents, writeState } from "./store.ts";
import type { ConduitEvent } from "./types.ts";
import { CONDUIT_VERSION } from "./version.ts";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

/** Run one poll: gather from every enabled, fault-isolated adapter. */
function runCapture(): number {
  const config = loadConfig();
  if (!config.enabled) return 0;

  const events: ConduitEvent[] = [];
  const runners: Array<[boolean, () => ConduitEvent[]]> = [
    [config.sources.appFocus, () => captureAppFocus(config)],
    [config.sources.git, () => captureGit(config)],
    [config.sources.claudeSession, () => captureClaude()],
  ];
  for (const [enabled, run] of runners) {
    if (!enabled) continue;
    try {
      for (const e of run()) {
        appendEvent(e);
        events.push(e);
      }
    } catch {
      /* one adapter down never aborts the poll */
    }
  }

  // github is special-cased: its cursor must advance only over events that
  // actually appended, and only AFTER they land (see commitGithubCursor). The
  // adapter itself is a pure read.
  if (config.sources.github) {
    const appended: ConduitEvent[] = [];
    try {
      for (const e of captureGithub(config)) {
        appendEvent(e);
        events.push(e);
        appended.push(e);
      }
    } catch {
      /* one adapter down never aborts the poll */
    }
    try {
      commitGithubCursor(appended);
    } catch {
      /* cursor commit is best-effort — a miss re-scans (SHA-deduped) next poll */
    }
  }

  try {
    lazyRollUnrolledDays();
  } catch {
    /* the FS tail (rollup/prune/state) is best-effort — never abort the poll */
  }
  return events.length;
}

/**
 * Roll up EVERY past day that has raw events but no daily record — not just one boundary.
 * A multi-day gap (laptop asleep over a weekend coalesces into a single wake-up poll)
 * therefore loses no days; each un-rolled day gets its record before its raw is pruned.
 */
function lazyRollUnrolledDays(): void {
  const today = localDate(new Date());
  const config = loadConfig();
  for (const date of listEventDates()) {
    if (date >= today || dailyRecordExists(date)) continue;
    try {
      const rec = buildDailyRecord(date, readDayEvents(date), config.pollIntervalSec, CONDUIT_VERSION);
      writeDailyRecord(rec);
      writeState({ lastRollupDate: date });
    } catch {
      /* one bad day never blocks the others */
    }
  }
  try {
    pruneOldEvents(config.retentionDays); // discard raw beyond retention (guarded by record-exists)
  } catch {
    /* ignore */
  }
  writeState({ lastCaptureDate: today });
}

function doRollup(date: string): void {
  const config = loadConfig();
  const rec = buildDailyRecord(date, readDayEvents(date), config.pollIntervalSec, CONDUIT_VERSION);
  const paths = writeDailyRecord(rec);
  writeState({ lastRollupDate: date });
  console.log(`Rolled up ${date} → ${paths.md}`);
  console.log(renderMarkdown(rec));
}

function doToday(): void {
  const config = loadConfig();
  const date = localDate(new Date());
  const rec = buildDailyRecord(date, readDayEvents(date), config.pollIntervalSec, CONDUIT_VERSION);
  console.log(renderMarkdown(rec));
}

function doStatus(): void {
  const config = loadConfig();
  const date = localDate(new Date());
  const todayEvents = readDayEvents(date).length;
  console.log(`Conduit v${CONDUIT_VERSION}`);
  console.log(`  enabled:      ${config.enabled}`);
  console.log(`  poll:         ${config.pollIntervalSec}s`);
  console.log(`  sources:      ${Object.entries(config.sources).filter(([, v]) => v).map(([k]) => k).join(", ") || "(none)"}`);
  console.log(`  repos:        ${config.repos.length}`);
  console.log(`  data root:    ${DATA_ROOT}`);
  console.log(`  events today: ${todayEvents}`);
}

function doInit(): void {
  mkdirSync(DATA_ROOT, { recursive: true });
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(`Wrote default config → ${CONFIG_PATH}`);
  } else {
    console.log(`Config already exists → ${CONFIG_PATH}`);
  }
}

const cmd = process.argv[2] ?? "status";
switch (cmd) {
  case "capture": {
    const n = runCapture();
    console.log(`captured ${n} event(s)`);
    break;
  }
  case "rollup":
    doRollup(process.argv[3] ?? localDate(new Date()));
    break;
  case "today":
    doToday();
    break;
  case "status":
    doStatus();
    break;
  case "init":
    doInit();
    break;
  case "version":
    console.log(CONDUIT_VERSION);
    break;
  default:
    console.log("usage: conduit <capture|rollup [date]|today|status|init|version>");
    process.exit(1);
}
