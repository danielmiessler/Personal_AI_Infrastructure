/**
 * tab-setter.ts - Unified tab state setter.
 *
 * Single function that:
 * 1. Sets Kitty tab title and color via remote control, OR
 * 2. Sets cmux sidebar status/progress/log via CLI
 * 3. Persists per-window state for daemon recovery
 *
 * Auto-detects terminal: cmux (CMUX_WORKSPACE_ID) vs Kitty (KITTY_LISTEN_ON).
 * All hooks call setTabState() instead of directly running terminal commands.
 */

import { existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync, execFileSync } from 'child_process';
import { TAB_COLORS, ACTIVE_TAB_BG, ACTIVE_TAB_FG, type TabState } from './tab-constants';
import {
  ASCENT,
  ASCENT_GERUNDS,
  PHASE_TO_ASCENT,
  ascentProgress,
  deriveAscent,
  stripAscentPrefix,
  type AscentInput,
  type AscentState,
} from '../../LIFEOS/TOOLS/ascent';

/** Detect if we're running inside cmux */
function isCmux(): boolean {
  return !!(process.env.CMUX_WORKSPACE_ID || process.env.CMUX_SOCKET_PATH);
}

/** Map TabState to cmux log level for visual differentiation */
function stateToCmuxLogLevel(state: TabState): string {
  switch (state) {
    case 'thinking':  return 'progress';
    case 'working':   return 'info';
    case 'question':  return 'warning';
    case 'completed': return 'success';
    case 'error':     return 'error';
    case 'idle':      return 'info';
    default:          return 'info';
  }
}

/**
 * Set cmux sidebar metadata for the current workspace.
 * Uses status pills for the ascent state, log for activity, progress for the climb.
 */
function setCmuxState(title: string, state: TabState, ascent?: AscentState): void {
  try {
    const meta = ascent ? ASCENT[ascent] : null;
    const logLevel = meta ? meta.cmux : stateToCmuxLogLevel(state);
    const phaseLabel = meta ? `${meta.icon} ${meta.label}` : state.toUpperCase();

    // Status pill: shows the current ascent state at a glance
    execFileSync('cmux', ['set-status', 'phase', phaseLabel], { stdio: 'ignore', timeout: 2000 });

    // Log entry: shows what's happening with color-coded level
    execFileSync('cmux', ['log', logLevel, title], { stdio: 'ignore', timeout: 2000 });

    // Clear on idle/complete
    if (state === 'idle') {
      execFileSync('cmux', ['clear-status', 'phase'], { stdio: 'ignore', timeout: 2000 });
      execFileSync('cmux', ['clear-progress'], { stdio: 'ignore', timeout: 2000 });
      execFileSync('cmux', ['clear-log'], { stdio: 'ignore', timeout: 2000 });
    }

    console.error(`[tab-setter] cmux sidebar: "${phaseLabel}" — ${title}`);
  } catch (err) {
    console.error(`[tab-setter] cmux error:`, err);
  }
}

// Generic state gerunds that must never carry over as if they were task
// descriptions. Current gerunds come from the ascent table; the rest are
// retired station strings that may still sit in a stale tab-state file.
const GENERIC_PHASE_GERUNDS = new Set([
  ...ASCENT_GERUNDS,
  'Observing.', 'Thinking.', 'Planning.', 'Building.', 'Executing.',
  'Verifying.', 'Learning.', 'Complete.', 'Starting.', 'Scoping.',
  'Observing the user request.', 'Analyzing the problem space.',
  'Planning the execution approach.', 'Building the solution artifacts.',
  'Executing the planned work.', 'Verifying ideal state criteria.',
  'Recording the session learnings.',
]);
import { paiPath } from './paths';

const TAB_TITLES_DIR = paiPath('MEMORY', 'STATE', 'tab-titles');
const KITTY_SESSIONS_DIR = paiPath('MEMORY', 'STATE', 'kitty-sessions');

