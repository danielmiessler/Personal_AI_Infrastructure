#!/usr/bin/env bun
/**
 * @version 1.0.0
 * Doctor — LifeOS capability prober and manifest writer.
 *
 * Probes the external tools that LifeOS doctrine depends on (cross-vendor
 * audit CLI, browser verification, Cloudflare/wrangler, voice) plus core
 * wiring, and writes an advisory capability manifest. Born from community
 * feedback (LifeOS discussion #1461): capabilities that are assumed but
 * never verified degrade silently; anything dormant at rest is invisible
 * to change-scoped checks.
 *
 * Design contract (RedTeam-derived, 2026-07-12):
 *   - The manifest is a TTL'd advisory CACHE, never truth. Readers treat it
 *     as untrusted input; doctrine-critical gates re-verify live.
 *   - Four states: live | broken | declined | stale. Declined is first-class
 *     and permanently silent — opted-out is not a defect.
 *   - No scores, no percentages. Diagnostic register only.
 *   - Never install-fatal: default run always exits 0, every probe is
 *     timeout-bounded, network probes are opt-in (--network) and only fire
 *     for capabilities the user has configured.
 *   - Tamper-evident: manifest carries a salted integrity hash (salt is a
 *     separate 0600 file). Detects casual/model edits, not a determined
 *     local attacker.
 *
 * Usage:
 *   bun Doctor.ts                  # probe (offline checks), table output
 *   bun Doctor.ts --network        # include network probes for configured caps
 *   bun Doctor.ts --json           # machine-readable
 *   bun Doctor.ts --no-network     # explicit offline (default is offline)
 *   bun Doctor.ts decline <cap>    # mark capability declined (silent forever)
 *   bun Doctor.ts enable <cap>     # undo a decline
 *   bun Doctor.ts ack              # acknowledge current broken set (statusline delta)
 *   bun Doctor.ts --statusline     # one glyph if NEW regression since ack, else empty
 *   bun Doctor.ts --verify         # integrity-check the manifest (exit 2 on tamper)
 *   bun Doctor.ts --reclaim        # merge + retire shadow-$HOME trees (public issue #1485)
 *   bun Doctor.ts --hooks          # per-hook interpreter resolution (public issue #1600)
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { createHash, randomBytes } from 'crypto';

const HOME = process.env.HOME || '';
const CONFIG_ROOT = process.env.CLAUDE_CONFIG_DIR || join(HOME, '.claude');
const LIFEOS_DIR = (process.env.LIFEOS_DIR || join(CONFIG_ROOT, 'LIFEOS'))
  .replace(/^\$HOME/, HOME).replace(/^~(?=\/)/, HOME);
const STATE_DIR = join(LIFEOS_DIR, 'MEMORY', 'STATE');
const MANIFEST = join(STATE_DIR, 'capabilities.json');
const SALT_FILE = join(STATE_DIR, '.capabilities-salt');
const HEARTBEAT = join(STATE_DIR, 'doctor-heartbeat.json');
const PROBE_TIMEOUT_MS = 15_000;

type CapState = 'live' | 'broken' | 'declined' | 'stale';

interface CapResult {
  state: CapState;
  checkedAt: string;      // ISO timestamp of last real probe
  ttlHours: number;       // readers treat entries older than this as stale
  detail: string;         // one-line human diagnosis
  fixCmd: string | null;  // copy-paste remediation, null when live/declined
  probeClass: 'offline' | 'network';
}

interface Manifest {
  version: 1;
  updatedAt: string;
  note: string;
  capabilities: Record<string, CapResult>;
  ackedBroken: string[];  // broken set acknowledged via `ack` (statusline delta base)
  integrity?: string;
}

interface CapSpec {
  id: string;
  title: string;
  powers: string;
  ttlHours: number;
  // Returns null when the capability has no local configuration at all —
  // network probing it would be pre-consent egress (never allowed).
  configured: () => boolean;
  probeOffline: () => Promise<{ ok: boolean; detail: string }>;
  probeNetwork?: () => Promise<{ ok: boolean; detail: string }>;
  fixCmd: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function run(cmd: string[], timeoutMs = PROBE_TIMEOUT_MS): Promise<{ code: number; out: string }> {
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'ignore', stdin: 'ignore' });
    // Race the read: a killed child's grandchildren can inherit the stdout pipe
    // and hold it open past the kill, so awaiting stream EOF alone can hang.
    return await Promise.race([
      (async () => {
        const out = await new Response(proc.stdout).text();
        const code = await proc.exited;
        return { code, out: out.trim() };
      })(),
      new Promise<{ code: number; out: string }>(resolve =>
        setTimeout(() => { try { proc.kill(9); } catch {} resolve({ code: 124, out: '' }); }, timeoutMs)),
    ]);
  } catch {
    return { code: 127, out: '' };
  }
}

function which(bin: string): boolean {
  const paths = (process.env.PATH || '').split(':');
  return paths.some(p => p && existsSync(join(p, bin)));
}

/**
 * Like which(), but returns the resolved path instead of a boolean — callers
 * such as chromeBinary() feed the result into detail strings that split on
 * '/', so the fallback must yield a real path (public PR #1567, @vibecrypto).
 */
