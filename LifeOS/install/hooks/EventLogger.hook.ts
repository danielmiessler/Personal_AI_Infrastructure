#!/usr/bin/env bun
/**
 * @version 1.0.3
 * EventLogger.hook.ts - Unified observability event logger
 *
 * Consolidation (2026-07-10, {{PRINCIPAL_NAME}}'s hook consolidation): merges FIVE
 * behavior-preserving append-JSONL loggers into one dispatcher keyed on
 * `hook_event_name`. None of these emit model-context output — they only
 * append structured events and (for PostToolUse) bump the ISA heartbeat.
 *
 * Merged sources (each logic block preserved byte-for-behavior):
 *   1. ToolActivityTracker.hook.ts  → PostToolUse (all tools). Ground-truth
 *      audit → MEMORY/OBSERVABILITY/tool-activity.jsonl + ISA heartbeat bump.
 *   2. SkillExecutionLog.hook.ts    → PostToolUse (Skill only). Additional
 *      write → MEMORY/SKILLS/execution.jsonl. Runs IN ADDITION to (1) — both
 *      files are written on a Skill PostToolUse; downstream reads execution.jsonl.
 *   3. ToolFailureTracker.hook.ts   → PostToolUseFailure →
 *      MEMORY/OBSERVABILITY/tool-failures.jsonl.
 *   4. StopFailureHandler.hook.ts   → StopFailure →
 *      MEMORY/SECURITY/<YYYY>/<MM>/stop-failures-<YYYY-MM-DD>.jsonl (log-only).
 *   5. ConfigAudit.hook.ts          → ConfigChange →
 *      MEMORY/OBSERVABILITY/config-changes.jsonl.
 *
 * DISPATCH:
 *   PostToolUse        → tool-activity ALWAYS, + skill-execution when tool==Skill
 *   PostToolUseFailure → tool-failure
 *   StopFailure        → stop-failure
 *   ConfigChange       → config-audit
 *
 * ONE IMPROVEMENT over the pre-merge behavior: ConfigAudit's settings snapshot
 * moved from volatile /tmp/pai-settings-snapshot.json to
 * MEMORY/STATE/pai-settings-snapshot.json so the diff baseline survives reboots
 * (previously it lost its baseline on every restart, forcing an "initial
 * snapshot" no-diff on the first ConfigChange after boot).
 *
 * Every event path is registered to this ONE file (matcher * for PostToolUse
 * subsumes the former Skill-matcher entry). Fail-open throughout: any error is
 * logged to stderr and the process exits 0 so a logging fault never blocks a turn.
 */

import {
  existsSync,
  mkdirSync,
  appendFileSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { execFileSync, spawn } from 'child_process';
import { paiPath, getSettingsPath } from './lib/paths';
import { getISOTimestamp, getPSTDate, getYearMonth } from './lib/time';
import { bumpLastToolActivity, bumpLastToolActivityByUUID } from './lib/isa-utils';
import {
  buildExecutionLine,
  extractSkillArgs,
  extractSkillName,
  isoZTimestamp,
} from './lib/skill-notify-core';

// ── Shared stdin reader (identical 2s-timeout pattern used by all five) ──────
// 10MB cap: a fast/continuous stream could buffer multi-GB inside the 2s window
// (public issue #1533, @christauff). Over the cap → settle with what we have;
// that one oversized event is truncated, consistent with fail-open behavior.
const STDIN_CAP_BYTES = 10_000_000;
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { process.stdin.pause(); } catch { /* already closed */ }
      resolve(data);
    };
    const timer = setTimeout(finish, 2000);
    process.stdin.on('data', (chunk) => {
      data += chunk.toString();
      if (data.length > STDIN_CAP_BYTES) finish();
    });
    process.stdin.on('end', finish);
    process.stdin.on('error', finish);
  });
}

// ═════════════════════════════════════════════════════════════════════════
// 1 + 2. PostToolUse: ToolActivityTracker (always) + SkillExecutionLog (Skill)
// ═════════════════════════════════════════════════════════════════════════

interface ToolUseInput {
  session_id: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
}

const OBS_DIR = paiPath('MEMORY', 'OBSERVABILITY');
const ACTIVITY_FILE = join(OBS_DIR, 'tool-activity.jsonl');

const SKILLS_DIR = paiPath('MEMORY', 'SKILLS');
const EXECUTION_FILE = join(SKILLS_DIR, 'execution.jsonl');

// Tools that mutate filesystem state — capture extra ground truth.
const WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit', 'MultiEdit']);
const BASH_TOOLS = new Set(['Bash']);

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '...[truncated]' : s;
}

function gitSnapshot(cwd: string): { head?: string; dirty?: boolean } | undefined {
  try {
    const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 500,
    }).trim();
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 500,
    });
    return { head, dirty: status.trim().length > 0 };
  } catch {
    return undefined;
  }
}

