/**
 * ascent.ts — the ONE table of Algorithm run states, their names, and their icons.
 *
 * Why this file exists: before 2026-07-27 the same concept was spelled four
 * different ways — Kitty tab config (9 dead station keys + 3 live ones), Pulse's
 * derived lifecycle (basecamp/routefinding/…), the ISA HTML mirror's 4-stage bar
 * (scoping/climbing/learning/done), and cmux log levels that only knew the dead
 * stations. Nothing agreed, so a run looked like one thing in Kitty and another
 * on the board, and the status line showed nothing at all.
 *
 * The Algorithm has no stations left. What a run is doing is DERIVED from what
 * the run's data shows — declared stations rot, derived states can't, because
 * they ARE the data. So there is one derivation (`deriveAscent`), one metadata
 * table (`ASCENT`), and every surface reads from here:
 *
 *   Kitty tabs        hooks/lib/tab-constants.ts → tab-setter.ts
 *   cmux sidebar      hooks/lib/tab-setter.ts
 *   work.json rows    hooks/lib/isa-utils.ts (writes the resolved `ascent` object)
 *   Status line       LIFEOS_StatusLine.sh (pure jq read of that object)
 *   Pulse board       PULSE/Observability/src/lib/lifecycle.ts → WorkBoard.tsx
 *   ISA HTML mirror   LIFEOS/TOOLS/ISARender.ts
 *
 * Theme: climbing a hill you had to name first. A run marks the summit (states
 * what done means), ascends, anchors each hold in evidence, and leaves a cairn.
 * Change an icon here and it changes everywhere — that is the whole point.
 * SIX states since 2026-07-30 (traverse · marking · ascending · anchoring ·
 * camped · cairn) — see LEGACY_ASCENT_ALIASES for the fold.
 *
 * PURE MODULE. No imports, no fs, no side effects — it is bundled into the Pulse
 * browser build as well as run from hooks. Keep it that way.
 */

export type AscentState =
  | 'marking'
  | 'ascending'
  | 'anchoring'
  | 'camped'
  | 'cairn'
  | 'traverse'
  | 'idle';

/**
 * Six states ({{PRINCIPAL_NAME}}, 2026-07-30: "Can we get the whole system down to six
 * instead of nine? … our own arbitrary indicators … unify them into six and
 * then synchronize the six across the whole system."). The 2026-07-30
 * consolidation: routefinding and roped folded into ascending (exploring and
 * delegating are HOW you climb, not separate stages), summit folded into cairn
 * (a minutes-long transient that was almost always an empty column). Legacy
 * keys resolve forever via LEGACY_ASCENT_ALIASES.
 */
export const LEGACY_ASCENT_ALIASES: Record<string, AscentState> = {
  routefinding: 'ascending',
  roped: 'ascending',
  summit: 'cairn',
};

/** Live tool-stream class, server-derived by Pulse from tool-activity.jsonl. */
export type ActivityClass = 'exploring' | 'building' | 'verifying' | 'delegating' | 'other';

/**
 * Pulse work-board placement. Display policy lives HERE, in the one table,
 * never as a hand-maintained list in a consumer ({{PRINCIPAL_NAME}}, 2026-07-28 — the
 * board's lane set drifted twice in one day when it was spelled locally).
 * COLUMNS ARE STATIC ({{PRINCIPAL_NAME}}, 2026-07-30: "static columns. They never change,
 * and they are the same columns that we have for the tab title, colors, names,
 * and icons… Completely synchronized state… Once and for all."): every run
 * state is a permanent column, populated or not. 'lane' = always a column;
 * 'hidden' = not a run state, never rendered (idle only). The former
 * conditional variants ('laneWhenPopulated', 'list') are retired — a column
 * set that changes with data is exactly the desync this table exists to kill.
 */
export type AscentBoardPlacement = 'lane' | 'hidden';

export interface AscentMeta {
  /** Terminal/emoji glyph — Kitty tab prefix, status line, cmux pill. */
  icon: string;
  /** Display name. Same word on every surface. */
  label: string;
  /** Tab-title fallback when no task description is available. */
  gerund: string;
  /** One-line meaning — tooltips, docs, `--explain`. */
  meaning: string;
  /** Pulse lane/badge color (Tokyo Night palette). */
  color: string;
  /** Kitty inactive-tab background. Dark enough for #A0A0A0 text. */
  tabBg: string;
  /** Kitty inactive-tab foreground. */
  tabFg: string;
  /** cmux sidebar log level. */
  cmux: 'info' | 'progress' | 'warning' | 'success' | 'error';
  /** Left→right position in the arc of a run; drives the board and the ISA bar. */
  order: number;
  /** Rendered muted — the run is not making progress right now. */
  dim: boolean;
  /** Where the Pulse work board places this state. */
  board: AscentBoardPlacement;
}

