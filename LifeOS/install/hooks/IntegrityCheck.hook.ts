#!/usr/bin/env bun
/**
 * @version 1.3.10
 * IntegrityCheck.hook.ts - LifeOS Integrity Check (SessionEnd)
 *
 * Runs system integrity check — detects LifeOS system file changes, spawns background maintenance.
 * Doc cross-ref integrity is handled by DocIntegrity.hook.ts (SessionEnd event) to avoid double execution.
 *
 * TRIGGER: SessionEnd
 * PERFORMANCE: ~50ms (single transcript parse, one handler call). Non-blocking.
 */

import { parseTranscript } from '../LIFEOS/TOOLS/TranscriptParser';
import { handleSystemIntegrity } from './handlers/SystemIntegrity';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

async function readStdin(): Promise<HookInput | null> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  try {
    const decoder = new TextDecoder();
    reader = Bun.stdin.stream().getReader();
    let input = '';
    const timeout = new Promise<void>(r => setTimeout(r, 2000));
    const read = (async () => {
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();
    await Promise.race([read, timeout]);
    reader.cancel().catch(() => {});
    if (input.trim()) return JSON.parse(input) as HookInput;
  } catch {
    if (reader) reader.cancel().catch(() => {});
  }
  return null;
}

async function main() {
  const hookInput = await readStdin();
  if (!hookInput?.transcript_path) { process.exit(0); }

  const parsed = parseTranscript(hookInput.transcript_path);

  // Run system integrity check (doc cross-ref is handled by DocIntegrity.hook.ts)
  await handleSystemIntegrity(parsed, hookInput);

  // No context byte-budget check here by design: file size is a judgment call, not a metered
  // ceiling, and /trim runs on demand.

  process.exit(0);
}

main().catch(() => process.exit(0));
