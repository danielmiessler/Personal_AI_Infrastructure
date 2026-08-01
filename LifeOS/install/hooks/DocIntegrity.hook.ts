#!/usr/bin/env bun
/**
 * @version 1.4.0
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
 * HANDLERS: handlers/DocCrossRefIntegrity.ts, handlers/RebuildArchSummary.ts,
 *   handlers/MemoryDirIntegrity.ts, handlers/RebuildKnowledgeSchema.ts,
 *   handlers/KnowledgeConformance.ts — each isolated in its own try/catch so one
 *   failure never costs the others their pass.
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

  // Always runs. The old effort gate skipped the cross-ref scan at "e1 |
  // standard | low" — retired tier names that collide with the harness's LIVE
  // CLAUDE_EFFORT dial, so `/effort low` silently disabled this check
  // (Forge cross-vendor audit, 2026-07-24). Verification is not tier-scaled.
  try {
    await handleDocCrossRefIntegrity(parsed, input);
  } catch (err) {
    console.error('[DocIntegrity] Cross-ref handler failed:', err);
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
