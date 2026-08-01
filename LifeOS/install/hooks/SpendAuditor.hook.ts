#!/usr/bin/env bun
/**
 * @version 1.0.0
 * SpendAuditor.hook.ts — outcome-side spend verification (2026-07-16).
 *
 * Capability workstream ISC-24 (MEMORY/WORK/20260716-euphoric-surprise-isa-design).
 * The failure class: a HEAVY ask (design, analysis, research, assessment)
 * answered inline with zero capability use and no stated reason — the euphoric-
 * surprise "think deeply" miss and the Pocock "thorough analysis" miss both
 * logged as zero-capability-inline incidents on 2026-07-16. AlgorithmNudge
 * catches the depth SIGNAL at prompt time; this catches the OUTCOME at Stop:
 * did the effort actually match the ask?
 *
 * NON-BLOCKING BY DESIGN. A Stop-blocking spend gate Goodharts into token
 * dispatches and gates on procedure, not outcome — the same design the
 * AlgorithmNudge depth-block variant was adversarially killed for (2026-07-12).
 * So this hook NEVER blocks, NEVER exits non-zero, NEVER runs inference on the
 * hot path. The hot path only reads/writes a tiny state file and spawns a
 * detached, unref'd worker; total hot-path target <20ms, always exit 0.
 *
 * TRIGGERS (the detached worker audits if ANY fire):
 *   depth-signal        — isa-nudge state shows a 'depth' fire
 *                         this session (the depth ask was steered, verify spend)
 *   zero-capability-sweep — session Skill+Agent count is ZERO and the last user
 *                         prompt is ≥200 chars (lexicon-independent backstop)
 *   run-close           — a work.json entry for this session hit phase=complete
 *                         within the last 10 min
 *
 * VERDICT SINK: MEMORY/OBSERVABILITY/spend-audit.jsonl (append-only). An
 * underspend verdict at confidence ≥0.6 also lands in capability-incidents.jsonl
 * (caught_by:"spend-auditor"). All inference runs in the detached pass at
 * --level low; the pass may take ~90s and every step is try/caught.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { resolveBun } from './lib/resolve-bin';
import { paiPath } from './lib/paths';
import { getISOTimestamp } from './lib/time';

const STATE_PATH = paiPath('MEMORY', 'STATE', 'spend-audit-state.json');
const NUDGE_STATE_DIR = paiPath('MEMORY', 'STATE', 'isa-nudge');
const WORK_JSON = paiPath('MEMORY', 'STATE', 'work.json');
const AUDIT_LOG = paiPath('MEMORY', 'OBSERVABILITY', 'spend-audit.jsonl');
const INCIDENTS_LOG = paiPath('MEMORY', 'OBSERVABILITY', 'capability-incidents.jsonl');
const INFERENCE_TS = paiPath('TOOLS', 'Inference.ts');
const PROMPT_PATH = join(import.meta.dir, 'lib', 'spend-auditor-prompt.md');

const RATE_LIMIT_MS = 20 * 60 * 1000;     // don't re-audit a session inside 20 min
const PRUNE_MS = 48 * 60 * 60 * 1000;     // drop state entries older than 48h
const RUN_CLOSE_MS = 10 * 60 * 1000;      // "just completed" window for run-close
const ZERO_CAP_MIN_CHARS = 200;           // lexicon-independent sweep floor
const TAIL_BYTES = 800 * 1024;            // read at most the last ~800KB of transcript
const GIST_MAX = 1500;                     // prompt/answer gist ceiling into inference
const PROMPT_GIST_LOG = 200;               // prompt_gist ceiling in the JSONL record
const INFERENCE_TIMEOUT_MS = 90 * 1000;    // detached pass budget

/** session_id must be a plain token — refuse traversal/separators outright
 *  (mirrors AlgorithmNudge's SESSION_ID_RE). */
const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

interface HookInput {
  session_id?: string;
  hook_event_name?: string;
  transcript_path?: string;
}

interface AgentCap { type: string; model?: string }
interface Caps { skills: string[]; agents: AgentCap[]; tool_calls: number }
interface Verdict { verdict: string; confidence: number; expected: string; actual: string; reason: string }

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch { return fallback; }
}

function appendJsonl(path: string, obj: Record<string, unknown>): void {
  try {
    mkdirSync(join(path, '..'), { recursive: true });
    appendFileSync(path, JSON.stringify(obj) + '\n');
  } catch { /* observability is best-effort — never break the pass */ }
}

