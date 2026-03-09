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
import { buildRecoveryBlock } from './lib/recovery-block';

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
  let parsedAlgorithmState: { phase: string; effort: string; prd_path: string } | undefined;
  try {
    if (sessionId) {
      const statePath = paiPath('MEMORY', 'STATE', 'algorithms', `${sessionId}.json`);
      if (existsSync(statePath)) {
        const state = JSON.parse(readFileSync(statePath, 'utf-8'));
        if (state.active && state.phase) {
          parsedAlgorithmState = {
            phase: state.phase,
            effort: state.effort || 'standard',
            prd_path: state.prd_path || 'unknown',
          };
        }
      }
    }
  } catch {
    // State unavailable — skip
  }

  const recoveryBlock = buildRecoveryBlock({
    daName,
    principalName,
    timezone,
    algorithmState: parsedAlgorithmState,
  });

  console.log(JSON.stringify({ additionalContext: recoveryBlock }));
  console.error(`[PostCompactRecovery] Recovery context injected for session ${sessionId?.slice(0, 8) || 'unknown'}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[PostCompactRecovery] Error:', err);
  process.exit(0);
});