function whichPath(bin: string): string | null {
  const paths = (process.env.PATH || '').split(':');
  for (const p of paths) {
    if (p && existsSync(join(p, bin))) return join(p, bin);
  }
  return null;
}

function envKey(name: string): string | null {
  if (process.env[name]) return process.env[name]!;
  // .env at config root is the canonical secrets file on a LifeOS install.
  const envFile = join(CONFIG_ROOT, '.env');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(new RegExp(`^${name}=["']?([^"'\\n]+)`, 'm'));
    if (m) return m[1];
  }
  return null;
}

// ── shadow-$HOME trees (public issue #1485, @vanvonlj; class: #1404/#1451) ───
// Pre-#1451 installs interpolated the literal string "$HOME" into paths, so
// every project directory a session ran in grew a `$HOME/.claude/LIFEOS/MEMORY`
// shadow tree. #1451 stopped NEW ones; the accumulated ones persist after
// upgrade, holding real ratings/learning/observability data that is valid,
// complete, and invisible to MemoryRetriever. Nothing else ever notices.

const RECLAIM_BACKUP_DIR = join(STATE_DIR, 'reclaimed-shadow-backups');

async function findShadowHomeDirs(): Promise<string[]> {
  // `find` for guaranteed availability; prune heavy/irrelevant dirs and our
  // own reclaim backups (which contain moved '$HOME' dirs by construction —
  // without the prune every past reclaim would re-trigger detection forever).
  const r = await run([
    'find', HOME, '-maxdepth', '6',
    '(', '-name', 'node_modules', '-o', '-name', '.git', '-o', '-name', 'Library', '-o', '-path', RECLAIM_BACKUP_DIR, ')', '-prune',
    '-o', '-type', 'd', '-name', '$HOME', '-print',
  ], 60_000);
  return r.out ? r.out.split('\n').filter(Boolean) : [];
}

// Disposable state — never worth merging (issue #1485's cache list).
function isDisposable(rel: string): boolean {
  const base = rel.split('/').pop() || '';
  return /-cache\./.test(base) || base === 'instruction-hashes.json' || base === 'last-response.txt' || rel.includes('/CACHE/');
}

function* walkFiles(dir: string, prefix = ''): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) yield* walkFiles(join(dir, entry.name), rel);
    else if (entry.isFile()) yield rel;
  }
}

function countShadowMemoryFiles(shadows: string[]): number {
  let n = 0;
  for (const s of shadows) {
    const mem = join(s, '.claude', 'LIFEOS', 'MEMORY');
    if (!existsSync(mem)) continue;
    for (const rel of walkFiles(mem)) if (!isDisposable(rel)) n++;
  }
  return n;
}

function mergeJsonl(destPath: string, shadowPath: string): { added: number } {
  const destLines = existsSync(destPath)
    ? readFileSync(destPath, 'utf8').split('\n').filter(Boolean) : [];
  const seen = new Set(destLines);
  const fresh = readFileSync(shadowPath, 'utf8').split('\n').filter(Boolean)
    .filter(l => !seen.has(l));
  if (!fresh.length) return { added: 0 };
  const merged = [...destLines, ...fresh];
  // Sort by timestamp only when EVERY line parses with one — otherwise keep
  // append order (jsonl here is append-only; a half-sorted file lies).
  const ts = (l: string): number | null => {
    try { const o = JSON.parse(l); const t = o.timestamp ?? o.ts; const n = Date.parse(t); return Number.isFinite(n) ? n : null; }
    catch { return null; }
  };
  const stamps = merged.map(ts);
  if (stamps.every(s => s !== null)) {
    merged.sort((a, b) => (ts(a) as number) - (ts(b) as number));
  }
  mkdirSync(join(destPath, '..'), { recursive: true });
  writeFileSync(destPath, merged.join('\n') + '\n');
  return { added: fresh.length };
}