// ── Transcript extraction (pure; exported for tests) ─────────────────────────

interface Rec { type?: string; isSidechain?: boolean; message?: { role?: string; content?: unknown } }

/** Flatten a message.content to its text (string content, or the text blocks of
 *  a block list — tool_result/tool_use blocks contribute nothing). */
export function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b): b is { type?: string; text?: string } => !!b && typeof b === 'object')
      .filter(b => b.type === 'text')
      .map(b => b.text || '')
      .join('\n');
  }
  return '';
}

function isToolResultTurn(content: unknown): boolean {
  return Array.isArray(content)
    && content.some(b => !!b && typeof b === 'object' && (b as { type?: string }).type === 'tool_result');
}

/** A genuine user prompt: a user turn that is real principal text, not a tool
 *  result, system reminder, command wrapper, or task notification. Those all
 *  start with '<' or are tool_result turns (matches the AlgorithmNudge
 *  routeSuppressed '<'-prefix convention). Pure; exported for tests. */
export function isGenuineUserPrompt(rec: Rec): boolean {
  if (rec.type !== 'user' || rec.isSidechain) return false;
  const content = rec.message?.content;
  if (isToolResultTurn(content)) return false;
  const text = extractText(content).trim();
  return text.length > 0 && !text.startsWith('<');
}

/** Count Skill invocations, Agent/Task dispatches, and total tool calls in the
 *  assistant turns at index ≥ startIdx. Pure; exported for tests. */
export function collectCaps(records: Rec[], startIdx: number): Caps {
  const skills: string[] = [];
  const agents: AgentCap[] = [];
  let tool_calls = 0;
  for (let i = Math.max(0, startIdx); i < records.length; i++) {
    const r = records[i];
    if (r.type !== 'assistant') continue;
    const content = r.message?.content;
    if (!Array.isArray(content)) continue;
    for (const raw of content) {
      if (!raw || typeof raw !== 'object') continue;
      const b = raw as { type?: string; name?: string; input?: Record<string, unknown> };
      if (b.type !== 'tool_use') continue;
      tool_calls += 1;
      if (b.name === 'Skill') {
        const s = b.input?.skill;
        if (s) skills.push(String(s));
      } else if (b.name === 'Agent' || b.name === 'Task') {
        agents.push({
          type: String(b.input?.subagent_type ?? 'general-purpose'),
          model: b.input?.model ? String(b.input.model) : undefined,
        });
      }
    }
  }
  return { skills, agents, tool_calls };
}

/** The final assistant text in the transcript (last assistant turn with text). */
export function lastAssistantText(records: Rec[]): string {
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].type === 'assistant') {
      const t = extractText(records[i].message?.content).trim();
      if (t) return t;
    }
  }
  return '';
}

/** The last genuine user prompt and its record index (−1 if none). */
export function lastUserPrompt(records: Rec[]): { text: string; index: number } {
  let index = -1;
  let text = '';
  for (let i = 0; i < records.length; i++) {
    if (isGenuineUserPrompt(records[i])) {
      index = i;
      text = extractText(records[i].message?.content).trim();
    }
  }
  return { text, index };
}

// ── The audit payload (shared with RunCalibration — imported from here) ───────

/** Build the user payload the auditor sees. Identical shape in the hook and the
 *  calibration harness so fixtures exercise the real path. Pure; exported. */
export function buildAuditPayload(input: { promptGist: string; answerGist: string; caps: Caps }): string {
  const { promptGist, answerGist, caps } = input;
  const agentSummary = caps.agents.length === 0
    ? 'none'
    : caps.agents.map(a => `${a.type}(${a.model ?? 'NO MODEL'})`).join(', ');
  const skillSummary = caps.skills.length === 0 ? 'none' : caps.skills.join(', ');
  return [
    'USER ASK (gist):',
    promptGist.slice(0, GIST_MAX),
    '',
    'ASSISTANT ANSWER (gist):',
    answerGist.slice(0, GIST_MAX),
    '',
    'CAPABILITY TRACE (this response):',
    `- Skill invocations: ${caps.skills.length} [${skillSummary}]`,
    `- Agent/Task dispatches: ${caps.agents.length} [${agentSummary}]`,
    `- Total tool calls: ${caps.tool_calls}`,
    '',
    'Judge whether the spend matched the ask. Return only the JSON verdict.',
  ].join('\n');
}

// ── Eligibility ──────────────────────────────────────────────────────────────

type Trigger = 'depth-signal' | 'zero-capability-sweep' | 'run-close';

