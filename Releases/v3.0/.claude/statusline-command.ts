#!/usr/bin/env bun
/**
 * PAI Status Line (Cross-Platform TypeScript)
 *
 * Responsive status line with 4 display modes based on terminal width:
 *   - nano   (<35 cols): Minimal single-line displays
 *   - micro  (35-54):    Compact with key metrics
 *   - mini   (55-79):    Balanced information density
 *   - normal (80+):      Full display with sparklines
 *
 * Output order: Branding → Context → Usage → Git → Memory → Learning → Quote
 *
 * This is the cross-platform TypeScript equivalent of statusline-command.sh.
 * Works on macOS, Linux, and Windows (no bash/jq/python3 dependencies).
 *
 * Part of: PRD-20260219-windows-11-support (Phase 7)
 */

import { homedir, tmpdir, platform } from 'os';
import { join, basename } from 'path';
import { spawnSync } from 'child_process';

// ─── CONFIGURATION ──────────────────────────────────────────────────────────

const PAI_DIR = process.env.PAI_DIR || join(homedir(), '.claude');
const SETTINGS_FILE = join(PAI_DIR, 'settings.json');
const RATINGS_FILE = join(PAI_DIR, 'MEMORY', 'LEARNING', 'SIGNALS', 'ratings.jsonl');
const TREND_CACHE = join(PAI_DIR, 'MEMORY', 'STATE', 'trending-cache.json');
const MODEL_CACHE = join(PAI_DIR, 'MEMORY', 'STATE', 'model-cache.txt');
const QUOTE_CACHE = join(PAI_DIR, '.quote-cache');
const LOCATION_CACHE = join(PAI_DIR, 'MEMORY', 'STATE', 'location-cache.json');
const WEATHER_CACHE = join(PAI_DIR, 'MEMORY', 'STATE', 'weather-cache.json');
const USAGE_CACHE = join(PAI_DIR, 'MEMORY', 'STATE', 'usage-cache.json');
const LEARNING_CACHE = join(PAI_DIR, 'MEMORY', 'STATE', 'learning-cache.json');
const SESSION_NAMES_FILE = join(PAI_DIR, 'MEMORY', 'STATE', 'session-names.json');
const SESSION_CACHE = join(PAI_DIR, 'MEMORY', 'STATE', 'session-name-cache.json');

// Cache TTL in seconds
const LOCATION_CACHE_TTL = 3600;
const WEATHER_CACHE_TTL = 900;
const GIT_CACHE_TTL = 5;
const USAGE_CACHE_TTL = 60;
const LEARNING_CACHE_TTL = 30;

const isWindows = platform === 'win32';

// ─── COLOR PALETTE ──────────────────────────────────────────────────────────

const RESET = '\x1b[0m';

// Structural
const SLATE_300 = '\x1b[38;2;203;213;225m';
const SLATE_400 = '\x1b[38;2;148;163;184m';
const SLATE_500 = '\x1b[38;2;100;116;139m';
const SLATE_600 = '\x1b[38;2;71;85;105m';

// Semantic
const EMERALD = '\x1b[38;2;74;222;128m';
const ROSE = '\x1b[38;2;251;113;133m';

// Rating gradient
const RATING_10 = '\x1b[38;2;74;222;128m';
const RATING_8 = '\x1b[38;2;163;230;53m';
const RATING_7 = '\x1b[38;2;250;204;21m';
const RATING_6 = '\x1b[38;2;251;191;36m';
const RATING_5 = '\x1b[38;2;251;146;60m';
const RATING_4 = '\x1b[38;2;248;113;113m';
const RATING_LOW = '\x1b[38;2;239;68;68m';

// Line 0: PAI Branding
const PAI_P = '\x1b[38;2;30;58;138m';
const PAI_A = '\x1b[38;2;59;130;246m';
const PAI_I = '\x1b[38;2;147;197;253m';
const PAI_LABEL = '\x1b[38;2;100;116;139m';
const PAI_CITY = '\x1b[38;2;147;197;253m';
const PAI_STATE = '\x1b[38;2;100;116;139m';
const PAI_TIME = '\x1b[38;2;96;165;250m';
const PAI_WEATHER = '\x1b[38;2;135;206;235m';
const PAI_SESSION = '\x1b[38;2;120;135;160m';

// Line 1: Wielding
const WIELD_ACCENT = '\x1b[38;2;103;232;249m';
const WIELD_WORKFLOWS = '\x1b[38;2;94;234;212m';
const WIELD_HOOKS = '\x1b[38;2;6;182;212m';

// Line: Context
const CTX_PRIMARY = '\x1b[38;2;129;140;248m';
const CTX_SECONDARY = '\x1b[38;2;165;180;252m';
const CTX_BUCKET_EMPTY = '\x1b[38;2;75;82;95m';

// Line: Usage
const USAGE_PRIMARY = '\x1b[38;2;251;191;36m';
const USAGE_LABEL = '\x1b[38;2;217;163;29m';
const USAGE_RESET_CLR = '\x1b[38;2;148;163;184m';
const USAGE_EXTRA = '\x1b[38;2;140;90;60m';

// Line: Git
const GIT_PRIMARY = '\x1b[38;2;56;189;248m';
const GIT_VALUE = '\x1b[38;2;186;230;253m';
const GIT_DIR = '\x1b[38;2;147;197;253m';
const GIT_CLEAN = '\x1b[38;2;125;211;252m';
const GIT_MODIFIED = '\x1b[38;2;96;165;250m';
const GIT_ADDED = '\x1b[38;2;59;130;246m';
const GIT_STASH = '\x1b[38;2;165;180;252m';
const GIT_AGE_FRESH = '\x1b[38;2;125;211;252m';
const GIT_AGE_RECENT = '\x1b[38;2;96;165;250m';
const GIT_AGE_STALE = '\x1b[38;2;59;130;246m';
const GIT_AGE_OLD = '\x1b[38;2;99;102;241m';

// Line: Memory
const LEARN_PRIMARY = '\x1b[38;2;167;139;250m';
const LEARN_SECONDARY = '\x1b[38;2;196;181;253m';
const LEARN_WORK = '\x1b[38;2;192;132;252m';
const LEARN_SIGNALS = '\x1b[38;2;139;92;246m';
const LEARN_SESSIONS = '\x1b[38;2;99;102;241m';
const LEARN_RESEARCH = '\x1b[38;2;129;140;248m';

// Line: Learning Signal
const SIGNAL_PERIOD = '\x1b[38;2;148;163;184m';
const LEARN_LABEL = '\x1b[38;2;21;128;61m';

// Line: Quote
const QUOTE_PRIMARY = '\x1b[38;2;252;211;77m';
const QUOTE_AUTHOR = '\x1b[38;2;180;140;60m';

// ─── HELPERS ────────────────────────────────────────────────────────────────