async function reclaimShadows(): Promise<void> {
  const shadows = await findShadowHomeDirs();
  if (!shadows.length) { console.log('no shadow-$HOME trees found — nothing to reclaim.'); return; }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let mergedLines = 0, copiedFiles = 0, skippedDisposable = 0;
  const { renameSync, cpSync } = await import('fs');
  for (let i = 0; i < shadows.length; i++) {
    const shadow = shadows[i];
    const mem = join(shadow, '.claude', 'LIFEOS', 'MEMORY');
    if (existsSync(mem)) {
      for (const rel of walkFiles(mem)) {
        if (isDisposable(rel)) { skippedDisposable++; continue; }
        const src = join(mem, rel);
        const dest = join(LIFEOS_DIR, 'MEMORY', rel);
        if (rel.endsWith('.jsonl')) {
          mergedLines += mergeJsonl(dest, src).added;
        } else if (!existsSync(dest)) {
          mkdirSync(join(dest, '..'), { recursive: true });
          cpSync(src, dest);
          copiedFiles++;
        }
        // non-jsonl with an existing destination: destination wins, shadow copy
        // survives in the backup below.
      }
    }
    // Backup IS the removal: move the whole shadow tree out of the live
    // filesystem into a timestamped backup under STATE (pruned from future
    // scans). Nothing is deleted.
    const backupTarget = join(RECLAIM_BACKUP_DIR, stamp, String(i));
    mkdirSync(backupTarget, { recursive: true });
    try {
      renameSync(shadow, join(backupTarget, '$HOME'));
    } catch {
      cpSync(shadow, join(backupTarget, '$HOME'), { recursive: true });
      const { rmSync } = await import('fs');
      rmSync(shadow, { recursive: true, force: true });
    }
    console.log(`reclaimed: ${shadow} → ${backupTarget}`);
  }
  console.log(`done: ${shadows.length} shadow tree(s) retired · ${mergedLines} jsonl line(s) merged · ${copiedFiles} artefact(s) copied · ${skippedDisposable} disposable file(s) dropped. Backup: ${join(RECLAIM_BACKUP_DIR, stamp)}`);
}

function chromeBinary(): string | null {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    // Linux Brave (public issue #1496, @waveman2020-sudo): a Brave-only Linux
    // box previously got a false "no browser found".
    '/usr/bin/brave-browser', '/usr/bin/brave-browser-stable',
    // Declarative installs (public PR #1567, @vibecrypto): nix-darwin /
    // Home Manager place GUI apps under /Applications/Nix Apps/.
    '/Applications/Nix Apps/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Nix Apps/Brave Browser.app/Contents/MacOS/Brave Browser',
  ];
  const found = candidates.find(existsSync);
  if (found) return found;
  // PATH fallback (public PR #1567, @vibecrypto): Nix profiles expose the
  // binary only on PATH (e.g. /run/current-system/sw/bin/google-chrome), and
  // it also covers any distro not matched by the hardcoded candidates.
  for (const bin of ['google-chrome', 'chromium', 'brave', 'brave-browser']) {
    const p = whichPath(bin);
    if (p) return p;
  }
  return null;
}

// ── capability registry ──────────────────────────────────────────────────────

