export interface ToolCall {
  name: string;
  input?: any;
  result?: string;
  isError?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export interface Session {
  id: string;
  name: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetail extends Session {
  messages: Message[];
}

export type WSMessageType =
  | 'connected'
  | 'chunk'
  | 'tool_start'
  | 'tool_result'
  | 'complete'
  | 'error'
  | 'system'
  | 'aborted';

export interface WSMessage {
  type: WSMessageType;
  sessionId?: string;
  timestamp?: string;
  payload?: any;
}
