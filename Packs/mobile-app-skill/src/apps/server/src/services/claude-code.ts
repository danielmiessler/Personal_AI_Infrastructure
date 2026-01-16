import { spawn, type Subprocess } from 'bun';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: any;
  result?: string;
  isError?: boolean;
}

export interface StreamEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'system';
  content?: string;
  tool?: {
    name: string;
    input?: any;
    result?: string;
    isError?: boolean;
  };
  costUsd?: number;
  durationMs?: number;
  sessionId?: string;
}

type EventCallback = (event: StreamEvent) => void;

// Use full path to ensure we get the correct version
const CLAUDE_BINARY = process.env.HOME
  ? `${process.env.HOME}/.local/bin/claude`
  : 'claude';

export class ClaudeCodeService {
  private activeProcesses = new Map<string, Subprocess>();

  async streamChat(
    prompt: string,
    sessionId: string,
    onEvent: EventCallback,
    options: {
      continueSession?: boolean;
      resumeSessionId?: string;
      cwd?: string;
    } = {}
  ): Promise<void> {
    const args = [
      '-p', prompt,
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ];

    // Add session continuation if requested
    if (options.resumeSessionId) {
      args.push('--resume', options.resumeSessionId);
    } else if (options.continueSession) {
      args.push('--continue');
    }

    const cwd = options.cwd || process.env.HOME || '/';

    console.log(`[ClaudeCode] Starting chat in ${cwd}`);
    console.log(`[ClaudeCode] Args: ${CLAUDE_BINARY} ${args.join(' ')}`);

    const proc = spawn([CLAUDE_BINARY, ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        // Ensure we get clean JSON output
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      },
    });

    this.activeProcesses.set(sessionId, proc);

    let buffer = '';

    // Read stdout stream
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete JSON lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line);
            const streamEvent = this.parseClaudeEvent(event);
            if (streamEvent) {
              onEvent(streamEvent);
            }
          } catch (e) {
            // Non-JSON line, might be debug output
            console.log(`[ClaudeCode] Non-JSON output: ${line}`);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer);
          const streamEvent = this.parseClaudeEvent(event);
          if (streamEvent) {
            onEvent(streamEvent);
          }
        } catch (e) {
          console.log(`[ClaudeCode] Final non-JSON: ${buffer}`);
        }
      }

      // Wait for process to complete
      const exitCode = await proc.exited;
      console.log(`[ClaudeCode] Process exited with code ${exitCode}`);

      if (exitCode !== 0) {
        // Read stderr for error info
        const stderrReader = proc.stderr.getReader();
        let stderrText = '';
        while (true) {
          const { done, value } = await stderrReader.read();
          if (done) break;
          stderrText += decoder.decode(value, { stream: true });
        }
        if (stderrText) {
          console.error(`[ClaudeCode] Stderr: ${stderrText}`);
          onEvent({ type: 'error', content: stderrText });
        }
      }
    } catch (err) {
      console.error('[ClaudeCode] Stream error:', err);
      onEvent({ type: 'error', content: String(err) });
    } finally {
      this.activeProcesses.delete(sessionId);
    }
  }

  private parseClaudeEvent(event: any): StreamEvent | null {
    // Handle different event types from claude --output-format stream-json
    // The format includes: init, assistant, user, result messages

    if (event.type === 'assistant') {
      // Assistant message with content blocks
      if (event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text') {
            return { type: 'text', content: block.text };
          }
          if (block.type === 'tool_use') {
            return {
              type: 'tool_use',
              tool: {
                name: block.name,
                input: block.input,
              },
            };
          }
          if (block.type === 'tool_result') {
            return {
              type: 'tool_result',
              tool: {
                name: '',
                result: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
                isError: block.is_error,
              },
            };
          }
        }
      }
    }

    if (event.type === 'content_block_delta') {
      // Streaming text delta
      if (event.delta?.type === 'text_delta') {
        return { type: 'text', content: event.delta.text };
      }
    }

    if (event.type === 'result') {
      // Final result with usage stats
      return {
        type: 'result',
        costUsd: event.cost_usd,
        durationMs: event.duration_ms,
        sessionId: event.session_id,
      };
    }

    if (event.type === 'system') {
      return { type: 'system', content: event.message };
    }

    // Log unhandled events for debugging
    if (event.type && !['init', 'user'].includes(event.type)) {
      console.log(`[ClaudeCode] Unhandled event type: ${event.type}`, JSON.stringify(event).slice(0, 200));
    }

    return null;
  }

  abort(sessionId: string): boolean {
    const proc = this.activeProcesses.get(sessionId);
    if (proc) {
      proc.kill();
      this.activeProcesses.delete(sessionId);
      return true;
    }
    return false;
  }

  isActive(sessionId: string): boolean {
    return this.activeProcesses.has(sessionId);
  }
}

// Singleton instance
export const claudeCodeService = new ClaudeCodeService();
