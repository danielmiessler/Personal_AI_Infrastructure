#!/usr/bin/env bun
/**
 * GenerateCases — auto-drafts assertion-first eval cases from "things we care about"
 * (an operational rule, an identity disposition, a TELOS priority) or from a real
 * failure. Uses inference() to turn the source into a `{id, prompt, assert[]}` case.
 *
 * DISCRETIONARY BY DESIGN ({{PRINCIPAL_NAME}}, 2026-07-16): this NEVER writes into a live suite.
 * Drafts land in a _drafts/ staging dir for human review; a person decides what
 * graduates into a regression suite. Auto-generation proposes; it does not enact.
 *
 * Subscription-billed via Inference.ts. Modes:
 *   --from-rule "<text>"       a rule/disposition to guard
 *   --from-failure "<text>"    a real failure to prevent recurring
 *   --topic "<label>"          short id hint (optional)
 *   --run                      immediately dry-run the drafted case (dogfood)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parseArgs } from 'node:util';
import { stringify as toYaml } from 'yaml';
import { inference } from '../../../LIFEOS/TOOLS/Inference.ts';
import type { Assertion } from './Assertions.ts';

const DRAFTS_DIR = join(homedir(), '.claude', 'LIFEOS', 'USER', 'CUSTOMIZATIONS', 'SKILLS', 'Evals', 'Suites', '_drafts');

interface DraftCase {
  id: string;
  prompt: string;
  assert: Assertion[];
  negative?: boolean;
}

const AUTHOR_SYSTEM = `You author ONE assertion-first eval case that guards a behavioural property of an AI assistant.

Given a RULE or FAILURE, produce a realistic single-turn user PROMPT that would exercise it, plus ASSERTIONS that grade the assistant's OUTPUT (not its path — grade what it produced).

Available assert types:
- Deterministic (prefer when exact): equals, contains, icontains, contains-all, contains-any, regex, starts-with, ends-with, is-json, contains-json, max-length, min-length. Any takes a "not-" prefix to invert. Fields: {type, value, weight}.
- Model-graded (for nuance): llm-rubric {type, value:"<yes/no rubric question>", weight}, llm-assert {type, value:["<assertion>", ...], weight}.

Rules: 2-4 assertions, weighted for partial credit. Prefer a cheap deterministic assert plus a model-graded one. Make the prompt concrete and answerable in one message. Keep the rubric/assertion literal and objectively checkable.

Reason briefly, THEN emit exactly one fenced JSON block and nothing after:
\`\`\`json
{"id":"snake_case_id","prompt":"...","assert":[{"type":"...","value":"...","weight":1}]}
\`\`\``;

function extractJson(text: string): DraftCase | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    const j = JSON.parse(raw);
    if (j && typeof j.id === 'string' && typeof j.prompt === 'string' && Array.isArray(j.assert)) return j as DraftCase;
  } catch { /* fall through */ }
  return null;
}

export async function generate(source: string, kind: 'rule' | 'failure', topic?: string): Promise<DraftCase | null> {
  const res = await inference({
    systemPrompt: AUTHOR_SYSTEM,
    userPrompt: `## ${kind === 'rule' ? 'RULE / DISPOSITION TO GUARD' : 'FAILURE TO PREVENT'}\n${source}${topic ? `\n\n(id hint: ${topic})` : ''}`,
    level: 'high',
    timeout: 60_000,
  });
  if (!res.success) {
    console.error(`inference failed: ${res.error}`);
    return null;
  }
  return extractJson(res.output);
}

if (import.meta.main) {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      'from-rule': { type: 'string' },
      'from-failure': { type: 'string' },
      topic: { type: 'string' },
      run: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help || (!values['from-rule'] && !values['from-failure'])) {
    console.log(`GenerateCases — draft an eval case from a rule or failure (drafts only, human approves)\n\n  bun run GenerateCases.ts --from-rule "<text>" [--topic id] [--run]\n  bun run GenerateCases.ts --from-failure "<text>" [--run]`);
    process.exit(values.help ? 0 : 1);
  }

  const kind = values['from-rule'] ? 'rule' : 'failure';
  const source = (values['from-rule'] ?? values['from-failure'])!;
  console.log(`Drafting a case from ${kind}...\n`);
  const draft = await generate(source, kind, values.topic);
  if (!draft) {
    console.error('Could not produce a valid draft case.');
    process.exit(1);
  }

  mkdirSync(DRAFTS_DIR, { recursive: true });
  const file = join(DRAFTS_DIR, `${draft.id}.yaml`);
  writeFileSync(file, `# DRAFT — auto-generated from ${kind}. Review before adding to a suite.\n` + toYaml({ cases: [draft] }));
  console.log(`✅ Draft written: ${file}\n`);
  console.log(toYaml({ cases: [draft] }));

  if (values.run) {
    console.log('\n--- dry-run of the drafted case ---');
    const { runSuite } = await import('./EvalRunner.ts');
    // Wrap the single draft as an ephemeral suite via override.
    const r = await runSuite('__draft__', {
      name: '__draft__',
      type: 'capability',
      trials: 1,
      cases: [draft],
    } as never);
    console.log(`draft result: ${r.summary}`);
  }
  process.exit(0);
}
