/**
 * RoutingMetrics.ts - Correlate ComplexityRouter decisions with actual token usage
 *
 * PURPOSE:
 * Reads the pending-route-{session_id}.json written by ComplexityRouter at UserPromptSubmit,
 * then scans the transcript JSONL for the last assistant message with token usage data,
 * appending a correlated entry to MEMORY/STATE/routing-metrics.jsonl.
 *
 * TRIGGER: Stop hook (via StopOrchestrator)
 *
 * INPUT:
 * - MEMORY/STATE/pending-route-{session_id}.json  (written by ComplexityRouter)
 * - transcript JSONL  (written by Claude Code)
 *
 * OUTPUT:
 * - MEMORY/STATE/routing-metrics.jsonl  (one entry per correlated prompt/response)
 *
 * ERROR HANDLING:
 * - Entire body wrapped in try/catch — never throws to StopOrchestrator
 * - Non-blocking: returns early if no pending-route file (no routing decision this cycle)
 */

import { readFileSync, appendFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { paiPath } from '../lib/paths';

const TAG = '[RoutingMetrics]';

interface RoutingSignal {
  timestamp: string;
  session_id: string;
  tier: string;
  prompt_chars: number;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  model?: string;
}

interface MetricsEntry {
  timestamp: string;
  session_id: string;
  tier: string;
  prompt_chars: number;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
}

/**
 * Scan transcript JSONL lines in reverse to find the last assistant message with usage data.
 */
function extractLastUsage(transcriptPath: string): TokenUsage | null {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    // Scan in reverse order — most recent assistant message first
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);

        // Format: { type: "assistant", message: { role: "assistant", usage: {...}, model: "..." } }
        if (entry.type === 'assistant' && entry.message?.role === 'assistant') {
          const usage = entry.message.usage;
          const model = entry.message.model;
          if (usage && typeof usage.input_tokens === 'number') {
            return {
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens ?? 0,
              cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
              model: model || 'unknown',
            };
          }
        }

        // Format: { role: "assistant", usage: {...} } (flat format)
        if (entry.role === 'assistant' && entry.usage && typeof entry.usage.input_tokens === 'number') {
          return {
            input_tokens: entry.usage.input_tokens,
            output_tokens: entry.usage.output_tokens ?? 0,
            cache_read_input_tokens: entry.usage.cache_read_input_tokens ?? 0,
            model: entry.model || 'unknown',
          };
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch (error) {
    console.error(`${TAG} Failed to read transcript: ${error}`);
  }
  return null;
}

export async function handleRoutingMetrics(transcriptPath: string, sessionId: string): Promise<void> {
  try {
    const stateDir = paiPath('MEMORY', 'STATE');
    const pendingFile = join(stateDir, `pending-route-${sessionId}.json`);
    const metricsFile = join(stateDir, 'routing-metrics.jsonl');

    // No routing decision this Stop cycle — nothing to correlate
    if (!existsSync(pendingFile)) {
      console.error(`${TAG} No pending-route file for session ${sessionId} — skipping`);
      return;
    }

    // Read and immediately delete the temp file (prevents double-counting on retries)
    let signal: RoutingSignal;
    try {
      signal = JSON.parse(readFileSync(pendingFile, 'utf-8')) as RoutingSignal;
      unlinkSync(pendingFile);
      console.error(`${TAG} Read and deleted pending-route-${sessionId}.json (tier: ${signal.tier})`);
    } catch (error) {
      console.error(`${TAG} Failed to read/delete pending-route file: ${error}`);
      return;
    }

    // Extract token usage from transcript
    const usage = extractLastUsage(transcriptPath);
    if (!usage) {
      console.error(`${TAG} No assistant usage found in transcript — skipping metrics write`);
      return;
    }

    // Build and append the correlated entry
    const entry: MetricsEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      tier: signal.tier,
      prompt_chars: signal.prompt_chars,
      model: usage.model || 'unknown',
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    };

    mkdirSync(stateDir, { recursive: true });
    appendFileSync(metricsFile, JSON.stringify(entry) + '\n');

    console.error(`${TAG} Appended metrics: tier=${entry.tier}, model=${entry.model}, in=${entry.input_tokens}, out=${entry.output_tokens}`);
  } catch (error) {
    console.error(`${TAG} Unexpected error: ${error}`);
    // Never throw — handler failures are isolated by StopOrchestrator's Promise.allSettled
  }
}