const CAPS: CapSpec[] = [
  {
    id: 'shadow-home',
    title: 'Orphaned memory (shadow-$HOME trees)',
    powers: 'the learning loop, satisfaction ratings, failure capture',
    ttlHours: 24 * 7,
    configured: () => true, // every upgraded install could carry them
    probeOffline: async () => {
      const shadows = await findShadowHomeDirs();
      if (!shadows.length) return { ok: true, detail: 'no shadow-$HOME trees on disk' };
      const files = countShadowMemoryFiles(shadows);
      return {
        ok: false,
        detail: `${shadows.length} shadow tree(s) holding ${files} orphaned memory file(s) — written by a pre-#1451 install and invisible to MemoryRetriever`,
      };
    },
    fixCmd: 'bun <configRoot>/LIFEOS/TOOLS/Doctor.ts --reclaim',
  },
  {
    id: 'codex',
    title: 'Cross-vendor audit (codex CLI)',
    powers: 'independent second-vendor review on high-impact work',
    ttlHours: 24 * 7,
    configured: () => which('codex') || existsSync(join(HOME, '.codex')),
    probeOffline: async () => {
      if (!which('codex')) return { ok: false, detail: 'codex binary not on PATH' };
      const authed = existsSync(join(HOME, '.codex', 'auth.json'));
      return authed
        ? { ok: true, detail: 'binary present, auth file present' }
        : { ok: false, detail: 'binary present but not logged in (~/.codex/auth.json missing)' };
    },
    fixCmd: 'bun install -g @openai/codex && codex login',
  },
  {
    id: 'interceptor',
    title: 'Browser verification (Interceptor)',
    powers: 'real-browser verification of all web/UI claims',
    ttlHours: 24 * 7,
    configured: () => true, // ships with LifeOS; a missing browser is broken, not unconfigured
    probeOffline: async () => {
      const skill = existsSync(join(CONFIG_ROOT, 'skills', 'Interceptor', 'SKILL.md'));
      if (!skill) return { ok: false, detail: 'Interceptor skill not installed' };
      const browser = chromeBinary();
      if (!browser) return { ok: false, detail: 'no Chrome/Brave/Chromium binary found' };
      // Skill files + a browser binary are necessary, not sufficient (public
      // issue #1499, @waveman2020-sudo): the skill's own PreflightIsolation gate
      // also needs the interceptor CLI/daemon and a pinned test-profile context.
      // Report "live" only when the runtime setup exists; otherwise say exactly
      // what one-time setup is missing instead of a false green.
      const cli = which('interceptor') || existsSync(join(HOME, 'Projects', 'interceptor'));
      const prefsPath = join(CONFIG_ROOT, 'skills', 'Interceptor', 'preferences.env');
      const hasContext = existsSync(prefsPath) &&
        /^INTERCEPTOR_TEST_CONTEXT_ID=.+/m.test(readFileSync(prefsPath, 'utf8'));
      if (!cli || !hasContext) {
        const missing = [
          !cli ? 'interceptor CLI/daemon (repo not cloned, binary not on PATH)' : null,
          !hasContext ? 'pinned test-profile context (INTERCEPTOR_TEST_CONTEXT_ID in preferences.env)' : null,
        ].filter(Boolean).join('; ');
        return { ok: false, detail: `skill + browser present, but runtime setup incomplete: ${missing}` };
      }
      return { ok: true, detail: `skill, browser (${browser.split('/').pop()}), CLI, and test-profile context all present` };
    },
    fixCmd: 'run the Interceptor skill setup (clone repo, install extension, pin INTERCEPTOR_TEST_CONTEXT_ID), then re-run: bun LIFEOS/TOOLS/Doctor.ts',
  },
  {
    id: 'cloudflare',
    title: 'Scheduled cloud flows (Cloudflare/wrangler)',
    powers: 'Arbol scheduled flows and Worker deploys',
    ttlHours: 24,
    configured: () => !!envKey('CLOUDFLARE_API_TOKEN') || existsSync(join(HOME, '.wrangler')) || which('wrangler'),
    probeOffline: async () => {
      const hasToken = !!envKey('CLOUDFLARE_API_TOKEN');
      const hasWrangler = which('wrangler') || which('bunx');
      if (!hasWrangler) return { ok: false, detail: 'wrangler not available (bunx missing?)' };
      return hasToken
        ? { ok: true, detail: 'CLOUDFLARE_API_TOKEN set, wrangler reachable' }
        : { ok: false, detail: 'no CLOUDFLARE_API_TOKEN in env or .env' };
    },
    probeNetwork: async () => {
      const r = await run(['bunx', 'wrangler', 'whoami']);
      return r.code === 0
        ? { ok: true, detail: 'wrangler whoami OK' }
        : { ok: false, detail: 'wrangler whoami failed (token invalid or expired)' };
    },
    fixCmd: 'add CLOUDFLARE_API_TOKEN to <configRoot>/.env, then: bun LIFEOS/TOOLS/Doctor.ts --network',
  },
  {
    id: 'voice',
    title: 'Voice notifications (ElevenLabs)',
    powers: 'spoken notifications via the Pulse voice server',
    ttlHours: 24,
    configured: () => !!envKey('ELEVENLABS_API_KEY'),
    probeOffline: async () => {
      const key = envKey('ELEVENLABS_API_KEY');
      if (!key) return { ok: false, detail: 'no ELEVENLABS_API_KEY in env or .env' };
      const voiceId = envKey('ELEVENLABS_VOICE_ID');
      return voiceId
        ? { ok: true, detail: 'API key and voice id configured' }
        : { ok: false, detail: 'API key set but no ELEVENLABS_VOICE_ID configured' };
    },
    probeNetwork: async () => {
      const key = envKey('ELEVENLABS_API_KEY');
      const voiceId = envKey('ELEVENLABS_VOICE_ID');
      if (!key || !voiceId) return { ok: false, detail: 'key or voice id missing' };
      // Probe the TTS endpoint itself, not /v1/voices metadata: scoped keys
      // (TTS-only permission) 401 on metadata while TTS works, and famous
      // voices 401 on TTS while metadata looks fine (#1461 bug 5). The only
      // honest probe is the exact path notifications use. Cost: a 2-char
      // synthesis — negligible, and only for opted-in configured installs.
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
          method: 'POST', signal: ctrl.signal,
          headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'ok', model_id: 'eleven_turbo_v2_5' }),
        });
        clearTimeout(timer);
        if (res.ok) return { ok: true, detail: 'TTS round-trip OK (real synthesis on the notification path)' };
        const errText = (await res.text()).slice(0, 200);
        if (errText.includes('famous_voice_not_permitted')) {
          return { ok: false, detail: 'configured voice is a famous voice — not usable via API TTS' };
        }
        // Plan-tier restriction, not quota (public issue #1496, @waveman2020-sudo):
        // free-tier keys 402 with paid_plan_required on ANY library voice — swapping
        // voices or waiting for quota reset does not fix it.
        if (errText.includes('paid_plan_required')) {
          return { ok: false, detail: 'free-tier ElevenLabs plan cannot use library voices via API — upgrade the plan or use a premade/cloned voice' };
        }
        return { ok: false, detail: `TTS failed (${res.status}): ${errText.slice(0, 120)}` };
      } catch {
        return { ok: false, detail: 'ElevenLabs unreachable (offline or timeout)' };
      }
    },
    fixCmd: 'set ELEVENLABS_VOICE_ID to an API-permitted (premade/cloned) voice in <configRoot>/.env',
  },

  // ── external binaries shipped code shells out to ───────────────────────────
  // Each of these is spawned directly by shipped code, so absence is "broken",
  // not "unconfigured" — hence configured: () => true. They stay honest about
  // what absence actually costs: `gh` fails outright, the rest degrade.
  // public PR #1660 and #1661, @elhoim
  {
    id: 'ripgrep',
    title: 'Fast filesystem search (ripgrep)',
    powers: 'ContextSearch queries, work sweeps, and the model-drift scan',
    ttlHours: 24 * 7,
    configured: () => true, // shipped code shells out to `rg`; absence is broken, not unconfigured
    probeOffline: async () =>
      which('rg')
        ? { ok: true, detail: 'rg on PATH' }
        : { ok: false, detail: 'rg not on PATH — tools that shell out to it will fail' },
    fixCmd: 'brew install ripgrep  (Linux: sudo apt-get install ripgrep)',
  },
  {
    id: 'imagemagick',
    title: 'Image inspection (ImageMagick)',
    powers: "Interceptor's blank-frame guard, measured zoom, and Art composition",
    ttlHours: 24 * 7,
    configured: () => true, // the capture guard and Art both shell out to `magick`
    probeOffline: async () =>
      which('magick')
        ? { ok: true, detail: 'magick on PATH' }
        : { ok: false, detail: 'magick not on PATH — the blank-frame guard skips and captures go unchecked' },
    fixCmd: 'brew install imagemagick  (Linux: sudo apt-get install imagemagick)',
  },
  {
    id: 'gh',
    title: 'Work system of record (GitHub CLI)',
    powers: 'work capture, sweeps, commitments, and the Pulse Work tab',
    ttlHours: 24 * 7,
    configured: () => true, // WorkSweep/CommitmentSweep/Pulse spawn `gh` with no fallback
    probeOffline: async () =>
      which('gh')
        ? { ok: true, detail: 'gh on PATH' }
        : { ok: false, detail: 'gh not on PATH — work capture and sweeps cannot reach the work repo' },
    fixCmd: 'brew install gh && gh auth login  (Linux: see cli.github.com)',
  },
  {
    id: 'ffmpeg',
    title: 'Audio/video processing (ffmpeg)',
    powers: 'AudioEditor, transcript splitting, Conveyor renders, Interceptor zoom fallback',
    ttlHours: 24 * 7,
    configured: () => true, // SplitAndTranscribe and AudioEditor spawn `ffmpeg` directly
    probeOffline: async () =>
      which('ffmpeg')
        ? { ok: true, detail: 'ffmpeg on PATH' }
        : { ok: false, detail: 'ffmpeg not on PATH — audio/video tools will fail at spawn' },
    fixCmd: 'brew install ffmpeg  (Linux: sudo apt-get install ffmpeg)',
  },
  {
    id: 'ytdlp',
    title: 'YouTube ingestion (yt-dlp)',
    powers: "the Feed YouTube source and the Upgrade skill's channel scan",
    ttlHours: 24 * 7,
    configured: () => true,
    probeOffline: async () =>
      which('yt-dlp')
        ? { ok: true, detail: 'yt-dlp on PATH' }
        : { ok: false, detail: 'yt-dlp not on PATH — YouTube transcript and channel steps are skipped' },
    fixCmd: 'brew install yt-dlp  (Linux: sudo apt-get install yt-dlp)',
  },
  {
    id: 'fabric',
    title: 'Prompt patterns (fabric)',
    powers: "the Fabric skill's pattern library and YouTube transcript fetch",
    ttlHours: 24 * 7,
    configured: () => true,
    probeOffline: async () =>
      which('fabric')
        ? { ok: true, detail: 'fabric on PATH' }
        : { ok: false, detail: 'fabric not on PATH — pattern runs fall back to native prompting' },
    fixCmd: 'see the fabric project for install',
  },
  {
    id: 'jq',
    title: 'JSON in shell hooks (jq)',
    powers: 'hook-side JSON parsing, including the command-compression rewrite',
    ttlHours: 24 * 7,
    configured: () => true,
    probeOffline: async () =>
      which('jq')
        ? { ok: true, detail: 'jq on PATH' }
        : { ok: false, detail: 'jq not on PATH — shell hooks that parse JSON skip silently' },
    fixCmd: 'brew install jq  (Linux: sudo apt-get install jq)',
  },
  {
    id: 'hook-interpreters',
    title: 'Hook interpreter resolution',
    powers: 'every hook registered in settings.json — enforcement, injection, gates',
    ttlHours: 24 * 7,
    configured: () => existsSync(join(CONFIG_ROOT, 'settings.json')),
    probeOffline: async () => {
      // A hook whose interpreter can't be resolved fails as `env: bun: No such
      // file or directory` on stderr and is otherwise INVISIBLE — the gate just
      // stops gating (public issue #1600, @cristbc). Writing a resolved PATH into
      // settings.json was rejected: that PATH would then apply to every session
      // Bash call. Reporting it is the fix.
      const problems = hookInterpreterProblems();
      if (!problems.length) return { ok: true, detail: 'every registered hook resolves its interpreter' };
      return { ok: false, detail: problems.join('; ') };
    },
    fixCmd: 'bun <configRoot>/LIFEOS/TOOLS/Doctor.ts --hooks   # per-hook detail and remediation',
  },
];

