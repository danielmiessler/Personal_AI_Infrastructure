// $PAI_DIR/hooks/lib/observability.ts
// Sends hook events to observability dashboards

export interface ObservabilityEvent {
  source_app: string;
  session_id: string;
  hook_event_type: 'PreToolUse' | 'PostToolUse' | 'UserPromptSubmit' | 'Notification' | 'Stop' | 'SubagentStop' | 'SessionStart' | 'SessionEnd' | 'PreCompact';
  timestamp: string;
  transcript_path?: string;
  summary?: string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  agent_type?: string;
  model?: string;
  [key: string]: any;
}

/**
 * Send event to observability dashboard
 * Fails silently if dashboard is not running - doesn't block hook execution
 */
export async function sendEventToObservability(event: ObservabilityEvent): Promise<void> {
  const dashboardUrl = process.env.PAI_OBSERVABILITY_URL || 'http://localhost:4000/events';

  try {
    const response = await fetch(dashboardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PAI-Hook/1.0'
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      // Log error but don't throw - dashboard may be offline
      console.error(`Observability server returned status: ${response.status}`);
    }
  } catch (error) {
    // Fail silently - dashboard may not be running
    // This is intentional - hooks should never fail due to observability issues
  }
}

/**
 * Helper to get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Helper to get source app name from environment
 */
export function getSourceApp(): string {
  return process.env.PAI_SOURCE_APP || process.env.DA || 'PAI';
}
