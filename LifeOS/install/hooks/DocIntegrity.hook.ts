#!/usr/bin/env bun
/**
 * @version 1.3.2
 * DocIntegrity.hook.ts — Check cross-refs if system docs/hooks were modified
 *
 * PURPOSE:
 * Runs deterministic + inference-powered doc integrity checks when system
 * files (hooks, LifeOS docs, skills, components) were modified during the session.
 * Self-gating: returns instantly when no system files changed.
 *
 * TRIGGER: SessionEnd
 *
 * NEEDS TRANSCRIPT: Yes (to detect which files were modified via tool_use entries)
 *
 * HANDLER: handlers/DocCrossRefIntegrity.ts
 */

import { readHookInput, parseTranscriptFromInput } from './lib/hook-io';
import { handleDocCrossRefIntegrity } from './handlers/DocCrossRefIntegrity';
import { handleRebuildArchSummary } from './handlers/RebuildArchSummary';
import { handleMemoryDirIntegrity } from './handlers/MemoryDirIntegrity';
import { handleRebuildKnowledgeSchema } from './handlers/RebuildKnowledgeSchema';
import { handleKnowledgeConformance } from './handlers/KnowledgeConformance';

async function main() {
  const input = await readHookInput();
  if (!input) { process.exit(0); }

  const parsed = await parseTranscriptFromInput(input);

  // Effort-aware gating (v6.3.0 — Anthropic CC v2.1.133 surfaces effort.level on hook input).
  // E1/standard tasks rarely touch doctrine files — skip the cross-ref scan.
  // Arch-summary + memory-dir integrity still run (cheap, useful at all tiers).
  // Default-conservative: when effort is undefined, run everything.
  const effort = (input.effort?.level ?? process.env.CLAUDE_EFFORT ?? '').toLowerCase();
  const isE1 = effort === 'e1' || effort === 'standard' || effort === 'low';

  if (!effort) {
    console.error('[DocIntegrity] effort undetermined — running full work (default-conservative).');
  }

  if (!isE1) {
    try {
      await handleDocCrossRefIntegrity(parsed, input);
    } catch (err) {
      console.error('[DocIntegrity] Cross-ref handler failed:', err);
    }
  } else {
    console.error('[DocIntegrity] Cross-ref scan skipped: effort=' + effort);
  }

  try {
    await handleRebuildArchSummary();
  } catch (err) {
    console.error('[DocIntegrity] Arch-summary handler failed:', err);
  }

  try {
    await handleMemoryDirIntegrity();
  } catch (err) {
    console.error('[DocIntegrity] Memory-dir handler failed:', err);
  }

  try {
    await handleRebuildKnowledgeSchema();
  } catch (err) {
    console.error('[DocIntegrity] Knowledge-schema regen failed:', err);
  }

  try {
    await handleKnowledgeConformance();
  } catch (err) {
    console.error('[DocIntegrity] Knowledge-conformance check failed:', err);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[DocIntegrity] Fatal:', err);
  process.exit(0);
});