/**
 * Resolve the interpreter of every hook command registered in settings.json.
 *
 * Two registration shapes, two failure modes:
 *   - explicit  (`bun /path/x.hook.ts`) → the named interpreter must be on PATH
 *   - bare      (`/path/x.hook.ts`)     → exec needs BOTH the execute bit and a
 *                                         `#!` line, and the shebang's own
 *                                         interpreter must resolve
 * Returns one short string per broken hook; empty array means all resolve.
 */
/** Expand `~`, `$VAR` and `${VAR}` the way the shell running a hook would. */
function expandPath(p: string): string {
  return p
    .replace(/^~(?=\/|$)/, HOME)
    .replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (m, name: string) => {
      // Claude Code supplies these at hook time; Doctor's own env may not have
      // them, and both point at the install root here.
      if (name === 'CLAUDE_PROJECT_DIR' || name === 'CLAUDE_CONFIG_DIR') {
        return process.env[name] || CONFIG_ROOT;
      }
      return process.env[name] ?? m;
    });
}

function hookInterpreterProblems(): string[] {
  const settingsPath = join(CONFIG_ROOT, 'settings.json');
  let hooksBlob: any;
  try { hooksBlob = JSON.parse(readFileSync(settingsPath, 'utf8')).hooks; } catch { return []; }
  if (!hooksBlob) return [];

  const commands: string[] = [];
  const walk = (node: any): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === 'object') {
      if (typeof node.command === 'string') commands.push(node.command);
      return Object.values(node).forEach(walk);
    }
  };
  walk(hooksBlob);

  const problems: string[] = [];
  const seen = new Set<string>();
  for (const raw of commands) {
    // First token wins: `bun x.ts` → bun; `/path/x.hook.ts` → the script itself.
    const first = raw.trim().split(/\s+/)[0]?.replace(/^["']|["']$/g, '') ?? '';
    if (!first || seen.has(first)) continue;
    seen.add(first);
    const resolved = expandPath(first);
    // An unexpandable $VAR means Doctor's env differs from the hook's — it
    // cannot judge that path, so it says nothing rather than crying wolf.
    if (resolved.includes('$')) continue;

    if (!/[/\\]/.test(first)) {
      // Bare interpreter name (bun, node, sh, jq…) — must be on PATH.
      if (!which(first)) problems.push(`${first}: not on PATH`);
      continue;
    }
    // A path was given. If it's a script run bare, exec() needs mode + shebang.
    if (!existsSync(resolved)) { problems.push(`${basename(resolved)}: file not found`); continue; }
    let mode = 0;
    try { mode = statSync(resolved).mode; } catch {}
    const name = basename(resolved);
    if (!(mode & 0o111)) { problems.push(`${name}: not executable (chmod +x)`); continue; }
    let head = '';
    try { head = readFileSync(resolved, 'utf8').slice(0, 200).split('\n')[0]; } catch {}
    if (!head.startsWith('#!')) { problems.push(`${name}: no #! shebang`); continue; }
    // `#!/usr/bin/env bun` → the interpreter env will look up is the 2nd word.
    const shebang = head.slice(2).trim().split(/\s+/);
    const interp = shebang[0].endsWith('/env') ? shebang[1] : shebang[0];
    if (!interp) continue;
    if (interp.includes('/')) {
      if (!existsSync(interp)) problems.push(`${name}: shebang interpreter ${interp} missing`);
    } else if (!which(interp)) {
      problems.push(`${name}: shebang needs '${interp}', not on PATH`);
    }
  }
  return problems;
}

// ── manifest io ──────────────────────────────────────────────────────────────

function loadManifest(): Manifest {
  if (existsSync(MANIFEST)) {
    try { return JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch {}
  }
  return {
    version: 1, updatedAt: new Date().toISOString(),
    note: 'Advisory cache, not truth. Written only by LIFEOS/TOOLS/Doctor.ts. Readers must treat entries past ttlHours as stale and re-verify doctrine-critical capabilities live.',
    capabilities: {}, ackedBroken: [],
  };
}

function salt(): string {
  if (!existsSync(SALT_FILE)) {
    mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(SALT_FILE, randomBytes(32).toString('hex'));
    try { chmodSync(SALT_FILE, 0o600); } catch {}
  }
  return readFileSync(SALT_FILE, 'utf8').trim();
}

function computeIntegrity(m: Manifest): string {
  const { integrity: _drop, ...body } = m;
  return createHash('sha256').update(salt() + JSON.stringify(body)).digest('hex');
}

function saveManifest(m: Manifest): void {
  m.updatedAt = new Date().toISOString();
  m.integrity = computeIntegrity(m);
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2));
  // Display sidecar for the statusline: precomputed here so the shell script
  // renders with a bare `cat` — no bun spawn, no hash math, per refresh tick.
  const broken = Object.entries(m.capabilities)
    .filter(([, r]) => r.state === 'broken').map(([id]) => id);
  const fresh = broken.filter(id => !(m.ackedBroken || []).includes(id));
  writeFileSync(join(STATE_DIR, 'capabilities-statusline.txt'),
    fresh.length ? `⚠ ${fresh.length} capability regression — lifeos doctor` : '');
}