/**
 * Resolve the `kitten` binary path. When tab-setter runs from the Claude Code
 * process (inherits user PATH) `kitten` is on PATH. When it runs from the Pulse
 * daemon (launchd-restricted PATH) `kitten` is not on PATH and execSync fails
 * with "command not found". Fall back to the kitty.app location.
 */
let kittenBinCached: string | null = null;
function kittenBin(): string {
  if (kittenBinCached) return kittenBinCached;
  try {
    const path = execSync('command -v kitten', { encoding: 'utf-8', timeout: 1000 }).trim();
    if (path) { kittenBinCached = path; return path; }
  } catch { /* fall through */ }
  kittenBinCached = '/Applications/kitty.app/Contents/MacOS/kitten';
  return kittenBinCached;
}

/**
 * Get Kitty environment from env vars or persisted per-session file.
 *
 * Resolution order:
 * 1. Process env vars (direct terminal context — always correct)
 * 2. Per-session file: kitty-sessions/{sessionId}.json (no shared state, no races)
 * 3. Default socket at /tmp/kitty-$USER (fallback for socket-only configs)
 *
 * IMPORTANT: listenOn MUST be set for remote control to work safely.
 * Without it, kitten @ commands fall back to escape-sequence IPC which
 * leaks garbage text into the terminal output. See PR #493.
 */
function getKittyEnv(sessionId?: string): { listenOn: string | null; windowId: string | null } {
  // Try environment first (direct terminal calls)
  let listenOn = process.env.KITTY_LISTEN_ON || null;
  let windowId = process.env.KITTY_WINDOW_ID || null;
  if (listenOn && windowId) return { listenOn, windowId };

  // Per-session file lookup (preferred — no shared mutable state)
  if (sessionId) {
    try {
      const sessionPath = join(KITTY_SESSIONS_DIR, `${sessionId}.json`);
      if (existsSync(sessionPath)) {
        const entry = JSON.parse(readFileSync(sessionPath, 'utf-8'));
        listenOn = listenOn || entry.listenOn || null;
        windowId = windowId || entry.windowId || null;
        if (listenOn && windowId) return { listenOn, windowId };
      }
    } catch { /* silent */ }
  }

  // Fallback: check default socket path used by kitty's listen_on config.
  // This prevents escape-sequence IPC when KITTY_LISTEN_ON isn't propagated
  // to subprocess contexts (the root cause of terminal garbage in #493).
  if (!listenOn) {
    const defaultSocket = `/tmp/kitty-${process.env.USER}`;
    try {
      if (existsSync(defaultSocket)) {
        listenOn = `unix:${defaultSocket}`;
      }
    } catch { /* silent */ }
  }

  // Log when kitty env lookup fails with a session ID (diagnostic for compaction issues)
  if (sessionId && !listenOn && !windowId) {
    console.error(`[tab-setter] getKittyEnv: no kitty env found for session ${sessionId.slice(0, 8)} (no env vars, no session file, no default socket)`);
  }

  return { listenOn, windowId };
}

/**
 * Persist a session's Kitty environment for later hook lookups.
 * Called by KittyEnvPersist at session start.
 *
 * Each session gets its own file: kitty-sessions/{sessionId}.json
 * - No shared mutable state (concurrent session starts are safe)
 * - No unbounded growth (files cleaned up on session end)
 * - Simple atomic write (no read-modify-write cycle)
 *
 */
export function persistKittySession(sessionId: string, listenOn: string, windowId: string): void {
  try {
    if (!existsSync(KITTY_SESSIONS_DIR)) mkdirSync(KITTY_SESSIONS_DIR, { recursive: true });
    writeFileSync(
      join(KITTY_SESSIONS_DIR, `${sessionId}.json`),
      JSON.stringify({ listenOn, windowId }),
      'utf-8'
    );
  } catch { /* silent */ }
}

/**
 * Remove a session's persisted Kitty environment file.
 * Called by SessionSummary at session end.
 */
export function cleanupKittySession(sessionId: string): void {
  try {
    const sessionPath = join(KITTY_SESSIONS_DIR, `${sessionId}.json`);
    if (existsSync(sessionPath)) unlinkSync(sessionPath);
  } catch { /* silent */ }
}