/**
 * The arc of a run, left to right. Ordering IS the board's column order and the
 * ISA mirror's progress bar, so it is load-bearing, not cosmetic.
 */
export const ASCENT: Record<AscentState, AscentMeta> = {
  marking: {
    icon: '📐', label: 'Marking', gerund: 'Marking the summit.',
    meaning: 'Articulating what done means — claims not yet on the hill.',
    color: '#7dcfff', tabBg: '#0C2D48', tabFg: '#A0A0A0', cmux: 'progress', order: 1, dim: false, board: 'lane',
  },
  ascending: {
    icon: '🧗', label: 'Ascending', gerund: 'Climbing.',
    meaning: 'On the wall — exploring, building, delegating; everything that moves the climb.',
    color: '#e0af68', tabBg: '#78350F', tabFg: '#A0A0A0', cmux: 'info', order: 2, dim: false, board: 'lane',
  },
  anchoring: {
    icon: '⚓', label: 'Anchoring', gerund: 'Testing the hold.',
    meaning: 'Weighting a hold before trusting it — probes running, evidence landing.',
    color: '#9ece6a', tabBg: '#14532D', tabFg: '#A0A0A0', cmux: 'success', order: 3, dim: false, board: 'lane',
  },
  camped: {
    icon: '⛺', label: 'Camped', gerund: 'Camped.',
    meaning: 'Quiet mid-hill — resumable, not dead.',
    color: '#565f89', tabBg: '#1F2335', tabFg: '#A0A0A0', cmux: 'info', order: 4, dim: true, board: 'lane',
  },
  cairn: {
    icon: '🪨', label: 'Cairn', gerund: 'Cairn set.',
    meaning: 'Closed out — every claim held; the marker proving the route went.',
    color: '#34d399', tabBg: '#022800', tabFg: '#A0A0A0', cmux: 'success', order: 5, dim: true, board: 'lane',
  },
  traverse: {
    // order 0: off-arc but LEADS the board — most real-time activity is
    // untracked quick work, and burying it read as a dead board (2026-07-15);
    // promoted from the Basic Tasks strip to a full lane 2026-07-28.
    icon: '🥾', label: 'Traverse', gerund: 'Traversing.',
    meaning: 'Live work with no ISA — moving, but no route declared.',
    color: '#c0caf5', tabBg: '#292E42', tabFg: '#A0A0A0', cmux: 'info', order: 0, dim: false, board: 'lane',
  },
  idle: {
    icon: '', label: 'Idle', gerund: '',
    meaning: 'Nothing running.',
    color: '#565f89', tabBg: 'none', tabFg: 'none', cmux: 'info', order: 10, dim: true, board: 'hidden',
  },
};

export const ASCENT_STATES = (Object.keys(ASCENT) as AscentState[]).sort(
  (a, b) => ASCENT[a].order - ASCENT[b].order,
);

/** The brackets an ISA can actually declare, in arc order. */
export const ASCENT_BRACKETS: AscentState[] = ['marking', 'ascending', 'cairn'];

/**
 * ISA frontmatter `phase:` → bracket state.
 *
 * The model writes a MINIMAL lifecycle value; it never declares the in-flight
 * detail (anchoring), which is derived from the tool stream.
 * Legacy station names from the retired 8-station enum still resolve here so
 * old ISAs and old work.json rows render correctly forever.
 */
export const PHASE_TO_ASCENT: Record<string, AscentState> = {
  // Current vocabulary — what ISAs write today.
  marking: 'marking',
  scoping: 'marking',
  starting: 'marking',
  climbing: 'ascending',
  learn: 'cairn', // was summit (folded 2026-07-30) — the wrap-up reads as done
  complete: 'cairn',
  // Non-ISA rows.
  native: 'traverse',
  idle: 'idle',
  // Retired 8-station enum (2026-07-14) — parse forever, never written.
  observe: 'marking',
  think: 'marking',
  plan: 'marking',
  build: 'ascending',
  execute: 'ascending',
  verify: 'anchoring',
};

