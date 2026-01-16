export type HookEventType =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'SubagentStop'
  | 'Stop'
  | 'SessionEnd';

export interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: HookEventType;
  payload: Record<string, unknown>;
  timestamp: number;
  timestamp_pst: string;
}

export interface ObservabilityStats {
  activeAgents: number;
  totalEvents: number;
  toolCalls: number;
  sessions: number;
}

export interface AgentActivity {
  name: string;
  eventCount: number;
  lastSeen: number;
  color: string;
}

export interface WSObservabilityMessage {
  type: 'initial' | 'event';
  events?: HookEvent[];
  event?: HookEvent;
}
