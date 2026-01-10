// $PAI_DIR/observability/apps/server/src/types.ts

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export interface HookEvent {
  id?: number;
  source_app: string;
  session_id: string;
  agent_name?: string;
  hook_event_type: string;
  payload: Record<string, any>;
  summary?: string;
  timestamp?: number;
  todos?: TodoItem[];
  completedTodos?: TodoItem[];
}

export interface FilterOptions {
  source_apps: string[];
  session_ids: string[];
  hook_event_types: string[];
}
