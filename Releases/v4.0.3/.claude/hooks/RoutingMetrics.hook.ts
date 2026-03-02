#!/usr/bin/env bun
/**
 * RoutingMetrics.hook.ts — Correlate ComplexityRouter decisions with token usage
 *
 * PURPOSE:
 * Reads the pending-route-{session_id}.json written by ComplexityRouter at
 * UserPromptSubmit, then scans the transcript JSONL for the last assistant
 * message with token usage data, appending a correlated entry to
 * MEMORY/STATE/routing-metrics.jsonl.
 *
 * Phase 2: When OPUS routes spawn sub-agents, their token cost is harvested
 * from temporary signal files and included in the main session's metrics entry.
 *
 * TRIGGER: Stop
 *
 * HANDLER: handlers/RoutingMetrics.ts
 */

import { readHookInput } from './lib/hook-io';
import { handleRoutingMetrics } from './handlers/RoutingMetrics';

/**
 * Main session gate: skip sub-agents (they write their own signal files).
 * Subagents spawned via Task tool have CLAUDE_CODE_AGENT_TASK_ID set.
 */
function isMainSession(): boolean {
  return !process.env.CLAUDE_CODE_AGENT_TASK_ID;
}

async function main() {
  try {
    const input = await readHookInput();
    if (!input) { process.exit(0); }

    const mainSession = isMainSession();
    await handleRoutingMetrics(input.transcript_path, input.session_id, mainSession);
  } catch (error) {
    console.error('[RoutingMetrics.hook] Unexpected error:', error);
  }
  process.exit(0);
}

main();
