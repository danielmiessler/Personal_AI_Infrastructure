#!/usr/bin/env bun
/**
 * StopOrchestrator.hook.ts - Single Entry Point for Stop Hooks
 *
 * PURPOSE:
 * Orchestrates all Stop event handlers by reading and parsing the transcript
 * ONCE, then distributing the parsed data to isolated handlers. This prevents
 * multiple redundant transcript reads and ensures data consistency.
 *
 * TRIGGER: Stop (fires after Claude generates a response)
 *
 * INPUT:
 * - session_id: Current session identifier
 * - transcript_path: Path to the JSONL transcript file
 * - hook_event_name: "Stop"
 *
 * OUTPUT:
 * - stdout: None (no context injection)
 * - exit(0): Normal completion
 *
 * SIDE EFFECTS:
 * - Voice handler: Announces completion via voice server
 * - Capture handler: Updates WORK/ directory with response
 * - TabState handler: Resets tab title/color to default
 * - SystemIntegrity handler: Detects PAI changes and spawns background maintenance
 *
 * INTER-HOOK RELATIONSHIPS:
 * - DEPENDS ON: UpdateTabTitle (expects tab to be in working state)
 * - COORDINATES WITH: AutoWorkCreation (updates work created by it)
 * - MUST RUN BEFORE: None
 * - MUST RUN AFTER: Claude's response generation
 *
 * HANDLERS (in hooks/handlers/):
 * - voice.ts: Extracts 🗣️ line, sends to voice server
 * - capture.ts: Updates current-work.json and WORK/ items
 * - tab-state.ts: Resets Kitty tab to default UL blue
 * - SystemIntegrity.ts: Detects PAI changes, spawns IntegrityMaintenance.ts
 *
 * ERROR HANDLING:
 * - Missing transcript: Exits gracefully
 * - Parse failures: Logged, exits gracefully
 * - Handler failures: Isolated via Promise.allSettled (one failure doesn't affect others)
 *
 * PERFORMANCE:
 * - Non-blocking: Yes
 * - Typical execution: <200ms
 * - Optimization: Single transcript read vs. 3+ separate reads
 *
 * ARCHITECTURE NOTES:
 * Before this orchestrator, each Stop handler read the transcript independently:
 * - 4 transcript reads → 1 (3x I/O reduction)
 * - Guaranteed consistency (all handlers see same data)
 * - Isolated failures (Promise.allSettled)
 */

import { parseTranscript } from '../skills/CORE/Tools/TranscriptParser';
import { handleVoice } from './handlers/voice';
import { handleCapture } from './handlers/capture';
import { handleTabState } from './handlers/tab-state';
import { handleSystemIntegrity } from './handlers/SystemIntegrity';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
}

async function readStdin(): Promise<HookInput | null> {
  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) {
      return JSON.parse(input) as HookInput;
    }
  } catch (error) {
    console.error('[StopOrchestrator] Error reading stdin:', error);
  }
  return null;
}

async function main() {
  const hookInput = await readStdin();

  if (!hookInput || !hookInput.transcript_path) {
    console.error('[StopOrchestrator] No transcript path provided');
    process.exit(0);
  }

  // SINGLE READ, SINGLE PARSE
  const parsed = parseTranscript(hookInput.transcript_path);

  console.error(`[StopOrchestrator] Parsed transcript: ${parsed.plainCompletion.slice(0, 50)}...`);

  // Run handlers with pre-parsed data (isolated failures)
  // TabState re-enabled with Bun.spawn() subprocess control for proper timeout/kill handling
  const results = await Promise.allSettled([
    handleVoice(parsed, hookInput.session_id),
    handleCapture(parsed, hookInput),
    handleTabState(parsed),  // Re-enabled: uses runWithTimeout() for subprocess control
    handleSystemIntegrity(parsed, hookInput),
  ]);

  // Log any failures
  const handlerNames = ['Voice', 'Capture', 'TabState', 'SystemIntegrity'];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[StopOrchestrator] ${handlerNames[index]} handler failed:`, result.reason);
    }
  });

  process.exit(0);
}

main().catch((error) => {
  console.error('[StopOrchestrator] Fatal error:', error);
  process.exit(0);
});
