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
import { BackendRegistry } from "../lib/BackendRegistry.js";
import { OllamaBackend } from "../lib/backends/OllamaBackend.js";
import { AnthropicBackend } from "../lib/backends/AnthropicBackend.js";

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
  backend?: string;
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
  model: 'qwen3:4b',
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

// OllamaClient removed - now using BackendRegistry with OllamaBackend

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArguments(): CLIArgs {
  const { values } = parseArgs({
    options: {
      prompt: { type: 'string', short: 'p' },
      model: { type: 'string', short: 'm' },
      backend: { type: 'string', short: 'b' },
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
    backend: values.backend as string | undefined,
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
Multi-Backend Inference Text Generation CLI

USAGE:
  bun run Generate.ts --prompt "Your prompt here" [OPTIONS]

OPTIONS:
  -p, --prompt <text>       Text prompt for generation (required)
  -m, --model <name>        Model to use (auto-detects backend from model name)
  -b, --backend <name>      Backend to use: ollama, anthropic (default: auto-detect)
  -s, --system <text>       System prompt to set context
  -t, --temperature <num>   Sampling temperature 0.0-1.0 (default: ${DEFAULTS.temperature})
  --topP <num>              Top-p sampling parameter
  --topK <num>              Top-k sampling parameter
  --maxTokens <num>         Maximum tokens to generate
  --stream                  Stream output token by token (default: true)
  --no-stream               Disable streaming, return full response
  --format json             Request JSON formatted output (ollama only)
  -h, --help                Show this help message

BACKENDS:
  ollama                    Local models (free, private, offline)
  anthropic                 Claude API (best reasoning, requires ANTHROPIC_API_KEY)

EXAMPLES:
  # Basic generation (uses default backend: ollama)
  bun run Generate.ts --prompt "Explain closures in JavaScript"

  # Use specific Ollama model
  bun run Generate.ts --prompt "Review this code" --model llama3.2

  # Use Claude API (auto-detects from model name)
  bun run Generate.ts --prompt "Design a system" --model claude-sonnet-4.5

  # Explicit backend selection
  bun run Generate.ts --prompt "Analyze this" --backend anthropic --model claude-opus-4.5

  # With system prompt
  bun run Generate.ts --prompt "Review code" --system "You are a security expert"

  # Adjust creativity
  bun run Generate.ts --prompt "Write a story" --temperature 0.9 --backend anthropic

ENVIRONMENT VARIABLES:
  # Ollama Configuration
  OLLAMA_BASE_URL           Ollama server URL (default: ${DEFAULTS.baseUrl})
  OLLAMA_DEFAULT_MODEL      Default Ollama model

  # Anthropic Configuration
  ANTHROPIC_API_KEY         Required for Claude API access
  ANTHROPIC_DEFAULT_MODEL   Default Claude model (default: claude-sonnet-4.5)

  # General Configuration
  INFERENCE_DEFAULT_BACKEND Default backend (ollama or anthropic)

NOTES:
  - Model names auto-detect backend (claude-* → anthropic, others → ollama)
  - For Ollama: ensure ollama serve is running
  - For Anthropic: set ANTHROPIC_API_KEY in your environment
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

    // Initialize backend registry
    const registry = new BackendRegistry();

    // Register available backends
    try {
      const ollama = new OllamaBackend();
      registry.register({
        name: 'ollama',
        backend: ollama,
        modelPrefixes: ['llama', 'qwen', 'mistral', 'deepseek', 'codellama', 'phi', 'gemma'],
      });
    } catch (error) {
      // Ollama not available, skip
    }

    try {
      const anthropic = new AnthropicBackend();
      registry.register({
        name: 'anthropic',
        backend: anthropic,
        modelPrefixes: ['claude-'],
      });
    } catch (error) {
      // Anthropic not available (no API key), skip
    }

    // Select backend
    const backend = registry.selectBackend({
      explicitBackend: args.backend,
      model: args.model,
    });

    // Get model name
    let model = args.model;
    if (!model) {
      model = backend.getDefaultModel();
      if (!model) {
        throw new CLIError('No model specified and no default model configured', 1);
      }
    }

    // Parse model name to remove backend prefix if present
    const parsed = registry.parseModelName(model);
    model = parsed.model;

    // Validate model exists (Ollama only)
    if (backend.name === 'ollama') {
      try {
        const availableModels = await backend.listModels();
        const modelExists = availableModels.some(m => m.name === model);

        if (!modelExists) {
          const modelNames = availableModels.map(m => m.name).join(', ');
          throw new CLIError(
            `Model '${model}' not found.\n\n` +
            `Available models: ${modelNames}\n\n` +
            `Pull the model with: ollama pull ${model}`,
            1
          );
        }
      } catch (error: any) {
        // If error is already a CLIError, rethrow it
        if (error instanceof CLIError) throw error;
        // Otherwise, connection error - provide helpful message
        throw new CLIError(
          `Cannot connect to Ollama. Ensure Ollama is running:\n` +
          `   ollama serve\n` +
          `   Base URL: ${backend instanceof OllamaBackend ? (backend as any).baseUrl : 'unknown'}`,
          1
        );
      }
    }

    // Build unified inference request
    const request = {
      model,
      prompt: args.prompt,
      stream: args.stream,
      system: args.system,
      format: args.format,
      temperature: args.temperature,
      topP: args.topP,
      topK: args.topK,
      maxTokens: args.maxTokens,
    };

    // Generate response
    const response = await backend.generate(request);

    // Output (already streamed if streaming enabled)
    if (!args.stream) {
      console.log(response.content);
    }

    // Print performance stats if available
    if (response.usage || response.metadata) {
      const stats: string[] = [];

      stats.push(`[${backend.name}:${model}]`);

      if (response.usage?.completionTokens) {
        stats.push(`${response.usage.completionTokens} tokens`);
      }

      if (response.metadata?.duration) {
        stats.push(`${(response.metadata.duration / 1000).toFixed(2)}s`);
      }

      if (response.metadata?.tokensPerSecond) {
        stats.push(`${response.metadata.tokensPerSecond.toFixed(2)} tok/s`);
      }

      console.error(`\n${stats.join(' ')}`);
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

// Exports for backward compatibility
export { type OllamaGenerateRequest, type OllamaGenerateResponse };