/**
 * ISA `phase:` → its declared bracket, or null when the value is unknown.
 * For consumers that hold ONLY a phase string and have no claim counts to feed
 * `deriveAscent` (which would read countless-but-live as `marking`).
 */
export function phaseBracket(phase: string | null | undefined): AscentState | null {
  return PHASE_TO_ASCENT[String(phase || '').toLowerCase().trim()] ?? null;
}

/**
 * True when the declared phase means real work is underway or finished — past
 * articulation, not a placeholder.
 *
 * The state list lives HERE because the table owns what its states mean; the
 * thing consumers must never spell for themselves is the PHASE vocabulary, and
 * this function is exactly how they avoid it. Two consumers were caught in
 * 2026-07-30's sweep hand-listing `["execute","verify","learn","complete"]` —
 * the retired 8-station enum — so a modern `climbing` run read as "nothing has
 * happened yet" (ULWorkSync skipped it, WorkSweep opened no issue for it).
 */
export function phaseHasWorkStarted(phase: string | null | undefined): boolean {
  const b = phaseBracket(phase);
  return b === 'ascending' || b === 'anchoring' || b === 'cairn';
}

/**
 * How long a run may go quiet before it is parked rather than climbing.
 *
 * These lived as local constants inside Pulse's observability server, which is
 * why the board could render ⛺ Camped while the stored `ascent` blob — computed
 * with a hardcoded `active: true` — insisted the same run was still 🧗 Ascending
 * on the status line forever (2026-07-30). Same class as every other drift this
 * table exists to kill: the numbers belong here, and every consumer reads them.
 */
export const RUN_ACTIVITY = {
  /** A tool call this recent means the run is unambiguously live. */
  runningWindowMs: 5 * 60 * 1000,
  /** Overall quiet beyond this parks a tracked run. */
  staleMs: 10 * 60 * 1000,
  /** Untracked/native rows idle far longer before they mean anything. */
  nativeStaleMs: 4 * 60 * 60 * 1000,
} as const;

export interface RunActivityInput {
  phase?: string | null;
  /** ISO timestamp of the last real tool call attributed to the row. */
  lastToolActivity?: string | null;
  updatedAt?: string | null;
  started?: string | null;
  /** Injectable for tests; defaults to now. */
  now?: number;
}

/**
 * Is this row's run still live? Mirrors what Pulse computes from the same
 * fields, so the status line and the board cannot disagree about parked-ness.
 * A row with no activity timestamps at all reads ACTIVE — a freshly written row
 * is live by definition, and that is the common case at write time.
 */
export function isRunActive(input: RunActivityInput): boolean {
  const now = input.now ?? Date.now();
  const ms = (v?: string | null) => {
    const t = Date.parse(String(v ?? ''));
    return Number.isFinite(t) ? t : 0;
  };
  const tool = ms(input.lastToolActivity);
  const phase = String(input.phase ?? '').toLowerCase().trim();
  const staleMs = phase === 'native' || phase === 'starting'
    ? RUN_ACTIVITY.nativeStaleMs
    : RUN_ACTIVITY.staleMs;

  // `lastToolActivity` ALONE when it exists. It is the only field that moves
  // when real work happens; `updatedAt` moves whenever any writer touches the
  // row, and this module's own healing pass is such a writer — folding it in
  // with a max() would make every reconcile look like activity and park nothing,
  // ever. (Pulse keeps a max() because its staleness ALSO decides what stays
  // visible on the board, and it would rather show a quiet row than drop it.
  // Deliberate divergence, same constants: the board is permissive about what to
  // display, the blob is strict about what the run is doing.)
  if (tool > 0) return now - tool <= staleMs;

  const last = Math.max(ms(input.updatedAt), ms(input.started));
  if (last === 0) return true; // nothing to judge by — a fresh write is live
  return now - last <= staleMs;
}

/** Live tool-stream class → in-flight state. */
const ACTIVITY_TO_ASCENT: Record<ActivityClass, AscentState> = {
  exploring: 'ascending', // was routefinding (folded 2026-07-30)
  building: 'ascending',
  verifying: 'anchoring',
  delegating: 'ascending', // was roped (folded 2026-07-30)
  other: 'ascending',
};

