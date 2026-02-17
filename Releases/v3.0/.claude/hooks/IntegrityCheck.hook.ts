#!/usr/bin/env bun
/**
 * IntegrityCheck.hook.ts - PAI Integrity Check (SessionEnd)
 *
 * Consolidates two concerns into one hook:
 * 1. System integrity — detects PAI system file changes, spawns background maintenance
 * 2. Doc cross-ref integrity — detects authoritative doc changes, checks for drift
 *
 * TRIGGER: SessionEnd
 * PERFORMANCE: ~50ms (single transcript parse, two handler calls). Non-blocking.
 */

import { parseTranscript } from '../skills/PAI/Tools/TranscriptParser';
import { handleSystemIntegrity } from './handlers/SystemIntegrity';
import { handleDocCrossRefIntegrity } from './handlers/DocCrossRefIntegrity';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

async function readStdin(): Promise<HookInput | null> {
  try {
    const input = await new Promise<string>((resolve) => {
      let data = '';
      const timer = setTimeout(() => resolve(data), 500);
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => { data += chunk; });
      process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
      process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
    });
    if (input.trim()) return JSON.parse(input) as HookInput;
  } catch {}
  return null;
}

async function main() {
  const hookInput = await readStdin();
  if (!hookInput?.transcript_path) { process.exit(0); }

  const parsed = parseTranscript(hookInput.transcript_path);

  // Run both handlers independently — one failing doesn't block the other
  await Promise.allSettled([
    handleSystemIntegrity(parsed, hookInput),
    handleDocCrossRefIntegrity(parsed, hookInput),
  ]);

  process.exit(0);
}

main().catch(() => process.exit(0));
