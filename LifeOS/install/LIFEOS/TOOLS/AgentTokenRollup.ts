#!/usr/bin/env bun
/**
 * AgentTokenRollup.ts — per-agent token accounting for a session (2026-07-22).
 *
 * Closes the observability gap the 3-week execution audit named: subagent-events.jsonl
 * logs model + duration per dispatch but NOT tokens, so large general-purpose fan-outs
 * (34 agents in 180s on 2026-07-20; 31 on 07-16) can't be judged for waste — only
 * pattern-matched as suspicious. This reads the harness's own subagent transcripts
 * (projects/<slug>/subagents/agent-*.jsonl), which carry a real `usage` block per
 * assistant message, and sums tokens per agent + a session total.
 *
 * Read-only. Telemetry, not governance — no classifier, no threshold, no block. It
 * makes fan-out cost VISIBLE so judgment can be checked against data; it never gates.
 *
 * Usage:
 *   bun AgentTokenRollup.ts                 # newest session under projects/
 *   bun AgentTokenRollup.ts <session-uuid>  # a specific session
 *   bun AgentTokenRollup.ts --json          # machine-readable
 */

import { readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PROJECTS = join(homedir(), '.claude', 'projects');

interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}
interface AgentTotal {
  agent: string;
  model: string;
  messages: number;
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
  billable: number; // input + output + cache_creation (cache_read is discounted, tracked separately)
}

/** Find the session's subagents dir. A session UUID may live under any project slug. */
function findSubagentsDir(sessionId?: string): { dir: string; session: string } | null {
  if (!existsSync(PROJECTS)) return null;
  const candidates: { dir: string; session: string; mtime: number }[] = [];
  // Layout: projects/<cwd-slug>/<session-uuid>/subagents/agent-*.jsonl
  for (const proj of readdirSync(PROJECTS)) {
    const projDir = join(PROJECTS, proj);
    let sessions: string[] = [];
    try { sessions = readdirSync(projDir); } catch { continue; }
    for (const sess of sessions) {
      const subs = join(projDir, sess, 'subagents');
      if (!existsSync(subs)) continue;
      if (sessionId && sess === sessionId) return { dir: subs, session: sessionId };
      try { candidates.push({ dir: subs, session: sess, mtime: statSync(subs).mtimeMs }); } catch { /* skip */ }
    }
  }
  if (sessionId) return null;
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0] ? { dir: candidates[0].dir, session: candidates[0].session } : null;
}

function rollupAgent(path: string, agentId: string): AgentTotal {
  const t: AgentTotal = { agent: agentId, model: 'unknown', messages: 0, input: 0, output: 0, cache_read: 0, cache_creation: 0, billable: 0 };
  let text = '';
  try { text = require('fs').readFileSync(path, 'utf-8'); } catch { return t; }
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let rec: { message?: { model?: string; usage?: Usage } };
    try { rec = JSON.parse(line); } catch { continue; }
    const u = rec.message?.usage;
    if (!u) continue;
    t.messages += 1;
    if (rec.message?.model) t.model = rec.message.model;
    t.input += u.input_tokens ?? 0;
    t.output += u.output_tokens ?? 0;
    t.cache_read += u.cache_read_input_tokens ?? 0;
    t.cache_creation += u.cache_creation_input_tokens ?? 0;
  }
  t.billable = t.input + t.output + t.cache_creation;
  return t;
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const sessionArg = args.find(a => !a.startsWith('--'));

  const found = findSubagentsDir(sessionArg);
  if (!found) {
    console.error(sessionArg ? `No subagents dir for session ${sessionArg}` : 'No subagents dir found under projects/');
    process.exit(1);
  }

  const files = readdirSync(found.dir).filter(f => f.startsWith('agent-') && f.endsWith('.jsonl'));
  const totals = files
    .map(f => rollupAgent(join(found.dir, f), f.replace(/^agent-|\.jsonl$/g, '')))
    .filter(t => t.messages > 0)
    .sort((a, b) => b.billable - a.billable);

  const sum = totals.reduce((s, t) => ({
    billable: s.billable + t.billable,
    output: s.output + t.output,
    cache_read: s.cache_read + t.cache_read,
  }), { billable: 0, output: 0, cache_read: 0 });

  if (asJson) {
    console.log(JSON.stringify({ session: found.session, agents: totals.length, agent_totals: totals, session_billable: sum.billable, session_output: sum.output }, null, 2));
    return;
  }

  const k = (n: number) => (n / 1000).toFixed(1) + 'k';
  console.log(`\n  Agent token rollup — ${totals.length} agent(s) · session ${found.session.slice(0, 24)}\n`);
  console.log('  ' + 'agent'.padEnd(20) + 'model'.padEnd(22) + 'msgs'.padStart(5) + 'output'.padStart(9) + 'billable'.padStart(11));
  console.log('  ' + '─'.repeat(66));
  for (const t of totals.slice(0, 40)) {
    const model = t.model.replace(/^claude-|-\d{8}$/g, '').slice(0, 20);
    console.log('  ' + t.agent.slice(0, 18).padEnd(20) + model.padEnd(22) + String(t.messages).padStart(5) + k(t.output).padStart(9) + k(t.billable).padStart(11));
  }
  console.log('  ' + '─'.repeat(66));
  console.log('  ' + `SESSION TOTAL`.padEnd(47) + k(sum.output).padStart(9) + k(sum.billable).padStart(11));
  console.log(`  (billable = input + output + cache-creation; ${k(sum.cache_read)} cache-read discounted, not counted)\n`);
}

main();
