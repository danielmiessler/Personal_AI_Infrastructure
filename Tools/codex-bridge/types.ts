export type CodexLogLine = {
  timestamp?: string;
  type: string;
  payload?: any;
};

export type CodexMessage = {
  role: 'user' | 'assistant';
  text: string;
};

export type SessionState = {
  filePath: string;
  sessionId?: string;
  transcriptPath?: string;
  lastOffset: number;
  cwd?: string;
  buffer: string;
  started: boolean;
};
