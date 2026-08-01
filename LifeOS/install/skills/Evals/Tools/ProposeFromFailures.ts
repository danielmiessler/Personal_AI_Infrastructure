#!/usr/bin/env bun
/**
 * ProposeFromFailures — scans the failure streams and drafts regression eval
 * cases from BEHAVIORAL failures (Anthropic: seed from real failures).
 *
 * DISCRETIONARY: drafts only, to _drafts/, capped, deduped. A human graduates a
 * draft into a live suite. Auto-generation proposes; it never enacts.
 *
 * Signal selection is principled, not everything:
 *   - reflections `context_sufficient:false` — a behavioral failure (acted on too
 *     little context) that an eval CAN guard.
 *   - ask-fidelity asks not met, and `deferred` items — capability/behavioral gaps.
 *   - SKIPPED ON PURPOSE: `within_budget:false` spend breaks — a spend property is
 *     not a behavioral property one eval output can grade (the discretionary
 *     principle). The count skipped is printed, never silently dropped.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseArgs } from 'node:util';
import { stringify as toYaml } from 'yaml';
import { generate } from './GenerateCases.ts';

const ROOT = join(homedir(), '.claude');
const REFLECTIONS = join(ROOT, 'LIFEOS/MEMORY/LEARNING/REFLECTIONS/algorithm-reflections.jsonl');
const ASK_FIDELITY = join(ROOT, 'LIFEOS/MEMORY/OBSERVABILITY/ask-fidelity.jsonl');
const DRAFTS_DIR = join(ROOT, 'LIFEOS/USER/CUSTOMIZATIONS/SKILLS/Evals/Suites/_drafts');
const SEEN = join(DRAFTS_DIR, '.proposed-failures.json');

interface Failure { key: string; text: string }

function readJsonl(path: string, tail = 200): Record<string, unknown>[] {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf-8').trim().split('\n').slice(-tail);
  const out: Record<string, unknown>[] = [];
  for (const l of lines) { try { out.push(JSON.parse(l)); } catch { /* skip */ } }
  return out;
}

function collectFailures(): { failures: Failure[]; skippedSpend: number } {
  const failures: Failure[] = [];
  let skippedSpend = 0;

  for (const r of readJsonl(REFLECTIONS)) {
    if (r.within_budget === false) skippedSpend++; // behavioral eval can't grade spend — skip by design
    if (r.context_sufficient === false) {
      const notes = String(r.notes ?? '').slice(0, 300);
      failures.push({
        key: `ctx:${r.slug ?? String(r.notes ?? r.ts ?? '').slice(0, 40)}`,
        text: `The agent acted with insufficient context (context_sufficient=false). Session "${r.slug ?? ''}". Notes: ${notes || 'none'}. Guard: the agent should surface targeted questions or flag an assumption when critical context is missing, rather than proceeding.`,
      });
    }
  }

  for (const a of readJsonl(ASK_FIDELITY)) {
    const asks = Array.isArray(a.asks) ? (a.asks as Record<string, unknown>[]) : [];
    for (const ask of asks) {
      const status = String(ask.status ?? (ask.met === true ? 'met' : ask.met === false ? 'unmet' : ''));
      const passed = status === 'met' || /^✓|^✅/.test(status.trim());
      if (!passed && status && status !== 'met-as-proposals (human-gated skill boundary)') {
        failures.push({
          key: `ask:${a.session ?? a.ts}:${String(ask.ask).slice(0, 40)}`,
          text: `An explicit ask was not cleanly met (status: "${status}"). Ask: "${ask.ask}". Guard the behaviour so this ask class is handled directly next time.`,
        });
      }
    }
    const deferred = Array.isArray(a.deferred) ? (a.deferred as Record<string, unknown>[]) : [];
    for (const d of deferred) {
      failures.push({
        key: `def:${a.session ?? a.ts}:${String(d.item).slice(0, 40)}`,
        text: `Work was deferred: "${d.item}" — reason: "${d.reason}". If this reflects a recurring behavioural gap, guard it.`,
      });
    }
  }
  return { failures, skippedSpend };
}

if (import.meta.main) {
  const { values } = parseArgs({ args: Bun.argv.slice(2), options: { max: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help) {
    console.log('ProposeFromFailures — draft regression cases from behavioural failures (drafts only)\n\n  bun run ProposeFromFailures.ts [--max N]');
    process.exit(0);
  }
  const max = values.max ? parseInt(values.max) : 5;

  const { failures, skippedSpend } = collectFailures();
  const seen: string[] = existsSync(SEEN) ? JSON.parse(readFileSync(SEEN, 'utf-8')) : [];
  const fresh = failures.filter((f) => !seen.includes(f.key));

  console.log(`Found ${failures.length} behavioural failure signal(s); ${fresh.length} new. Skipped ${skippedSpend} spend-break(s) by design (not an eval-gradeable property).`);
  if (fresh.length === 0) { console.log('Nothing new to propose.'); process.exit(0); }

  mkdirSync(DRAFTS_DIR, { recursive: true });
  const toDraft = fresh.slice(0, max);
  if (fresh.length > max) console.log(`Capping at ${max}; ${fresh.length - max} more will surface next run.`);

  let drafted = 0;
  for (const f of toDraft) {
    const draft = await generate(f.text, 'failure');
    if (draft) {
      writeFileSync(join(DRAFTS_DIR, `${draft.id}.yaml`), `# DRAFT — auto-proposed from a real failure. Review before adding to a suite.\n# Source: ${f.key}\n` + toYaml({ cases: [draft] }));
      console.log(`  ✅ drafted ${draft.id}.yaml  ← ${f.key}`);
      drafted++;
    } else {
      console.log(`  ⚠️  could not draft from ${f.key}`);
    }
    seen.push(f.key);
  }
  writeFileSync(SEEN, JSON.stringify(seen, null, 2));
  console.log(`\n${drafted} draft(s) written to ${DRAFTS_DIR}. Review and graduate the good ones.`);
  process.exit(0);
}
