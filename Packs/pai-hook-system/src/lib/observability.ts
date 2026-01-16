// observability.ts - Stub functions for hook observability integration
// These are no-ops until the observability system is actively running

export interface ObservabilityEvent {
  event_type: string;
  session_id?: string;
  source_app?: string;
  timestamp?: number;
  payload?: any;
  [key: string]: any;
}

/**
 * Send event to observability system (no-op if system not running)
 */
export async function sendEventToObservability(event: ObservabilityEvent): Promise<void> {
  // No-op: Observability system not currently running
  // Uncomment below to enable when observability server is active:
  // try {
  //   await fetch('http://localhost:4000/events', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(event)
  //   });
  // } catch (err) {
  //   // Silent fail - don't break hooks if observability is down
  // }
}

/**
 * Get current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * Get source application identifier
 */
export function getSourceApp(): string {
  return process.env.SOURCE_APP || 'main';
}
