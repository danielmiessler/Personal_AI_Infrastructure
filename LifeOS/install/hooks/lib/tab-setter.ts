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
import { TAB_COLORS, PHASE_TAB_CONFIG, ACTIVE_TAB_BG, ACTIVE_TAB_FG, INACTIVE_TAB_FG, type TabState, type AlgorithmTabPhase } from './tab-constants';

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

/** Map Algorithm phase to cmux log level */
function phaseToCmuxLogLevel(phase: string): string {
  switch (phase) {
    case 'OBSERVE':  return 'info';
    case 'THINK':    return 'progress';
    case 'PLAN':     return 'progress';
    case 'BUILD':    return 'info';
    case 'EXECUTE':  return 'warning';
    case 'VERIFY':   return 'success';
    case 'LEARN':    return 'success';
    case 'COMPLETE': return 'success';
    case 'IDLE':     return 'info';
    default:         return 'info';
  }
}

/**
 * Set cmux sidebar metadata for the current workspace.
 * Uses status pills for phase/session, log for activity, progress for ISC completion.
 */
function setCmuxState(title: string, state: TabState, phase?: string): void {
  try {
    const logLevel = phase ? phaseToCmuxLogLevel(phase) : stateToCmuxLogLevel(state);
    const config = phase ? PHASE_TAB_CONFIG[phase] : null;
    const phaseLabel = config ? `${config.symbol} ${phase}` : state.toUpperCase();

    // Status pill: shows current phase/state at a glance
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

// Generic phase gerunds that must never carry over between phases.
// Includes both current short gerunds AND legacy long-form ones that may persist in stale state files.
const GENERIC_PHASE_GERUNDS = new Set([
  ...Object.values(PHASE_TAB_CONFIG).map(c => c.gerund).filter(g => g.length > 0),
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
  sessionId?: string;
  /** Mode/tier token to lead the title: "N" (native). Algorithm tiers come via setPhaseTab. */
  modeToken?: string;
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
  const { state, previousTitle, sessionId, modeToken } = opts;
  // Lead the title with the mode/tier token when supplied (e.g. "N ⚙️ Fixing tabs.").
  // Idempotent: never double-stamp if the caller already prefixed a token.
  const title = modeToken && !MODE_TOKEN_RE.test(opts.title)
    ? `${modeToken} ${opts.title}`
    : opts.title;
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
      writeFileSync(join(TAB_TITLES_DIR, `${windowId}.json`), JSON.stringify(stateData), 'utf-8');
    }
  } catch { /* silent */ }

  // Opportunistic cleanup of stale state files for dead windows
  cleanupStaleStateFiles();
}

/**
 * Set ONLY the leading mode/tier token ("N" | "E1".."E5") on the current tab,
 * preserving the working description, and clearing any stale completion state.
 *
 * NO LIVE CALLER since 2026-07-11: this was the authoritative mode-token
 * writer for the per-prompt classifier (TheRouter.hook.ts, retired entirely —
 * no successor stamps a fresh token; see TerminalTabs.md). It is deliberately a
 * distinct primitive from setTabState (which takes a full title) and setPhaseTab
 * (which needs an Algorithm phase): here we mutate ONLY the token, keep the
 * description, and drop a prior turn's `✅ done` so it can't linger into live work.
 *
 * - `token`: "N" for NATIVE turns, "E1".."E5" for ALGORITHM. (MINIMAL passes no call.)
 * - `fallbackDesc`: used only when the current title is absent or a stale completion
 *   (whose description we intentionally drop). Normally PromptProcessing's ~50ms
 *   deterministic stamp has already set a live working description we preserve.
 *
 * Silent no-op when no kitty socket/session resolves (setTabState handles that).
 * Never writes stdout — safe to call from a hook that emits JSON on stdout.
 */
const LIVE_ALGO_PHASES = new Set(['OBSERVE', 'THINK', 'PLAN', 'BUILD', 'EXECUTE', 'VERIFY', 'LEARN']);

export function setModeToken(sessionId: string | undefined, token: string, fallbackDesc?: string): void {
  if (!token) return;
  try {
    const cur = readTabState(sessionId);
    const wasCompleted = !!cur && (cur.state === 'completed' || cur.state === 'idle' || /✅/.test(cur.title || ''));

    // Mid-run follow-up on an ALGORITHM turn: the tab is already showing a live
    // phase (e.g. "E4 👁️ desc"). Preserve the phase icon + phase field, swapping
    // ONLY the tier token — delegate to setPhaseTab. Without this, re-stamping the
    // token every turn would revert 👁️→⚙️ and drop the phase (the documented
    // "orange gear wiped the phase tab" regression). Only for E-tier tokens: a
    // NATIVE ('N') follow-up after an algorithm turn SHOULD clear the phase → falls
    // through to the neutral stamp below.
    if (cur && !wasCompleted && cur.phase && LIVE_ALGO_PHASES.has(cur.phase) && /^E[1-5]$/.test(token)) {
      const carriedDesc = stripPrefix(cur.title);
      setPhaseTab(cur.phase as AlgorithmTabPhase, sessionId!, carriedDesc || undefined, token);
      return;
    }

    // Preserve a LIVE working description; drop a stale completion's text.
    let desc = cur && !wasCompleted ? stripPrefix(cur.title) : '';
    if (!desc) desc = (fallbackDesc && fallbackDesc.trim()) || getSessionOneWord(sessionId || '') || 'working…';
    const state: TabState = token === 'N' ? 'native' : 'working';
    // Neutral working gear at turn start (pre-phase); phase icons (👁️📋…) arrive from
    // setPhaseTab. Title already carries the token, so don't also pass modeToken.
    setTabState({ title: `${token} ⚙️ ${desc}`, state, sessionId });
  } catch (err) {
    console.error('[tab-setter] setModeToken failed:', err);
  }
}

/**
 * Read per-window state file. Returns null if not found or invalid.
 */
export function readTabState(sessionId?: string): { title: string; state: TabState; previousTitle?: string; phase?: string } | null {
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
      phase: raw.phase,
    };
  } catch { return null; }
}