/** Did AlgorithmNudge fire a depth row this session? That key in lastNudgeAt
 *  records fires (see AlgorithmNudge NudgeState). */
function depthSignalFired(sessionId: string): boolean {
  const s = readJson<{ lastNudgeAt?: Record<string, number> }>(
    join(NUDGE_STATE_DIR, `${sessionId}.json`), {});
  const at = s.lastNudgeAt || {};
  return typeof at.depth === 'number';
}

/** A work-registry entry for this session that just hit phase=complete. Wrapped
 *  in try/catch — the registry shape may vary; a parse failure is not-eligible
 *  on this branch, never a throw. */
function runJustClosed(sessionId: string, now: number): boolean {
  try {
    const reg = readJson<{ sessions?: Record<string, Record<string, unknown>> }>(WORK_JSON, {});
    for (const s of Object.values(reg.sessions || {})) {
      if ((s.sessionUUID as string) !== sessionId) continue;
      if (String(s.phase ?? '') !== 'complete') continue;
      const updated = Date.parse(String(s.updatedAt ?? s.updated ?? ''));
      if (Number.isFinite(updated) && now - updated < RUN_CLOSE_MS) return true;
    }
  } catch { /* variable structure → not eligible here */ }
  return false;
}

/** Which trigger (if any) makes this session audit-eligible. */
export function decideTrigger(opts: { sessionId: string; caps: Caps; lastPromptLen: number; now: number }): Trigger | null {
  if (depthSignalFired(opts.sessionId)) return 'depth-signal';
  if (opts.caps.skills.length + opts.caps.agents.length === 0 && opts.lastPromptLen >= ZERO_CAP_MIN_CHARS) {
    return 'zero-capability-sweep';
  }
  if (runJustClosed(opts.sessionId, opts.now)) return 'run-close';
  return null;
}

// ── Detached audit pass (may take ~90s; all try/caught; always exit 0) ────────

async function readTail(path: string): Promise<Rec[]> {
  const file = Bun.file(path);
  const size = file.size;
  const start = Math.max(0, size - TAIL_BYTES);
  let text = await file.slice(start).text();
  if (start > 0) {
    const nl = text.indexOf('\n');
    if (nl >= 0) text = text.slice(nl + 1); // drop the partial leading line
  }
  const recs: Rec[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { recs.push(JSON.parse(line) as Rec); } catch { /* skip malformed line */ }
  }
  return recs;
}

/** Run Inference.ts CLI at --level low --json and return the parsed verdict, or
 *  an error string. The CLI prints the parsed JSON to stdout on success. */