function isStale(r: CapResult): boolean {
  return Date.now() - Date.parse(r.checkedAt) > r.ttlHours * 3_600_000;
}

// ── commands ─────────────────────────────────────────────────────────────────

async function probeAll(network: boolean): Promise<Manifest> {
  const m = loadManifest();
  for (const cap of CAPS) {
    const prev = m.capabilities[cap.id];
    if (prev?.state === 'declined') continue; // declined is silent and sticky

    if (!cap.configured()) {
      m.capabilities[cap.id] = {
        state: 'broken', checkedAt: new Date().toISOString(), ttlHours: cap.ttlHours,
        detail: 'not set up on this machine', fixCmd: cap.fixCmd, probeClass: 'offline',
      };
      continue;
    }
    let res = await cap.probeOffline();
    let probeClass: 'offline' | 'network' = 'offline';
    if (res.ok && network && cap.probeNetwork) {
      res = await cap.probeNetwork();
      probeClass = 'network';
    }
    m.capabilities[cap.id] = {
      state: res.ok ? 'live' : 'broken',
      checkedAt: new Date().toISOString(), ttlHours: cap.ttlHours,
      detail: res.detail, fixCmd: res.ok ? null : cap.fixCmd, probeClass,
    };
  }
  saveManifest(m);
  writeFileSync(HEARTBEAT, JSON.stringify({ ranAt: new Date().toISOString(), network }, null, 2));
  return m;
}

