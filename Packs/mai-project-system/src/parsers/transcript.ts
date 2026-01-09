/**
 * Transcript Parser
 *
 * Parses Claude Code conversation JSONL files.
 * Extracts tool calls, decisions, and other structured data.
 *
 * All operations are DETERMINISTIC - no LLM calls.
 */

export interface ToolCall {
  tool: string;
  params: Record<string, unknown>;
  result?: string;
  timestamp?: string;
}

export interface ParsedTranscript {
  toolCalls: ToolCall[];
  decisions: string[];
  messageCount: number;
  assistantMessages: string[];
  userMessages: string[];
}

/**
 * Decision detection patterns
 */
const DECISION_PATTERNS = [
  /decided to (.+)/i,
  /choosing (.+) because/i,
  /went with (.+)/i,
  /selected (.+) for/i,
  /using (.+) instead of/i,
  /opted for (.+)/i,
  /will use (.+)/i,
];

/**
 * Parse a JSONL transcript file
 */
export function parseTranscript(jsonlContent: string): ParsedTranscript {
  const lines = jsonlContent.trim().split('\n').filter(Boolean);
  const toolCalls: ToolCall[] = [];
  const decisions: string[] = [];
  const assistantMessages: string[] = [];
  const userMessages: string[] = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Extract tool calls
      if (entry.type === 'tool_use' || entry.tool) {
        toolCalls.push({
          tool: entry.tool || entry.name,
          params: entry.params || entry.input || {},
          result: entry.result,
          timestamp: entry.timestamp,
        });
      }

      // Extract assistant messages
      if (entry.type === 'assistant' && entry.content) {
        const content = typeof entry.content === 'string'
          ? entry.content
          : JSON.stringify(entry.content);
        assistantMessages.push(content);

        // Extract decisions (heuristic: look for decision-like patterns)
        for (const pattern of DECISION_PATTERNS) {
          const match = content.match(pattern);
          if (match) {
            decisions.push(match[0]);
          }
        }
      }

      // Extract user messages
      if (entry.type === 'user' && entry.content) {
        const content = typeof entry.content === 'string'
          ? entry.content
          : JSON.stringify(entry.content);
        userMessages.push(content);
      }
    } catch {
      // Skip malformed lines
    }
  }

  return {
    toolCalls,
    decisions: decisions.slice(-5), // Last 5 decisions
    messageCount: lines.length,
    assistantMessages,
    userMessages,
  };
}

/**
 * Get files modified in the transcript
 */
export function getModifiedFiles(transcript: ParsedTranscript): string[] {
  const files = new Set<string>();

  for (const call of transcript.toolCalls) {
    if (['Edit', 'Write', 'NotebookEdit'].includes(call.tool)) {
      const filePath = call.params.file_path || call.params.notebook_path;
      if (typeof filePath === 'string') {
        files.add(filePath);
      }
    }
  }

  return Array.from(files);
}

/**
 * Get files read in the transcript
 */
export function getReadFiles(transcript: ParsedTranscript): string[] {
  const files = new Set<string>();

  for (const call of transcript.toolCalls) {
    if (call.tool === 'Read') {
      const filePath = call.params.file_path;
      if (typeof filePath === 'string') {
        files.add(filePath);
      }
    }
  }

  return Array.from(files);
}

/**
 * Get tool usage summary
 */
export function getToolUsageSummary(transcript: ParsedTranscript): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const call of transcript.toolCalls) {
    summary[call.tool] = (summary[call.tool] || 0) + 1;
  }

  return summary;
}
