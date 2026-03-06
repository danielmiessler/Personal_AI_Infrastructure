/**
 * hook-error-emitter.ts — Emit hook.error events when hooks fail silently
 *
 * All PAI hooks are fail-open (catch errors, exit 0). This means failures
 * are invisible. This utility emits a hook.error event to events.jsonl
 * so failures surface in telemetry.
 */

import { appendEvent } from './event-emitter';

export function emitHookError(hookName: string, error: unknown): void {
  try {
    appendEvent({
      type: 'hook.error',
      source: hookName,
      hook_name: hookName,
      error: error instanceof Error ? error.message : String(error),
    });
  } catch {
    // Fail-open: never block on error tracking
  }
}
