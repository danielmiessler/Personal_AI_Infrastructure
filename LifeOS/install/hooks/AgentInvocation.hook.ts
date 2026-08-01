#!/usr/bin/env bun
/**
 * @version 1.5.5
 * AgentInvocation.hook.ts — Agent (Task) subagent lifecycle tracker.
 *
 * v1.5.3 (2026-07-24): MODEL-CHECK ADVISORY REMOVED. v1.5.0 emitted a
 * PreToolUse advisory whenever a dispatch carried no model, citing the rule
 * "every Agent dispatch sets model explicitly." That rule is RETIRED
 * (OPERATIONAL_RULES § Model selection, 2026-07-11, restated 2026-07-24): the
 * saved /model value is the single dial, an omitted `model` INHERITS it, and
 * that inheritance IS the intended carrier — naming a model is what rots. The
 * same rule scopes this hook to observe-and-log with no injection, and stdout
 * from a PreToolUse hook is injection, so the advisory violated both halves.
 * This hook now emits nothing on stdout. Nothing injects a model at dispatch.
 *
 * v1.4.0 (2026-07-13): background/mailbox spawns detected at PostToolUse. The
 * harness's async Agent spawns return "Spawned successfully" immediately, so
 * PostToolUse fires at spawn time — the old code logged subagent_stop with
 * duration 0 and deleted the start record, making background agents invisible
 * to the statusline ACTIVE ladder ({{PRINCIPAL_NAME}} caught this live: an Opus dispatch
 * showed nothing). Now: a spawn-ack response logs subagent_spawned_async and
 * removes the start record; liveness for background agents comes from the
 * harness's own subagents/agent-*.jsonl transcript mtime (statusline reads it
 * directly — no hook bookkeeping can go stale).
 *
 * Claude Code's built-in SubagentStart/SubagentStop payloads do NOT include
 * subagent_type / description / prompt reliably — the prior tracker wrote
 * "unknown" for 5844 of 5846 historical events. This hook captures the data
 * at PreToolUse:Agent / PostToolUse:Agent where tool_input and tool_response
 * are present, and writes proper events to subagent-events.jsonl.
 *
 * THIS HOOK OBSERVES ONLY — it resolves and logs which model a dispatch carries
 * (cross-vendor > explicit param > frontmatter pin > inherited) and never mutates tool
 * input. Do not reintroduce model injection here. An injector that rewrites a no-model
 * dispatch to a rung depends on a tier signal, and when that signal goes away the injector
 * does not fail loudly — it silently flattens every dispatch to one rung, which is exactly
 * what happened before this hook was reduced to observation. Model selection is a
 * per-dispatch judgment; an unspecified model inherits the session model.
 * Earlier injection records remain in MEMORY/OBSERVABILITY/model-injections.jsonl.
 *
 * Wired in settings.json under:
 *   PreToolUse  matcher=Agent → subagent_start  (with real subagent_type)
 *   PostToolUse matcher=Agent → subagent_stop   (with duration)
 *
 * Correlation key: session_id + description (description is required by the
 * Agent tool). On PreToolUse we stash the start timestamp keyed by
 * session_id|description in subagent-starts.json; PostToolUse matches it back.
 */

import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { paiPath } from './lib/paths';
import { getISOTimestamp } from './lib/time';
import { EFFORT_MODEL, CROSS_VENDOR } from '../LIFEOS/TOOLS/models';

interface AgentToolInput {
  subagent_type?: string;
  description?: string;
  prompt?: string;
  model?: string;
}

/** Reverse-map a model alias/tier to its effort level via EFFORT_MODEL. */
function levelForModel(model: string): string {
  for (const [level, tier] of Object.entries(EFFORT_MODEL)) {
    if (tier === model) return level;
  }
  return 'custom';
}

/**
 * Resolve the dispatch's display level + model, mirroring the Agent tool's
 * precedence: cross-vendor engine > dispatch-time model param > agent
 * frontmatter pin > inherited from session.
 */
function resolveDispatch(subagentType: string, inputModel?: string): { model: string; level: string } {
  const cvKey = subagentType.charAt(0).toLowerCase() + subagentType.slice(1);
  if (CROSS_VENDOR[cvKey]) return { model: CROSS_VENDOR[cvKey], level: 'cross-vendor' };
  if (inputModel) return { model: inputModel, level: levelForModel(inputModel) };
  try {
    const fm = readFileSync(join(homedir(), '.claude', 'agents', `${subagentType}.md`), 'utf-8').slice(0, 4000);
    const m = fm.match(/^model:\s*(\S+)/m);
    if (m) return { model: m[1], level: `${levelForModel(m[1])}-pin` };
  } catch { /* no agent file — built-in type */ }
  return { model: 'inherited', level: 'session' };
}