async function runInference(systemPrompt: string, userPayload: string): Promise<{ verdict?: Verdict; error?: string }> {
  try {
    const proc = Bun.spawn(
      // --timeout 60000: Inference's low-level default is 15s, which real
      // spend judgments exceed (found by RunCalibration 2026-07-16); the
      // 90s process killer above remains the hard backstop.
      [resolveBun(), INFERENCE_TS, '--json', '--level', 'low', '--timeout', '60000', systemPrompt, userPayload],
      { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
    );
    const killer = setTimeout(() => { try { proc.kill(); } catch { /* already gone */ } }, INFERENCE_TIMEOUT_MS);
    const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
    clearTimeout(killer);
    const trimmed = stdout.trim();
    if (!trimmed) return { error: `inference-failed: empty output (exit ${exitCode})` };
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return { error: 'inference-failed: no JSON in output' };
    const parsed = JSON.parse(match[0]) as Verdict;
    if (!parsed || typeof parsed.verdict !== 'string') return { error: 'inference-failed: verdict field missing' };
    return { verdict: parsed };
  } catch (e) {
    return { error: `inference-failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function runAudit(transcriptPath: string, sessionId: string): Promise<void> {
  const ts = getISOTimestamp();
  try {
    // Defense in depth: sessionId lands in a path join below; the hot path
    // validated it, but --audit is also invocable directly.
    if (!SESSION_ID_RE.test(sessionId)) {
      appendJsonl(AUDIT_LOG, { ts, session_id: 'invalid', audited: false, reason: 'bad-session-id' });
      return;
    }
    if (!existsSync(transcriptPath)) {
      appendJsonl(AUDIT_LOG, { ts, session_id: sessionId, audited: false, reason: 'transcript-missing' });
      return;
    }
    const records = await readTail(transcriptPath);
    const { text: promptText, index: promptIdx } = lastUserPrompt(records);
    const answerText = lastAssistantText(records);
    // Capability trace for the audited response (since the last user prompt).
    const capsSince = collectCaps(records, promptIdx >= 0 ? promptIdx : 0);
    // Session-wide (tail-window) trace — the zero-capability sweep reads this.
    const capsSession = collectCaps(records, 0);

    const now = Date.now();
    const trigger = decideTrigger({
      sessionId,
      caps: capsSession,
      lastPromptLen: promptText.length,
      now,
    });

    if (!trigger) {
      appendJsonl(AUDIT_LOG, { ts, session_id: sessionId, audited: false, reason: 'not-eligible' });
      return;
    }

    let systemPrompt: string;
    try { systemPrompt = readFileSync(PROMPT_PATH, 'utf-8'); }
    catch (e) {
      appendJsonl(AUDIT_LOG, { ts, session_id: sessionId, audited: false, reason: `prompt-read-failed: ${e instanceof Error ? e.message : String(e)}` });
      return;
    }

    const payload = buildAuditPayload({ promptGist: promptText, answerGist: answerText, caps: capsSince });
    const { verdict, error } = await runInference(systemPrompt, payload);

    if (!verdict) {
      appendJsonl(AUDIT_LOG, { ts, session_id: sessionId, audited: false, reason: error || 'inference-failed: unknown' });
      return;
    }

    appendJsonl(AUDIT_LOG, {
      ts,
      session_id: sessionId,
      audited: true,
      trigger,
      prompt_gist: promptText.slice(0, PROMPT_GIST_LOG),
      capabilities: { skills: capsSince.skills, agents: capsSince.agents, tool_calls: capsSince.tool_calls },
      verdict,
    });

    // Underspend with real confidence → mirror the capability-incidents schema.
    const confidence = typeof verdict.confidence === 'number' ? verdict.confidence : 0;
    if (verdict.verdict === 'underspend' && confidence >= 0.6) {
      const zeroCap = capsSince.skills.length + capsSince.agents.length === 0;
      appendJsonl(INCIDENTS_LOG, {
        ts,
        class: zeroCap ? 'zero-capability-inline' : 'underspend',
        slug: sessionId,
        ask: promptText.slice(0, PROMPT_GIST_LOG),
        should: verdict.expected,
        actual: verdict.actual,
        caught_by: 'spend-auditor',
        source: transcriptPath,
      });
    }
  } catch (e) {
    appendJsonl(AUDIT_LOG, { ts, session_id: sessionId, audited: false, reason: `audit-error: ${e instanceof Error ? e.message : String(e)}` });
  }
}

// ── Hot path (Stop event; deterministic, <20ms, always exit 0) ────────────────

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 2000);
    process.stdin.on('data', (c) => { data += c.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
  });
}

/** Rate-limit gate. Returns true (spawn allowed) and records the audit epoch, or
 *  false (skip — audited within the last 20 min). Prunes >48h entries. */
function shouldAudit(sessionId: string, now: number): boolean {
  const state = readJson<Record<string, number>>(STATE_PATH, {});
  for (const [id, epoch] of Object.entries(state)) {
    if (typeof epoch !== 'number' || now - epoch > PRUNE_MS) delete state[id];
  }
  const last = state[sessionId];
  const allow = typeof last !== 'number' || now - last >= RATE_LIMIT_MS;
  if (allow) state[sessionId] = now;
  try {
    mkdirSync(join(STATE_PATH, '..'), { recursive: true });
    writeFileSync(STATE_PATH, JSON.stringify(state));
  } catch { /* state is best-effort */ }
  return allow;
}

async function hotPath(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) return;
    const input = JSON.parse(raw) as HookInput;
    const sessionId = input.session_id || '';
    const transcriptPath = input.transcript_path || '';
    if (!transcriptPath || !sessionId || !SESSION_ID_RE.test(sessionId)) return;

    if (!shouldAudit(sessionId, Date.now())) return;

    Bun.spawn(
      [resolveBun(), import.meta.path, '--audit', transcriptPath, sessionId],
      { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' },
    ).unref();
  } catch { /* never block the session */ }
}

if (import.meta.main) {
  const auditIdx = process.argv.indexOf('--audit');
  if (auditIdx !== -1) {
    const transcriptPath = process.argv[auditIdx + 1] || '';
    const sessionId = process.argv[auditIdx + 2] || '';
    runAudit(transcriptPath, sessionId).finally(() => process.exit(0));
  } else {
    hotPath().finally(() => process.exit(0));
  }
}
