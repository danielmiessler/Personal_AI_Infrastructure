/**
 * ============================================================================
 * TRACE EMITTER - Theory of Mind Capture System
 * ============================================================================
 *
 * PURPOSE:
 * Captures granular decision traces per-task, enabling retrospective analysis
 * of how THE ALGORITHM made decisions. This is the "theory of mind" layer
 * that allows us to understand and improve the algorithm by looking backwards.
 *
 * INTEGRATION:
 * - All hooks import and use this library to emit events
 * - Events append to Work/[task]/TRACE.jsonl
 * - Nightly synthesis extracts patterns for system-level learning
 *
 * EVENT TYPES:
 * - hook_start/hook_end: Hook lifecycle with duration
 * - ai_call: Any AI model invocation (Haiku classifier, etc.)
 * - decision: Explicit decision point with inputs/outputs
 * - reasoning: Free-form reasoning chain
 * - state_change: Phase transitions, status updates
 * - tool_use: Tool execution summary
 * - failure: Captured failure with context
 * - loopback: Algorithm looped back to earlier phase
 * - user_signal: User feedback (rating, interruption)
 *
 * SAFETY:
 * - Atomic appends with size rotation (1MB per file)
 * - Fail-open design (never blocks on trace errors)
 * - No sensitive data in traces (prompts truncated)
 *
 * ============================================================================
 */

