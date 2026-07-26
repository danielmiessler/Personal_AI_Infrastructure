/**
 * Conduit type contract. The event is the atomic unit of capture — a focus span
 * or a discrete work signal. Records are the deterministic daily rollup.
 *
 * Capture stores SPANS and METADATA, never keystrokes or content.
 */

export type ConduitEventType = "app-focus" | "git-commit" | "claude-session" | "github-pr";

/** One captured signal. Appended as a single JSONL line. */
export interface ConduitEvent {
  /** ISO-8601 UTC timestamp. */
  ts: string;
  type: ConduitEventType;
  /** Adapter id that produced this event. */
  source: string;
  /** Foreground application name (app-focus events). */
  app?: string;
  /** Repository path or basename (git-commit events). */
  repo?: string;
  /** Free-form structured detail — never message/keystroke content. */
  detail?: Record<string, unknown>;
}

export type BlockKind = "creation" | "consumption" | "neutral";

/** An aggregated chunk of the day: time on one label, classified. */
export interface DailyBlock {
  label: string;
  kind: BlockKind;
  minutes: number;
}

/** Deterministic daily rollup. v1 carries NO model output — pure aggregation. */
export interface DailyRecord {
  date: string;
  conduitVersion: string;
  generatedAt: string;
  totalMinutes: number;
  creationMinutes: number;
  consumptionMinutes: number;
  neutralMinutes: number;
  blocks: DailyBlock[];
  commits: number;
  sessions: number;
  /** Reserved seam for the v2 local-model layer — null in v1. */
  narrative: string | null;
  /** Reserved seam for TELOS scoring — empty in v1. */
  telosTags: Record<string, number>;
}
