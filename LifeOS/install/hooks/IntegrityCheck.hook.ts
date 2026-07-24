#!/usr/bin/env bun
/**
 * @version 1.3.7
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

  // Always-on context budget: surface red at session boundary (2026-07-11, R3).
  // BudgetCheck --quiet prints only on violation; --cache refreshes the statusline
  // summary. A red here is the enforcement nag behind the passive monitor — the
  // ignored-red-flag failure mode (PROJECTS.md sat over-cap unnoticed) dies here.
  try {
    const tool = `${import.meta.dir}/../LIFEOS/TOOLS/BudgetCheck.ts`;
    // NOTE: --cache exits before the violation print, so it must be a separate call.
    const budget = Bun.spawnSync(['bun', tool, '--quiet'], { timeout: 5000 });
    const out = budget.stdout?.toString().trim();
    if (budget.exitCode !== 0 && out) {
      console.error(`[IntegrityCheck] ALWAYS-ON CONTEXT OVER BUDGET:\n${out}\n→ run /trim on the offending file, or raise its budget in context-budgets.json (git-recorded decision).`);
    }
    Bun.spawnSync(['bun', tool, '--cache', '--quiet'], { timeout: 5000 }); // statusline summary refresh
  } catch { /* budget surfacing is best-effort, never blocks session end */ }

  process.exit(0);
}

main().catch(() => process.exit(0));
