#!/usr/bin/env bun
/**
 * CheckVersion.hook.ts - Pre-Banner Version Check (SessionStart)
 *
 * PURPOSE:
 * Checks versions of Claude Code, Happy, PAI, and Algorithm BEFORE the PAI
 * welcome banner. Algorithm version is checked IN TANDEM with PAI — both are
 * part of the same release and should always be updated together.
 *
 * CRITICAL WINDOWS NOTE:
 * On Windows, Claude Code does NOT display hook stderr in the terminal.
 * All visible output MUST go to stdout. stdout gets shown as a system message
 * in the conversation (same as how StartupGreeting displays the banner).
 *
 * UX FLOW:
 * 1. CheckVersion outputs version status to stdout (visible pre-banner)
 * 2. If upgrades found: also outputs system-reminder for model to act on
 * 3. StartupGreeting shows the PAI banner (next hook group)
 * 4. LoadContext loads PAI context (same group as banner)
 * 5. Model uses AskUserQuestion to prompt for each upgrade
 *
 * TRIGGER: SessionStart (first hook group — runs before banner)
 *
 * OUTPUT:
 * - stdout: Version check results (visible) + system-reminder (if upgrades)
 * - exit(0): Always (non-blocking)
 *
 * PERFORMANCE:
 * - All network checks run in parallel
 * - Hard timeout: 5 seconds total
 * - Skipped for subagents
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execFile } from 'child_process';

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME || process.env.USERPROFILE || '', '.claude');

interface VersionCheck {
  name: string;
  current: string;
  latest: string;
  updateAvailable: boolean;
  upgradeCommand: string;
  upgradeNote?: string;
  requiresRelaunch: boolean;
}

// ── Constants ───────────────────────────────────────────────

const GITHUB_OWNER = 'danielmiessler';
const GITHUB_REPO = 'Personal_AI_Infrastructure';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

// ── Utilities ───────────────────────────────────────────────

function isNewer(current: string, latest: string): boolean {
  const norm = (v: string) => v.replace(/^v/, '').trim();
  const c = norm(current);
  const l = norm(latest);
  if (c === l || c === 'unknown' || l === 'unknown') return false;
  const cParts = c.split('.').map(n => parseInt(n) || 0);
  const lParts = l.split('.').map(n => parseInt(n) || 0);
  const len = Math.max(cParts.length, lParts.length);
  for (let i = 0; i < len; i++) {
    const cv = cParts[i] ?? 0;
    const lv = lParts[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

async function fetchWithTimeout(url: string, headers: Record<string, string>, timeoutMs = 3000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal, headers: { ...headers, 'User-Agent': 'PAI-CheckVersion' } });
    clearTimeout(timeoutId);
    return response.ok ? response : null;
  } catch { return null; }
}

const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';

async function runCommand(cmd: string, args: string[]): Promise<string> {
  // Use npm.cmd on Windows to avoid ENOENT; windowsHide prevents phantom cmd windows
  const resolvedCmd = cmd === 'npm' ? NPM_CMD : cmd;
  return new Promise((resolve) => {
    execFile(resolvedCmd, args, { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err) return resolve('unknown');
      resolve(stdout.trim() || 'unknown');
    });
  });
}

// Use stdout for ALL output on Windows (stderr is invisible in Claude Code TUI)
function output(text: string): void {
  process.stdout.write(text + '\n');
}

// ── Launch Command Detection ────────────────────────────────

async function detectLaunchCommand(): Promise<string> {
  const envCmd = process.env.PAI_LAUNCH_CMD;
  if (envCmd && ['pai', 'happy', 'claude'].includes(envCmd.toLowerCase())) {
    return envCmd.toLowerCase();
  }
  if (process.platform === 'win32') {
    try {
      const claudePid = process.ppid;
      const cmdLine = await new Promise<string>((resolve) => {
        execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command',
          `try {
            $claudeParent = (Get-Process -Id ${claudePid} -ErrorAction Stop).Parent
            if ($claudeParent) {
              $wmi = Get-WmiObject Win32_Process -Filter "ProcessId=$($claudeParent.Id)"
              if ($wmi) { $wmi.CommandLine } else { $claudeParent.ProcessName }
            }
          } catch { '' }`
        ], { windowsHide: true, timeout: 2000 }, (err, stdout) => {
          resolve(err ? '' : stdout.toLowerCase().trim());
        });
      });
      if (cmdLine.includes('happy')) return 'happy';
      if (cmdLine.includes('\\pai') || cmdLine === 'pai' || /\bpai\.(?:cmd|exe|js)\b/.test(cmdLine)) return 'pai';
    } catch { /* fall through */ }
  }
  return 'claude';
}

