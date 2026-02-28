/**
 * RoutingMetrics.ts - Correlate ComplexityRouter decisions with actual token usage
 *
 * PURPOSE:
 * Reads the pending-route-{session_id}.json written by ComplexityRouter at UserPromptSubmit,
 * then scans the transcript JSONL for the last assistant message with token usage data,
 * appending a correlated entry to MEMORY/STATE/routing-metrics.jsonl.
 *
 * Phase 2: Sub-agent token harvesting.
 * - Sub-agent Stop (isMainSession=false): writes subagent-tokens-{sessionId}.json
 * - Main session Stop (isMainSession=true): harvests sub-agent signals and includes in entry
 *
 * TRIGGER: Stop hook (via StopOrchestrator)
 *
 * INPUT:
 * - MEMORY/STATE/pending-route-{session_id}.json  (written by ComplexityRouter)
 * - transcript JSONL  (written by Claude Code)
 * - MEMORY/STATE/subagent-tokens-*.json  (written by sub-agent Stop cycles)
 *
 * OUTPUT:
 * - MEMORY/STATE/routing-metrics.jsonl  (one entry per correlated prompt/response)
 * - MEMORY/STATE/subagent-tokens-{sessionId}.json  (sub-agent cycles only)
 *
 * ERROR HANDLING:
 * - Entire body wrapped in try/catch — never throws to StopOrchestrator
 * - Non-blocking: returns early if no pending-route file (no routing decision this cycle)
 */

import {
  readFileSync,
  appendFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
} from 'fs';
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

interface SubagentSignal {
  timestamp: string;
  session_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
}

interface HarvestResult {
  input: number;
  output: number;
  cache: number;
  models: string[];
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
  // Phase 2: sub-agent fields (optional — additive, backwards compatible)
  sub_input_tokens?: number;
  sub_output_tokens?: number;
  sub_cache_tokens?: number;
  sub_models?: string[];
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

/**
 * Write a sub-agent token signal file for later harvest by the main session.
 * Called when isMainSession=false and we have transcript token data.
 */
function writeSubagentSignal(stateDir: string, sessionId: string, usage: TokenUsage): void {
  try {
    const signal: SubagentSignal = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      model: usage.model || 'unknown',
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    };
    const signalFile = join(stateDir, `subagent-tokens-${sessionId}.json`);
    writeFileSync(signalFile, JSON.stringify(signal));
    console.error(`${TAG} Wrote sub-agent signal: ${signalFile}`);
  } catch (error) {
    console.error(`${TAG} Failed to write sub-agent signal: ${error}`);
  }
}

/**
 * Harvest sub-agent token signals from MEMORY/STATE/.
 * Collects files with timestamp > since, deletes them, and cleans orphans > 1hr old.
 */
function harvestSubagentTokens(stateDir: string, since: Date): HarvestResult {
  const result: HarvestResult = { input: 0, output: 0, cache: 0, models: [] };

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const files = readdirSync(stateDir).filter(
      f => f.startsWith('subagent-tokens-') && f.endsWith('.json'),
    );

    for (const file of files) {
      const filePath = join(stateDir, file);
      try {
        const signal = JSON.parse(readFileSync(filePath, 'utf-8')) as SubagentSignal;
        const signalTime = new Date(signal.timestamp);

        if (signalTime > since && signalTime < now) {
          // Within harvest window — collect and delete
          result.input += signal.input_tokens;
          result.output += signal.output_tokens;
          result.cache += signal.cache_read_input_tokens;
          result.models.push(signal.model);
          unlinkSync(filePath);
          console.error(`${TAG} Harvested and deleted: ${file}`);
        } else if (signalTime < oneHourAgo) {
          // Orphaned — clean up to prevent accumulation
          unlinkSync(filePath);
          console.error(`${TAG} Cleaned up orphaned file (>1hr old): ${file}`);
        }
        // Files outside harvest window but recent are left alone (could be concurrent session)
      } catch (error) {
        console.error(`${TAG} Failed to process sub-agent signal ${file}: ${error}`);
      }
    }
  } catch (error) {
    console.error(`${TAG} Failed to harvest sub-agent tokens: ${error}`);
  }

  return result;
}

export async function handleRoutingMetrics(
  transcriptPath: string,
  sessionId: string,
  isMainSession: boolean,
): Promise<void> {
  try {
    const stateDir = paiPath('MEMORY', 'STATE');

    // Sub-agent Stop: write signal file for main session to harvest — no metrics entry written
    if (!isMainSession) {
      const usage = extractLastUsage(transcriptPath);
      if (usage) {
        writeSubagentSignal(stateDir, sessionId, usage);
        console.error(`${TAG} Sub-agent signal written for session ${sessionId}`);
      } else {
        console.error(`${TAG} Sub-agent: no token usage found in transcript — skipping`);
      }
      return;
    }

    // Main session Stop: correlate routing decision with token usage
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

    // Extract token usage from main session transcript
    const usage = extractLastUsage(transcriptPath);
    if (!usage) {
      console.error(`${TAG} No assistant usage found in transcript — skipping metrics write`);
      return;
    }

    // Harvest sub-agent tokens from this session's window
    const signalTime = new Date(signal.timestamp);
    const subAgentData = harvestSubagentTokens(stateDir, signalTime);
    const hasSubAgents = subAgentData.input > 0 || subAgentData.output > 0;

    // Build the correlated entry
    const entry: MetricsEntry = {
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      tier: signal.tier,
      prompt_chars: signal.prompt_chars,
      model: usage.model || 'unknown',
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      ...(hasSubAgents && {
        sub_input_tokens: subAgentData.input,
        sub_output_tokens: subAgentData.output,
        sub_cache_tokens: subAgentData.cache,
        sub_models: subAgentData.models,
      }),
    };

    mkdirSync(stateDir, { recursive: true });
    appendFileSync(metricsFile, JSON.stringify(entry) + '\n');

    const subInfo = hasSubAgents ? `, sub_in=${subAgentData.input}, sub_models=[${subAgentData.models.join(',')}]` : '';
    console.error(`${TAG} Appended metrics: tier=${entry.tier}, model=${entry.model}, in=${entry.input_tokens}, out=${entry.output_tokens}${subInfo}`);
  } catch (error) {
    console.error(`${TAG} Unexpected error: ${error}`);
    // Never throw — handler failures are isolated by StopOrchestrator's Promise.allSettled
  }
}