/** In-flight states a declared phase is allowed to select on its own. */
const DECLARABLE_INFLIGHT = new Set<AscentState>(['marking', 'ascending', 'anchoring']);

export interface AscentInput {
  /** ISA frontmatter `phase:` (any case), or a work.json row's phase. */
  phase?: string | null;
  /** An ISA backs this run. */
  tracked?: boolean;
  /** The run is live (not stale, not closed). */
  active?: boolean;
  /** Claims closed / total. */
  done?: number;
  total?: number;
  /**
   * Dominant tool-stream class over the last ~3 min. Present only on the Pulse
   * path; hooks pass nothing and fall back to the declared bracket.
   */
  activity?: ActivityClass | null;
}

/**
 * Resolve what a run is doing right now.
 *
 * Two fidelities, one function. Hooks call it with what the ISA declares and get
 * the bracket (marking/ascending/cairn/camped). Pulse calls it with the
 * live tool stream on top and gets the in-flight detail. Both agree on the
 * bracket, so the Kitty tab and the board never contradict each other — the
 * board is just more precise.
 */
export function deriveAscent(input: AscentInput): AscentState {
  const { tracked = false, active = false, activity } = input;
  const bracket = PHASE_TO_ASCENT[String(input.phase || '').toLowerCase().trim()];

  // A closed run is closed — nothing downstream can reopen it.
  if (bracket === 'cairn') return 'cairn';

  const total = Math.max(0, input.total ?? 0);
  const done = Math.max(0, input.done ?? 0);

  if (!tracked) return active ? 'traverse' : 'idle';
  if (!active) return 'camped';
  // Every claim closed: done, even while the wrap-up seconds tick (summit folded in).
  if (total > 0 && done >= total) return 'cairn';
  // Tracked and live but no claims parsed: the hill isn't named yet.
  if (total === 0) return 'marking';

  if (activity) return ACTIVITY_TO_ASCENT[activity];
  return bracket && DECLARABLE_INFLIGHT.has(bracket) ? bracket : 'ascending';
}

/** Metadata lookup that never throws on an unknown key; legacy keys resolve forever. */
export function ascentMeta(state: string | null | undefined): AscentMeta {
  const key = LEGACY_ASCENT_ALIASES[state || ''] ?? ((state || 'idle') as AscentState);
  return ASCENT[key] ?? ASCENT.idle;
}

/**
 * The denormalized blob written into a work.json row, so the bash status line
 * is a pure `jq` read with zero duplicated derivation logic.
 */
export interface AscentTag {
  key: AscentState;
  icon: string;
  label: string;
  color: string;
}

export function ascentTag(state: AscentState): AscentTag {
  const m = ASCENT[state];
  return { key: state, icon: m.icon, label: m.label, color: m.color };
}

/**
 * Fraction of the arc completed — cmux progress bar.
 *
 * Off-arc states report 0 rather than their table position: a camped run is
 * parked, not 88% done, and a bar that says otherwise is a lie the sidebar
 * would tell every time a run went quiet.
 */
export function ascentProgress(state: AscentState): number {
  if (state === 'idle' || state === 'traverse' || state === 'camped') return 0;
  return ASCENT[state].order / ASCENT.cairn.order;
}

/**
 * Every glyph any surface has ever prefixed a tab title with — current icons
 * plus the retired station emoji and the pre-Algorithm working/thinking gears.
 * Used to strip a title back to its raw text.
 */
export const TITLE_PREFIX_GLYPHS: string[] = [
  ...ASCENT_STATES.map((s) => ASCENT[s].icon).filter(Boolean),
  // Retired state glyphs (routefinding/roped/summit, folded 2026-07-30) — old
  // titles still carry them, so they strip forever.
  '🔭', '🪢', '🏔️',
  '🧠', '⚙️', '⚙', '✓', '❓', '⚠', '👁️', '📋', '🔨', '⚡', '✅', '📚', '🧭',
];

const PREFIX_RE = new RegExp(
  `^(?:${TITLE_PREFIX_GLYPHS.map((g) => g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*`,
);

/** Strip a leading state glyph from a tab title. */
export function stripAscentPrefix(title: string): string {
  return title.replace(PREFIX_RE, '').trim();
}

/** Gerunds that must never be carried across a state change — they aren't tasks. */
export const ASCENT_GERUNDS = new Set(
  ASCENT_STATES.map((s) => ASCENT[s].gerund).filter(Boolean),
);