function captureGroundTruth(toolName: string, input: Record<string, unknown>, response: unknown) {
  const gt: Record<string, unknown> = {};

  if (WRITE_TOOLS.has(toolName) && typeof input.file_path === 'string') {
    gt.file_path = input.file_path;
    // Edit/MultiEdit carry the before/after diff in args; capture bounded.
    if (typeof input.old_string === 'string' && typeof input.new_string === 'string') {
      gt.diff = {
        removed: truncate(input.old_string, 500),
        added: truncate(input.new_string, 500),
      };
    }
    if (typeof input.content === 'string') {
      gt.content_preview = truncate(input.content, 500);
      gt.content_bytes = input.content.length;
    }
    const gs = gitSnapshot(process.cwd());
    if (gs) gt.git = gs;
  }

  if (BASH_TOOLS.has(toolName) && typeof input.command === 'string') {
    gt.command = truncate(input.command, 500);
    // Claude Code puts stdout/stderr/exit in tool_response — shape varies.
    if (response && typeof response === 'object') {
      const r = response as Record<string, unknown>;
      if ('stdout' in r && typeof r.stdout === 'string') {
        gt.stdout_preview = truncate(r.stdout, 800);
        gt.stdout_bytes = r.stdout.length;
      }
      if ('stderr' in r && typeof r.stderr === 'string') {
        gt.stderr_preview = truncate(r.stderr, 800);
      }
      if ('exit_code' in r || 'exitCode' in r) {
        gt.exit_code = r.exit_code ?? r.exitCode;
      }
    }
  }

  return Object.keys(gt).length > 0 ? gt : undefined;
}

function appendSkillJsonLine(filePath: string, line: unknown): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(filePath, JSON.stringify(line) + '\n', 'utf-8');
}