import { appendFileSync, existsSync, statSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { findActiveWorkDir, type AlgorithmPhase } from './work-utils';

// DEBUG flag
const DEBUG = process.env.DEBUG_HOOKS === 'true';

// Maximum size before rotation (1MB)
const MAX_TRACE_SIZE = 1_000_000;

// Maximum preview length for prompts (avoid leaking full content)
const MAX_PREVIEW_LENGTH = 200;

/**
 * Trace event types
 */
export type TraceEventType =
  | 'hook_start'      // Hook activation
  | 'hook_end'        // Hook completion
  | 'ai_call'         // Any AI invocation (classifier, summarizer)
  | 'decision'        // Decision point with inputs/outputs
  | 'reasoning'       // Free-form reasoning chain
  | 'state_change'    // Phase transition, status update
  | 'tool_use'        // Tool execution summary
  | 'failure'         // Captured failure with context
  | 'loopback'        // Algorithm looped back to earlier phase
  | 'user_signal';    // User feedback (rating, interruption)

/**
 * Base trace event structure
 */
export interface TraceEvent {
  ts: string;                    // ISO timestamp with ms precision
  type: TraceEventType;          // Event type
  hook?: string;                 // Hook name if hook-related
  phase?: AlgorithmPhase;        // Current algorithm phase
  data: Record<string, any>;     // Type-specific payload
  duration_ms?: number;          // Execution time if measurable
}

/**
 * Module-level state for current work directory
 * This is set by hooks at startup and used for all emissions
 */
let currentWorkDir: string | null = null;

/**
 * Set the active work directory for trace emissions
 * Called at hook startup after finding/creating work item
 */
export function setWorkDir(dir: string): void {
  currentWorkDir = dir;
  if (DEBUG) console.error('[TraceEmitter] Work dir set:', dir);
}

/**
 * Get the current work directory (auto-detect if not set)
 */
export function getWorkDir(): string | null {
  if (currentWorkDir) return currentWorkDir;

  // Auto-detect from active work
  const detected = findActiveWorkDir();
  if (detected) {
    currentWorkDir = detected;
    if (DEBUG) console.error('[TraceEmitter] Auto-detected work dir:', detected);
  }
  return currentWorkDir;
}

/**
 * Get the TRACE.jsonl path for current work directory
 */
function getTracePath(): string | null {
  const workDir = getWorkDir();
  if (!workDir) return null;
  return join(workDir, 'TRACE.jsonl');
}

/**
 * Rotate trace file if it exceeds size limit
 */
function rotateIfNeeded(tracePath: string): void {
  try {
    if (!existsSync(tracePath)) return;

    const stats = statSync(tracePath);
    if (stats.size > MAX_TRACE_SIZE) {
      const archivePath = join(
        dirname(tracePath),
        `TRACE-${Date.now()}.jsonl`
      );
      renameSync(tracePath, archivePath);
      if (DEBUG) console.error('[TraceEmitter] Rotated trace to:', archivePath);
    }
  } catch (e) {
    if (DEBUG) console.error('[TraceEmitter] Rotation check failed:', e);
  }
}

/**
 * Core emit function - appends event to TRACE.jsonl
 * Fail-open design: never throws, never blocks
 */
export function emit(event: Omit<TraceEvent, 'ts'>): void {
  const tracePath = getTracePath();
  if (!tracePath) {
    if (DEBUG) console.error('[TraceEmitter] No work dir, skipping emit');
    return;
  }

  const fullEvent: TraceEvent = {
    ts: new Date().toISOString(),
    ...event
  };

  try {
    // Ensure directory exists
    const dir = dirname(tracePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Check for rotation
    rotateIfNeeded(tracePath);

    // Atomic append
    appendFileSync(tracePath, JSON.stringify(fullEvent) + '\n');

    if (DEBUG) console.error('[TraceEmitter] Emitted:', event.type, event.hook || '');
  } catch (e) {
    // Fail open - log but don't crash
    if (DEBUG) console.error('[TraceEmitter] Write failed:', e);
  }
}

// ============================================================================
// Convenience Functions for Common Event Types
// ============================================================================

/**
 * Emit hook_start event
 * Call at the beginning of any hook's main function
 */
export function emitHookStart(
  hookName: string,
  trigger: string,
  data?: Record<string, any>
): void {
  emit({
    type: 'hook_start',
    hook: hookName,
    data: { trigger, ...data }
  });
}

/**
 * Emit hook_end event
 * Call at the end of any hook's main function (in finally block)
 */
export function emitHookEnd(hookName: string, durationMs: number): void {
  emit({
    type: 'hook_end',
    hook: hookName,
    duration_ms: durationMs,
    data: {}
  });
}

/**
 * Emit decision event
 * Call at any explicit decision point (classifier output, routing decision)
 */
export function emitDecision(
  hookName: string,
  input: any,
  output: any,
  confidence?: number
): void {
  emit({
    type: 'decision',
    hook: hookName,
    data: {
      input: typeof input === 'string'
        ? input.slice(0, MAX_PREVIEW_LENGTH)
        : input,
      output,
      ...(confidence !== undefined && { confidence })
    }
  });
}

/**
 * Emit ai_call event
 * Call after any AI model invocation
 */
export function emitAiCall(
  hookName: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  durationMs: number
): void {
  emit({
    type: 'ai_call',
    hook: hookName,
    data: {
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut
    },
    duration_ms: durationMs
  });
}

/**
 * Emit reasoning event
 * Call to capture free-form reasoning chains
 */
export function emitReasoning(phase: AlgorithmPhase, content: string): void {
  emit({
    type: 'reasoning',
    phase,
    data: {
      content: content.slice(0, 1000)  // Cap reasoning length
    }
  });
}

/**
 * Emit state_change event
 * Call on phase transitions or status updates
 */
export function emitStateChange(
  phase: AlgorithmPhase,
  from: string,
  to: string,
  trigger?: string
): void {
  emit({
    type: 'state_change',
    phase,
    data: { from, to, ...(trigger && { trigger }) }
  });
}

/**
 * Emit tool_use event
 * Call after significant tool executions
 */
export function emitToolUse(
  toolName: string,
  summary: Record<string, any>
): void {
  emit({
    type: 'tool_use',
    data: {
      tool: toolName,
      ...summary
    }
  });
}

/**
 * Emit failure event
 * Call when capturing any failure condition
 */
export function emitFailure(
  phase: AlgorithmPhase,
  error: string,
  context?: Record<string, any>
): void {
  emit({
    type: 'failure',
    phase,
    data: {
      error,
      ...(context && { context })
    }
  });
}

/**
 * Emit loopback event
 * Call when algorithm loops back to earlier phase
 */
export function emitLoopback(
  from: AlgorithmPhase,
  to: AlgorithmPhase,
  reason: string
): void {
  emit({
    type: 'loopback',
    data: { from, to, reason }
  });
}

/**
 * Emit user_signal event
 * Call when capturing user feedback or interruption
 */
export function emitUserSignal(
  signalType: string,
  content: any
): void {
  emit({
    type: 'user_signal',
    data: {
      type: signalType,
      content: typeof content === 'string'
        ? content.slice(0, MAX_PREVIEW_LENGTH)
        : content
    }
  });
}

/**
 * Higher-order function to wrap a hook with trace instrumentation
 * Automatically emits hook_start and hook_end events
 */
export function withTracing<T>(
  hookName: string,
  trigger: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  emitHookStart(hookName, trigger);

  return fn()
    .finally(() => {
      emitHookEnd(hookName, Date.now() - startTime);
    });
}
