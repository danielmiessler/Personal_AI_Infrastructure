#!/usr/bin/env bun
/**
 * UpdateCounts.hook.ts - System Counts Update (SessionEnd)
 *
 * PURPOSE:
 * Updates settings.json counts (skills, hooks, ratings, etc.) and refreshes
 * usage cache from Anthropic API. Runs at session end so banner/statusline
 * have fresh data next session.
 *
 * TRIGGER: SessionEnd
 * PERFORMANCE: ~1-2s (file counting + API calls). Non-blocking at session end.
 */

import { handleUpdateCounts } from './handlers/UpdateCounts';
import { isPaiModeActive } from './lib/paths';

async function main() {
  if (!isPaiModeActive()) process.exit(0);
  try {
    await handleUpdateCounts();
  } catch (err) {
    console.error('[UpdateCounts] Error:', err);
  }
  process.exit(0);
}

main();
