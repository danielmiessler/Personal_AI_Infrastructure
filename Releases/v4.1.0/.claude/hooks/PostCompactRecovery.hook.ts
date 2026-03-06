#!/usr/bin/env bun
/**
 * PostCompactRecovery.hook.ts — Re-inject context after context compaction
 *
 * TRIGGER: SessionStart (with source: 'compact')
 *
 * PURPOSE: After Claude Code compacts a long conversation, identity, behavioral
 * rules, and Algorithm state are summarized or dropped. This hook detects
 * compaction and re-injects ~1.5KB of critical context as additionalContext.
 *
 * WHAT IT INJECTS:
 * - DA name, principal name, timezone
 * - Current Algorithm format rules (which mode, current phase if mid-task)
 * - Top behavioral reminders from AISTEERINGRULES
 */

import { readHookInput } from './lib/hook-io';
import { getDAName, getPrincipalName, getPrincipal } from './lib/identity';
import { paiPath } from './lib/paths';
import { readFileSync, existsSync } from 'fs';

async function main() {
  const input = await readHookInput();
  if (!input) process.exit(0);

  // Only fire on compaction, not normal session start
  if ((input as any).source !== 'compact') process.exit(0);

  const daName = getDAName();
  const principalName = getPrincipalName();
  const timezone = getPrincipal().timezone;
  const sessionId = input.session_id;

  // Read current Algorithm phase if mid-task
  let algorithmState = '';
  try {
    if (sessionId) {
      const statePath = paiPath('MEMORY', 'STATE', 'algorithms', `${sessionId}.json`);
      if (existsSync(statePath)) {
        const state = JSON.parse(readFileSync(statePath, 'utf-8'));
        if (state.active && state.phase) {
          algorithmState = `\n**Current Algorithm state:** Phase: ${state.phase.toUpperCase()} | Effort: ${state.effort || 'standard'} | PRD: ${state.prd_path || 'unknown'}`;
        }
      }
    }
  } catch {
    // State unavailable — skip
  }

  const recoveryBlock = `## POST-COMPACTION CONTEXT RECOVERY

**You are ${daName}**, a Personal AI Infrastructure assistant.
**Principal:** ${principalName} | Timezone: ${timezone}
**Algorithm version:** v3.8.0${algorithmState}

**Response format (MANDATORY — restore after compaction):**
Every response MUST use exactly one mode:
- **ALGORITHM** — for multi-step, complex work (load PAI/Algorithm/v3.8.0.md and follow it)
- **NATIVE** — for simple single-step tasks
- **MINIMAL** — for greetings, ratings, acknowledgments

No freeform output. The format IS the context.

**Critical behavioral rules restored after compaction:**
1. ALGORITHM mode requires Read tool to load PAI/Algorithm/v3.8.0.md — then follow that file exactly
2. PRD is YOUR responsibility — edit it directly with Write/Edit tools at every phase transition
3. Capability selection creates a binding commitment — every selected capability MUST be invoked via Skill or Task tool
4. No phantom capabilities — selection without a tool call is a CRITICAL FAILURE
5. ISC Quality Gates QG1-QG7 must all pass before exiting OBSERVE phase

**If mid-Algorithm when compaction occurred:**
- Read \`MEMORY/STATE/algorithms/{session_id}.json\` for current phase and PRD path
- Resume from the recorded phase — do NOT restart from OBSERVE
- The PRD on disk is the source of truth for criteria status
- Use "Context Recovery" section in v3.8.0.md for full recovery procedure`;

  console.log(JSON.stringify({ additionalContext: recoveryBlock }));
  console.error(`[PostCompactRecovery] Recovery context injected for session ${sessionId?.slice(0, 8) || 'unknown'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[PostCompactRecovery] Error:', err);
  process.exit(0);
});
