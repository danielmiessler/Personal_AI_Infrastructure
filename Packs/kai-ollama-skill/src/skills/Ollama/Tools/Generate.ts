#!/usr/bin/env bun

/**
 * generate - Ollama Text Generation CLI
 *
 * Generate text using local Ollama models.
 * Follows deterministic, composable CLI design.
 *
 * Usage:
 *   bun run Generate.ts --prompt "Explain closures in JavaScript"
 *   bun run Generate.ts --prompt "..." --model llama3.2 --temperature 0.7
 *   bun run Generate.ts --prompt "..." --system "You are a code reviewer" --format json
 */

import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// ============================================================================
// Environment Loading
// ============================================================================

async function loadEnv(): Promise<void> {
  // Load from canonical location: $PAI_DIR/.env (single source of truth)
  // Falls back to legacy locations for backwards compatibility
  const paiDir = process.env.PAI_DIR || resolve(process.env.HOME!, '.config/pai');
  const envPaths = [
    resolve(paiDir, '.env'),
    resolve(process.env.HOME!, '.claude/.env'), // Legacy location
  ];

  for (const envPath of envPaths) {
    try {
      const envContent = await readFile(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
      break; // Stop after first successful load
    } catch {
      // Continue to next path
    }
  }
}

// ============================================================================
// Types
// ============================================================================

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface CLIArgs {
  prompt: string;
  model?: string;
  system?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stream?: boolean;
  format?: 'json';
  help?: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2:latest',
  temperature: 0.7,
  timeout: 30000,
};

// ============================================================================
// CLI Error Handling
// ============================================================================

class CLIError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = 'CLIError';
  }
}

// ============================================================================
// Ollama API Client
// ============================================================================

class OllamaClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl?: string, timeout?: number) {
    this.baseUrl = baseUrl || DEFAULTS.baseUrl;
    this.timeout = timeout || DEFAULTS.timeout;
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    const url = `${this.baseUrl}/api/generate`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new CLIError(
          `Ollama API error (${response.status}): ${errorText}`,
          1
        );
      }

      // Handle streaming vs non-streaming
      if (request.stream) {
        return await this.handleStreamingResponse(response);
      } else {
        const data = await response.json();
        return data;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new CLIError(`Request timeout after ${this.timeout}ms`, 1);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new CLIError(
          '❌ Cannot connect to Ollama. Ensure Ollama is running:\n' +
          '   ollama serve\n' +
          `   Base URL: ${this.baseUrl}`,
          1
        );
      }
      throw error;
    }
  }

  private async handleStreamingResponse(response: Response): Promise<OllamaGenerateResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new CLIError('No response body available', 1);
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let finalData: OllamaGenerateResponse | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line) as OllamaGenerateResponse;

            // Print response token by token
            if (data.response) {
              process.stdout.write(data.response);
              fullResponse += data.response;
            }

            if (data.done) {
              finalData = data;
              finalData.response = fullResponse;
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }

      process.stdout.write('\n');

      if (!finalData) {
        throw new CLIError('Incomplete streaming response', 1);
      }

      return finalData;
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(): Promise<any> {
    const url = `${this.baseUrl}/api/tags`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new CLIError(`Failed to list models: ${response.statusText}`, 1);
      }
      return await response.json();
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new CLIError(
          '❌ Cannot connect to Ollama. Ensure Ollama is running: ollama serve',
          1
        );
      }
      throw error;
    }
  }
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    options: {
      prompt: { type: 'string', short: 'p' },
      model: { type: 'string', short: 'm' },
      system: { type: 'string', short: 's' },
      temperature: { type: 'string', short: 't' },
      topP: { type: 'string' },
      topK: { type: 'string' },
      maxTokens: { type: 'string' },
      stream: { type: 'boolean', default: true },
      format: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  return {
    prompt: values.prompt as string,
    model: values.model as string | undefined,
    system: values.system as string | undefined,
    temperature: values.temperature ? parseFloat(values.temperature) : undefined,
    topP: values.topP ? parseFloat(values.topP) : undefined,
    topK: values.topK ? parseInt(values.topK) : undefined,
    maxTokens: values.maxTokens ? parseInt(values.maxTokens) : undefined,
    stream: values.stream ?? true,
    format: values.format as 'json' | undefined,
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Ollama Text Generation CLI

USAGE:
  bun run Generate.ts --prompt "Your prompt here" [OPTIONS]

OPTIONS:
  -p, --prompt <text>       Text prompt for generation (required)
  -m, --model <name>        Model to use (default: ${DEFAULTS.model})
  -s, --system <text>       System prompt to set context
  -t, --temperature <num>   Sampling temperature 0.0-1.0 (default: ${DEFAULTS.temperature})
  --topP <num>              Top-p sampling parameter
  --topK <num>              Top-k sampling parameter
  --maxTokens <num>         Maximum tokens to generate
  --stream                  Stream output token by token (default: true)
  --no-stream               Disable streaming, return full response
  --format json             Request JSON formatted output
  -h, --help                Show this help message

EXAMPLES:
  # Basic generation
  bun run Generate.ts --prompt "Explain closures in JavaScript"

  # Use specific model
  bun run Generate.ts --prompt "Review this code" --model codellama:7b

  # Add system prompt
  bun run Generate.ts --prompt "Analyze this function" --system "You are a code reviewer"

  # Request JSON output
  bun run Generate.ts --prompt "List 3 colors" --format json

  # Adjust temperature
  bun run Generate.ts --prompt "Write a story" --temperature 0.9

ENVIRONMENT VARIABLES:
  OLLAMA_BASE_URL           Ollama server URL (default: ${DEFAULTS.baseUrl})
  OLLAMA_DEFAULT_MODEL      Default model name
  OLLAMA_TIMEOUT            Request timeout in ms (default: ${DEFAULTS.timeout})

NOTES:
  - Ensure Ollama is running: ollama serve
  - List available models: ollama list
  - Pull new models: ollama pull llama3.2
`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  try {
    // Load environment variables
    await loadEnv();

    // Parse arguments
    const args = parseArguments();

    // Show help if requested
    if (args.help) {
      showHelp();
      process.exit(0);
    }

    // Validate required arguments
    if (!args.prompt) {
      throw new CLIError('Error: --prompt is required\n\nUse --help for usage information', 1);
    }

    // Get configuration from environment with fallbacks
    const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULTS.baseUrl;
    const model = args.model || process.env.OLLAMA_DEFAULT_MODEL || DEFAULTS.model;
    const timeout = process.env.OLLAMA_TIMEOUT ? parseInt(process.env.OLLAMA_TIMEOUT) : DEFAULTS.timeout;

    // Build request
    const request: OllamaGenerateRequest = {
      model,
      prompt: args.prompt,
      stream: args.stream,
    };

    if (args.system) {
      request.system = args.system;
    }

    if (args.format) {
      request.format = args.format;
    }

    if (args.temperature !== undefined || args.topP !== undefined || args.topK !== undefined || args.maxTokens !== undefined) {
      request.options = {};
      if (args.temperature !== undefined) request.options.temperature = args.temperature;
      if (args.topP !== undefined) request.options.top_p = args.topP;
      if (args.topK !== undefined) request.options.top_k = args.topK;
      if (args.maxTokens !== undefined) request.options.num_predict = args.maxTokens;
    }

    // Create client and generate
    const client = new OllamaClient(baseUrl, timeout);
    const response = await client.generate(request);

    // Output (already streamed if streaming enabled)
    if (!args.stream) {
      console.log(response.response);
    }

    // Print performance stats if available
    if (response.eval_count && response.eval_duration) {
      const tokensPerSecond = (response.eval_count / (response.eval_duration / 1e9)).toFixed(2);
      console.error(`\n[${model}] ${response.eval_count} tokens in ${(response.eval_duration / 1e9).toFixed(2)}s (${tokensPerSecond} tok/s)`);
    }

  } catch (error) {
    if (error instanceof CLIError) {
      console.error(error.message);
      process.exit(error.exitCode);
    }
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { OllamaClient, type OllamaGenerateRequest, type OllamaGenerateResponse };