function renderTable(m: Manifest): string {
  const lines: string[] = ['', 'LifeOS Doctor — capability check', ''];
  for (const cap of CAPS) {
    const r = m.capabilities[cap.id];
    if (!r) continue;
    const stale = r.state !== 'declined' && isStale(r);
    const icon = r.state === 'live' ? (stale ? '◌' : '✅')
      : r.state === 'declined' ? '⏸'
      : r.state === 'broken' ? '❌' : '◌';
    const label = r.state === 'declined' ? 'off (declined)' : stale ? `${r.state} (stale — re-run doctor)` : r.state;
    lines.push(`${icon} ${cap.title} — ${label}`);
    lines.push(`   powers: ${cap.powers}`);
    if (r.state !== 'declined') lines.push(`   ${r.detail}`);
    if (r.state === 'broken' && r.fixCmd) lines.push(`   fix: ${r.fixCmd}`);
    lines.push('');
  }
  lines.push('Re-run any time: bun <configRoot>/LIFEOS/TOOLS/Doctor.ts  (add --network for live auth checks)');
  lines.push('Opt out of a capability forever: bun ... Doctor.ts decline <name>  — declined is silent, never nagged.');
  return lines.join('\n');
}

function statuslineGlyph(): string {
  if (!existsSync(MANIFEST)) return '';
  let m: Manifest;
  try { m = JSON.parse(readFileSync(MANIFEST, 'utf8')); } catch { return ''; }
  if (m.integrity && m.integrity !== computeIntegrity(m)) return '⚠ doctor: manifest tampered';
  const broken = Object.entries(m.capabilities)
    .filter(([, r]) => r.state === 'broken').map(([id]) => id);
  const fresh = broken.filter(id => !(m.ackedBroken || []).includes(id));
  return fresh.length ? `⚠ ${fresh.length} capability regression — lifeos doctor` : '';
}

// ── main ─────────────────────────────────────────────────────────────────────

