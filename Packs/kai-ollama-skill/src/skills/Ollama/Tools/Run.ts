#!/usr/bin/env bun

/**
 * run - Simple Ollama Execution Wrapper
 *
 * Simplified interface for running Ollama models from Claude Code.
 * Designed to be easily invoked by Claude during conversations.
 *
 * Usage:
 *   bun run Run.ts "Your prompt" llama3.2
 *   bun run Run.ts "Code review this" qwen2.5-coder:7b
 *   bun run Run.ts "Summarize" mistral --system "Be concise"
 */

import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// ============================================================================
// Environment Loading
// ============================================================================

async function loadEnv(): Promise<void> {
  const paiDir = process.env.PAI_DIR || resolve(process.env.HOME!, '.config/pai');
  const envPaths = [
    resolve(paiDir, '.env'),
    resolve(process.env.HOME!, '.claude/.env'),
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
      break;
    } catch {
      continue;
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
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface CLIArgs {
  prompt: string;
  model?: string;
  system?: string;
  temperature?: number;
  format?: 'json';
  noStream?: boolean;
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
// Ollama Client
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
        throw new CLIError(`Ollama API error (${response.status}): ${errorText}`, 1);
      }

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

            if (data.response) {
              process.stdout.write(data.response);
              fullResponse += data.response;
            }

            if (data.done) {
              finalData = data;
              finalData.response = fullResponse;
            }
          } catch (parseError) {
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
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values, positionals } = parseArgs({
    options: {
      model: { type: 'string', short: 'm' },
      system: { type: 'string', short: 's' },
      temperature: { type: 'string', short: 't' },
      format: { type: 'string', short: 'f' },
      'no-stream': { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  // Support both positional and --prompt
  let prompt = '';
  let model: string | undefined;

  if (positionals.length >= 1) {
    prompt = positionals[0];
    if (positionals.length >= 2) {
      model = positionals[1];
    }
  }

  return {
    prompt,
    model: model || (values.model as string | undefined),
    system: values.system as string | undefined,
    temperature: values.temperature ? parseFloat(values.temperature) : undefined,
    format: values.format as 'json' | undefined,
    noStream: values['no-stream'] ?? false,
    help: values.help ?? false,
  };
}

// ============================================================================
// Help Text
// ============================================================================

function showHelp(): void {
  console.log(`
Ollama Run - Simple Execution Wrapper

USAGE:
  bun run Run.ts "prompt" [model] [OPTIONS]
  bun run Run.ts "prompt" --model llama3.2 [OPTIONS]

POSITIONAL ARGUMENTS:
  prompt                    Text prompt for generation (required)
  model                     Model to use (optional, defaults from env)

OPTIONS:
  -m, --model <name>        Model to use
  -s, --system <text>       System prompt
  -t, --temperature <num>   Sampling temperature 0.0-1.0
  -f, --format <type>       Output format (json)
  --no-stream               Disable streaming
  -h, --help                Show this help

EXAMPLES:
  # Quick generation with default model
  bun run Run.ts "Explain closures"

  # Use specific model (positional)
  bun run Run.ts "Review this code" qwen2.5-coder:7b

  # Use specific model (flag)
  bun run Run.ts "Summarize" --model mistral

  # With system prompt
  bun run Run.ts "Review this function" codellama:7b --system "You are a code reviewer"

  # JSON output
  bun run Run.ts "List 3 colors" --format json

  # Adjust creativity
  bun run Run.ts "Write a story" --temperature 0.9

POPULAR MODELS:
  llama3.2:3b              Fast, efficient (1.9GB)
  llama3.2:latest          Balanced quality (4.7GB)
  qwen2.5-coder:7b         Best for code (4.7GB)
  codellama:7b             Code specialist (3.8GB)
  mistral:latest           High quality (4.1GB)

ENVIRONMENT VARIABLES:
  OLLAMA_BASE_URL           Ollama server URL (default: ${DEFAULTS.baseUrl})
  OLLAMA_DEFAULT_MODEL      Default model name
  OLLAMA_CODE_MODEL         Default for code tasks
  OLLAMA_CHAT_MODEL         Default for chat tasks
  OLLAMA_TIMEOUT            Request timeout in ms

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
      throw new CLIError('Error: prompt is required\n\nUsage: bun run Run.ts "prompt" [model]\n\nUse --help for more information', 1);
    }

    // Get configuration
    const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULTS.baseUrl;
    const model = args.model ||
                  process.env.OLLAMA_DEFAULT_MODEL ||
                  DEFAULTS.model;
    const timeout = process.env.OLLAMA_TIMEOUT ? parseInt(process.env.OLLAMA_TIMEOUT) : DEFAULTS.timeout;

    // Build request
    const request: OllamaGenerateRequest = {
      model,
      prompt: args.prompt,
      stream: !args.noStream,
    };

    if (args.system) {
      request.system = args.system;
    }

    if (args.format) {
      request.format = args.format;
    }

    if (args.temperature !== undefined) {
      request.options = { temperature: args.temperature };
    }

    // Show model info
    console.error(`[Using: ${model}]`);

    // Create client and generate
    const client = new OllamaClient(baseUrl, timeout);
    const response = await client.generate(request);

    // Output (already streamed if streaming enabled)
    if (args.noStream) {
      console.log(response.response);
    }

    // Print performance stats
    if (response.eval_count && response.eval_duration) {
      const tokensPerSecond = (response.eval_count / (response.eval_duration / 1e9)).toFixed(2);
      console.error(`[${response.eval_count} tokens in ${(response.eval_duration / 1e9).toFixed(2)}s - ${tokensPerSecond} tok/s]`);
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

export { OllamaClient };
