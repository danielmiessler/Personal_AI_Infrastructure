import type { AlgorithmState } from "@/types/algorithm";
import {
  ASCENT,
  ASCENT_STATES,
  deriveAscent,
  type AscentBoardPlacement,
  type AscentState,
} from "../../../../TOOLS/ascent";

// The board's lanes ARE the ascent states — the same table Kitty tabs, the cmux
// sidebar, the status line and the ISA HTML mirror read (LIFEOS/TOOLS/ascent.ts).
// Before 2026-07-27 this file carried its own private vocabulary, which is why a
// run could read "Climbing" in a tab and "Ascending" on the board while the
// status line showed nothing at all.
//
// Lifecycle is still DERIVED, never declared — declared stations rotted (the
// 2026-07 review found THINK/PLAN/EXECUTE hadn't been written since 8.2.0);
// derived states can't, because they ARE the data. Pulse just derives at higher
// fidelity than the hooks do: it has the live tool stream, so it resolves the
// in-flight detail (anchoring) that a tab can only show
// as the coarser bracket.

export type Lifecycle = AscentState;
export type { AscentState };

export interface LifecycleMeta {
  /** The state glyph — the SAME emoji the Kitty tab shows (ascent.ts `icon`). */
  icon: string;
  label: string;
  color: string;
  dim: boolean;
  /** Work-board placement — policy set in the table, never in a component. */
  board: AscentBoardPlacement;
}

export const LIFECYCLE_META: Record<Lifecycle, LifecycleMeta> = Object.fromEntries(
  ASCENT_STATES.map((s) => [
    s,
    { icon: ASCENT[s].icon, label: ASCENT[s].label, color: ASCENT[s].color, dim: ASCENT[s].dim, board: ASCENT[s].board },
  ]),
) as Record<Lifecycle, LifecycleMeta>;

/** The states in arc order — the board's left→right column order. */
export const LIFECYCLE_ORDER: Lifecycle[] = ASCENT_STATES;

export function deriveLifecycle(s: AlgorithmState): Lifecycle {
  const total =
    (s.progress?.total ?? 0) > 0
      ? s.progress.total
      : (s.criteria?.filter((c) => c.type !== "anti-criterion").length ?? 0);

  return deriveAscent({
    phase: s.currentPhase,
    tracked: s.tracked,
    active: s.active,
    done: s.progress?.done ?? 0,
    total,
    activity: s.activity?.state ?? null,
  });
}

/** Elapsed/relative time helpers shared by the board. */
export function formatElapsed(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${sec % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