// ── Version Checkers ────────────────────────────────────────

async function detectClaudeInstallMethod(): Promise<'native' | 'npm'> {
  try {
    const isWindows = process.platform === 'win32';
    const whichCmd = isWindows ? 'where' : 'which';
    const [claudePathRaw, npmPrefix] = await Promise.all([
      runCommand(whichCmd, ['claude']),
      runCommand('npm', ['config', 'get', 'prefix']),
    ]);
    if (claudePathRaw === 'unknown' || npmPrefix === 'unknown') return 'native';
    const claudePath = claudePathRaw.split(/\r?\n/)[0].trim();
    const npmBinDir = isWindows ? npmPrefix.trim() : `${npmPrefix.trim()}/bin`;
    const normalize = (p: string) => p.toLowerCase().replace(/\\/g, '/').trim();
    return normalize(claudePath).startsWith(normalize(npmBinDir)) ? 'npm' : 'native';
  } catch { return 'native'; }
}

async function checkClaudeCode(): Promise<VersionCheck> {
  const [rawCurrent, rawLatest, installMethod] = await Promise.all([
    runCommand('claude', ['--version']),
    runCommand('npm', ['view', '@anthropic-ai/claude-code', 'version']),
    detectClaudeInstallMethod(),
  ]);
  const current = rawCurrent.match(/(\d+\.\d+\.\d+)/)?.[1] ?? 'unknown';
  const latest = rawLatest.trim() || 'unknown';
  return {
    name: 'Claude Code', current, latest,
    updateAvailable: isNewer(current, latest),
    upgradeCommand: installMethod === 'npm' ? 'npm install -g @anthropic-ai/claude-code@latest' : 'claude update',
    upgradeNote: installMethod === 'native' ? '(native installer self-update)' : undefined,
    requiresRelaunch: true,
  };
}

async function checkHappy(): Promise<VersionCheck> {
  let current = 'unknown';
  try {
    const globalRoot = await runCommand('npm', ['root', '-g']);
    if (globalRoot && globalRoot !== 'unknown') {
      const pkgPath = join(globalRoot.trim(), 'happy-coder', 'package.json');
      current = JSON.parse(readFileSync(pkgPath, 'utf-8')).version || 'unknown';
    }
  } catch { /* fall through */ }
  const latest = (await runCommand('npm', ['view', 'happy-coder', 'version'])).trim() || 'unknown';
  return {
    name: 'Happy', current, latest,
    updateAvailable: isNewer(current, latest),
    upgradeCommand: 'npm install -g happy-coder@latest',
    requiresRelaunch: true,
  };
}

// Shared: fetch latest PAI release tag + Algorithm version (cached — single API call sequence)
let _releasePromise: Promise<{ tag: string; version: string; algorithmVersion: string }> | null = null;

function getLatestPaiRelease(): Promise<{ tag: string; version: string; algorithmVersion: string }> {
  if (!_releasePromise) {
    _releasePromise = (async () => {
      const unknown = { tag: 'unknown', version: 'unknown', algorithmVersion: 'unknown' };
      const response = await fetchWithTimeout(`${GITHUB_API_BASE}/releases/latest`, { 'Accept': 'application/vnd.github+json' });
      if (!response) return unknown;
      const release = await response.json() as { tag_name?: string };
      const tag = release?.tag_name ?? 'unknown';
      const version = tag.replace(/^v/, '').trim() || 'unknown';
      if (tag === 'unknown') return { ...unknown, tag, version };
      // Fetch Algorithm LATEST from the same release (tandem check)
      const algoResponse = await fetchWithTimeout(
        `${GITHUB_API_BASE}/contents/Releases/${tag}/.claude/PAI/Algorithm/LATEST`,
        { 'Accept': 'application/vnd.github.v3.raw' },
      );
      const algorithmVersion = algoResponse ? (await algoResponse.text()).trim() || 'unknown' : 'unknown';
      return { tag, version, algorithmVersion };
    })();
  }
  return _releasePromise;
}