interface ToolHookInput {
  session_id?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: AgentToolInput;
  tool_response?: unknown;
}

const OBS_DIR = paiPath('MEMORY', 'OBSERVABILITY');
const EVENTS_FILE = join(OBS_DIR, 'subagent-events.jsonl');
const STARTS_FILE = join(OBS_DIR, 'agent-starts.json');

type StartRecord = { epoch: number; timestamp: string; subagent_type: string; description: string; model?: string; level?: string };

function readStarts(): Record<string, StartRecord> {
  try {
    if (existsSync(STARTS_FILE)) return JSON.parse(readFileSync(STARTS_FILE, 'utf-8'));
  } catch { /* corrupted — reset */ }
  return {};
}

function writeStarts(starts: Record<string, StartRecord>) {
  writeFileSync(STARTS_FILE, JSON.stringify(starts, null, 2), 'utf-8');
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 2000);
    process.stdin.on('data', (c) => { data += c.toString(); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
  });
}

function correlationKey(sessionId: string, description: string): string {
  return `${sessionId}::${description}`;
}

async function main() {
  try {
    const raw = await readStdin();
    if (!raw.trim()) process.exit(0);

    const data: ToolHookInput = JSON.parse(raw);
    if (data.tool_name !== 'Agent') process.exit(0);

    const sessionId = data.session_id || 'unknown';
    const input = data.tool_input || {};
    const subagentType = input.subagent_type || 'general-purpose';
    const description = input.description || '(no description)';
    const prompt = input.prompt || '';
    const isPost = data.hook_event_name === 'PostToolUse';
    const key = correlationKey(sessionId, description);

    if (!existsSync(OBS_DIR)) mkdirSync(OBS_DIR, { recursive: true });

    if (!isPost) {
      const now = Date.now();
      const dispatch = resolveDispatch(subagentType, input.model);

      const starts = readStarts();
      starts[key] = {
        epoch: now,
        timestamp: getISOTimestamp(),
        subagent_type: subagentType,
        description,
        model: dispatch.model,
        level: dispatch.level,
      };
      writeStarts(starts);

      const event = {
        timestamp: getISOTimestamp(),
        event: 'subagent_start',
        session_id: sessionId,
        subagent_id: key,
        subagent_type: subagentType,
        subagent_model: dispatch.model,
        subagent_level: dispatch.level,
        description,
        prompt_preview: prompt.slice(0, 200),
      };
      appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf-8');
      console.error(`[AgentInvocation] START: ${subagentType} (${dispatch.level} → ${dispatch.model}) — ${description.slice(0, 48)}`);

      // Observe and log only — no advisory, no classifier, no tier rubric.
      // The saved /model value is the single dial; a dispatch that omits
      // `model` inherits it, which is the intended carrier (OPERATIONAL_RULES
      // § Model selection, 2026-07-11). The former explicit-model advisory
      // that lived here was removed when that rule was retired.
    } else {
      const starts = readStarts();
      const startRec = starts[key];
      let duration: number | null = null;
      if (startRec) {
        duration = Math.round((Date.now() - startRec.epoch) / 1000);
        delete starts[key];
        writeStarts(starts);
      }

      // Background/mailbox spawn: PostToolUse fires at spawn, not completion.
      // A duration-0 "stop" here is a lie — the agent is still running. Log the
      // async spawn; the statusline tracks its liveness from the harness's
      // subagents/agent-*.jsonl transcript mtime.
      const respStr = typeof data.tool_response === 'string'
        ? data.tool_response
        : JSON.stringify(data.tool_response ?? '');
      const isAsyncSpawn = /Spawned successfully|running and will receive instructions via mailbox/i.test(respStr);

      const event = {
        timestamp: getISOTimestamp(),
        event: isAsyncSpawn ? 'subagent_spawned_async' : 'subagent_stop',
        session_id: sessionId,
        subagent_id: key,
        subagent_type: subagentType,
        description,
        duration_seconds: isAsyncSpawn ? null : duration,
      };
      appendFileSync(EVENTS_FILE, JSON.stringify(event) + '\n', 'utf-8');
      console.error(`[AgentInvocation] ${isAsyncSpawn ? 'ASYNC-SPAWN' : 'STOP'}: ${subagentType} — ${description.slice(0, 48)}${isAsyncSpawn ? '' : ` (${duration ?? '?'}s)`}`);
    }
  } catch (e) {
    console.error('[AgentInvocation]', e instanceof Error ? e.message : String(e));
  }
  process.exit(0);
}

main();