function readJsonSafe(path: string): any {
  try {
    const text = require('fs').readFileSync(path, 'utf-8');
    return JSON.parse(text);
  } catch { return null; }
}

function fileExists(path: string): boolean {
  try { require('fs').accessSync(path); return true; } catch { return false; }
}

function fileMtime(path: string): number {
  try { return Math.floor(require('fs').statSync(path).mtimeMs / 1000); } catch { return 0; }
}

function ensureDir(path: string): void {
  try { require('fs').mkdirSync(path, { recursive: true }); } catch {}
}

function writeFileSafe(path: string, content: string): void {
  try {
    ensureDir(require('path').dirname(path));
    require('fs').writeFileSync(path, content);
  } catch {}
}

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

function getRatingColor(val: string): string {
  if (val === '—' || !val) return SLATE_400;
  const n = Math.floor(parseFloat(val));
  if (isNaN(n)) return SLATE_400;
  if (n >= 9) return RATING_10;
  if (n >= 8) return RATING_8;
  if (n >= 7) return RATING_7;
  if (n >= 6) return RATING_6;
  if (n >= 5) return RATING_5;
  if (n >= 4) return RATING_4;
  return RATING_LOW;
}

function getUsageColor(pct: number): string {
  if (pct >= 80) return ROSE;
  if (pct >= 60) return '\x1b[38;2;251;146;60m';
  if (pct >= 40) return '\x1b[38;2;251;191;36m';
  return EMERALD;
}

function getBucketColor(pos: number, max: number): string {
  const pct = Math.floor(pos * 100 / max);
  let r: number, g: number, b: number;
  if (pct <= 33) {
    r = Math.floor(74 + (250 - 74) * pct / 33);
    g = Math.floor(222 + (204 - 222) * pct / 33);
    b = Math.floor(128 + (21 - 128) * pct / 33);
  } else if (pct <= 66) {
    const t = pct - 33;
    r = Math.floor(250 + (251 - 250) * t / 33);
    g = Math.floor(204 + (146 - 204) * t / 33);
    b = Math.floor(21 + (60 - 21) * t / 33);
  } else {
    const t = pct - 66;
    r = Math.floor(251 + (239 - 251) * t / 34);
    g = Math.floor(146 + (68 - 146) * t / 34);
    b = Math.floor(60 + (68 - 60) * t / 34);
  }
  return `\x1b[38;2;${r};${g};${b}m`;
}

function renderContextBar(width: number, pct: number): string {
  const filled = Math.max(0, Math.floor(pct * width / 100));
  const useSpacing = width <= 20;
  let output = '';
  for (let i = 1; i <= width; i++) {
    if (i <= filled) {
      output += `${getBucketColor(i, width)}\u26C1${RESET}`;
    } else {
      output += `${CTX_BUCKET_EMPTY}\u26C1${RESET}`;
    }
    if (useSpacing) output += ' ';
  }
  return output.trimEnd();
}

function calcBarWidth(mode: string): number {
  const contentWidth = 72;
  let prefixLen: number, suffixLen: number, bucketSize: number;
  switch (mode) {
    case 'nano': prefixLen = 2; suffixLen = 5; bucketSize = 2; break;
    case 'micro': prefixLen = 2; suffixLen = 5; bucketSize = 2; break;
    case 'mini': prefixLen = 12; suffixLen = 5; bucketSize = 2; break;
    default: prefixLen = 12; suffixLen = 5; bucketSize = 1; break;
  }
  const available = contentWidth - prefixLen - suffixLen;
  let buckets = Math.floor(available / bucketSize);
  const mins: Record<string, number> = { nano: 5, micro: 6, mini: 8, normal: 16 };
  if (buckets < (mins[mode] || 16)) buckets = mins[mode] || 16;
  return buckets;
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec >= 3600) return `${Math.floor(sec / 3600)}h${Math.floor((sec % 3600) / 60)}m`;
  if (sec >= 60) return `${Math.floor(sec / 60)}m${sec % 60}s`;
  return `${sec}s`;
}

function timeUntilReset(isoStr: string): string {
  if (!isoStr) return '—';
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return '—';
    const diff = Math.max(0, Math.floor((dt.getTime() - Date.now()) / 1000));
    if (diff <= 0) return 'now';
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    if (h >= 24) {
      const d = Math.floor(h / 24);
      const rh = h % 24;
      return rh > 0 ? `${d}d${rh}h` : `${d}d`;
    }
    return h > 0 ? `${h}h${m}m` : `${m}m`;
  } catch { return '—'; }
}

function resetClockTime(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const dt = new Date(isoStr);
    if (isNaN(dt.getTime())) return '';
    const h = dt.getHours().toString().padStart(2, '0');
    const m = dt.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch { return ''; }
}

function gitCmd(...args: string[]): string {
  try {
    const result = spawnSync('git', args, { encoding: 'utf-8', timeout: 5000 });
    return (result.stdout || '').trim();
  } catch { return ''; }
}

const SEPARATOR = `${SLATE_600}${'─'.repeat(72)}${RESET}`;

// ─── SPARKLINE ──────────────────────────────────────────────────────────────

function ratingToBar(rating: number): string {
  const r = Math.floor(rating);
  if (r >= 10) return '\x1b[38;2;34;197;94m\u2585\x1b[0m';
  if (r >= 9) return '\x1b[38;2;74;222;128m\u2585\x1b[0m';
  if (r >= 8) return '\x1b[38;2;134;239;172m\u2584\x1b[0m';
  if (r >= 7) return '\x1b[38;2;59;130;246m\u2583\x1b[0m';
  if (r >= 6) return '\x1b[38;2;96;165;250m\u2582\x1b[0m';
  if (r >= 5) return '\x1b[38;2;253;224;71m\u2581\x1b[0m';
  if (r >= 4) return '\x1b[38;2;253;186;116m\u2582\x1b[0m';
  if (r >= 3) return '\x1b[38;2;251;146;60m\u2583\x1b[0m';
  if (r >= 2) return '\x1b[38;2;248;113;113m\u2584\x1b[0m';
  return '\x1b[38;2;239;68;68m\u2585\x1b[0m';
}