// ── reconciler: declared (hooks on disk) vs registered (settings.json) ──────
// v1 scope: hooks only, two inventories. "Observed" (fire evidence from
// observability logs) is deferred — noted in the output so absence is loud.
function reconcileHooks(): { unwired: string[]; missing: string[]; note: string } {
  const hooksDir = join(CONFIG_ROOT, 'hooks');
  const settingsPath = join(CONFIG_ROOT, 'settings.json');
  const declared = existsSync(hooksDir)
    ? readdirSync(hooksDir).filter(f => f.endsWith('.hook.ts') || f.endsWith('.hook.sh'))
    : [];
  let registeredBlob = '';
  try {
    const s = JSON.parse(readFileSync(settingsPath, 'utf8'));
    registeredBlob = JSON.stringify(s.hooks || {});
  } catch {}
  // Direct registration by filename, then expand through dispatcher imports:
  // registered hooks that import sibling hook files wire them indirectly
  // (e.g. a PreToolUse dispatcher invoking per-domain guards). Without this
  // expansion the reconciler cries wolf on every dispatched hook.
  const registered = new Set(declared.filter(f => registeredBlob.includes(f)));
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of [...registered]) {
      let src = '';
      try { src = readFileSync(join(hooksDir, f), 'utf8'); } catch { continue; }
      for (const g of declared) {
        if (registered.has(g)) continue;
        const base = g.replace(/\.hook\.(ts|sh)$/, '');
        // Real import/require statements only — a comment mention is not wiring.
        if (new RegExp(`(?:from\\s+['"]\\./${base}\\.hook['"]|require\\(['"]\\./${base}\\.hook['"]\\)|import\\(['"]\\./${base}\\.hook['"]\\))`).test(src)) {
          registered.add(g); grew = true;
        }
      }
    }
  }
  const unwired = declared.filter(f => !registered.has(f));
  // wired-but-missing: registered commands referencing hook files not on disk
  const missing = [...registeredBlob.matchAll(/([A-Za-z0-9_-]+\.hook\.(?:ts|sh))/g)]
    .map(m => m[1]).filter((f, i, a) => a.indexOf(f) === i)
    .filter(f => !declared.includes(f));
  return { unwired, missing, note: 'v1 reconciles declared (hooks/ dir) vs registered (settings.json); observed-fire evidence deferred' };
}

const args = process.argv.slice(2);
const flag = (f: string) => args.includes(f);

if (flag('--statusline')) {
  console.log(statuslineGlyph());
  process.exit(0);
}

if (flag('--reconcile')) {
  const r = reconcileHooks();
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

if (flag('--hooks')) {
  const problems = hookInterpreterProblems();
  if (!problems.length) {
    console.log('hook interpreters: every registered hook resolves ✅');
  } else {
    console.log(`hook interpreters: ${problems.length} hook(s) cannot start —\n`);
    for (const p of problems) console.log(`  ✗ ${p}`);
    console.log('\nA hook that cannot start fails silently: no gate, no enforcement, just');
    console.log('`env: <interp>: No such file or directory` on a stderr nobody reads. Fix by');
    console.log('installing the interpreter, or `chmod +x` / restoring the `#!` line on the hook.');
    console.log('Do NOT hardcode a resolved PATH into settings.json — that PATH would then');
    console.log('apply to every session Bash call (public issue #1600, @cristbc).');
  }
  process.exit(0);
}

if (flag('--reclaim')) {
  await reclaimShadows();
  process.exit(0);
}

if (flag('--verify')) {
  if (!existsSync(MANIFEST)) { console.log('no manifest yet — run Doctor first'); process.exit(0); }
  const m: Manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const ok = !!m.integrity && m.integrity === computeIntegrity(m);
  console.log(ok ? 'integrity OK' : 'INTEGRITY FAILURE — manifest was edited outside Doctor. Re-run Doctor to regenerate.');
  process.exit(ok ? 0 : 2);
}

if (args[0] === 'decline' || args[0] === 'enable') {
  const id = args[1];
  const cap = CAPS.find(c => c.id === id);
  if (!cap) { console.log(`unknown capability "${id}" — known: ${CAPS.map(c => c.id).join(', ')}`); process.exit(0); }
  const m = loadManifest();
  if (args[0] === 'decline') {
    m.capabilities[id] = {
      state: 'declined', checkedAt: new Date().toISOString(), ttlHours: 24 * 365,
      detail: 'declined by user — permanently silent', fixCmd: null, probeClass: 'offline',
    };
    m.ackedBroken = (m.ackedBroken || []).filter(x => x !== id);
    console.log(`${cap.title}: off (declined). It will never warn or nag. Re-enable: bun ... Doctor.ts enable ${id}`);
  } else {
    delete m.capabilities[id];
    console.log(`${cap.title}: re-enabled — run Doctor to probe it.`);
  }
  saveManifest(m);
  process.exit(0);
}

if (args[0] === 'ack') {
  const m = loadManifest();
  m.ackedBroken = Object.entries(m.capabilities)
    .filter(([, r]) => r.state === 'broken').map(([id]) => id);
  saveManifest(m);
  console.log(`acknowledged ${m.ackedBroken.length} broken capabilit${m.ackedBroken.length === 1 ? 'y' : 'ies'} — statusline stays quiet until something NEW regresses.`);
  process.exit(0);
}

const network = flag('--network') && !flag('--no-network');
const m = await probeAll(network);
if (flag('--json')) {
  console.log(JSON.stringify(m, null, 2));
} else {
  console.log(renderTable(m));
}
process.exit(0);