function handlePostToolUse(raw: string): void {
  // ── ToolActivityTracker logic (ALWAYS) ────────────────────────────────
  let data: ToolUseInput;
  try {
    data = JSON.parse(raw) as ToolUseInput;
  } catch (e) {
    console.error('[ToolActivityTracker]', e instanceof Error ? e.message : String(e));
    return;
  }

  try {
    const toolName = data.tool_name || 'unknown';

    let inputPreview = '';
    if (data.tool_input) {
      const raw2 = JSON.stringify(data.tool_input);
      inputPreview = raw2.length > 300 ? raw2.slice(0, 300) + '...' : raw2;
    }

    const groundTruth = data.tool_input
      ? captureGroundTruth(toolName, data.tool_input, data.tool_response)
      : undefined;

    const event = {
      timestamp: getISOTimestamp(),
      event: 'tool_use',
      source: 'tool-activity',
      type: 'tool_use',
      session_id: data.session_id,
      tool_name: toolName,
      tool_input_preview: inputPreview,
      ...(groundTruth ? { ground_truth: groundTruth } : {}),
    };

    if (!existsSync(OBS_DIR)) mkdirSync(OBS_DIR, { recursive: true });
    appendFileSync(ACTIVITY_FILE, JSON.stringify(event) + '\n', 'utf-8');

    // Heartbeat (2026-07-15 reversal of the narrow-bump design): EVERY tool
    // call bumps the session's row (30s debounce inside). The old rule bumped
    // only on files under MEMORY/WORK/<slug>/, which made runs doing real work
    // between ISA edits read as dead within 10 minutes ("I'm working right now
    // and I don't see it" — {{PRINCIPAL_NAME}}, twice). Phantom-dead proved worse than the
    // phantom-active the old rule guarded against. The path-based bump stays
    // for cross-session ISA touches (a different UUID working an ISA's files).
    if (typeof data.session_id === 'string') bumpLastToolActivityByUUID(data.session_id);
    const toolFilePath = typeof data.tool_input?.file_path === 'string'
      ? data.tool_input.file_path
      : null;
    if (toolFilePath) bumpLastToolActivity(toolFilePath);

    // Drift healer (2026-07-20): ISA edits that bypass ISASync's Write/Edit
    // trigger (Bash sed, git, other machines) leave work.json rows stale in
    // wrong kanban lanes. WorkReconcile re-syncs rows whose ISA mtime moved.
    // Spawn gate: state-file mtime check keeps this to one detached spawn per
    // minute; the tool itself debounces again internally.
    try {
      const reconcileState = paiPath('MEMORY', 'STATE', 'work-reconcile.json');
      let due = true;
      try {
        due = Date.now() - statSync(reconcileState).mtimeMs > 60_000;
      } catch { /* no state file yet — run it */ }
      if (due) {
        const proc = spawn('bun', [paiPath('TOOLS', 'WorkReconcile.ts')], {
          detached: true,
          stdio: 'ignore',
        });
        proc.unref();
      }
    } catch { /* healing is best-effort; never break the logger */ }
  } catch (e) {
    console.error('[ToolActivityTracker]', e instanceof Error ? e.message : String(e));
  }

  // ── SkillExecutionLog logic (ADDITIONAL, only when tool_name === "Skill") ──
  // Runs regardless of any failure above — the two writes are independent, and
  // downstream reads execution.jsonl separately from tool-activity.jsonl.
  if (data.tool_name === 'Skill') {
    try {
      const skill = extractSkillName(data.tool_input);
      if (skill) {
        const args = extractSkillArgs(data.tool_input);
        const ts = isoZTimestamp(getISOTimestamp());
        appendSkillJsonLine(EXECUTION_FILE, buildExecutionLine(skill, args, ts));
      }
    } catch (error) {
      console.error('[SkillExecutionLog]', error instanceof Error ? error.message : String(error));
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 3. PostToolUseFailure: ToolFailureTracker
// ═════════════════════════════════════════════════════════════════════════

interface ToolFailureInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  error?: string;
}

interface ToolFailureEvent {
  timestamp: string;
  event: 'tool_failure';
  session_id: string;
  tool_name: string;
  error: string;
  tool_input_preview: string;
}

const FAILURES_FILE = join(OBS_DIR, 'tool-failures.jsonl');

function handlePostToolUseFailure(raw: string): void {
  try {
    const data: ToolFailureInput = JSON.parse(raw);
    const toolName = data.tool_name || 'unknown';
    const error = data.error || 'unknown error';

    // Truncate tool input for storage
    let inputPreview = '';
    if (data.tool_input) {
      const rawIn = JSON.stringify(data.tool_input);
      inputPreview = rawIn.length > 500 ? rawIn.slice(0, 500) + '...' : rawIn;
    }

    const event: ToolFailureEvent = {
      timestamp: getISOTimestamp(),
      event: 'tool_failure',
      session_id: data.session_id,
      tool_name: toolName,
      error: error.slice(0, 1000),
      tool_input_preview: inputPreview,
    };

    if (!existsSync(OBS_DIR)) mkdirSync(OBS_DIR, { recursive: true });
    appendFileSync(FAILURES_FILE, JSON.stringify(event) + '\n', 'utf-8');
    console.error(`[ToolFailureTracker] Logged failure: ${toolName} — ${error.slice(0, 80)}`);
  } catch (err) {
    console.error(`[ToolFailureTracker] Error: ${err}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════
// 4. StopFailure: StopFailureHandler (log-only; no voice per 2026-06-11)
// ═════════════════════════════════════════════════════════════════════════

interface StopFailureInput {
  session_id?: string;
  hook_event_name?: string;
  error?: string;
}

function handleStopFailure(raw: string): void {
  let input: StopFailureInput;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }

  const timestamp = getISOTimestamp();
  const [year, month] = getYearMonth().split('-');
  const logDir = paiPath('MEMORY', 'SECURITY', year, month);

  // Log the failure
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  const logEntry = {
    timestamp,
    session_id: input.session_id || 'unknown',
    event_type: 'stop_failure',
    hook_event: input.hook_event_name || 'StopFailure',
    error_details: input.error || 'unknown API error',
  };

  try {
    appendFileSync(
      `${logDir}/stop-failures-${getPSTDate()}.jsonl`,
      JSON.stringify(logEntry) + '\n',
    );
  } catch {
    // Silent — don't block on logging failure
  }

  // Log-only. Nothing here speaks, and re-adding voice is a regression, not a feature:
  // Claude Code already prints the error on screen, so a spoken StopFailure carries zero
  // new information. Suppression lists do not fix this — any kind the list fails to name
  // (e.g. "unknown") speaks anyway. The JSONL above is the record.
}

// ═════════════════════════════════════════════════════════════════════════
// 5. ConfigChange: ConfigAudit
// ═════════════════════════════════════════════════════════════════════════

interface ConfigChangeInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  config_path?: string;
  config_key?: string;
  old_value?: unknown;
  new_value?: unknown;
}

interface ConfigChangeEvent {
  timestamp: string;
  event: 'config_change';
  session_id: string;
  config_path: string;
  config_key: string;
  change_summary: string;
}

const AUDIT_FILE = join(OBS_DIR, 'config-changes.jsonl');
// IMPROVEMENT (2026-07-10): moved from volatile /tmp so the diff baseline
// survives reboots. STATE dir is created on demand before writing the snapshot.
const SNAPSHOT_PATH = paiPath('MEMORY', 'STATE', 'pai-settings-snapshot.json');

// Sensitive keys that warrant extra logging
const SENSITIVE_KEYS = new Set([
  'permissions', 'hooks', 'env', 'mcpServers',
  'permissions.allow', 'permissions.deny', 'permissions.ask',
]);

/**
 * Diff current settings.json against cached snapshot.
 * Returns array of top-level keys that changed, plus a summary string.
 */
function diffSettings(): { changedKeys: string[]; summary: string } {
  const settingsPath = getSettingsPath();
  let current: Record<string, unknown> = {};
  let snapshot: Record<string, unknown> = {};

  try {
    current = JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    return { changedKeys: ['settings.json'], summary: 'could not read settings.json' };
  }

  try {
    if (existsSync(SNAPSHOT_PATH)) {
      snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));
    }
  } catch {
    // No snapshot or corrupt — treat everything as new
  }

  // Save new snapshot for next comparison
  try {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(current), 'utf-8');
  } catch {
    // Non-fatal
  }

  // If no prior snapshot, we can't diff
  if (Object.keys(snapshot).length === 0) {
    return { changedKeys: ['initial'], summary: 'initial snapshot (no prior to diff)' };
  }

  // Compare top-level keys
  const allKeys = new Set([...Object.keys(current), ...Object.keys(snapshot)]);
  const changed: string[] = [];
  const summaryParts: string[] = [];

  for (const key of allKeys) {
    const curVal = JSON.stringify(current[key]);
    const snapVal = JSON.stringify(snapshot[key]);

    if (curVal !== snapVal) {
      changed.push(key);

      if (!(key in snapshot)) {
        summaryParts.push(`${key}: added`);
      } else if (!(key in current)) {
        summaryParts.push(`${key}: removed`);
      } else {
        // For arrays/objects, try to show what changed at second level
        if (typeof current[key] === 'object' && current[key] && typeof snapshot[key] === 'object' && snapshot[key]) {
          const curObj = current[key] as Record<string, unknown>;
          const snapObj = snapshot[key] as Record<string, unknown>;
          const subKeys = new Set([...Object.keys(curObj), ...Object.keys(snapObj)]);
          const subChanged: string[] = [];
          for (const sk of subKeys) {
            if (JSON.stringify(curObj[sk]) !== JSON.stringify(snapObj[sk])) {
              subChanged.push(sk);
            }
          }
          if (subChanged.length <= 3) {
            summaryParts.push(`${key}.{${subChanged.join(',')}}: modified`);
          } else {
            summaryParts.push(`${key}: ${subChanged.length} sub-keys modified`);
          }
        } else {
          const newStr = JSON.stringify(current[key]).slice(0, 80);
          summaryParts.push(`${key}: → ${newStr}`);
        }
      }
    }
  }

  if (changed.length === 0) {
    return { changedKeys: ['unchanged'], summary: 'no diff detected (possible race)' };
  }

  return { changedKeys: changed, summary: summaryParts.join('; ') };
}

function handleConfigChange(raw: string): void {
  try {
    const data: ConfigChangeInput = JSON.parse(raw);

    // Use file-diff to determine what actually changed
    const { changedKeys, summary } = diffSettings();
    const configKey = changedKeys.join(',');
    const isSensitive = changedKeys.some(k => SENSITIVE_KEYS.has(k));

    const event: ConfigChangeEvent = {
      timestamp: getISOTimestamp(),
      event: 'config_change',
      session_id: data.session_id,
      config_path: data.config_path || 'settings.json',
      config_key: configKey,
      change_summary: summary,
    };

    if (!existsSync(OBS_DIR)) mkdirSync(OBS_DIR, { recursive: true });
    appendFileSync(AUDIT_FILE, JSON.stringify(event) + '\n', 'utf-8');

    const sensitivity = isSensitive ? ' [SENSITIVE]' : '';
    console.error(`[ConfigAudit] Logged: ${configKey}${sensitivity} — ${summary}`);
  } catch (err) {
    console.error(`[ConfigAudit] Error: ${err}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════
// Dispatcher
// ═════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) { process.exit(0); }

    // Parse just enough to route. A malformed payload for a PostToolUse still
    // gets handed to the PostToolUse handler (which re-parses and logs its own
    // error) to preserve the pre-merge fail-open behavior.
    let eventName = '';
    try {
      eventName = (JSON.parse(raw) as { hook_event_name?: string }).hook_event_name || '';
    } catch {
      // hook_event_name unreadable — fall through; nothing to dispatch safely.
    }

    switch (eventName) {
      case 'PostToolUse':
        handlePostToolUse(raw);
        break;
      case 'PostToolUseFailure':
        handlePostToolUseFailure(raw);
        break;
      case 'StopFailure':
        handleStopFailure(raw);
        break;
      case 'ConfigChange':
        handleConfigChange(raw);
        break;
      default:
        // Unknown / missing event name — no-op, fail open.
        break;
    }
  } catch (e) {
    console.error('[EventLogger]', e instanceof Error ? e.message : String(e));
  }
  process.exit(0);
}

main();
