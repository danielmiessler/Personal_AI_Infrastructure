// File system types
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  mtime: string;
  extension: string | null;
}

export interface FileListResponse {
  entries: FileEntry[];
  path: string;
}

export interface FileReadResponse {
  content: string;
  mimeType: string;
  size: number;
  path: string;
}

export interface SearchResult {
  path: string;
  name: string;
  matches: string[];
  score: number;
}

// Chat/Session types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: string;
  isError?: boolean;
}

export interface Session {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  workingDirectory: string;
}

export interface SessionMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

// WebSocket message types
export interface WSClientMessage {
  type: 'chat' | 'abort' | 'resume';
  sessionId: string;
  payload: {
    message?: string;
    workingDirectory?: string;
    messageId?: string;
  };
}

export interface WSServerMessage {
  type: 'chunk' | 'tool_start' | 'tool_result' | 'complete' | 'error' | 'session_update';
  sessionId: string;
  payload: {
    text?: string;
    messageId?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    result?: string;
    isError?: boolean;
    usage?: { inputTokens: number; outputTokens: number };
    error?: string;
    code?: string;
  };
}

// Knowledge base types
export interface NoteMeta {
  path: string;
  name: string;
  folder: string;
  mtime: string;
  size: number;
}

export interface Note {
  path: string;
  name: string;
  content: string;
  frontmatter: Record<string, unknown>;
  wikiLinks: string[];
  backlinks: string[];
}
