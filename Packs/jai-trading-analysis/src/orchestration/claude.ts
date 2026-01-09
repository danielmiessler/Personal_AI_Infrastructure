/**
 * Orchestration Module - Claude Code Integration
 *
 * Provides integration with Claude Code CLI for AI-powered analysis
 * and decision support.
 */

import { spawn } from 'child_process';
import type { ClaudeRequest, ClaudeResponse } from './types';

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when Claude Code invocation fails.
 */
export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'ClaudeError';
  }
}

// ============================================================================
// Claude Orchestrator
// ============================================================================

/**
 * Orchestrates interactions with Claude Code CLI.
 *
 * Uses `claude --print` to invoke Claude and get responses without
 * entering interactive mode.
 */
export class ClaudeOrchestrator {
  private readonly claudePath: string;
  private readonly timeout: number;

  /**
   * Create a new Claude orchestrator.
   *
   * @param options - Configuration options
   */
  constructor(options: ClaudeOrchestratorOptions = {}) {
    this.claudePath = options.claudePath ?? 'claude';
    this.timeout = options.timeout ?? 120000; // 2 minute default
  }

  /**
   * Send a query to Claude and get a response.
   *
   * @param request - The request to send
   * @returns The response from Claude
   * @throws ClaudeError if invocation fails
   */
  async query(request: ClaudeRequest): Promise<ClaudeResponse> {
    const prompt = this.buildPrompt(request);

    try {
      const content = await this.invokeClaudeCli(prompt);
      const response: ClaudeResponse = { content };

      // Parse JSON if requested
      if (request.jsonMode) {
        response.parsed = this.parseJsonResponse(content);
      }

      return response;
    } catch (error) {
      if (error instanceof ClaudeError) {
        throw error;
      }
      throw new ClaudeError(
        `Failed to query Claude: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Build the complete prompt from request parts.
   */
  private buildPrompt(request: ClaudeRequest): string {
    const parts: string[] = [];

    // Add system prompt if provided
    if (request.systemPrompt) {
      parts.push(`<system>\n${request.systemPrompt}\n</system>\n`);
    }

    // Add context if provided
    if (request.context) {
      parts.push(`<context>\n${request.context}\n</context>\n`);
    }

    // Add JSON mode instruction if requested
    if (request.jsonMode) {
      parts.push(
        '<instruction>Respond with valid JSON only. No markdown, no explanation, just the JSON object.</instruction>\n'
      );
    }

    // Add the main prompt
    parts.push(request.prompt);

    return parts.join('\n');
  }

  /**
   * Invoke the Claude CLI and capture output.
   */
  private invokeClaudeCli(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['--print', prompt];
      const child = spawn(this.claudePath, args, {
        timeout: this.timeout,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        reject(
          new ClaudeError(
            `Failed to spawn Claude CLI: ${error.message}`,
            undefined,
            stderr
          )
        );
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(
            new ClaudeError(
              `Claude CLI exited with code ${code}`,
              code ?? undefined,
              stderr
            )
          );
        }
      });
    });
  }

  /**
   * Parse a JSON response from Claude's output.
   *
   * Handles cases where Claude includes markdown code fences or
   * extra text around the JSON.
   */
  private parseJsonResponse(content: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(content);
    } catch {
      // Continue to extraction attempts
    }

    // Try to extract JSON from markdown code fence
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // Continue to other attempts
      }
    }

    // Try to find JSON object or array in the response
    const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Failed all attempts
      }
    }

    // Return undefined if we couldn't parse JSON
    return undefined;
  }
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a ClaudeOrchestrator.
 */
export interface ClaudeOrchestratorOptions {
  /** Path to claude CLI executable (default: 'claude') */
  claudePath?: string;
  /** Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeout?: number;
}
