/**
 * tab-constants.ts - Tab title colors and states for Kitty/cmux.
 *
 * Algorithm run states (icon, label, color, tab background) are NOT defined
 * here — they live in `LIFEOS/TOOLS/ascent.ts`, the one table every surface
 * reads (Kitty, cmux, work.json, the status line, Pulse, the ISA mirror).
 * This file owns only the non-Algorithm tab states: the plain working/thinking/
 * question colors used before a run has an ISA behind it.
 */

import { ASCENT, ASCENT_STATES, type AscentState } from '../../LIFEOS/TOOLS/ascent';

// Each state carries its inactive-tab background AND text color. Dark backgrounds
// use light gray text (#A0A0A0); light/bright backgrounds need dark text or the
// gray washes out (the native-orange case — gray on #C2660A was ~1.5:1).
// Since 2026-08-12 every LIVE stamp routes through setAscentTab, so painted
// tabs only ever wear the six run-state colors from the ascent table ({{PRINCIPAL_NAME}}:
// "tab colors the same as the color of the task in the phase list"). The
// thinking/working/native/question/blocked entries below are RETIRED from all
// hook paths — kept only so setTabState stays total over TabState for any
// stale state file or out-of-tree caller; do not reintroduce them as stamps.
export const TAB_COLORS = {
  thinking:  { inactiveBg: '#1E0A3C', inactiveFg: '#A0A0A0', label: 'purple' },        // RETIRED 2026-08-12
  working:   { inactiveBg: '#804000', inactiveFg: '#A0A0A0', label: 'orange' },        // RETIRED 2026-08-12
  native:    { inactiveBg: '#C2660A', inactiveFg: '#1A1206', label: 'native-orange' }, // RETIRED 2026-07-28
  question:  { inactiveBg: '#0D4F4F', inactiveFg: '#A0A0A0', label: 'teal' },          // RETIRED 2026-08-12 (⏳ glyph carries it)
  blocked:   { inactiveBg: '#B58900', inactiveFg: '#1A1206', label: 'amber' },         // RETIRED 2026-08-12 (⏳ glyph carries it)
  completed: { inactiveBg: ASCENT.cairn.tabBg, inactiveFg: ASCENT.cairn.tabFg, label: 'green' },
  error:     { inactiveBg: '#804000', inactiveFg: '#A0A0A0', label: 'orange' },
  idle:      { inactiveBg: 'none',    inactiveFg: 'none',    label: 'default' },
} as const;

export const ACTIVE_TAB_BG = '#002B80';
export const ACTIVE_TAB_FG = '#FFFFFF';
export const INACTIVE_TAB_FG = '#A0A0A0';

export type TabState = keyof typeof TAB_COLORS;

export { ASCENT, ASCENT_STATES };
export type { AscentState };
