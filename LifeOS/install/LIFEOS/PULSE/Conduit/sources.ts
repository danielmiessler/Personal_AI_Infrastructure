/**
 * Source descriptors + live status. Answers "what are the sources, and how often
 * do they poll?" — DETERMINISTICALLY, from config + events. No model, no cost.
 *
 * Descriptors are STRUCTURAL METADATA about the adapters (which are code), so they
 * live here in the code area — the same "data, not logic" precedent as classify.ts.
 * Every CAPTURED value (eventsToday, lastEventTs) comes from USER data. The hard
 * data/code boundary is preserved: no captured bytes are baked into this file.
 */
import { loadConfig } from "./config.ts";
import { localDate, readDayEvents } from "./store.ts";
import type { ConduitEventType } from "./types.ts";

type SourceId = "appFocus" | "git" | "claudeSession" | "github";

export interface SourceDescriptor {
  id: SourceId;
  /** Human name shown in the UI. */
  label: string;
  /** One-line "what this feed captures", in plain English. */
  captures: string;
  /** The event type this source emits. */
  eventType: ConduitEventType;
}

/** Structural description of each adapter. Metadata only — never captured data. */
export const SOURCE_DESCRIPTORS: readonly SourceDescriptor[] = [
  {
    id: "appFocus",
    label: "App focus",
    captures: "Which macOS app is frontmost, sampled every poll",
    eventType: "app-focus",
  },
  {
    id: "git",
    label: "Git commits",
    captures: "New commits across your configured repos",
    eventType: "git-commit",
  },
  {
    id: "claudeSession",
    label: "LifeOS sessions",
    captures: "Algorithm & session activity from the work-events log",
    eventType: "claude-session",
  },
  {
    id: "github",
    label: "GitHub activity",
    captures: "Your commits & pull requests on GitHub — including remote/API work",
    eventType: "github-pr",
  },
] as const;

export interface SourceStatus extends SourceDescriptor {
  /** Per-source opt-in from config. */
  enabled: boolean;
  /** Poll cadence in seconds (global). */
  pollIntervalSec: number;
  /** Count of today's events from this source (captured — from USER events). */
  eventsToday: number;
  /** Most recent event ts for this source today, or null (captured). */
  lastEventTs: string | null;
}

export interface SourcesReport {
  pollIntervalSec: number;
  generatedAt: string;
  date: string;
  sources: SourceStatus[];
}

/**
 * Build the live per-source status. Pure w.r.t. its inputs (config + today's events);
 * the only impurity is reading them off disk, exactly like the rest of the module.
 */
export function buildSourcesReport(now: Date = new Date()): SourcesReport {
  const config = loadConfig();
  const date = localDate(now);
  const events = readDayEvents(date);
  const sources: SourceStatus[] = SOURCE_DESCRIPTORS.map((d) => {
    let eventsToday = 0;
    let lastEventTs: string | null = null;
    for (const e of events) {
      if (e.source !== d.id) continue;
      eventsToday++;
      if (lastEventTs === null || e.ts > lastEventTs) lastEventTs = e.ts;
    }
    return {
      ...d,
      enabled: config.sources[d.id],
      pollIntervalSec: config.pollIntervalSec,
      eventsToday,
      lastEventTs,
    };
  });
  return { pollIntervalSec: config.pollIntervalSec, generatedAt: now.toISOString(), date, sources };
}
