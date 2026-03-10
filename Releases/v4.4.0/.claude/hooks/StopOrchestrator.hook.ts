#!/usr/bin/env bun
/**
 * StopOrchestrator.hook.ts - Single Entry Point for Stop Hooks
 *
 * PURPOSE:
 * Orchestrates all Stop event handlers by reading and parsing the transcript
 * ONCE, then distributing the parsed data to isolated handlers.
 *
 * TRIGGER: Stop (fires after Claude generates a response)
 *
 * HANDLERS (in hooks/handlers/):
 * - TabState.ts: Resets Kitty tab to default UL blue
 * - RebuildSkill.ts: Auto-rebuilds SKILL.md from Components/ if modified
 * - DocCrossRefIntegrity.ts: Checks if system docs/hooks were modified, updates cross-refs if so
 *
 * ERROR HANDLING:
 * - Handler failures: Isolated via Promise.allSettled
 *
 * PERFORMANCE:
 * - Non-blocking, typical execution: <100ms
 */

import { parseTranscript, extractVoiceCompletion, extractCompletionPlain, extractStructuredSections } from '../skills/PAI/Tools/TranscriptParser';
import type { ParsedTranscript } from '../skills/PAI/Tools/TranscriptParser';
import { handleTabState } from './handlers/TabState';
import { handleRebuildSkill } from './handlers/RebuildSkill';
import { handleAlgorithmEnrichment } from './handlers/AlgorithmEnrichment';
import { handleDocCrossRefIntegrity } from './handlers/DocCrossRefIntegrity';

interface HookInput {
  session_id: string;
  transcript_path: string;
  hook_event_name: string;
  /** Available in claude-code v2.1.47+. Eliminates transcript file I/O when present. */
  last_assistant_message?: string;
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

  // FAST PATH: use last_assistant_message directly (claude-code v2.1.47+)
  // Skips transcript file I/O and full JSONL parse — eliminates the main bottleneck.
  // SLOW PATH: fall back to parseTranscript() when field is absent (older claude-code).
  let parsed: ParsedTranscript;
  if (hookInput.last_assistant_message) {
    const text = hookInput.last_assistant_message;
    parsed = {
      raw: '',
      lastMessage: text,
      currentResponseText: text,
      voiceCompletion: extractVoiceCompletion(text),
      plainCompletion: extractCompletionPlain(text),
      structured: extractStructuredSections(text),
      responseState: 'completed', // AskUserQuestion state handled by SetQuestionTab PreToolUse hook
    };
    console.error(`[StopOrchestrator] Fast path (last_assistant_message): ${text.slice(0, 50)}...`);
  } else {
    // Wait for transcript to be fully written to disk
    await new Promise(resolve => setTimeout(resolve, 150));
    // SINGLE READ, SINGLE PARSE
    parsed = parseTranscript(hookInput.transcript_path);
    console.error(`[StopOrchestrator] Slow path (transcript parse): ${parsed.plainCompletion.slice(0, 50)}...`);
  }

  // Run handlers
  const handlers: Promise<void>[] = [
    handleTabState(parsed, hookInput.session_id),
    handleRebuildSkill(),
    handleAlgorithmEnrichment(parsed, hookInput.session_id),
    handleDocCrossRefIntegrity(parsed, hookInput),
  ];
  const handlerNames = ['TabState', 'RebuildSkill', 'AlgorithmEnrichment', 'DocCrossRefIntegrity'];

  const results = await Promise.allSettled(handlers);

  // Log any handler failures
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