async function checkPai(): Promise<VersionCheck> {
  try {
    const settingsPath = join(PAI_DIR, 'settings.json');
    let current = 'unknown';
    try { current = String(JSON.parse(readFileSync(settingsPath, 'utf-8'))?.pai?.version ?? 'unknown'); } catch {}
    const release = await getLatestPaiRelease();
    const latest = release.version;
    const latestTag = release.tag;
    const updateAvailable = latest !== 'unknown' && isNewer(current, latest);
    const releaseUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tag/${latestTag}`;
    return {
      name: 'PAI', current, latest, updateAvailable,
      upgradeCommand: updateAvailable ? `echo "Visit: ${releaseUrl}"` : '',
      upgradeNote: latestTag !== 'unknown' ? `See release notes at ${releaseUrl}` : undefined,
      requiresRelaunch: true,
    };
  } catch { return { name: 'PAI', current: 'unknown', latest: 'unknown', updateAvailable: false, upgradeCommand: '', requiresRelaunch: false }; }
}

async function checkAlgorithm(): Promise<VersionCheck> {
  // Read local Algorithm version (primary path, fallback to legacy)
  let current = 'unknown';
  try {
    current = readFileSync(join(PAI_DIR, 'PAI', 'Algorithm', 'LATEST'), 'utf-8').trim() || 'unknown';
  } catch {
    try {
      current = readFileSync(join(PAI_DIR, 'skills', 'PAI', 'Components', 'Algorithm', 'LATEST'), 'utf-8').trim() || 'unknown';
    } catch {}
  }

  // Algorithm version from latest PAI release (fetched in tandem with PAI check — no extra API call)
  const release = await getLatestPaiRelease();
  const latest = release.algorithmVersion;
  const updateAvailable = isNewer(current, latest);
  return {
    name: 'Algorithm', current, latest, updateAvailable,
    upgradeCommand: updateAvailable ? `echo "Algorithm updates are bundled with PAI — upgrade PAI to get Algorithm ${latest}"` : '',
    upgradeNote: updateAvailable ? 'Algorithm is shipped as part of PAI releases — upgrade PAI to update both in tandem' : undefined,
    requiresRelaunch: true,
  };
}

// ── Main ────────────────────────────────────────────────────

async function main() {
  try {
    const isSubagent = (process.env.CLAUDE_PROJECT_DIR || '').includes('/.claude/Agents/') ||
                       process.env.CLAUDE_AGENT_TYPE !== undefined;
    if (isSubagent) process.exit(0);

    // All output goes to stdout (the ONLY visible channel on Windows)
    output('🔍 Checking for updates...');

    const [launchCmd, networkChecks] = await Promise.all([
      detectLaunchCommand(),
      Promise.race<VersionCheck[]>([
        Promise.all([checkClaudeCode(), checkHappy(), checkPai(), checkAlgorithm()]),
        new Promise<VersionCheck[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]).catch(() => [] as VersionCheck[]),
    ]);

    if (networkChecks.length === 0) {
      output('⚠️  Network timeout — skipping version checks');
      process.exit(0);
    }

    const updates: VersionCheck[] = [];
    for (const check of networkChecks) {
      if (check.current === 'unknown' && check.latest === 'unknown') {
        output(`  ❓ ${check.name}: unable to check`);
      } else if (check.updateAvailable) {
        output(`  ⬆️  ${check.name}: ${check.current} → ${check.latest}`);
        updates.push(check);
      } else {
        output(`  ✓  ${check.name}: ${check.current} (current)`);
      }
    }

    if (updates.length === 0) {
      output('✅ All tools up to date\n');
      process.exit(0);
    }

    output(`\n📦 ${updates.length} update(s) available\n`);

    // System-reminder for the model to act on (also stdout)
    const updateLines = updates
      .map((u, i) => {
        const note = u.upgradeNote ? `\n   Note: ${u.upgradeNote}` : '';
        return `${i + 1}. **${u.name}**: \`${u.current}\` → \`${u.latest}\`\n   Upgrade: \`${u.upgradeCommand}\`${note}`;
      })
      .join('\n\n');
    const relaunchNames = updates.filter(u => u.requiresRelaunch).map(u => u.name).join(', ');

    output(`<system-reminder>
⚠️ VERSION UPGRADES AVAILABLE

${updateLines}
${relaunchNames ? `\nAfter upgrading, relaunch with: \`${launchCmd}\`` : ''}

**JAI**: Use AskUserQuestion to offer each upgrade. If confirmed, run the upgrade command.
</system-reminder>`);

    process.exit(0);
  } catch {
    process.exit(0);
  }
}

main();