interface SetTabOptions {
  title: string;
  state: TabState;
  previousTitle?: string;
  /** Ascent state to carry across a transient stamp (e.g. question), so the
   * restore path can return to the run's real state instead of a generic one. */
  previousAscent?: AscentState;
  sessionId?: string;
}

/**
 * Clean up state files for kitty windows that no longer exist.
 * Runs opportunistically on each setTabState call (lightweight).
 */
function cleanupStaleStateFiles(): void {
  try {
    if (!existsSync(TAB_TITLES_DIR)) return;
    const files = readdirSync(TAB_TITLES_DIR).filter(f => f.endsWith('.json'));
    if (files.length === 0) return;

    // Get live window IDs from kitty via socket (prevents escape sequence leaks)
    const defaultSocket = `/tmp/kitty-${process.env.USER}`;
    const socketPath = process.env.KITTY_LISTEN_ON || (existsSync(defaultSocket) ? `unix:${defaultSocket}` : null);
    if (!socketPath) return; // No socket — skip cleanup to avoid escape sequence IPC
    // Validate socket path shape before passing to kitten (defense-in-depth even with execFileSync)
    if (!/^[a-zA-Z0-9_\-]+:[a-zA-Z0-9/_\-.]+$/.test(socketPath)) return;
    let rawLs: string;
    try {
      rawLs = execFileSync('kitten', ['@', `--to=${socketPath}`, 'ls'], {
        encoding: 'utf-8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch { return; }
    if (!rawLs) return;

    const liveIds = new Set<string>();
    try {
      const osWindows = JSON.parse(rawLs) as Array<{ tabs: Array<{ windows: Array<{ id: number }> }> }>;
      for (const os of osWindows) for (const tab of os.tabs) for (const win of tab.windows) liveIds.add(String(win.id));
    } catch { return; }
    if (liveIds.size === 0) return;

    for (const file of files) {
      const winId = file.replace('.json', '');
      if (!liveIds.has(winId)) {
        try { unlinkSync(join(TAB_TITLES_DIR, file)); } catch { /* silent */ }
      }
    }
  } catch { /* silent — cleanup is best-effort */ }
}

export function setTabState(opts: SetTabOptions): void {
  const { state, previousTitle, previousAscent, sessionId } = opts;
  const title = opts.title;
  const colors = TAB_COLORS[state];

  // cmux path: use sidebar metadata instead of Kitty remote control
  if (isCmux()) {
    setCmuxState(title, state);
    return;
  }

  const kittyEnv = getKittyEnv(sessionId);

  try {
    // Need either TERM=xterm-kitty OR a valid KITTY_LISTEN_ON to proceed
    const isKitty = process.env.TERM === 'xterm-kitty' || kittyEnv.listenOn;
    if (!isKitty) return;

    // CRITICAL: Always use --to flag for socket-based remote control.
    // Without it, kitten @ falls back to escape-sequence IPC which leaks
    // garbage text (e.g. "P@kitty-cmd{...}") into terminal output when
    // running in subprocess contexts. See PR #493.
    if (!kittyEnv.listenOn) {
      console.error(`[tab-setter] No kitty socket available, skipping tab update to prevent escape sequence leaks`);
      return;
    }

    // Set BOTH tab title AND window title. Kitty's tab_title_template uses
    // {active_window.title} (the window title). OSC escape codes from Claude Code
    // reset set-tab-title overrides, so the template falls back to window title.
    // By setting both, our title survives OSC resets.
    const toArg = `--to=${kittyEnv.listenOn}`;
    // When called from a process without a focused kitty window (e.g. the Pulse
    // daemon) we must target by window id — otherwise kitten defaults to the
    // currently focused window, which may belong to a different session.
    //
    // CRITICAL: kitty has SEPARATE id-spaces for windows and tabs. `set-window-title`
    // matches windows, so `id:<windowId>` is correct. But `set-tab-title` and
    // `set-tab-color` match TABS, where `id:<n>` means TAB id — a different object.
    // Passing `id:<windowId>` to a tab command lands on whatever tab happens to hold
    // that id (tab-id ≠ window-id → off-by-one), painting our title onto another
    // session's tab. The right field for tab commands is `window_id:<windowId>`,
    // which selects the tab CONTAINING our window. This was the cross-session bleed.
    const { windowId: kWinId } = kittyEnv;
    const winMatch = kWinId ? `--match=id:${kWinId}` : null;              // window commands
    const tabMatch = kWinId ? `--match=window_id:${kWinId}` : null;       // tab commands
    const kitten = kittenBin();
    console.error(`[tab-setter] Setting tab: "${title}" via ${toArg} tab=${tabMatch ?? '(no match)'}`);
    const titleArgs = tabMatch
      ? ['@', toArg, 'set-tab-title', tabMatch, title]
      : ['@', toArg, 'set-tab-title', title];
    const winTitleArgs = winMatch
      ? ['@', toArg, 'set-window-title', winMatch, title]
      : ['@', toArg, 'set-window-title', title];
    execFileSync(kitten, titleArgs, { stdio: 'ignore', timeout: 2000 });
    execFileSync(kitten, winTitleArgs, { stdio: 'ignore', timeout: 2000 });

    // set-tab-color is a TAB command: match the tab holding our window, or fall
    // back to --self when called from the tab's own process (no windowId resolved).
    const colorTargetArg = tabMatch ?? '--self';
    const colorArgs = state === 'idle'
      ? ['@', toArg, 'set-tab-color', colorTargetArg, 'active_bg=none', 'active_fg=none', 'inactive_bg=none', 'inactive_fg=none']
      : ['@', toArg, 'set-tab-color', colorTargetArg, `active_bg=${ACTIVE_TAB_BG}`, `active_fg=${ACTIVE_TAB_FG}`, `inactive_bg=${colors.inactiveBg}`, `inactive_fg=${colors.inactiveFg}`];
    execFileSync(kitten, colorArgs, { stdio: 'ignore', timeout: 2000 });
    console.error(`[tab-setter] Tab commands completed successfully`);
  } catch (err) {
    console.error(`[tab-setter] Error setting tab:`, err);
  }

  // Persist per-window state (or clean up on idle/session end)
  const windowId = kittyEnv.windowId;
  if (!windowId) return;

  try {
    if (state === 'idle') {
      // Session ended — remove state file so no stale data lingers
      const statePath = join(TAB_TITLES_DIR, `${windowId}.json`);
      if (existsSync(statePath)) unlinkSync(statePath);
    } else {
      if (!existsSync(TAB_TITLES_DIR)) mkdirSync(TAB_TITLES_DIR, { recursive: true });
      const stateData: Record<string, unknown> = {
        title,
        inactiveBg: colors.inactiveBg,
        state,
        timestamp: new Date().toISOString(),
      };
      if (previousTitle) stateData.previousTitle = previousTitle;
      if (previousAscent) stateData.previousAscent = previousAscent;
      writeFileSync(join(TAB_TITLES_DIR, `${windowId}.json`), JSON.stringify(stateData), 'utf-8');
    }
  } catch { /* silent */ }

  // Opportunistic cleanup of stale state files for dead windows
  cleanupStaleStateFiles();
}


/**
 * Read per-window state file. Returns null if not found or invalid.
 */
export function readTabState(sessionId?: string): { title: string; state: TabState; previousTitle?: string; previousAscent?: AscentState; ascent?: AscentState } | null {
  const kittyEnv = getKittyEnv(sessionId);
  const windowId = kittyEnv.windowId;
  if (!windowId) return null;
  try {
    const statePath = join(TAB_TITLES_DIR, `${windowId}.json`);
    if (!existsSync(statePath)) return null;
    const raw = JSON.parse(readFileSync(statePath, 'utf-8'));
    return {
      title: raw.title || '',
      state: raw.state || 'idle',
      previousTitle: raw.previousTitle,
      previousAscent: raw.previousAscent as AscentState | undefined,
      // `phase` is the pre-2026-07-27 key; map it forward so a tab written by
      // the old code still re-stamps correctly on the next prompt.
      ascent: (raw.ascent || PHASE_TO_ASCENT[String(raw.phase || '').toLowerCase()]) as AscentState | undefined,
    };
  } catch { return null; }
}

/**
 * Strip the emoji prefix from a tab title to get raw text.
 * Covers every current ascent glyph plus the retired station emoji — the glyph
 * list lives in the ascent table, so a new icon is strippable the moment it ships.
 */
export function stripPrefix(title: string): string {
  return stripAscentPrefix(title);
}

// Noise words to skip when extracting the session label
const SESSION_NOISE = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'of', 'with',
  'my', 'our', 'new', 'old', 'fix', 'add', 'update', 'set', 'get',
]);

/**
 * Extract up to 4 representative words from a session name.
 * "Surface Filter Bar Redesign" → "SURFACE FILTER BAR REDESIGN"
 * "Voice Server Phase Announcements" → "VOICE SERVER PHASE ANNOUNCEMENTS"
 * Returns uppercase. Filters noise words but keeps up to 4 meaningful ones.
 */
export function getSessionOneWord(sessionId: string): string | null {
  try {
    const namesPath = paiPath('MEMORY', 'STATE', 'session-names.json');
    if (!existsSync(namesPath)) return null;
    const names = JSON.parse(readFileSync(namesPath, 'utf-8'));
    const fullName = names[sessionId];
    if (!fullName) return null;

    const words = fullName.split(/\s+/).filter((w: string) => w.length > 0);
    if (words.length === 0) return null;

    // Collect up to 4 non-noise words
    const meaningful = words.filter((w: string) => !SESSION_NOISE.has(w.toLowerCase()));
    if (meaningful.length >= 2) {
      return meaningful.slice(0, 4).join(' ').toUpperCase();
    } else if (meaningful.length === 1) {
      // One meaningful word — grab surrounding words for context
      const idx = words.indexOf(meaningful[0]);
      const nearby = words.slice(Math.max(0, idx - 1), idx + 3).filter((w: string) => w.length > 0);
      return nearby.slice(0, 4).join(' ').toUpperCase();
    }
    // All noise — take first four
    return words.slice(0, 4).join(' ').toUpperCase();
  } catch {
    return null;
  }
}

/**
 * Set tab title and color for an Algorithm run state.
 * Active format:   {ICON} {task description}
 * Cairn format:    🪨 {summary}
 *
 * Called whenever the run's derived ascent state changes. Every glyph, color and
 * fallback gerund comes from `LIFEOS/TOOLS/ascent.ts` — the same table Pulse and
 * the status line read, so a tab can never disagree with the board.
 */
export function setAscentTab(state: AscentState, sessionId: string, summary?: string): void {
  const config = ASCENT[state];
  if (!config) return;

  const oneWord = getSessionOneWord(sessionId) || 'WORKING';
  const kittyEnv = getKittyEnv(sessionId);

  const currentState = readTabState(sessionId);
  const lead = (icon: string) => icon;

  let title: string;
  if (state === 'cairn') {
    // No summary extracted — the session name at least identifies the work.
    title = `${lead(config.icon)} ${summary || oneWord}`;
  } else if (state === 'idle') {
    title = oneWord;
  } else {
    // Preserve the working description carried in from PromptProcessing or a
    // prior phase — only the leading token+icon changes to show the new phase.
    // stripPrefix removes token+icon; tolerate the legacy "ONE_WORD | desc"
    // shape that may linger in pre-format-change state files.
    let existingDesc = '';
    if (currentState?.title) {
      const pipeIdx = currentState.title.indexOf(' | ');
      existingDesc = pipeIdx !== -1
        ? currentState.title.slice(pipeIdx + 3).trim()
        : stripPrefix(currentState.title);
    }
    // Never carry over generic phase gerunds — they're not real task descriptions
    if (GENERIC_PHASE_GERUNDS.has(existingDesc)) existingDesc = '';
    // An explicit summary (e.g. a fresh iteration's gerund from PromptProcessing)
    // overrides the carried-over desc; otherwise keep what the tab already shows.
    const override = summary && summary.trim() && !GENERIC_PHASE_GERUNDS.has(summary.trim()) ? summary.trim() : '';
    const desc = override || existingDesc || config.gerund;
    title = `${lead(config.icon)} ${desc}`;
  }

  // cmux path: use sidebar metadata instead of Kitty remote control
  if (isCmux()) {
    setCmuxState(title, state === 'cairn' ? 'completed' : state === 'idle' ? 'idle' : 'working', state);
    try {
      const progress = ascentProgress(state);
      if (progress > 0) {
        execFileSync('cmux', ['set-progress', String(progress)], { stdio: 'ignore', timeout: 2000 });
      } else {
        execFileSync('cmux', ['clear-progress'], { stdio: 'ignore', timeout: 2000 });
      }
    } catch { /* silent */ }
    return;
  }

  try {
    const isKitty = process.env.TERM === 'xterm-kitty' || kittyEnv.listenOn;
    if (!isKitty) return;

    // CRITICAL: Require socket for remote control. See PR #493.
    if (!kittyEnv.listenOn) {
      console.error(`[tab-setter] No kitty socket available, skipping phase tab update`);
      return;
    }

    const toArg = `--to=${kittyEnv.listenOn}`;
    // See setTabState: tab commands (set-tab-title, set-tab-color) match TABS via
    // window_id:<id>; window commands (set-window-title) match WINDOWS via id:<id>.
    // Mixing them is the cross-session tab-title bleed.
    const { windowId: kWinId } = kittyEnv;
    const winMatch = kWinId ? `--match=id:${kWinId}` : null;
    const tabMatch = kWinId ? `--match=window_id:${kWinId}` : null;
    const colorTargetArg = tabMatch ?? '--self';
    const kitten = kittenBin();

    const titleArgs = tabMatch
      ? ['@', toArg, 'set-tab-title', tabMatch, title]
      : ['@', toArg, 'set-tab-title', title];
    const winTitleArgs = winMatch
      ? ['@', toArg, 'set-window-title', winMatch, title]
      : ['@', toArg, 'set-window-title', title];
    execFileSync(kitten, titleArgs, { stdio: 'ignore', timeout: 2000 });
    execFileSync(kitten, winTitleArgs, { stdio: 'ignore', timeout: 2000 });

    const colorArgs = state === 'idle'
      ? ['@', toArg, 'set-tab-color', colorTargetArg, 'active_bg=none', 'active_fg=none', 'inactive_bg=none', 'inactive_fg=none']
      : ['@', toArg, 'set-tab-color', colorTargetArg, `active_bg=${ACTIVE_TAB_BG}`, `active_fg=${ACTIVE_TAB_FG}`, `inactive_bg=${config.tabBg}`, `inactive_fg=${config.tabFg}`];
    execFileSync(kitten, colorArgs, { stdio: 'ignore', timeout: 2000 });
    console.error(`[tab-setter] Ascent tab: "${title}" (${state}, bg=${config.tabBg})`);
  } catch (err) {
    console.error(`[tab-setter] Error setting ascent tab:`, err);
  }

  // Persist per-window state
  const windowId = kittyEnv.windowId;
  if (!windowId) return;

  try {
    if (!existsSync(TAB_TITLES_DIR)) mkdirSync(TAB_TITLES_DIR, { recursive: true });
    writeFileSync(join(TAB_TITLES_DIR, `${windowId}.json`), JSON.stringify({
      title,
      inactiveBg: config.tabBg,
      state: state === 'cairn' ? 'completed' : 'working',
      ascent: state,
      timestamp: new Date().toISOString(),
    }), 'utf-8');
  } catch { /* silent */ }
}

/**
 * Convenience wrapper for callers that hold ISA/registry data rather than a
 * resolved state — derives through the same `deriveAscent` Pulse uses.
 */
export function setAscentTabFrom(input: AscentInput, sessionId: string, summary?: string): AscentState {
  const state = deriveAscent(input);
  setAscentTab(state, sessionId, summary);
  return state;
}