function makeSparkline(ratings: { epoch: number; rating: number }[], periodStart: number): string {
  const now = nowEpoch();
  const dur = now - periodStart;
  const sz = dur / 58;
  const parts: string[] = [];
  for (let i = 0; i < 58; i++) {
    const s = periodStart + i * sz;
    const e = s + sz;
    const bucket = ratings.filter(r => r.epoch >= s && r.epoch < e).map(r => r.rating);
    if (bucket.length === 0) {
      parts.push('\x1b[38;2;45;50;60m \x1b[0m');
    } else {
      const avg = bucket.reduce((a, b) => a + b, 0) / bucket.length;
      parts.push(ratingToBar(avg));
    }
  }
  return parts.join('');
}

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  // Read input from stdin
  let inputText = '';
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    inputText = Buffer.concat(chunks).toString('utf-8');
  } catch {}

  let input: any = {};
  try { input = JSON.parse(inputText); } catch {}

  // Parse settings
  const settings = readJsonSafe(SETTINGS_FILE) || {};

  // Extract DA name
  const daName = settings?.daidentity?.name ||
    settings?.daidentity?.displayName ||
    settings?.env?.DA || 'Assistant';

  // PAI and Algorithm versions
  const paiVersion = settings?.pai?.version || '—';
  const algoLatestFile = join(PAI_DIR, 'skills', 'PAI', 'Components', 'Algorithm', 'LATEST');
  let algoVersion = '—';
  try {
    algoVersion = require('fs').readFileSync(algoLatestFile, 'utf-8').trim().replace(/^v/i, '') || '—';
  } catch {}

  // Extract input data
  const currentDir = input?.workspace?.current_dir || input?.cwd || '.';
  const sessionId = input?.session_id || '';
  const modelName = input?.model?.display_name || 'unknown';
  const ccVersionJson = input?.version || '';
  const durationMs = input?.cost?.total_duration_ms || 0;
  const contextMax = input?.context_window?.context_window_size || 200000;
  let contextPct = input?.context_window?.used_percentage || 0;
  const contextRemaining = input?.context_window?.remaining_percentage || 100;
  const totalInput = input?.context_window?.total_input_tokens || 0;
  const totalOutput = input?.context_window?.total_output_tokens || 0;

  // Calculate context percentage if needed
  if (contextPct === 0 && totalInput > 0) {
    contextPct = Math.floor((totalInput + totalOutput) * 100 / contextMax);
  }

  // CC version
  let ccVersion = ccVersionJson || 'unknown';
  if (ccVersion === 'unknown' || !ccVersion) {
    try {
      const result = spawnSync('claude', ['--version'], { encoding: 'utf-8', timeout: 3000 });
      ccVersion = (result.stdout || '').trim().split(' ')[0] || 'unknown';
    } catch { ccVersion = 'unknown'; }
  }

  // Cache model name
  writeFileSafe(MODEL_CACHE, modelName);

  const dirName = basename(currentDir);

  // ─── SESSION LABEL ──────────────────────────────────────────────────────
  let sessionLabel = '';
  if (sessionId) {
    const projectSlug = currentDir.replace(/[/.]/g, '-');
    const sessionsIndex = join(PAI_DIR, 'projects', projectSlug, 'sessions-index.json');

    // Try cache first
    const cached = readJsonSafe(SESSION_CACHE);
    if (cached?.session_id === sessionId && cached?.label) {
      const cMtime = fileMtime(SESSION_CACHE);
      const iMtime = fileMtime(sessionsIndex);
      const nMtime = fileMtime(SESSION_NAMES_FILE);
      const maxSource = Math.max(iMtime, nMtime);
      if (cMtime >= maxSource) sessionLabel = cached.label;
    }

    // Lookup from sessions-index
    if (!sessionLabel && fileExists(sessionsIndex)) {
      try {
        const idx = readJsonSafe(sessionsIndex);
        if (Array.isArray(idx)) {
          const entry = idx.find((e: any) => e?.sessionId === sessionId);
          if (entry?.customTitle) sessionLabel = entry.customTitle;
        }
      } catch {}
    }

    // Fallback to session-names.json
    if (!sessionLabel && fileExists(SESSION_NAMES_FILE)) {
      try {
        const names = readJsonSafe(SESSION_NAMES_FILE);
        if (names?.[sessionId]) sessionLabel = names[sessionId];
      } catch {}
    }

    // Update cache
    if (sessionLabel) {
      writeFileSafe(SESSION_CACHE, JSON.stringify({ session_id: sessionId, label: sessionLabel }));
    }
  }

  // ─── PARALLEL DATA FETCH ────────────────────────────────────────────────

  interface GitData {
    isGitRepo: boolean; branch: string; stashCount: number;
    modified: number; staged: number; untracked: number; totalChanged: number;
    ahead: number; behind: number; lastCommitEpoch: number;
  }

  interface Counts {
    skills: number; workflows: number; hooks: number; learnings: number;
    files: number; work: number; sessions: number; research: number; ratings: number;
  }

  interface UsageData {
    usage5h: number; usage7d: number; usage5hReset: string; usage7dReset: string;
    usageOpus: number | null; usageSonnet: number | null;
    extraEnabled: boolean; extraLimit: number; extraUsed: number;
    wsCostCents: number;
  }

  interface LocationData { city: string; state: string; }
  interface WeatherData { str: string; }

  // Git
  const fetchGit = (): GitData => {
    try {
      const gitDir = gitCmd('rev-parse', '--git-dir');
      if (!gitDir) return { isGitRepo: false, branch: '', stashCount: 0, modified: 0, staged: 0, untracked: 0, totalChanged: 0, ahead: 0, behind: 0, lastCommitEpoch: 0 };

      // Check cache
      const gitRoot = gitCmd('rev-parse', '--show-toplevel').replace(/\//g, '_');
      const gitCachePath = join(PAI_DIR, 'MEMORY', 'STATE', `git-cache${gitRoot}.json`);
      const cacheAge = nowEpoch() - fileMtime(gitCachePath);
      if (cacheAge < GIT_CACHE_TTL && fileExists(gitCachePath)) {
        const cached = readJsonSafe(gitCachePath);
        if (cached) return cached;
      }

      const branch = gitCmd('branch', '--show-current') || 'detached';
      const stashList = gitCmd('stash', 'list');
      const stashCount = stashList ? stashList.split('\n').length : 0;
      const syncInfo = gitCmd('rev-list', '--left-right', '--count', 'HEAD...@{u}');
      const lastCommitEpoch = parseInt(gitCmd('log', '-1', '--format=%ct')) || 0;
      const statusOutput = gitCmd('status', '--porcelain');
      const lines = statusOutput ? statusOutput.split('\n').filter(l => l) : [];
      const modified = lines.filter(l => /^.[MDRC]/.test(l)).length;
      const staged = lines.filter(l => /^[MADRC]/.test(l)).length;
      const untracked = lines.filter(l => l.startsWith('??')).length;
      const totalChanged = modified + staged;

      let ahead = 0, behind = 0;
      if (syncInfo) {
        const parts = syncInfo.split(/\s+/);
        ahead = parseInt(parts[0]) || 0;
        behind = parseInt(parts[1]) || 0;
      }

      const data: GitData = { isGitRepo: true, branch, stashCount, modified, staged, untracked, totalChanged, ahead, behind, lastCommitEpoch };
      writeFileSafe(gitCachePath, JSON.stringify(data));
      return data;
    } catch { return { isGitRepo: false, branch: '', stashCount: 0, modified: 0, staged: 0, untracked: 0, totalChanged: 0, ahead: 0, behind: 0, lastCommitEpoch: 0 }; }
  };

  // Location
  const fetchLocation = async (): Promise<LocationData> => {
    const cacheAge = nowEpoch() - fileMtime(LOCATION_CACHE);
    if (cacheAge > LOCATION_CACHE_TTL) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2000);
        const resp = await fetch('http://ip-api.com/json/?fields=city,regionName,country,lat,lon', { signal: ctrl.signal });
        clearTimeout(timer);
        const data = await resp.json() as any;
        if (data?.city) writeFileSafe(LOCATION_CACHE, JSON.stringify(data));
      } catch {}
    }
    const cached = readJsonSafe(LOCATION_CACHE);
    return { city: cached?.city || 'Unknown', state: cached?.regionName || '' };
  };

  // Weather
  const fetchWeather = async (): Promise<WeatherData> => {
    const cacheAge = nowEpoch() - fileMtime(WEATHER_CACHE);
    if (cacheAge > WEATHER_CACHE_TTL) {
      try {
        const loc = readJsonSafe(LOCATION_CACHE);
        const lat = loc?.lat || 37.7749;
        const lon = loc?.lon || -122.4194;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const resp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=celsius`, { signal: ctrl.signal });
        clearTimeout(timer);
        const data = await resp.json() as any;
        if (data?.current) {
          const temp = data.current.temperature_2m;
          const code = data.current.weather_code;
          const conditions: Record<number, string> = {
            0: 'Clear', 1: 'Cloudy', 2: 'Cloudy', 3: 'Cloudy',
            45: 'Foggy', 48: 'Foggy',
            51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 56: 'Drizzle', 57: 'Drizzle',
            61: 'Rain', 63: 'Rain', 65: 'Rain', 66: 'Rain', 67: 'Rain',
            71: 'Snow', 73: 'Snow', 75: 'Snow', 77: 'Snow',
            80: 'Showers', 81: 'Showers', 82: 'Showers',
            85: 'Snow', 86: 'Snow',
            95: 'Storm', 96: 'Storm', 99: 'Storm',
          };
          const condition = conditions[code] || 'Clear';
          writeFileSafe(WEATHER_CACHE, `${temp}\u00B0C ${condition}`);
        }
      } catch {}
    }
    try {
      const str = require('fs').readFileSync(WEATHER_CACHE, 'utf-8').trim();
      return { str: str || '—' };
    } catch { return { str: '—' }; }
  };

  // Counts
  const fetchCounts = (): Counts => {
    const c = settings?.counts;
    if (c) return {
      skills: c.skills || 65, workflows: c.workflows || 339, hooks: c.hooks || 18,
      learnings: c.signals || 3000, files: c.files || 172,
      work: c.work || 0, sessions: c.sessions || 0, research: c.research || 0, ratings: c.ratings || 0,
    };
    return { skills: 65, workflows: 339, hooks: 18, learnings: 3000, files: 172, work: 0, sessions: 0, research: 0, ratings: 0 };
  };

  // Usage
  const fetchUsage = async (): Promise<UsageData> => {
    const defaults: UsageData = { usage5h: 0, usage7d: 0, usage5hReset: '', usage7dReset: '', usageOpus: null, usageSonnet: null, extraEnabled: false, extraLimit: 0, extraUsed: 0, wsCostCents: 0 };
    const cacheAge = nowEpoch() - fileMtime(USAGE_CACHE);

    if (cacheAge > USAGE_CACHE_TTL && !isWindows) {
      // Try macOS Keychain for OAuth token
      try {
        const result = spawnSync('security', ['find-generic-password', '-s', 'Claude Code-credentials', '-w'], { encoding: 'utf-8', timeout: 3000 });
        if (result.stdout) {
          const creds = JSON.parse(result.stdout.trim());
          const token = creds?.claudeAiOauth?.accessToken;
          if (token) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 3000);
            const resp = await fetch('https://api.anthropic.com/api/oauth/usage', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'anthropic-beta': 'oauth-2025-04-20',
              },
              signal: ctrl.signal,
            });
            clearTimeout(timer);
            const usageJson = await resp.json() as any;
            if (usageJson?.five_hour) {
              // Preserve workspace_cost from existing cache
              const existing = readJsonSafe(USAGE_CACHE);
              if (existing?.workspace_cost) usageJson.workspace_cost = existing.workspace_cost;
              writeFileSafe(USAGE_CACHE, JSON.stringify(usageJson, null, 2));
            }
          }
        }
      } catch {}
    }

    const cached = readJsonSafe(USAGE_CACHE);
    if (!cached) return defaults;
    return {
      usage5h: cached?.five_hour?.utilization || 0,
      usage7d: cached?.seven_day?.utilization || 0,
      usage5hReset: cached?.five_hour?.resets_at || '',
      usage7dReset: cached?.seven_day?.resets_at || '',
      usageOpus: cached?.seven_day_opus?.utilization ?? null,
      usageSonnet: cached?.seven_day_sonnet?.utilization ?? null,
      extraEnabled: cached?.extra_usage?.is_enabled || false,
      extraLimit: cached?.extra_usage?.monthly_limit || 0,
      extraUsed: cached?.extra_usage?.used_credits || 0,
      wsCostCents: cached?.workspace_cost?.month_used_cents || 0,
    };
  };

  // Quote
  const fetchQuote = async (): Promise<{ text: string; author: string } | null> => {
    const cacheAge = nowEpoch() - fileMtime(QUOTE_CACHE);
    if (cacheAge > 300 || !fileExists(QUOTE_CACHE)) {
      const apiKey = process.env.ZENQUOTES_API_KEY ||
        (() => { try {
          const envFile = join(process.env.PAI_CONFIG_DIR || join(homedir(), '.config', 'PAI'), '.env');
          const text = require('fs').readFileSync(envFile, 'utf-8');
          const match = text.match(/ZENQUOTES_API_KEY=(.+)/);
          return match?.[1]?.trim() || '';
        } catch { return ''; } })();
      if (apiKey) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 1000);
          const resp = await fetch(`https://zenquotes.io/api/random/${apiKey}`, { signal: ctrl.signal });
          clearTimeout(timer);
          const data = await resp.json() as any;
          const q = data?.[0];
          if (q?.q && q.q.length < 80) {
            writeFileSafe(QUOTE_CACHE, `${q.q}|${q.a}`);
          }
        } catch {}
      }
    }
    try {
      const text = require('fs').readFileSync(QUOTE_CACHE, 'utf-8').trim();
      const [qText, qAuthor] = text.split('|');
      if (qText && qAuthor) return { text: qText, author: qAuthor };
    } catch {}
    return null;
  };

  // Run fetches in parallel
  const [git, location, weather, usage] = await Promise.all([
    Promise.resolve(fetchGit()),
    fetchLocation(),
    fetchWeather(),
    fetchUsage(),
  ]);
  const counts = fetchCounts();
  const quote = await fetchQuote();

  // ─── TERMINAL WIDTH ───────────────────────────────────────────────────────

  const termWidth = process.stdout.columns || parseInt(process.env.COLUMNS || '') || 80;
  let MODE: string;
  if (termWidth < 35) MODE = 'nano';
  else if (termWidth < 55) MODE = 'micro';
  else if (termWidth < 80) MODE = 'mini';
  else MODE = 'normal';

  // ─── CONTEXT DISPLAY ──────────────────────────────────────────────────────

  const compactionThreshold = settings?.contextDisplay?.compactionThreshold || 100;
  const rawPct = Math.floor(contextPct);
  let displayPct: number;
  if (compactionThreshold < 100 && compactionThreshold > 0) {
    displayPct = Math.min(100, Math.floor(rawPct * 100 / compactionThreshold));
  } else {
    displayPct = rawPct;
  }

  let pctColor: string;
  if (displayPct >= 80) pctColor = ROSE;
  else if (displayPct >= 60) pctColor = '\x1b[38;2;251;146;60m';
  else if (displayPct >= 40) pctColor = '\x1b[38;2;251;191;36m';
  else pctColor = EMERALD;

  // ─── GIT AGE ──────────────────────────────────────────────────────────────

  let ageDisplay = '', ageColor = '', gitStatusIcon = '';
  if (git.isGitRepo && git.lastCommitEpoch) {
    const ageSec = nowEpoch() - git.lastCommitEpoch;
    const ageMin = Math.floor(ageSec / 60);
    const ageHrs = Math.floor(ageSec / 3600);
    const ageDays = Math.floor(ageSec / 86400);

    if (ageMin < 1) { ageDisplay = 'now'; ageColor = GIT_AGE_FRESH; }
    else if (ageHrs < 1) { ageDisplay = `${ageMin}m`; ageColor = GIT_AGE_FRESH; }
    else if (ageHrs < 24) { ageDisplay = `${ageHrs}h`; ageColor = GIT_AGE_RECENT; }
    else if (ageDays < 7) { ageDisplay = `${ageDays}d`; ageColor = GIT_AGE_STALE; }
    else { ageDisplay = `${ageDays}d`; ageColor = GIT_AGE_OLD; }

    gitStatusIcon = (git.totalChanged > 0 || git.untracked > 0) ? '*' : '\u2713';
  }

  // ─── CURRENT TIME ─────────────────────────────────────────────────────────

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const sessionDisplay = sessionLabel ? sessionLabel.toUpperCase() : '';

  // ─── OUTPUT ───────────────────────────────────────────────────────────────
  const out: string[] = [];
  const p = (s: string) => out.push(s);

  // === LINE 0: PAI BRANDING ===
  const brandingHeader = (rightText?: string) => {
    const left = '\u2500\u2500 \u2502 PAI STATUSLINE \u2502';
    if (rightText) {
      const fillLen = Math.max(2, 72 - left.length - rightText.length);
      const dashes = '\u2500'.repeat(fillLen);
      p(`${SLATE_600}\u2500\u2500 \u2502${RESET} ${PAI_P}P${PAI_A}A${PAI_I}I${RESET} ${PAI_A}STATUSLINE${RESET} ${SLATE_600}\u2502 ${dashes}${RESET} ${PAI_SESSION}${rightText}${RESET}`);
    } else {
      const dashes = '\u2500'.repeat(Math.max(2, 72 - left.length));
      p(`${SLATE_600}\u2500\u2500 \u2502${RESET} ${PAI_P}P${PAI_A}A${PAI_I}I${RESET} ${PAI_A}STATUSLINE${RESET} ${SLATE_600}\u2502 ${dashes}${RESET}`);
    }
  };

  switch (MODE) {
    case 'nano':
      p(`${SLATE_600}\u2500\u2500 \u2502${RESET} ${PAI_P}P${PAI_A}A${PAI_I}I${RESET} ${SLATE_600}\u2502 ${'─'.repeat(12)}${RESET}`);
      p(`${PAI_TIME}${currentTime}${RESET} ${PAI_WEATHER}${weather.str}${RESET}`);
      p(`${SLATE_400}ENV:${RESET} ${SLATE_500}v${PAI_A}${paiVersion}${RESET} ${SLATE_400}ALG:${PAI_A}v${algoVersion}${RESET} ${SLATE_400}S:${SLATE_300}${counts.skills}${RESET}`);
      break;
    case 'micro':
      brandingHeader(sessionDisplay || undefined);
      p(`${PAI_LABEL}LOC:${RESET} ${PAI_CITY}${location.city}${RESET} ${SLATE_600}\u2502${RESET} ${PAI_TIME}${currentTime}${RESET} ${SLATE_600}\u2502${RESET} ${PAI_WEATHER}${weather.str}${RESET}`);
      p(`${SLATE_400}ENV:${RESET} ${SLATE_400}CC:${RESET} ${PAI_A}${ccVersion}${RESET} ${SLATE_600}\u2502${RESET} ${SLATE_500}PAI:${PAI_A}v${paiVersion}${RESET} ${SLATE_400}ALG:${PAI_A}v${algoVersion}${RESET} ${SLATE_600}\u2502${RESET} ${SLATE_400}S:${SLATE_300}${counts.skills}${RESET} ${SLATE_400}W:${SLATE_300}${counts.workflows}${RESET} ${SLATE_400}H:${SLATE_300}${counts.hooks}${RESET}`);
      break;
    case 'mini':
      brandingHeader(sessionDisplay || undefined);
      p(`${PAI_LABEL}LOC:${RESET} ${PAI_CITY}${location.city}${RESET}${SLATE_600},${RESET} ${PAI_STATE}${location.state}${RESET} ${SLATE_600}\u2502${RESET} ${PAI_TIME}${currentTime}${RESET} ${SLATE_600}\u2502${RESET} ${PAI_WEATHER}${weather.str}${RESET}`);
      p(`${SLATE_400}ENV:${RESET} ${SLATE_400}CC:${RESET} ${PAI_A}${ccVersion}${RESET} ${SLATE_600}\u2502${RESET} ${SLATE_500}PAI:${PAI_A}v${paiVersion}${RESET} ${SLATE_400}ALG:${PAI_A}v${algoVersion}${RESET} ${SLATE_600}\u2502${RESET} ${WIELD_ACCENT}SK:${RESET}${SLATE_300}${counts.skills}${RESET} ${WIELD_WORKFLOWS}WF:${RESET}${SLATE_300}${counts.workflows}${RESET} ${WIELD_HOOKS}Hooks:${RESET}${SLATE_300}${counts.hooks}${RESET}`);
      break;
    default: // normal
      brandingHeader(sessionDisplay || undefined);
      p(`${PAI_LABEL}LOC:${RESET} ${PAI_CITY}${location.city}${RESET}${SLATE_600},${RESET} ${PAI_STATE}${location.state}${RESET} ${SLATE_600}\u2502${RESET} ${PAI_TIME}${currentTime}${RESET} ${SLATE_600}\u2502${RESET} ${PAI_WEATHER}${weather.str}${RESET}`);
      p(`${SLATE_400}ENV:${RESET} ${SLATE_400}CC:${RESET} ${PAI_A}${ccVersion}${RESET} ${SLATE_600}\u2502${RESET} ${SLATE_500}PAI:${PAI_A}v${paiVersion}${RESET} ${SLATE_400}ALG:${PAI_A}v${algoVersion}${RESET} ${SLATE_600}\u2502${RESET} ${WIELD_ACCENT}SK:${RESET} ${SLATE_300}${counts.skills}${RESET} ${SLATE_600}\u2502${RESET} ${WIELD_WORKFLOWS}WF:${RESET} ${SLATE_300}${counts.workflows}${RESET} ${SLATE_600}\u2502${RESET} ${WIELD_HOOKS}Hooks:${RESET} ${SLATE_300}${counts.hooks}${RESET}`);
      break;
  }
  p(SEPARATOR);

  // === LINE 1: CONTEXT ===
  const barWidth = calcBarWidth(MODE);
  const bar = renderContextBar(barWidth, displayPct);

  switch (MODE) {
    case 'nano':
    case 'micro':
      p(`${CTX_PRIMARY}\u25C9${RESET} ${bar} ${pctColor}${displayPct}%${RESET}`);
      break;
    default:
      p(`${CTX_PRIMARY}\u25C9${RESET} ${CTX_SECONDARY}CONTEXT:${RESET} ${bar} ${pctColor}${displayPct}%${RESET}`);
      break;
  }
  p(SEPARATOR);

  // === LINE: ACCOUNT USAGE ===
  const u5h = Math.floor(usage.usage5h);
  const u7d = Math.floor(usage.usage7d);
  if (u5h > 0 || u7d > 0 || fileExists(USAGE_CACHE)) {
    const u5hColor = getUsageColor(u5h);
    const u7dColor = getUsageColor(u7d);
    const reset5h = resetClockTime(usage.usage5hReset) || timeUntilReset(usage.usage5hReset);
    const reset7d = resetClockTime(usage.usage7dReset) || timeUntilReset(usage.usage7dReset);

    let extraDisplay = '';
    if (usage.extraEnabled) {
      const limitDollars = Math.floor(usage.extraLimit / 100);
      const usedDollars = Math.floor(usage.extraUsed / 100);
      const limitFmt = limitDollars >= 1000 ? `$${Math.floor(limitDollars / 1000)}K` : `$${limitDollars}`;
      extraDisplay = `$${usedDollars}/${limitFmt}`;
    }

    let wsDisplay = '';
    const wsCents = Math.floor(usage.wsCostCents);
    if (wsCents > 0) wsDisplay = `API:$${Math.floor(wsCents / 100)}`;

    switch (MODE) {
      case 'nano':
        p(`${USAGE_PRIMARY}\u25B0${RESET} ${u5hColor}${u5h}%${RESET}${USAGE_RESET_CLR}\u21BB${reset5h}${RESET} ${u7dColor}${u7d}%${RESET}${USAGE_RESET_CLR}/wk${RESET}`);
        break;
      case 'micro':
        p(`${USAGE_PRIMARY}\u25B0${RESET} ${USAGE_RESET_CLR}5H:${RESET} ${u5hColor}${u5h}%${RESET} ${USAGE_RESET_CLR}\u21BB${reset5h}${RESET} ${SLATE_600}\u2502${RESET} ${USAGE_RESET_CLR}WK:${RESET} ${u7dColor}${u7d}%${RESET} ${USAGE_RESET_CLR}\u21BB${reset7d}${RESET}`);
        break;
      default: {
        let line = `${USAGE_PRIMARY}\u25B0${RESET} ${USAGE_LABEL}USAGE:${RESET} ${USAGE_RESET_CLR}5H:${RESET} ${u5hColor}${u5h}%${RESET} ${USAGE_RESET_CLR}\u21BB${SLATE_500}${reset5h}${RESET} ${SLATE_600}\u2502${RESET} ${USAGE_RESET_CLR}WK:${RESET} ${u7dColor}${u7d}%${RESET} ${USAGE_RESET_CLR}\u21BB${SLATE_500}${reset7d}${RESET}`;
        if (extraDisplay) line += ` ${SLATE_600}\u2502${RESET} ${USAGE_EXTRA}${extraDisplay}${RESET}`;
        if (wsDisplay) line += ` ${SLATE_600}\u2502${RESET} ${USAGE_EXTRA}${wsDisplay}${RESET}`;
        p(line);
        break;
      }
    }
    p(SEPARATOR);
  }

  // === LINE: PWD & GIT STATUS ===
  switch (MODE) {
    case 'nano':
      p(`${GIT_PRIMARY}\u25C8${RESET} ${GIT_DIR}${dirName}${RESET}${git.isGitRepo ? ` ${GIT_VALUE}${git.branch}${RESET} ${gitStatusIcon === '\u2713' ? `${GIT_CLEAN}\u2713${RESET}` : `${GIT_MODIFIED}*${git.totalChanged}${RESET}`}` : ''}`);
      break;
    case 'micro':
      {
        let line = `${GIT_PRIMARY}\u25C8${RESET} ${GIT_DIR}${dirName}${RESET}`;
        if (git.isGitRepo) {
          line += ` ${GIT_VALUE}${git.branch}${RESET}`;
          if (ageDisplay) line += ` ${ageColor}${ageDisplay}${RESET}`;
          line += ` ${gitStatusIcon === '\u2713' ? `${GIT_CLEAN}\u2713${RESET}` : `${GIT_MODIFIED}*${git.totalChanged}${RESET}`}`;
        }
        p(line);
      }
      break;
    case 'mini':
      {
        let line = `${GIT_PRIMARY}\u25C8${RESET} ${GIT_DIR}${dirName}${RESET}`;
        if (git.isGitRepo) {
          line += ` ${SLATE_600}\u2502${RESET} ${GIT_VALUE}${git.branch}${RESET}`;
          if (ageDisplay) line += ` ${SLATE_600}\u2502${RESET} ${ageColor}${ageDisplay}${RESET}`;
          line += ` ${SLATE_600}\u2502${RESET} `;
          if (gitStatusIcon === '\u2713') line += `${GIT_CLEAN}\u2713${RESET}`;
          else {
            line += `${GIT_MODIFIED}*${git.totalChanged}${RESET}`;
            if (git.untracked > 0) line += ` ${GIT_ADDED}+${git.untracked}${RESET}`;
          }
        }
        p(line);
      }
      break;
    default: // normal
      {
        let line = `${GIT_PRIMARY}\u25C8${RESET} ${GIT_PRIMARY}PWD:${RESET} ${GIT_DIR}${dirName}${RESET}`;
        if (git.isGitRepo) {
          line += ` ${SLATE_600}\u2502${RESET} ${GIT_PRIMARY}Branch:${RESET} ${GIT_VALUE}${git.branch}${RESET}`;
          if (ageDisplay) line += ` ${SLATE_600}\u2502${RESET} ${GIT_PRIMARY}Age:${RESET} ${ageColor}${ageDisplay}${RESET}`;
          if (git.stashCount > 0) line += ` ${SLATE_600}\u2502${RESET} ${GIT_PRIMARY}Stash:${RESET} ${GIT_STASH}${git.stashCount}${RESET}`;
          if (git.totalChanged > 0 || git.untracked > 0) {
            line += ` ${SLATE_600}\u2502${RESET} `;
            if (git.totalChanged > 0) line += `${GIT_PRIMARY}Mod:${RESET} ${GIT_MODIFIED}${git.totalChanged}${RESET}`;
            if (git.untracked > 0) {
              if (git.totalChanged > 0) line += ' ';
              line += `${GIT_PRIMARY}New:${RESET} ${GIT_ADDED}${git.untracked}${RESET}`;
            }
          } else {
            line += ` ${SLATE_600}\u2502${RESET} ${GIT_CLEAN}\u2713 clean${RESET}`;
          }
          if (git.ahead > 0 || git.behind > 0) {
            line += ` ${SLATE_600}\u2502${RESET} ${GIT_PRIMARY}Sync:${RESET} `;
            if (git.ahead > 0) line += `${GIT_CLEAN}\u2191${git.ahead}${RESET}`;
            if (git.behind > 0) line += `${GIT_STASH}\u2193${git.behind}${RESET}`;
          }
        }
        p(line);
      }
      break;
  }
  p(SEPARATOR);

  // === LINE: MEMORY ===
  switch (MODE) {
    case 'nano':
    case 'micro':
      p(`${LEARN_PRIMARY}\u25CE${RESET} ${LEARN_WORK}\uD83D\uDCC1${RESET}${SLATE_300}${counts.work}${RESET} ${LEARN_SIGNALS}\u2726${RESET}${SLATE_300}${counts.ratings}${RESET} ${LEARN_SESSIONS}\u2295${RESET}${SLATE_300}${counts.sessions}${RESET} ${LEARN_RESEARCH}\u25C7${RESET}${SLATE_300}${counts.research}${RESET}`);
      break;
    case 'mini':
      p(`${LEARN_PRIMARY}\u25CE${RESET} ${LEARN_SECONDARY}MEMORY:${RESET} ${LEARN_WORK}\uD83D\uDCC1${RESET}${SLATE_300}${counts.work}${RESET} ${SLATE_600}\u2502${RESET} ${LEARN_SIGNALS}\u2726${RESET}${SLATE_300}${counts.ratings}${RESET} ${SLATE_600}\u2502${RESET} ${LEARN_SESSIONS}\u2295${RESET}${SLATE_300}${counts.sessions}${RESET} ${SLATE_600}\u2502${RESET} ${LEARN_RESEARCH}\u25C7${RESET}${SLATE_300}${counts.research}${RESET}`);
      break;
    default:
      p(`${LEARN_PRIMARY}\u25CE${RESET} ${LEARN_SECONDARY}MEMORY:${RESET} ${LEARN_WORK}\uD83D\uDCC1${RESET}${SLATE_300}${counts.work}${RESET} ${LEARN_WORK}Work${RESET} ${SLATE_600}\u2502${RESET} ${LEARN_SIGNALS}\u2726${RESET}${SLATE_300}${counts.ratings}${RESET} ${LEARN_SIGNALS}Ratings${RESET} ${SLATE_600}\u2502${RESET} ${LEARN_SESSIONS}\u2295${RESET}${SLATE_300}${counts.sessions}${RESET} ${LEARN_SESSIONS}Sessions${RESET} ${SLATE_600}\u2502${RESET} ${LEARN_RESEARCH}\u25C7${RESET}${SLATE_300}${counts.research}${RESET} ${LEARN_RESEARCH}Research${RESET}`);
      break;
  }
  p(SEPARATOR);

  // === LINE: LEARNING (with sparklines in normal mode) ===
  let learningRendered = false;
  if (fileExists(RATINGS_FILE)) {
    try {
      const ratingsText = require('fs').readFileSync(RATINGS_FILE, 'utf-8');
      const ratingsLines = ratingsText.split('\n').filter((l: string) => l.startsWith('{'));

      // Check learning cache
      const cacheValid = fileExists(LEARNING_CACHE) &&
        fileMtime(LEARNING_CACHE) > fileMtime(RATINGS_FILE) &&
        (nowEpoch() - fileMtime(LEARNING_CACHE)) < LEARNING_CACHE_TTL;

      let learningData: any;
      if (cacheValid) {
        learningData = readJsonSafe(LEARNING_CACHE);
      }

      if (!learningData && ratingsLines.length > 0) {
        // Parse ratings
        const ratings = ratingsLines.map((l: string) => {
          try {
            const obj = JSON.parse(l);
            if (obj.rating == null) return null;
            const epoch = Math.floor(new Date(obj.timestamp).getTime() / 1000);
            return { rating: obj.rating, epoch, source: obj.source || 'explicit' };
          } catch { return null; }
        }).filter(Boolean) as { rating: number; epoch: number; source: string }[];

        if (ratings.length > 0) {
          const now = nowEpoch();
          const q15Start = now - 900;
          const hourStart = now - 3600;
          const todayStart = now - 86400;
          const weekStart = now - 604800;
          const monthStart = now - 2592000;

          const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : NaN;
          const fmt = (v: number) => isNaN(v) ? '—' : (Math.floor(v * 10) / 10).toString();

          const q15Ratings = ratings.filter(r => r.epoch >= q15Start).map(r => r.rating);
          const hourRatings = ratings.filter(r => r.epoch >= hourStart).map(r => r.rating);
          const todayRatings = ratings.filter(r => r.epoch >= todayStart).map(r => r.rating);
          const weekRatings = ratings.filter(r => r.epoch >= weekStart).map(r => r.rating);
          const monthRatings = ratings.filter(r => r.epoch >= monthStart).map(r => r.rating);
          const allRatings = ratings.map(r => r.rating);

          const calcTrend = (data: number[]): string => {
            if (data.length < 2) return 'stable';
            const half = Math.floor(data.length / 2);
            const recent = data.slice(-half);
            const older = data.slice(0, half);
            const recentAvg = avg(recent);
            const olderAvg = avg(older);
            const diff = recentAvg - olderAvg;
            if (diff > 0.5) return 'up';
            if (diff < -0.5) return 'down';
            return 'stable';
          };

          learningData = {
            latest: ratings[ratings.length - 1].rating.toString(),
            latestSource: ratings[ratings.length - 1].source,
            q15Avg: fmt(avg(q15Ratings)),
            hourAvg: fmt(avg(hourRatings)),
            todayAvg: fmt(avg(todayRatings)),
            weekAvg: fmt(avg(weekRatings)),
            monthAvg: fmt(avg(monthRatings)),
            allAvg: fmt(avg(allRatings)),
            trend: calcTrend(allRatings),
            hourTrend: calcTrend(hourRatings),
            dayTrend: calcTrend(todayRatings),
            totalCount: ratings.length,
          };

          // Generate sparklines for normal mode
          if (MODE === 'normal') {
            const ratingEpochs = ratings.map(r => ({ epoch: r.epoch, rating: r.rating }));
            learningData.q15Sparkline = makeSparkline(ratingEpochs, q15Start);
            learningData.hourSparkline = makeSparkline(ratingEpochs, hourStart);
            learningData.daySparkline = makeSparkline(ratingEpochs, todayStart);
            learningData.weekSparkline = makeSparkline(ratingEpochs, weekStart);
            learningData.monthSparkline = makeSparkline(ratingEpochs, monthStart);
          }

          // Cache
          writeFileSafe(LEARNING_CACHE, JSON.stringify(learningData));
        }
      }

      if (learningData && learningData.totalCount > 0) {
        learningRendered = true;
        const { latest, latestSource, q15Avg, hourAvg, todayAvg, weekAvg, monthAvg, trend } = learningData;
        const LATEST_COLOR = getRatingColor(latest);
        const srcLabel = latestSource === 'explicit' ? 'EXP' : 'IMP';

        switch (MODE) {
          case 'nano':
            p(`${LEARN_LABEL}\u273F${RESET} ${LATEST_COLOR}${latest}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${getRatingColor(todayAvg)}${todayAvg}${RESET}`);
            break;
          case 'micro':
            p(`${LEARN_LABEL}\u273F${RESET} ${LATEST_COLOR}${latest}${RESET} ${SIGNAL_PERIOD}1h:${RESET} ${getRatingColor(hourAvg)}${hourAvg}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${getRatingColor(todayAvg)}${todayAvg}${RESET} ${SIGNAL_PERIOD}1w:${RESET} ${getRatingColor(weekAvg)}${weekAvg}${RESET}`);
            break;
          case 'mini':
            p(`${LEARN_LABEL}\u273F${RESET} ${LEARN_LABEL}LEARNING:${RESET} ${SLATE_600}\u2502${RESET} ${LATEST_COLOR}${latest}${RESET} ${SIGNAL_PERIOD}1h:${RESET} ${getRatingColor(hourAvg)}${hourAvg}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${getRatingColor(todayAvg)}${todayAvg}${RESET} ${SIGNAL_PERIOD}1w:${RESET} ${getRatingColor(weekAvg)}${weekAvg}${RESET}`);
            break;
          default: {
            p(`${LEARN_LABEL}\u273F${RESET} ${LEARN_LABEL}LEARNING:${RESET} ${SLATE_600}\u2502${RESET} ${LATEST_COLOR}${latest}${RESET}${SLATE_500}${srcLabel}${RESET} ${SLATE_600}\u2502${RESET} ${SIGNAL_PERIOD}15m:${RESET} ${getRatingColor(q15Avg)}${q15Avg}${RESET} ${SIGNAL_PERIOD}60m:${RESET} ${getRatingColor(hourAvg)}${hourAvg}${RESET} ${SIGNAL_PERIOD}1d:${RESET} ${getRatingColor(todayAvg)}${todayAvg}${RESET} ${SIGNAL_PERIOD}1w:${RESET} ${getRatingColor(weekAvg)}${weekAvg}${RESET} ${SIGNAL_PERIOD}1mo:${RESET} ${getRatingColor(monthAvg)}${monthAvg}${RESET}`);
            // Sparklines
            if (learningData.q15Sparkline) {
              p(`   ${SLATE_600}\u251C\u2500${RESET} ${SIGNAL_PERIOD}15m:${RESET}  ${learningData.q15Sparkline}`);
              p(`   ${SLATE_600}\u251C\u2500${RESET} ${SIGNAL_PERIOD}60m:${RESET}  ${learningData.hourSparkline}`);
              p(`   ${SLATE_600}\u251C\u2500${RESET} ${SIGNAL_PERIOD}1d:${RESET}   ${learningData.daySparkline}`);
              p(`   ${SLATE_600}\u251C\u2500${RESET} ${SIGNAL_PERIOD}1w:${RESET}   ${learningData.weekSparkline}`);
              p(`   ${SLATE_600}\u2514\u2500${RESET} ${SIGNAL_PERIOD}1mo:${RESET}  ${learningData.monthSparkline}`);
            }
            break;
          }
        }
      }
    } catch {}
  }

  if (!learningRendered) {
    p(`${LEARN_LABEL}\u273F${RESET} ${LEARN_LABEL}LEARNING:${RESET}`);
    p(`  ${SLATE_500}No ratings yet${RESET}`);
  }

  // === LINE: QUOTE (normal mode only) ===
  if (MODE === 'normal' && quote) {
    p(SEPARATOR);
    const fullLen = quote.text.length + quote.author.length + 8;
    if (fullLen <= 72) {
      p(`${QUOTE_PRIMARY}\u2726${RESET} ${SLATE_400}"${quote.text}"${RESET} ${QUOTE_AUTHOR}\u2014${quote.author}${RESET}`);
    } else {
      // Word-wrap
      const targetLine1 = Math.min(60, quote.text.length - 12);
      let firstPart = quote.text.substring(0, targetLine1);
      const lastSpace = firstPart.lastIndexOf(' ');
      if (lastSpace > 10) firstPart = quote.text.substring(0, lastSpace);
      const secondPart = quote.text.substring(firstPart.length).trimStart();
      if (secondPart.length < 10) {
        p(`${QUOTE_PRIMARY}\u2726${RESET} ${SLATE_400}"${quote.text}"${RESET} ${QUOTE_AUTHOR}\u2014${quote.author}${RESET}`);
      } else {
        p(`${QUOTE_PRIMARY}\u2726${RESET} ${SLATE_400}"${firstPart}${RESET}`);
        p(`  ${SLATE_400}${secondPart}"${RESET} ${QUOTE_AUTHOR}\u2014${quote.author}${RESET}`);
      }
    }
  }

  // Print all output
  process.stdout.write(out.join('\n') + '\n');
}

main().catch(() => process.exit(1));