/**
 * Mode/tier token that leads every tab title: "N" for NATIVE turns, "E1".."E5"
 * for the Algorithm tier. Always followed by whitespace then the state/phase icon.
 */
export const MODE_TOKEN_RE = /^(N|E[1-5])\s+/;

/** Extract the leading mode/tier token ("N" | "E1".."E5") from a title, or null. */
export function extractModeToken(title: string): string | null {
  const m = title.match(MODE_TOKEN_RE);
  return m ? m[1] : null;
}

/**
 * Strip the mode/tier token AND emoji prefix from a tab title to get raw text.
 * Handles working-state prefixes (🧠⚙️✓❓), Algorithm phase symbols (👁️📋🔨⚡✅📚),
 * and the leading mode/tier token (N / E1-E5). Order-tolerant.
 */
export function stripPrefix(title: string): string {
  return title
    .replace(MODE_TOKEN_RE, '')
    .replace(/^(?:🧠|⚙️|⚙|✓|❓|👁️|📋|🔨|⚡|✅|📚|⚠)\s*/, '')
    .trim();
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
 * Set tab title and color for an Algorithm phase.
 * Active format:    {SYMBOL} {ONE_WORD} | {PHASE}
 * Complete format:  {ONE_WORD} | {summary}
 *
 * Called on algorithm phase transitions.
 */
export function setPhaseTab(phase: AlgorithmTabPhase, sessionId: string, summary?: string, eLevel?: string): void {
  const config = PHASE_TAB_CONFIG[phase];
  if (!config) return;

  const oneWord = getSessionOneWord(sessionId) || 'WORKING';
  const kittyEnv = getKittyEnv(sessionId);

  // Resolve the mode/tier token that leads the title:
  //   1. explicit eLevel (Algorithm tier from ISA frontmatter — "E1".."E5"), else
  //   2. the token already on this window's tab — preserves "N" for a native
  //      session completing, or a tier stamped by an earlier phase, else
  //   3. none.
  const currentState = readTabState(sessionId);
  const recoveredToken = currentState?.title ? extractModeToken(currentState.title) : null;
  const token = eLevel || recoveredToken || '';
  const lead = (icon: string) => [token, icon].filter(Boolean).join(' ');

  // Build title based on phase. Format: {TOKEN} {ICON} {summary}
  let title: string;
  if (phase === 'COMPLETE' && summary) {
    title = `${lead('✅')} ${summary}`;
  } else if (phase === 'COMPLETE') {
    // No summary extracted — use session name instead of generic "Done."
    title = `${lead('✅')} ${oneWord}`;
  } else if (phase === 'IDLE') {
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
    title = `${lead(config.symbol)} ${desc}`;
  }

  // cmux path: use sidebar metadata for phase display
  if (isCmux()) {
    setCmuxState(title, phase === 'COMPLETE' ? 'completed' : phase === 'IDLE' ? 'idle' : 'working', phase);
    // Also set progress based on phase number (1-7 scale)
    const phaseProgress: Record<string, number> = {
      OBSERVE: 0.14, THINK: 0.28, PLAN: 0.42, BUILD: 0.57, EXECUTE: 0.71, VERIFY: 0.85, LEARN: 1.0, COMPLETE: 1.0, IDLE: 0,
    };
    try {
      const progress = phaseProgress[phase] ?? 0;
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

    const colorArgs = phase === 'IDLE'
      ? ['@', toArg, 'set-tab-color', colorTargetArg, 'active_bg=none', 'active_fg=none', 'inactive_bg=none', 'inactive_fg=none']
      : ['@', toArg, 'set-tab-color', colorTargetArg, `active_bg=${ACTIVE_TAB_BG}`, `active_fg=${ACTIVE_TAB_FG}`, `inactive_bg=${config.inactiveBg}`, `inactive_fg=${INACTIVE_TAB_FG}`];
    execFileSync(kitten, colorArgs, { stdio: 'ignore', timeout: 2000 });
    console.error(`[tab-setter] Phase tab: "${title}" (${phase}, bg=${config.inactiveBg})`);
  } catch (err) {
    console.error(`[tab-setter] Error setting phase tab:`, err);
  }

  // Persist per-window state
  const windowId = kittyEnv.windowId;
  if (!windowId) return;

  try {
    if (!existsSync(TAB_TITLES_DIR)) mkdirSync(TAB_TITLES_DIR, { recursive: true });
    writeFileSync(join(TAB_TITLES_DIR, `${windowId}.json`), JSON.stringify({
      title,
      inactiveBg: config.inactiveBg,
      state: phase === 'COMPLETE' ? 'completed' : 'working',
      phase,
      timestamp: new Date().toISOString(),
    }), 'utf-8');
  } catch { /* silent */ }
}
